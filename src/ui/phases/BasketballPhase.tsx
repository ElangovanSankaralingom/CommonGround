import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  GameSession, Player, RoleId, ActionCard, ChallengeCard,
  ResourceType,
} from '../../core/models/types';
import { getAbilityModifier } from '../../core/models/types';
import { ROLE_COLORS, OBJECTIVE_WEIGHTS } from '../../core/models/constants';
import { determineGraduatedOutcome } from '../../core/engine/nashEngine';
import type { ObjectiveId } from '../../core/models/constants';
import { PhaseNavigation } from '../effects/PhaseNavigation';

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
  onPhaseComplete: (result: ResolutionResult) => void;
  onPlayCard: (cardId: string, targetZoneId?: string) => void;
  onPassTurn: () => void;
  onUseAbility: () => void;
}
type Stage = 'intro' | 'court' | 'turns' | 'shot' | 'trigger' | 'summary' | 'continue';
interface PlayedEntry {
  card: ActionCard | null; playerId: string; value: number;
  type: 'card' | 'resource' | 'ability' | 'pass';
}

const POSITIONS: Record<string, { x: number; y: number }> = {
  PG: { x: 300, y: 440 }, SG: { x: 120, y: 360 }, SF: { x: 480, y: 360 },
  PF: { x: 160, y: 240 }, C: { x: 440, y: 240 },
};
const POS_LABELS = ['PG', 'SG', 'SF', 'PF', 'C'] as const;
const POS_NARRATIVE: Record<string, string> = {
  PG: 'THE VOICE', SG: 'THE SCOUT', SF: 'THE BRIDGE', PF: 'THE BUILDER', C: 'THE ANCHOR',
};
const BASKET = { x: 300, y: 60 };
const COURT_COLOR = '#D4A574';
const LINE_COLOR = '#8B6F47';
const RES_TYPES: ResourceType[] = ['budget', 'influence', 'volunteer', 'material', 'knowledge'];

const PLACEMAKING_SEQ = ['assessment', 'planning', 'design', 'construction', 'maintenance'];
function chainBonus(len: number): number {
  return len >= 4 ? 9 : len === 3 ? 5 : len === 2 ? 2 : 0;
}
function placemakingChainBonus(len: number): number {
  return len >= 4 ? 12 : len === 3 ? 7 : len === 2 ? 3 : 0;
}
function isPlacemakingSuccessor(prevTags: string[], currTags: string[]): boolean {
  for (const pt of prevTags) {
    const pi = PLACEMAKING_SEQ.indexOf(pt);
    if (pi >= 0 && pi < PLACEMAKING_SEQ.length - 1 && currTags.includes(PLACEMAKING_SEQ[pi + 1])) return true;
  }
  return false;
}
function computeTagChain(entries: PlayedEntry[]): { length: number; bonus: number } {
  const cards = entries.filter(e => e.card);
  if (cards.length < 2) return { length: cards.length, bonus: 0 };
  let maxStd = 1, curStd = 1;
  let maxPM = 1, curPM = 1;
  for (let i = 1; i < cards.length; i++) {
    const prev = cards[i - 1].card!.tags, curr = cards[i].card!.tags;
    // Standard tag chain
    if (prev.some(t => curr.includes(t))) { curStd++; maxStd = Math.max(maxStd, curStd); } else curStd = 1;
    // Placemaking sequence chain
    if (isPlacemakingSuccessor(prev, curr)) { curPM++; maxPM = Math.max(maxPM, curPM); } else curPM = 1;
  }
  const stdBonus = chainBonus(maxStd);
  const pmBonus = placemakingChainBonus(maxPM);
  // Use whichever chain yields the higher bonus
  return pmBonus > stdBonus
    ? { length: maxPM, bonus: pmBonus }
    : { length: maxStd, bonus: stdBonus };
}
function computeSynergy(entries: PlayedEntry[], players: Player[]): number {
  const roles = new Set<RoleId>();
  entries.forEach(e => {
    const p = players.find(pl => pl.id === e.playerId);
    if (p && e.type !== 'pass') roles.add(p.roleId);
  });
  if (roles.size < 2) return 0;
  const topObjs: Record<string, ObjectiveId[]> = {};
  for (const role of Array.from(roles)) {
    const w = OBJECTIVE_WEIGHTS[role];
    topObjs[role] = (Object.entries(w) as [ObjectiveId, number][])
      .sort((a, b) => b[1] - a[1]).slice(0, 2).map(([id]) => id);
  }
  const arr = Array.from(roles);
  let syn = 0;
  for (let i = 0; i < arr.length; i++)
    for (let j = i + 1; j < arr.length; j++)
      syn += topObjs[arr[i]].filter(o => topObjs[arr[j]].includes(o)).length * 2;
  return syn;
}
function sortByUtility(players: Player[]): Player[] {
  return [...players].sort((a, b) => a.utilityScore - b.utilityScore);
}

/* ── Crowd Reaction Spectators ── */
const SPECTATOR_COUNT = 8;
const SPECTATOR_SPACING = 50;
const SPECTATOR_START_X = 300 - ((SPECTATOR_COUNT - 1) * SPECTATOR_SPACING) / 2;
const SPECTATOR_BASE_Y = 480;

type CrowdOutcome = 'full_success' | 'partial_success' | 'narrow_success' | 'failure';

function CrowdReaction({ outcome }: { outcome: CrowdOutcome }) {
  const spectators = Array.from({ length: SPECTATOR_COUNT }, (_, i) => i);

  const getAnimation = (index: number) => {
    switch (outcome) {
      case 'full_success':
        return {
          y: [0, -8, -8],
          transition: { duration: 0.5, delay: index * 0.05, repeat: Infinity, repeatType: 'reverse' as const, repeatDelay: 0.3 },
        };
      case 'partial_success':
        return {
          y: [0, -3, 0],
          transition: { duration: 0.4, delay: index * 0.06, repeat: 2 },
        };
      case 'narrow_success':
        return {
          y: [0, 0, -6, 0],
          transition: { duration: 0.8, delay: 0.5 + index * 0.04, repeat: 1 },
        };
      case 'failure':
        return {
          y: [0, 3],
          transition: { duration: 0.6, delay: index * 0.04 },
        };
    }
  };

  return (
    <g>
      {spectators.map(i => {
        const sx = SPECTATOR_START_X + i * SPECTATOR_SPACING;
        const anim = getAnimation(i);
        const bodyColor = ['#6B7280', '#9CA3AF', '#78716C', '#A1A1AA', '#6B7280', '#9CA3AF', '#78716C', '#A1A1AA'][i];
        return (
          <motion.g key={`spectator-${i}`} animate={anim}>
            {/* Head */}
            <circle cx={sx} cy={SPECTATOR_BASE_Y - 14} r={4} fill={bodyColor} />
            {/* Body */}
            <rect x={sx - 3} y={SPECTATOR_BASE_Y - 10} width={6} height={10} rx={1} fill={bodyColor} />
            {/* Arms raised for full success */}
            {outcome === 'full_success' && (
              <>
                <motion.line x1={sx - 2} y1={SPECTATOR_BASE_Y - 18} x2={sx - 5} y2={SPECTATOR_BASE_Y - 24}
                  stroke={bodyColor} strokeWidth={1.5} strokeLinecap="round"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.05 }} />
                <motion.line x1={sx + 2} y1={SPECTATOR_BASE_Y - 18} x2={sx + 5} y2={SPECTATOR_BASE_Y - 24}
                  stroke={bodyColor} strokeWidth={1.5} strokeLinecap="round"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.05 }} />
              </>
            )}
            {/* Slump arms for failure */}
            {outcome === 'failure' && (
              <>
                <line x1={sx - 3} y1={SPECTATOR_BASE_Y - 6} x2={sx - 6} y2={SPECTATOR_BASE_Y + 2} stroke={bodyColor} strokeWidth={1.2} strokeLinecap="round" />
                <line x1={sx + 3} y1={SPECTATOR_BASE_Y - 6} x2={sx + 6} y2={SPECTATOR_BASE_Y + 2} stroke={bodyColor} strokeWidth={1.2} strokeLinecap="round" />
              </>
            )}
          </motion.g>
        );
      })}
      {/* Confetti for full success */}
      {outcome === 'full_success' && Array.from({ length: 16 }, (_, i) => {
        const cx = 80 + Math.random() * 440;
        const colors = ['#FCD34D', '#F87171', '#34D399', '#60A5FA', '#A78BFA', '#FB923C'];
        return (
          <motion.circle key={`confetti-${i}`} cx={cx} cy={430} r={2.5}
            fill={colors[i % colors.length]}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 1, 0], y: [0, -30 - Math.random() * 40, -50 - Math.random() * 30, -70] }}
            transition={{ duration: 1.5, delay: 0.5 + i * 0.08 }} />
        );
      })}
    </g>
  );
}

export default function BasketballPhase({
  session, players, challenge, onPhaseComplete, onPlayCard, onPassTurn, onUseAbility,
}: BasketballPhaseProps) {
  const [stage, setStage] = useState<Stage>('intro');
  const [turnIndex, setTurnIndex] = useState(0);
  const [entries, setEntries] = useState<PlayedEntry[]>([]);
  const [ballValue, setBallValue] = useState(0);
  const [ballPos, setBallPos] = useState({ x: 300, y: 350 });
  const [selectedCard, setSelectedCard] = useState<ActionCard | null>(null);
  const [floatLabel, setFloatLabel] = useState<string | null>(null);
  const [contributorIds, setContributorIds] = useState<Set<string>>(new Set());
  const [resourceContributors, setResourceContributors] = useState<Set<string>>(new Set());
  const [shotResult, setShotResult] = useState<ReturnType<typeof determineGraduatedOutcome> | null>(null);
  const [assists, setAssists] = useState<{playerId: string, action: string}[]>([]);

  const threshold = challenge.difficulty;
  const sorted = useMemo(() => sortByUtility(players), [players]);
  const zoneId = challenge.affectedZoneIds[0] || '';
  const trigger = session.board.zones[zoneId]?.revealedTrigger ?? null;
  const activePlayer = sorted[turnIndex] ?? sorted[0];
  const posLabel = POS_LABELS[turnIndex] ?? 'PG';
  const activePos = POSITIONS[posLabel];
  const coopActive = resourceContributors.size >= 3;
  const hasResources = RES_TYPES.some(rt => (activePlayer?.resources[rt] ?? 0) > 0);

  useEffect(() => {
    if (stage === 'intro') { const t = setTimeout(() => setStage('court'), 1500); return () => clearTimeout(t); }
  }, [stage]);
  useEffect(() => {
    if (stage === 'court') { const t = setTimeout(() => setStage('turns'), 2000); return () => clearTimeout(t); }
  }, [stage]);

  const showFloat = useCallback((l: string) => {
    setFloatLabel(l); setTimeout(() => setFloatLabel(null), 1200);
  }, []);
  const advanceTurn = useCallback(() => {
    if (turnIndex >= sorted.length - 1) setStage('shot');
    else { setTurnIndex(i => i + 1); setSelectedCard(null); }
  }, [turnIndex, sorted.length]);

  const handlePlayCard = useCallback((card: ActionCard) => {
    const ability = card.abilityCheck?.ability ?? 'adaptability';
    const mod = getAbilityModifier(activePlayer.abilities[ability] ?? 10);
    const value = card.baseValue + mod;
    setEntries(prev => [...prev, { card, playerId: activePlayer.id, value, type: 'card' }]);
    setBallValue(v => v + value);
    setBallPos(activePos);
    setContributorIds(s => new Set(s).add(activePlayer.id));
    onPlayCard(card.id, zoneId);
    showFloat(turnIndex > 0 ? 'ASSIST!' : 'PASS!');
    setTimeout(advanceTurn, 800);
  }, [activePlayer, activePos, turnIndex, advanceTurn, onPlayCard, zoneId, showFloat]);

  const handleContribute = useCallback(() => {
    const value = Math.min(RES_TYPES.filter(rt => (activePlayer.resources[rt] ?? 0) > 0).length, 3);
    setEntries(prev => [...prev, { card: null, playerId: activePlayer.id, value, type: 'resource' }]);
    setBallValue(v => v + value);
    setContributorIds(s => new Set(s).add(activePlayer.id));
    setResourceContributors(s => new Set(s).add(activePlayer.id));
    setAssists(prev => [...prev, { playerId: activePlayer.id, action: 'Resource Contribution' }]);
    showFloat('SCREEN SET!');
    setTimeout(advanceTurn, 800);
  }, [activePlayer, advanceTurn, showFloat]);

  const handleAbility = useCallback(() => {
    setEntries(prev => [...prev, { card: null, playerId: activePlayer.id, value: 3, type: 'ability' }]);
    setBallValue(v => v + 3);
    setContributorIds(s => new Set(s).add(activePlayer.id));
    onUseAbility();
    showFloat('SPECIAL PLAY!');
    setTimeout(advanceTurn, 800);
  }, [activePlayer, advanceTurn, onUseAbility, showFloat]);

  const handlePass = useCallback(() => {
    setEntries(prev => [...prev, { card: null, playerId: activePlayer.id, value: 0, type: 'pass' }]);
    onPassTurn();
    showFloat('TIMEOUT');
    setTimeout(advanceTurn, 800);
  }, [activePlayer, advanceTurn, onPassTurn, showFloat]);

  // Shot stage
  useEffect(() => {
    if (stage !== 'shot') return;
    const chain = computeTagChain(entries);
    const synergy = computeSynergy(entries, players);
    const teamPlay = contributorIds.size >= 5;
    const coopMul = resourceContributors.size >= 3 ? 1.5 : 1.0;
    const sv = Math.round((ballValue + chain.bonus + synergy + (teamPlay ? 3 : 0)) * coopMul);
    const result = determineGraduatedOutcome(sv, threshold);
    setBallValue(sv); setShotResult(result);
    const delay = result.type === 'narrow_success' ? 2500 : 1500;
    const t = setTimeout(() => setStage(trigger ? 'trigger' : 'summary'), delay);
    return () => clearTimeout(t);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (stage === 'trigger') { const t = setTimeout(() => setStage('summary'), 2000); return () => clearTimeout(t); }
  }, [stage]);

  const finalResult = useMemo((): ResolutionResult | null => {
    if (!shotResult) return null;
    const chain = computeTagChain(entries);
    const synergy = computeSynergy(entries, players);
    const teamPlay = contributorIds.size >= 5;
    const contributions: Record<string, number> = {};
    entries.forEach(e => { contributions[e.playerId] = (contributions[e.playerId] ?? 0) + e.value; });
    let zoneChange = shotResult.zoneChange;
    if (trigger?.type === 'trap') zoneChange = Math.min(zoneChange, shotResult.zoneChange - 1);
    return {
      seriesValue: ballValue, threshold, outcome: shotResult.type,
      chainBonus: chain.bonus, synergyBonus: synergy, teamPlayBonus: teamPlay,
      zoneChange, contributions,
    };
  }, [shotResult, entries, players, contributorIds, ballValue, threshold, trigger]);

  const bestCollaborator = useMemo(() => {
    if (assists.length === 0) return null;
    const counts: Record<string, number> = {};
    assists.forEach(a => { counts[a.playerId] = (counts[a.playerId] ?? 0) + 1; });
    const maxCount = Math.max(...Object.values(counts));
    const bestId = Object.entries(counts).find(([, c]) => c === maxCount)?.[0];
    return bestId ? sorted.find(p => p.id === bestId) ?? null : null;
  }, [assists, sorted]);

  const nashFeedback = useMemo(() => {
    const contribs: Record<string, number> = {};
    let total = 0;
    entries.forEach(e => { contribs[e.playerId] = (contribs[e.playerId] ?? 0) + e.value; total += e.value; });
    if (total === 0) return { bars: [] as { id: string; name: string; roleId: RoleId; pct: number }[], imbalanced: false, allContributed: false };
    const bars = sorted.map(p => ({ id: p.id, name: p.name, roleId: p.roleId, pct: ((contribs[p.id] ?? 0) / total) * 100 }));
    return { bars, imbalanced: bars.some(b => b.pct > 60), allContributed: contributorIds.size >= 5 };
  }, [entries, sorted, contributorIds]);

  return (
    <div className="relative w-full max-w-3xl mx-auto flex flex-col items-center gap-4 p-4">
      <AnimatePresence mode="wait">
        {/* INTRO */}
        {stage === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-16">
            <h1 className="text-3xl font-bold text-amber-200 mb-2">Phase 4: The Team Play</h1>
            <p className="text-lg text-amber-100/80">Work together to build the shared vision!</p>
          </motion.div>
        )}
        {/* COURT */}
        {stage === 'court' && (
          <motion.div key="court-setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
            <h2 className="text-xl font-semibold text-amber-200 text-center mb-2">Setting the Court...</h2>
            {renderCourt(sorted, ballPos, ballValue, threshold, null, floatLabel, coopActive)}
          </motion.div>
        )}
        {/* TURNS */}
        {stage === 'turns' && (
          <motion.div key="turns" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex gap-3">
            {/* Main turns area */}
            <div className="flex-1 flex flex-col items-center gap-3">
            <div className="text-sm text-amber-300 font-medium">
              Season {turnIndex + 1} of {sorted.length} &mdash; {activePlayer.name} ({POS_NARRATIVE[posLabel]} — {posLabel})
            </div>
            {renderCourt(sorted, ballPos, ballValue, threshold, turnIndex, floatLabel, coopActive)}
            {/* Card hand */}
            <div className="flex gap-2 overflow-x-auto pb-2 max-w-full">
              {activePlayer.hand.map(card => {
                const ability = card.abilityCheck?.ability ?? 'adaptability';
                const mod = getAbilityModifier(activePlayer.abilities[ability] ?? 10);
                const sel = selectedCard?.id === card.id;
                return (
                  <motion.button key={card.id} onClick={() => setSelectedCard(sel ? null : card)} whileHover={{ y: -8 }}
                    className={`flex-shrink-0 w-28 p-2 rounded-lg border-2 text-left text-xs transition-colors ${sel
                      ? 'border-amber-400 bg-amber-900/60 shadow-lg shadow-amber-400/20'
                      : 'border-gray-600 bg-gray-800/80 hover:border-gray-400'}`}>
                    <div className="font-semibold text-white truncate">{card.name}</div>
                    <div className="text-amber-300">Base: {card.baseValue}</div>
                    <div className="text-gray-400 capitalize">{ability}: {mod >= 0 ? '+' : ''}{mod}</div>
                    <div className="text-gray-500 truncate">{card.tags.join(', ')}</div>
                  </motion.button>
                );
              })}
            </div>
            {selectedCard && (
              <div className="bg-gray-800/90 rounded-lg p-3 text-sm w-full max-w-md border border-amber-500/30">
                <div className="font-bold text-amber-200">{selectedCard.name}</div>
                <div className="text-gray-300 mt-1">{selectedCard.description}</div>
                <div className="text-amber-300 mt-1">
                  Base: {selectedCard.baseValue} + Modifier: {getAbilityModifier(activePlayer.abilities[selectedCard.abilityCheck?.ability ?? 'adaptability'] ?? 10)}
                </div>
              </div>
            )}
            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
              <button onClick={() => selectedCard && handlePlayCard(selectedCard)} disabled={!selectedCard}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-lg bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 text-white transition-colors">
                &#x1F0CF; PLAY CARD
              </button>
              <button onClick={handleContribute} disabled={!hasResources}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white transition-colors">
                &#x1F4E6; CONTRIBUTE
              </button>
              <button onClick={handleAbility} disabled={(activePlayer.uniqueAbilityUsesRemaining ?? 0) <= 0}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-lg text-white transition-colors"
                style={{ backgroundColor: (activePlayer.uniqueAbilityUsesRemaining ?? 0) > 0 ? ROLE_COLORS[activePlayer.roleId] : '#374151' }}>
                &#x26A1; ABILITY
              </button>
              <button onClick={handlePass}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-lg bg-gray-600 hover:bg-gray-500 text-white transition-colors">
                &#x23ED;&#xFE0F; PASS
              </button>
            </div>
            {hasResources && <p className="text-yellow-400/70 text-xs text-center">The team could use your help.</p>}
            {/* Chain display */}
            {entries.length > 0 && (
              <div className="flex gap-1 items-center mt-2">
                {entries.map((e, i) => {
                  const linked = i > 0 && e.card && entries[i - 1]?.card && e.card.tags.some(t => entries[i - 1].card!.tags.includes(t));
                  return (
                    <React.Fragment key={i}>
                      {i > 0 && <div className={`w-4 h-0.5 ${linked ? 'bg-amber-400 shadow-sm shadow-amber-400' : 'bg-gray-600'}`} />}
                      <div className={`w-8 h-10 rounded border text-[10px] flex items-center justify-center ${
                        e.type === 'card' ? 'border-amber-400 bg-amber-900/40 text-amber-200'
                        : e.type === 'resource' ? 'border-blue-400 bg-blue-900/40 text-blue-200'
                        : e.type === 'ability' ? 'border-purple-400 bg-purple-900/40 text-purple-200'
                        : 'border-gray-500 bg-gray-800/40 text-gray-400'}`}>
                        {e.type === 'pass' ? '--' : '+' + e.value}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
            {/* Synergy */}
            {(() => { const s = computeSynergy(entries, players); return s > 0 ? (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-amber-300 text-sm font-semibold text-center">
                ALLEY-OOP! Objective synergy +{s} bonus!
              </motion.div>) : null; })()}
            {coopActive && (
              <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-yellow-300 font-bold text-center">
                x1.5 COOPERATION MULTIPLIER!
              </motion.div>
            )}
            {/* Nash feedback */}
            {entries.length > 0 && (
              <div className="w-full max-w-md">
                <div className="flex gap-1 h-6">
                  {nashFeedback.bars.map(b => (
                    <div key={b.id} className="h-full rounded-sm transition-all"
                      style={{ width: `${Math.max(b.pct, 2)}%`, backgroundColor: ROLE_COLORS[b.roleId], opacity: b.pct > 0 ? 1 : 0.2 }}
                      title={`${b.name}: ${b.pct.toFixed(0)}%`} />
                  ))}
                </div>
                <div className="text-xs text-center mt-1">
                  {nashFeedback.allContributed && <span className="text-green-400">&#x2705; TEAM PLAY!</span>}
                  {nashFeedback.imbalanced && <span className="text-yellow-400">&#x26A0;&#xFE0F; Imbalanced</span>}
                </div>
              </div>
            )}
            </div>{/* end main turns area */}
            {/* Assist Tracker Sidebar */}
            <div className="w-40 flex-shrink-0 bg-gray-900/70 rounded-lg border border-gray-700 p-2 self-start">
              <div className="text-xs font-bold text-amber-300 mb-2 text-center uppercase tracking-wide">Assist Tracker</div>
              {assists.length === 0 ? (
                <div className="text-[10px] text-gray-500 text-center italic">No assists yet</div>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {assists.map((a, i) => {
                    const p = sorted.find(pl => pl.id === a.playerId);
                    return (
                      <div key={i} className="flex items-center gap-1 text-[10px]">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p ? ROLE_COLORS[p.roleId] : '#6B7280' }} />
                        <span className="text-gray-300 truncate">{p?.name ?? '?'}</span>
                        <span className="text-gray-500 ml-auto">{a.action.slice(0, 8)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {bestCollaborator && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  className="mt-2 pt-2 border-t border-gray-700 text-center">
                  <div className="text-[9px] text-yellow-400 font-bold uppercase">Best Collaborator</div>
                  <div className="text-xs text-white font-semibold">{bestCollaborator.name}</div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
        {/* SHOT */}
        {stage === 'shot' && shotResult && (
          <motion.div key="shot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center gap-4">
            <p className="text-amber-200 text-lg font-semibold animate-pulse">All players have acted. Taking the shot...</p>
            <svg viewBox="0 0 600 520" className="w-full max-w-lg">
              <rect x="280" y="30" width="40" height="10" fill="#8B6F47" rx="2" />
              <circle cx={BASKET.x} cy={BASKET.y} r="20" fill="none" stroke="#8B6F47" strokeWidth="3" />
              <defs><radialGradient id="shotBall"><stop offset="0%" stopColor="#FCD34D" /><stop offset="100%" stopColor="#D97706" /></radialGradient></defs>
              <motion.circle r="20" fill="url(#shotBall)"
                initial={{ cx: ballPos.x, cy: ballPos.y }}
                animate={{ cx: [ballPos.x, 300, BASKET.x], cy: [ballPos.y, ballPos.y - 120, BASKET.y + 20] }}
                transition={{ duration: 1.2, ease: 'easeInOut' }} />
              {/* Crowd Reaction Spectators */}
              <CrowdReaction outcome={shotResult.type} />
            </svg>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }} className="text-center">
              {shotResult.type === 'full_success' && <div className="text-green-400 text-2xl font-bold">&#x1F3C0; NOTHING BUT NET! Full Success!</div>}
              {shotResult.type === 'partial_success' && <div className="text-yellow-300 text-2xl font-bold">Off the rim &mdash; counts! Partial Success.</div>}
              {shotResult.type === 'narrow_success' && <div className="text-orange-300 text-2xl font-bold">BUZZER BEATER!</div>}
              {shotResult.type === 'failure' && <div className="text-red-400 text-2xl font-bold">Missed!</div>}
              <div className="text-gray-300 mt-1">Series Value: {ballValue} vs Threshold: {threshold}</div>
            </motion.div>
          </motion.div>
        )}
        {/* TRIGGER */}
        {stage === 'trigger' && trigger && (
          <motion.div key="trigger" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-8">
            {trigger.type === 'trap' && (<div className="text-red-400">
              <div className="text-3xl mb-2">&#x26A0;&#xFE0F; HIDDEN PROBLEM!</div>
              <p className="text-lg">The issue was worse than expected. Some resources are wasted, but the team learns from it.</p>
              <p className="text-sm text-red-300 mt-1">Series value reduced by 3. Outcome may downgrade.</p>
            </div>)}
            {trigger.type === 'secret_door' && (<div className="text-green-400">
              <div className="text-3xl mb-2">&#x1F512; UNEXPECTED ALLY!</div>
              <p className="text-lg">A local school offers to adopt this zone. Bonus resources and a new partnership!</p>
              <p className="text-sm text-green-300 mt-1">Extra resources awarded!</p>
            </div>)}
            {trigger.type === 'cascading_effect' && (<div className="text-blue-400">
              <div className="text-3xl mb-2">&#x1F300; RIPPLE OF HOPE!</div>
              <p className="text-lg">Fixing this zone inspired residents to help neighbors.</p>
              <p className="text-sm text-blue-300 mt-1">Improvement spreads to adjacent zone! +1</p>
            </div>)}
          </motion.div>
        )}
        {/* SUMMARY */}
        {stage === 'summary' && finalResult && (
          <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="w-full max-w-md mx-auto bg-gray-900/80 rounded-xl p-5 border border-amber-500/30">
            <h2 className="text-xl font-bold text-amber-200 mb-4 text-center">Resolution Breakdown</h2>
            <div className="space-y-2 text-sm">
              {entries.map((e, i) => {
                const p = players.find(pl => pl.id === e.playerId);
                return (
                  <div key={i} className="flex justify-between text-gray-300">
                    <span>{p?.name ?? 'Player'} ({e.type}){e.card ? `: ${e.card.name} (base ${e.card.baseValue} + mod)` : ''}</span>
                    <span className="text-amber-300">+{e.value}</span>
                  </div>
                );
              })}
              <hr className="border-gray-700" />
              <div className="flex justify-between text-gray-300">
                <span>Chain bonus ({computeTagChain(entries).length}-chain)</span>
                <span className="text-amber-300">+{finalResult.chainBonus}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Synergy bonus</span><span className="text-amber-300">+{finalResult.synergyBonus}</span>
              </div>
              {finalResult.teamPlayBonus && (
                <div className="flex justify-between text-green-300"><span>Team play bonus (all contributed)</span><span>+3</span></div>
              )}
              {coopActive && (
                <div className="flex justify-between text-yellow-300"><span>Cooperation multiplier (3+ resource contributors)</span><span>x1.5</span></div>
              )}
              <hr className="border-gray-700" />
              <div className="flex justify-between font-bold text-white text-base">
                <span>Final Series Value</span><span>{finalResult.seriesValue}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Threshold</span><span>{finalResult.threshold}</span>
              </div>
              <div className={`text-center text-lg font-bold mt-3 ${
                finalResult.outcome === 'full_success' ? 'text-green-400'
                : finalResult.outcome === 'partial_success' ? 'text-yellow-300'
                : finalResult.outcome === 'narrow_success' ? 'text-orange-300' : 'text-red-400'}`}>
                {shotResult?.description}
              </div>
              <div className="text-center text-sm text-gray-400 mt-1">
                Zone change: {finalResult.zoneChange >= 0 ? '+' : ''}{finalResult.zoneChange}
              </div>
            </div>
            <button onClick={() => setStage('continue')}
              className="mt-5 w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-lg transition-colors">
              Continue
            </button>
          </motion.div>
        )}
        {/* CONTINUE */}
        {stage === 'continue' && finalResult && (
          <motion.div key="continue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <button onClick={() => onPhaseComplete(finalResult)}
              className="py-4 px-8 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-xl transition-colors">
              Continue to Phase 5: Scoring &rarr;
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <PhaseNavigation
        canContinue={stage === 'continue' || stage === 'summary'}
        continueLabel="Continue to Phase 5: Scoring \u2192"
        onContinue={() => {
          console.log('PHASE TRANSITION: Action → Scoring');
          if (finalResult) onPhaseComplete(finalResult);
        }}
        onSkip={() => {
          console.log('PHASE SKIP: Auto-resolving action');
          const autoResult: ResolutionResult = {
            seriesValue: challenge.difficulty, threshold: challenge.difficulty,
            outcome: 'narrow_success', chainBonus: 0, synergyBonus: 0,
            teamPlayBonus: false, zoneChange: 0, contributions: {},
          };
          onPhaseComplete(autoResult);
        }}
        skipLabel="Auto-Resolve"
      />
    </div>
  );
}

function renderCourt(
  sorted: Player[], ballPos: { x: number; y: number }, ballValue: number,
  threshold: number, activeTurnIndex: number | null, floatLabel: string | null, coopActive: boolean,
) {
  return (
    <svg viewBox="0 0 600 500" className="w-full max-w-lg mx-auto" style={{ background: COURT_COLOR, borderRadius: 12 }}>
      <path d="M100,480 A200,200 0 0,1 500,480" fill="none" stroke={LINE_COLOR} strokeWidth="3" />
      <rect x="200" y="60" width="200" height="250" fill="none" stroke={LINE_COLOR} strokeWidth="3" />
      <circle cx="300" cy="310" r="60" fill="none" stroke={LINE_COLOR} strokeWidth="2" />
      <rect x="280" y="30" width="40" height="10" fill={LINE_COLOR} rx="2" />
      <circle cx={BASKET.x} cy={BASKET.y} r="20" fill="none" stroke={LINE_COLOR} strokeWidth="3" />
      <text x={BASKET.x} y="42" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">{threshold}</text>
      {sorted.map((player, i) => {
        const label = POS_LABELS[i];
        const pos = POSITIONS[label];
        const color = ROLE_COLORS[player.roleId];
        const isActive = activeTurnIndex === i;
        return (
          <g key={player.id}>
            {isActive && (
              <circle cx={pos.x} cy={pos.y} r="38" fill={color} opacity="0.25">
                <animate attributeName="r" values="34;42;34" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.15;0.35;0.15" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={pos.x} cy={pos.y} r="28" fill="#1F2937" stroke={color} strokeWidth="3" />
            <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="14" fontWeight="bold">
              {player.name.slice(0, 2).toUpperCase()}
            </text>
            <text x={pos.x} y={pos.y + 44} textAnchor="middle" fill="white" fontSize="10">{player.name}</text>
            <text x={pos.x} y={pos.y - 42} textAnchor="middle" fill={color} fontSize="9" fontWeight="bold">{POS_NARRATIVE[label]}</text>
            <text x={pos.x} y={pos.y - 32} textAnchor="middle" fill={color} fontSize="8">({label})</text>
          </g>
        );
      })}
      <defs>
        <radialGradient id="courtBallGrad">
          <stop offset="0%" stopColor="#FCD34D" /><stop offset="100%" stopColor="#D97706" />
        </radialGradient>
      </defs>
      <motion.circle cx={ballPos.x} cy={ballPos.y} r="20" fill="url(#courtBallGrad)"
        animate={{ cx: ballPos.x, cy: ballPos.y }} transition={{ type: 'spring', stiffness: 80, damping: 12 }}
        opacity={coopActive ? 1 : 0.85} />
      <motion.text x={ballPos.x} y={ballPos.y + 1} textAnchor="middle" dominantBaseline="middle"
        fill="#1F2937" fontSize="14" fontWeight="bold"
        animate={{ x: ballPos.x, y: ballPos.y + 1 }} transition={{ type: 'spring', stiffness: 80, damping: 12 }}>
        {ballValue}
      </motion.text>
      {floatLabel && (
        <motion.text x={ballPos.x} y={ballPos.y - 30} textAnchor="middle" fill="#FCD34D" fontSize="16" fontWeight="bold"
          initial={{ opacity: 1, y: ballPos.y - 30 }} animate={{ opacity: 0, y: ballPos.y - 70 }} transition={{ duration: 1.0 }}>
          {floatLabel}
        </motion.text>
      )}
    </svg>
  );
}
