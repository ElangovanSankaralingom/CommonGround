import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	GameSession, Player, ResourcePool, ResourceType, RoleId,
	ChallengeCard, Promise as GamePromise,
} from '../../core/models/types';
import {
	ROLE_COLORS, RESOURCE_COLORS,
	BUCHI_OBJECTIVES, OBJECTIVE_WEIGHTS, ObjectiveId,
	SURVIVAL_THRESHOLDS, PLAYER_TYPE,
} from '../../core/models/constants';
import { PhaseNavigation } from '../effects/PhaseNavigation';

// ─── Types & Constants ──────────────────────────────────────────
interface DeliberationPhaseProps {
	session: GameSession; players: Player[]; currentPlayerId: string;
	challenge: ChallengeCard | null; onPhaseComplete: () => void;
	onProposeTrade: (targetId: string, offering: Partial<ResourcePool>, requesting: Partial<ResourcePool>) => void;
	onAcceptTrade: (tradeId: string) => void; onRejectTrade: (tradeId: string) => void;
	onFormCoalition: (partnerIds: string[], targetZoneId: string) => void;
	onMakePromise: (toPlayerId: string, resource: ResourceType, amount: number) => void;
	onEndDeliberation: () => void; deliberationTimeRemaining: number;
}
type Stage = 'intro' | 'ispy' | 'strategy' | 'summary';
type WTab = 'trading' | 'coalition' | 'promises' | 'series';
interface ISpyDiff { zoneId: string; resource: ResourceType; found: boolean; foundBy: string | null; }

const RI: Record<ResourceType, string> = { knowledge: '🌳', budget: '💰', volunteer: '👤', material: '🔧', influence: '⭐' };
const RL: Record<ResourceType, string> = { budget: 'Budget', influence: 'Influence', volunteer: 'Volunteer', material: 'Material', knowledge: 'Knowledge' };
const RT: ResourceType[] = ['budget', 'influence', 'volunteer', 'material', 'knowledge'];
const CC: Record<string, string> = { good: '#22C55E', fair: '#EAB308', poor: '#F97316', critical: '#EF4444', locked: '#6B7280' };
const TILES = [
	{ id: 'assess', label: 'ASSESS', color: '#3B82F6', icon: '🔍' },
	{ id: 'plan', label: 'PLAN', color: '#8B5CF6', icon: '📋' },
	{ id: 'design', label: 'DESIGN', color: '#06B6D4', icon: '✏️' },
	{ id: 'fund', label: 'FUND', color: '#EAB308', icon: '💵' },
	{ id: 'build', label: 'BUILD', color: '#92400E', icon: '🏗️' },
	{ id: 'maintain', label: 'MAINTAIN', color: '#6B7280', icon: '🔧' },
	{ id: 'protect', label: 'PROTECT', color: '#22C55E', icon: '🛡️' },
	{ id: 'mobilize', label: 'MOBILIZE', color: '#F97316', icon: '📢' },
];
const COMPAT: Record<string, string[]> = {
	assess: ['plan', 'design'], plan: ['design', 'fund', 'assess'], design: ['build', 'plan', 'assess'],
	fund: ['build', 'plan', 'maintain'], build: ['maintain', 'design', 'fund'],
	maintain: ['protect', 'build', 'fund'], protect: ['mobilize', 'maintain'], mobilize: ['assess', 'protect'],
};
const OBJ: ObjectiveId[] = ['safety', 'greenery', 'access', 'culture', 'revenue', 'community'];
const OC: Record<ObjectiveId, string> = { safety: '#EF4444', greenery: '#22C55E', access: '#3B82F6', culture: '#A855F7', revenue: '#EAB308', community: '#F97316' };
const IST = 15;

function rng(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function rn(r: RoleId) { return r.charAt(0).toUpperCase() + r.slice(1); }
function ft(sec: number) { return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`; }
function buchi(s: GameSession, pid: string, rid: RoleId): 'safe' | 'warning' | 'crisis' {
	const h = s.buchiHistory?.[pid]; if (!h) return 'safe';
	let mx = 0; for (const o of (BUCHI_OBJECTIVES[rid] || [])) { mx = Math.max(mx, h[o] || 0); }
	return mx >= 2 ? 'crisis' : mx >= 1 ? 'warning' : 'safe';
}

// ─── Objective Dashboard ────────────────────────────────────────
function ObjDash({ players, session }: { players: Player[]; session: GameSession }) {
	const overlaps: { a: Player; b: Player; obj: ObjectiveId; c: number }[] = [];
	const conflicts: { a: Player; b: Player; obj: ObjectiveId }[] = [];
	for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) {
		const [pa, pb] = [players[i], players[j]];
		const [wa, wb] = [OBJECTIVE_WEIGHTS[pa.roleId], OBJECTIVE_WEIGHTS[pb.roleId]];
		for (const o of OBJ) {
			if (wa[o] >= 3 && wb[o] >= 3) overlaps.push({ a: pa, b: pb, obj: o, c: wa[o] + wb[o] });
			if ((wa[o] > 0 && wb[o] < 0) || (wa[o] < 0 && wb[o] > 0)) conflicts.push({ a: pa, b: pb, obj: o });
		}
	}
	return (
		<div className="w-full bg-gray-900/80 rounded-lg p-3 mb-3">
			<h3 className="text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Objective Dashboard</h3>
			<div className="flex gap-2 overflow-x-auto pb-1">
				{players.map(p => {
					const w = OBJECTIVE_WEIGHTS[p.roleId], th = SURVIVAL_THRESHOLDS[p.roleId];
					const bs = buchi(session, p.id, p.roleId), pt = PLAYER_TYPE[p.roleId];
					const bc = { safe: '#22C55E', warning: '#EAB308', crisis: '#EF4444' };
					const bl = { safe: 'Safe', warning: 'Warning', crisis: 'CRISIS' };
					return (
						<div key={p.id} className="min-w-[170px] rounded-lg p-2 bg-gray-800" style={{ borderLeft: `3px solid ${ROLE_COLORS[p.roleId]}` }}>
							<div className="flex items-center gap-1 mb-1">
								<span className="text-sm font-bold" style={{ color: ROLE_COLORS[p.roleId] }}>{rn(p.roleId)}</span>
								<span className="text-[10px] px-1 rounded bg-gray-700 text-gray-300 ml-auto">{pt}</span>
							</div>
							<div className="space-y-0.5 mb-1.5">{OBJ.map(o => (
								<div key={o} className="flex items-center gap-1">
									<span className="text-[9px] text-gray-400 w-[42px] truncate capitalize">{o}</span>
									<div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
										<div className="h-full rounded" style={{ width: `${Math.max(0, (w[o] / 5) * 100)}%`, backgroundColor: w[o] < 0 ? '#EF4444' : OC[o] }} />
									</div>
									<span className="text-[9px] text-gray-400 w-3 text-right">{w[o]}</span>
								</div>
							))}</div>
							<div className="flex items-center gap-1 text-xs mb-1">
								<span className="text-gray-400">U:</span><span className="font-bold text-white">{p.utilityScore}</span>
								<span className="text-gray-500">/</span><span className="text-gray-400">{th}</span>
								<span className={p.utilityScore >= th ? 'text-green-400' : 'text-red-400'}>{p.utilityScore >= th ? '✓' : '✗'}</span>
							</div>
							<span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: bc[bs] + '30', color: bc[bs] }}>{bl[bs]}</span>
						</div>
					);
				})}
			</div>
			{(overlaps.length > 0 || conflicts.length > 0) && (
				<div className="mt-2 flex flex-wrap gap-2 text-[10px]">
					{overlaps.slice(0, 4).map((o, i) => (
						<span key={i} className="px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300">
							{rn(o.a.roleId)} {o.obj}({OBJECTIVE_WEIGHTS[o.a.roleId][o.obj]}) ↔ {rn(o.b.roleId)} {o.obj}({OBJECTIVE_WEIGHTS[o.b.roleId][o.obj]}): Combined {o.c}
						</span>
					))}
					{conflicts.slice(0, 3).map((c, i) => (
						<span key={`c${i}`} className="px-1.5 py-0.5 rounded bg-red-900/40 text-red-300">
							{rn(c.a.roleId)} ←✗→ {rn(c.b.roleId)}: {c.obj} CONFLICT
						</span>
					))}
				</div>
			)}
		</div>
	);
}

// ─── Action Sequence Builder ────────────────────────────────────
function SeqBuilder({ seq, setSeq, sel, setSel }: {
	seq: (string | null)[]; setSeq: React.Dispatch<React.SetStateAction<(string | null)[]>>;
	sel: string | null; setSel: React.Dispatch<React.SetStateAction<string | null>>;
}) {
	const clickTile = (id: string) => { setSel(sel === id ? null : id); };
	const clickSlot = (i: number) => {
		if (!sel) { setSeq(p => { const n = [...p]; n[i] = null; return n; }); return; }
		setSeq(p => { const n = [...p]; const ex = n.indexOf(sel); if (ex >= 0) n[ex] = null; n[i] = sel; return n; });
		setSel(null);
	};
	const compat = (a: string | null, b: string | null): boolean | null => (!a || !b) ? null : (COMPAT[a] || []).includes(b);
	return (
		<div className="bg-gray-900/60 rounded-lg p-3 mb-3">
			<h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Action Sequence Builder</h4>
			<div className="flex gap-1.5 mb-3 flex-wrap">{TILES.map(t => (
				<motion.button key={t.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => clickTile(t.id)}
					className={`w-[60px] h-[40px] rounded flex flex-col items-center justify-center text-white text-[10px] font-bold cursor-pointer border-2 transition-all ${sel === t.id ? 'border-white ring-2 ring-white/40' : seq.includes(t.id) ? 'border-transparent opacity-40' : 'border-transparent'}`}
					style={{ backgroundColor: t.color }}>
					<span className="text-sm leading-none">{t.icon}</span><span>{t.label}</span>
				</motion.button>
			))}</div>
			<div className="flex gap-1 items-center">{seq.map((sid, i) => {
				const t = sid ? TILES.find(x => x.id === sid) : null;
				const nxt = i < seq.length - 1 ? seq[i + 1] : null;
				const c = compat(sid, nxt);
				return (<React.Fragment key={i}>
					<motion.button whileHover={{ scale: 1.05 }} onClick={() => clickSlot(i)}
						className={`w-[60px] h-[40px] rounded flex flex-col items-center justify-center text-[10px] font-bold border-2 border-dashed transition-all ${t ? 'border-transparent text-white' : 'border-gray-600 text-gray-500'} ${!t && sel ? 'border-yellow-400 bg-yellow-400/10' : ''}`}
						style={t ? { backgroundColor: t.color } : {}}>
						{t ? <><span className="text-sm leading-none">{t.icon}</span><span>{t.label}</span></> : <span>{i + 1}</span>}
					</motion.button>
					{i < seq.length - 1 && <span className="text-xs">{c === true ? '🟢' : c === false ? '❌' : '—'}</span>}
				</React.Fragment>);
			})}</div>
		</div>
	);
}

// ─── Trading Panel ──────────────────────────────────────────────
function TradePanel({ cp, players, session, onPropose, onAccept, onReject }: {
	cp: Player; players: Player[]; session: GameSession;
	onPropose: DeliberationPhaseProps['onProposeTrade'];
	onAccept: (id: string) => void; onReject: (id: string) => void;
}) {
	const [off, setOff] = useState<Partial<ResourcePool>>({});
	const [req, setReq] = useState<Partial<ResourcePool>>({});
	const [tid, setTid] = useState<string | null>(null);
	const others = players.filter(p => p.id !== cp.id);
	const trades = session.tradeOffers || [];
	const adj = (pool: 'o' | 'r', res: ResourceType, d: number) => {
		const set = pool === 'o' ? setOff : setReq;
		set(prev => { const c = (prev[res] || 0) + d; if (c <= 0) { const n = { ...prev }; delete n[res]; return n; } if (pool === 'o' && c > cp.resources[res]) return prev; return { ...prev, [res]: c }; });
	};
	const submit = () => { if (!tid || !Object.keys(off).length) return; onPropose(tid, off, req); setOff({}); setReq({}); };
	const resRow = (pool: 'o' | 'r', vals: Partial<ResourcePool>) => RT.map(r => (
		<div key={r} className="flex items-center gap-1 text-xs text-gray-300 mb-0.5">
			<span className="w-16 truncate">{RL[r]}</span>
			<button onClick={() => adj(pool, r, -1)} className="px-1 bg-gray-700 rounded">-</button>
			<span className="w-4 text-center font-bold">{vals[r] || 0}</span>
			<button onClick={() => adj(pool, r, 1)} className="px-1 bg-gray-700 rounded">+</button>
		</div>
	));
	return (
		<div className="space-y-3">
			<div><h5 className="text-xs font-bold text-gray-400 mb-1">Your Resources</h5>
				<div className="flex gap-1.5 flex-wrap">{RT.map(r => (
					<div key={r} className="px-2 py-1 rounded text-xs font-bold text-white" style={{ backgroundColor: RESOURCE_COLORS[r] + 'CC' }}>{RI[r]} {cp.resources[r]}</div>
				))}</div></div>
			<div><h5 className="text-xs font-bold text-gray-400 mb-1">Trade With</h5>
				<div className="flex gap-1.5">{others.map(p => (
					<button key={p.id} onClick={() => setTid(p.id)} className={`px-2 py-1 rounded text-xs font-bold border-2 transition-all ${tid === p.id ? 'border-white text-white' : 'border-transparent text-gray-400'}`} style={{ backgroundColor: ROLE_COLORS[p.roleId] + '40' }}>{rn(p.roleId)}</button>
				))}</div></div>
			<div className="grid grid-cols-2 gap-2">
				<div className="bg-green-900/20 rounded p-2"><h5 className="text-[10px] font-bold text-green-400 mb-1">OFFERING</h5>{resRow('o', off)}</div>
				<div className="bg-red-900/20 rounded p-2"><h5 className="text-[10px] font-bold text-red-400 mb-1">REQUESTING</h5>{resRow('r', req)}</div>
			</div>
			<button onClick={submit} disabled={!tid || !Object.keys(off).length} className="w-full py-1.5 rounded bg-blue-600 text-white text-xs font-bold disabled:opacity-30 hover:bg-blue-500">Propose Trade</button>
			{trades.filter(t => t.status === 'pending').map(t => {
				const pr = players.find(p => p.id === t.proposerId);
				return (<div key={t.id} className="bg-gray-800 rounded p-2 mb-1 text-xs text-gray-300">
					<span className="font-bold" style={{ color: ROLE_COLORS[pr?.roleId || 'citizen'] }}>{rn(pr?.roleId || 'citizen')}</span>
					{' offers '}{Object.entries(t.offering).map(([k, v]) => `${v} ${k}`).join(', ')}{' for '}{Object.entries(t.requesting).map(([k, v]) => `${v} ${k}`).join(', ')}
					{t.targetId === cp.id && <div className="flex gap-1 mt-1">
						<button onClick={() => onAccept(t.id)} className="px-2 py-0.5 bg-green-600 rounded text-white text-[10px] font-bold">Accept</button>
						<button onClick={() => onReject(t.id)} className="px-2 py-0.5 bg-red-600 rounded text-white text-[10px] font-bold">Reject</button>
					</div>}
				</div>);
			})}
			{trades.filter(t => t.status === 'accepted' || t.status === 'completed').map(t => (
				<div key={t.id} className="text-[10px] text-green-400">✓ Trade completed</div>
			))}
		</div>
	);
}

// ─── Coalition Panel ────────────────────────────────────────────
function CoalPanel({ cp, players, session, onForm }: {
	cp: Player; players: Player[]; session: GameSession; onForm: DeliberationPhaseProps['onFormCoalition'];
}) {
	const [sel, setSel] = useState<string[]>([]);
	const [zone, setZone] = useState('');
	const others = players.filter(p => p.id !== cp.id);
	const zones = Object.values(session.board.zones);
	const coals = session.activeCoalitions || [];
	const toggle = (id: string) => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
	return (
		<div className="space-y-3">
			<h5 className="text-xs font-bold text-gray-400">Form Coalition</h5>
			<div className="flex gap-1.5 flex-wrap">{others.map(p => (
				<button key={p.id} onClick={() => toggle(p.id)} className={`px-2 py-1 rounded text-xs font-bold border-2 transition-all ${sel.includes(p.id) ? 'border-white ring-1 ring-white/30' : 'border-transparent'}`} style={{ backgroundColor: ROLE_COLORS[p.roleId] + '60' }}>{rn(p.roleId)}</button>
			))}</div>
			<select value={zone} onChange={e => setZone(e.target.value)} className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700">
				<option value="">Select target zone...</option>
				{zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
			</select>
			<button onClick={() => { onForm(sel, zone); setSel([]); }} disabled={!sel.length || !zone} className="w-full py-1.5 rounded bg-purple-600 text-white text-xs font-bold disabled:opacity-30 hover:bg-purple-500">Form Coalition</button>
			{coals.map(c => (
				<div key={c.id} className="bg-gray-800 rounded p-2 mb-1 text-xs text-gray-300 border-l-2 border-purple-400">
					<div className="font-bold text-purple-300">{c.participants.map(p => rn(p.roleId)).join(' + ')}</div>
					<div className="text-[10px] text-gray-500">+2 series bonus | Target: {session.board.zones[c.targetZoneId]?.name || c.targetZoneId}</div>
				</div>
			))}
		</div>
	);
}

// ─── Promise Panel ──────────────────────────────────────────────
function PromPanel({ cp, players, session, onPromise }: {
	cp: Player; players: Player[]; session: GameSession; onPromise: DeliberationPhaseProps['onMakePromise'];
}) {
	const [to, setTo] = useState('');
	const [res, setRes] = useState<ResourceType>('budget');
	const [amt, setAmt] = useState(1);
	const others = players.filter(p => p.id !== cp.id);
	const proms: GamePromise[] = session.promises || [];
	return (
		<div className="space-y-3">
			<h5 className="text-xs font-bold text-gray-400">Promise Board</h5>
			{proms.length > 0 && <div className="space-y-1 max-h-[120px] overflow-y-auto">{proms.map(pr => {
				const f = players.find(p => p.id === pr.fromPlayerId), t = players.find(p => p.id === pr.toPlayerId);
				return (<div key={pr.id} className="rounded p-1.5 text-xs border-l-2" style={{ borderColor: ROLE_COLORS[f?.roleId || 'citizen'], backgroundColor: ROLE_COLORS[f?.roleId || 'citizen'] + '15' }}>
					<span className="font-bold" style={{ color: ROLE_COLORS[f?.roleId || 'citizen'] }}>{rn(f?.roleId || 'citizen')}</span> → <span className="font-bold" style={{ color: ROLE_COLORS[t?.roleId || 'citizen'] }}>{rn(t?.roleId || 'citizen')}</span>: {pr.promisedResource.amount} {pr.promisedResource.type}
					{pr.fulfilled && <span className="text-green-400 ml-1">✓</span>}{pr.broken && <span className="text-red-400 ml-1">✗ BROKEN</span>}
				</div>);
			})}</div>}
			<div className="bg-gray-800/60 rounded p-2 space-y-2">
				<h6 className="text-[10px] font-bold text-gray-400 uppercase">Make Promise</h6>
				<select value={to} onChange={e => setTo(e.target.value)} className="w-full bg-gray-700 text-gray-300 text-xs rounded px-2 py-1 border border-gray-600">
					<option value="">Select player...</option>{others.map(p => <option key={p.id} value={p.id}>{rn(p.roleId)}</option>)}
				</select>
				<div className="flex gap-2">
					<select value={res} onChange={e => setRes(e.target.value as ResourceType)} className="flex-1 bg-gray-700 text-gray-300 text-xs rounded px-2 py-1 border border-gray-600">
						{RT.map(r => <option key={r} value={r}>{RL[r]}</option>)}
					</select>
					<input type="number" min={1} max={10} value={amt} onChange={e => setAmt(Number(e.target.value))} className="w-14 bg-gray-700 text-gray-300 text-xs rounded px-2 py-1 border border-gray-600 text-center" />
				</div>
				<button onClick={() => { if (to) { onPromise(to, res, amt); setTo(''); } }} disabled={!to} className="w-full py-1 rounded bg-amber-600 text-white text-xs font-bold disabled:opacity-30 hover:bg-amber-500">Post Promise</button>
			</div>
		</div>
	);
}

// ─── Main Component ─────────────────────────────────────────────
export default function DeliberationPhase(props: DeliberationPhaseProps) {
	const { session, players, currentPlayerId, challenge, onPhaseComplete, onProposeTrade, onAcceptTrade, onRejectTrade, onFormCoalition, onMakePromise, onEndDeliberation, deliberationTimeRemaining } = props;
	const [stage, setStage] = useState<Stage>('intro');
	const [tab, setTab] = useState<WTab>('trading');
	// I-SPY
	const [diffs, setDiffs] = useState<ISpyDiff[]>([]);
	const [turnIdx, setTurnIdx] = useState(0);
	const [ispyT, setIspyT] = useState(IST);
	const [slider, setSlider] = useState(50);
	const [ispyDone, setIspyDone] = useState(false);
	const slRef = useRef<HTMLDivElement>(null);
	const dragging = useRef(false);
	// Strategy
	const [seq, setSeq] = useState<(string | null)[]>(Array(8).fill(null));
	const [selTile, setSelTile] = useState<string | null>(null);
	const [ready, setReady] = useState<Set<string>>(new Set());
	const [timer, setTimer] = useState(deliberationTimeRemaining);
	const [lastAct, setLastAct] = useState<Record<string, number>>({});
	const [eqPrompt, setEqPrompt] = useState<string | null>(null);
	const [discovered, setDiscovered] = useState(0);

	const cp = useMemo(() => players.find(p => p.id === currentPlayerId) || players[0], [players, currentPlayerId]);
	const zones = useMemo(() => Object.values(session.board.zones), [session.board.zones]);
	const ispyOrder = useMemo(() => [...players].sort((a, b) => a.utilityScore - b.utilityScore), [players]);

	// Generate I-SPY diffs
	useEffect(() => {
		if (diffs.length > 0) return;
		const r = rng(session.rngSeed + session.currentRound);
		const zids = zones.map(z => z.id), used = new Set<string>(), out: ISpyDiff[] = [];
		for (let i = 0; i < 7 && i < zids.length; i++) {
			let zi = Math.floor(r() * zids.length), att = 0;
			while (used.has(zids[zi]) && att < 20) { zi = Math.floor(r() * zids.length); att++; }
			used.add(zids[zi]);
			out.push({ zoneId: zids[zi], resource: RT[Math.floor(r() * RT.length)], found: false, foundBy: null });
		}
		setDiffs(out);
	}, [session.rngSeed, session.currentRound, zones, diffs.length]);

	// Stage transitions
	useEffect(() => {
		if (stage === 'intro') { const t = setTimeout(() => setStage('ispy'), 1500); return () => clearTimeout(t); }
		if (stage === 'summary') { const t = setTimeout(() => onPhaseComplete(), 2000); return () => clearTimeout(t); }
	}, [stage, onPhaseComplete]);

	// I-SPY timer
	useEffect(() => {
		if (stage !== 'ispy' || ispyDone) return;
		const iv = setInterval(() => {
			setIspyT(prev => {
				if (prev <= 1) {
					const tp = ispyOrder[turnIdx];
					if (tp && diffs.filter(d => d.foundBy === tp.id).length === 0) {
						const uc = diffs.findIndex(d => !d.found);
						if (uc >= 0) { setEqPrompt(tp.id); setTimeout(() => setEqPrompt(null), 3000); }
					}
					if (turnIdx + 1 >= ispyOrder.length) { setIspyDone(true); setTimeout(() => setStage('strategy'), 1500); return IST; }
					setTurnIdx(turnIdx + 1);
					return IST;
				}
				return prev - 1;
			});
		}, 1000);
		return () => clearInterval(iv);
	}, [stage, ispyDone, turnIdx, ispyOrder, diffs]);

	// Strategy timer
	useEffect(() => {
		if (stage !== 'strategy') return;
		const iv = setInterval(() => { setTimer(p => { if (p <= 1) { setStage('summary'); return 0; } return p - 1; }); }, 1000);
		return () => clearInterval(iv);
	}, [stage]);

	// Equity check in strategy
	useEffect(() => {
		if (stage !== 'strategy') return;
		const iv = setInterval(() => {
			const now = Date.now();
			for (const p of players) { if (now - (lastAct[p.id] || now) > 90000) { setEqPrompt(p.id); setTimeout(() => setEqPrompt(null), 5000); break; } }
		}, 10000);
		return () => clearInterval(iv);
	}, [stage, players, lastAct]);

	const clickDiff = useCallback((i: number) => {
		if (stage !== 'ispy' || ispyDone) return;
		const tp = ispyOrder[turnIdx]; if (!tp) return;
		setDiffs(prev => { const n = [...prev]; if (n[i].found) return n; n[i] = { ...n[i], found: true, foundBy: tp.id }; return n; });
		setDiscovered(p => p + 1);
		setLastAct(p => ({ ...p, [tp.id]: Date.now() }));
	}, [stage, ispyDone, ispyOrder, turnIdx]);

	const handleReady = useCallback(() => {
		setReady(p => new Set(p).add(currentPlayerId));
		setLastAct(p => ({ ...p, [currentPlayerId]: Date.now() }));
		if (ready.size + 1 >= players.length) setStage('summary');
	}, [currentPlayerId, ready.size, players.length]);

	const handleEnd = useCallback(() => { onEndDeliberation(); setStage('summary'); }, [onEndDeliberation]);

	// Slider drag
	const onSliderMove = useCallback((e: React.MouseEvent | MouseEvent) => {
		if (!dragging.current || !slRef.current) return;
		const r = slRef.current.getBoundingClientRect();
		setSlider(Math.max(10, Math.min(90, ((e.clientX - r.left) / r.width) * 100)));
	}, []);
	useEffect(() => {
		const up = () => { dragging.current = false; };
		window.addEventListener('mouseup', up); window.addEventListener('mousemove', onSliderMove as any);
		return () => { window.removeEventListener('mouseup', up); window.removeEventListener('mousemove', onSliderMove as any); };
	}, [onSliderMove]);

	// Mini hex grid
	const miniGrid = (showDiffs: boolean) => (
		<div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
			{zones.slice(0, 14).map(z => {
				const d = diffs.find(x => x.zoneId === z.id);
				const show = showDiffs && d && !d.found;
				const hinted = eqPrompt && d && !d.found;
				return (
					<motion.div key={z.id} onClick={() => show ? clickDiff(diffs.indexOf(d!)) : undefined}
						className={`relative h-12 rounded flex flex-col items-center justify-center text-[8px] font-bold cursor-pointer select-none ${show ? 'hover:ring-2 hover:ring-white/50' : ''}`}
						style={{ backgroundColor: CC[z.condition] + '40', borderColor: CC[z.condition], borderWidth: 1 }}
						whileHover={show ? { scale: 1.1 } : {}}>
						<span className="text-[7px] text-gray-300 truncate max-w-full px-0.5">{z.name.replace(/_/g, ' ')}</span>
						<span className="text-[8px] capitalize" style={{ color: CC[z.condition] }}>{z.condition}</span>
						{show && <motion.span className={`absolute -top-1 -right-1 text-sm ${hinted ? 'animate-pulse' : ''}`} initial={{ opacity: 0.6 }} animate={{ opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 2 }}>{RI[d!.resource]}</motion.span>}
						{d?.found && showDiffs && <motion.span className="absolute inset-0 flex items-center justify-center text-lg" initial={{ scale: 2, opacity: 1 }} animate={{ scale: 0, opacity: 0 }} transition={{ duration: 0.5 }}>✨</motion.span>}
					</motion.div>
				);
			})}
		</div>
	);

	return (
		<div className="w-full min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white p-4 overflow-y-auto">
			<AnimatePresence mode="wait">
				{stage === 'intro' && (
					<motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-[60vh] gap-4">
						<motion.h1 className="text-4xl font-black tracking-tight" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>Phase 3: Deliberation</motion.h1>
						<p className="text-gray-400 text-lg text-center max-w-md">Negotiate, discover resources, and plan your strategy.</p>
						<div className="text-2xl font-mono text-yellow-400">Timer: {ft(deliberationTimeRemaining)}</div>
					</motion.div>
				)}

				{stage === 'ispy' && (
					<motion.div key="ispy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
						<h2 className="text-xl font-bold text-center mb-1">I-SPY RESOURCE DISCOVERY</h2>
						<p className="text-gray-400 text-center text-sm mb-3">Find 7 hidden resources! Click differences on the right panel.</p>
						<div className="flex items-center justify-center gap-4 mb-3">
							<div className="text-sm"><span className="text-gray-400">Current turn: </span>
								<span className="font-bold" style={{ color: ROLE_COLORS[ispyOrder[turnIdx]?.roleId || 'citizen'] }}>{rn(ispyOrder[turnIdx]?.roleId || 'citizen')}</span></div>
							<div className="w-40 h-3 bg-gray-800 rounded-full overflow-hidden">
								<motion.div className="h-full bg-yellow-400 rounded-full" animate={{ width: `${(ispyT / IST) * 100}%` }} transition={{ duration: 0.3 }} />
							</div>
							<span className="text-sm font-mono text-yellow-400">{ispyT}s</span>
						</div>
						<AnimatePresence>{eqPrompt && (
							<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center text-sm text-yellow-300 bg-yellow-900/30 rounded px-3 py-1.5 mb-2">
								{rn(ispyOrder[turnIdx]?.roleId || 'citizen')}, look here — we found something for you.
							</motion.div>
						)}</AnimatePresence>
						<div className="flex justify-center gap-3 mb-3">{players.map(p => (
							<div key={p.id} className="text-xs"><span style={{ color: ROLE_COLORS[p.roleId] }}>{rn(p.roleId)}</span><span className="text-gray-500">: {diffs.filter(d => d.foundBy === p.id).length}</span></div>
						))}</div>
						<div ref={slRef} className="relative flex w-full rounded-lg overflow-hidden border border-gray-700" style={{ height: '340px' }} onMouseMove={onSliderMove}>
							<div className="overflow-hidden" style={{ width: `${slider}%` }}>
								<div className="p-3 h-full"><div className="text-[10px] font-bold text-gray-400 uppercase mb-2 text-center">CURRENT STATE</div>{miniGrid(false)}</div>
							</div>
							<div className="absolute top-0 bottom-0 w-1 bg-white/60 cursor-col-resize z-10 hover:bg-white" style={{ left: `${slider}%`, transform: 'translateX(-50%)' }} onMouseDown={() => { dragging.current = true; }}>
								<div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-gray-600 flex items-center justify-center text-gray-800 text-xs font-bold">⇔</div>
							</div>
							<div className="overflow-hidden" style={{ width: `${100 - slider}%` }}>
								<div className="p-3 h-full"><div className="text-[10px] font-bold text-gray-400 uppercase mb-2 text-center">POTENTIAL STATE</div>{miniGrid(true)}</div>
							</div>
						</div>
						{ispyDone && (
							<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 bg-gray-800 rounded-lg p-4 text-center">
								<h3 className="text-lg font-bold text-green-400 mb-2">Discovery Complete!</h3>
								<p className="text-sm text-gray-300">{diffs.filter(d => d.found).length} / 7 resources discovered</p>
								<div className="flex justify-center gap-3 mt-2">{players.map(p => (
									<span key={p.id} className="text-xs" style={{ color: ROLE_COLORS[p.roleId] }}>{rn(p.roleId)}: {diffs.filter(d => d.foundBy === p.id).length}</span>
								))}</div>
							</motion.div>
						)}
					</motion.div>
				)}

				{stage === 'strategy' && (
					<motion.div key="strategy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
						<ObjDash players={players} session={session} />
						<SeqBuilder seq={seq} setSeq={setSeq} sel={selTile} setSel={setSelTile} />
						<div className="flex gap-1 border-b border-gray-700 pb-1">
							{(['trading', 'coalition', 'promises', 'series'] as WTab[]).map(t => (
								<button key={t} onClick={() => { setTab(t); setLastAct(p => ({ ...p, [currentPlayerId]: Date.now() })); }}
									className={`px-3 py-1.5 rounded-t text-xs font-bold uppercase transition-colors ${tab === t ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
									{t.charAt(0).toUpperCase() + t.slice(1)}
								</button>
							))}
						</div>
						<div className="bg-gray-800/40 rounded-lg p-3 min-h-[240px]">
							{tab === 'trading' && <TradePanel cp={cp} players={players} session={session} onPropose={onProposeTrade} onAccept={onAcceptTrade} onReject={onRejectTrade} />}
							{tab === 'coalition' && <CoalPanel cp={cp} players={players} session={session} onForm={onFormCoalition} />}
							{tab === 'promises' && <PromPanel cp={cp} players={players} session={session} onPromise={onMakePromise} />}
							{tab === 'series' && (
								<div className="text-sm text-gray-400">
									<h5 className="text-xs font-bold text-gray-400 mb-2">Strategy Sequence Preview</h5>
									<div className="flex gap-1 flex-wrap mb-3">
										{seq.filter(Boolean).map((id, i) => { const t = TILES.find(a => a.id === id); return t ? <span key={i} className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: t.color }}>{t.icon} {t.label}</span> : null; })}
										{!seq.filter(Boolean).length && <span className="text-gray-600 text-xs italic">No tiles placed yet. Use the sequence builder above.</span>}
									</div>
									{challenge && (
										<div className="bg-gray-900/60 rounded p-2">
											<h6 className="text-[10px] font-bold text-yellow-400 uppercase mb-1">Active Challenge</h6>
											<div className="text-xs text-gray-300">{challenge.name}</div>
											<div className="text-[10px] text-gray-500 mt-0.5">{challenge.description}</div>
											<div className="text-[10px] text-gray-500 mt-1">Difficulty: {challenge.difficulty} | Zones: {challenge.affectedZoneIds.join(', ')}</div>
										</div>
									)}
								</div>
							)}
						</div>
						<AnimatePresence>{eqPrompt && (
							<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-sm text-yellow-300 bg-yellow-900/30 rounded px-3 py-2">
								{rn(players.find(p => p.id === eqPrompt)?.roleId || 'citizen')} hasn't interacted recently. Consider including their resources.
							</motion.div>
						)}</AnimatePresence>
						<div className="flex items-center justify-between bg-gray-900/80 rounded-lg p-3">
							<motion.div className={`text-2xl font-mono font-bold ${timer < 60 ? 'text-red-400' : 'text-yellow-400'}`}
								animate={timer < 60 ? { scale: [1, 1.05, 1] } : {}} transition={timer < 60 ? { repeat: Infinity, duration: 1 } : {}}>
								{ft(timer)}
							</motion.div>
							<div className="flex items-center gap-3">
								<div className="flex gap-1">{players.map(p => (
									<div key={p.id} className={`w-3 h-3 rounded-full border ${ready.has(p.id) ? 'bg-green-400 border-green-400' : 'bg-transparent border-gray-600'}`} title={`${rn(p.roleId)} ${ready.has(p.id) ? 'ready' : 'not ready'}`} />
								))}</div>
								<button onClick={handleReady} disabled={ready.has(currentPlayerId)}
									className={`px-4 py-2 rounded text-sm font-bold transition-colors ${ready.has(currentPlayerId) ? 'bg-green-800 text-green-300 cursor-default' : 'bg-green-600 text-white hover:bg-green-500'}`}>
									{ready.has(currentPlayerId) ? 'Ready ✓' : 'Ready'}
								</button>
								<button onClick={handleEnd} className="px-4 py-2 rounded bg-red-600 text-white text-sm font-bold hover:bg-red-500 transition-colors">End Deliberation</button>
							</div>
						</div>
					</motion.div>
				)}

				{stage === 'summary' && (
					<motion.div key="summary" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-[60vh] gap-3">
						<h2 className="text-2xl font-bold text-gray-200">Deliberation Summary</h2>
						<div className="bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-2 text-sm">
							{[
								['Strategy Sequence', seq.filter(Boolean).length > 0 ? seq.filter(Boolean).map(id => TILES.find(t => t.id === id)?.label).join(' → ') : 'No strategy set'],
								['Trades Completed', String((session.tradeOffers || []).filter(t => t.status === 'accepted' || t.status === 'completed').length)],
								['Coalitions Formed', String((session.activeCoalitions || []).length)],
								['Promises Made', String((session.promises || []).length)],
							].map(([label, val]) => (
								<div key={label} className="flex justify-between text-gray-300">
									<span>{label}</span><span className="font-bold text-white">{val}</span>
								</div>
							))}
							<div className="flex justify-between text-gray-300">
								<span>Resources Discovered</span><span className="font-bold text-green-400">{discovered} / 7</span>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<PhaseNavigation
				canContinue={stage === 'strategy' || stage === 'summary'}
				continueLabel="Continue to Phase 4: Action \u2192"
				onContinue={() => {
					console.log('PHASE TRANSITION: Deliberation → Action');
					onPhaseComplete();
				}}
				showBack={stage === 'strategy'}
				backLabel="\u2190 Back to Challenge"
				onBack={() => console.log('Back to Challenge phase')}
				onSkip={() => {
					console.log('PHASE SKIP: Skipping deliberation');
					onPhaseComplete();
				}}
				skipLabel="Skip Deliberation"
			/>
		</div>
	);
}
