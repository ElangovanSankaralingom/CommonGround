import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GameSession, Player, ResourcePool, ResourceType, RoleId,
  ChallengeCard, TradeOffer, Zone, Promise as GamePromise,
} from '../../core/models/types';
import {
  ROLE_COLORS, RESOURCE_COLORS, WELFARE_WEIGHTS,
  BUCHI_OBJECTIVES, OBJECTIVE_WEIGHTS, ObjectiveId,
} from '../../core/models/constants';

// ─── Types ───────────────────────────────────────────────────────

interface DeliberationPhaseProps {
  session: GameSession;
  players: Player[];
  currentPlayerId: string;
  challenge: ChallengeCard | null;
  onPhaseComplete: () => void;
  onProposeTrade: (targetId: string, offering: Partial<ResourcePool>, requesting: Partial<ResourcePool>) => void;
  onAcceptTrade: (tradeId: string) => void;
  onRejectTrade: (tradeId: string) => void;
  onFormCoalition: (partnerIds: string[], targetZoneId: string) => void;
  onMakePromise: (toPlayerId: string, resource: ResourceType, amount: number) => void;
  onEndDeliberation: () => void;
  deliberationTimeRemaining: number;
}

type Stage = 'intro' | 'ispy' | 'ispy_results' | 'deliberation' | 'continue';
type DelibTab = 'trading' | 'coalition' | 'promises' | 'series';

interface ISpyDifference {
  zoneId: string;
  resource: ResourceType;
  hexIndex: number;
  found: boolean;
  foundBy: string | null;
}

// ─── Constants ──────────────────────────────────────────────────

const RES_ICON: Record<ResourceType, string> = {
  knowledge: '\u{1F4D6}',
  budget: '\u{1F4B0}',
  volunteer: '\u{1F464}',
  material: '\u{1F527}',
  influence: '\u2B50',
};

const RESOURCE_LABELS: Record<ResourceType, string> = {
  budget: 'Budget',
  influence: 'Influence',
  volunteer: 'Volunteers',
  material: 'Materials',
  knowledge: 'Knowledge',
};

const RESOURCE_TYPES: ResourceType[] = ['budget', 'influence', 'volunteer', 'material', 'knowledge'];

const ZONE_COLORS: Record<string, string> = {
  recreation: '#22C55E',
  infrastructure: '#6B7280',
  commercial: '#F59E0B',
  ecological: '#10B981',
  cultural: '#A855F7',
  administrative: '#EF4444',
  development: '#3B82F6',
  utility: '#6366F1',
};

// ─── Hex Grid Helper ────────────────────────────────────────────

const HEX_LAYOUT = [
  { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 },
  { q: 0, r: 1 }, { q: 1, r: 1 }, { q: 2, r: 1 }, { q: 3, r: 1 },
  { q: 0, r: 2 }, { q: 1, r: 2 }, { q: 2, r: 2 }, { q: 3, r: 2 },
  { q: 0, r: 3 }, { q: 1, r: 3 }, { q: 2, r: 3 },
];

function hexToPixel(q: number, r: number, size: number): { x: number; y: number } {
  const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const y = size * (1.5 * r);
  return { x, y };
}

// ─── Seeded RNG ─────────────────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Generate I-Spy Differences ─────────────────────────────────

function generateDifferences(session: GameSession): ISpyDifference[] {
  const rand = seededRandom(session.rngSeed + session.currentRound * 100);
  const zoneIds = Object.keys(session.board.zones);
  const diffs: ISpyDifference[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < 7 && i < HEX_LAYOUT.length; i++) {
    let hexIdx: number;
    do {
      hexIdx = Math.floor(rand() * HEX_LAYOUT.length);
    } while (usedIndices.has(hexIdx));
    usedIndices.add(hexIdx);

    const zoneId = zoneIds[Math.floor(rand() * zoneIds.length)] ?? 'unknown';
    const resource = RESOURCE_TYPES[Math.floor(rand() * RESOURCE_TYPES.length)];
    diffs.push({ zoneId, resource, hexIndex: hexIdx, found: false, foundBy: null });
  }
  return diffs;
}

// ─── Büchi Status Helper ────────────────────────────────────────

function getBuchiStatus(
  session: GameSession,
  player: Player
): 'safe' | 'warning' | 'crisis' {
  const history = session.buchiHistory?.[player.id];
  if (!history) return 'safe';
  const objs = BUCHI_OBJECTIVES[player.roleId] ?? [];
  let maxMissed = 0;
  for (const obj of objs) {
    const missed = history[obj] ?? 0;
    if (missed > maxMissed) maxMissed = missed;
  }
  if (maxMissed >= 2) return 'crisis';
  if (maxMissed >= 1) return 'warning';
  return 'safe';
}

// ─── Mini Hex Component ─────────────────────────────────────────

const MiniHex: React.FC<{
  x: number; y: number; size: number; color: string;
  icon?: string; onClick?: () => void; highlight?: boolean;
}> = ({ x, y, size, color, icon, onClick, highlight }) => {
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return `${x + size * Math.cos(angle)},${y + size * Math.sin(angle)}`;
  }).join(' ');

  return (
    <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <polygon
        points={points}
        fill={color}
        stroke={highlight ? '#FFD700' : '#374151'}
        strokeWidth={highlight ? 3 : 1.5}
        opacity={0.85}
      />
      {icon && (
        <text x={x} y={y + 5} textAnchor="middle" fontSize={size * 0.6} className="select-none">
          {icon}
        </text>
      )}
    </g>
  );
};

// ─── I-Spy Board Component ──────────────────────────────────────

const ISpyBoard: React.FC<{
  zones: Record<string, Zone>;
  differences: ISpyDifference[];
  showDifferences: boolean;
  onClickDiff?: (index: number) => void;
  highlightIndex?: number;
  label: string;
}> = ({ zones, differences, showDifferences, onClickDiff, highlightIndex, label }) => {
  const hexSize = 28;
  const zoneArr = Object.values(zones);

  return (
    <div className="flex flex-col items-center">
      <div className="text-sm font-bold text-white/80 mb-2">{label}</div>
      <svg width={280} height={220} viewBox="-10 -10 280 220">
        {HEX_LAYOUT.map((pos, i) => {
          const { x, y } = hexToPixel(pos.q, pos.r, hexSize);
          const zone = zoneArr[i % zoneArr.length];
          const color = ZONE_COLORS[zone?.zoneType ?? 'utility'] ?? '#4B5563';
          const diff = showDifferences
            ? differences.find((d) => d.hexIndex === i)
            : undefined;

          return (
            <MiniHex
              key={i}
              x={x + 50}
              y={y + 30}
              size={hexSize}
              color={diff?.found ? '#1F2937' : color}
              icon={diff && !diff.found ? RES_ICON[diff.resource] : diff?.found ? '\u2705' : undefined}
              onClick={diff && !diff.found && onClickDiff ? () => onClickDiff(differences.indexOf(diff)) : undefined}
              highlight={highlightIndex !== undefined && diff?.hexIndex === differences[highlightIndex]?.hexIndex}
            />
          );
        })}
      </svg>
    </div>
  );
};

// ─── Resource Card Component ────────────────────────────────────

const ResourceCard: React.FC<{
  type: ResourceType; count: number; selected?: boolean; onClick?: () => void;
}> = ({ type, count, selected, onClick }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`flex flex-col items-center p-2 rounded-lg border-2 cursor-pointer transition-colors min-w-[60px] ${
      selected ? 'border-amber-400 bg-amber-400/20' : 'border-white/20 bg-white/5 hover:bg-white/10'
    }`}
  >
    <span className="text-xl">{RES_ICON[type]}</span>
    <span className="text-xs text-white/70 mt-1">{RESOURCE_LABELS[type]}</span>
    <span className="text-sm font-bold text-white">{count}</span>
  </motion.div>
);

// ─── Player Portrait ────────────────────────────────────────────

const PlayerPortrait: React.FC<{
  player: Player; selected?: boolean; onClick?: () => void; small?: boolean;
}> = ({ player, selected, onClick, small }) => (
  <motion.div
    whileHover={onClick ? { scale: 1.08 } : {}}
    onClick={onClick}
    className={`flex flex-col items-center p-1 rounded-lg border-2 transition-colors ${
      onClick ? 'cursor-pointer' : ''
    } ${selected ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-white/5'}`}
    style={{ borderColor: selected ? '#FFD700' : ROLE_COLORS[player.roleId] + '60' }}
  >
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold ${small ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'}`}
      style={{ backgroundColor: ROLE_COLORS[player.roleId] }}
    >
      {player.name.charAt(0).toUpperCase()}
    </div>
    <span className={`text-white/80 mt-1 ${small ? 'text-[10px]' : 'text-xs'}`}>{player.name}</span>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const DeliberationPhase: React.FC<DeliberationPhaseProps> = ({
  session, players, currentPlayerId, challenge,
  onPhaseComplete, onProposeTrade, onAcceptTrade, onRejectTrade,
  onFormCoalition, onMakePromise, onEndDeliberation, deliberationTimeRemaining,
}) => {
  const [stage, setStage] = useState<Stage>('intro');
  const [delibTab, setDelibTab] = useState<DelibTab>('trading');

  // I-Spy state
  const [differences, setDifferences] = useState<ISpyDifference[]>([]);
  const [ispyTurnIndex, setIspyTurnIndex] = useState(0);
  const [ispyTimer, setIspyTimer] = useState(15);
  const [ispyTotalFound, setIspyTotalFound] = useState(0);
  const [highlightHint, setHighlightHint] = useState<number | undefined>(undefined);

  // Trading state
  const [tradeTarget, setTradeTarget] = useState<string | null>(null);
  const [offering, setOffering] = useState<Partial<ResourcePool>>({});
  const [requesting, setRequesting] = useState<Partial<ResourcePool>>({});

  // Coalition state
  const [coalitionPartners, setCoalitionPartners] = useState<string[]>([]);
  const [coalitionZone, setCoalitionZone] = useState<string>('');

  // Promise state
  const [promiseTarget, setPromiseTarget] = useState<string>('');
  const [promiseResource, setPromiseResource] = useState<ResourceType>('budget');
  const [promiseAmount, setPromiseAmount] = useState(1);

  // Ready state
  const [readyPlayers, setReadyPlayers] = useState<Set<string>>(new Set());

  // Sort players by utility (lowest first) for I-Spy turn order
  const ispyOrder = useMemo(
    () => [...players].sort((a, b) => a.utilityScore - b.utilityScore),
    [players]
  );

  const currentPlayer = useMemo(
    () => players.find((p) => p.id === currentPlayerId),
    [players, currentPlayerId]
  );

  // ─── Stage Transitions ───────────────────────────────────────

  useEffect(() => {
    if (stage === 'intro') {
      const t = setTimeout(() => {
        const diffs = generateDifferences(session);
        setDifferences(diffs);
        setStage('ispy');
      }, 1500);
      return () => clearTimeout(t);
    }
    if (stage === 'ispy_results') {
      const t = setTimeout(() => setStage('deliberation'), 2000);
      return () => clearTimeout(t);
    }
    if (stage === 'continue') {
      onPhaseComplete();
    }
  }, [stage, session, onPhaseComplete]);

  // ─── I-Spy Timer ──────────────────────────────────────────────

  useEffect(() => {
    if (stage !== 'ispy') return;
    if (ispyTurnIndex >= ispyOrder.length) {
      // Check equity: give hint to players who found 0
      const unfound = differences.filter((d) => !d.found);
      if (unfound.length > 0) {
        for (const p of ispyOrder) {
          const foundCount = differences.filter((d) => d.foundBy === p.id).length;
          if (foundCount === 0 && unfound.length > 0) {
            setHighlightHint(differences.indexOf(unfound[0]));
            break;
          }
        }
      }
      setStage('ispy_results');
      return;
    }

    const interval = setInterval(() => {
      setIspyTimer((prev) => {
        if (prev <= 1) {
          setIspyTurnIndex((idx) => idx + 1);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [stage, ispyTurnIndex, ispyOrder.length, differences]);

  // ─── I-Spy Click Handler ──────────────────────────────────────

  const handleISpyClick = useCallback(
    (diffIndex: number) => {
      if (stage !== 'ispy') return;
      const activePlayer = ispyOrder[ispyTurnIndex];
      if (!activePlayer) return;

      setDifferences((prev) => {
        const next = [...prev];
        if (!next[diffIndex].found) {
          next[diffIndex] = { ...next[diffIndex], found: true, foundBy: activePlayer.id };
          setIspyTotalFound((c) => c + 1);
        }
        return next;
      });

      // Advance turn after finding
      setIspyTimer(15);
      setIspyTurnIndex((idx) => idx + 1);
    },
    [stage, ispyTurnIndex, ispyOrder]
  );

  // ─── Trade Handlers ───────────────────────────────────────────

  const toggleOffering = useCallback((type: ResourceType) => {
    setOffering((prev) => {
      const current = prev[type] ?? 0;
      const max = currentPlayer?.resources[type] ?? 0;
      return { ...prev, [type]: current >= max ? 0 : current + 1 };
    });
  }, [currentPlayer]);

  const toggleRequesting = useCallback((type: ResourceType) => {
    setRequesting((prev) => {
      const current = prev[type] ?? 0;
      return { ...prev, [type]: current >= 5 ? 0 : current + 1 };
    });
  }, []);

  const submitTrade = useCallback(() => {
    if (!tradeTarget) return;
    const hasOffer = Object.values(offering).some((v) => v && v > 0);
    const hasRequest = Object.values(requesting).some((v) => v && v > 0);
    if (!hasOffer && !hasRequest) return;
    onProposeTrade(tradeTarget, offering, requesting);
    setOffering({});
    setRequesting({});
    setTradeTarget(null);
  }, [tradeTarget, offering, requesting, onProposeTrade]);

  // ─── Coalition Handler ────────────────────────────────────────

  const submitCoalition = useCallback(() => {
    if (coalitionPartners.length === 0 || !coalitionZone) return;
    onFormCoalition(coalitionPartners, coalitionZone);
    setCoalitionPartners([]);
    setCoalitionZone('');
  }, [coalitionPartners, coalitionZone, onFormCoalition]);

  // ─── Promise Handler ──────────────────────────────────────────

  const submitPromise = useCallback(() => {
    if (!promiseTarget) return;
    onMakePromise(promiseTarget, promiseResource, promiseAmount);
    setPromiseTarget('');
    setPromiseAmount(1);
  }, [promiseTarget, promiseResource, promiseAmount, onMakePromise]);

  // ─── Ready / End ──────────────────────────────────────────────

  const handleReady = useCallback(() => {
    setReadyPlayers((prev) => {
      const next = new Set(prev);
      next.add(currentPlayerId);
      if (next.size >= players.length) {
        onEndDeliberation();
        setStage('continue');
      }
      return next;
    });
  }, [currentPlayerId, players.length, onEndDeliberation]);

  useEffect(() => {
    if (stage === 'deliberation' && deliberationTimeRemaining <= 0) {
      onEndDeliberation();
      setStage('continue');
    }
  }, [stage, deliberationTimeRemaining, onEndDeliberation]);

  // ─── Computed ─────────────────────────────────────────────────

  const pendingTrades = useMemo(
    () => (session.tradeOffers ?? []).filter((t) => t.status === 'pending'),
    [session.tradeOffers]
  );

  const activePromises = useMemo(
    () => (session.promises ?? []).filter((p) => !p.fulfilled && !p.broken),
    [session.promises]
  );

  const brokenPromises = useMemo(
    () => (session.promises ?? []).filter((p) => p.broken),
    [session.promises]
  );

  const zones = useMemo(() => Object.values(session.board.zones), [session.board.zones]);

  const timerColor = deliberationTimeRemaining < 60 ? 'text-red-400' : 'text-white';
  const timerMinutes = Math.floor(deliberationTimeRemaining / 60);
  const timerSeconds = deliberationTimeRemaining % 60;

  // ═════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
      <AnimatePresence mode="wait">
        {/* ── INTRO ─────────────────────────────────────────── */}
        {stage === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-[80vh]"
          >
            <div className="text-6xl mb-4">{'\u{1F50D}'}</div>
            <h1 className="text-3xl font-bold text-white mb-2">Phase 3: Deliberation</h1>
            <p className="text-white/60 text-lg">Negotiate, discover resources, and plan your strategy</p>
          </motion.div>
        )}

        {/* ── I-SPY ─────────────────────────────────────────── */}
        {stage === 'ispy' && (
          <motion.div
            key="ispy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <h2 className="text-xl font-bold text-white mb-1">{'\u{1F50E}'} I-Spy Resource Discovery</h2>
            <p className="text-white/50 text-sm mb-3">
              Find the hidden resources! Click differences on the Potential State board.
            </p>

            {/* Turn info */}
            <div className="flex items-center gap-4 mb-3">
              {ispyTurnIndex < ispyOrder.length ? (
                <>
                  <span className="text-white/70 text-sm">Current Turn:</span>
                  <span
                    className="font-bold text-sm px-2 py-1 rounded"
                    style={{ color: ROLE_COLORS[ispyOrder[ispyTurnIndex].roleId] }}
                  >
                    {ispyOrder[ispyTurnIndex].name}
                  </span>
                  <span className="text-amber-400 font-mono text-lg">{ispyTimer}s</span>
                </>
              ) : (
                <span className="text-green-400 font-bold">Discovery Complete!</span>
              )}
            </div>

            {/* Player found counts */}
            <div className="flex gap-3 mb-4">
              {ispyOrder.map((p) => {
                const found = differences.filter((d) => d.foundBy === p.id).length;
                return (
                  <div
                    key={p.id}
                    className={`text-xs px-2 py-1 rounded border ${
                      ispyOrder[ispyTurnIndex]?.id === p.id
                        ? 'border-amber-400 bg-amber-400/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <span style={{ color: ROLE_COLORS[p.roleId] }}>{p.name}</span>
                    <span className="text-white/50 ml-1">({found})</span>
                  </div>
                );
              })}
            </div>

            {/* Side-by-side boards */}
            <div className="flex gap-6">
              <ISpyBoard
                zones={session.board.zones}
                differences={differences}
                showDifferences={false}
                label="Current State"
              />
              <ISpyBoard
                zones={session.board.zones}
                differences={differences}
                showDifferences={true}
                onClickDiff={ispyTurnIndex < ispyOrder.length ? handleISpyClick : undefined}
                highlightIndex={highlightHint}
                label="Potential State"
              />
            </div>

            <div className="mt-3 text-white/40 text-xs">
              {ispyTotalFound} / {differences.length} resources discovered
            </div>
          </motion.div>
        )}

        {/* ── I-SPY RESULTS ─────────────────────────────────── */}
        {stage === 'ispy_results' && (
          <motion.div
            key="ispy_results"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[60vh]"
          >
            <div className="text-5xl mb-3">{'\u{1F381}'}</div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Resource Discovery Complete &mdash; {ispyTotalFound} resources claimed
            </h2>
            <div className="flex gap-4">
              {ispyOrder.map((p) => {
                const found = differences.filter((d) => d.foundBy === p.id);
                return (
                  <div key={p.id} className="bg-white/5 rounded-lg p-3 border border-white/10 min-w-[120px]">
                    <div className="font-bold text-sm mb-1" style={{ color: ROLE_COLORS[p.roleId] }}>
                      {p.name}
                    </div>
                    {found.length === 0 ? (
                      <div className="text-white/40 text-xs">No resources</div>
                    ) : (
                      found.map((d, i) => (
                        <div key={i} className="text-xs text-white/70">
                          {RES_ICON[d.resource]} {RESOURCE_LABELS[d.resource]}
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── DELIBERATION ──────────────────────────────────── */}
        {stage === 'deliberation' && (
          <motion.div
            key="deliberation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-[calc(100vh-2rem)]"
          >
            {/* ── Objective Visibility Bar ─────────────────── */}
            <div className="flex gap-2 mb-3 bg-white/5 rounded-lg p-2 border border-white/10">
              {players.map((p) => {
                const buchiStatus = getBuchiStatus(session, p);
                const ww = WELFARE_WEIGHTS[p.roleId];
                const statusColor =
                  buchiStatus === 'crisis' ? '#EF4444' : buchiStatus === 'warning' ? '#F59E0B' : '#22C55E';
                const objs = OBJECTIVE_WEIGHTS[p.roleId];
                const topObjs = Object.entries(objs)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 2)
                  .map(([k]) => k);

                return (
                  <div
                    key={p.id}
                    className="flex-1 rounded-md p-2 border"
                    style={{ borderColor: ROLE_COLORS[p.roleId] + '60' }}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: ROLE_COLORS[p.roleId] }}
                      />
                      <span className="text-xs font-bold text-white truncate">{p.name}</span>
                    </div>
                    <div className="text-[10px] text-white/50">
                      U: {p.utilityScore.toFixed(1)} | W: {ww}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
                      <span className="text-[10px]" style={{ color: statusColor }}>
                        {buchiStatus}
                      </span>
                    </div>
                    <div className="text-[10px] text-white/30 mt-1">
                      {topObjs.join(', ')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Tab Navigation ───────────────────────────── */}
            <div className="flex gap-1 mb-3">
              {([
                ['trading', '\u{1F4B1} Trading'],
                ['coalition', '\u{1F91D} Coalition'],
                ['promises', '\u{1F4DC} Promises'],
                ['series', '\u{1F0CF} Series'],
              ] as [DelibTab, string][]).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setDelibTab(tab)}
                  className={`px-3 py-1.5 rounded-t-lg text-sm font-medium transition-colors ${
                    delibTab === tab
                      ? 'bg-white/10 text-white border-b-2 border-amber-400'
                      : 'bg-white/5 text-white/50 hover:text-white/70'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Panel Content ─────────────────────────────── */}
            <div className="flex-1 overflow-y-auto bg-white/5 rounded-lg border border-white/10 p-4">
              {/* ── TRADING TAB ──────────────────────────── */}
              {delibTab === 'trading' && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-3">{'\u{1F4B1}'} Trade Resources</h3>

                  {/* My resources */}
                  <div className="mb-4">
                    <div className="text-xs text-white/50 mb-2 uppercase tracking-wider">Your Resources — click to offer</div>
                    <div className="flex gap-2 flex-wrap">
                      {RESOURCE_TYPES.map((type) => (
                        <ResourceCard
                          key={type}
                          type={type}
                          count={currentPlayer?.resources[type] ?? 0}
                          selected={(offering[type] ?? 0) > 0}
                          onClick={() => toggleOffering(type)}
                        />
                      ))}
                    </div>
                    {Object.entries(offering).some(([, v]) => v && v > 0) && (
                      <div className="mt-2 text-xs text-amber-400">
                        Offering: {Object.entries(offering)
                          .filter(([, v]) => v && v > 0)
                          .map(([k, v]) => `${v} ${RESOURCE_LABELS[k as ResourceType]}`)
                          .join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Requesting */}
                  <div className="mb-4">
                    <div className="text-xs text-white/50 mb-2 uppercase tracking-wider">Requesting — click to add</div>
                    <div className="flex gap-2 flex-wrap">
                      {RESOURCE_TYPES.map((type) => (
                        <ResourceCard
                          key={type}
                          type={type}
                          count={requesting[type] ?? 0}
                          selected={(requesting[type] ?? 0) > 0}
                          onClick={() => toggleRequesting(type)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Target selection */}
                  <div className="mb-4">
                    <div className="text-xs text-white/50 mb-2 uppercase tracking-wider">Send Trade To</div>
                    <div className="flex gap-2">
                      {players
                        .filter((p) => p.id !== currentPlayerId)
                        .map((p) => (
                          <PlayerPortrait
                            key={p.id}
                            player={p}
                            selected={tradeTarget === p.id}
                            onClick={() => setTradeTarget(p.id)}
                            small
                          />
                        ))}
                    </div>
                  </div>

                  <button
                    onClick={submitTrade}
                    disabled={!tradeTarget}
                    className="px-4 py-2 bg-amber-500 text-black rounded-lg font-bold text-sm disabled:opacity-30 hover:bg-amber-400 transition-colors"
                  >
                    Send Trade Offer
                  </button>

                  {/* Pending trades */}
                  {pendingTrades.length > 0 && (
                    <div className="mt-6">
                      <div className="text-xs text-white/50 mb-2 uppercase tracking-wider">Pending Trades</div>
                      {pendingTrades.map((trade) => {
                        const proposer = players.find((p) => p.id === trade.proposerId);
                        const target = players.find((p) => p.id === trade.targetId);
                        const isForMe = trade.targetId === currentPlayerId;

                        return (
                          <motion.div
                            key={trade.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white/5 rounded-lg p-3 border border-white/10 mb-2"
                          >
                            <div className="text-sm text-white mb-1">
                              <span style={{ color: ROLE_COLORS[proposer?.roleId ?? 'citizen'] }}>
                                {proposer?.name}
                              </span>
                              {' \u2192 '}
                              <span style={{ color: ROLE_COLORS[target?.roleId ?? 'citizen'] }}>
                                {target?.name}
                              </span>
                            </div>
                            <div className="text-xs text-white/50">
                              Offering:{' '}
                              {Object.entries(trade.offering)
                                .filter(([, v]) => v && v > 0)
                                .map(([k, v]) => `${v} ${RESOURCE_LABELS[k as ResourceType]}`)
                                .join(', ') || 'nothing'}
                            </div>
                            <div className="text-xs text-white/50">
                              Requesting:{' '}
                              {Object.entries(trade.requesting)
                                .filter(([, v]) => v && v > 0)
                                .map(([k, v]) => `${v} ${RESOURCE_LABELS[k as ResourceType]}`)
                                .join(', ') || 'nothing'}
                            </div>
                            {isForMe && (
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => onAcceptTrade(trade.id)}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-500"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => onRejectTrade(trade.id)}
                                  className="px-3 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-500"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── COALITION TAB ────────────────────────── */}
              {delibTab === 'coalition' && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-3">{'\u{1F91D}'} Form Coalition</h3>
                  <p className="text-white/50 text-sm mb-4">
                    Select partners and a target zone. Coalitions grant a +2 bonus to resolution.
                  </p>

                  {/* Partner selection */}
                  <div className="mb-4">
                    <div className="text-xs text-white/50 mb-2 uppercase tracking-wider">Select Partners</div>
                    <div className="flex gap-2 flex-wrap">
                      {players
                        .filter((p) => p.id !== currentPlayerId)
                        .map((p) => (
                          <PlayerPortrait
                            key={p.id}
                            player={p}
                            selected={coalitionPartners.includes(p.id)}
                            onClick={() =>
                              setCoalitionPartners((prev) =>
                                prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                              )
                            }
                          />
                        ))}
                    </div>
                  </div>

                  {/* Zone selection */}
                  <div className="mb-4">
                    <div className="text-xs text-white/50 mb-2 uppercase tracking-wider">Target Zone</div>
                    <select
                      value={coalitionZone}
                      onChange={(e) => setCoalitionZone(e.target.value)}
                      className="bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2 text-sm w-full"
                    >
                      <option value="">Select a zone...</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name} ({z.condition})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Coalition preview */}
                  {coalitionPartners.length > 0 && coalitionZone && (
                    <div className="bg-indigo-900/30 rounded-lg p-3 border border-indigo-400/30 mb-4">
                      <div className="text-sm font-bold text-indigo-300 mb-1">Coalition Preview</div>
                      <div className="text-xs text-white/70">
                        Members: {[currentPlayer?.name, ...coalitionPartners.map((id) => players.find((p) => p.id === id)?.name)].join(', ')}
                      </div>
                      <div className="text-xs text-white/70">
                        Target: {zones.find((z) => z.id === coalitionZone)?.name}
                      </div>
                      <div className="text-xs text-green-400 mt-1">+2 Coalition Bonus</div>
                    </div>
                  )}

                  <button
                    onClick={submitCoalition}
                    disabled={coalitionPartners.length === 0 || !coalitionZone}
                    className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-bold text-sm disabled:opacity-30 hover:bg-indigo-400 transition-colors"
                  >
                    Form Coalition
                  </button>

                  {/* Active coalitions */}
                  {session.activeCoalitions.length > 0 && (
                    <div className="mt-6">
                      <div className="text-xs text-white/50 mb-2 uppercase tracking-wider">Active Coalitions</div>
                      {session.activeCoalitions.map((c) => (
                        <div key={c.id} className="bg-white/5 rounded-lg p-3 border border-indigo-400/20 mb-2">
                          <div className="text-sm text-white font-bold">
                            {c.combinationType.toUpperCase()} Coalition
                          </div>
                          <div className="text-xs text-white/50">
                            {c.participants.map((p) => players.find((pl) => pl.id === p.playerId)?.name).join(', ')}
                          </div>
                          <div className="text-xs text-white/50">
                            Target: {zones.find((z) => z.id === c.targetZoneId)?.name ?? c.targetZoneId}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── PROMISES TAB ─────────────────────────── */}
              {delibTab === 'promises' && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-3">{'\u{1F4DC}'} Promise Board</h3>

                  {/* Make promise form */}
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10 mb-4">
                    <div className="text-xs text-white/50 mb-2 uppercase tracking-wider">Make a Promise</div>
                    <div className="flex gap-2 items-end flex-wrap">
                      <div>
                        <label className="text-xs text-white/40 block mb-1">To Player</label>
                        <select
                          value={promiseTarget}
                          onChange={(e) => setPromiseTarget(e.target.value)}
                          className="bg-slate-800 text-white border border-white/20 rounded px-2 py-1 text-sm"
                        >
                          <option value="">Select...</option>
                          {players
                            .filter((p) => p.id !== currentPlayerId)
                            .map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-white/40 block mb-1">Resource</label>
                        <select
                          value={promiseResource}
                          onChange={(e) => setPromiseResource(e.target.value as ResourceType)}
                          className="bg-slate-800 text-white border border-white/20 rounded px-2 py-1 text-sm"
                        >
                          {RESOURCE_TYPES.map((r) => (
                            <option key={r} value={r}>{RESOURCE_LABELS[r]}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-white/40 block mb-1">Amount</label>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={promiseAmount}
                          onChange={(e) => setPromiseAmount(Number(e.target.value))}
                          className="bg-slate-800 text-white border border-white/20 rounded px-2 py-1 text-sm w-16"
                        />
                      </div>
                      <button
                        onClick={submitPromise}
                        disabled={!promiseTarget}
                        className="px-3 py-1 bg-purple-600 text-white rounded text-sm font-bold disabled:opacity-30 hover:bg-purple-500"
                      >
                        Promise
                      </button>
                    </div>
                  </div>

                  {/* Active promises */}
                  {activePromises.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-white/50 mb-2 uppercase tracking-wider">Active Promises</div>
                      {activePromises.map((p: GamePromise) => {
                        const from = players.find((pl) => pl.id === p.fromPlayerId);
                        const to = players.find((pl) => pl.id === p.toPlayerId);
                        return (
                          <div
                            key={p.id}
                            className="bg-white/5 rounded-lg p-2 border-l-4 mb-2"
                            style={{ borderLeftColor: ROLE_COLORS[from?.roleId ?? 'citizen'] }}
                          >
                            <div className="text-sm text-white">
                              {from?.name} {'\u2192'} {to?.name}
                            </div>
                            <div className="text-xs text-white/50">
                              {p.promisedResource.amount} {RESOURCE_LABELS[p.promisedResource.type]} (Round {p.promisedRound})
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Broken promises */}
                  {brokenPromises.length > 0 && (
                    <div>
                      <div className="text-xs text-red-400/70 mb-2 uppercase tracking-wider">Broken Promises</div>
                      {brokenPromises.map((p: GamePromise) => {
                        const from = players.find((pl) => pl.id === p.fromPlayerId);
                        return (
                          <div
                            key={p.id}
                            className="bg-red-900/20 rounded-lg p-2 border border-red-500/30 mb-2 line-through"
                          >
                            <div className="text-sm text-red-300">
                              {'\u274C'} {from?.name}: {p.promisedResource.amount} {RESOURCE_LABELS[p.promisedResource.type]}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── SERIES TAB ───────────────────────────── */}
              {delibTab === 'series' && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-3">{'\u{1F0CF}'} Series Builder</h3>
                  <p className="text-white/50 text-sm mb-4">
                    Stage cards from your hand for the upcoming resolution phase. Click cards to add them.
                  </p>

                  {/* Current hand */}
                  <div className="mb-4">
                    <div className="text-xs text-white/50 mb-2 uppercase tracking-wider">Your Hand</div>
                    <div className="flex gap-2 flex-wrap">
                      {(currentPlayer?.hand ?? []).map((card) => (
                        <motion.div
                          key={card.id}
                          whileHover={{ y: -4 }}
                          className="bg-gradient-to-b from-slate-700 to-slate-800 rounded-lg p-2 border border-white/20 w-32 cursor-pointer hover:border-amber-400/50"
                        >
                          <div className="text-xs font-bold text-white truncate">{card.name}</div>
                          <div className="text-[10px] text-white/40 truncate">{card.description}</div>
                          <div className="flex justify-between mt-1">
                            <span className="text-[10px] text-amber-400">Val: {card.baseValue}</span>
                            <span className="text-[10px] text-white/30">{card.seriesPosition}</span>
                          </div>
                          <div className="flex flex-wrap gap-0.5 mt-1">
                            {card.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-[9px] bg-white/10 rounded px-1 text-white/50">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                      {(currentPlayer?.hand ?? []).length === 0 && (
                        <div className="text-white/30 text-sm">No cards in hand</div>
                      )}
                    </div>
                  </div>

                  {/* Active series */}
                  {session.activeSeries && (
                    <div className="bg-white/5 rounded-lg p-3 border border-amber-400/20">
                      <div className="text-xs text-white/50 mb-2 uppercase tracking-wider">Staged Series</div>
                      <div className="flex gap-2">
                        {session.activeSeries.cards.map(({ card, playerId }, i) => {
                          const p = players.find((pl) => pl.id === playerId);
                          return (
                            <div
                              key={i}
                              className="bg-slate-800 rounded-lg p-2 border border-white/20 w-28"
                              style={{ borderTopColor: ROLE_COLORS[p?.roleId ?? 'citizen'], borderTopWidth: 3 }}
                            >
                              <div className="text-xs font-bold text-white truncate">{card.name}</div>
                              <div className="text-[10px] text-white/40">{p?.name}</div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-xs text-amber-400 mt-2">
                        Series Value: {session.activeSeries.currentValue}
                      </div>
                    </div>
                  )}

                  {/* Challenge info */}
                  {challenge && (
                    <div className="mt-4 bg-red-900/20 rounded-lg p-3 border border-red-500/20">
                      <div className="text-xs text-red-400/70 uppercase tracking-wider mb-1">Active Challenge</div>
                      <div className="text-sm font-bold text-white">{challenge.name}</div>
                      <div className="text-xs text-white/50">{challenge.description}</div>
                      <div className="text-xs text-red-300 mt-1">
                        Difficulty: {challenge.difficulty} | Min Series: {challenge.requirements.minSeriesLength} |
                        Min Roles: {challenge.requirements.minUniqueRoles}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Bottom Bar: Timer + Ready ─────────────────── */}
            <div className="flex items-center justify-between mt-3 bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-3">
                <div className={`font-mono text-2xl font-bold ${timerColor}`}>
                  {String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}
                </div>
                {deliberationTimeRemaining < 60 && (
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="text-red-400 text-xs font-bold"
                  >
                    TIME LOW
                  </motion.span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {players.map((p) => (
                    <div
                      key={p.id}
                      className={`w-3 h-3 rounded-full border ${
                        readyPlayers.has(p.id) ? 'bg-green-500 border-green-400' : 'bg-white/10 border-white/20'
                      }`}
                      title={`${p.name}: ${readyPlayers.has(p.id) ? 'Ready' : 'Not ready'}`}
                    />
                  ))}
                </div>
                <span className="text-xs text-white/40">
                  {readyPlayers.size}/{players.length} ready
                </span>
                <button
                  onClick={handleReady}
                  disabled={readyPlayers.has(currentPlayerId)}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                    readyPlayers.has(currentPlayerId)
                      ? 'bg-green-800 text-green-300 cursor-default'
                      : 'bg-green-600 text-white hover:bg-green-500'
                  }`}
                >
                  {readyPlayers.has(currentPlayerId) ? '\u2713 Ready' : 'Ready'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeliberationPhase;
