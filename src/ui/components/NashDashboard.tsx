import React from 'react';
import { motion } from 'framer-motion';
import type { RoleId } from '../../core/models/types';
import { OBJECTIVE_WEIGHTS, BUCHI_OBJECTIVES, WELFARE_WEIGHTS, SURVIVAL_THRESHOLDS, ROLE_COLORS, type ObjectiveId } from '../../core/models/constants';

interface NashDashboardProps {
  nashOutput: any; // NashEngineOutput
  onClose: () => void;
}

const OBJECTIVE_LABELS: Record<ObjectiveId, string> = {
  safety: 'Safety',
  greenery: 'Greenery',
  access: 'Access',
  culture: 'Culture',
  revenue: 'Revenue',
  community: 'Community',
};

const ROLE_NAMES: Record<RoleId, string> = {
  administrator: 'Admin',
  investor: 'Investor',
  designer: 'Designer',
  citizen: 'Citizen',
  advocate: 'Advocate',
};

const ALL_OBJECTIVES: ObjectiveId[] = ['safety', 'greenery', 'access', 'culture', 'revenue', 'community'];
const ALL_ROLES: RoleId[] = ['administrator', 'investor', 'designer', 'citizen', 'advocate'];

export function NashDashboard({ nashOutput, onClose }: NashDashboardProps) {
  if (!nashOutput) return null;

  const { utilities, sat_objectives, cws, nash_q1, nash_q3, dne_achieved, crisis_state, optimal_next_action, pareto_note } = nashOutput;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-stone-900 rounded-2xl border border-stone-600 shadow-2xl w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-700 sticky top-0 bg-stone-900/95 backdrop-blur-sm z-10">
          <div>
            <h2 className="text-xl font-bold text-amber-300">Nash Equilibrium Dashboard</h2>
            <p className="text-stone-500 text-xs">Round {nashOutput.round} — AI Backend Analysis (Part 6.2)</p>
          </div>
          {dne_achieved && (
            <div className="px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-300 text-sm font-bold animate-pulse">
              DNE ACHIEVED
            </div>
          )}
          <button className="px-3 py-1.5 rounded-lg bg-stone-700 text-stone-300 text-sm hover:bg-stone-600" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Row 1: Utility Bars + CWS */}
          <div className="grid grid-cols-2 gap-6">
            {/* Utility Bar Chart */}
            <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-700/50">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Individual Utilities (u_i)</h3>
              <div className="space-y-2">
                {ALL_ROLES.map(roleId => {
                  const u = utilities?.[roleId] ?? 0;
                  const t = SURVIVAL_THRESHOLDS[roleId];
                  const maxU = Object.values(OBJECTIVE_WEIGHTS[roleId]).reduce((s, v) => s + Math.max(0, v), 0);
                  const pct = Math.min(100, (u / maxU) * 100);
                  const threshPct = Math.min(100, (t / maxU) * 100);
                  const below = u < t;
                  return (
                    <div key={roleId} className="flex items-center gap-2">
                      <span className="text-xs font-semibold w-16 truncate" style={{ color: ROLE_COLORS[roleId] }}>
                        {ROLE_NAMES[roleId]}
                      </span>
                      <div className="flex-1 h-5 bg-stone-700 rounded-full relative overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: below ? '#EF4444' : ROLE_COLORS[roleId] }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5 }}
                        />
                        {/* Threshold line */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-white/60"
                          style={{ left: `${threshPct}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold w-8 text-right ${below ? 'text-red-400' : 'text-stone-200'}`}>
                        {u}
                      </span>
                      <span className="text-[10px] text-stone-500 w-10">T={t}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CWS Breakdown */}
            <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-700/50">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">CWS Breakdown</h3>
              <div className="text-center mb-4">
                <span className="text-4xl font-black text-amber-300">{cws?.total?.toFixed(1)}</span>
                <span className="text-stone-500 text-sm ml-2">/ 75 target</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-stone-300">
                  <span>Weighted Sum (Σw_i × u_i)</span>
                  <span className="font-mono">{cws?.weighted_sum?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-300">
                  <span>Equity Bonus (10×(1−var/100))</span>
                  <span className="font-mono">{cws?.equity_bonus?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-300">
                  <span>Collaboration Points</span>
                  <span className="font-mono">{cws?.cp_bonus}</span>
                </div>
                <div className="flex justify-between text-stone-200 font-bold border-t border-stone-600 pt-1 mt-1">
                  <span>Total CWS</span>
                  <span className="font-mono">{cws?.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Büchi Objective Grid */}
          <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-700/50">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
              Büchi Objective Satisfaction Grid
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-stone-500 text-left py-1 px-2">Role</th>
                    {ALL_OBJECTIVES.map(obj => (
                      <th key={obj} className={`py-1 px-2 text-center ${sat_objectives?.[obj] ? 'text-emerald-400' : 'text-red-400'}`}>
                        {OBJECTIVE_LABELS[obj]}
                        <div className={`text-[9px] ${sat_objectives?.[obj] ? 'text-emerald-600' : 'text-red-600'}`}>
                          {sat_objectives?.[obj] ? 'IN SAT' : 'OUT'}
                        </div>
                      </th>
                    ))}
                    <th className="text-stone-500 py-1 px-2 text-center">u_i</th>
                  </tr>
                </thead>
                <tbody>
                  {ALL_ROLES.map(roleId => {
                    const weights = OBJECTIVE_WEIGHTS[roleId];
                    const buchi = BUCHI_OBJECTIVES[roleId];
                    return (
                      <tr key={roleId} className="border-t border-stone-700/30">
                        <td className="py-1.5 px-2 font-semibold" style={{ color: ROLE_COLORS[roleId] }}>
                          {ROLE_NAMES[roleId]}
                        </td>
                        {ALL_OBJECTIVES.map(obj => {
                          const w = weights[obj];
                          const isBuchi = buchi.includes(obj);
                          const inSat = sat_objectives?.[obj];
                          const contributes = inSat && w !== 0;
                          return (
                            <td key={obj} className="py-1.5 px-2 text-center">
                              <div className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold ${
                                contributes
                                  ? w > 0 ? 'bg-emerald-900/40 text-emerald-300' : 'bg-red-900/40 text-red-300'
                                  : w === 0 ? 'bg-stone-800 text-stone-600' : 'bg-stone-700/50 text-stone-500'
                              }`}>
                                {w > 0 ? `+${w}` : w === 0 ? '0' : w}
                              </div>
                              {isBuchi && (
                                <div className={`text-[8px] mt-0.5 ${inSat ? 'text-blue-400' : 'text-orange-400'}`}>
                                  {inSat ? 'B✓' : 'B!'}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-1.5 px-2 text-center font-bold text-stone-200">
                          {utilities?.[roleId] ?? 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-stone-600 mt-2">B = Büchi objective (must be in sat every 2 rounds). B! = at risk of crisis state.</p>
          </div>

          {/* Row 3: Nash Check Panel + Recommendations */}
          <div className="grid grid-cols-3 gap-4">
            {/* Q1 */}
            <div className={`rounded-xl p-4 border ${nash_q1?.passed ? 'bg-emerald-900/20 border-emerald-700/50' : 'bg-red-900/20 border-red-700/50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xl ${nash_q1?.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                  {nash_q1?.passed ? '✓' : '✗'}
                </span>
                <span className="text-xs font-bold text-stone-300 uppercase">Q1: Utility Thresholds</span>
              </div>
              <p className="text-stone-400 text-xs">{nash_q1?.details}</p>
            </div>

            {/* Q2 */}
            <div className="rounded-xl p-4 border bg-indigo-900/20 border-indigo-700/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl text-indigo-400">?</span>
                <span className="text-xs font-bold text-stone-300 uppercase">Q2: No Profitable Deviation</span>
              </div>
              <p className="text-stone-400 text-xs">
                Ask Environment players: {nashOutput.nash_q2_ask?.map((r: RoleId) => ROLE_NAMES[r]).join(', ')}
              </p>
              <p className="text-stone-500 text-[10px] mt-1">S-fixed (Admin, Investor) are NOT asked — strategies institutionally fixed.</p>
            </div>

            {/* Q3 */}
            <div className={`rounded-xl p-4 border ${nash_q3?.passed ? 'bg-emerald-900/20 border-emerald-700/50' : 'bg-red-900/20 border-red-700/50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xl ${nash_q3?.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                  {nash_q3?.passed ? '✓' : '✗'}
                </span>
                <span className="text-xs font-bold text-stone-300 uppercase">Q3: Equity Band</span>
              </div>
              <p className="text-stone-400 text-xs">
                Variance: {nash_q3?.variance?.toFixed(2)} {nash_q3?.variance <= 4 ? '≤' : '>'} 4
                {' | '}CWS: {cws?.total?.toFixed(1)} {nash_q3?.cws_above_target ? '≥' : '<'} 75
              </p>
            </div>
          </div>

          {/* Row 4: Crisis State + Optimal Action */}
          <div className="grid grid-cols-2 gap-4">
            {/* Crisis State */}
            <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-700/50">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Crisis State (Büchi Violations)</h3>
              {crisis_state?.players_at_risk?.length > 0 ? (
                <div className="space-y-2">
                  {crisis_state.players_at_risk.map((v: any) => (
                    <div key={v.roleId} className="bg-red-900/20 rounded-lg p-2 border border-red-800/30">
                      <span className="text-red-400 text-xs font-bold">{ROLE_NAMES[v.roleId as RoleId]}</span>
                      <span className="text-stone-400 text-xs ml-2">
                        {v.violatedObjectives.join(', ')} unsatisfied for {v.roundsInViolation}+ rounds
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-emerald-400 text-xs">No players in crisis state.</p>
              )}
            </div>

            {/* Optimal Next Action */}
            <div className="bg-stone-800/50 rounded-xl p-4 border border-amber-700/30">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Optimal Next Action</h3>
              {optimal_next_action?.priority_challenge ? (
                <>
                  <p className="text-stone-200 text-sm">{optimal_next_action.reasoning}</p>
                  <p className="text-stone-400 text-xs mt-1">
                    Priority zone: <span className="text-amber-300">{optimal_next_action.priority_challenge}</span>
                  </p>
                  <p className="text-stone-400 text-xs">
                    Predicted CWS increase: <span className="text-emerald-300">+{optimal_next_action.predicted_cws_increase}</span>
                  </p>
                </>
              ) : (
                <p className="text-emerald-400 text-xs">All objectives satisfied. Maintain strategy.</p>
              )}
            </div>
          </div>

          {/* Pareto Note */}
          <div className="bg-stone-800/30 rounded-lg p-3 border border-stone-700/30">
            <p className="text-stone-500 text-xs italic">{pareto_note}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
