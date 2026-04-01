import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameSession, ChallengeCard, Player, RoleId } from '../../core/models/types';
import { ROLE_COLORS } from '../../core/models/constants';
import { getZoneConfig, getZoneIdFromEngineId, ZoneObject, ZoneConfig } from '../../core/content/zoneScenes';
import { getRealisticChallenge } from '../../core/content/challengeCards';
import { sounds } from '../../utils/sounds';

// ─── Types ──────────────────────────────────────────────────────
export interface InvestigationResult {
  relevantFound: string[];
  irrelevantClicked: { objectId: string; teachingEffect: string }[];
  totalFound: number;
  teachingMoments: number;
  cpAwarded: Record<string, number>;
}
interface ChallengePhaseProps {
  session: GameSession;
  challenge: ChallengeCard;
  players: Player[];
  onPhaseComplete: (results: InvestigationResult) => void;
}
type Stage = 'intro' | 'card' | 'scene' | 'summary' | 'continue';
type ObjStatus = 'hidden' | 'found_relevant' | 'found_irrelevant';

const TURN_SEC = 15;
const TOTAL_CLUES = 7;
const HINT_MAX = 3;
const HINT_COST = 200;
const SCORE_GAIN = 1500;
const SCORE_LOSS = 500;
const CAT_COLORS: Record<string, string> = {
  ecological: '#3B6D11', infrastructure: '#BA7517', social: '#D85A30', institutional: '#534AB7',
};

const STYLES = `
@keyframes hintGlow{0%,100%{filter:brightness(1) drop-shadow(0 0 0 transparent)}50%{filter:brightness(1.5) drop-shadow(0 0 8px gold)}}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}50%{transform:translateX(3px)}75%{transform:translateX(-3px)}}
@keyframes floatUp{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-25px)}}
@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
@keyframes amberPulse{0%,100%{color:#F59E0B}50%{color:#FCD34D}}
@keyframes redPulse{0%,100%{color:#EF4444}50%{color:#FCA5A5}}
`;

// ─── Inventory slot icons ──────────────────────────────────────
const INVENTORY_ICONS = [
  /* water */  <svg key="w" width="14" height="14" viewBox="0 0 14 14"><path d="M7 2C7 2 3 7 3 9.5a4 4 0 008 0C11 7 7 2 7 2Z" fill="currentColor"/></svg>,
  /* wrench */ <svg key="wr" width="14" height="14" viewBox="0 0 14 14"><path d="M10 2L8 4 10 6 12 4a3 3 0 01-4 4L4 12 2 10l4-4a3 3 0 014-4Z" fill="currentColor"/></svg>,
  /* doc */    <svg key="d" width="14" height="14" viewBox="0 0 14 14"><rect x="3" y="1" width="8" height="12" rx="1" fill="currentColor"/><line x1="5" y1="4" x2="9" y2="4" stroke="#0A1A18" strokeWidth="0.8"/><line x1="5" y1="6.5" x2="9" y2="6.5" stroke="#0A1A18" strokeWidth="0.8"/><line x1="5" y1="9" x2="8" y2="9" stroke="#0A1A18" strokeWidth="0.8"/></svg>,
  /* truck */  <svg key="t" width="14" height="14" viewBox="0 0 14 14"><rect x="1" y="4" width="8" height="6" rx="1" fill="currentColor"/><rect x="9" y="6" width="4" height="4" rx="1" fill="currentColor"/><circle cx="4" cy="11" r="1.2" fill="currentColor"/><circle cx="11" cy="11" r="1.2" fill="currentColor"/></svg>,
  /* flask */  <svg key="f" width="14" height="14" viewBox="0 0 14 14"><rect x="5" y="1" width="4" height="5" rx="1" fill="currentColor"/><polygon points="3,13 11,13 9,6 5,6" fill="currentColor"/></svg>,
  /* person */ <svg key="p" width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="3.5" r="2" fill="currentColor"/><path d="M4 7h6a1 1 0 011 1v4H3V8a1 1 0 011-1Z" fill="currentColor"/></svg>,
  /* leaf */   <svg key="l" width="14" height="14" viewBox="0 0 14 14"><path d="M7 2C4 4 2 8 4 11c1-2 3-4 6-5-1 3-3 5-6 6 4 1 8-2 9-7C12 3 9 1 7 2Z" fill="currentColor"/></svg>,
];

// ─── Detailed photo-crop illustrations for discovery tiles ──────
type IconType = string;
function MiniIcon({ icon }: { icon: IconType }) {
  const s: React.CSSProperties = { width: 52, height: 40 };
  switch (icon) {
    case 'pipe': case 'ramp': case 'pump': case 'regulator': case 'bollard':
      return <svg style={s} viewBox="0 0 52 40">
        <rect width="52" height="40" rx="2" fill="#5A5A50"/>
        <rect x="4" y="14" width="44" height="12" rx="3" fill="url(#pipeGr)"/>
        <defs><linearGradient id="pipeGr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8A8478"/><stop offset="100%" stopColor="#6A6458"/></linearGradient></defs>
        <path d="M18 14 L20 18 L16 21 L19 24 L17 26" stroke="#3A3830" strokeWidth="1.8" fill="none"/>
        <ellipse cx="19" cy="30" rx="6" ry="3" fill="#4A8080" opacity="0.35"/>
        <circle cx="12" cy="16" r="1.5" fill="#5A8A40" opacity="0.4"/><circle cx="38" cy="18" r="1" fill="#5A8A40" opacity="0.3"/>
      </svg>;
    case 'boat':
      return <svg style={s} viewBox="0 0 52 40">
        <rect width="52" height="40" rx="2" fill="#2A4A30"/>
        <ellipse cx="26" cy="34" rx="20" ry="4" fill="#3A5A38" opacity="0.3"/>
        <path d="M12 26 L26 32 L40 26 L36 18 L16 18 Z" fill="#B86050" opacity="0.85"/>
        <line x1="26" y1="10" x2="26" y2="18" stroke="#5A3A2A" strokeWidth="1.5"/>
        <polygon points="26,10 36,16 26,16" fill="#E8E0D8" opacity="0.6"/>
        <line x1="8" y1="20" x2="8" y2="12" stroke="#4A7838" strokeWidth="1.5"/><line x1="44" y1="22" x2="44" y2="14" stroke="#4A7838" strokeWidth="1.5"/>
      </svg>;
    case 'sign': case 'license':
      return <svg style={s} viewBox="0 0 52 40">
        <rect width="52" height="40" rx="2" fill="#5A7A5A"/>
        <g transform="rotate(-3 26 18)"><rect x="10" y="6" width="32" height="22" rx="1.5" fill="#E8DCC0" stroke="#8A8070" strokeWidth="0.5"/></g>
        {[11,15,19,23].map(y=><line key={y} x1="16" y1={y} x2="36" y2={y} stroke="#888" strokeWidth="0.8" opacity="0.4"/>)}
        <line x1="26" y1="28" x2="26" y2="38" stroke="#6A5A48" strokeWidth="2.5"/>
      </svg>;
    case 'closet': case 'box':
      return <svg style={s} viewBox="0 0 52 40">
        <circle cx="14" cy="16" r="10" fill="#5A8A4E" opacity="0.6"/><circle cx="38" cy="14" r="8" fill="#4A7A3E" opacity="0.5"/><circle cx="26" cy="22" r="12" fill="#6B8E4E" opacity="0.4"/>
        <rect x="16" y="8" width="20" height="28" rx="2" fill="#4A5A48"/>
        <circle cx="30" cy="22" r="2" fill="#888" opacity="0.7"/><line x1="26" y1="8" x2="26" y2="36" stroke="#3A4A38" strokeWidth="0.8"/>
      </svg>;
    case 'grate': case 'channel':
      return <svg style={s} viewBox="0 0 52 40">
        <rect width="52" height="40" rx="2" fill="#5A5040"/>
        <circle cx="26" cy="20" r="14" fill="#3E3E3E" stroke="#5A5A50" strokeWidth="1.5"/>
        <line x1="26" y1="6" x2="26" y2="34" stroke="#5A5A50" strokeWidth="1.5"/><line x1="12" y1="20" x2="40" y2="20" stroke="#5A5A50" strokeWidth="1.5"/>
        <line x1="16" y1="10" x2="36" y2="30" stroke="#5A5A50" strokeWidth="0.8"/><line x1="36" y1="10" x2="16" y2="30" stroke="#5A5A50" strokeWidth="0.8"/>
        <ellipse cx="20" cy="34" rx="8" ry="2" fill="#4A8080" opacity="0.2"/>
      </svg>;
    case 'flask':
      return <svg style={s} viewBox="0 0 52 40">
        <rect width="26" height="40" rx="2" fill="#4A6A3A"/><rect x="26" width="26" height="40" rx="2" fill="#2A4A3A"/>
        <rect x="20" y="4" width="12" height="14" rx="1.5" fill="#AAA"/><polygon points="16,36 36,36 32,18 20,18" fill="#5A9AB4" opacity="0.65"/>
        <rect x="18" y="3" width="16" height="3" rx="1" fill="#8A8A8A"/>
        <circle cx="26" cy="28" r="2" fill="#78B4D0" opacity="0.4"/>
      </svg>;
    case 'map': case 'folder': case 'report':
      return <svg style={s} viewBox="0 0 52 40">
        <rect width="52" height="40" rx="2" fill="#C8C0A8"/>
        <rect x="6" y="4" width="40" height="32" rx="1" fill="#F0E8D0" stroke="#B0A890" strokeWidth="0.5"/>
        <line x1="10" y1="12" x2="34" y2="12" stroke="#4682B4" strokeWidth="1" opacity="0.5"/>
        <line x1="10" y1="18" x2="38" y2="18" stroke="#4682B4" strokeWidth="0.8" opacity="0.35"/>
        <line x1="10" y1="24" x2="30" y2="24" stroke="#4682B4" strokeWidth="0.8" opacity="0.25"/>
        <circle cx="36" cy="12" r="3" fill="#C04040" opacity="0.7"/>
      </svg>;
    case 'lamp':
      return <svg style={s} viewBox="0 0 52 40">
        <rect width="52" height="40" rx="2" fill="#4A6A4A"/>
        <line x1="26" y1="10" x2="26" y2="36" stroke="#8B5E3C" strokeWidth="3"/>
        <circle cx="26" cy="8" r="6" fill="#FFE070" opacity="0.5"/><circle cx="26" cy="8" r="3.5" fill="#FFE070" opacity="0.8"/>
        <rect x="22" y="34" width="8" height="4" rx="1" fill="#5A4A3A"/>
      </svg>;
    case 'booth': case 'counter':
      return <svg style={s} viewBox="0 0 52 40">
        <rect width="52" height="40" rx="2" fill="#5A7A5A"/>
        <rect x="8" y="10" width="36" height="26" rx="2" fill="#CD853F"/><rect x="12" y="14" width="16" height="10" rx="1" fill="#87CEEB" opacity="0.4"/>
        <rect x="8" y="4" width="36" height="8" rx="1.5" fill="#A06830"/>
        <rect x="30" y="20" width="10" height="5" rx="1" fill="#CC3030" opacity="0.5"/>
      </svg>;
    case 'graffiti': case 'mural':
      return <svg style={s} viewBox="0 0 52 40">
        <rect width="52" height="40" rx="2" fill="#7A7068"/>
        <rect x="6" y="6" width="14" height="18" rx="1" fill="#FF6347" opacity="0.65"/>
        <rect x="22" y="10" width="10" height="24" rx="1" fill="#4488FF" opacity="0.55"/>
        <rect x="34" y="4" width="12" height="14" rx="1" fill="#FFD700" opacity="0.5"/>
        <path d="M8 28 Q16 20 24 30" stroke="#44DD44" strokeWidth="2" fill="none" opacity="0.4"/>
      </svg>;
    case 'bench': case 'tile':
      return <svg style={s} viewBox="0 0 52 40">
        <rect width="52" height="40" rx="2" fill="#5A7A4A"/>
        <g transform="rotate(-4 26 20)"><rect x="6" y="16" width="40" height="5" rx="1" fill="#8B4513"/><rect x="6" y="12" width="40" height="4" rx="1" fill="#A0522D"/></g>
        <line x1="12" y1="21" x2="12" y2="34" stroke="#6A3010" strokeWidth="2.5"/>
        <line x1="40" y1="21" x2="40" y2="32" stroke="#6A3010" strokeWidth="2.5"/>
        <line x1="6" y1="34" x2="46" y2="36" stroke="#4A6A3A" strokeWidth="0.5" opacity="0.3"/>
      </svg>;
    case 'rules': case 'petition':
      return <svg style={s} viewBox="0 0 52 40">
        <rect width="52" height="40" rx="2" fill="#5A6A5A"/>
        <rect x="8" y="4" width="36" height="30" rx="1.5" fill="#228B22" opacity="0.75"/>
        {[9,13,17,21,25,29].map(yy=><line key={yy} x1="12" y1={yy} x2="40" y2={yy} stroke="#FFF" strokeWidth="0.7" opacity="0.4"/>)}
        <circle cx="26" cy="7" r="2.5" fill="#FFD700" opacity="0.4"/>
        <line x1="26" y1="34" x2="26" y2="40" stroke="#5A4A3A" strokeWidth="2.5"/>
      </svg>;
    default:
      return <svg style={s} viewBox="0 0 52 40"><rect width="52" height="40" rx="2" fill="#4A5A4A"/><text x="26" y="24" textAnchor="middle" fontSize="14" fill="#808878">?</text></svg>;
  }
}

function DiffDots({ n, max = 5 }: { n: number; max?: number }) {
  return <span style={{ letterSpacing: 3, fontSize: 14 }}>
    {Array.from({ length: max }, (_, i) => (
      <span key={i} style={{ color: i < n ? '#F59E0B' : '#4B5563' }}>{i < n ? '\u25CF' : '\u25CB'}</span>
    ))}
  </span>;
}

// ─── Main Component ──────────────────────────────────────────────
export function ChallengePhase({ session, challenge, players, onPhaseComplete }: ChallengePhaseProps) {
  const [stage, setStage] = useState<Stage>('intro');
  const [statuses, setStatuses] = useState<Record<number, ObjStatus>>({});
  const [score, setScore] = useState(0);
  const [hintsLeft, setHintsLeft] = useState(HINT_MAX);
  const [hintIdx, setHintIdx] = useState<number | null>(null);
  const [activePanel, setActivePanel] = useState<{ obj: ZoneObject; relevant: boolean } | null>(null);
  const [scoreFloats, setScoreFloats] = useState<{ id: number; val: number; x: number; y: number }[]>([]);
  const [shakeIdx, setShakeIdx] = useState<number | null>(null);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [timer, setTimer] = useState(TURN_SEC);
  const [isMuted, setIsMuted] = useState(sounds.getIsMuted());
  const [distracted, setDistracted] = useState(false);
  const [awarenessBonus, setAwarenessBonus] = useState(false);
  const floatCounter = useRef(0);

  // Resolve zone
  const engineZoneId = challenge.affectedZoneIds?.[0] || 'boating_pond';
  const zoneId = useMemo(() => getZoneIdFromEngineId(engineZoneId), [engineZoneId]);
  const zone = useMemo(() => getZoneConfig(zoneId), [zoneId]);
  const realistic = useMemo(() => getRealisticChallenge(engineZoneId), [engineZoneId]);

  const relevantObjects = useMemo(() => zone.objects.filter(o => o.relevant), [zone]);
  const sortedPlayers = useMemo(() => [...players].sort((a, b) => a.utilityScore - b.utilityScore), [players]);
  const currentPlayer = sortedPlayers[currentPlayerIdx] || players[0];

  const foundRelevant = useMemo(() =>
    zone.objects.filter(o => o.relevant && statuses[o.idx] === 'found_relevant'), [zone, statuses]);
  const foundIrrelevant = useMemo(() =>
    zone.objects.filter(o => !o.relevant && statuses[o.idx] === 'found_irrelevant'), [zone, statuses]);

  // Intro auto-advance
  useEffect(() => {
    if (stage === 'intro') {
      const t = setTimeout(() => setStage('card'), 1500);
      return () => clearTimeout(t);
    }
  }, [stage]);

  // Turn timer
  useEffect(() => {
    if (stage !== 'scene' || activePanel) return;
    if (timer <= 0) { advancePlayer(); return; }
    if (timer <= 3) sounds.playTimerTick();
    const t = setInterval(() => setTimer(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [stage, timer, activePanel]);

  // Continue stage fires callback
  useEffect(() => {
    if (stage === 'continue') {
      const results: InvestigationResult = {
        relevantFound: foundRelevant.map(o => o.name),
        irrelevantClicked: foundIrrelevant.map(o => ({
          objectId: o.name,
          teachingEffect: o.meaning || '',
        })),
        totalFound: foundRelevant.length,
        teachingMoments: foundIrrelevant.length,
        cpAwarded: Object.fromEntries(sortedPlayers.map(p => [p.id, Math.floor(foundRelevant.length * 0.5)])),
      };
      onPhaseComplete(results);
    }
  }, [stage]);

  const advancePlayer = useCallback(() => {
    const next = currentPlayerIdx + 1;
    if (next >= sortedPlayers.length) {
      setStage('summary');
    } else {
      setCurrentPlayerIdx(next);
      setTimer(TURN_SEC);
      setDistracted(false);
      setAwarenessBonus(false);
    }
  }, [currentPlayerIdx, sortedPlayers.length]);

  function addFloat(val: number, x: number, y: number) {
    const id = ++floatCounter.current;
    setScoreFloats(p => [...p, { id, val, x, y }]);
    setTimeout(() => setScoreFloats(p => p.filter(f => f.id !== id)), 900);
  }

  function handleObjectClick(obj: ZoneObject) {
    if (activePanel) { console.log('PHASE4_BLOCKED: panel is showing, ignoring click on', obj.name); return; }
    if (statuses[obj.idx] !== undefined) { console.log('PHASE4_BLOCKED: already found', obj.name); return; }
    console.log('PHASE4_FOUND:', obj.name, 'relevant:', obj.relevant, 'zone:', zone.id, 'player:', currentPlayer?.id);

    if (obj.relevant) {
      sounds.playTokenGain();
      setStatuses(p => ({ ...p, [obj.idx]: 'found_relevant' }));
      setScore(p => p + SCORE_GAIN);
      addFloat(SCORE_GAIN, obj.x, obj.y);
      setActivePanel({ obj, relevant: true });
    } else {
      sounds.playTokenLoss();
      setStatuses(p => ({ ...p, [obj.idx]: 'found_irrelevant' }));
      setScore(p => Math.max(0, p - SCORE_LOSS));
      addFloat(-SCORE_LOSS, obj.x, obj.y);
      setShakeIdx(obj.idx);
      setTimeout(() => setShakeIdx(null), 450);
      // Apply consequence effect
      if (obj.consequence === 'timer' && obj.timerLoss) {
        setTimer(p => Math.max(0, p - obj.timerLoss!));
      } else if (obj.consequence === 'distracted') {
        setDistracted(true);
      } else if (obj.consequence === 'awareness') {
        setAwarenessBonus(true);
      }
      setActivePanel({ obj, relevant: false });
    }
  }

  function dismissPanel() {
    const wasRelevant = activePanel?.relevant;
    setActivePanel(null);
    if (wasRelevant) advancePlayer(); // Relevant = turn ends
  }

  function useHint() {
    if (hintsLeft <= 0) return;
    const undiscovered = zone.objects.filter(o => o.relevant && statuses[o.idx] === undefined);
    if (undiscovered.length === 0) return;
    const target = undiscovered[Math.floor(Math.random() * undiscovered.length)];
    setHintsLeft(p => p - 1);
    setScore(p => Math.max(0, p - HINT_COST));
    setHintIdx(target.idx);
    setTimeout(() => setHintIdx(null), 2000);
  }

  const qualityLabel = foundRelevant.length >= 7 ? 'Complete' : foundRelevant.length >= 5 ? 'Thorough' : foundRelevant.length >= 3 ? 'Partial' : 'Incomplete';
  const qualityColor = foundRelevant.length >= 7 ? '#A4C639' : foundRelevant.length >= 5 ? '#C8E060' : foundRelevant.length >= 3 ? '#D8C848' : '#DC8C28';
  const catColor = realistic?.categoryColor || CAT_COLORS[challenge.category] || '#3B6D11';
  const diffDots = realistic?.difficultyDots || challenge.publicFace?.difficultyRating || 3;

  // ─── RENDER ────────────────────────────────────────────────────
  return (
    <div style={{ width: '100%', height: '100vh', background: '#0A1A18', color: '#C8E060', fontFamily: "'Inter','Segoe UI',sans-serif", overflow: 'hidden', position: 'relative' }}>
      <style>{STYLES}</style>
      <AnimatePresence mode="wait">

        {/* ═══ INTRO ═══ */}
        {stage === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A1A18', zIndex: 60 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#808878', letterSpacing: 3, marginBottom: 8 }}>PHASE 2</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#A4C639' }}>Investigate</div>
            </div>
          </motion.div>
        )}

        {/* ═══ CARD ═══ */}
        {stage === 'card' && (
          <motion.div key="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,20,16,0.95)', zIndex: 60 }}>
            <div style={{ background: '#0E1E18', borderRadius: 12, maxWidth: 520, width: '90%', padding: 28, borderLeft: `4px solid ${catColor}` }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                <span style={{ background: catColor, color: '#FFF', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, textTransform: 'uppercase' }}>
                  {realistic?.zoneName || zone.title}
                </span>
                <DiffDots n={diffDots} />
              </div>
              <h2 style={{ color: '#E8F0E0', fontSize: 22, fontWeight: 700, margin: '0 0 12px' }}>
                {realistic?.name || challenge.name}
              </h2>
              <p style={{ color: '#C0C8B8', fontSize: 14, lineHeight: 1.7, margin: '0 0 14px' }}>
                {realistic?.description || challenge.description}
              </p>
              {realistic?.realWorldSource && (
                <p style={{ color: '#808878', fontSize: 12, fontStyle: 'italic', margin: '0 0 20px' }}>
                  Source: {realistic.realWorldSource}
                </p>
              )}
              <button onClick={() => { sounds.playButtonClick(); setStage('scene'); }}
                style={{ background: '#A4C639', color: '#0A1A18', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                Enter Zone &rarr;
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══ SCENE ═══ */}
        {stage === 'scene' && (
          <motion.div key="scene" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>

            {/* TOP HEADER — 48px fixed z-50 */}
            <div style={{ height: 48, background: 'rgba(14,28,22,0.95)', borderBottom: '1px solid rgba(164,198,57,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 50, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="20" height="20" viewBox="0 0 20 20"><path d="M10 2 C6 6 2 10 6 16 C8 18 12 18 14 16 C18 10 14 6 10 2Z" fill="#A4C639"/></svg>
                <span style={{ color: '#C8E060', fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: 1.5 }}>{zone.title}</span>
              </div>
              <svg width="20" height="20" viewBox="0 0 20 20" style={{ cursor: 'pointer', opacity: 0.5 }}>
                <circle cx="10" cy="10" r="8" fill="none" stroke="#808878" strokeWidth="1.5"/>
                <circle cx="10" cy="10" r="3" fill="#808878"/>
              </svg>
            </div>

            {/* MAIN SCENE AREA — atmospheric depth */}
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const nx = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
                const ny = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
                console.log('PHASE4_SCENE_CLICK:', { x: nx + '%', y: ny + '%', target: (e.target as HTMLElement).tagName });
              }}
              style={{ flex: 1, position: 'relative', background: `radial-gradient(ellipse at 50% 45%, #1E3328 0%, #162822 40%, #0E1C16 75%, #080E0A 100%)`, overflow: 'hidden' }}>

              {/* Vignette overlay — darkens edges, focuses eye on center */}
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 40%, rgba(8,14,10,0.6) 100%)', pointerEvents: 'none', zIndex: 1 }} />

              {/* Floating leaf glyphs — decorative */}
              {[{x:8,y:30,r:25,o:0.15},{x:85,y:18,r:-40,o:0.12},{x:92,y:65,r:55,o:0.18},{x:12,y:78,r:-15,o:0.13}].map((l,i)=>(
                <svg key={`leaf${i}`} style={{position:'absolute',left:`${l.x}%`,top:`${l.y}%`,transform:`rotate(${l.r}deg)`,opacity:l.o,pointerEvents:'none',zIndex:1}} width="16" height="16" viewBox="0 0 16 16">
                  <path d="M8 1C5 4 2 8 5 13c1-2 3-5 6-6-1 3-3 6-6 7 4 1 8-3 9-8C13 3 10 0 8 1Z" fill="#4A6A38"/>
                </svg>
              ))}

              {/* Decorative leaf diamond — top-left */}
              <div style={{ position: 'absolute', top: '12%', left: '3%', width: 70, height: 70, transform: 'rotate(45deg)', background: `repeating-radial-gradient(circle at 50% 50%, #2A4A38 0px, #1A3A28 4px, #345A42 8px, #2A4A38 12px)`, opacity: 0.5, borderRadius: 4, pointerEvents: 'none', zIndex: 1 }} />

              {/* ISOMETRIC ISLAND DIORAMA (SVG) */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2 }}>
                <svg viewBox="0 0 500 400" width="520" height="420" style={{ overflow: 'visible' }}>
                  <defs>
                    <radialGradient id="grassGrad" cx="45%" cy="40%" r="65%">
                      <stop offset="0%" stopColor={zone.islandGrass} />
                      <stop offset="60%" stopColor={zone.islandGrass} stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#2A5018" stopOpacity="0.7" />
                    </radialGradient>
                    <radialGradient id="waterReflect" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#3A6A50" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                  </defs>

                  {/* Water reflections */}
                  <ellipse cx="250" cy="290" rx="200" ry="40" fill="url(#waterReflect)" />
                  <ellipse cx="180" cy="310" rx="60" ry="15" fill="rgba(60,100,70,0.08)" />

                  {/* Front face (earth/dirt) */}
                  <path d="M50,200 L250,300 L450,200 L450,235 L250,335 L50,235 Z" fill={zone.islandSide} />
                  {/* Left face (earth, slightly lighter) */}
                  <path d="M50,200 L50,235 L250,335 L250,300 Z" fill={zone.islandSide} style={{ filter: 'brightness(1.2)' }} />
                  {/* Top face (grass surface) */}
                  <path d="M50,200 L250,100 L450,200 L250,300 Z" fill="url(#grassGrad)" />
                  {/* Grass texture dots */}
                  {[{x:150,y:170},{x:200,y:200},{x:300,y:180},{x:350,y:210},{x:180,y:230},{x:280,y:240},{x:250,y:160},{x:120,y:200},{x:380,y:195},{x:320,y:165}].map((d,i)=>(
                    <circle key={`gd${i}`} cx={d.x} cy={d.y} r="1.5" fill="#2A5018" opacity="0.25"/>
                  ))}

                  {/* Wooden T-Dock */}
                  {zone.hasWater && <g>
                    {/* Main plank section */}
                    <polygon points="370,215 425,188 432,192 377,219" fill="#5A4020" />
                    <polygon points="373,219 428,192 432,195 377,222" fill="#7A5830" />
                    {/* Plank lines */}
                    {[0,1,2,3,4].map(i=><line key={`pl${i}`} x1={375+i*11} y1={218-i*5} x2={378+i*11} y2={220-i*5} stroke="#3A2810" strokeWidth="0.5" />)}
                    {/* Cross plank */}
                    <polygon points="405,195 420,188 428,192 413,199" fill="#6A4828" />
                    {/* Support posts */}
                    {[{x:382,y:222},{x:400,y:212},{x:418,y:202},{x:410,y:200}].map((p,i)=>(
                      <rect key={`sp${i}`} x={p.x} y={p.y} width="3" height={8+i*2} fill="#2A1808" rx="0.5" />
                    ))}
                  </g>}

                  {/* Reed/marsh grass clusters */}
                  {[{cx:75,cy:198},{cx:425,cy:198},{cx:120,cy:155},{cx:380,cy:255},{cx:250,cy:295},{cx:160,cy:250}].map((cl,ci)=>(
                    <g key={`rc${ci}`}>
                      {Array.from({length:7},(_,ri)=>(
                        <rect key={ri} x={cl.cx+(ri-3)*3} y={cl.cy-22-ri*4} width={1.5+Math.random()} height={20+ri*4}
                          fill={ri%2?'#4A7838':'#5A8A48'} opacity={0.6+Math.random()*0.3}
                          transform={`rotate(${(ri-3)*5} ${cl.cx+(ri-3)*3} ${cl.cy})`} rx="0.5"/>
                      ))}
                    </g>
                  ))}

                  {/* Lily pads (water zones) */}
                  {zone.hasWater && <>
                    {[{x:140,y:240,r:10},{x:195,y:268,r:12},{x:310,y:250,r:9},{x:355,y:225,r:11},{x:270,y:280,r:8},{x:100,y:260,r:7}].map((lp,i)=>(
                      <g key={`lp${i}`}>
                        <circle cx={lp.x} cy={lp.y} r={lp.r} fill="#3A6830" opacity="0.6" />
                        <circle cx={lp.x+1} cy={lp.y-1} r={lp.r*0.6} fill="#4A7840" opacity="0.3" />
                      </g>
                    ))}
                    {/* Lily flower */}
                    <circle cx="310" cy="248" r="3" fill="#FFFFCC" opacity="0.7" />
                    <circle cx="310" cy="248" r="1.5" fill="#FFE060" opacity="0.8" />
                  </>}
                </svg>
              </div>

              {/* DISCOVERY SQUARES */}
              {zone.objects.map(obj => {
                const st = statuses[obj.idx];
                const isHint = hintIdx === obj.idx;
                const isShaking = shakeIdx === obj.idx;
                const borderColor = st === 'found_relevant' ? '#A4C639'
                  : st === 'found_irrelevant' ? '#DC8C28'
                  : 'transparent';
                const shadow = st === 'found_relevant' ? '0 0 12px rgba(164,198,57,0.3)'
                  : st === 'found_irrelevant' ? '0 0 10px rgba(220,140,40,0.25)'
                  : '0 2px 6px rgba(0,0,0,0.3)';

                return (
                  <motion.div key={obj.idx}
                    whileTap={!st ? { scale: [1, 1.08, 1] } : {}}
                    transition={{ duration: 0.2 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('PHASE4_CLICK:', obj.name, 'status:', st || 'hidden', 'relevant:', obj.relevant);
                      if (!st) handleObjectClick(obj);
                      else console.log('PHASE4_ALREADY_FOUND:', obj.name);
                    }}
                    style={{
                      position: 'absolute', left: `${obj.x}%`, top: `${obj.y}%`,
                      width: 65, height: 55, minWidth: 44, minHeight: 44,
                      transform: `translate(-50%, -50%) rotate(${obj.rot}deg)`,
                      animation: isHint ? 'hintGlow 0.5s ease 4' : isShaking ? 'shake 0.15s ease 3' : undefined,
                      background: 'rgba(30,50,40,0.6)',
                      backdropFilter: 'blur(2px)',
                      border: `2px solid ${borderColor}`,
                      borderRadius: 4,
                      cursor: 'pointer',
                      pointerEvents: 'auto',
                      boxShadow: shadow,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden',
                      transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                      zIndex: 10,
                    }}
                    onMouseEnter={e => {
                      if (!st) {
                        (e.currentTarget as HTMLDivElement).style.transform = `translate(-50%,-50%) rotate(${obj.rot}deg) translateY(-3px) scale(1.03)`;
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(164,198,57,0.15)';
                        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!st) {
                        (e.currentTarget as HTMLDivElement).style.transform = `translate(-50%,-50%) rotate(${obj.rot}deg)`;
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent';
                        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
                      }
                    }}
                  >
                    <MiniIcon icon={obj.icon} />
                  </motion.div>
                );
              })}

              {/* Score floats */}
              {scoreFloats.map(f => (
                <div key={f.id} style={{
                  position: 'absolute', left: `${f.x}%`, top: `${f.y}%`, color: f.val > 0 ? '#A4C639' : '#DC8C28',
                  fontWeight: 700, fontSize: 16, pointerEvents: 'none', animation: 'floatUp 0.8s ease forwards', zIndex: 40,
                }}>
                  {f.val > 0 ? '+' : ''}{f.val}
                </div>
              ))}

              {/* Player HUD — top-left pill */}
              {currentPlayer && (
                <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(14,28,22,0.85)', border: '1px solid rgba(164,198,57,0.15)', borderRadius: 8, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 8, zIndex: 20 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: ROLE_COLORS[currentPlayer.roleId] || '#666', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, color: '#C8E060', fontWeight: 600 }}>{currentPlayer.name}</div>
                    <div style={{ fontSize: 8, color: '#808878', textTransform: 'uppercase' }}>{currentPlayer.roleId}</div>
                  </div>
                </div>
              )}

              {/* Timer pill — top-center */}
              <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(14,28,22,0.85)', border: '1px solid rgba(164,198,57,0.15)', borderRadius: 8, padding: '4px 14px', textAlign: 'center', zIndex: 20 }}>
                <div style={{
                  fontSize: 24, fontWeight: 700, color: '#FFD700',
                  animation: timer <= 3 ? 'redPulse 0.5s ease infinite' : timer <= 5 ? 'amberPulse 0.8s ease infinite' : undefined,
                }}>
                  {timer}
                </div>
                <DiffDots n={diffDots} />
              </div>

              {/* Done button — top-right area */}
              <button onClick={advancePlayer}
                style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(14,28,22,0.85)', border: '1px solid rgba(164,198,57,0.15)', borderRadius: 8, padding: '6px 14px', color: '#808878', fontSize: 12, fontWeight: 600, cursor: 'pointer', zIndex: 20 }}>
                Done
              </button>

              {/* CLUE / CONSEQUENCE PANEL */}
              <AnimatePresence>
                {activePanel && (
                  <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
                    style={{ position: 'absolute', bottom: 120, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 480, background: 'rgba(14,28,22,0.95)', borderRadius: 8, padding: 20, borderLeft: `3px solid ${activePanel.relevant ? '#A4C639' : '#DC8C28'}`, zIndex: 45, boxShadow: '0 -4px 30px rgba(0,0,0,0.5)' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ background: activePanel.relevant ? '#A4C639' : '#DC8C28', color: activePanel.relevant ? '#1A2A22' : '#1A2A22', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                        {activePanel.relevant ? 'ROOT CAUSE' : activePanel.obj.title}
                      </span>
                      {activePanel.relevant && (
                        <span style={{ color: '#A4C639', fontSize: 11, fontWeight: 600 }}>+1 CP</span>
                      )}
                    </div>
                    <h3 style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>
                      {activePanel.obj.title}
                    </h3>
                    <p style={{ color: '#C0C8B8', fontSize: 13, lineHeight: 1.7, margin: '0 0 10px' }}>
                      {activePanel.obj.body}
                    </p>
                    {activePanel.relevant && activePanel.obj.resourceHint && (
                      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: 8, marginBottom: 8, fontSize: 12, color: '#A4C639' }}>
                        Resource needed: {activePanel.obj.resourceHint}
                      </div>
                    )}
                    {activePanel.obj.meaning && (
                      <p style={{ color: '#808878', fontSize: 12, fontStyle: 'italic', margin: '0 0 12px' }}>
                        {activePanel.obj.meaning}
                      </p>
                    )}
                    <button onClick={dismissPanel}
                      style={{ background: activePanel.relevant ? '#A4C639' : 'rgba(220,140,40,0.2)', color: activePanel.relevant ? '#1A2A22' : '#DC8C28', border: activePanel.relevant ? 'none' : '1px solid rgba(220,140,40,0.4)', borderRadius: 6, padding: '6px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      Got it
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Seedling brand mark — bottom-left */}
              <div style={{ position: 'absolute', bottom: 12, left: 12, opacity: 0.5, zIndex: 5 }}>
                <svg width="28" height="28" viewBox="0 0 28 28"><path d="M14 4C10 8 6 14 10 22C12 24 16 24 18 22C22 14 18 8 14 4Z" fill="#A4C639"/></svg>
              </div>
            </div>

            {/* BOTTOM DASHBOARD — 100px fixed z-50 */}
            <div style={{ height: 100, flexShrink: 0, zIndex: 50, display: 'flex', flexDirection: 'column', borderTop: '1px solid rgba(164,198,57,0.06)' }}>
              {/* Row 1: Inventory slots */}
              <div style={{ height: 36, background: 'rgba(14,28,22,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {INVENTORY_ICONS.map((icon, i) => {
                  const found = i < relevantObjects.length && statuses[relevantObjects[i].idx] === 'found_relevant';
                  return (
                    <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: found ? '#A4C639' : '#505850', opacity: found ? 1 : 0.3, transition: 'all 0.3s', border: found ? '1px solid rgba(164,198,57,0.3)' : '1px solid transparent' }}>
                      {icon}
                    </div>
                  );
                })}
              </div>

              {/* Row 2: Score / Hint / Sound+Exit */}
              <div style={{ flex: 1, background: 'rgba(20,30,26,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
                {/* Score */}
                <div>
                  <div style={{ fontSize: 9, color: '#A4C639', letterSpacing: 2, fontWeight: 600 }}>SCORE</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#FFD700' }}>{score.toLocaleString()}</div>
                </div>

                {/* Hint */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {Array.from({ length: HINT_MAX }, (_, i) => (
                      <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: i < hintsLeft ? '#E8D040' : 'transparent', border: i < hintsLeft ? 'none' : '1px solid #505850' }} />
                    ))}
                  </div>
                  <button onClick={useHint} disabled={hintsLeft <= 0}
                    style={{ width: 72, height: 44, background: hintsLeft > 0 ? '#A4C639' : '#3A4A38', borderRadius: 10, border: 'none', cursor: hintsLeft > 0 ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="#1A2A22">
                      <circle cx="10" cy="7" r="5" fill="none" stroke="#1A2A22" strokeWidth="1.5"/>
                      <line x1="10" y1="12" x2="10" y2="16" stroke="#1A2A22" strokeWidth="1.5"/>
                      <line x1="7" y1="16" x2="13" y2="16" stroke="#1A2A22" strokeWidth="1.5"/>
                      <line x1="8" y1="18" x2="12" y2="18" stroke="#1A2A22" strokeWidth="1.2"/>
                    </svg>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#1A2A22' }}>HINT</span>
                  </button>
                </div>

                {/* Sound + Exit */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <button onClick={() => { if (isMuted) { sounds.unmute(); setIsMuted(false); } else { sounds.mute(); setIsMuted(true); } }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: '#808878' }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#808878" strokeWidth="1.5">
                      <polygon points="2,7 6,7 10,3 10,15 6,11 2,11" fill="#808878" stroke="none"/>
                      {!isMuted && <>
                        <path d="M12 6.5c1 1 1 4 0 5" /><path d="M14 4.5c2 2 2 7 0 9" />
                      </>}
                      {isMuted && <line x1="2" y1="2" x2="16" y2="16" stroke="#808878" strokeWidth="1.5"/>}
                    </svg>
                    <span style={{ fontSize: 8, color: '#808878', fontWeight: 600 }}>SOUND</span>
                  </button>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: '#808878', opacity: 0.5 }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#808878" strokeWidth="1.5">
                      <path d="M4 4L14 14M14 4L4 14"/>
                    </svg>
                    <span style={{ fontSize: 8, fontWeight: 600 }}>EXIT</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ SUMMARY ═══ */}
        {stage === 'summary' && (
          <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,20,16,0.95)', zIndex: 60 }}>
            <div style={{ background: '#0E1E18', borderRadius: 12, maxWidth: 440, width: '90%', padding: 28, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#808878', letterSpacing: 2, marginBottom: 6 }}>INVESTIGATION COMPLETE</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: qualityColor, marginBottom: 16 }}>
                {qualityLabel}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#A4C639' }}>{foundRelevant.length}</div>
                  <div style={{ fontSize: 11, color: '#808878' }}>Found</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#808878' }}>{TOTAL_CLUES - foundRelevant.length}</div>
                  <div style={{ fontSize: 11, color: '#808878' }}>Missed</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#FFD700' }}>{score.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: '#808878' }}>Score</div>
                </div>
              </div>
              {foundRelevant.length >= 7 && (
                <p style={{ color: '#A4C639', fontSize: 13, marginBottom: 12, fontWeight: 600 }}>
                  Complete investigation! +2 CP bonus for all players.
                </p>
              )}
              {TOTAL_CLUES - foundRelevant.length > 0 && (
                <p style={{ color: '#808878', fontSize: 12, marginBottom: 16 }}>
                  Missing clues may reduce options during deliberation and increase challenge difficulty.
                </p>
              )}
              <button onClick={() => { sounds.playButtonClick(); setStage('continue'); }}
                style={{ background: '#A4C639', color: '#1A2A22', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                Continue to Phase 3 &rarr;
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ChallengePhase;
