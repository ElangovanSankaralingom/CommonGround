import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameSession, Player, ChallengeCard, ResourceType } from '../../core/models/types';
import { ROLE_COLORS } from '../../core/models/constants';
import { determineGraduatedOutcome } from '../../core/engine/nashEngine';
import { type FeatureTile, calculateEffectiveness, calculatePoints, RESOURCE_ABILITY_MAP } from '../../core/content/featureTiles';
import { sounds } from '../../utils/sounds';

// ─── Types ────────────────────────────────────────────────────
interface TaskEntry {
  playerId: string; resourceType: ResourceType; tokens: number;
  points: number; passQuality: number; category: TaskCategory; chainBroke: boolean;
}
type TaskCategory = 'assess' | 'plan' | 'design' | 'build' | 'maintain';
type TransformationLevel = 'partial' | 'good' | 'full';
type Stage = 'intro' | 'building' | 'transformation' | 'summary' | 'continue';
const SEQ: TaskCategory[] = ['assess', 'plan', 'design', 'build', 'maintain'];
const ICONS: Record<TaskCategory, string> = { assess: '\u{1F50D}', plan: '\u{1F4CB}', design: '\u{1F3A8}', build: '\u{1F3D7}', maintain: '\u{1F527}' };
const RLBL: Record<ResourceType, string> = { budget: 'Budget', knowledge: 'Knowledge', volunteer: 'Volunteer', material: 'Material', influence: 'Influence' };
const RES_TYPES: ResourceType[] = ['budget', 'knowledge', 'volunteer', 'material', 'influence'];

interface SeriesResult {
  seriesValue: number; threshold: number;
  outcome: 'full_success' | 'partial_success' | 'narrow_success' | 'failure';
  tasks: { playerId: string; resourceType: string; tokens: number; points: number; passQuality: number }[];
  chainBonus: number; transformationLevel: TransformationLevel;
}
interface SeriesBuilderPhaseProps {
  session: GameSession; players: Player[]; challenge: ChallengeCard;
  visionBoard: { tiles: FeatureTile[]; threshold: number; objectivesCovered: string[] };
  onPhaseComplete: (result: SeriesResult) => void;
  onPlayCard: (cardId: string, targetZoneId?: string) => void;
  onPassTurn: () => void; onUseAbility: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────
const pmBonus = (n: number) => n >= 5 ? 18 : n >= 4 ? 12 : n >= 3 ? 7 : n >= 2 ? 3 : 0;
const stdBonus = (n: number) => n >= 4 ? 9 : n >= 3 ? 5 : n >= 2 ? 2 : 0;
const tfLevel = (m: number): TransformationLevel => m >= 16 ? 'full' : m >= 6 ? 'good' : 'partial';

function abilityFor(p: Player, res: ResourceType): number {
  return p.abilities[RESOURCE_ABILITY_MAP[res] as keyof typeof p.abilities] ?? 10;
}

function taskEfficiency(player: Player, res: ResourceType): number {
  const ranked = [...RES_TYPES].sort((a, b) => abilityFor(player, b) - abilityFor(player, a));
  const idx = ranked.indexOf(res);
  return idx === 0 ? 1 : idx === 1 ? 0.7 : 0.3;
}

function seqLogic(cat: TaskCategory, tasks: TaskEntry[]): number {
  if (!tasks.length) return cat === 'assess' ? 1 : 0;
  const diff = SEQ.indexOf(cat) - SEQ.indexOf(tasks[tasks.length - 1].category);
  return diff === 1 ? 1 : diff === 2 ? 0.5 : 0;
}

function buchiAware(cat: TaskCategory, tiles: FeatureTile[], covered: string[]): number {
  const t = tiles.find(t => t.taskCategory === cat);
  if (!t) return 0.3;
  return t.objectivesServed.some(o => !covered.includes(o)) ? 1 : 0.3;
}

function chainStats(tasks: TaskEntry[]) {
  let con = 0;
  for (let i = tasks.length - 1; i >= 0; i--) { if (tasks[i].chainBroke) break; con++; }
  let pm = 0;
  for (const t of tasks) {
    if (t.chainBroke) { pm = 0; continue; }
    if (t.category === SEQ[pm]) pm++; else pm = 0;
  }
  return { std: con, pm };
}

// ─── Component ────────────────────────────────────────────────
export default function SeriesBuilderPhase({
  session, players, challenge, visionBoard, onPhaseComplete, onPlayCard, onPassTurn, onUseAbility,
}: SeriesBuilderPhaseProps) {
  const [stage, setStage] = useState<Stage>('intro');
  const [tasks, setTasks] = useState<TaskEntry[]>([]);
  const [turnIdx, setTurnIdx] = useState(0);
  const [selCat, setSelCat] = useState<TaskCategory | null>(null);
  const [selRes, setSelRes] = useState<ResourceType | null>(null);
  const [selTok, setSelTok] = useState(1);
  const [locked, setLocked] = useState<Record<string, Partial<Record<ResourceType, number>>>>({});
  const [votes, setVotes] = useState<Record<string, boolean>>({});
  const [showVote, setShowVote] = useState(false);
  const [xformed, setXformed] = useState(false);

  const thr = visionBoard.threshold;
  const sorted = useMemo(() => [...players].sort((a, b) => a.utilityScore - b.utilityScore).slice(0, 5), [players]);
  const ap = sorted[turnIdx % sorted.length];
  const avail = useCallback((p: Player, r: ResourceType) => Math.max(0, p.resources[r] - (locked[p.id]?.[r] ?? 0)), [locked]);

  const total = useMemo(() => tasks.reduce((s, t) => s + t.points, 0), [tasks]);
  const { std: cStd, pm: cPm } = useMemo(() => chainStats(tasks), [tasks]);
  const cBonus = Math.max(pmBonus(cPm), stdBonus(cStd));
  const sv = total + cBonus;
  const pFrac = Math.min(sv / (thr * 1.5), 1);

  useEffect(() => { if (stage === 'intro') { const t = setTimeout(() => setStage('building'), 1500); return () => clearTimeout(t); } }, [stage]);
  useEffect(() => { if (stage === 'building' && sv >= thr && !xformed) { sounds.playTransformation(); setXformed(true); setShowVote(true); } }, [stage, sv, thr, xformed]);

  const commit = () => {
    if (!selCat || !selRes || !ap) return;
    const eff = calculateEffectiveness(abilityFor(ap, selRes));
    const pts = calculatePoints(selTok, eff);
    const pq = (taskEfficiency(ap, selRes) + seqLogic(selCat, tasks) + buchiAware(selCat, visionBoard.tiles, visionBoard.objectivesCovered)) / 3;
    sounds.playTokenLoss();
    sounds.playTokenGain();
    if (pq >= 0.5) sounds.playBallPass(); else sounds.playBallDrop();
    setTasks(p => [...p, { playerId: ap.id, resourceType: selRes, tokens: selTok, points: pts, passQuality: pq, category: selCat, chainBroke: pq < 0.5 }]);
    setLocked(p => ({ ...p, [ap.id]: { ...(p[ap.id] || {}), [selRes]: (p[ap.id]?.[selRes] ?? 0) + selTok } }));
    setSelCat(null); setSelRes(null); setSelTok(1); setTurnIdx(i => i + 1);
  };

  const castVote = (pid: string, end: boolean) => {
    const nv = { ...votes, [pid]: end }; setVotes(nv);
    const yes = Object.values(nv).filter(Boolean).length;
    if (yes >= Math.ceil(sorted.length * 3 / 5)) { if (cBonus > 0) sounds.playChainBonus(); setShowVote(false); setStage('transformation'); setTimeout(() => setStage('summary'), 3000); }
    else if (Object.keys(nv).length >= sorted.length) setShowVote(false);
  };

  const result = useCallback((): SeriesResult => {
    const o = determineGraduatedOutcome(sv, thr);
    const m = sv - thr;
    return { seriesValue: sv, threshold: thr, outcome: o.type, chainBonus: cBonus,
      tasks: tasks.map(t => ({ playerId: t.playerId, resourceType: t.resourceType, tokens: t.tokens, points: t.points, passQuality: t.passQuality })),
      transformationLevel: m > 0 ? tfLevel(m) : 'partial' };
  }, [sv, thr, tasks, cBonus]);

  // ── INTRO ───────────────────────────────────────────────────
  if (stage === 'intro') return (
    <motion.div className="flex flex-col items-center justify-center min-h-[400px] gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-3xl font-bold text-amber-400">Phase 4: Series Building</h2>
      <p className="text-lg text-gray-300">Commit resources, pass the ball, build the series!</p>
    </motion.div>
  );

  // ── BUILDING ────────────────────────────────────────────────
  if (stage === 'building') {
    const mx = selRes && ap ? avail(ap, selRes) : 0;
    return (
      <motion.div className="flex flex-col gap-4 p-4 max-w-5xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {/* Vision board */}
        <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-4 py-2 overflow-x-auto">
          <span className="text-xs text-gray-400 shrink-0">Vision:</span>
          {visionBoard.tiles.map(t => <span key={t.id} className="text-lg" title={t.name}>{t.icon}</span>)}
        </div>
        {/* Progress bar */}
        <div className="relative w-full h-6 bg-gray-700 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ backgroundColor: sv >= thr ? '#22C55E' : '#F59E0B' }}
            animate={{ width: `${pFrac * 100}%` }} transition={{ duration: 0.4 }} />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">{sv.toFixed(1)} pts</span>
        </div>
        {/* Task track */}
        <div className="flex gap-2 overflow-x-auto py-2">
          {tasks.map((t, i) => {
            const p = sorted.find(x => x.id === t.playerId);
            return (
              <motion.div key={i} className="shrink-0 w-28 bg-gray-800 border border-gray-600 rounded-lg p-2 text-center"
                initial={{ scale: 0 }} animate={{ scale: 1 }}>
                <div className="text-2xl">{ICONS[t.category]}</div>
                <div className="text-xs text-gray-300 truncate">{p?.name ?? '??'}</div>
                <div className="text-[10px] text-gray-500">{RLBL[t.resourceType]} x{t.tokens}</div>
                <div className="text-sm font-bold text-amber-300">{t.points.toFixed(1)} pts</div>
                <div className={`text-[10px] mt-0.5 ${t.chainBroke ? 'text-red-400' : 'text-green-400'}`}>
                  {t.chainBroke ? 'chain broke' : i > 0 ? 'smooth pass' : ''}
                </div>
              </motion.div>
            );
          })}
          <div className="shrink-0 w-28 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center text-gray-500 text-xs">Next</div>
        </div>
        {/* Active player ball */}
        <div className="flex items-center gap-2 text-sm">
          <motion.span className="text-xl" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.8 }}>{'\u26BD'}</motion.span>
          <span className="font-semibold" style={{ color: ROLE_COLORS[ap.roleId] }}>{ap.name}</span>
          <span className="text-gray-400">— your turn</span>
        </div>
        {/* Vote overlay */}
        <AnimatePresence>{showVote && (
          <motion.div className="bg-green-900/80 border border-green-500 rounded-lg p-3 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="text-green-200 font-semibold mb-2">Threshold crossed! Vote to End (3/{sorted.length} majority)</p>
            <div className="flex gap-2 justify-center flex-wrap">
              {sorted.map(p => <div key={p.id} className="flex gap-1 items-center">
                <span className="text-xs text-gray-300">{p.name}:</span>
                {votes[p.id] === undefined
                  ? <><button onClick={() => castVote(p.id, true)} className="text-xs px-2 py-0.5 bg-green-600 rounded text-white">End</button>
                      <button onClick={() => castVote(p.id, false)} className="text-xs px-2 py-0.5 bg-gray-600 rounded text-white">Keep</button></>
                  : <span className={`text-xs ${votes[p.id] ? 'text-green-400' : 'text-gray-400'}`}>{votes[p.id] ? 'End' : 'Keep'}</span>}
              </div>)}
            </div>
          </motion.div>
        )}</AnimatePresence>
        {/* Category + Resource selection */}
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {SEQ.map(c => <button key={c} onClick={() => { console.log('PHASE4: category clicked', c); setSelCat(c); }}
              className={`px-3 py-2 rounded text-sm font-semibold uppercase ${selCat === c ? 'bg-amber-600 text-white border-2 border-amber-400' : 'bg-gray-700 text-gray-300 border border-gray-600 hover:border-gray-400'}`}>
              {ICONS[c]} {c}</button>)}
          </div>
          {selCat && <motion.div className="bg-gray-800/80 rounded-lg p-3 space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-xs text-gray-400">Select resource &amp; tokens:</p>
            <div className="flex gap-2 flex-wrap">
              {RES_TYPES.map(r => { const a = avail(ap, r); const e = calculateEffectiveness(abilityFor(ap, r)); return (
                <button key={r} onClick={() => { console.log('PHASE4: resource clicked', r, 'available:', a); setSelRes(r); setSelTok(Math.min(1, a)); }} disabled={a === 0}
                  className={`px-3 py-2 rounded text-xs ${selRes === r ? 'bg-blue-600 text-white border-2 border-blue-400' : a > 0 ? 'bg-gray-700 text-gray-200 border border-gray-600 hover:border-gray-400' : 'bg-gray-900 text-gray-600 cursor-not-allowed'}`}>
                  <div className="font-semibold">{RLBL[r]}</div><div className="text-[10px]">{a} | {e}%</div>
                </button>); })}
            </div>
            {selRes && mx > 0 && <div className="flex items-center gap-3 mt-2">
              <label className="text-xs text-gray-400">Tokens:</label>
              <input type="range" min={1} max={mx} value={selTok} onChange={e => setSelTok(+e.target.value)} className="flex-1 accent-amber-500" />
              <span className="text-sm font-mono text-amber-300">{selTok}</span>
              <span className="text-xs text-gray-500">= {calculatePoints(selTok, calculateEffectiveness(abilityFor(ap, selRes))).toFixed(1)} pts</span>
            </div>}
          </motion.div>}
          <div className="flex gap-3">
            <button onClick={() => { console.log('PHASE4: commit clicked', selCat, selRes, selTok); commit(); }} disabled={!selCat || !selRes || selTok < 1}
              className="px-5 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">Commit &amp; Pass</button>
            {xformed && !showVote && <button onClick={() => { setStage('transformation'); setTimeout(() => setStage('summary'), 3000); }}
              className="px-5 py-2 rounded bg-green-600 hover:bg-green-500 text-white font-semibold">Finalize Series</button>}
          </div>
        </div>
        {/* Player portraits */}
        <div className="flex gap-3 overflow-x-auto pt-2 border-t border-gray-700">
          {sorted.map((p, i) => {
            const act = i === turnIdx % sorted.length;
            return (
              <div key={p.id} className={`shrink-0 rounded-lg p-2 text-center min-w-[100px] ${act ? 'bg-gray-700 ring-2' : 'bg-gray-800/50'}`}>
                <div className="text-xs font-bold truncate" style={{ color: ROLE_COLORS[p.roleId] }}>
                  {act && '\u26BD '}{p.name}</div>
                <div className="text-[10px] text-gray-400 capitalize">{p.roleId}</div>
                <div className="mt-1 space-y-0.5">
                  {RES_TYPES.map(r => { const tot = p.resources[r]; const lk = locked[p.id]?.[r] ?? 0; if (!tot && !lk) return null;
                    return <div key={r} className="flex items-center gap-1 text-[10px]">
                      <span className="w-12 text-left text-gray-400 truncate">{RLBL[r]}</span>
                      <span className="text-gray-200 w-4 text-right">{Math.max(0, tot - lk)}</span>
                      {lk > 0 && <span className="text-gray-600">({lk})</span>}
                      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${calculateEffectiveness(abilityFor(p, r))}%` }} /></div>
                    </div>; })}
                </div>
              </div>);
          })}
        </div>
      </motion.div>
    );
  }

  // ── TRANSFORMATION ──────────────────────────────────────────
  if (stage === 'transformation') {
    const m = sv - thr; const lv = m > 0 ? tfLevel(m) : 'partial';
    const fc = lv === 'full' ? visionBoard.tiles.length : lv === 'good' ? 3 : 1;
    return (
      <motion.div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.h2 className="text-3xl font-bold"
          style={{ color: lv === 'full' ? '#22C55E' : lv === 'good' ? '#F59E0B' : '#94A3B8' }}
          initial={{ scale: 0.7 }} animate={{ scale: 1 }}>
          {lv === 'full' ? 'FULL TRANSFORMATION' : lv === 'good' ? 'GOOD TRANSFORMATION' : 'PARTIAL TRANSFORMATION'}
        </motion.h2>
        <p className="text-gray-300 text-sm">
          {lv === 'full' ? 'All features resolve!' : lv === 'good' ? '3 features emerge.' : '1 feature partially resolves.'}
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          {visionBoard.tiles.slice(0, fc).map((tile, i) => (
            <motion.div key={tile.id} className="bg-gray-800 border border-green-500/50 rounded-lg p-4 text-center w-32"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.5 }}>
              <div className="text-3xl mb-1">{tile.icon}</div>
              <div className="text-xs text-green-300 font-semibold">{tile.name}</div>
            </motion.div>
          ))}
        </div>
        <motion.div className="w-64 h-1 bg-green-500/30 rounded-full overflow-hidden mt-4"
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 2 }}>
          <div className="h-full bg-green-500 rounded-full w-full" />
        </motion.div>
      </motion.div>
    );
  }

  // ── SUMMARY ─────────────────────────────────────────────────
  if (stage === 'summary') {
    const r = result(); const oc = r.outcome === 'failure' ? '#EF4444' : r.outcome === 'full_success' ? '#22C55E' : '#F59E0B';
    return (
      <motion.div className="flex flex-col items-center gap-4 p-6 max-w-2xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h3 className="text-xl font-bold text-white">Series Summary</h3>
        <div className="w-full bg-gray-800 rounded-lg p-4 space-y-2">
          {tasks.map((t, i) => { const p = sorted.find(x => x.id === t.playerId); return (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">{ICONS[t.category]}</span>
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: ROLE_COLORS[p?.roleId ?? 'citizen'] }} />
                <span className="text-gray-200">{p?.name ?? '??'}</span>
                <span className="text-xs text-gray-500 uppercase">{t.category}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{RLBL[t.resourceType]} x{t.tokens}</span>
                <span className="font-mono text-amber-300">{t.points.toFixed(1)}</span>
                <span className={`text-xs ${t.chainBroke ? 'text-red-400' : 'text-green-400'}`}>PQ:{t.passQuality.toFixed(2)}</span>
              </div>
            </div>); })}
        </div>
        <div className="w-full bg-gray-800 rounded-lg p-4 space-y-1 text-sm">
          <div className="flex justify-between text-gray-300"><span>Task Points</span><span className="font-mono">{total.toFixed(1)}</span></div>
          {cBonus > 0 && <div className="flex justify-between text-green-300">
            <span>Chain Bonus ({cPm >= 2 ? `PM x${cPm}` : `Std x${cStd}`})</span><span className="font-mono">+{cBonus}</span></div>}
          <div className="border-t border-gray-700 pt-1 mt-1 flex justify-between text-white font-semibold">
            <span>Series Value</span><span className="font-mono">{sv.toFixed(1)}</span></div>
          <div className="flex justify-between text-gray-400"><span>Threshold</span><span className="font-mono">{thr}</span></div>
          <div className="flex justify-between font-semibold mt-1" style={{ color: oc }}>
            <span>Outcome</span><span>{r.outcome.replace(/_/g, ' ').toUpperCase()}</span></div>
          {sv > thr && <div className="flex justify-between text-gray-400">
            <span>Transformation</span><span className="capitalize">{r.transformationLevel}</span></div>}
        </div>
        <button onClick={() => { sounds.playButtonClick(); setStage('continue'); }} className="mt-2 px-6 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold">Continue</button>
      </motion.div>
    );
  }

  // ── CONTINUE ────────────────────────────────────────────────
  if (stage === 'continue') return (
    <motion.div className="flex flex-col items-center justify-center min-h-[300px] gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <button onClick={() => { sounds.playButtonClick(); onPhaseComplete(result()); }}
        className="px-8 py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white text-lg font-bold">
        Continue to Phase 5: The Park Guardian {'\u2192'}</button>
    </motion.div>
  );

  return null;
}
