import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store';
import { GameSession, EventCard, ResourcePool, ResourceType } from '../../core/models/types';
import { ROLE_COLORS, RESOURCE_COLORS } from '../../core/models/constants';
import { EVENT_CARDS } from '../../core/content/events';
import { PhaseNavigation } from '../effects/PhaseNavigation';

// ─── Types ───────────────────────────────────────────────────────

interface EventRollPhaseProps {
  session: GameSession;
  onPhaseComplete: () => void;
}

type Stage = 'intro' | 'rolling' | 'outcome' | 'card_draw' | 'impact' | 'discard' | 'continue';

// ─── Resource helpers ────────────────────────────────────────────

const RESOURCE_LABELS: Record<ResourceType, string> = {
  budget: 'Budget',
  influence: 'Influence',
  volunteer: 'Volunteers',
  material: 'Materials',
  knowledge: 'Knowledge',
};

// ─── Die Face Component ──────────────────────────────────────────
// Renders dot patterns on a 3x3 grid for values 1-6

const DOT_LAYOUTS: Record<number, [number, number][]> = {
  // [col, row] on 3x3 grid where 0=left/top, 1=center, 2=right/bottom
  1: [[1, 1]],
  2: [[2, 0], [0, 2]],
  3: [[2, 0], [1, 1], [0, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
};

function DieFace({ value, size = 80 }: { value: number; size?: number }) {
  const dots = DOT_LAYOUTS[Math.max(1, Math.min(6, value))] ?? DOT_LAYOUTS[1];
  const padding = size * 0.2;
  const cellSize = (size - padding * 2) / 2;
  const dotSize = 10;

  return (
    <div
      className="relative rounded-xl shadow-lg"
      style={{
        width: size,
        height: size,
        backgroundColor: '#ffffff',
        border: '2px solid rgba(0,0,0,0.15)',
      }}
    >
      {dots.map(([col, row], i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: dotSize,
            height: dotSize,
            backgroundColor: '#333',
            left: padding + col * cellSize - dotSize / 2,
            top: padding + row * cellSize - dotSize / 2,
          }}
        />
      ))}
    </div>
  );
}

// ─── Card Back ───────────────────────────────────────────────────

function CardBack({ type }: { type: 'negative' | 'positive' }) {
  const bgColor = type === 'negative'
    ? 'bg-gradient-to-br from-red-800 via-red-900 to-red-950'
    : 'bg-gradient-to-br from-emerald-800 via-emerald-900 to-emerald-950';
  const borderColor = type === 'negative' ? 'border-red-600/50' : 'border-emerald-600/50';

  return (
    <div className={`w-64 h-96 rounded-xl border-2 ${borderColor} ${bgColor} flex flex-col items-center justify-center shadow-2xl`}>
      <div className="w-48 h-72 rounded-lg border border-white/20 flex flex-col items-center justify-center">
        <div className="text-white/80 text-4xl font-bold mb-2">CG</div>
        <div className="text-white/40 text-xs tracking-widest uppercase">Common Ground</div>
        <div className="mt-4 w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center">
          <span className="text-white/60 text-lg">?</span>
        </div>
      </div>
    </div>
  );
}

// ─── Card Front ──────────────────────────────────────────────────

function CardFront({ card, eventEntry }: {
  card: EventCard;
  eventEntry?: { zoneEffect: string; playerEffect: string };
}) {
  const isNeg = card.type === 'negative';
  const borderColor = isNeg ? 'border-red-500' : 'border-emerald-500';
  const gradFrom = isNeg ? 'from-red-950' : 'from-emerald-950';
  const typeColor = isNeg ? 'text-red-400' : 'text-emerald-400';
  const typeBg = isNeg ? 'bg-red-500/20' : 'bg-emerald-500/20';

  return (
    <div className={`w-64 h-96 rounded-xl border-2 ${borderColor} bg-gradient-to-br ${gradFrom} to-slate-900 flex flex-col shadow-2xl overflow-hidden`}>
      <div className="px-4 pt-4 pb-2">
        <div className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${typeBg} ${typeColor} mb-2`}>
          {card.type} event
        </div>
        <h3 className="text-white font-bold text-lg leading-tight">{card.name}</h3>
      </div>

      <div className={`mx-4 h-px ${isNeg ? 'bg-red-500/30' : 'bg-emerald-500/30'}`} />

      <div className="px-4 py-3 flex-1 overflow-auto">
        <p className="text-gray-300 text-sm leading-relaxed">{card.description}</p>
      </div>

      {card.flavorText && (
        <div className="px-4 pb-2">
          <p className="text-gray-500 text-xs italic leading-snug">"{card.flavorText}"</p>
        </div>
      )}

      {eventEntry && (
        <div className="px-4 pb-2">
          <p className="text-gray-400 text-xs">Zone: {eventEntry.zoneEffect}</p>
          <p className="text-gray-400 text-xs">Players: {eventEntry.playerEffect}</p>
        </div>
      )}

      <div className="px-4 pb-4">
        <div className="text-xs text-gray-400 font-semibold uppercase mb-1">Effects ({card.effects.length})</div>
        {card.effects.slice(0, 3).map((effect, i) => (
          <div key={i} className="text-xs text-gray-400 truncate">
            {effect.type.replace(/_/g, ' ')} — {effect.target}
          </div>
        ))}
        {card.effects.length > 3 && (
          <div className="text-xs text-gray-500">+{card.effects.length - 3} more</div>
        )}
      </div>
    </div>
  );
}

// ─── Resource Delta Line ─────────────────────────────────────────

function ResourceDelta({ type, before, after }: { type: ResourceType; before: number; after: number }) {
  const delta = after - before;
  if (delta === 0) return null;
  const color = delta > 0 ? '#22c55e' : '#ef4444';
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
        style={{ backgroundColor: RESOURCE_COLORS[type] ?? '#888' }}
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
}

// ─── Mini Hex Board ──────────────────────────────────────────────

function MiniHexBoard({ zones, affectedZoneIds, eventColor }: {
  zones: Record<string, { id: string; name: string; gridPosition: { q: number; r: number } }>;
  affectedZoneIds: string[];
  eventColor: string;
}) {
  const zoneList = Object.values(zones);
  if (zoneList.length === 0) return null;

  const hexSize = 24;
  const hexWidth = hexSize * 2;
  const hexHeight = Math.sqrt(3) * hexSize;

  return (
    <div className="flex justify-center py-4">
      <svg width={280} height={160} viewBox="-40 -20 280 160">
        {zoneList.map((zone) => {
          const cx = zone.gridPosition.q * hexWidth * 0.75 + 100;
          const cy = zone.gridPosition.r * hexHeight + (zone.gridPosition.q % 2 === 0 ? 0 : hexHeight / 2) + 60;
          const isAffected = affectedZoneIds.includes(zone.id);

          return (
            <g key={zone.id}>
              {isAffected && (
                <circle cx={cx} cy={cy} r={hexSize + 6} fill={eventColor} opacity={0.25}>
                  <animate attributeName="r" values={`${hexSize + 4};${hexSize + 10};${hexSize + 4}`} dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}
              <RegularHex cx={cx} cy={cy} size={hexSize} fill={isAffected ? eventColor + '40' : '#374151'} stroke={isAffected ? eventColor : '#4B5563'} />
              <text x={cx} y={cy + 3} textAnchor="middle" fill={isAffected ? '#fff' : '#9CA3AF'} fontSize={7} fontWeight={isAffected ? 'bold' : 'normal'}>
                {zone.name.length > 8 ? zone.name.slice(0, 7) + '..' : zone.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function RegularHex({ cx, cy, size, fill, stroke }: { cx: number; cy: number; size: number; fill: string; stroke: string }) {
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    return `${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`;
  }).join(' ');

  return <polygon points={points} fill={fill} stroke={stroke} strokeWidth={1.5} />;
}

// ─── Main Component ──────────────────────────────────────────────

export function EventRollPhase({ session, onPhaseComplete }: EventRollPhaseProps) {
  const [stage, setStage] = useState<Stage>('intro');
  const [isRolling, setIsRolling] = useState(false);
  const [displayValue, setDisplayValue] = useState(1);
  const [isFlipped, setIsFlipped] = useState(false);
  const [resourceSnapshots, setResourceSnapshots] = useState<{
    playersBefore: Record<string, ResourcePool>;
    zonesBefore: Record<string, ResourcePool>;
  } | null>(null);

  const rollEventDie = useGameStore((s) => s.rollEventDie);
  const currentSession = useGameStore((s) => s.session);
  const activeSession = currentSession ?? session;

  const eventRollResult = activeSession.eventRollResult;
  const eventDieResult = activeSession.eventDieResult;

  // Determine the event card to show
  const eventCard = useMemo<EventCard | null>(() => {
    if (!eventRollResult) return null;
    const isNegative = eventDieResult?.outcome === 'negative_event';
    const matching = EVENT_CARDS.filter((c) => c.type === (isNegative ? 'negative' : 'positive'));
    if (matching.length === 0) return null;
    return matching[eventRollResult.total % matching.length];
  }, [eventRollResult, eventDieResult]);

  // Outcome classification using d6-mapped display value (from eventDieResult)
  const outcomeInfo = useMemo(() => {
    if (!eventDieResult) return null;
    const v = eventDieResult.value;
    if (v <= 2) {
      return {
        type: 'negative' as const,
        tint: 'rgba(220,38,38,0.15)',
        banner: '\u26A0\uFE0F NEGATIVE EVENT \u2014 A setback strikes the park',
        bannerBg: 'bg-red-900/60',
        bannerBorder: 'border-red-500/50',
      };
    }
    if (v <= 4) {
      return {
        type: 'stable' as const,
        tint: 'transparent',
        banner: '\u2796 STABLE \u2014 No external disruption this round.',
        bannerBg: 'bg-gray-800/60',
        bannerBorder: 'border-gray-500/50',
      };
    }
    return {
      type: 'positive' as const,
      tint: 'rgba(34,197,94,0.15)',
      banner: '\u2B50 POSITIVE EVENT \u2014 An opportunity emerges',
      bannerBg: 'bg-emerald-900/60',
      bannerBorder: 'border-emerald-500/50',
    };
  }, [eventDieResult]);

  // Map the 2d6 total to a d6 display value (1-6)
  const finalDieValue = useMemo(() => {
    if (!eventDieResult) return 1;
    return Math.max(1, Math.min(6, eventDieResult.value));
  }, [eventDieResult]);

  // ─── Auto-advance: intro → rolling ────────────────────────────
  useEffect(() => {
    if (stage === 'intro') {
      const t = setTimeout(() => setStage('rolling'), 1500);
      return () => clearTimeout(t);
    }
  }, [stage]);

  // ─── Auto-advance: outcome → card_draw (2s) for non-neutral ──
  useEffect(() => {
    if (stage === 'outcome' && outcomeInfo) {
      if (outcomeInfo.type === 'stable') return; // neutral shows continue immediately
      const t = setTimeout(() => setStage('card_draw'), 2000);
      return () => clearTimeout(t);
    }
  }, [stage, outcomeInfo]);

  // ─── Auto-advance: card_draw flip after 0.5s ─────────────────
  useEffect(() => {
    if (stage === 'card_draw' && !isFlipped) {
      const t = setTimeout(() => setIsFlipped(true), 500);
      return () => clearTimeout(t);
    }
  }, [stage, isFlipped]);

  // ─── Auto-advance: discard → continue ─────────────────────────
  useEffect(() => {
    if (stage === 'discard') {
      const t = setTimeout(() => setStage('continue'), 500);
      return () => clearTimeout(t);
    }
  }, [stage]);

  // ─── Die roll handler ─────────────────────────────────────────
  const handleRoll = useCallback(() => {
    if (isRolling) return;
    setIsRolling(true);

    // Snapshot resources before the roll
    const playersBefore: Record<string, ResourcePool> = {};
    const zonesBefore: Record<string, ResourcePool> = {};
    for (const [pid, player] of Object.entries(activeSession.players)) {
      playersBefore[pid] = { ...player.resources };
    }
    for (const zone of Object.values(activeSession.board.zones)) {
      zonesBefore[zone.id] = { ...zone.resources };
    }
    setResourceSnapshots({ playersBefore, zonesBefore });

    // Rapid random face values during tumble
    const interval = setInterval(() => {
      setDisplayValue(Math.floor(Math.random() * 6) + 1);
    }, 80);

    setTimeout(() => {
      clearInterval(interval);
      // Trigger the actual engine roll
      rollEventDie();
      setIsRolling(false);
      // Short pause then show outcome
      setTimeout(() => setStage('outcome'), 300);
    }, 1500);
  }, [isRolling, activeSession, rollEventDie]);

  // ─── Render ────────────────────────────────────────────────────

  // Value to show on the die face
  const shownValue = isRolling ? displayValue : (eventDieResult ? finalDieValue : 1);

  // Event color for impact visuals
  const eventColor = outcomeInfo?.type === 'negative' ? '#dc2626' : '#22c55e';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: stage === 'outcome' && outcomeInfo ? outcomeInfo.tint : 'rgba(0,0,0,0.92)' }}>
      <AnimatePresence mode="wait">

        {/* ════════════════ INTRO ════════════════ */}
        {stage === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center text-center"
          >
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-5xl font-serif font-bold text-amber-400 mb-4"
            >
              Phase 1: Event Roll
            </motion.h1>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-gray-300 text-lg italic"
            >
              External forces are at play. Roll the die to discover what changes.
            </motion.p>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="mt-6 h-0.5 w-64 bg-gradient-to-r from-transparent via-amber-400 to-transparent"
            />
          </motion.div>
        )}

        {/* ════════════════ ROLLING ════════════════ */}
        {stage === 'rolling' && (
          <motion.div
            key="rolling"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            {/* Wooden surface background */}
            <div
              className="absolute inset-0 -z-10 opacity-30"
              style={{
                background: 'linear-gradient(145deg, #5c3d1e 0%, #8b6914 30%, #6b4423 60%, #4a2c0a 100%)',
              }}
            />

            <h2 className="text-white text-2xl font-bold mb-8">Roll the Event Die</h2>

            {/* Single d6 die */}
            <motion.div
              className="cursor-pointer mb-8"
              animate={isRolling ? {
                rotateX: [0, 720, 1080, 1440],
                rotateY: [0, 540, 900, 1260],
                scale: [1, 1.3, 0.9, 1.15, 1],
              } : {}}
              transition={isRolling ? {
                duration: 1.5,
                type: 'spring',
                stiffness: 80,
              } : {}}
              style={{ perspective: 600 }}
              onClick={() => {
                if (!isRolling && !eventDieResult) handleRoll();
              }}
            >
              <DieFace value={shownValue} size={120} />
            </motion.div>

            {!isRolling && !eventDieResult && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-gray-400 text-sm animate-pulse"
              >
                Tap the die to roll
              </motion.p>
            )}

            {!isRolling && eventDieResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center"
              >
                <div className="text-white text-4xl font-bold mb-2">{finalDieValue}</div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ════════════════ OUTCOME ════════════════ */}
        {stage === 'outcome' && outcomeInfo && (
          <motion.div
            key="outcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center text-center max-w-lg"
          >
            {/* Die result */}
            <div className="mb-6">
              <DieFace value={finalDieValue} size={60} />
            </div>

            {/* Banner */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className={`px-8 py-4 rounded-lg border ${outcomeInfo.bannerBg} ${outcomeInfo.bannerBorder} mb-6`}
            >
              <h2 className="text-white text-xl font-bold tracking-wide">{outcomeInfo.banner}</h2>
            </motion.div>

            {/* For neutral: show Continue button immediately */}
            {outcomeInfo.type === 'stable' && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setStage('continue')}
                className="px-8 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-lg shadow-lg shadow-amber-500/30 transition-all"
              >
                Continue &rarr;
              </motion.button>
            )}
          </motion.div>
        )}

        {/* ════════════════ CARD DRAW ════════════════ */}
        {stage === 'card_draw' && eventCard && outcomeInfo && (
          <motion.div
            key="card_draw"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            {/* 3D flip container */}
            <div
              className="relative"
              style={{ perspective: 1200, width: 256, height: 384 }}
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
                  <CardBack type={outcomeInfo.type === 'negative' ? 'negative' : 'positive'} />
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
                  <CardFront card={eventCard} eventEntry={eventRollResult?.eventEntry} />
                </div>
              </motion.div>
            </div>

            {isFlipped && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setStage('impact')}
                className="mt-6 px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors border border-white/20"
              >
                See Impact &rarr;
              </motion.button>
            )}
          </motion.div>
        )}

        {/* ════════════════ IMPACT ════════════════ */}
        {stage === 'impact' && eventRollResult && (
          <motion.div
            key="impact"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center max-w-4xl w-full px-4 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-white text-2xl font-bold mb-2">Impact Assessment</h2>
            <p className="text-gray-400 text-sm mb-6">{eventRollResult.eventEntry.name}</p>

            {/* Split panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-6">
              {/* LEFT: Zone Impact */}
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
                    const zoneHexColor = eventColor;
                    const beforeRes = resourceSnapshots?.zonesBefore[zoneId];
                    const afterRes = zone.resources;

                    return (
                      <div key={zoneId} className="mb-4 last:mb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: zoneHexColor }} />
                          <span className="text-white font-medium text-sm">{zone.name}</span>
                        </div>
                        <p className="text-gray-400 text-xs mb-2">{eventRollResult.eventEntry.zoneEffect}</p>
                        {beforeRes && (Object.keys(beforeRes) as ResourceType[]).map((rt) => (
                          <ResourceDelta
                            key={rt}
                            type={rt}
                            before={beforeRes[rt]}
                            after={afterRes[rt]}
                          />
                        ))}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-sm italic">No zones directly affected</p>
                )}
              </motion.div>

              {/* RIGHT: Player Impact */}
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
                    const roleColor = ROLE_COLORS[player.roleId] ?? '#888';
                    const beforeRes = resourceSnapshots?.playersBefore[playerId];
                    const afterRes = player.resources;

                    return (
                      <div key={playerId} className="mb-4 last:mb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: roleColor }} />
                          <span className="text-white font-medium text-sm">{player.name}</span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded capitalize"
                            style={{ color: roleColor, backgroundColor: roleColor + '20' }}
                          >
                            {player.roleId}
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs mb-2">{eventRollResult.eventEntry.playerEffect}</p>
                        {beforeRes && (Object.keys(beforeRes) as ResourceType[]).map((rt) => (
                          <ResourceDelta
                            key={rt}
                            type={rt}
                            before={beforeRes[rt]}
                            after={afterRes[rt]}
                          />
                        ))}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-sm italic">No players directly affected</p>
                )}
              </motion.div>
            </div>

            {/* BOTTOM: Mini hex board */}
            <div className="w-full bg-white/5 rounded-xl border border-white/10 p-3 mb-6">
              <MiniHexBoard
                zones={activeSession.board.zones}
                affectedZoneIds={eventRollResult.affectedZones}
                eventColor={eventColor}
              />
            </div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStage('discard')}
              className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors border border-white/20"
            >
              Continue &rarr;
            </motion.button>
          </motion.div>
        )}

        {/* ════════════════ DISCARD ════════════════ */}
        {stage === 'discard' && eventCard && (
          <motion.div
            key="discard"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <motion.div
              initial={{ x: 0, opacity: 1, scale: 1 }}
              animate={{ x: 300, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.5, ease: 'easeIn' }}
            >
              <CardFront card={eventCard} eventEntry={eventRollResult?.eventEntry} />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 text-gray-500 text-sm"
            >
              Discarded: Event Deck {Math.max(0, EVENT_CARDS.length - (activeSession.currentRound))}/{EVENT_CARDS.length} remaining
            </motion.p>
          </motion.div>
        )}

        {/* ════════════════ CONTINUE ════════════════ */}
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
              onClick={onPhaseComplete}
              className="px-8 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-lg shadow-lg shadow-amber-500/30 transition-all"
            >
              Continue to Phase 2: Challenge &rarr;
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Universal bottom navigation */}
      <PhaseNavigation
        canContinue={stage === 'continue' || stage === 'impact' || stage === 'discard'}
        continueLabel="Continue to Phase 2: Challenge \u2192"
        onContinue={() => {
          console.log('PHASE TRANSITION: Event Roll → Challenge');
          onPhaseComplete();
        }}
        onSkip={() => {
          console.log('PHASE SKIP: Skipping Event Roll');
          onPhaseComplete();
        }}
        skipLabel="Skip Event Roll"
      />
    </div>
  );
}

export default EventRollPhase;
