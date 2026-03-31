import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store';
import type { RoleId, Player, ResourceType, TelemetryEvent, GameSession } from '../../core/models/types';

const ROLE_NAMES: Record<RoleId, string> = { administrator: 'City Administrator', designer: 'Urban Designer', citizen: 'Community Organizer', investor: 'Private Investor', advocate: 'Environmental Advocate' };
const ROLE_IDS: RoleId[] = ['administrator', 'designer', 'citizen', 'investor', 'advocate'];
const ROLE_COLORS: Record<RoleId, string> = { administrator: '#C0392B', designer: '#2E86AB', citizen: '#27AE60', investor: '#E67E22', advocate: '#8E44AD' };
const BADGE_CONFIG = {
  full_success: { label: 'Gold', title: 'Shared Balance Achieved', subtitle: 'The park will thrive', color: '#F59E0B', bg: 'bg-amber-900/40 border-amber-500/50' },
  partial_success: { label: 'Silver', title: 'Partial Vision', subtitle: 'More work needed', color: '#94A3B8', bg: 'bg-slate-700/40 border-slate-400/50' },
  failure: { label: 'Bronze', title: 'The Season Ends', subtitle: 'Your progress carries forward', color: '#CD7F32', bg: 'bg-orange-900/40 border-orange-600/50' },
} as const;
const RED_BADGE = { label: 'Red', title: 'Some visions proved incompatible', subtitle: 'an important finding', color: '#EF4444', bg: 'bg-red-900/40 border-red-500/50' };
const RESOURCE_TYPES: ResourceType[] = ['budget', 'influence', 'volunteer', 'material', 'knowledge'];

function gini(values: number[]): number {
  const n = values.length; if (n === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((a, b) => a + b, 0); if (total === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += (2 * (i + 1) - n - 1) * sorted[i];
  return sum / (n * total);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section className="border-t border-stone-700/40 pt-8"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <h2 className="font-serif text-2xl text-amber-300 mb-5">{title}</h2>
      {children}
    </motion.section>
  );
}

interface DebriefScreenProps {
  onExportData: () => void;
  onNewGame: () => void;
  onDetailedStats: () => void;
}

export default function DebriefScreen({ onExportData, onNewGame, onDetailedStats }: DebriefScreenProps) {
  const { session } = useGameStore();
  if (!session || !session.endResult) return null;
  const result = session.endResult;
  const players = Object.values(session.players);
  const isRed = result.type === 'failure' && result.giniCoefficient > 0.5;
  const badge = isRed ? RED_BADGE : BADGE_CONFIG[result.type];
  return (
    <div className="w-full min-h-screen bg-stone-900 text-stone-100 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        <Section1 badge={badge} session={session} players={players} />
        <Section2 session={session} players={players} />
        <Section3 session={session} />
        <Section4 players={players} session={session} />
        <Section5 session={session} />
        <Section6 onNewGame={onNewGame} />
      </div>
    </div>
  );
}

/* SECTION 1 — Result Badge + SVS Trajectory */
function Section1({ badge, session, players }: {
  badge: typeof RED_BADGE;
  session: GameSession;
  players: Player[];
}) {
  const result = session.endResult!;
  const history = session.cwsTracker.history;

  const W = 560, H = 180, PAD = 32;
  const scores = history.map(h => h.score);
  const maxS = Math.max(...scores, result.targetCWS, 1);
  const pts = scores.map((s, i) => {
    const x = PAD + (i / Math.max(scores.length - 1, 1)) * (W - 2 * PAD);
    return `${x},${H - PAD - (s / maxS) * (H - 2 * PAD)}`;
  }).join(' ');
  const threshold = result.targetCWS / Math.max(players.length, 1);
  const maxUtil = Math.max(...result.playerResults.map(pr => pr.finalUtility), threshold, 1);

  return (
    <Section title="1 &mdash; Result">
      {/* Badge */}
      <motion.div
        className={`rounded-xl border p-6 mb-6 text-center ${badge.bg}`}
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}
      >
        <span className="text-5xl font-serif font-bold" style={{ color: badge.color }}>
          {badge.label}
        </span>
        <p className="text-stone-200 mt-2 text-lg">{badge.title}</p>
        <p className="text-stone-400 text-sm">{badge.subtitle}</p>
      </motion.div>

      <div className="bg-stone-800/50 rounded-xl p-5 border border-stone-700/20 mb-6">
        <h3 className="text-xs text-stone-400 uppercase tracking-wider mb-3">SVS Trajectory</h3>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
          {(() => { const ty = H - PAD - (result.targetCWS / maxS) * (H - 2 * PAD); return (
            <><line x1={PAD} x2={W - PAD} y1={ty} y2={ty} stroke="#F59E0B" strokeDasharray="6 4" strokeWidth={1} />
            <text x={W - PAD + 4} y={ty + 4} fill="#F59E0B" fontSize={10}>target</text></>
          ); })()}
          {scores.length > 1 && <polyline fill="none" stroke="#60A5FA" strokeWidth={2.5} points={pts} />}
          {scores.map((s, i) => {
            const x = PAD + (i / Math.max(scores.length - 1, 1)) * (W - 2 * PAD);
            return <circle key={i} cx={x} cy={H - PAD - (s / maxS) * (H - 2 * PAD)} r={3.5} fill="#93C5FD" />;
          })}
          <text x={PAD} y={H - 6} fill="#78716C" fontSize={10}>R1</text>
          <text x={W - PAD - 10} y={H - 6} fill="#78716C" fontSize={10}>R{scores.length}</text>
        </svg>
      </div>

      {/* Per-player utility vs threshold */}
      <div className="bg-stone-800/50 rounded-xl p-5 border border-stone-700/20">
        <h3 className="text-xs text-stone-400 uppercase tracking-wider mb-3">Final Utility vs Threshold</h3>
        <div className="space-y-2">
          {result.playerResults.map(pr => {
            const p = players.find(pl => pl.id === pr.playerId);
            const pct = (pr.finalUtility / maxUtil) * 100;
            const thPct = (threshold / maxUtil) * 100;
            return (
              <div key={pr.playerId} className="flex items-center gap-3">
                <span className="w-28 text-xs text-stone-300 truncate">{p?.name ?? pr.playerId}</span>
                <div className="flex-1 h-5 bg-stone-700 rounded relative overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: ROLE_COLORS[p?.roleId ?? 'citizen'] }} />
                  <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400" style={{ left: `${thPct}%` }} />
                </div>
                <span className="text-xs text-stone-400 w-10 text-right">{pr.finalUtility}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

/* SECTION 2 — 5 Planning Outputs */
function Section2({ session, players }: { session: GameSession; players: Player[] }) {
  const result = session.endResult!;

  const zonePriority = useMemo(() => {
    const first: Record<string, number> = {};
    for (const e of session.roundLog) {
      const z = e.details?.zoneId ?? e.details?.targetZoneId;
      if (z && !(z in first)) first[z] = e.round;
    }
    return Object.entries(first).sort((a, b) => a[1] - b[1])
      .map(([zid, r]) => ({ zone: session.board.zones[zid]?.name ?? zid, round: r }));
  }, [session]);

  const resourceTable = useMemo(() => {
    const t: Record<string, Record<ResourceType, number>> = {};
    for (const p of players) t[p.id] = { budget: 0, influence: 0, volunteer: 0, material: 0, knowledge: 0 };
    for (const ev of session.telemetry) {
      if (ev.eventType === 'card_played' && ev.data?.resourcesSpent) {
        for (const [rt, amt] of Object.entries(ev.data.resourcesSpent as Record<string, number>))
          if (t[ev.actorId]) t[ev.actorId][rt as ResourceType] += amt || 0;
      }
    }
    return t;
  }, [session, players]);

  const alliances = useMemo(() => session.activeCoalitions.map(c => ({
    members: c.participants.map(p => players.find(x => x.id === p.playerId)?.name ?? p.roleId),
    zone: session.board.zones[c.targetZoneId]?.name ?? c.targetZoneId, type: c.combinationType,
  })), [session, players]);

  const conflicts = useMemo(() => ({
    declined: session.tradeOffers.filter(t => t.status === 'rejected'),
    broken: session.promises.filter(p => p.broken),
  }), [session]);

  const equity = useMemo(() => {
    const s = players.map(p => { const a = p.abilities; return a.authority + a.resourcefulness + a.communityTrust + a.technicalKnowledge + a.politicalLeverage + a.adaptability; });
    const e = result.playerResults.map(pr => pr.finalUtility);
    const g0 = gini(s), g1 = gini(e);
    return { startGini: g0, endGini: g1, improvement: g0 > 0 ? ((g0 - g1) / g0) * 100 : 0 };
  }, [players, result]);

  const cardCls = 'bg-stone-800/50 rounded-xl p-5 border border-stone-700/20';

  return (
    <Section title="2 &mdash; Planning Outputs">
      <div className="space-y-4">
        {/* Card 1 */}
        <div className={cardCls}>
          <h3 className="text-sm font-bold text-amber-200 mb-2">Zone Priority Sequence</h3>
          {zonePriority.length === 0 ? (
            <p className="text-stone-500 text-sm">No zone actions recorded.</p>
          ) : (
            <ol className="list-decimal list-inside text-sm text-stone-300 space-y-1">
              {zonePriority.slice(0, 8).map((z, i) => (
                <li key={i}>
                  <span className="text-stone-200">{z.zone}</span>
                  <span className="text-stone-500 ml-2">(Round {z.round})</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Card 2 */}
        <div className={cardCls}>
          <h3 className="text-sm font-bold text-amber-200 mb-2">Resource Allocation Model</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-stone-300">
              <thead>
                <tr className="text-stone-500">
                  <th className="text-left pr-3 pb-1">Player</th>
                  {RESOURCE_TYPES.map(rt => <th key={rt} className="text-right px-2 pb-1 capitalize">{rt}</th>)}
                </tr>
              </thead>
              <tbody>
                {players.map(p => (
                  <tr key={p.id} className="border-t border-stone-700/30">
                    <td className="pr-3 py-1">{p.name}</td>
                    {RESOURCE_TYPES.map(rt => (
                      <td key={rt} className="text-right px-2 py-1">{resourceTable[p.id]?.[rt] ?? 0}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 3 */}
        <div className={cardCls}>
          <h3 className="text-sm font-bold text-amber-200 mb-2">Alliance Map</h3>
          {alliances.length === 0 ? (
            <p className="text-stone-500 text-sm">No coalitions formed.</p>
          ) : (
            <ul className="text-sm text-stone-300 space-y-1">
              {alliances.map((a, i) => (
                <li key={i}>
                  <span className="text-amber-300">{a.type}</span>{' '}
                  {a.members.join(', ')} &rarr; {a.zone}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Card 4 */}
        <div className={cardCls}>
          <h3 className="text-sm font-bold text-amber-200 mb-2">Conflict Resolution Record</h3>
          <p className="text-sm text-stone-300">
            Trades declined: <span className="text-amber-300">{conflicts.declined.length}</span>
          </p>
          <p className="text-sm text-stone-300">
            Promises broken: <span className="text-amber-300">{conflicts.broken.length}</span>
          </p>
          {conflicts.broken.map((pr, i) => {
            const from = players.find(p => p.id === pr.fromPlayerId)?.name ?? pr.fromPlayerId;
            const to = players.find(p => p.id === pr.toPlayerId)?.name ?? pr.toPlayerId;
            return (
              <p key={i} className="text-xs text-stone-500 mt-1">
                {from} broke promise to {to} (Round {pr.promisedRound})
              </p>
            );
          })}
        </div>

        {/* Card 5 */}
        <div className={cardCls}>
          <h3 className="text-sm font-bold text-amber-200 mb-2">Equity Assessment</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-stone-500 text-xs">Starting Gini</p>
              <p className="text-lg font-bold text-stone-200">{(equity.startGini * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-stone-500 text-xs">Ending Gini</p>
              <p className="text-lg font-bold text-stone-200">{(equity.endGini * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-stone-500 text-xs">Improvement</p>
              <p className={`text-lg font-bold ${equity.improvement >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {equity.improvement >= 0 ? '+' : ''}{equity.improvement.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* SECTION 3 — Data Export */
function Section3({ session }: { session: GameSession }) {
  const slug = session.id.slice(0, 8);
  const handleExportJSON = useCallback(() => {
    downloadBlob(new Blob([JSON.stringify({ session, telemetry: session.telemetry }, null, 2)], { type: 'application/json' }), `commonground-${slug}.json`);
  }, [session, slug]);
  const handleExportCSV = useCallback(() => {
    const hdr = 'Round,Phase,Player,Role,Action,Utility,SVS,Details';
    const rows = session.telemetry.map((ev: TelemetryEvent) => {
      const p = session.players[ev.actorId]; const svs = session.cwsTracker.history.find(h => h.round === ev.round)?.score ?? '';
      return [ev.round, ev.phase, p?.name ?? ev.actorId, ev.actorRole, ev.eventType, p?.utilityScore ?? '', svs, `"${JSON.stringify(ev.data).replace(/"/g, '""')}"`].join(',');
    });
    downloadBlob(new Blob([[hdr, ...rows].join('\n')], { type: 'text/csv' }), `commonground-${slug}.csv`);
  }, [session, slug]);

  return (
    <Section title="3 &mdash; Data Export">
      <div className="flex gap-4">
        <motion.button
          className="flex-1 py-3 rounded-xl font-bold text-sm bg-amber-400 text-stone-900 hover:bg-amber-300 transition-colors"
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={handleExportJSON}
        >
          Export JSON
        </motion.button>
        <motion.button
          className="flex-1 py-3 rounded-xl font-bold text-sm bg-stone-700 text-stone-200 hover:bg-stone-600 transition-colors border border-stone-600"
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={handleExportCSV}
        >
          Export CSV
        </motion.button>
      </div>
    </Section>
  );
}

/* SECTION 4 — Post-Game Survey */
function Section4({ players, session }: { players: Player[]; session: GameSession }) {
  type SurveyData = { ranking: RoleId[]; likert: { fairness: number; satisfaction: number; applicability: number }; openText: string; submitted: boolean };
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);
  const [surveys, setSurveys] = useState<Record<string, SurveyData>>(() => {
    const init: Record<string, SurveyData> = {};
    for (const p of players) init[p.id] = { ranking: [], likert: { fairness: 4, satisfaction: 4, applicability: 4 }, openText: '', submitted: false };
    return init;
  });

  const activePlayer = players[activePlayerIdx];
  if (!activePlayer) return null;
  const survey = surveys[activePlayer.id];

  const toggleRank = (role: RoleId) => {
    setSurveys(prev => {
      const s = { ...prev[activePlayer.id] };
      const idx = s.ranking.indexOf(role);
      if (idx >= 0) {
        s.ranking = s.ranking.filter(r => r !== role);
      } else if (s.ranking.length < 5) {
        s.ranking = [...s.ranking, role];
      }
      return { ...prev, [activePlayer.id]: s };
    });
  };

  const setLikert = (key: 'fairness' | 'satisfaction' | 'applicability', val: number) => {
    setSurveys(prev => {
      const s = { ...prev[activePlayer.id] };
      s.likert = { ...s.likert, [key]: val };
      return { ...prev, [activePlayer.id]: s };
    });
  };

  const submitSurvey = () => {
    setSurveys(prev => ({ ...prev, [activePlayer.id]: { ...prev[activePlayer.id], submitted: true } }));
    const s = surveys[activePlayer.id];
    session.telemetry.push({ id: `survey-${activePlayer.id}`, timestamp: new Date().toISOString(), sessionId: session.id, round: session.totalRounds, phase: 'debrief', eventType: 'vote_result', actorId: activePlayer.id, actorRole: activePlayer.roleId, data: { type: 'post_game_survey', ranking: s.ranking, likert: s.likert, openText: s.openText } });
    if (activePlayerIdx < players.length - 1) setActivePlayerIdx(activePlayerIdx + 1);
  };
  const likertQs = [{ key: 'fairness' as const, label: 'How fair was the outcome?' }, { key: 'satisfaction' as const, label: 'How satisfied are you?' }, { key: 'applicability' as const, label: 'Would you apply these decisions to the real park?' }];

  return (
    <Section title="4 &mdash; Post-Game Survey">
      {/* Player tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {players.map((p, i) => (
          <button
            key={p.id}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              i === activePlayerIdx ? 'bg-amber-400 text-stone-900' : 'bg-stone-700 text-stone-300'
            } ${surveys[p.id]?.submitted ? 'opacity-60' : ''}`}
            onClick={() => setActivePlayerIdx(i)}
          >
            {p.name} {surveys[p.id]?.submitted ? '(done)' : ''}
          </button>
        ))}
      </div>

      {survey.submitted ? (
        <p className="text-stone-400 text-sm">Survey submitted for {activePlayer.name}.</p>
      ) : (
        <div className="bg-stone-800/50 rounded-xl p-5 border border-stone-700/20 space-y-5">
          {/* Power ranking */}
          <div>
            <p className="text-sm text-stone-300 mb-2">
              Power Ranking (click roles in order, 1 = most powerful):
            </p>
            <div className="flex gap-2 flex-wrap">
              {ROLE_IDS.map(role => {
                const idx = survey.ranking.indexOf(role);
                return (
                  <button
                    key={role}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                      idx >= 0
                        ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                        : 'border-stone-600 bg-stone-700 text-stone-300'
                    }`}
                    onClick={() => toggleRank(role)}
                  >
                    {idx >= 0 ? `#${idx + 1} ` : ''}{ROLE_NAMES[role]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Likert scales */}
          {likertQs.map(q => (
            <div key={q.key}>
              <p className="text-sm text-stone-300 mb-1">{q.label}</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map(v => (
                  <button
                    key={v}
                    className={`w-9 h-9 rounded-lg text-xs font-bold transition-colors ${
                      survey.likert[q.key] === v
                        ? 'bg-amber-400 text-stone-900'
                        : 'bg-stone-700 text-stone-400 hover:bg-stone-600'
                    }`}
                    onClick={() => setLikert(q.key, v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Open text */}
          <div>
            <p className="text-sm text-stone-300 mb-1">What surprised you about the power dynamics?</p>
            <textarea
              className="w-full h-20 rounded-lg bg-stone-700 border border-stone-600 text-stone-200 text-sm p-3 resize-none focus:outline-none focus:border-amber-400"
              value={survey.openText}
              onChange={e => setSurveys(prev => ({
                ...prev,
                [activePlayer.id]: { ...prev[activePlayer.id], openText: e.target.value },
              }))}
            />
          </div>

          <motion.button
            className="px-6 py-2 rounded-xl font-bold text-sm bg-amber-400 text-stone-900 hover:bg-amber-300 transition-colors"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={submitSurvey}
          >
            Submit Survey
          </motion.button>
        </div>
      )}
    </Section>
  );
}

/* SECTION 5 — Reward Tokens */
function Section5({ session }: { session: GameSession }) {
  const result = session.endResult!;

  const totalCP = result.playerResults.reduce((s, pr) => s + pr.totalCP, 0);
  const bonusActions = session.telemetry.filter(
    ev => ev.eventType === 'unique_ability_used' || ev.eventType === 'full_coalition_resolved'
  ).length;
  const totalTokens = Math.floor(totalCP / 2) + bonusActions;

  type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  let tier: Tier = 'Bronze';
  if (totalTokens >= 50) tier = 'Platinum';
  else if (totalTokens >= 30) tier = 'Gold';
  else if (totalTokens >= 15) tier = 'Silver';

  const tierRewards: Record<Tier, string> = {
    Bronze: '1 Library day pass, 1 metro/bus ride credit',
    Silver: '3-day library pass, 5 transport credits, park event priority',
    Gold: 'Monthly library membership, 15 transport credits, stakeholder meeting invite',
    Platinum: 'Annual library, monthly transit pass, park advisory committee seat',
  };

  const tierColors: Record<Tier, string> = {
    Bronze: '#CD7F32', Silver: '#94A3B8', Gold: '#F59E0B', Platinum: '#A78BFA',
  };

  const code = 'CG-' + session.id.slice(0, 8).toUpperCase() + '-' + tier.toUpperCase();

  return (
    <Section title="5 &mdash; Reward Tokens">
      <div className="bg-stone-800/50 rounded-xl p-6 border border-stone-700/20 text-center">
        <p className="text-stone-400 text-sm mb-1">Total Tokens Earned</p>
        <p className="text-5xl font-bold mb-2" style={{ color: tierColors[tier] }}>{totalTokens}</p>
        <span
          className="inline-block px-4 py-1 rounded-full text-sm font-bold mb-4"
          style={{ backgroundColor: tierColors[tier] + '30', color: tierColors[tier], border: `1px solid ${tierColors[tier]}60` }}
        >
          {tier} Tier
        </span>
        <p className="text-stone-300 text-sm mb-4">{tierRewards[tier]}</p>
        <div className="bg-stone-700/50 rounded-lg px-4 py-2 inline-block">
          <p className="text-xs text-stone-500 mb-1">Reward Code</p>
          <p className="font-mono text-amber-300 text-lg tracking-wider">{code}</p>
        </div>
      </div>
    </Section>
  );
}

/* SECTION 6 — Next Steps */
function Section6({ onNewGame }: { onNewGame: () => void }) {
  return (
    <Section title="6 &mdash; Next Steps &amp; Research Hypotheses">
      <div className="bg-stone-800/50 rounded-xl p-5 border border-stone-700/20 space-y-3 text-sm text-stone-300">
        <p>Your session data will contribute to five statistical tests:</p>
        <ul className="list-disc list-inside space-y-1 text-stone-400">
          <li><span className="text-stone-200">H1 Gini:</span> Did inequality decrease from character creation to endgame?</li>
          <li><span className="text-stone-200">H2 CP-SVS Correlation:</span> Does higher collaboration predict better shared vision?</li>
          <li><span className="text-stone-200">H3 Variance:</span> Did utility variance shrink across rounds?</li>
          <li><span className="text-stone-200">H4 Rankings Shift:</span> Did perceived power rankings change pre- vs post-game?</li>
          <li><span className="text-stone-200">H5 Trade Patterns:</span> Are resource trades equitable or exploitative?</li>
        </ul>
        <p className="text-stone-500 text-xs">
          Aggregated, anonymized data is used for urban-planning research. No personal information is stored.
        </p>
      </div>

      <div className="flex justify-center pt-6 pb-8">
        <motion.button
          className="px-10 py-3 rounded-xl font-bold text-sm bg-amber-400 text-stone-900 hover:bg-amber-300 transition-colors shadow-lg"
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={onNewGame}
        >
          Return to Title Screen
        </motion.button>
      </div>
    </Section>
  );
}
