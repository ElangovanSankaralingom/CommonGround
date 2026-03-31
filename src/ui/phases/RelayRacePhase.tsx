import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { GameSession, Player, ActionCard, ChallengeCard } from '../../core/models/types';
import { getAbilityModifier } from '../../core/models/types';
import { ROLE_COLORS } from '../../core/models/constants';
import { determineGraduatedOutcome } from '../../core/engine/nashEngine';

interface ResolutionResult {
  seriesValue: number; threshold: number;
  outcome: 'full_success' | 'partial_success' | 'narrow_success' | 'failure';
  chainBonus: number; synergyBonus: number; teamPlayBonus: boolean;
  zoneChange: number; contributions: Record<string, number>;
}
interface RelayRacePhaseProps {
  session: GameSession; players: Player[]; challenge: ChallengeCard;
  onPhaseComplete: (result: ResolutionResult) => void;
  onPlayCard: (cardId: string, targetZoneId?: string) => void;
  onPassTurn: () => void; onUseAbility: () => void;
}
type Stage = 'intro' | 'setup' | 'turns' | 'finish' | 'trigger' | 'summary' | 'continue';
interface PlayedEntry {
  card: ActionCard | null; playerId: string; value: number;
  type: 'card' | 'resource' | 'ability' | 'pass'; tags: string[];
}

const POS = ['THE VOICE', 'THE SCOUT', 'THE BRIDGE', 'THE BUILDER', 'THE ANCHOR'];
const PM_SEQ = ['assessment', 'planning', 'design', 'construction', 'maintenance'];
const cBonus = (n: number) => n >= 4 ? 9 : n === 3 ? 5 : n === 2 ? 2 : 0;
const pmBonus = (n: number) => n >= 4 ? 12 : n === 3 ? 7 : n === 2 ? 3 : 0;

function chainLen(entries: PlayedEntry[]) {
  let std = 0;
  for (let i = entries.length - 1; i > 0; i--) {
    const [c, p] = [entries[i].tags, entries[i - 1].tags];
    if (!c.length || !p.length || !c.some(t => p.includes(t))) break;
    std++;
  }
  let pm = 0;
  if (entries.length >= 2) {
    for (let i = 0; i < entries.length && i < PM_SEQ.length; i++) {
      if (entries[i].tags.includes(PM_SEQ[i])) pm++; else break;
    }
    if (pm < 2) pm = 0;
  }
  return { standard: std + 1, placemaking: pm };
}

function RunnerSVG({ color, wings }: { color: string; wings?: boolean }) {
  return (<g>
    <circle cx="0" cy="-20" r="6" fill={color} />
    <rect x="-4" y="-14" width="8" height="16" rx="2" fill={color} />
    <line x1="-3" y1="2" x2="-6" y2="14" stroke={color} strokeWidth="2" />
    <line x1="3" y1="2" x2="6" y2="14" stroke={color} strokeWidth="2" />
    {wings && <><path d="M-4-10L-16-18L-6-6" fill={color} opacity={0.5}/><path d="M4-10L16-18L6-6" fill={color} opacity={0.5}/></>}
  </g>);
}

export default function RelayRacePhase({ session, players, challenge, onPhaseComplete, onPlayCard, onPassTurn, onUseAbility }: RelayRacePhaseProps) {
  const [stage, setStage] = useState<Stage>('intro');
  const [turnIdx, setTurnIdx] = useState(0);
  const [entries, setEntries] = useState<PlayedEntry[]>([]);
  const [selCard, setSelCard] = useState<string | null>(null);
  const [runnerX, setRunnerX] = useState<number | null>(null);
  const [anim, setAnim] = useState(false);
  const [actText, setActText] = useState('');
  const [glow, setGlow] = useState(false);
  const [trigDone, setTrigDone] = useState(false);
  const [svAdj, setSvAdj] = useState(0);

  const thr = challenge.difficulty;
  const zName = challenge.publicFace?.zoneName ?? challenge.affectedZoneIds[0] ?? 'Zone';
  const zId = challenge.publicFace?.zoneId ?? challenge.affectedZoneIds[0] ?? '';
  const zone = session.board.zones[zId];
  const trigger = zone?.revealedTrigger ?? null;
  const sorted = useMemo(() => [...players].sort((a, b) => a.utilityScore - b.utilityScore).slice(0, 5), [players]);

  const SW = 120, TX = 80, TE = TX + SW * 5;
  const sx = (i: number) => TX + i * SW;
  const ex = (i: number) => TX + (i + 1) * SW;

  const computeResult = useCallback((): ResolutionResult => {
    const base = entries.reduce((s, e) => s + e.value, 0);
    const { standard, placemaking } = chainLen(entries);
    const cb = Math.max(cBonus(standard), pmBonus(placemaking));
    const team = entries.length === sorted.length && entries.every(e => e.type !== 'pass');
    const syn = entries.some(e => e.type === 'ability') ? 2 : 0;
    const sv = base + cb + (team ? 3 : 0) + syn + svAdj;
    const out = determineGraduatedOutcome(sv, thr);
    const c: Record<string, number> = {};
    entries.forEach(e => { c[e.playerId] = (c[e.playerId] ?? 0) + e.value; });
    return { seriesValue: sv, threshold: thr, outcome: out.type, chainBonus: cb, synergyBonus: syn, teamPlayBonus: team, zoneChange: out.zoneChange, contributions: c };
  }, [entries, sorted, thr, svAdj]);

  // Stage auto-transitions
  useEffect(() => {
    if (stage === 'intro') { const t = setTimeout(() => setStage('setup'), 1500); return () => clearTimeout(t); }
    if (stage === 'setup') { const t = setTimeout(() => setStage('turns'), 2000); return () => clearTimeout(t); }
  }, [stage]);
  useEffect(() => {
    if (stage === 'turns' && turnIdx >= sorted.length && !anim) {
      const t = setTimeout(() => setStage('finish'), 500); return () => clearTimeout(t);
    }
  }, [stage, turnIdx, sorted.length, anim]);
  useEffect(() => {
    if (stage === 'finish') {
      const t = setTimeout(() => setStage(trigger && !trigDone ? 'trigger' : 'summary'), 2500);
      return () => clearTimeout(t);
    }
  }, [stage, trigger, trigDone]);
  useEffect(() => {
    if (stage === 'trigger') {
      if (trigger?.type === 'trap') setSvAdj(a => a - 3);
      setTrigDone(true);
      const t = setTimeout(() => setStage('summary'), 3000); return () => clearTimeout(t);
    }
  }, [stage, trigger]);

  const cp = sorted[turnIdx];
  const rc = cp ? ROLE_COLORS[cp.roleId] : '#888';
  const bVal = entries.reduce((s, e) => s + e.value, 0);
  const bX = entries.length < sorted.length ? ex(Math.max(0, entries.length - 1)) : TE;
  const result = ['summary', 'continue', 'finish'].includes(stage) ? computeResult() : null;

  const runAnim = (val: number, cb: () => void) => {
    setAnim(true);
    const s = sx(turnIdx), e = ex(turnIdx), spd = val > 5 ? 500 : val >= 3 ? 1000 : 1500;
    const steps = 20, dx = (e - s) / steps;
    let step = 0;
    setRunnerX(s);
    const iv = setInterval(() => {
      step++; setRunnerX(s + dx * step);
      if (step >= steps) { clearInterval(iv); setRunnerX(null); setAnim(false); cb(); }
    }, spd / steps);
  };

  const advance = () => { setActText(''); setSelCard(null); setTurnIdx(i => i + 1); };

  const playCard = () => {
    if (!selCard || !cp || anim) return;
    const card = cp.hand.find(c => c.id === selCard);
    if (!card) return;
    const mod = card.abilityCheck ? getAbilityModifier(cp.abilities[card.abilityCheck.ability]) : 0;
    const val = card.baseValue + mod;
    onPlayCard(card.id, zId);
    const entry: PlayedEntry = { card, playerId: cp.id, value: val, type: 'card', tags: card.tags };
    runAnim(val, () => {
      const ne = [...entries, entry];
      setEntries(ne);
      if (ne.length >= 2) {
        const { standard, placemaking } = chainLen(ne);
        if (standard >= 2 || placemaking >= 2) { setGlow(true); if (placemaking >= 5) setActText('PERFECT RELAY!'); setTimeout(() => setGlow(false), 1200); }
      }
      setActText(`+${val}`);
      setTimeout(advance, 1000);
    });
  };

  const contribute = () => {
    if (!cp || anim) return;
    const val = Math.min(Object.values(cp.resources).reduce((s, v) => s + v, 0), 3);
    if (val <= 0) return;
    setAnim(true); setActText('PATH PAVED!');
    setTimeout(() => { setEntries(p => [...p, { card: null, playerId: cp.id, value: val, type: 'resource', tags: [] }]); setAnim(false); setTimeout(advance, 800); }, 800);
  };

  const ability = () => {
    if (!cp || anim) return;
    onUseAbility(); setAnim(true); setActText('SPECIAL MOVE!');
    setTimeout(() => { setEntries(p => [...p, { card: null, playerId: cp.id, value: 3, type: 'ability', tags: [] }]); setAnim(false); setTimeout(advance, 800); }, 400);
  };

  const pass = () => {
    if (!cp || anim) return;
    onPassTurn();
    setEntries(p => [...p, { card: null, playerId: cp.id, value: 0, type: 'pass', tags: [] }]);
    setActText('TIMEOUT'); setTimeout(advance, 1000);
  };

  /* ── SVG Track ─────────────────────────────────────────── */
  const track = (
    <svg viewBox="0 0 800 250" className="w-full max-w-4xl mx-auto">
      <defs><radialGradient id="bg"><stop offset="0%" stopColor="#FCD34D"/><stop offset="100%" stopColor="#D97706"/></radialGradient></defs>
      {/* Left: PROBLEM */}
      <rect x={0} y={60} width={78} height={130} rx={6} fill={zone ? '#DC2626' : '#6B7280'} opacity={0.85}/>
      <text x={39} y={100} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="bold">PROBLEM</text>
      <text x={39} y={116} textAnchor="middle" fontSize="7" fill="#fca5a5">{zName}</text>
      <text x={39} y={132} textAnchor="middle" fontSize="6" fill="#fff" opacity={0.8}>{challenge.name.slice(0,14)}</text>
      {/* Right: SOLUTION */}
      <rect x={TE+2} y={60} width={78} height={130} rx={6} fill="#16A34A" opacity={0.85}/>
      <text x={TE+41} y={100} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="bold">SOLUTION</text>
      <text x={TE+41} y={116} textAnchor="middle" fontSize="7" fill="#bbf7d0">{zName}</text>
      {/* Track */}
      <rect x={TX} y={100} width={SW*5} height={50} rx={4} fill="#8B6F47"/>
      {sorted.map((p, i) => {
        const paved = i < entries.length && entries[i].type !== 'pass';
        const act = stage === 'turns' && i === turnIdx;
        return (<g key={p.id}>
          <rect x={sx(i)} y={100} width={SW} height={50} rx={2} fill={paved ? '#D4A574' : '#8B6F47'}
            stroke={act ? ROLE_COLORS[p.roleId] : '#fff'} strokeWidth={act ? 3 : 0.5} opacity={act ? 1 : 0.9}/>
          <text x={sx(i)+SW/2} y={96} textAnchor="middle" fontSize="8" fill={ROLE_COLORS[p.roleId]} fontWeight="bold">{p.name.slice(0,12)}</text>
          <text x={sx(i)+SW/2} y={86} textAnchor="middle" fontSize="7" fill="#9CA3AF">{POS[i]}</text>
          {glow && i === entries.length-1 && i > 0 && <circle cx={sx(i)} cy={125} r={8} fill="#22C55E" opacity={0.6}/>}
        </g>);
      })}
      {/* Baton */}
      <circle cx={runnerX ?? (entries.length > 0 ? bX : TX)} cy={90} r={15} fill="url(#bg)" stroke="#92400E" strokeWidth="2"/>
      <text x={runnerX ?? (entries.length > 0 ? bX : TX)} y={95} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#451A03">{bVal}</text>
      {/* Runner */}
      {runnerX !== null && <g transform={`translate(${runnerX},140)`}><RunnerSVG color={rc}/></g>}
      {/* Action text */}
      {actText && <text x={400} y={180} textAnchor="middle" fontSize="18" fontWeight="bold"
        fill={actText === 'TIMEOUT' ? '#EF4444' : actText === 'PERFECT RELAY!' ? '#FBBF24' : '#22C55E'}>{actText}</text>}
    </svg>
  );

  /* ── Stage renders ─────────────────────────────────────── */
  if (stage === 'intro') return (
    <motion.div className="flex flex-col items-center justify-center min-h-[400px] gap-4" initial={{opacity:0}} animate={{opacity:1}}>
      <h2 className="text-3xl font-bold text-amber-400">Phase 4: Build the Path</h2>
      <p className="text-lg text-gray-300">Work together to pave the way from problem to solution!</p>
    </motion.div>
  );

  if (stage === 'setup') return (
    <motion.div className="flex flex-col items-center gap-4 p-4" initial={{opacity:0}} animate={{opacity:1}}>
      <h3 className="text-xl font-semibold text-white">Relay Track</h3>
      <p className="text-sm text-gray-400">Challenge: <span className="text-amber-300">{challenge.name}</span> — Threshold: {thr}</p>
      {track}
      <p className="text-xs text-gray-500 animate-pulse">Preparing relay...</p>
    </motion.div>
  );

  if (stage === 'turns') return (
    <motion.div className="flex flex-col items-center gap-3 p-4" initial={{opacity:0}} animate={{opacity:1}}>
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-white">Leg {turnIdx+1}/{sorted.length}</h3>
        {cp && <span className="text-sm px-2 py-0.5 rounded" style={{backgroundColor:rc,color:'#fff'}}>{cp.name} — {POS[turnIdx]}</span>}
        <span className="text-xs text-gray-400">Threshold: {thr} | Baton: {bVal}</span>
      </div>
      {track}
      {cp && !anim && turnIdx < sorted.length && <>
        <div className="flex gap-2 flex-wrap justify-center max-w-3xl">
          {cp.hand.map(c => (
            <button key={c.id} onClick={() => setSelCard(c.id === selCard ? null : c.id)}
              className={`px-3 py-2 rounded text-xs border transition-all ${selCard === c.id ? 'border-amber-400 bg-amber-900/40 text-amber-200' : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-400'}`}>
              <div className="font-semibold">{c.name}</div>
              <div className="text-[10px] text-gray-400">Base {c.baseValue} | {c.tags.join(', ')}</div>
            </button>
          ))}
        </div>
        <div className="flex gap-3 mt-2">
          <button disabled={!selCard} onClick={playCard} className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold disabled:opacity-40">Play Card</button>
          <button onClick={contribute} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold">Contribute Resources</button>
          <button onClick={ability} className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold">Use Ability</button>
          <button onClick={pass} className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white text-sm font-semibold">Pass Turn</button>
        </div>
      </>}
      {anim && <p className="text-amber-300 text-sm animate-pulse">Running...</p>}
    </motion.div>
  );

  if (stage === 'finish' && result) {
    const m: Record<string, {t:string;c:string;s:string}> = {
      full_success: {t:'THE PATH IS COMPLETE!',c:'#22C55E',s:'Full success!'},
      partial_success: {t:'Almost there — more work needed.',c:'#F59E0B',s:'Partial success.'},
      narrow_success: {t:'Every step counted!',c:'#FBBF24',s:'Narrow success.'},
      failure: {t:"The path couldn't hold.",c:'#EF4444',s:'The track crumbles.'},
    };
    const o = m[result.outcome];
    return (
      <motion.div className="flex flex-col items-center gap-4 p-6" initial={{opacity:0}} animate={{opacity:1}}>
        {track}
        <motion.div className="text-center mt-4" initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}}>
          <h2 className="text-3xl font-bold" style={{color:o.c}}>{o.t}</h2>
          <p className="text-gray-400 mt-1">{o.s}</p>
          <p className="text-sm text-gray-500 mt-2">SV: {result.seriesValue} vs Threshold: {thr}</p>
        </motion.div>
      </motion.div>
    );
  }

  if (stage === 'trigger') {
    const tt = trigger?.type;
    return (
      <motion.div className="flex flex-col items-center gap-4 p-6" initial={{opacity:0}} animate={{opacity:1}}>
        {track}
        <motion.div className="text-center mt-4 max-w-md" initial={{scale:0.9}} animate={{scale:1}}>
          {tt === 'trap' && <><h3 className="text-2xl font-bold text-red-400">TRAP TRIGGERED</h3>
            <p className="text-gray-300 mt-2">Hidden problem worse than expected. Resources partially wasted — but the team learns.</p>
            <p className="text-red-300 text-sm mt-1">Series Value -3</p></>}
          {tt === 'secret_door' && <><h3 className="text-2xl font-bold text-green-400">SECRET DOOR FOUND</h3>
            <p className="text-gray-300 mt-2">Unexpected ally! A local school offers weekly cleanups. +5 Volunteer Tokens!</p></>}
          {tt === 'cascading_effect' && <><h3 className="text-2xl font-bold text-blue-400">CASCADE EFFECT</h3>
            <p className="text-gray-300 mt-2">Ripple of hope! Adjacent zone improves +1!</p></>}
        </motion.div>
      </motion.div>
    );
  }

  if (stage === 'summary' && result) {
    const { standard, placemaking } = chainLen(entries);
    return (
      <motion.div className="flex flex-col items-center gap-4 p-6 max-w-2xl mx-auto" initial={{opacity:0}} animate={{opacity:1}}>
        <h3 className="text-xl font-bold text-white">Resolution Summary</h3>
        <div className="w-full bg-gray-800 rounded-lg p-4 space-y-2">
          {sorted.map((p, i) => { const e = entries[i]; return (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full inline-block" style={{backgroundColor:ROLE_COLORS[p.roleId]}}/>
                <span className="text-gray-200">{p.name}</span>
                <span className="text-xs text-gray-500">{POS[i]}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{e ? e.type.toUpperCase() : 'N/A'}</span>
                <span className="font-mono text-amber-300">+{e?.value ?? 0}</span>
              </div>
            </div>
          ); })}
        </div>
        <div className="w-full bg-gray-800 rounded-lg p-4 space-y-1 text-sm">
          <div className="flex justify-between text-gray-300"><span>Base Total</span><span className="font-mono">{entries.reduce((s,e)=>s+e.value,0)}</span></div>
          {result.chainBonus > 0 && <div className="flex justify-between text-green-300">
            <span>Chain Bonus ({placemaking >= 2 ? `Placemaking ${placemaking}` : `Standard ${standard}`})</span>
            <span className="font-mono">+{result.chainBonus}</span></div>}
          {result.synergyBonus > 0 && <div className="flex justify-between text-purple-300"><span>Synergy Bonus</span><span className="font-mono">+{result.synergyBonus}</span></div>}
          {result.teamPlayBonus && <div className="flex justify-between text-blue-300"><span>Team Play Bonus (all contributed)</span><span className="font-mono">+3</span></div>}
          {svAdj !== 0 && <div className="flex justify-between text-red-300"><span>Trigger Adjustment</span><span className="font-mono">{svAdj}</span></div>}
          <div className="border-t border-gray-700 pt-1 mt-1 flex justify-between text-white font-semibold"><span>Series Value</span><span className="font-mono">{result.seriesValue}</span></div>
          <div className="flex justify-between text-gray-400"><span>Threshold</span><span className="font-mono">{thr}</span></div>
          <div className="flex justify-between font-semibold mt-1" style={{color: result.outcome==='failure'?'#EF4444':result.outcome==='full_success'?'#22C55E':'#F59E0B'}}>
            <span>Outcome</span><span>{result.outcome.replace(/_/g,' ').toUpperCase()}</span></div>
          <div className="flex justify-between text-gray-400"><span>Zone Change</span><span className="font-mono">{result.zoneChange > 0 ? `+${result.zoneChange}` : result.zoneChange}</span></div>
        </div>
        <button onClick={() => setStage('continue')} className="mt-2 px-6 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold">Continue</button>
      </motion.div>
    );
  }

  if (stage === 'continue') {
    return (
      <motion.div className="flex flex-col items-center justify-center min-h-[300px] gap-4" initial={{opacity:0}} animate={{opacity:1}}>
        <button onClick={() => onPhaseComplete(computeResult())} className="px-8 py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white text-lg font-bold">
          Continue to Phase 5: Scoring →
        </button>
      </motion.div>
    );
  }

  return null;
}
