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
const BASKET = { x: 300, y: 60 };
const COURT_COLOR = '#D4A574';
const LINE_COLOR = '#8B6F47';
const RES_TYPES: ResourceType[] = ['budget', 'influence', 'volunteer', 'material', 'knowledge'];

function chainBonus(len: number): number {
  return len >= 4 ? 9 : len === 3 ? 5 : len === 2 ? 2 : 0;
}
function computeTagChain(entries: PlayedEntry[]): { length: number; bonus: number } {
  const cards = entries.filter(e => e.card);
  if (cards.length < 2) return { length: cards.length, bonus: 0 };
  let max = 1, cur = 1;
  for (let i = 1; i < cards.length; i++) {
    const prev = cards[i - 1].card!.tags, curr = cards[i].card!.tags;
    if (prev.some(t => curr.includes(t))) { cur++; max = Math.max(max, cur); } else cur = 1;
  }
  return { length: max, bonus: chainBonus(max) };
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
            <h1 className="text-3xl font-bold text-amber-200 mb-2">Phase 4: Action Resolution</h1>
            <p className="text-lg text-amber-100/80">Work together like a basketball team!</p>
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
          <motion.div key="turns" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center gap-3">
            <div className="text-sm text-amber-300 font-medium">
              Turn {turnIndex + 1} of {sorted.length} &mdash; {activePlayer.name} ({posLabel})
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
          </motion.div>
        )}
        {/* SHOT */}
        {stage === 'shot' && shotResult && (
          <motion.div key="shot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center gap-4">
            <p className="text-amber-200 text-lg font-semibold animate-pulse">All players have acted. Taking the shot...</p>
            <svg viewBox="0 0 600 500" className="w-full max-w-lg">
              <rect x="280" y="30" width="40" height="10" fill="#8B6F47" rx="2" />
              <circle cx={BASKET.x} cy={BASKET.y} r="20" fill="none" stroke="#8B6F47" strokeWidth="3" />
              <defs><radialGradient id="shotBall"><stop offset="0%" stopColor="#FCD34D" /><stop offset="100%" stopColor="#D97706" /></radialGradient></defs>
              <motion.circle r="20" fill="url(#shotBall)"
                initial={{ cx: ballPos.x, cy: ballPos.y }}
                animate={{ cx: [ballPos.x, 300, BASKET.x], cy: [ballPos.y, ballPos.y - 120, BASKET.y + 20] }}
                transition={{ duration: 1.2, ease: 'easeInOut' }} />
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
              <div className="text-3xl mb-2">&#x26A0;&#xFE0F; TRAP!</div>
              <p className="text-lg">{trigger.description}</p>
              <p className="text-sm text-red-300 mt-1">Series value reduced by 3. Outcome may downgrade.</p>
            </div>)}
            {trigger.type === 'secret_door' && (<div className="text-green-400">
              <div className="text-3xl mb-2">&#x1F512; SECRET DOOR!</div>
              <p className="text-lg">{trigger.description}</p>
              <p className="text-sm text-green-300 mt-1">Extra resources awarded!</p>
            </div>)}
            {trigger.type === 'cascading_effect' && (<div className="text-blue-400">
              <div className="text-3xl mb-2">&#x1F300; CASCADE!</div>
              <p className="text-lg">{trigger.description}</p>
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
            <text x={pos.x} y={pos.y - 34} textAnchor="middle" fill={color} fontSize="10" fontWeight="bold">{label}</text>
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
