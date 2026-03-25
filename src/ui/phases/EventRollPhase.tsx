import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store';
import { GameSession, Player, ResourcePool, ResourceType, RoleId, EventCard } from '../../core/models/types';
import { EVENT_TABLE, ROLE_COLORS, RESOURCE_COLORS } from '../../core/models/constants';
import { EVENT_CARDS } from '../../core/content/events';

// ─── Types ───────────────────────────────────────────────────────

interface EventRollPhaseProps {
  session: GameSession;
  onPhaseComplete: () => void;
}

type Stage = 'intro' | 'rolling' | 'outcome' | 'card_draw' | 'impact' | 'discard' | 'continue';

// ─── Resource color map ──────────────────────────────────────────

const RESOURCE_COLOR_MAP: Record<ResourceType, string> = {
  budget: '#F4D03F',
  influence: '#3498DB',
  volunteer: '#27AE60',
  material: '#95A5A6',
  knowledge: '#8E44AD',
};

const RESOURCE_LABELS: Record<ResourceType, string> = {
  budget: 'Budget',
  influence: 'Influence',
  volunteer: 'Volunteers',
  material: 'Materials',
  knowledge: 'Knowledge',
};

// ─── Die Face Dots ───────────────────────────────────────────────

const DOT_POSITIONS: Record<number, { x: number; y: number }[]> = {
  1: [{ x: 50, y: 50 }],
  2: [{ x: 25, y: 25 }, { x: 75, y: 75 }],
  3: [{ x: 25, y: 25 }, { x: 50, y: 50 }, { x: 75, y: 75 }],
  4: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
  5: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 50, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
  6: [{ x: 25, y: 20 }, { x: 75, y: 20 }, { x: 25, y: 50 }, { x: 75, y: 50 }, { x: 25, y: 80 }, { x: 75, y: 80 }],
};

const DieFace: React.FC<{ value: number; size?: number; color?: string }> = ({ value, size = 80, color = '#1a1a2e' }) => {
  const dots = DOT_POSITIONS[value] ?? DOT_POSITIONS[1];
  return (
    <div
      className="relative rounded-xl border-2 border-white/20 shadow-lg"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
      }}
    >
      {dots.map((dot, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: size * 0.16,
            height: size * 0.16,
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
};

// ─── Card Back ───────────────────────────────────────────────────

const CardBack: React.FC = () => (
  <div className="w-64 h-96 rounded-xl border-2 border-amber-400/50 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex flex-col items-center justify-center shadow-2xl">
    <div className="w-48 h-72 rounded-lg border border-amber-400/30 flex flex-col items-center justify-center">
      <div className="text-amber-400 text-4xl font-bold mb-2">CG</div>
      <div className="text-amber-400/60 text-xs tracking-widest uppercase">Common Ground</div>
      <div className="mt-4 w-12 h-12 rounded-full border-2 border-amber-400/40 flex items-center justify-center">
        <div className="text-amber-400/80 text-lg">?</div>
      </div>
    </div>
  </div>
);

// ─── Card Front ──────────────────────────────────────────────────

const CardFront: React.FC<{ card: EventCard }> = ({ card }) => {
  const isNegative = card.type === 'negative';
  const borderColor = isNegative ? 'border-red-500' : 'border-emerald-500';
  const gradientFrom = isNegative ? 'from-red-950' : 'from-emerald-950';
  const gradientTo = isNegative ? 'to-slate-900' : 'to-slate-900';
  const typeColor = isNegative ? 'text-red-400' : 'text-emerald-400';
  const typeBg = isNegative ? 'bg-red-500/20' : 'bg-emerald-500/20';

  return (
    <div className={`w-64 h-96 rounded-xl border-2 ${borderColor} bg-gradient-to-br ${gradientFrom} ${gradientTo} flex flex-col shadow-2xl overflow-hidden`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${typeBg} ${typeColor} mb-2`}>
          {card.type} event
        </div>
        <h3 className="text-white font-bold text-lg leading-tight">{card.name}</h3>
      </div>

      {/* Divider */}
      <div className={`mx-4 h-px ${isNegative ? 'bg-red-500/30' : 'bg-emerald-500/30'}`} />

      {/* Description */}
      <div className="px-4 py-3 flex-1">
        <p className="text-gray-300 text-sm leading-relaxed">{card.description}</p>
      </div>

      {/* Flavor text */}
      <div className="px-4 pb-2">
        <p className="text-gray-500 text-xs italic leading-snug">"{card.flavorText}"</p>
      </div>

      {/* Effects summary */}
      <div className="px-4 pb-4">
        <div className="text-xs text-gray-400 font-semibold uppercase mb-1">Effects ({card.effects.length})</div>
        {card.effects.slice(0, 3).map((effect, i) => (
          <div key={i} className="text-xs text-gray-400 truncate">
            {effect.type.replace(/_/g, ' ')} - {effect.target}
          </div>
        ))}
        {card.effects.length > 3 && (
          <div className="text-xs text-gray-500">+{card.effects.length - 3} more</div>
        )}
      </div>
    </div>
  );
};

// ─── Resource Delta Display ──────────────────────────────────────

const ResourceDelta: React.FC<{ type: ResourceType; before: number; after: number }> = ({ type, before, after }) => {
  const delta = after - before;
  if (delta === 0) return null;

  const color = delta > 0 ? '#27AE60' : '#E74C3C';
  const sign = delta > 0 ? '+' : '';

  return (
    <motion.div
      initial={{ opacity: 0, x: delta > 0 ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-3 py-1"
    >
      <div
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: RESOURCE_COLOR_MAP[type] }}
      />
      <span className="text-gray-300 text-sm w-24">{RESOURCE_LABELS[type]}</span>
      <span className="text-gray-500 text-sm w-8 text-right">{before}</span>
      <span className="text-gray-600 text-sm mx-1">&rarr;</span>
      <span className="text-white text-sm w-8">{after}</span>
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
        className="text-sm font-bold ml-2"
        style={{ color }}
      >
        {sign}{delta}
      </motion.span>
    </motion.div>
  );
};

// ─── Outcome classification ──────────────────────────────────────

function getOutcomeClassification(total: number): {
  type: 'negative' | 'stable' | 'positive';
  tint: string;
  banner: string;
  bgClass: string;
} {
  if (total <= 4) {
    return {
      type: 'negative',
      tint: '#E74C3C',
      banner: 'NEGATIVE EVENT -- A setback strikes the park',
      bgClass: 'from-red-950/80 to-transparent',
    };
  }
  if (total <= 8) {
    return {
      type: 'stable',
      tint: '#95A5A6',
      banner: 'STABLE -- No external disruption this round',
      bgClass: 'from-gray-800/80 to-transparent',
    };
  }
  return {
    type: 'positive',
    tint: '#27AE60',
    banner: 'POSITIVE EVENT -- An opportunity emerges',
    bgClass: 'from-emerald-950/80 to-transparent',
  };
}

// ─── Main Component ──────────────────────────────────────────────

export const EventRollPhase: React.FC<EventRollPhaseProps> = ({ session, onPhaseComplete }) => {
  const [stage, setStage] = useState<Stage>('intro');
  const [isRolling, setIsRolling] = useState(false);
  const [rollingValues, setRollingValues] = useState<[number, number]>([1, 1]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [resourceSnapshots, setResourceSnapshots] = useState<{
    playersBefore: Record<string, ResourcePool>;
    zonesBefore: Record<string, ResourcePool>;
  } | null>(null);

  const rollEventDie = useGameStore((s) => s.rollEventDie);
  const advancePhase = useGameStore((s) => s.advancePhase);
  const currentSession = useGameStore((s) => s.session);

  // Use the latest session from store if available, falling back to props
  const activeSession = currentSession ?? session;

  const eventRollResult = activeSession.eventRollResult;
  const eventDieResult = activeSession.eventDieResult;

  // Determine the event card to show based on the roll result
  const eventCard = useMemo<EventCard | null>(() => {
    if (!eventRollResult) return null;
    const entry = eventRollResult.eventEntry;
    // Match event card by type based on outcome
    const isNegative = eventRollResult.total <= 4;
    const matchingCards = EVENT_CARDS.filter((c) => c.type === (isNegative ? 'negative' : 'positive'));
    if (matchingCards.length === 0) return null;
    // Use a deterministic pick based on the roll total
    return matchingCards[eventRollResult.total % matchingCards.length];
  }, [eventRollResult]);

  // Outcome classification based on total
  const outcome = useMemo(() => {
    if (!eventRollResult) return null;
    return getOutcomeClassification(eventRollResult.total);
  }, [eventRollResult]);

  // ─── Stage: intro auto-advance ─────────────────────────────────
  useEffect(() => {
    if (stage === 'intro') {
      const timer = setTimeout(() => setStage('rolling'), 1500);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  // ─── Stage: discard auto-advance ───────────────────────────────
  useEffect(() => {
    if (stage === 'discard') {
      const timer = setTimeout(() => setStage('continue'), 500);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  // ─── Rolling animation ─────────────────────────────────────────
  const handleRoll = useCallback(() => {
    if (isRolling) return;
    setIsRolling(true);

    // Capture resource snapshots before the roll applies effects
    const playersBefore: Record<string, ResourcePool> = {};
    const zonesBefore: Record<string, ResourcePool> = {};
    for (const [pid, player] of Object.entries(activeSession.players)) {
      playersBefore[pid] = { ...player.resources };
    }
    for (const [zid, zone] of Object.entries(activeSession.board.zones)) {
      zonesBefore[zid] = { ...zone.resources };
    }
    setResourceSnapshots({ playersBefore, zonesBefore });

    // Animate tumbling dice for 1.5s
    const intervalId = setInterval(() => {
      setRollingValues([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ]);
    }, 80);

    setTimeout(() => {
      clearInterval(intervalId);
      // Call the store to actually roll
      rollEventDie();
      setIsRolling(false);
      // Short delay before showing outcome
      setTimeout(() => setStage('outcome'), 300);
    }, 1500);
  }, [isRolling, activeSession, rollEventDie]);

  // ─── After outcome, advance to card draw or continue ───────────
  const handleOutcomeNext = useCallback(() => {
    if (!outcome) return;
    if (outcome.type === 'stable') {
      setStage('continue');
    } else {
      setStage('card_draw');
    }
  }, [outcome]);

  // ─── Card flip handler ─────────────────────────────────────────
  const handleCardFlip = useCallback(() => {
    setIsFlipped(true);
    setTimeout(() => setStage('impact'), 1200);
  }, []);

  // ─── Impact done handler ───────────────────────────────────────
  const handleImpactDone = useCallback(() => {
    setStage('discard');
  }, []);

  // ─── Continue to next phase ────────────────────────────────────
  const handleContinue = useCallback(() => {
    onPhaseComplete();
  }, [onPhaseComplete]);

  // ─── Dice values to display (use result if available, otherwise rolling values)
  const displayDice: [number, number] = useMemo(() => {
    if (stage === 'rolling' && isRolling) return rollingValues;
    if (eventRollResult) return eventRollResult.dice;
    return rollingValues;
  }, [stage, isRolling, rollingValues, eventRollResult]);

  const displayTotal = displayDice[0] + displayDice[1];

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <AnimatePresence mode="wait">
        {/* ═══ INTRO ═══ */}
        {stage === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center text-center"
          >
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="text-amber-400/60 text-sm font-semibold tracking-[0.3em] uppercase mb-2"
            >
              Round {activeSession.currentRound}
            </motion.div>
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-5xl font-bold text-white mb-4"
            >
              Phase 1: Event Roll
            </motion.h1>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-400 text-lg italic"
            >
              External forces are at play
            </motion.p>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="mt-6 h-0.5 w-64 bg-gradient-to-r from-transparent via-amber-400 to-transparent"
            />
          </motion.div>
        )}

        {/* ═══ ROLLING ═══ */}
        {stage === 'rolling' && (
          <motion.div
            key="rolling"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <h2 className="text-white text-2xl font-bold mb-8">Roll the Event Dice</h2>

            <div className="flex gap-8 mb-10">
              {[0, 1].map((dieIndex) => (
                <motion.div
                  key={dieIndex}
                  animate={isRolling ? {
                    rotateX: [0, 360, 720, 1080],
                    rotateY: [0, 180, 360, 540],
                    scale: [1, 1.2, 0.9, 1.1, 1],
                  } : {}}
                  transition={isRolling ? {
                    duration: 1.5,
                    ease: 'easeInOut',
                  } : {}}
                  style={{ perspective: 600 }}
                >
                  <DieFace
                    value={displayDice[dieIndex]}
                    size={100}
                    color={isRolling ? '#2c3e50' : '#1a1a2e'}
                  />
                </motion.div>
              ))}
            </div>

            {!isRolling && !eventRollResult && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRoll}
                className="px-8 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-lg shadow-lg shadow-amber-500/30 transition-colors"
              >
                Roll
              </motion.button>
            )}

            {!isRolling && eventRollResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center"
              >
                <div className="text-white text-4xl font-bold mb-2">
                  {eventRollResult.total}
                </div>
                <div className="text-gray-400 text-sm mb-4">
                  ({eventRollResult.dice[0]} + {eventRollResult.dice[1]})
                </div>
                <div className="text-amber-400 font-semibold text-lg mb-6">
                  {eventRollResult.eventEntry.name}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStage('outcome')}
                  className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
                >
                  See Outcome &rarr;
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ═══ OUTCOME ═══ */}
        {stage === 'outcome' && outcome && eventRollResult && (
          <motion.div
            key="outcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center max-w-xl text-center"
          >
            {/* Tinted glow */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 0.3, scale: 1 }}
              className="absolute w-96 h-96 rounded-full blur-3xl"
              style={{ backgroundColor: outcome.tint }}
            />

            {/* Dice result */}
            <div className="flex gap-4 mb-6 relative z-10">
              <DieFace value={eventRollResult.dice[0]} size={60} />
              <DieFace value={eventRollResult.dice[1]} size={60} />
            </div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative z-10 text-6xl font-bold text-white mb-4"
            >
              {eventRollResult.total}
            </motion.div>

            {/* Banner */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className={`relative z-10 px-8 py-4 rounded-lg bg-gradient-to-r ${outcome.bgClass} border mb-6`}
              style={{ borderColor: outcome.tint + '60' }}
            >
              <h2 className="text-white text-xl font-bold tracking-wide">{outcome.banner}</h2>
            </motion.div>

            {/* Event entry details */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="relative z-10 text-gray-300 space-y-2 mb-8"
            >
              <p className="text-lg font-semibold" style={{ color: outcome.tint }}>
                {eventRollResult.eventEntry.name}
              </p>
              <p className="text-sm text-gray-400">{eventRollResult.eventEntry.zoneEffect}</p>
              <p className="text-sm text-gray-400">{eventRollResult.eventEntry.playerEffect}</p>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleOutcomeNext}
              className="relative z-10 px-6 py-2 rounded-lg text-white font-semibold transition-colors"
              style={{
                backgroundColor: outcome.tint + '30',
                borderColor: outcome.tint + '60',
                borderWidth: 1,
              }}
            >
              {outcome.type === 'stable' ? 'Continue' : 'Draw Event Card'} &rarr;
            </motion.button>
          </motion.div>
        )}

        {/* ═══ CARD DRAW (flip animation) ═══ */}
        {stage === 'card_draw' && eventCard && (
          <motion.div
            key="card_draw"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <h2 className="text-white text-2xl font-bold mb-8">Event Card</h2>

            {/* Flip container */}
            <div
              className="relative cursor-pointer"
              style={{ perspective: 1200, width: 256, height: 384 }}
              onClick={!isFlipped ? handleCardFlip : undefined}
            >
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
                style={{
                  transformStyle: 'preserve-3d',
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                }}
              >
                {/* Back face */}
                <div
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backfaceVisibility: 'hidden',
                  }}
                >
                  <CardBack />
                </div>

                {/* Front face */}
                <div
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <CardFront card={eventCard} />
                </div>
              </motion.div>
            </div>

            {!isFlipped && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6 text-gray-400 text-sm animate-pulse"
              >
                Click the card to reveal
              </motion.p>
            )}

            {isFlipped && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mt-6"
              >
                <p className="text-gray-400 text-sm mb-2">Applying effects...</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ═══ IMPACT ═══ */}
        {stage === 'impact' && eventRollResult && eventCard && (
          <motion.div
            key="impact"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center max-w-3xl w-full px-4"
          >
            <h2 className="text-white text-2xl font-bold mb-2">Impact Assessment</h2>
            <p className="text-gray-400 text-sm mb-8">{eventCard.name}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8">
              {/* Zone Impact Panel */}
              <motion.div
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white/5 rounded-xl border border-white/10 p-5"
              >
                <h3 className="text-amber-400 font-semibold text-sm uppercase tracking-wide mb-4">
                  Zone Impact
                </h3>
                {eventRollResult.affectedZones.length > 0 ? (
                  eventRollResult.affectedZones.map((zoneId) => {
                    const zone = activeSession.board.zones[zoneId];
                    if (!zone) return null;
                    const beforeResources = resourceSnapshots?.zonesBefore[zoneId];
                    const afterResources = zone.resources;

                    return (
                      <div key={zoneId} className="mb-4 last:mb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-amber-400" />
                          <span className="text-white font-medium text-sm">
                            {zone.name}
                          </span>
                          <span className="text-gray-500 text-xs ml-auto">
                            {zone.condition}
                          </span>
                        </div>
                        {beforeResources && (Object.keys(beforeResources) as ResourceType[]).map((rt) => (
                          <ResourceDelta
                            key={rt}
                            type={rt}
                            before={beforeResources[rt]}
                            after={afterResources[rt]}
                          />
                        ))}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-sm italic">No zones directly affected</p>
                )}

                {/* Show event entry zone effect text */}
                <div className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-gray-400 text-xs">{eventRollResult.eventEntry.zoneEffect}</p>
                </div>
              </motion.div>

              {/* Player Impact Panel */}
              <motion.div
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-white/5 rounded-xl border border-white/10 p-5"
              >
                <h3 className="text-cyan-400 font-semibold text-sm uppercase tracking-wide mb-4">
                  Player Impact
                </h3>
                {eventRollResult.affectedPlayers.length > 0 ? (
                  eventRollResult.affectedPlayers.map((playerId) => {
                    const player = activeSession.players[playerId];
                    if (!player) return null;
                    const beforeResources = resourceSnapshots?.playersBefore[playerId];
                    const afterResources = player.resources;
                    const roleColor = ROLE_COLORS[player.roleId] ?? '#888';

                    return (
                      <div key={playerId} className="mb-4 last:mb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: roleColor }}
                          />
                          <span className="text-white font-medium text-sm">
                            {player.name}
                          </span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded capitalize"
                            style={{
                              color: roleColor,
                              backgroundColor: roleColor + '20',
                            }}
                          >
                            {player.roleId}
                          </span>
                        </div>
                        {beforeResources && (Object.keys(beforeResources) as ResourceType[]).map((rt) => (
                          <ResourceDelta
                            key={rt}
                            type={rt}
                            before={beforeResources[rt]}
                            after={afterResources[rt]}
                          />
                        ))}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-sm italic">No players directly affected</p>
                )}

                {/* Show event entry player effect text */}
                <div className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-gray-400 text-xs">{eventRollResult.eventEntry.playerEffect}</p>
                </div>
              </motion.div>
            </div>

            {/* Phase triggered info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-white/5 rounded-lg border border-white/10 px-6 py-3 mb-6"
            >
              <div className="flex items-center gap-3">
                <div className="text-gray-400 text-xs uppercase tracking-wide">Next:</div>
                <div className="text-white text-sm font-medium">
                  {eventRollResult.phaseTriggered === 'deliberation_all' && 'All players enter Deliberation'}
                  {eventRollResult.phaseTriggered === 'deliberation_partial' && `Deliberation with ${eventRollResult.deliberationPlayerCount} players`}
                  {eventRollResult.phaseTriggered === 'individual_only' && 'Individual Action Phase'}
                </div>
              </div>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleImpactDone}
              className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
            >
              Discard Event Card &rarr;
            </motion.button>
          </motion.div>
        )}

        {/* ═══ DISCARD ═══ */}
        {stage === 'discard' && eventCard && (
          <motion.div
            key="discard"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <motion.div
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: 300, y: 100, opacity: 0, scale: 0.5, rotate: 15 }}
              transition={{ duration: 0.5, ease: 'easeIn' }}
            >
              <CardFront card={eventCard} />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-4 text-gray-500 text-sm"
            >
              Card discarded
            </motion.p>
          </motion.div>
        )}

        {/* ═══ CONTINUE ═══ */}
        {stage === 'continue' && (
          <motion.div
            key="continue"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-6"
            >
              <span className="text-amber-400 text-2xl">&#10003;</span>
            </motion.div>

            <h2 className="text-white text-2xl font-bold mb-2">Event Phase Complete</h2>
            <p className="text-gray-400 text-sm mb-8">
              {eventRollResult
                ? `${eventRollResult.eventEntry.name} has been resolved`
                : 'No event this round'}
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleContinue}
              className="px-8 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-lg shadow-lg shadow-amber-500/30 transition-all"
            >
              Continue to Phase 2: Challenge &rarr;
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventRollPhase;
