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
  '5e': 'Buchi Safety Check',
  '5f': 'CP Awards & Level-Up',
  '5g': 'Nash Check: The Referee Review',
};

const SUB_PHASE_DURATIONS: Record<SubPhase, number> = {
  '5a': 3000, '5b': 3000, '5c': 10000, '5d': 5000, '5e': 3000, '5f': 4000, '5g': 8000,
};

const CONDITION_COLORS: Record<ZoneCondition, string> = {
  good: '#27AE60', fair: '#F4D03F', poor: '#E67E22', critical: '#C0392B', locked: '#6B7280',
};

const OBJECTIVE_LABELS: Record<ObjectiveId, string> = {
  safety: 'Safety', greenery: 'Greenery', access: 'Access',
  culture: 'Culture', revenue: 'Revenue', community: 'Community',
};

const ROLE_LABELS: Record<RoleId, string> = {
  administrator: 'Administrator', investor: 'Investor', designer: 'Designer',
  citizen: 'Citizen', advocate: 'Advocate',
};

const ROLE_INCOME_DESC: Record<RoleId, string> = {
  administrator: '+2B, +1I', investor: '+3B', designer: '+2K',
  citizen: '+3V', advocate: '+1I, +1K',
};

const ALL_OBJECTIVES: ObjectiveId[] = ['safety', 'greenery', 'access', 'culture', 'revenue', 'community'];

// ─── Helpers ────────────────────────────────────────────────────

const FadeSlide: React.FC<{ delay?: number; children: React.ReactNode; className?: string }> = ({
  delay = 0, children, className = '',
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

function conditionBadge(cond: ZoneCondition) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-bold text-white"
      style={{ backgroundColor: CONDITION_COLORS[cond] }}
    >
      {cond.toUpperCase()}
    </span>
  );
}

function roleName(id: RoleId) { return ROLE_LABELS[id] || id; }

function fmt(n: number) { return Math.round(n * 100) / 100; }

function getChangedZones(session: GameSession): { zone: Zone; prev: ZoneCondition }[] {
  const results: { zone: Zone; prev: ZoneCondition }[] = [];
  for (const zone of Object.values(session.board.zones)) {
    const hist = zone.conditionHistory;
    if (hist.length >= 2) {
      const prev = hist[hist.length - 2].condition;
      if (prev !== zone.condition) results.push({ zone, prev });
    }
  }
  return results;
}

function getMaxPossibleUtility(roleId: RoleId): number {
  const w = OBJECTIVE_WEIGHTS[roleId];
  return ALL_OBJECTIVES.reduce((s, o) => s + Math.max(0, w[o]), 0);
}

function getBestSoloUtility(roleId: RoleId): number {
  const w = OBJECTIVE_WEIGHTS[roleId];
  const sorted = ALL_OBJECTIVES.map(o => w[o]).sort((a, b) => b - a);
  return sorted[0] + (sorted[1] || 0);
}

function determineEndCondition(session: GameSession, nashOutput: NashEngineOutput): string {
  const { cws, nash_q1, nash_q3, crisis_state } = nashOutput;
  if (cws.total >= NASH_PARAMS.fullDneThreshold && nash_q1.passed && nash_q3.passed) return 'full_dne';
  const allCrisis = Object.values(session.players).every(p => p.crisisState);
  if (allCrisis) return 'veto_deadlock';
  if (session.currentRound >= session.totalRounds) return 'time_ends';
  if (cws.total >= NASH_PARAMS.partialThreshold) return 'partial_success';
  return 'none';
}

function getPlayerPrevUtility(player: Player): number | null {
  const h = player.utilityHistory;
  return h.length >= 2 ? h[h.length - 2] : null;
}

// ─── Confetti ───────────────────────────────────────────────────

const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96E6A1', '#DDA0DD'];
const Confetti: React.FC = () => {
  const pieces = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
    id: i, x: Math.random() * 100, color: CONFETTI_COLORS[i % 6],
    delay: Math.random() * 2, size: 6 + Math.random() * 8,
  })), []);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {pieces.map(p => (
        <motion.div key={p.id} className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: -10, width: p.size, height: p.size, backgroundColor: p.color }}
          animate={{ y: [0, 600], rotate: [0, 360], opacity: [1, 0] }}
          transition={{ duration: 3, delay: p.delay, ease: 'easeIn' }} />
      ))}
    </div>
  );
};

// ─── Sub-phase components ───────────────────────────────────────

const Phase5a: React.FC<{ session: GameSession }> = ({ session }) => {
  const changed = useMemo(() => getChangedZones(session), [session]);
  const zones = Object.values(session.board.zones);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-center">
        {zones.map((z, i) => {
          const hit = changed.some(c => c.zone.id === z.id);
          return (
            <motion.div key={z.id}
              className="relative w-16 h-16 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow"
              style={{ backgroundColor: CONDITION_COLORS[z.condition], transition: 'background-color 1.5s ease' }}
              initial={hit ? { scale: 0.8 } : {}} animate={hit ? { scale: [0.8, 1.15, 1] } : {}}
              transition={{ duration: 0.8, delay: i * 0.05 }}>
              {z.name.split(' ').map(w => w[0]).join('')}
              {hit && (
                <motion.div className="absolute inset-0 rounded-lg border-2 border-white"
                  initial={{ opacity: 0.8, scale: 1 }} animate={{ opacity: 0, scale: 1.6 }}
                  transition={{ duration: 1.2, delay: 0.3 }} />
              )}
            </motion.div>
          );
        })}
      </div>
      {changed.length > 0 ? (
        <div className="space-y-1">
          {changed.map((c, i) => (
            <FadeSlide key={c.zone.id} delay={i * 0.2}>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-200">{c.zone.name}:</span>
                {conditionBadge(c.prev)}<span className="text-gray-400">&rarr;</span>{conditionBadge(c.zone.condition)}
              </div>
            </FadeSlide>
          ))}
        </div>
      ) : <p className="text-gray-400 text-sm text-center">No zone conditions changed this round.</p>}
    </div>
  );
};

const Phase5b: React.FC<{ session: GameSession; players: Player[] }> = ({ session, players }) => {
  const zones = Object.values(session.board.zones);
  const goodZones = zones.filter(z => z.condition === 'good');
  const badZones = zones.filter(z => z.condition === 'poor' || z.condition === 'critical');
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {goodZones.map(z => (
          <motion.div key={z.id} className="flex items-center gap-2 text-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <span className="text-green-400 font-bold">+1</span><span className="text-gray-300">{z.name}</span>
          </motion.div>
        ))}
        {badZones.map(z => (
          <motion.div key={z.id} className="flex items-center gap-2 text-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <span className="text-red-400 font-bold">-1</span><span className="text-gray-300">{z.name}</span>
          </motion.div>
        ))}
      </div>
      {/* Player income */}
      <div className="space-y-2">
        <h4 className="text-xs uppercase tracking-wide text-gray-500">Player Income</h4>
        {players.map((p, i) => {
          const income = PROFESSION_INCOME[p.roleId];
          const entries = Object.entries(income.base).filter(([, v]) => v > 0);
          return (
            <FadeSlide key={p.id} delay={0.3 + i * 0.15}>
              <div className="flex items-center gap-3 bg-gray-800/50 rounded px-3 py-1.5">
                <div className="w-7 h-7 rounded-full flex-shrink-0" style={{ backgroundColor: ROLE_COLORS[p.roleId] }} />
                <span className="text-sm font-medium text-white w-24">{roleName(p.roleId)}</span>
                <span className="text-xs text-gray-400">{ROLE_INCOME_DESC[p.roleId]}</span>
                <div className="flex gap-2 ml-auto">
                  {entries.map(([res, amt]) => (
                    <motion.span key={res} className="text-xs font-bold text-green-300"
                      initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 + i * 0.15 }}>
                      +{amt} {res[0].toUpperCase()}
                    </motion.span>
                  ))}
                </div>
              </div>
            </FadeSlide>
          );
        })}
      </div>
    </div>
  );
};

const Phase5c: React.FC<{
  players: Player[]; satObjectives: Record<ObjectiveId, boolean>;
  utilities: Record<RoleId, number>;
}> = ({ players, satObjectives, utilities }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => {
    if (activeIdx >= players.length) return;
    const t = setTimeout(() => setActiveIdx(i => i + 1), 2000);
    return () => clearTimeout(t);
  }, [activeIdx, players.length]);

  return (
    <div className="space-y-3">
      {/* Tab row */}
      <div className="flex gap-1">
        {players.map((p, i) => (
          <button key={p.id}
            onClick={() => setActiveIdx(i)}
            className={`px-3 py-1 text-xs rounded-t font-medium transition-colors ${
              i === activeIdx ? 'bg-gray-700 text-white' : 'bg-gray-800/40 text-gray-500'
            }`}
            style={i === activeIdx ? { borderBottom: `2px solid ${ROLE_COLORS[p.roleId]}` } : {}}>
            {roleName(p.roleId)}
          </button>
        ))}
      </div>
      {/* Active player card */}
      <AnimatePresence mode="wait">
        {players[activeIdx] && (
          <PlayerUtilityCard
            key={players[activeIdx].id}
            player={players[activeIdx]}
            satObjectives={satObjectives}
            utility={utilities[players[activeIdx].roleId]}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const PlayerUtilityCard: React.FC<{
  player: Player; satObjectives: Record<ObjectiveId, boolean>; utility: number;
}> = ({ player, satObjectives, utility }) => {
  const weights = OBJECTIVE_WEIGHTS[player.roleId];
  const maxU = getMaxPossibleUtility(player.roleId);
  const threshold = SURVIVAL_THRESHOLDS[player.roleId];
  const prevU = getPlayerPrevUtility(player);
  const aboveThresh = utility >= threshold;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35 }}
      className="bg-gray-800/60 rounded-lg p-4 space-y-3"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-white font-bold text-sm"
          style={{ borderColor: ROLE_COLORS[player.roleId], backgroundColor: ROLE_COLORS[player.roleId] + '30' }}>
          {roleName(player.roleId)[0]}
        </div>
        <span className="text-lg font-bold text-white">{roleName(player.roleId)}</span>
      </div>
      {/* Objective rows */}
      <div className="space-y-1">
        {ALL_OBJECTIVES.map((obj, i) => {
          const w = weights[obj];
          const sat = satObjectives[obj];
          const product = sat ? w : 0;
          return (
            <FadeSlide key={obj} delay={i * 0.15}>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-20 text-gray-400">{OBJECTIVE_LABELS[obj]}:</span>
                <span className="w-6 text-right text-gray-300">{w}</span>
                <span className="text-gray-500 mx-1">&times;</span>
                <span className={sat ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                  {sat ? '\u2713' : '\u2717'}
                </span>
                <span className="text-gray-500 mx-1">=</span>
                <span className="font-medium text-white">{product}</span>
              </div>
            </FadeSlide>
          );
        })}
      </div>
      <div className="pt-2 border-t border-gray-700 space-y-2">
        <motion.div className="flex items-center gap-2"
          initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ delay: 0.9 }}>
          <span className="text-lg font-black text-white">UTILITY: u = {utility}</span>
        </motion.div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: ROLE_COLORS[player.roleId] }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (utility / maxU) * 100)}%` }}
            transition={{ duration: 1, delay: 0.5 }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>0</span><span>Max: {maxU}</span>
        </div>
        <div className={`text-sm font-medium ${aboveThresh ? 'text-green-400' : 'text-red-400'}`}>
          Threshold: {threshold} &rarr; {aboveThresh ? '\u2713 ABOVE' : '\u2717 BELOW'}
        </div>
        {prevU !== null && (
          <div className="text-xs text-gray-400">
            Was: {prevU} &rarr; Now: {utility}{' '}
            <span className={utility >= prevU ? 'text-green-400' : 'text-red-400'}>
              ({utility >= prevU ? '+' : ''}{utility - prevU})
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const Phase5d: React.FC<{
  players: Player[]; utilities: Record<RoleId, number>; cws: NashEngineOutput['cws'];
}> = ({ players, utilities, cws }) => {
  const variance = calculateVariance(utilities);
  const values = Object.values(utilities);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const cpTotal = players.reduce((s, p) => s + p.collaborationPoints, 0);

  return (
    <div className="space-y-4">
      {/* Step 1 */}
      <FadeSlide delay={0}>
        <div className="bg-gray-800/50 rounded p-3 space-y-1">
          <h4 className="text-xs uppercase tracking-wide text-yellow-400 font-bold">Step 1: Weighted Utilities</h4>
          {players.map(p => {
            const w = WELFARE_WEIGHTS[p.roleId];
            const u = utilities[p.roleId];
            return (
              <div key={p.id} className="flex gap-2 text-sm text-gray-300">
                <span className="w-24">{roleName(p.roleId)}</span>
                <span>{w} &times; {u} = <strong className="text-white">{fmt(w * u)}</strong></span>
              </div>
            );
          })}
          <div className="text-sm font-bold text-white pt-1 border-t border-gray-700">
            Subtotal: {fmt(cws.weighted_sum)}
          </div>
        </div>
      </FadeSlide>
      {/* Step 2 */}
      <FadeSlide delay={1}>
        <div className="bg-gray-800/50 rounded p-3 space-y-1">
          <h4 className="text-xs uppercase tracking-wide text-blue-400 font-bold">Step 2: Equity Bonus</h4>
          <div className="text-sm text-gray-300">
            Mean: [{values.join(', ')}] / {values.length} = <strong className="text-white">{fmt(mean)}</strong>
          </div>
          <div className="text-sm text-gray-300">
            Variance: <strong className="text-white">{fmt(variance)}</strong>
          </div>
          <div className="text-sm text-gray-300">
            Equity Bonus: 10 &times; (1 - {fmt(variance)}/100) ={' '}
            <strong className="text-white">{fmt(cws.equity_bonus)}</strong>
          </div>
        </div>
      </FadeSlide>
      {/* Step 3 */}
      <FadeSlide delay={2}>
        <div className="bg-gray-800/50 rounded p-3">
          <h4 className="text-xs uppercase tracking-wide text-purple-400 font-bold">Step 3: Collaboration Points</h4>
          <div className="text-sm text-white font-bold">{cpTotal}</div>
        </div>
      </FadeSlide>
      {/* Step 4 */}
      <FadeSlide delay={3}>
        <div className="bg-gray-800/50 rounded p-3 space-y-2">
          <h4 className="text-xs uppercase tracking-wide text-green-400 font-bold">Step 4: TOTAL CWS</h4>
          <div className="text-sm text-gray-300">
            {fmt(cws.weighted_sum)} + {fmt(cws.equity_bonus)} + {cws.cp_bonus} ={' '}
            <strong className="text-xl text-white">{fmt(cws.total)}</strong>
          </div>
          {/* Progress bar */}
          <div className="relative h-5 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: cws.total >= 75 ? '#27AE60' : '#F4D03F' }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (cws.total / 120) * 100)}%` }}
              transition={{ duration: 1.5, delay: 0.5 }}
            />
            {/* Target line */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-white/70"
              style={{ left: `${(75 / 120) * 100}%` }}>
              <span className="absolute -top-5 -translate-x-1/2 text-[10px] text-gray-400">75</span>
            </div>
          </div>
          <div className={`text-sm font-bold ${cws.total >= 75 ? 'text-green-400' : 'text-amber-400'}`}>
            {cws.total >= 75 ? 'Above target!' : 'Below target'}
          </div>
        </div>
      </FadeSlide>
    </div>
  );
};

const Phase5e: React.FC<{
  session: GameSession; players: Player[]; satObjectives: Record<ObjectiveId, boolean>;
}> = ({ session, players, satObjectives }) => {
  const buchiHistory = (session.buchiHistory || {}) as Record<RoleId, Record<ObjectiveId, number>>;
  return (
    <div className="space-y-3">
      {players.map((p, pi) => {
        const objs = BUCHI_OBJECTIVES[p.roleId] || [];
        const hist = buchiHistory[p.roleId] || {};
        const hasCrisis = objs.some(o => (hist[o] || 0) >= 2);
        return (
          <FadeSlide key={p.id} delay={pi * 0.15}>
            <div className={`bg-gray-800/50 rounded p-3 ${hasCrisis ? 'ring-2 ring-red-500' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${hasCrisis ? 'ring-2 ring-red-500' : ''}`}
                  style={{ backgroundColor: ROLE_COLORS[p.roleId] }}>
                  {roleName(p.roleId)[0]}
                </div>
                <span className="text-sm font-bold text-white">{roleName(p.roleId)}</span>
                {hasCrisis && (
                  <span className="ml-auto text-xs bg-red-600 text-white px-2 py-0.5 rounded font-bold">
                    -2 all abilities
                  </span>
                )}
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500">
                    <th className="text-left py-0.5">Objective</th>
                    <th className="text-right py-0.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {objs.map(obj => {
                    const rounds = hist[obj] || 0;
                    const sat = satObjectives[obj];
                    let status: string, color: string;
                    if (sat || rounds === 0) { status = '\u2713 Safe'; color = 'text-green-400'; }
                    else if (rounds === 1) { status = '\u26A0 Warning'; color = 'text-yellow-400'; }
                    else { status = 'CRISIS STATE'; color = 'text-red-400'; }
                    return (
                      <tr key={obj} className="border-t border-gray-700/50">
                        <td className="py-1 text-gray-300">{OBJECTIVE_LABELS[obj]}</td>
                        <td className={`py-1 text-right font-bold ${color}`}>{status}</td>
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
  );
};

const Phase5f: React.FC<{
  players: Player[]; roundCPAwards: Record<string, { amount: number; reason: string }[]>;
}> = ({ players, roundCPAwards }) => {
  return (
    <div className="space-y-3">
      {players.map((p, pi) => {
        const awards = roundCPAwards[p.id] || [];
        const totalAward = awards.reduce((s, a) => s + a.amount, 0);
        const newCP = p.collaborationPoints;
        const currentLevel = p.level;
        const nextLevel = LEVEL_TABLE.find(l => l.level === currentLevel + 1);
        const leveledUp = nextLevel && newCP >= nextLevel.cpRequired;
        return (
          <FadeSlide key={p.id} delay={pi * 0.15}>
            <div className="bg-gray-800/50 rounded p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full flex-shrink-0"
                  style={{ backgroundColor: ROLE_COLORS[p.roleId] }} />
                <span className="text-sm font-bold text-white">{roleName(p.roleId)}</span>
                <span className="ml-auto text-xs text-gray-400">CP: {newCP}</span>
              </div>
              {awards.length > 0 ? (
                <div className="space-y-0.5 ml-8">
                  {awards.map((a, i) => (
                    <motion.div key={i} className="text-xs text-gray-300"
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: pi * 0.15 + i * 0.1 }}>
                      <span className="text-green-400 font-bold">+{a.amount}</span>{' '}{a.reason}
                    </motion.div>
                  ))}
                  <div className="text-xs text-white font-bold pt-0.5">Total: +{totalAward} CP</div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 ml-8">No CP this round</div>
              )}
              {leveledUp && (
                <motion.div
                  className="mt-2 bg-yellow-500/20 border border-yellow-500 rounded px-3 py-1.5 text-center"
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring' }}>
                  <div className="text-yellow-400 font-black text-sm">LEVEL UP!</div>
                  <div className="text-xs text-yellow-300">
                    Level {currentLevel} &rarr; {currentLevel + 1}
                    {nextLevel.newSkill && ' | New Skill'}
                    {nextLevel.abilityBonus && ' | +1 Ability'}
                  </div>
                </motion.div>
              )}
            </div>
          </FadeSlide>
        );
      })}
    </div>
  );
};

const Phase5g: React.FC<{
  players: Player[]; nashOutput: NashEngineOutput; endCondition: string;
}> = ({ players, nashOutput, endCondition }) => {
  const { utilities, cws, nash_q1, nash_q3, dne_achieved } = nashOutput;
  const allPass = nash_q1.passed && nash_q3.passed;

  // Q2: best solo for environment players
  const envRoles: RoleId[] = ['designer', 'citizen', 'advocate'];
  const fixedRoles: RoleId[] = ['administrator', 'investor'];

  // Find lowest utility player for Q3 failure reason
  const utilEntries = Object.entries(utilities) as [RoleId, number][];
  const sorted = [...utilEntries].sort((a, b) => a[1] - b[1]);
  const lowest = sorted[0];
  const avg = utilEntries.reduce((s, [, v]) => s + v, 0) / utilEntries.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-lg font-black text-white">
        <span className="text-2xl">&#127937;</span> NASH CHECK: The Referee Review
      </div>

      {/* Q1 */}
      <FadeSlide delay={0}>
        <div className="bg-gray-800/50 rounded p-3 space-y-1">
          <h4 className="text-xs uppercase tracking-wide text-cyan-400 font-bold">
            Q1 -- Individual Thresholds
          </h4>
          <p className="text-[11px] text-gray-500 italic">Is everyone above survival?</p>
          {utilEntries.map(([roleId, u]) => {
            const t = SURVIVAL_THRESHOLDS[roleId];
            const pass = u >= t;
            return (
              <div key={roleId} className="text-sm text-gray-300">
                {roleName(roleId)}: u={u} {pass ? '\u2265' : '<'} T={t}{' '}
                <span className={pass ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                  {pass ? '\u2713' : '\u2717'}
                </span>
              </div>
            );
          })}
          <div className={`text-sm font-black pt-1 border-t border-gray-700 ${nash_q1.passed ? 'text-green-400' : 'text-red-400'}`}>
            CALL: Q1 {nash_q1.passed ? 'PASSES \u2713' : `FAILS \u2717 -- ${nash_q1.failing_players.map(f => roleName(f.roleId)).join(', ')}`}
          </div>
        </div>
      </FadeSlide>

      {/* Q2 */}
      <FadeSlide delay={1}>
        <div className="bg-gray-800/50 rounded p-3 space-y-1">
          <h4 className="text-xs uppercase tracking-wide text-orange-400 font-bold">
            Q2 -- No Profitable Deviation
          </h4>
          <div className="text-xs text-gray-500 italic mb-1">
            S-FIXED players ({fixedRoles.map(r => roleName(r)).join(', ')}): not reviewed -- institutionally constrained
          </div>
          {envRoles.map(roleId => {
            const actual = utilities[roleId] ?? 0;
            const bestSolo = getBestSoloUtility(roleId);
            const pass = actual >= bestSolo;
            return (
              <div key={roleId} className="text-sm text-gray-300">
                {roleName(roleId)}: actual={actual}, best solo={bestSolo}{' '}
                <span className={pass ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                  {pass ? 'NO profitable deviation \u2713' : 'profitable deviation exists \u2717'}
                </span>
              </div>
            );
          })}
          <div className={`text-sm font-black pt-1 border-t border-gray-700 ${
            envRoles.every(r => (utilities[r] ?? 0) >= getBestSoloUtility(r)) ? 'text-green-400' : 'text-red-400'
          }`}>
            CALL: Q2 {envRoles.every(r => (utilities[r] ?? 0) >= getBestSoloUtility(r)) ? 'PASSES \u2713' : 'FAILS \u2717'}
          </div>
        </div>
      </FadeSlide>

      {/* Q3 */}
      <FadeSlide delay={2}>
        <div className="bg-gray-800/50 rounded p-3 space-y-1">
          <h4 className="text-xs uppercase tracking-wide text-pink-400 font-bold">
            Q3 -- Equity + CWS
          </h4>
          <p className="text-[11px] text-gray-500 italic">Is it fair AND sufficient?</p>
          <div className="text-sm text-gray-300">
            Variance: {fmt(nash_q3.variance)} &le; 4.00?{' '}
            <span className={nash_q3.variance <= 4 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
              {nash_q3.variance <= 4 ? 'YES' : 'NO'}
            </span>
          </div>
          <div className="text-sm text-gray-300">
            CWS: {fmt(cws.total)} &ge; 75?{' '}
            <span className={nash_q3.cws_above_target ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
              {nash_q3.cws_above_target ? 'YES' : 'NO'}
            </span>
          </div>
          {!nash_q3.passed && lowest && (
            <div className="text-xs text-red-300 italic">
              REASON: {roleName(lowest[0])} at {lowest[1]} is {fmt(avg - lowest[1])} below average
            </div>
          )}
          <div className={`text-sm font-black pt-1 border-t border-gray-700 ${nash_q3.passed ? 'text-green-400' : 'text-red-400'}`}>
            CALL: Q3 {nash_q3.passed ? 'PASSES \u2713' : 'FAILS \u2717'}
          </div>
        </div>
      </FadeSlide>

      {/* DNE Verdict */}
      <FadeSlide delay={3.5}>
        {allPass ? (
          <div className="relative bg-gradient-to-r from-yellow-600/30 to-yellow-500/20 border-2 border-yellow-500 rounded-lg p-5 text-center overflow-hidden">
            <Confetti />
            <div className="text-2xl font-black text-yellow-400 mb-1">
              &#127942; NASH EQUILIBRIUM ACHIEVED! DNE FOUND!
            </div>
            <div className="text-sm text-yellow-200">
              The park is restored. Every stakeholder found their balance.
            </div>
          </div>
        ) : (
          <div className="bg-gray-800/70 border border-gray-600 rounded-lg p-4 space-y-2">
            <div className="text-lg font-black text-gray-300">DNE Not Yet Achieved</div>
            <div className="text-sm text-gray-400 space-y-1">
              {!nash_q1.passed && (
                <div>Q1 failed: {nash_q1.failing_players.map(f =>
                  `${roleName(f.roleId)} needs +${f.deficit} utility`).join('; ')}</div>
              )}
              {!nash_q3.passed && nash_q3.variance > 4 && (
                <div>Q3 failed: variance {fmt(nash_q3.variance)} exceeds equity band of 4.00</div>
              )}
              {!nash_q3.passed && !nash_q3.cws_above_target && (
                <div>Q3 failed: CWS {fmt(cws.total)} below target of 75</div>
              )}
            </div>
            {nashOutput.optimal_next_action.reasoning && (
              <div className="text-sm text-cyan-300 font-medium pt-1 border-t border-gray-700">
                ADVICE: {nashOutput.optimal_next_action.reasoning}
              </div>
            )}
          </div>
        )}
      </FadeSlide>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────

export default function ScoringPhase({ session, players, roundCPAwards, onPhaseComplete }: ScoringPhaseProps) {
  const [currentSubIdx, setCurrentSubIdx] = useState(0);
  const [finished, setFinished] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Compute all scoring data once
  const satObjectives = useMemo(() => calculateObjectiveSatisfaction(session.board.zones), [session]);
  const utilities = useMemo(() => calculateAllUtilities(session.players, satObjectives), [session, satObjectives]);
  const nashOutput = useMemo(() => runNashEngine(session), [session]);
  const endCondition = useMemo(() => determineEndCondition(session, nashOutput), [session, nashOutput]);

  // Auto-scroll timer
  useEffect(() => {
    if (finished) return;
    const phase = SUB_PHASE_ORDER[currentSubIdx];
    if (!phase) { setFinished(true); return; }
    const timer = setTimeout(() => {
      if (currentSubIdx < SUB_PHASE_ORDER.length - 1) {
        setCurrentSubIdx(i => i + 1);
      } else {
        setFinished(true);
      }
    }, SUB_PHASE_DURATIONS[phase]);
    return () => clearTimeout(timer);
  }, [currentSubIdx, finished]);

  // Scroll to current sub-phase
  useEffect(() => {
    const phase = SUB_PHASE_ORDER[currentSubIdx];
    const el = sectionRefs.current[phase];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentSubIdx]);

  const advance = useCallback(() => {
    if (currentSubIdx < SUB_PHASE_ORDER.length - 1) {
      setCurrentSubIdx(i => i + 1);
    } else {
      setFinished(true);
    }
  }, [currentSubIdx]);

  const handleComplete = useCallback(() => {
    onPhaseComplete(nashOutput, endCondition);
  }, [onPhaseComplete, nashOutput, endCondition]);

  const isGameEnd = endCondition !== 'none';

  return (
    <div ref={containerRef} className="relative max-w-2xl mx-auto px-4 py-6 space-y-6 overflow-y-auto max-h-[85vh]">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-black text-white tracking-tight">Phase 5: Scoring & Nash Check</h2>
        <p className="text-sm text-gray-400">Round {session.currentRound} of {session.totalRounds}</p>
      </div>

      {/* Sub-phase progress */}
      <div className="flex gap-1">
        {SUB_PHASE_ORDER.map((sp, i) => (
          <button key={sp} onClick={() => { setCurrentSubIdx(i); }}
            className={`flex-1 h-1.5 rounded-full transition-colors ${
              i <= currentSubIdx ? 'bg-cyan-500' : 'bg-gray-700'
            }`}
            title={SUB_PHASE_TITLES[sp]}
          />
        ))}
      </div>

      {/* Sub-phase sections */}
      {SUB_PHASE_ORDER.map((sp, i) => {
        if (i > currentSubIdx) return null;
        return (
          <div key={sp} ref={el => { sectionRefs.current[sp] = el; }}
            className="scroll-mt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-cyan-900/50 text-cyan-300 px-2 py-0.5 rounded font-mono">
                {sp.toUpperCase()}
              </span>
              <h3 className="text-sm font-bold text-gray-300">{SUB_PHASE_TITLES[sp]}</h3>
            </div>
            <AnimatePresence>
              {sp === '5a' && <Phase5a session={session} />}
              {sp === '5b' && <Phase5b session={session} players={players} />}
              {sp === '5c' && <Phase5c players={players} satObjectives={satObjectives} utilities={utilities} />}
              {sp === '5d' && <Phase5d players={players} utilities={utilities} cws={nashOutput.cws} />}
              {sp === '5e' && <Phase5e session={session} players={players} satObjectives={satObjectives} />}
              {sp === '5f' && <Phase5f players={players} roundCPAwards={roundCPAwards} />}
              {sp === '5g' && <Phase5g players={players} nashOutput={nashOutput} endCondition={endCondition} />}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Next / Advance button */}
      {!finished && (
        <div className="sticky bottom-0 flex justify-center py-3">
          <button
            onClick={advance}
            className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold px-5 py-2 rounded-lg shadow-lg transition-colors"
          >
            Next &#9660;
          </button>
        </div>
      )}

      {/* Final button */}
      {finished && (
        <FadeSlide delay={0.3}>
          <div className="flex justify-center pt-4 pb-8">
            <button
              onClick={handleComplete}
              className={`text-white font-black text-base px-8 py-3 rounded-xl shadow-xl transition-colors ${
                isGameEnd
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'
              }`}
            >
              {isGameEnd ? 'Proceed to Results \u2192' : 'Continue to Next Round \u2192'}
            </button>
          </div>
        </FadeSlide>
      )}
    </div>
  );
}
