import React from 'react';
import { motion } from 'framer-motion';
import type { GameSession, RoleId, ChallengeCard } from '../../core/models/types';
import { WELFARE_WEIGHTS, SURVIVAL_THRESHOLDS, ROLE_COLORS } from '../../core/models/constants';

interface FacilitatorDashboardProps {
  session: GameSession;
  onClose: () => void;
}

const ROLE_NAMES: Record<RoleId, string> = {
  administrator: 'Admin', investor: 'Investor', designer: 'Designer', citizen: 'Citizen', advocate: 'Advocate',
};

export function FacilitatorDashboard({ session, onClose }: FacilitatorDashboardProps) {
  const players = Object.values(session.players);

  // Build round-by-round challenge log from game log
  const challengeLog: Record<number, { name: string; zone: string; resolved: boolean }[]> = {};
  // Use CWS history for per-round data
  const cwsHistory = session.cwsTracker.history;

  // Trade log from trade offers
  const completedTrades = session.tradeOffers.filter(t => t.status === 'completed' || t.status === 'accepted');

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-stone-900 rounded-2xl border border-stone-600 shadow-2xl w-[90vw] max-w-4xl max-h-[85vh] overflow-y-auto"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-700 sticky top-0 bg-stone-900/95 backdrop-blur-sm z-10">
          <div>
            <h2 className="text-xl font-bold text-amber-300">Facilitator Dashboard</h2>
            <p className="text-stone-500 text-xs">Research Data Capture Interface</p>
          </div>
          <button className="px-3 py-1.5 rounded-lg bg-stone-700 text-stone-300 text-sm hover:bg-stone-600" onClick={onClose}>Close</button>
        </div>

        <div className="p-6 space-y-6">
          {/* CWS Trajectory */}
          <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-700/50">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">SVS Trajectory</h3>
            <div className="flex items-end gap-2 h-24">
              {cwsHistory.map((h, i) => {
                const maxCws = Math.max(...cwsHistory.map(x => x.score), 75);
                const pct = Math.max(5, (h.score / maxCws) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-amber-300 font-bold">{h.score}</span>
                    <div className="w-full rounded-t" style={{ height: `${pct}%`, backgroundColor: h.score >= 75 ? '#22C55E' : '#F59E0B' }} />
                    <span className="text-[10px] text-stone-500">R{h.round}</span>
                  </div>
                );
              })}
              {cwsHistory.length === 0 && <span className="text-stone-500 text-xs">No data yet</span>}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-px bg-stone-600" />
              <span className="text-[10px] text-stone-500">Target: 75</span>
              <div className="flex-1 h-px bg-stone-600" />
            </div>
          </div>

          {/* Per-Player Utilities Per Round */}
          <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-700/50">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Player Utility Scores</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-stone-500">
                    <th className="text-left py-1 px-2">Role</th>
                    <th className="py-1 px-2">w_i</th>
                    <th className="py-1 px-2">T_i</th>
                    <th className="py-1 px-2">Current u_i</th>
                    <th className="py-1 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map(p => (
                    <tr key={p.id} className="border-t border-stone-700/30">
                      <td className="py-1.5 px-2 font-semibold" style={{ color: ROLE_COLORS[p.roleId] }}>{ROLE_NAMES[p.roleId]}</td>
                      <td className="py-1.5 px-2 text-center text-stone-400">{WELFARE_WEIGHTS[p.roleId]}x</td>
                      <td className="py-1.5 px-2 text-center text-stone-400">{SURVIVAL_THRESHOLDS[p.roleId]}</td>
                      <td className="py-1.5 px-2 text-center font-bold text-stone-200">{p.utilityScore}</td>
                      <td className="py-1.5 px-2 text-center">
                        <span className={p.utilityScore >= SURVIVAL_THRESHOLDS[p.roleId] ? 'text-emerald-400' : 'text-red-400'}>
                          {p.utilityScore >= SURVIVAL_THRESHOLDS[p.roleId] ? '\u2713' : '\u2717'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Challenges */}
          <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-700/50">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Active Challenges</h3>
            {session.activeChallenge && session.activeChallenge.length > 0 ? (
              <div className="space-y-2">
                {session.activeChallenge.map(ch => (
                  <div key={ch.id} className="bg-stone-700/50 rounded-lg p-3 border border-stone-600/30">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-200 text-sm font-semibold">{ch.name}</span>
                      <span className="text-xs text-stone-500">Difficulty: {ch.difficulty}</span>
                    </div>
                    <p className="text-stone-400 text-xs mt-1">{ch.affectedZoneIds.join(', ')}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-stone-500 text-xs">No active challenges</p>
            )}
          </div>

          {/* Trade/Payment Log */}
          <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-700/50">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Negotiated Exchange Log p(i,j)</h3>
            {completedTrades.length > 0 ? (
              <div className="space-y-1.5">
                {completedTrades.map(t => {
                  const from = session.players[t.proposerId];
                  const to = session.players[t.targetId];
                  return (
                    <div key={t.id} className="text-xs bg-stone-700/30 rounded px-3 py-2 font-mono">
                      p({from?.roleId || '?'} {'\u2192'} {to?.roleId || '?'}, {JSON.stringify(t.offering)})
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-stone-500 text-xs">No trades completed yet</p>
            )}
          </div>

          {/* Promise Tracking */}
          {session.promises.length > 0 && (
            <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-700/50">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Promise Tracking</h3>
              <div className="space-y-1.5">
                {session.promises.map(pr => {
                  const from = session.players[pr.fromPlayerId];
                  const to = session.players[pr.toPlayerId];
                  return (
                    <div key={pr.id} className={`text-xs rounded px-3 py-2 ${pr.broken ? 'bg-red-900/20 text-red-400' : pr.fulfilled ? 'bg-emerald-900/20 text-emerald-400' : 'bg-stone-700/30 text-stone-400'}`}>
                      {from?.roleId} promised {to?.roleId}: {pr.promisedResource.amount} {pr.promisedResource.type} by R{pr.promisedRound}
                      {pr.broken && ' [BROKEN]'}
                      {pr.fulfilled && ' [FULFILLED]'}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nash Engine Output */}
          {session.nashEngineOutput && (
            <div className="bg-stone-800/50 rounded-xl p-4 border border-amber-700/30">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">Nash Check (Latest)</h3>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className={`rounded-lg p-2 ${session.nashEngineOutput.nash_q1.passed ? 'bg-emerald-900/20' : 'bg-red-900/20'}`}>
                  <span className="font-bold">Q1</span>: {session.nashEngineOutput.nash_q1.passed ? 'PASS' : 'FAIL'}
                </div>
                <div className="rounded-lg p-2 bg-indigo-900/20">
                  <span className="font-bold">Q2</span>: Ask {session.nashEngineOutput.nash_q2_ask?.join(', ')}
                </div>
                <div className={`rounded-lg p-2 ${session.nashEngineOutput.nash_q3.passed ? 'bg-emerald-900/20' : 'bg-red-900/20'}`}>
                  <span className="font-bold">Q3</span>: var={session.nashEngineOutput.nash_q3.variance?.toFixed(1)} SVS={session.nashEngineOutput.cws?.total?.toFixed(1)}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
