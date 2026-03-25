import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameSession, Player, RoleId, Zone, ZoneCondition } from '../../core/models/types';
import {
  WELFARE_WEIGHTS,
  SURVIVAL_THRESHOLDS,
  PLAYER_TYPE,
  OBJECTIVE_WEIGHTS,
  BUCHI_OBJECTIVES,
  NASH_PARAMS,
  PROFESSION_INCOME,
  ROLE_COLORS,
  RESOURCE_COLORS,
  CONDITION_TO_WELFARE,
  LEVEL_TABLE,
  type ObjectiveId,
} from '../../core/models/constants';
import {
  runNashEngine,
  calculateObjectiveSatisfaction,
  calculateAllUtilities,
  calculateCWS,
  calculateVariance,
  checkNashQ1,
  checkNashQ3,
  checkBuchiObjectives,
  type NashEngineOutput,
} from '../../core/engine/nashEngine';

// ─── Types ──────────────────────────────────────────────────────

interface ScoringPhaseProps {
  session: GameSession;
  players: Player[];
  roundCPAwards: Record<string, { amount: number; reason: string }[]>;
  onPhaseComplete: (nashOutput: NashEngineOutput, endCondition: string) => void;
}

type SubPhase = '5a' | '5b' | '5c' | '5d' | '5e' | '5f' | '5g';

const SUB_PHASE_ORDER: SubPhase[] = ['5a', '5b', '5c', '5d', '5e', '5f', '5g'];

const SUB_PHASE_TITLES: Record<SubPhase, string> = {
  '5a': 'Zone Condition Updates',
  '5b': 'Resource Regeneration',
  '5c': 'Individual Utility',
  '5d': 'Community Welfare Score',
  '5e': 'Büchi Safety Check',
  '5f': 'CP Awards Ceremony',
  '5g': 'Nash Check — The Final Whistle',
};

const CONDITION_COLORS: Record<ZoneCondition, string> = {
  good: '#27AE60',
  fair: '#F4D03F',
  poor: '#E67E22',
  critical: '#C0392B',
  locked: '#7F8C8D',
};

const OBJECTIVE_LABELS: Record<ObjectiveId, string> = {
  safety: 'Safety',
  greenery: 'Greenery',
  access: 'Access',
  culture: 'Culture',
  revenue: 'Revenue',
  community: 'Community',
};

const RESOURCE_LABELS: Record<string, string> = {
  budget: 'Budget',
  influence: 'Influence',
  volunteer: 'Volunteers',
  material: 'Material',
  knowledge: 'Knowledge',
};

const ROLE_LABELS: Record<RoleId, string> = {
  administrator: 'Administrator',
  investor: 'Investor',
  designer: 'Designer',
  citizen: 'Citizen',
  advocate: 'Advocate',
};

const ROLE_INCOME_DESC: Record<RoleId, string> = {
  administrator: '+2 Budget, +1 Influence',
  investor: '+3 Budget',
  designer: '+2 Knowledge',
  citizen: '+3 Volunteers',
  advocate: '+1 Influence, +1 Knowledge',
};

// ─── Helper: animate-in wrapper ─────────────────────────────────

const FadeSlide: React.FC<{ delay?: number; children: React.ReactNode }> = ({ delay = 0, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    {children}
  </motion.div>
);

// ─── Component ──────────────────────────────────────────────────

const ScoringPhase: React.FC<ScoringPhaseProps> = ({ session, players, roundCPAwards, onPhaseComplete }) => {
  const [currentSubPhase, setCurrentSubPhase] = useState<SubPhase>('5a');
  const [playerIndex5c, setPlayerIndex5c] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Compute all Nash data once ──
  const nashOutput = useMemo(() => runNashEngine(session), [session]);

  const satObjectives = useMemo(
    () => calculateObjectiveSatisfaction(session.board.zones),
    [session.board.zones]
  );

  const utilities = useMemo(
    () => calculateAllUtilities(session.players, satObjectives),
    [session.players, satObjectives]
  );

  const cpTotal = useMemo(
    () => players.reduce((s, p) => s + p.collaborationPoints, 0),
    [players]
  );

  const cwsData = useMemo(() => calculateCWS(utilities, cpTotal), [utilities, cpTotal]);

  const variance = useMemo(() => calculateVariance(utilities), [utilities]);

  const q1 = useMemo(() => checkNashQ1(utilities), [utilities]);
  const q3 = useMemo(() => checkNashQ3(utilities, cwsData.total), [utilities, cwsData.total]);

  const buchiResult = useMemo(
    () => checkBuchiObjectives(
      session.players,
      satObjectives,
      (session.buchiHistory || {}) as Record<RoleId, Record<ObjectiveId, number>>
    ),
    [session.players, satObjectives, session.buchiHistory]
  );

  // ── Zone changes detection ──
  const zoneChanges = useMemo(() => {
    const changes: { zone: Zone; oldCondition: ZoneCondition; newCondition: ZoneCondition }[] = [];
    const zones = session.board.zones as Record<string, Zone>;
    for (const zone of Object.values(zones)) {
      const hist = zone.conditionHistory;
      if (hist.length >= 2) {
        const prev = hist[hist.length - 2];
        const curr = hist[hist.length - 1];
        if (prev.condition !== curr.condition) {
          changes.push({ zone, oldCondition: prev.condition, newCondition: curr.condition });
        }
      }
    }
    return changes;
  }, [session.board.zones]);

  // ── Auto-advance through sub-phases ──
  useEffect(() => {
    const idx = SUB_PHASE_ORDER.indexOf(currentSubPhase);
    if (idx < SUB_PHASE_ORDER.length - 1) {
      const delay = currentSubPhase === '5c' ? (players.length * 2000 + 1000) : 4000;
      const timer = setTimeout(() => {
        setCurrentSubPhase(SUB_PHASE_ORDER[idx + 1]);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [currentSubPhase, players.length]);

  // ── Auto-scroll players in 5c ──
  useEffect(() => {
    if (currentSubPhase !== '5c') return;
    if (playerIndex5c >= players.length - 1) return;
    const timer = setTimeout(() => setPlayerIndex5c(i => i + 1), 2000);
    return () => clearTimeout(timer);
  }, [currentSubPhase, playerIndex5c, players.length]);

  // ── Scroll to bottom on sub-phase change ──
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [currentSubPhase]);

  // ── Advance handler ──
  const handleNext = useCallback(() => {
    const idx = SUB_PHASE_ORDER.indexOf(currentSubPhase);
    if (idx < SUB_PHASE_ORDER.length - 1) {
      setCurrentSubPhase(SUB_PHASE_ORDER[idx + 1]);
    }
  }, [currentSubPhase]);

  // ── End condition determination ──
  const endCondition = useMemo(() => {
    const allBuchiCrisis = buchiResult.violations.length >= players.length && players.length > 0;
    const isFinalRound = session.currentRound >= session.totalRounds;

    if (cwsData.total >= NASH_PARAMS.fullDneThreshold && q1.passed && q3.passed) return 'full_dne';
    if (allBuchiCrisis) return 'veto_deadlock';
    if (cwsData.total >= NASH_PARAMS.partialThreshold && isFinalRound) return 'partial';
    if (isFinalRound) return 'time_ends';
    return 'continue';
  }, [cwsData.total, q1.passed, q3.passed, buchiResult.violations.length, players.length, session.currentRound, session.totalRounds]);

  const handleComplete = useCallback(() => {
    onPhaseComplete(nashOutput, endCondition);
  }, [nashOutput, endCondition, onPhaseComplete]);

  // ── Determine which sub-phases to show (all up to current) ──
  const visiblePhases = SUB_PHASE_ORDER.slice(0, SUB_PHASE_ORDER.indexOf(currentSubPhase) + 1);

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800">
        <h1 className="text-xl font-bold tracking-wide">
          Phase 5 — Consequence &amp; Scoring
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Round {session.currentRound}/{session.totalRounds}</span>
          {currentSubPhase !== '5g' && (
            <button
              onClick={handleNext}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium transition-colors"
            >
              Next &raquo;
            </button>
          )}
        </div>
      </div>

      {/* Scrolling content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-8">
        <AnimatePresence>
          {/* ═══ 5a: Zone Condition Updates ═══ */}
          {visiblePhases.includes('5a') && (
            <SectionWrapper key="5a" label="5a" title={SUB_PHASE_TITLES['5a']}>
              {zoneChanges.length === 0 ? (
                <FadeSlide delay={0.2}>
                  <p className="text-gray-400 italic">No zone conditions changed this round.</p>
                </FadeSlide>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {zoneChanges.map((change, i) => (
                    <FadeSlide key={change.zone.id} delay={0.2 + i * 0.15}>
                      <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
                        <span className="font-medium text-sm w-36 truncate">{change.zone.name}</span>
                        <ConditionBadge condition={change.oldCondition} />
                        <span className="text-gray-500">&rarr;</span>
                        <ConditionBadge condition={change.newCondition} />
                        {change.zone.progressMarkers > 0 && (
                          <span className="ml-auto text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded">
                            +{change.zone.progressMarkers} progress
                          </span>
                        )}
                        {change.zone.problemMarkers > 0 && (
                          <span className="ml-auto text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded">
                            +{change.zone.problemMarkers} problems
                          </span>
                        )}
                      </div>
                    </FadeSlide>
                  ))}
                </div>
              )}
            </SectionWrapper>
          )}

          {/* ═══ 5b: Resource Regeneration ═══ */}
          {visiblePhases.includes('5b') && (
            <SectionWrapper key="5b" label="5b" title={SUB_PHASE_TITLES['5b']}>
              {/* Zone regen/drain */}
              <FadeSlide delay={0.1}>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Zone Regeneration</h4>
              </FadeSlide>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                {(Object.values(session.board.zones) as Zone[]).map((zone, i) => {
                  const isGood = zone.condition === 'good';
                  const isDraining = zone.condition === 'poor' || zone.condition === 'critical';
                  if (!isGood && !isDraining) return null;
                  return (
                    <FadeSlide key={zone.id} delay={0.2 + i * 0.08}>
                      <div className="flex items-center gap-2 bg-gray-800 rounded p-2 text-sm">
                        <span className="truncate flex-1">{zone.name}</span>
                        {isGood && (
                          <span className="text-green-400 font-bold text-xs bg-green-900/50 px-2 py-0.5 rounded">+1</span>
                        )}
                        {isDraining && (
                          <span className="text-red-400 font-bold text-xs bg-red-900/50 px-2 py-0.5 rounded">-1</span>
                        )}
                      </div>
                    </FadeSlide>
                  );
                })}
              </div>

              {/* Player income */}
              <FadeSlide delay={0.5}>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Profession Income</h4>
              </FadeSlide>
              <div className="space-y-2">
                {players.map((player, i) => {
                  const income = PROFESSION_INCOME[player.roleId];
                  const incomeEntries = (Object.entries(income.base) as [string, number][]).filter(([, v]) => v > 0);
                  return (
                    <FadeSlide key={player.id} delay={0.6 + i * 0.15}>
                      <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: ROLE_COLORS[player.roleId] }}
                        />
                        <span className="font-medium text-sm w-28">{player.name}</span>
                        <span className="text-xs text-gray-400 w-24">{ROLE_LABELS[player.roleId]}</span>
                        <div className="flex gap-2 flex-wrap">
                          {incomeEntries.map(([res, amount]) => (
                            <span
                              key={res}
                              className="text-xs font-semibold px-2 py-0.5 rounded"
                              style={{ backgroundColor: `${RESOURCE_COLORS[res]}22`, color: RESOURCE_COLORS[res] }}
                            >
                              +{amount} {RESOURCE_LABELS[res] || res}
                            </span>
                          ))}
                        </div>
                      </div>
                    </FadeSlide>
                  );
                })}
              </div>
            </SectionWrapper>
          )}

          {/* ═══ 5c: Individual Utility ═══ */}
          {visiblePhases.includes('5c') && (
            <SectionWrapper key="5c" label="5c" title={SUB_PHASE_TITLES['5c']}>
              <div className="space-y-4">
                {players.map((player, pIdx) => {
                  const weights = OBJECTIVE_WEIGHTS[player.roleId];
                  const utility = utilities[player.roleId] ?? 0;
                  const threshold = SURVIVAL_THRESHOLDS[player.roleId];
                  const maxUtil = (Object.values(weights) as number[]).reduce((s, w) => s + Math.max(0, w), 0);
                  const meetsThreshold = utility >= threshold;

                  return (
                    <FadeSlide key={player.id} delay={pIdx * 0.3}>
                      <div
                        className="bg-gray-800 rounded-lg overflow-hidden border"
                        style={{ borderColor: pIdx <= playerIndex5c ? ROLE_COLORS[player.roleId] : '#374151' }}
                      >
                        <div
                          className="px-4 py-2 text-sm font-bold"
                          style={{ backgroundColor: `${ROLE_COLORS[player.roleId]}33`, color: ROLE_COLORS[player.roleId] }}
                        >
                          {player.name} — {ROLE_LABELS[player.roleId]}
                        </div>
                        <div className="p-4 space-y-1.5">
                          {(Object.entries(weights) as [ObjectiveId, number][]).map(([objId, weight], oIdx) => {
                            const sat = satObjectives[objId];
                            const product = sat ? weight : 0;
                            return (
                              <motion.div
                                key={objId}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: pIdx * 0.3 + oIdx * 0.08 }}
                                className="flex items-center gap-2 text-sm"
                              >
                                <span className="w-24 text-gray-300">{OBJECTIVE_LABELS[objId]}</span>
                                <span className="text-gray-500 w-8 text-right">{weight}</span>
                                <span className="text-gray-600 mx-1">&times;</span>
                                <span className={sat ? 'text-green-400' : 'text-red-400'}>
                                  {sat ? '\u2713' : '\u2717'}
                                </span>
                                <span className="text-gray-600 mx-1">=</span>
                                <span className="font-mono font-bold w-6 text-right">{product}</span>
                              </motion.div>
                            );
                          })}
                          {/* Utility total */}
                          <div className="mt-3 pt-2 border-t border-gray-700">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold">Total Utility: {utility}</span>
                              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: ROLE_COLORS[player.roleId] }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${maxUtil > 0 ? (utility / maxUtil) * 100 : 0}%` }}
                                  transition={{ duration: 0.8, delay: pIdx * 0.3 + 0.5 }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{utility}/{maxUtil}</span>
                            </div>
                            <div className="mt-1 text-xs">
                              Threshold T={threshold}:{' '}
                              <span className={meetsThreshold ? 'text-green-400' : 'text-red-400'}>
                                {meetsThreshold ? '\u2713 Met' : '\u2717 Below'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </FadeSlide>
                  );
                })}
              </div>
            </SectionWrapper>
          )}

          {/* ═══ 5d: CWS Calculation ═══ */}
          {visiblePhases.includes('5d') && (
            <SectionWrapper key="5d" label="5d" title={SUB_PHASE_TITLES['5d']}>
              {/* Step 1: Weighted Utilities */}
              <FadeSlide delay={0.1}>
                <h4 className="text-sm font-semibold text-yellow-400 mb-2">Step 1: Weighted Utilities</h4>
              </FadeSlide>
              <div className="space-y-1 mb-4">
                {players.map((p, i) => {
                  const w = WELFARE_WEIGHTS[p.roleId];
                  const u = utilities[p.roleId] ?? 0;
                  return (
                    <FadeSlide key={p.id} delay={0.2 + i * 0.1}>
                      <div className="flex items-center gap-2 text-sm bg-gray-800 rounded p-2">
                        <span className="w-28 truncate">{ROLE_LABELS[p.roleId]}</span>
                        <span className="text-gray-400 font-mono">{w}</span>
                        <span className="text-gray-600">&times;</span>
                        <span className="font-mono">{u}</span>
                        <span className="text-gray-600">=</span>
                        <span className="font-bold font-mono">{(w * u).toFixed(1)}</span>
                      </div>
                    </FadeSlide>
                  );
                })}
                <FadeSlide delay={0.7}>
                  <div className="text-sm font-semibold text-right pr-2">
                    Sum = {cwsData.weighted_sum}
                  </div>
                </FadeSlide>
              </div>

              {/* Step 2: Equity Bonus */}
              <FadeSlide delay={0.9}>
                <h4 className="text-sm font-semibold text-yellow-400 mb-2">Step 2: Equity Bonus</h4>
              </FadeSlide>
              <FadeSlide delay={1.0}>
                <div className="bg-gray-800 rounded p-3 text-sm space-y-1 mb-4">
                  <div>Mean utility = {((Object.values(utilities) as number[]).reduce((s, v) => s + v, 0) / Math.max((Object.values(utilities) as number[]).length, 1)).toFixed(2)}</div>
                  <div>Variance = {variance.toFixed(2)}</div>
                  <div>Equity = 10 &times; (1 &minus; {variance.toFixed(2)}/100) = <span className="font-bold">{cwsData.equity_bonus.toFixed(2)}</span></div>
                </div>
              </FadeSlide>

              {/* Step 3: CP */}
              <FadeSlide delay={1.2}>
                <h4 className="text-sm font-semibold text-yellow-400 mb-2">Step 3: Collaboration Points</h4>
              </FadeSlide>
              <FadeSlide delay={1.3}>
                <div className="bg-gray-800 rounded p-3 text-sm mb-4">
                  Total CP = {cpTotal}
                </div>
              </FadeSlide>

              {/* Final CWS */}
              <FadeSlide delay={1.5}>
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="text-center text-lg font-bold mb-2">
                    CWS = {cwsData.weighted_sum} + {cwsData.equity_bonus.toFixed(2)} + {cwsData.cp_bonus} = {cwsData.total}
                  </div>
                  <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: cwsData.total >= NASH_PARAMS.cwsTarget ? '#27AE60' : '#F4D03F',
                        boxShadow: cwsData.total >= NASH_PARAMS.cwsTarget ? '0 0 12px #27AE60' : 'none',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((cwsData.total / 120) * 100, 100)}%` }}
                      transition={{ duration: 1.2, delay: 0.3 }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0</span>
                    <span className={cwsData.total >= NASH_PARAMS.cwsTarget ? 'text-green-400 font-bold' : 'text-yellow-400'}>
                      Target: {NASH_PARAMS.cwsTarget}
                    </span>
                    <span>120</span>
                  </div>
                </div>
              </FadeSlide>
            </SectionWrapper>
          )}

          {/* ═══ 5e: Büchi Check ═══ */}
          {visiblePhases.includes('5e') && (
            <SectionWrapper key="5e" label="5e" title={SUB_PHASE_TITLES['5e']}>
              <div className="space-y-4">
                {players.map((player, pIdx) => {
                  const roleId = player.roleId;
                  const buchiObjs = BUCHI_OBJECTIVES[roleId] || [];
                  const history = (session.buchiHistory?.[roleId] || {}) as Record<string, number>;
                  const violation = buchiResult.violations.find(v => v.roleId === roleId);
                  const inCrisis = !!violation;

                  return (
                    <FadeSlide key={player.id} delay={pIdx * 0.2}>
                      <div
                        className={`bg-gray-800 rounded-lg p-4 ${inCrisis ? 'border-2 border-red-500' : 'border border-gray-700'}`}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: ROLE_COLORS[roleId] }}
                          />
                          <span className="font-semibold text-sm">{player.name} — {ROLE_LABELS[roleId]}</span>
                          {inCrisis && (
                            <span className="ml-auto text-xs bg-red-600 text-white px-2 py-0.5 rounded font-bold animate-pulse">
                              CRISIS STATE &mdash; -2 all abilities
                            </span>
                          )}
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-gray-500 text-xs border-b border-gray-700">
                              <th className="text-left py-1">Objective</th>
                              <th className="text-center py-1">Rounds Unsatisfied</th>
                              <th className="text-center py-1">Current</th>
                              <th className="text-center py-1">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {buchiObjs.map(obj => {
                              const rounds = history[obj] || 0;
                              const updatedRounds = buchiResult.updatedHistory[roleId]?.[obj] || 0;
                              const sat = satObjectives[obj];
                              let status: string;
                              let statusColor: string;
                              if (updatedRounds >= 2) {
                                status = 'CRISIS';
                                statusColor = 'text-red-400';
                              } else if (updatedRounds === 1) {
                                status = '\u26A0 Warning';
                                statusColor = 'text-yellow-400';
                              } else {
                                status = '\u2713 Safe';
                                statusColor = 'text-green-400';
                              }

                              return (
                                <tr key={obj} className="border-b border-gray-700/50">
                                  <td className="py-1.5">{OBJECTIVE_LABELS[obj]}</td>
                                  <td className="text-center font-mono">{rounds}</td>
                                  <td className="text-center">
                                    <span className={sat ? 'text-green-400' : 'text-red-400'}>
                                      {sat ? '\u2713' : '\u2717'}
                                    </span>
                                  </td>
                                  <td className={`text-center font-semibold ${statusColor}`}>{status}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </FadeSlide>
                  );
                })}
              </div>
            </SectionWrapper>
          )}

          {/* ═══ 5f: CP Awards Ceremony ═══ */}
          {visiblePhases.includes('5f') && (
            <SectionWrapper key="5f" label="5f" title={SUB_PHASE_TITLES['5f']}>
              <div className="space-y-4">
                {players.map((player, pIdx) => {
                  const awards = roundCPAwards[player.id] || [];
                  const roundTotal = awards.reduce((s, a) => s + a.amount, 0);
                  const newLevel = LEVEL_TABLE.find(
                    l => l.cpRequired > (player.collaborationPoints - roundTotal) && l.cpRequired <= player.collaborationPoints
                  );

                  return (
                    <FadeSlide key={player.id} delay={pIdx * 0.15}>
                      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: ROLE_COLORS[player.roleId] }}
                          />
                          <span className="font-semibold text-sm">{player.name}</span>
                          <span className="text-xs text-gray-500">{ROLE_LABELS[player.roleId]}</span>
                          <span className="ml-auto font-mono text-sm">
                            Total CP: <span className="text-yellow-400 font-bold">{player.collaborationPoints}</span>
                          </span>
                        </div>
                        {awards.length === 0 ? (
                          <p className="text-xs text-gray-500 italic">No CP earned this round.</p>
                        ) : (
                          <div className="space-y-1">
                            {awards.map((award, aIdx) => (
                              <motion.div
                                key={aIdx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: pIdx * 0.15 + aIdx * 0.1 }}
                                className="flex items-center gap-2 text-sm"
                              >
                                <span className="text-yellow-400 font-bold w-8 text-right">+{award.amount}</span>
                                <span className="text-gray-300">{award.reason}</span>
                              </motion.div>
                            ))}
                            <div className="text-xs text-right text-gray-400 pt-1 border-t border-gray-700">
                              Round total: +{roundTotal} CP
                            </div>
                          </div>
                        )}
                        {newLevel && (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: pIdx * 0.15 + 0.5, type: 'spring' }}
                            className="mt-3 bg-yellow-900/40 border border-yellow-500/50 rounded-lg p-3 text-center"
                          >
                            <div className="text-lg font-bold text-yellow-400">LEVEL UP!</div>
                            <div className="text-sm text-yellow-200">
                              Level {newLevel.level} &mdash; Proficiency +{newLevel.proficiencyBonus}
                              {newLevel.newSkill && ', New Skill'}
                              {newLevel.abilityBonus && ', +1 Ability'}
                              , Hand size {newLevel.handSize}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </FadeSlide>
                  );
                })}
              </div>
            </SectionWrapper>
          )}

          {/* ═══ 5g: Nash Check — The Final Whistle ═══ */}
          {visiblePhases.includes('5g') && (
            <SectionWrapper key="5g" label="5g" title={SUB_PHASE_TITLES['5g']}>
              {/* Q1 */}
              <FadeSlide delay={0.1}>
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-4">
                  <h4 className="font-semibold text-sm mb-2 text-blue-400">
                    Q1 — Individual Thresholds
                  </h4>
                  <div className="space-y-1">
                    {players.map(p => {
                      const u = utilities[p.roleId] ?? 0;
                      const t = SURVIVAL_THRESHOLDS[p.roleId];
                      const passes = u >= t;
                      return (
                        <div key={p.id} className="flex items-center gap-2 text-sm">
                          <span className="w-28">{ROLE_LABELS[p.roleId]}</span>
                          <span className="font-mono">u={u} &ge; T={t}</span>
                          <span className={passes ? 'text-green-400' : 'text-red-400'}>
                            {passes ? '\u2713' : '\u2717'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className={`mt-2 text-sm font-bold ${q1.passed ? 'text-green-400' : 'text-red-400'}`}>
                    Overall: {q1.passed ? 'PASSES' : 'FAILS'}
                  </div>
                </div>
              </FadeSlide>

              {/* Q2 */}
              <FadeSlide delay={0.5}>
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-4">
                  <h4 className="font-semibold text-sm mb-2 text-purple-400">
                    Q2 — No Profitable Deviation
                  </h4>
                  <div className="space-y-1">
                    {players.map(p => {
                      const type = PLAYER_TYPE[p.roleId];
                      if (type === 'S-FIXED') {
                        return (
                          <div key={p.id} className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="w-28">{ROLE_LABELS[p.roleId]}</span>
                            <span>S-Fixed (strategy constrained) — skipped</span>
                          </div>
                        );
                      }
                      const u = utilities[p.roleId] ?? 0;
                      // Best solo approximation: only revenue+access for isolation
                      const soloSat: Record<ObjectiveId, boolean> = {
                        safety: false, greenery: false, access: satObjectives.access,
                        culture: false, revenue: satObjectives.revenue, community: false,
                      };
                      const soloU = (Object.entries(OBJECTIVE_WEIGHTS[p.roleId]) as [ObjectiveId, number][])
                        .reduce((s, [obj, w]) => s + (soloSat[obj] ? w : 0), 0);
                      const noProfitableDeviation = u >= soloU;
                      return (
                        <div key={p.id} className="flex items-center gap-2 text-sm">
                          <span className="w-28">{ROLE_LABELS[p.roleId]}</span>
                          <span className="font-mono text-xs">
                            Solo={soloU}, Current={u}
                          </span>
                          <span className={noProfitableDeviation ? 'text-green-400' : 'text-red-400'}>
                            {noProfitableDeviation ? '\u2713 NO deviation' : '\u2717 Could improve alone'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </FadeSlide>

              {/* Q3 */}
              <FadeSlide delay={0.9}>
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-4">
                  <h4 className="font-semibold text-sm mb-2 text-orange-400">
                    Q3 — Equity + CWS
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span>Variance = {q3.variance.toFixed(2)} &le; {NASH_PARAMS.equityBandK}</span>
                      <span className={q3.variance <= NASH_PARAMS.equityBandK ? 'text-green-400' : 'text-red-400'}>
                        {q3.variance <= NASH_PARAMS.equityBandK ? '\u2713' : '\u2717'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>CWS = {cwsData.total} &ge; {NASH_PARAMS.cwsTarget}</span>
                      <span className={q3.cws_above_target ? 'text-green-400' : 'text-red-400'}>
                        {q3.cws_above_target ? '\u2713' : '\u2717'}
                      </span>
                    </div>
                    {!q3.passed && q1.failing_players.length > 0 && (
                      <div className="mt-2 text-xs text-red-300">
                        Dragged down by: {q1.failing_players.map(f => ROLE_LABELS[f.roleId]).join(', ')}.
                        Prioritize their objectives next round.
                      </div>
                    )}
                  </div>
                  <div className={`mt-2 text-sm font-bold ${q3.passed ? 'text-green-400' : 'text-red-400'}`}>
                    Overall: {q3.passed ? 'PASSES' : 'FAILS'}
                  </div>
                </div>
              </FadeSlide>

              {/* DNE Verdict */}
              <FadeSlide delay={1.3}>
                <DNEVerdict
                  endCondition={endCondition}
                  cwsTotal={cwsData.total}
                  q1Passed={q1.passed}
                  q3Passed={q3.passed}
                />
              </FadeSlide>

              {/* Continue button */}
              <FadeSlide delay={1.8}>
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleComplete}
                    className="px-8 py-3 rounded-lg text-lg font-bold transition-all hover:scale-105"
                    style={{
                      backgroundColor: endCondition === 'full_dne' ? '#F1C40F' :
                        endCondition === 'partial' ? '#95A5A6' :
                        endCondition === 'veto_deadlock' ? '#C0392B' :
                        '#3498DB',
                      color: endCondition === 'full_dne' ? '#000' : '#FFF',
                    }}
                  >
                    {endCondition === 'continue' ? 'Continue to Next Round' : 'View Final Results'}
                  </button>
                </div>
              </FadeSlide>
            </SectionWrapper>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── Sub-components ─────────────────────────────────────────────

const SectionWrapper: React.FC<{
  label: string;
  title: string;
  children: React.ReactNode;
}> = ({ label, title, children }) => (
  <motion.section
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
    className="pb-6"
  >
    <div className="flex items-center gap-3 mb-4">
      <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">{label}</span>
      <h3 className="text-lg font-bold">{title}</h3>
    </div>
    {children}
  </motion.section>
);

const ConditionBadge: React.FC<{ condition: ZoneCondition }> = ({ condition }) => (
  <span
    className="text-xs font-bold px-2 py-0.5 rounded uppercase"
    style={{
      backgroundColor: `${CONDITION_COLORS[condition]}22`,
      color: CONDITION_COLORS[condition],
      border: `1px solid ${CONDITION_COLORS[condition]}44`,
    }}
  >
    {condition}
  </span>
);

const DNEVerdict: React.FC<{
  endCondition: string;
  cwsTotal: number;
  q1Passed: boolean;
  q3Passed: boolean;
}> = ({ endCondition, cwsTotal, q1Passed, q3Passed }) => {
  const configs: Record<string, { bg: string; border: string; text: string; title: string; desc: string }> = {
    full_dne: {
      bg: 'bg-yellow-900/30',
      border: 'border-yellow-500',
      text: 'text-yellow-400',
      title: 'NASH EQUILIBRIUM ACHIEVED!',
      desc: `CWS ${cwsTotal} \u2265 85, all thresholds met, equity in band. Gold standard ending!`,
    },
    partial: {
      bg: 'bg-gray-700/30',
      border: 'border-gray-400',
      text: 'text-gray-300',
      title: 'Partial Success',
      desc: `CWS ${cwsTotal} \u2265 60 but full DNE not achieved. ${!q1Passed ? 'Some players below threshold.' : ''} ${!q3Passed ? 'Equity/CWS check failed.' : ''}`,
    },
    time_ends: {
      bg: 'bg-orange-900/30',
      border: 'border-orange-500',
      text: 'text-orange-400',
      title: 'Time Expired',
      desc: 'Final round reached. The community must live with the current outcome.',
    },
    veto_deadlock: {
      bg: 'bg-red-900/30',
      border: 'border-red-500',
      text: 'text-red-400',
      title: 'Veto Deadlock',
      desc: 'All players are in B\u00FCchi crisis. The city planning process has stalled.',
    },
    continue: {
      bg: 'bg-blue-900/30',
      border: 'border-blue-500',
      text: 'text-blue-400',
      title: 'Round Complete',
      desc: 'The game continues. Review the Nash feedback and plan your next moves.',
    },
  };

  const cfg = configs[endCondition] || configs.continue;

  return (
    <div className={`${cfg.bg} border-2 ${cfg.border} rounded-xl p-6 text-center`}>
      {endCondition === 'full_dne' && (
        <motion.div
          className="text-4xl mb-2"
          animate={{ rotate: [0, -5, 5, -5, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: 2 }}
        >
          {'\u2728\u2728\u2728'}
        </motion.div>
      )}
      <h2 className={`text-2xl font-black ${cfg.text} mb-2`}>{cfg.title}</h2>
      <p className="text-sm text-gray-300">{cfg.desc}</p>
    </div>
  );
};

export default ScoringPhase;
