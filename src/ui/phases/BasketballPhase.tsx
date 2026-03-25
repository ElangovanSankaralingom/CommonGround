import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  GameSession, Player, RoleId, ActionCard, ChallengeCard,
  ResourcePool, ResourceType, TriggerTile,
} from '../../core/models/types';
import { getAbilityModifier } from '../../core/models/types';
import {
  ROLE_COLORS, OBJECTIVE_WEIGHTS, COMBINATION_MATRIX, GRADUATED_OUTCOMES,
} from '../../core/models/constants';
import { determineGraduatedOutcome } from '../../core/engine/nashEngine';
import type { ObjectiveId } from '../../core/models/constants';

// ─── Types ──────────────────────────────────────────────────────

interface ResolutionResult {
  seriesValue: number;
  threshold: number;
  outcome: 'full_success' | 'partial_success' | 'narrow_success' | 'failure';
  chainBonus: number;
  synergyBonus: number;
  teamPlayBonus: boolean;
  zoneChange: number;
  contributions: Record<string, number>;
}

interface BasketballPhaseProps {
  session: GameSession;
  players: Player[];
  challenge: ChallengeCard;
  onPhaseComplete: (resolutionResult: ResolutionResult) => void;
  onPlayCard: (cardId: string, targetZoneId?: string) => void;
  onPassTurn: () => void;
  onUseAbility: () => void;
}

type Stage =
  | 'intro'
  | 'court_setup'
  | 'turns'
  | 'chain_display'
  | 'synergy_check'
  | 'the_shot'
  | 'trigger_check'
  | 'summary'
  | 'continue';

interface PlayedEntry {
  card: ActionCard | null;
  playerId: string;
  value: number;
  type: 'card' | 'resource' | 'pass' | 'ability';
}

// ─── Court positions (SVG coordinates) ──────────────────────────

const COURT_POSITIONS: { label: string; x: number; y: number }[] = [
  { label: 'PG', x: 120, y: 340 },  // Point Guard bottom-left
  { label: 'SG', x: 360, y: 340 },  // Shooting Guard bottom-right
  { label: 'SF', x: 100, y: 220 },  // Small Forward mid-left
  { label: 'PF', x: 380, y: 220 },  // Power Forward mid-right
  { label: 'C',  x: 240, y: 130 },  // Center top-center
];

const BASKET_POS = { x: 240, y: 40 };

// ─── Chain bonus table ──────────────────────────────────────────

function getChainBonus(chainLength: number): number {
  if (chainLength >= 4) return 9;
  if (chainLength === 3) return 5;
  if (chainLength === 2) return 2;
  return 0;
}

// ─── Helper: find longest tag chain ─────────────────────────────

function computeTagChain(entries: PlayedEntry[]): { length: number; bonus: number } {
  const cardEntries = entries.filter(e => e.card);
  if (cardEntries.length < 2) return { length: cardEntries.length, bonus: 0 };

  let maxChain = 1;
  let currentChain = 1;
  for (let i = 1; i < cardEntries.length; i++) {
    const prevTags = cardEntries[i - 1].card!.tags;
    const currTags = cardEntries[i].card!.tags;
    const overlap = prevTags.some(t => currTags.includes(t));
    if (overlap) {
      currentChain++;
      maxChain = Math.max(maxChain, currentChain);
    } else {
      currentChain = 1;
    }
  }
  return { length: maxChain, bonus: getChainBonus(maxChain) };
}

// ─── Helper: synergy check ──────────────────────────────────────

function computeSynergy(
  players: Player[],
  challengeZoneId: string
): { bonus: number; overlaps: { role1: RoleId; role2: RoleId; obj: string; weight: number }[] } {
  const overlaps: { role1: RoleId; role2: RoleId; obj: string; weight: number }[] = [];
  const objectives = Object.keys(OBJECTIVE_WEIGHTS.administrator) as ObjectiveId[];

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const r1 = players[i].roleId;
      const r2 = players[j].roleId;
      for (const obj of objectives) {
        const w1 = OBJECTIVE_WEIGHTS[r1][obj];
        const w2 = OBJECTIVE_WEIGHTS[r2][obj];
        if (w1 > 0 && w2 > 0) {
          overlaps.push({ role1: r1, role2: r2, obj, weight: w1 + w2 });
        }
      }
    }
  }

  const bonus = overlaps.reduce((s, o) => s + 1, 0);
  return { bonus: Math.min(bonus, 8), overlaps: overlaps.slice(0, 5) };
}

// ─── SVG Half Court ─────────────────────────────────────────────

const HalfCourt: React.FC = () => (
  <g>
    {/* Court floor */}
    <rect x="20" y="20" width="440" height="360" rx="8" fill="#1a472a" stroke="#f5d76e" strokeWidth="2" />
    {/* 3-point arc */}
    <path d="M 80 380 Q 240 40 400 380" fill="none" stroke="#f5d76e" strokeWidth="2" />
    {/* Key / lane */}
    <rect x="160" y="20" width="160" height="180" fill="none" stroke="#f5d76e" strokeWidth="2" />
    {/* Free throw circle */}
    <circle cx="240" cy="200" r="40" fill="none" stroke="#f5d76e" strokeWidth="1.5" strokeDasharray="6 3" />
    {/* Basket backboard */}
    <rect x="210" y="24" width="60" height="6" fill="#fff" rx="2" />
    {/* Rim */}
    <circle cx={BASKET_POS.x} cy={BASKET_POS.y} r="14" fill="none" stroke="#ff6b35" strokeWidth="3" />
  </g>
);

// ─── Ball component ─────────────────────────────────────────────

const Ball: React.FC<{ x: number; y: number; value: number; glow?: boolean; dim?: boolean }> = ({
  x, y, value, glow, dim,
}) => (
  <motion.g
    animate={{ x, y }}
    transition={{ type: 'spring', stiffness: 80, damping: 14, duration: 0.8 }}
  >
    <defs>
      <radialGradient id="ballGrad">
        <stop offset="20%" stopColor="#f5a623" />
        <stop offset="100%" stopColor="#c47f17" />
      </radialGradient>
    </defs>
    {glow && (
      <circle cx={0} cy={0} r="26" fill="none" stroke="#7efff5" strokeWidth="3" opacity={0.7}>
        <animate attributeName="r" values="26;32;26" dur="1s" repeatCount="indefinite" />
      </circle>
    )}
    <circle
      cx={0} cy={0} r="20"
      fill="url(#ballGrad)"
      stroke="#8b5e00" strokeWidth="2"
      opacity={dim ? 0.5 : 1}
    />
    {/* Seam lines */}
    <path d="M -14 0 Q 0 -10 14 0" fill="none" stroke="#8b5e00" strokeWidth="1" opacity={0.5} />
    <path d="M 0 -14 Q 6 0 0 14" fill="none" stroke="#8b5e00" strokeWidth="1" opacity={0.5} />
    <text x={0} y={5} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#fff">{value}</text>
  </motion.g>
);

// ─── Player Token ───────────────────────────────────────────────

const PlayerToken: React.FC<{
  player: Player; cx: number; cy: number; active: boolean; posLabel: string;
}> = ({ player, cx, cy, active, posLabel }) => {
  const color = ROLE_COLORS[player.roleId];
  return (
    <g>
      {active && (
        <circle cx={cx} cy={cy} r="30" fill="none" stroke="#fff" strokeWidth="3" opacity={0.8}>
          <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx={cx} cy={cy} r="22" fill={color} stroke="#fff" strokeWidth="2" />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="10" fill="#fff" fontWeight="bold">
        {posLabel}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="8" fill="#fff" opacity={0.9}>
        {player.name.slice(0, 6)}
      </text>
    </g>
  );
};

// ─── Confetti burst ─────────────────────────────────────────────

const Confetti: React.FC = () => {
  const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd'];
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    x: Math.random() * 440 + 20,
    endY: Math.random() * -200 - 50,
    delay: Math.random() * 0.4,
  }));
  return (
    <g>
      {particles.map(p => (
        <motion.circle
          key={p.id}
          cx={p.x}
          cy={BASKET_POS.y}
          r={3 + Math.random() * 3}
          fill={p.color}
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 0, y: p.endY, x: (Math.random() - 0.5) * 120 }}
          transition={{ duration: 1.2, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </g>
  );
};

// ─── Card Chain Display ─────────────────────────────────────────

const CardChain: React.FC<{ entries: PlayedEntry[] }> = ({ entries }) => {
  const cardEntries = entries.filter(e => e.card);
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2 px-3">
      {cardEntries.map((entry, i) => {
        const prevTags = i > 0 ? cardEntries[i - 1].card!.tags : [];
        const currTags = entry.card!.tags;
        const linked = prevTags.some(t => currTags.includes(t));
        return (
          <React.Fragment key={entry.card!.id + i}>
            {i > 0 && (
              <div className={`w-6 h-1 rounded ${linked ? 'bg-yellow-400 shadow-[0_0_8px_#f5d76e]' : 'bg-gray-600'}`} />
            )}
            <div
              className="flex-shrink-0 w-20 h-28 rounded-lg border-2 p-1 text-[9px] flex flex-col justify-between"
              style={{
                borderColor: ROLE_COLORS[entry.card!.roleId],
                backgroundColor: ROLE_COLORS[entry.card!.roleId] + '22',
              }}
            >
              <div className="font-bold text-white truncate">{entry.card!.name}</div>
              <div className="text-gray-300 truncate">{entry.card!.tags.join(', ')}</div>
              <div className="text-yellow-300 font-bold text-center text-sm">+{entry.value}</div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════

const BasketballPhase: React.FC<BasketballPhaseProps> = ({
  session, players, challenge, onPhaseComplete, onPlayCard, onPassTurn, onUseAbility,
}) => {
  // ─── State ──────────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>('intro');
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
  const [seriesValue, setSeriesValue] = useState(0);
  const [ballPos, setBallPos] = useState<{ x: number; y: number }>({ x: 240, y: 260 });
  const [ballGlow, setBallGlow] = useState(false);
  const [ballDim, setBallDim] = useState(false);
  const [playedEntries, setPlayedEntries] = useState<PlayedEntry[]>([]);
  const [contributions, setContributions] = useState<Record<string, number>>({});
  const [actionText, setActionText] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [shotOutcome, setShotOutcome] = useState<ReturnType<typeof determineGraduatedOutcome> | null>(null);
  const [triggerResult, setTriggerResult] = useState<string | null>(null);
  const [resolutionResult, setResolutionResult] = useState<ResolutionResult | null>(null);

  const threshold = challenge.difficulty;
  const challengeZoneId = challenge.affectedZoneIds[0] || '';

  // ─── Sort players by utility ascending ────────────────────
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => a.utilityScore - b.utilityScore);
  }, [players]);

  const activePlayer = sortedPlayers[currentTurnIdx] ?? null;

  // ─── Auto-advance intro → court_setup ─────────────────────
  useEffect(() => {
    if (stage === 'intro') {
      const t = setTimeout(() => setStage('court_setup'), 1500);
      return () => clearTimeout(t);
    }
  }, [stage]);

  // ─── Auto-advance court_setup → turns ─────────────────────
  useEffect(() => {
    if (stage === 'court_setup') {
      const t = setTimeout(() => setStage('turns'), 2000);
      return () => clearTimeout(t);
    }
  }, [stage]);

  // ─── Clear action text after delay ────────────────────────
  useEffect(() => {
    if (actionText) {
      const t = setTimeout(() => setActionText(''), 1500);
      return () => clearTimeout(t);
    }
  }, [actionText]);

  // ─── Advance turn or move to chain_display ────────────────
  const advanceTurn = useCallback(() => {
    if (currentTurnIdx + 1 < sortedPlayers.length) {
      setCurrentTurnIdx(prev => prev + 1);
      setBallDim(false);
      setBallGlow(false);
    } else {
      setStage('chain_display');
    }
  }, [currentTurnIdx, sortedPlayers.length]);

  // ─── Play a card action ───────────────────────────────────
  const handlePlayCard = useCallback((card: ActionCard) => {
    if (!activePlayer) return;
    const abilityMod = card.abilityCheck
      ? getAbilityModifier(activePlayer.abilities[card.abilityCheck.ability])
      : 0;
    const value = card.baseValue + Math.max(0, abilityMod);
    const pos = COURT_POSITIONS[currentTurnIdx];

    setBallPos({ x: pos.x, y: pos.y });
    setSeriesValue(prev => prev + value);
    setContributions(prev => ({
      ...prev,
      [activePlayer.id]: (prev[activePlayer.id] || 0) + value,
    }));
    setPlayedEntries(prev => [...prev, { card, playerId: activePlayer.id, value, type: 'card' }]);
    setBallGlow(false);
    setBallDim(false);

    const isAssist = playedEntries.length > 0 &&
      playedEntries[playedEntries.length - 1].card?.tags.some(t => card.tags.includes(t));
    setActionText(isAssist ? 'ASSIST!' : 'PASS!');

    onPlayCard(card.id, challengeZoneId);
    setSelectedCardId(null);

    setTimeout(advanceTurn, 1200);
  }, [activePlayer, currentTurnIdx, playedEntries, advanceTurn, onPlayCard, challengeZoneId]);

  // ─── Contribute resources action ──────────────────────────
  const handleContributeResources = useCallback(() => {
    if (!activePlayer) return;
    const resourceValue = 2;
    const pos = COURT_POSITIONS[currentTurnIdx];

    setBallPos({ x: pos.x, y: pos.y });
    setSeriesValue(prev => prev + resourceValue);
    setContributions(prev => ({
      ...prev,
      [activePlayer.id]: (prev[activePlayer.id] || 0) + resourceValue,
    }));
    setPlayedEntries(prev => [...prev, {
      card: null, playerId: activePlayer.id, value: resourceValue, type: 'resource',
    }]);
    setActionText('SCREEN SET!');
    setBallDim(false);

    setTimeout(advanceTurn, 1200);
  }, [activePlayer, currentTurnIdx, advanceTurn]);

  // ─── Pass / skip action ───────────────────────────────────
  const handlePass = useCallback(() => {
    if (!activePlayer) return;
    setPlayedEntries(prev => [...prev, {
      card: null, playerId: activePlayer.id, value: 0, type: 'pass',
    }]);
    setActionText('TIMEOUT');
    setBallDim(true);
    onPassTurn();

    setTimeout(advanceTurn, 1200);
  }, [activePlayer, advanceTurn, onPassTurn]);

  // ─── Unique ability action ────────────────────────────────
  const handleAbility = useCallback(() => {
    if (!activePlayer) return;
    const value = 3;
    const pos = COURT_POSITIONS[currentTurnIdx];

    setBallPos({ x: pos.x, y: pos.y });
    setSeriesValue(prev => prev + value);
    setContributions(prev => ({
      ...prev,
      [activePlayer.id]: (prev[activePlayer.id] || 0) + value,
    }));
    setPlayedEntries(prev => [...prev, {
      card: null, playerId: activePlayer.id, value, type: 'ability',
    }]);
    setBallGlow(true);
    setBallDim(false);
    setActionText('SPECIAL PLAY!');
    onUseAbility();

    setTimeout(advanceTurn, 1200);
  }, [activePlayer, currentTurnIdx, advanceTurn, onUseAbility]);

  // ─── Chain display → synergy_check ────────────────────────
  const chain = useMemo(() => computeTagChain(playedEntries), [playedEntries]);

  const handleChainContinue = useCallback(() => {
    setSeriesValue(prev => prev + chain.bonus);
    setStage('synergy_check');
  }, [chain.bonus]);

  // ─── Synergy check → the_shot ─────────────────────────────
  const synergy = useMemo(
    () => computeSynergy(sortedPlayers, challengeZoneId),
    [sortedPlayers, challengeZoneId]
  );

  const handleSynergyContinue = useCallback(() => {
    setSeriesValue(prev => prev + synergy.bonus);
    setStage('the_shot');
  }, [synergy.bonus]);

  // ─── The shot logic ───────────────────────────────────────
  useEffect(() => {
    if (stage === 'the_shot') {
      setBallPos({ x: BASKET_POS.x, y: BASKET_POS.y });
      const finalSV = seriesValue;
      const outcome = determineGraduatedOutcome(finalSV, threshold);
      setShotOutcome(outcome);

      if (outcome.type === 'full_success') {
        setTimeout(() => setShowConfetti(true), 800);
      }

      // Check for trigger tile
      const zone = session.board.zones[challengeZoneId];
      if (zone?.revealedTrigger) {
        const trigger = zone.revealedTrigger;
        if (trigger.type === 'trap') {
          setTriggerResult('TRAP: Basket tilts — resources partially wasted!');
        } else if (trigger.type === 'secret_door') {
          setTriggerResult('SECRET DOOR: Portal opens — bonus resources gained!');
        } else if (trigger.type === 'cascading_effect') {
          setTriggerResult('CASCADE: Ball splits to adjacent zones!');
        }
      }

      // Build resolution result
      const totalContrib = Object.values(contributions).reduce((s, v) => s + v, 0);
      const allContributed = sortedPlayers.every(p => (contributions[p.id] || 0) > 0);
      const teamPlayBonus = allContributed && sortedPlayers.length >= 5;
      const selfishPlayer = sortedPlayers.find(
        p => totalContrib > 0 && ((contributions[p.id] || 0) / totalContrib) > 0.7
      );

      const result: ResolutionResult = {
        seriesValue: finalSV,
        threshold,
        outcome: outcome.type,
        chainBonus: chain.bonus,
        synergyBonus: synergy.bonus,
        teamPlayBonus,
        zoneChange: outcome.zoneChange + (teamPlayBonus ? 1 : 0),
        contributions,
      };
      setResolutionResult(result);

      setTimeout(() => {
        if (zone?.revealedTrigger) {
          setStage('trigger_check');
        } else {
          setStage('summary');
        }
      }, 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // ─── Trigger check → summary ──────────────────────────────
  const handleTriggerContinue = useCallback(() => setStage('summary'), []);

  // ─── Summary → continue ───────────────────────────────────
  const handleSummaryContinue = useCallback(() => setStage('continue'), []);

  // ─── Final continue ───────────────────────────────────────
  const handleFinalContinue = useCallback(() => {
    if (resolutionResult) onPhaseComplete(resolutionResult);
  }, [resolutionResult, onPhaseComplete]);

  // ─── Computed values ──────────────────────────────────────
  const totalContrib = Object.values(contributions).reduce((s, v) => s + v, 0);
  const allContributed = sortedPlayers.every(p => (contributions[p.id] || 0) > 0);
  const selfishPlayer = sortedPlayers.find(
    p => totalContrib > 0 && ((contributions[p.id] || 0) / totalContrib) > 0.7
  );

  // ═════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col items-center p-4">
      {/* ── Intro ───────────────────────────────────────────── */}
      <AnimatePresence>
        {stage === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-[60vh] gap-4"
          >
            <motion.div
              className="text-5xl font-bold text-yellow-400"
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              Phase 4: Action Resolution
            </motion.div>
            <p className="text-xl text-gray-300">Work together like a basketball team!</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Court stages ────────────────────────────────────── */}
      {stage !== 'intro' && (
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-3 px-2">
            <div className="text-sm text-gray-400 uppercase tracking-wide">
              {challenge.name}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">Threshold:</span>
              <span className="text-xl font-bold text-red-400">{threshold}</span>
              <span className="text-sm text-gray-400 mx-2">|</span>
              <span className="text-sm text-gray-400">Series Value:</span>
              <span className="text-xl font-bold text-yellow-400">{seriesValue}</span>
            </div>
          </div>

          {/* SVG Court */}
          <div className="relative bg-gray-950 rounded-xl border border-gray-700 overflow-hidden">
            <svg viewBox="0 0 480 400" className="w-full">
              <HalfCourt />

              {/* Threshold on basket */}
              <text x={BASKET_POS.x} y={BASKET_POS.y + 4} textAnchor="middle" fontSize="11" fill="#ff6b35" fontWeight="bold">
                {threshold}
              </text>

              {/* Player tokens */}
              {sortedPlayers.map((player, i) => {
                const pos = COURT_POSITIONS[i];
                if (!pos) return null;
                return (
                  <PlayerToken
                    key={player.id}
                    player={player}
                    cx={pos.x}
                    cy={pos.y}
                    active={stage === 'turns' && i === currentTurnIdx}
                    posLabel={pos.label}
                  />
                );
              })}

              {/* Ball */}
              <Ball x={ballPos.x} y={ballPos.y} value={seriesValue} glow={ballGlow} dim={ballDim} />

              {/* Action text */}
              <AnimatePresence>
                {actionText && (
                  <motion.text
                    key={actionText}
                    x={240}
                    y={280}
                    textAnchor="middle"
                    fontSize="28"
                    fontWeight="bold"
                    fill="#fff"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.4 }}
                  >
                    {actionText}
                  </motion.text>
                )}
              </AnimatePresence>

              {/* Shot outcome text */}
              {stage === 'the_shot' && shotOutcome && (
                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
                  <text
                    x={240} y={80} textAnchor="middle" fontSize="22" fontWeight="bold"
                    fill={
                      shotOutcome.type === 'full_success' ? '#22c55e'
                        : shotOutcome.type === 'partial_success' ? '#f59e0b'
                          : shotOutcome.type === 'narrow_success' ? '#fbbf24'
                            : '#ef4444'
                    }
                  >
                    {shotOutcome.type === 'full_success' ? 'NOTHING BUT NET!'
                      : shotOutcome.type === 'partial_success' ? 'Off the rim — counts!'
                        : shotOutcome.type === 'narrow_success' ? 'BUZZER BEATER!'
                          : 'Missed!'}
                  </text>
                </motion.g>
              )}

              {/* Confetti */}
              {showConfetti && <Confetti />}
            </svg>

            {/* Shot result flash overlay */}
            {stage === 'the_shot' && shotOutcome && (
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1.5 }}
                style={{
                  backgroundColor:
                    shotOutcome.type === 'full_success' ? '#22c55e'
                      : shotOutcome.type === 'failure' ? '#ef4444'
                        : '#f59e0b',
                }}
              />
            )}
          </div>

          {/* ── Turns: player hand + actions ──────────────── */}
          {stage === 'turns' && activePlayer && (
            <motion.div
              key={activePlayer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-gray-800/80 rounded-xl p-4 border border-gray-700"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: ROLE_COLORS[activePlayer.roleId] }}
                />
                <span className="font-bold">{activePlayer.name}</span>
                <span className="text-gray-400 text-sm capitalize">({activePlayer.roleId})</span>
                <span className="ml-auto text-sm text-gray-400">
                  Ability uses: {activePlayer.uniqueAbilityUsesRemaining}
                </span>
              </div>

              {/* Card hand */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                {activePlayer.hand.map(card => (
                  <button
                    key={card.id}
                    onClick={() => setSelectedCardId(selectedCardId === card.id ? null : card.id)}
                    className={`flex-shrink-0 w-24 h-32 rounded-lg border-2 p-1.5 text-[10px] flex flex-col justify-between transition-all cursor-pointer ${
                      selectedCardId === card.id
                        ? 'ring-2 ring-yellow-400 scale-105'
                        : 'hover:scale-102'
                    }`}
                    style={{
                      borderColor: ROLE_COLORS[card.roleId],
                      backgroundColor: ROLE_COLORS[card.roleId] + '33',
                    }}
                  >
                    <div className="font-bold text-white truncate">{card.name}</div>
                    <div className="text-gray-300 text-[8px] truncate">{card.tags.join(', ')}</div>
                    <div className="text-yellow-300 font-bold text-center">Val: {card.baseValue}</div>
                  </button>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                <button
                  disabled={!selectedCardId}
                  onClick={() => {
                    const card = activePlayer.hand.find(c => c.id === selectedCardId);
                    if (card) handlePlayCard(card);
                  }}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:opacity-50 font-bold text-sm transition-colors"
                >
                  Play Card
                </button>
                <button
                  onClick={handleContributeResources}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold text-sm transition-colors"
                >
                  Contribute Resources
                </button>
                <button
                  onClick={handlePass}
                  className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-bold text-sm transition-colors"
                >
                  Pass (Draw 2)
                </button>
                <button
                  disabled={activePlayer.uniqueAbilityUsesRemaining <= 0}
                  onClick={handleAbility}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:opacity-50 font-bold text-sm transition-colors"
                >
                  Unique Ability
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Chain Display ────────────────────────────────── */}
          {stage === 'chain_display' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-gray-800/80 rounded-xl p-4 border border-gray-700"
            >
              <h3 className="text-lg font-bold text-yellow-400 mb-2">Card Chain (7 Wonders Style)</h3>
              <CardChain entries={playedEntries} />
              <div className="flex items-center justify-between mt-3">
                <div className="text-sm text-gray-300">
                  Longest chain: <span className="text-yellow-400 font-bold">{chain.length}</span>
                  {' '} | Chain bonus: <span className="text-green-400 font-bold">+{chain.bonus}</span>
                </div>
                <button
                  onClick={handleChainContinue}
                  className="px-5 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm transition-colors"
                >
                  Apply Chain Bonus
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Synergy Check ───────────────────────────────── */}
          {stage === 'synergy_check' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-gray-800/80 rounded-xl p-4 border border-gray-700"
            >
              <h3 className="text-lg font-bold text-cyan-400 mb-2">
                {synergy.bonus > 0 ? 'ALLEY-OOP! Objective Synergy Found!' : 'No Objective Synergy'}
              </h3>
              {synergy.overlaps.length > 0 && (
                <div className="space-y-1 mb-3">
                  {synergy.overlaps.map((o, i) => (
                    <div key={i} className="text-sm text-gray-300">
                      <span style={{ color: ROLE_COLORS[o.role1] }} className="font-bold capitalize">{o.role1}</span>
                      {' '}+{' '}
                      <span style={{ color: ROLE_COLORS[o.role2] }} className="font-bold capitalize">{o.role2}</span>
                      {' on '}
                      <span className="text-yellow-300">{o.obj}</span>
                      {' = weight '}
                      <span className="text-green-400">{o.weight}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-300">
                  Synergy bonus: <span className="text-cyan-400 font-bold">+{synergy.bonus}</span>
                </div>
                <button
                  onClick={handleSynergyContinue}
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm transition-colors"
                >
                  Take the Shot
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Trigger Check ───────────────────────────────── */}
          {stage === 'trigger_check' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-gray-800/80 rounded-xl p-4 border border-red-700"
            >
              <h3 className="text-lg font-bold text-red-400 mb-2">Trigger Tile Activated!</h3>
              <p className="text-gray-300 mb-4">{triggerResult}</p>
              <button
                onClick={handleTriggerContinue}
                className="px-5 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white font-bold text-sm transition-colors"
              >
                Continue
              </button>
            </motion.div>
          )}

          {/* ── Summary ─────────────────────────────────────── */}
          {stage === 'summary' && resolutionResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-gray-800/80 rounded-xl p-4 border border-gray-700 space-y-3"
            >
              <h3 className="text-lg font-bold text-yellow-400">Resolution Summary</h3>

              {/* Step-by-step calculation */}
              <div className="bg-gray-900/60 rounded-lg p-3 text-sm space-y-1">
                <div className="text-gray-400">Base card/ability values:
                  <span className="text-white ml-2">
                    {resolutionResult.seriesValue - resolutionResult.chainBonus - resolutionResult.synergyBonus - (resolutionResult.teamPlayBonus ? 3 : 0)}
                  </span>
                </div>
                <div className="text-gray-400">Chain bonus:
                  <span className="text-yellow-400 ml-2">+{resolutionResult.chainBonus}</span>
                </div>
                <div className="text-gray-400">Synergy bonus:
                  <span className="text-cyan-400 ml-2">+{resolutionResult.synergyBonus}</span>
                </div>
                {resolutionResult.teamPlayBonus && (
                  <div className="text-gray-400">Team play (all 5 contributed):
                    <span className="text-green-400 ml-2">+3</span>
                  </div>
                )}
                <div className="border-t border-gray-700 pt-1 text-gray-200 font-bold">
                  Final series value: {resolutionResult.seriesValue}
                  {resolutionResult.teamPlayBonus ? ' + 3 team play' : ''}
                  {' vs threshold '}{resolutionResult.threshold}
                </div>
              </div>

              {/* Outcome */}
              <div className={`rounded-lg p-3 text-center font-bold text-lg ${
                resolutionResult.outcome === 'full_success' ? 'bg-green-900/50 text-green-400' :
                resolutionResult.outcome === 'partial_success' ? 'bg-amber-900/50 text-amber-400' :
                resolutionResult.outcome === 'narrow_success' ? 'bg-yellow-900/50 text-yellow-400' :
                'bg-red-900/50 text-red-400'
              }`}>
                {shotOutcome?.description}
              </div>

              {/* Zone change */}
              <div className="text-sm text-gray-300">
                Zone condition change:{' '}
                <span className={resolutionResult.zoneChange > 0 ? 'text-green-400' : resolutionResult.zoneChange < 0 ? 'text-red-400' : 'text-gray-400'}>
                  {resolutionResult.zoneChange > 0 ? '+' : ''}{resolutionResult.zoneChange} step(s)
                </span>
              </div>

              {/* Player contributions */}
              <div className="text-sm">
                <div className="text-gray-400 mb-1">Contributions:</div>
                <div className="flex gap-3 flex-wrap">
                  {sortedPlayers.map(p => {
                    const val = contributions[p.id] || 0;
                    const pct = totalContrib > 0 ? Math.round((val / totalContrib) * 100) : 0;
                    return (
                      <div key={p.id} className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ROLE_COLORS[p.roleId] }} />
                        <span className="text-gray-300">{p.name}: {val}</span>
                        <span className="text-gray-500 text-xs">({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Warnings */}
              {selfishPlayer && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-2 text-sm text-red-300">
                  Warning: {selfishPlayer.name} contributed &gt;70% of total value. Selfish play detected.
                </div>
              )}

              <button
                onClick={handleSummaryContinue}
                className="w-full py-3 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-bold transition-colors"
              >
                View Final Result
              </button>
            </motion.div>
          )}

          {/* ── Continue ────────────────────────────────────── */}
          {stage === 'continue' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 flex justify-center"
            >
              <button
                onClick={handleFinalContinue}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold text-lg shadow-lg transition-all hover:scale-105"
              >
                Continue to Phase 5: Scoring &rarr;
              </button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

export default BasketballPhase;
