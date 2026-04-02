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
type Stage = 'card' | 'scene' | 'summary' | 'continue';

// ─── Constants ──────────────────────────────────────────────────
const TURN_SEC = 15;
const TOTAL_CLUES = 7;
const SCORE_GAIN = 150;
const SCORE_LOSS = 0;
const HINT_MAX = 2;
const WOOD = 'linear-gradient(135deg,#3d2b1f 0%,#5c3d2e 30%,#4a3222 60%,#3d2b1f 100%)';
const WOOD_L = 'linear-gradient(135deg,#6b4c3b 0%,#8b6c55 50%,#6b4c3b 100%)';
const CAT_COLORS: Record<string, string> = {
  ecological: '#3B6D11', infrastructure: '#BA7517', social: '#D85A30', institutional: '#534AB7',
};

// Puzzle piece types for the 7 relevant clues
const PUZZLE_PIECES = ['CAUSE', 'IMPACT', 'SYSTEM', 'RESOURCE', 'CASCADE', 'EVIDENCE', 'NETWORK'];
const PIECE_COLORS = ['#e74c3c', '#f39c12', '#9b59b6', '#2ecc71', '#3498db', '#1abc9c', '#e67e22'];

// Map zone objects to puzzle pieces based on clue type
function getPuzzlePiece(obj: ZoneObject, idx: number): { piece: string; color: string } {
  if (!obj.relevant) return { piece: '', color: '#888' };
  const i = Math.min(idx, PUZZLE_PIECES.length - 1);
  return { piece: PUZZLE_PIECES[i], color: PIECE_COLORS[i] };
}

// Emoji icons for zone objects based on their icon type
const ICON_MAP: Record<string, string> = {
  pipe: '\u{1F527}', boat: '\u{1F9F8}', sign: '\u{1FAA7}', closet: '\u{1F6AA}',
  grate: '\u2699\uFE0F', flask: '\u{1F9EA}', map: '\u{1F5FA}\uFE0F', lamp: '\u{1F3EE}',
  booth: '\u{1F3AA}', graffiti: '\u{1F3A8}', bench: '\u{1FA91}', rules: '\u{1F4CB}',
  ramp: '\u{1F527}', pump: '\u{1F527}', regulator: '\u{1F527}', license: '\u{1FAA7}',
  channel: '\u2699\uFE0F', folder: '\u{1F5FA}\uFE0F', report: '\u{1F5FA}\uFE0F',
  counter: '\u{1F3AA}', mural: '\u{1F3A8}', tile: '\u{1FA91}', petition: '\u{1F4CB}',
  box: '\u{1F6AA}', cctv: '\u{1F4F7}', cart: '\u{1F6D2}', cooler: '\u2744\uFE0F',
  flag: '\u{1F6A9}', plaque: '\u{1F4DC}', droppings: '\u26A0\uFE0F',
  bollard: '\u{1F527}',
};

function getEmoji(icon: string): string {
  return ICON_MAP[icon] || '\u2753';
}

// ─── 3D Object Tile ─────────────────────────────────────────────
function Obj3D({ obj, emoji, onClick, found, disabled, puzzlePiece, pieceColor }: {
  obj: ZoneObject; emoji: string; onClick: (o: ZoneObject) => void;
  found: boolean; disabled: boolean; puzzlePiece: string; pieceColor: string;
}) {
  const [hov, setHov] = useState(false);
  if (found) return null;
  const sz = 54 * (obj.rot ? (1 + Math.abs(obj.rot) * 0.005) : 1);
  return (
    <div
      onClick={(e) => { e.stopPropagation(); if (!disabled) { console.log('PHASE4_CLICK:', obj.name, 'relevant:', obj.relevant); onClick(obj); } }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: 'absolute', left: `${obj.x}%`, top: `${obj.y}%`,
        transform: `translate(-50%,-50%) perspective(300px) rotateY(${obj.rot || 0}deg) rotateX(${hov ? -8 : 3}deg) scale(${hov && !disabled ? 1.2 : 1})`,
        cursor: disabled ? 'not-allowed' : 'pointer', zIndex: hov ? 30 : 10 + Math.floor(obj.y / 5),
        transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)', opacity: disabled ? 0.6 : 1,
        filter: hov ? 'brightness(1.15)' : 'none', pointerEvents: 'auto',
      }}
    >
      <div style={{
        width: sz, height: sz, borderRadius: 8,
        background: 'linear-gradient(145deg,rgba(60,40,25,0.92),rgba(40,28,18,0.95))',
        border: hov ? '2px solid rgba(212,168,67,0.8)' : '2px solid rgba(90,65,40,0.6)',
        boxShadow: hov
          ? '0 10px 24px rgba(0,0,0,0.6),0 0 18px rgba(212,168,67,0.2),inset 0 1px 0 rgba(255,220,150,0.15)'
          : '0 5px 14px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,220,150,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: sz * 0.5, position: 'relative', overflow: 'hidden',
      }}>
        {/* Wood grain texture */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 6,
          background: 'repeating-linear-gradient(90deg,transparent 0px,transparent 3px,rgba(0,0,0,0.06) 3px,rgba(0,0,0,0.06) 4px)',
          pointerEvents: 'none' }} />
        {/* Corner brass studs */}
        {[[4, 4], [4, sz - 8], [sz - 8, 4], [sz - 8, sz - 8]].map(([cx, cy], i) => (
          <div key={i} style={{ position: 'absolute', left: cx, top: cy, width: 4, height: 4, borderRadius: '50%',
            background: 'radial-gradient(circle,#c9a84c 30%,#8b6914 100%)',
            boxShadow: 'inset 0 -1px 1px rgba(0,0,0,0.3)' }} />
        ))}
        <span style={{ position: 'relative', zIndex: 2, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }}>{emoji}</span>
      </div>
      {/* Hover tooltip */}
      {hov && !disabled && (
        <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: 6, background: 'rgba(61,43,31,0.95)', color: '#d4a843',
          padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
          whiteSpace: 'nowrap', border: '1px solid rgba(212,168,67,0.4)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)', fontFamily: 'Georgia,serif' }}>
          {obj.name}
        </div>
      )}
    </div>
  );
}

// ─── Puzzle Progress Bar ────────────────────────────────────────
function PuzzleBar({ foundPieces }: { foundPieces: { piece: string; color: string }[] }) {
  const found = foundPieces.map(f => f.piece);
  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
      {PUZZLE_PIECES.map((p, i) => {
        const f = found.includes(p);
        const c = PIECE_COLORS[i];
        return (
          <div key={p} style={{ padding: '3px 9px', borderRadius: 4, fontSize: 9, fontWeight: 700,
            letterSpacing: '0.08em', fontFamily: 'Georgia,serif',
            background: f ? c + '25' : 'rgba(61,43,31,0.6)',
            color: f ? c : 'rgba(180,150,100,0.35)',
            border: `1px solid ${f ? c + '50' : 'rgba(140,100,60,0.2)'}` }}>
            {p}
          </div>
        );
      })}
    </div>
  );
}

// ─── Clue / Consequence Modal ───────────────────────────────────
function ClueModal({ obj, isRelevant, puzzlePiece, pieceColor, onClose }: {
  obj: ZoneObject; isRelevant: boolean; puzzlePiece: string; pieceColor: string; onClose: () => void;
}) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,8,5,0.88)', backdropFilter: 'blur(10px)',
      zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
        style={{
          background: isRelevant ? 'linear-gradient(135deg,#1a2e1a,#0d1f0d)' : 'linear-gradient(135deg,#3d2b1f,#2a1c12)',
          borderRadius: 14, padding: 22, maxWidth: 360, width: '100%',
          border: isRelevant ? '1px solid rgba(100,200,120,0.25)' : '1px solid rgba(212,168,67,0.3)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
            background: isRelevant ? 'rgba(46,204,113,0.15)' : 'rgba(212,168,67,0.15)' }}>
            {isRelevant ? '\u{1F50D}' : '\u26A0\uFE0F'}
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', fontFamily: 'Georgia,serif',
              color: isRelevant ? '#6dda89' : '#d4a843', marginBottom: 2 }}>
              {isRelevant ? 'INVESTIGATION BREAKTHROUGH' : 'TEACHING MOMENT'}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e8e0d0', fontFamily: 'Georgia,serif' }}>
              {obj.title}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 12.5, lineHeight: 1.6, color: 'rgba(220,210,190,0.8)', margin: '0 0 14px' }}>
          {isRelevant ? obj.body : (obj.meaning || obj.body)}
        </p>
        {isRelevant && puzzlePiece && (
          <div style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 5,
            background: pieceColor + '20', color: pieceColor, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.06em', marginBottom: 12, border: `1px solid ${pieceColor}35`,
            fontFamily: 'Georgia,serif' }}>
            {'\u25C6'} {puzzlePiece} PIECE FOUND
          </div>
        )}
        {!isRelevant && obj.consequence && (
          <div style={{ marginBottom: 12 }}>
            <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(180,60,40,0.15)',
              color: '#c04030', fontSize: 10, fontWeight: 700 }}>
              {obj.consequence === 'timer' ? `-${obj.timerLoss || 5}s` : obj.consequence === 'distracted' ? 'Distracted' : obj.consequence === 'awareness' ? '+1 Awareness' : 'No penalty'}
            </span>
            {obj.meaning && (
              <div style={{ fontSize: 11, color: '#b09070', fontStyle: 'italic', marginTop: 6, lineHeight: 1.4 }}>
                {obj.meaning}
              </div>
            )}
          </div>
        )}
        {isRelevant && obj.resourceHint && (
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: 8, marginBottom: 12, fontSize: 11, color: '#6dda89' }}>
            {obj.resourceHint}
          </div>
        )}
        <button onClick={onClose} style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: isRelevant ? 'linear-gradient(135deg,#2ecc71,#27ae60)' : 'linear-gradient(135deg,#d4a843,#b8922e)',
          color: isRelevant ? '#0a2818' : '#2a1c12', fontWeight: 700, fontSize: 12, fontFamily: 'Georgia,serif' }}>
          {isRelevant ? 'Add to investigation' : 'Continue investigating'}
        </button>
      </motion.div>
    </div>
  );
}

// ─── Difficulty Dots ────────────────────────────────────────────
function DiffDots({ n, max = 5 }: { n: number; max?: number }) {
  return (
    <span style={{ letterSpacing: 3, fontSize: 14 }}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ color: i < n ? '#d4a843' : '#4B5563' }}>{i < n ? '\u25CF' : '\u25CB'}</span>
      ))}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export function ChallengePhase({ session, challenge, players, onPhaseComplete }: ChallengePhaseProps) {
  console.log('CHALLENGE_PHASE: Mounted → direct to card (no intro)');
  const [stage, setStage] = useState<Stage>('card');
  const [timer, setTimer] = useState(TURN_SEC);
  const [score, setScore] = useState(0);
  const [modal, setModal] = useState<{ obj: ZoneObject; isR: boolean; piece: string; color: string } | null>(null);
  const [foundIds, setFoundIds] = useState<Set<string>>(new Set());
  const [discoveries, setDiscoveries] = useState<{ obj: ZoneObject; piece: string; color: string }[]>([]);
  const [mistakes, setMistakes] = useState<ZoneObject[]>([]);
  const [fx, setFx] = useState<string[]>([]);
  const [hintN, setHintN] = useState(HINT_MAX);
  const [hintOn, setHintOn] = useState(false);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Resolve zone data
  const engineZoneId = challenge.affectedZoneIds?.[0] || 'boating_pond';
  const zoneId = useMemo(() => getZoneIdFromEngineId(engineZoneId), [engineZoneId]);
  const zone = useMemo(() => getZoneConfig(zoneId), [zoneId]);
  const realistic = useMemo(() => getRealisticChallenge(engineZoneId), [engineZoneId]);
  const sortedPlayers = useMemo(() => [...players].sort((a, b) => a.utilityScore - b.utilityScore), [players]);
  const currentPlayer = sortedPlayers[currentPlayerIdx] || players[0];
  const catColor = realistic?.categoryColor || CAT_COLORS[challenge.category] || '#3B6D11';
  const diffDots = realistic?.difficultyDots || challenge.publicFace?.difficultyRating || 3;

  // Build relevant index for puzzle pieces
  const relevantObjs = useMemo(() => zone.objects.filter(o => o.relevant), [zone]);

  // Turn timer
  useEffect(() => {
    if (stage !== 'scene' || modal) { clearInterval(timerRef.current); return; }
    if (timer <= 0) { advancePlayer(); return; }
    if (timer <= 3) sounds.playTimerTick();
    timerRef.current = setInterval(() => setTimer(t => {
      if (t <= 1) { clearInterval(timerRef.current); advancePlayer(); return 0; }
      return t - 1;
    }), 1000);
    return () => clearInterval(timerRef.current);
  }, [stage, timer, modal]);

  // Fire onPhaseComplete when reaching continue stage
  useEffect(() => {
    if (stage === 'continue') {
      const results: InvestigationResult = {
        relevantFound: discoveries.map(d => d.obj.name),
        irrelevantClicked: mistakes.map(m => ({ objectId: m.name, teachingEffect: m.meaning || '' })),
        totalFound: discoveries.length,
        teachingMoments: mistakes.length,
        cpAwarded: Object.fromEntries(sortedPlayers.map(p => [p.id, Math.floor(discoveries.length * 0.5)])),
      };
      console.log('PHASE4_COMPLETE:', results);
      onPhaseComplete(results);
    }
  }, [stage]);

  const advancePlayer = useCallback(() => {
    const next = currentPlayerIdx + 1;
    if (next >= sortedPlayers.length || discoveries.length >= TOTAL_CLUES) {
      setStage('summary');
    } else {
      setCurrentPlayerIdx(next);
      setTimer(TURN_SEC);
      setFx([]);
    }
  }, [currentPlayerIdx, sortedPlayers.length, discoveries.length]);

  // Object click handler
  const handleClick = useCallback((obj: ZoneObject) => {
    if (foundIds.has(obj.name) || modal) return;
    console.log('PHASE4_FOUND:', obj.name, 'relevant:', obj.relevant, 'player:', currentPlayer?.id);

    const newFound = new Set(foundIds);
    newFound.add(obj.name);
    setFoundIds(newFound);

    if (obj.relevant) {
      sounds.playTokenGain();
      const relIdx = relevantObjs.findIndex(r => r.name === obj.name);
      const { piece, color } = getPuzzlePiece(obj, relIdx >= 0 ? relIdx : discoveries.length);
      setDiscoveries(p => [...p, { obj, piece, color }]);
      setScore(s => s + SCORE_GAIN + (fx.includes('awareness') ? 50 : 0));
      setFx(p => p.filter(e => e !== 'distracted' && e !== 'awareness'));
      setModal({ obj, isR: true, piece, color });
    } else {
      sounds.playTokenLoss();
      setMistakes(p => [...p, obj]);
      if (obj.consequence === 'timer') setTimer(t => Math.max(0, t - (obj.timerLoss || 5)));
      else if (obj.consequence === 'distracted') setFx(p => [...p, 'distracted']);
      else if (obj.consequence === 'awareness') { setFx(p => [...p, 'awareness']); setScore(s => s + 25); }
      setModal({ obj, isR: false, piece: '', color: '' });
    }
  }, [foundIds, modal, currentPlayer, fx, discoveries, relevantObjs]);

  const dismissModal = useCallback(() => {
    const wasRelevant = modal?.isR;
    setModal(null);
    if (wasRelevant) advancePlayer();
  }, [modal, advancePlayer]);

  const useHint = useCallback(() => {
    if (hintN <= 0) return;
    setHintN(h => h - 1);
    setHintOn(true);
    setTimeout(() => setHintOn(false), 3000);
  }, [hintN]);

  const tColor = timer > 10 ? '#d4a843' : timer > 5 ? '#e67e22' : '#c0392b';
  const qualityLabel = discoveries.length >= 7 ? 'Complete' : discoveries.length >= 5 ? 'Thorough' : discoveries.length >= 3 ? 'Partial' : 'Incomplete';

  // ─── RENDER ───────────────────────────────────────────────────
  return (
    <div style={{ width: '100%', height: '100vh', background: '#12160e', fontFamily: "'Segoe UI',system-ui,sans-serif",
      color: '#e8e0d0', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      <AnimatePresence mode="wait">
        {/* ═══ CARD ═══ */}
        {stage === 'card' && (
          <motion.div key="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,8,5,0.95)', zIndex: 60 }}>
            <div style={{ background: 'linear-gradient(135deg,#3d2b1f,#2a1c12)', borderRadius: 14, maxWidth: 520, width: '90%', padding: 28, borderLeft: `4px solid ${catColor}`, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                <span style={{ background: catColor, color: '#FFF', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                  {realistic?.zoneName || zone.title}
                </span>
                <DiffDots n={diffDots} />
              </div>
              <h2 style={{ color: '#e8e0d0', fontSize: 22, fontWeight: 700, margin: '0 0 12px', fontFamily: 'Georgia,serif' }}>
                {realistic?.name || challenge.name}
              </h2>
              <p style={{ color: 'rgba(220,210,190,0.8)', fontSize: 14, lineHeight: 1.7, margin: '0 0 14px' }}>
                {realistic?.description || challenge.description}
              </p>
              {realistic?.realWorldSource && (
                <p style={{ color: '#808878', fontSize: 12, fontStyle: 'italic', margin: '0 0 20px' }}>
                  Source: {realistic.realWorldSource}
                </p>
              )}
              <button onClick={() => { console.log('ENTER_ZONE → skip to HOG (InvestigationPhase)'); sounds.playButtonClick(); setStage('continue'); }}
                style={{ background: 'linear-gradient(135deg,#2ecc71,#27ae60)', color: '#0a2818', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
                Enter Zone {'\u2192'}
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══ SCENE — Hidden Object Game ═══ */}
        {stage === 'scene' && (
          <motion.div key="scene" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>

            {/* TOP WOOD BAR */}
            <div style={{ background: WOOD, padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '3px solid #2a1c12', boxShadow: '0 4px 12px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,220,150,0.08)', zIndex: 40, flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: 'linear-gradient(90deg,#2d5a1e,#4a8a30,#2d5a1e,#4a8a30,#2d5a1e)', opacity: 0.5 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{'\u{1F33F}'}</span>
                <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.06em', color: '#d4a843', fontFamily: 'Georgia,serif' }}>
                  {zone.title}
                </span>
                {currentPlayer && (
                  <span style={{ fontSize: 10, color: '#808878', marginLeft: 8 }}>
                    {currentPlayer.name} ({currentPlayer.roleId})
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 80, height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.4)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(timer / TURN_SEC) * 100}%`, background: tColor, borderRadius: 3, transition: 'width 1s linear' }} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, color: tColor, fontVariantNumeric: 'tabular-nums', fontFamily: 'Georgia,serif',
                  textShadow: '0 0 8px rgba(212,168,67,0.3)' }}>
                  {timer}s
                </span>
                <span style={{ fontSize: 9, color: '#808878', marginLeft: 4 }}>Turn {currentPlayerIdx + 1}/{sortedPlayers.length}</span>
              </div>
            </div>

            {/* STATUS FX BAR */}
            {fx.length > 0 && (
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', padding: '5px 0',
                background: 'rgba(61,43,31,0.7)', borderBottom: '1px solid rgba(140,100,60,0.2)', flexShrink: 0 }}>
                {fx.includes('distracted') && <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 9, fontWeight: 700,
                  background: 'rgba(192,64,48,0.15)', color: '#c04030', border: '1px solid rgba(192,64,48,0.2)', fontFamily: 'Georgia,serif' }}>
                  DISTRACTED</span>}
                {fx.includes('awareness') && <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 9, fontWeight: 700,
                  background: 'rgba(212,168,67,0.15)', color: '#d4a843', border: '1px solid rgba(212,168,67,0.2)', fontFamily: 'Georgia,serif' }}>
                  AWARENESS +1</span>}
              </div>
            )}

            {/* SCENE AREA */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {/* Atmospheric background */}
              <div style={{ position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse 100% 80% at 50% 30%,#1e3a1a,#162e14 30%,#12200e 60%,#0e180a)' }} />

              {/* Water */}
              <div style={{ position: 'absolute', top: '25%', left: '10%', right: '10%', bottom: '15%',
                background: 'linear-gradient(180deg,rgba(20,60,35,0.4),rgba(15,50,30,0.5),rgba(10,40,25,0.3))',
                borderRadius: '50%', transform: 'perspective(600px) rotateX(40deg)',
                boxShadow: 'inset 0 0 80px rgba(60,140,80,0.12),0 0 60px rgba(30,100,50,0.1)', pointerEvents: 'none' }} />

              {/* Lily pads */}
              {[{x:28,y:42,s:24,r:20},{x:52,y:48,s:18,r:-15},{x:40,y:54,s:14,r:45},{x:62,y:38,s:20,r:10},
                {x:35,y:60,s:12,r:-30},{x:55,y:55,s:16,r:60},{x:45,y:35,s:22,r:-5},{x:70,y:50,s:14,r:35}].map((l,i) => (
                <div key={`l${i}`} style={{ position: 'absolute', left: `${l.x}%`, top: `${l.y}%`,
                  width: l.s, height: l.s * 0.55, borderRadius: '50%',
                  background: `radial-gradient(circle at 40% 40%,rgba(70,140,60,0.4),rgba(40,90,35,0.2))`,
                  transform: `rotate(${l.r}deg)`, pointerEvents: 'none' }} />
              ))}

              {/* Dock planks */}
              {[{x:20,y:62,w:55,a:2},{x:18,y:66,w:58,a:1},{x:22,y:70,w:50,a:3}].map((d,i) => (
                <div key={`d${i}`} style={{ position: 'absolute', left: `${d.x}%`, top: `${d.y}%`, width: `${d.w}%`, height: 5,
                  background: 'linear-gradient(90deg,rgba(100,70,40,0.35),rgba(130,90,55,0.25),rgba(100,70,40,0.35))',
                  borderRadius: 2, transform: `perspective(400px) rotateX(15deg) rotate(${d.a}deg)`,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)', pointerEvents: 'none' }} />
              ))}

              {/* Reeds */}
              {[8,15,22,50,55,75,82,90,35,68].map((x, i) => (
                <div key={`r${i}`} style={{ position: 'absolute', left: `${x}%`, top: `${18 + i * 5}%`,
                  width: 2, height: 22 + i * 3, background: `linear-gradient(to top,rgba(50,100,40,0.4),rgba(90,160,60,0.2))`,
                  borderRadius: 4, transform: `rotate(${-6 + i * 2}deg)`, pointerEvents: 'none' }} />
              ))}

              {/* Algae patches */}
              {[{x:38,y:44,s:50},{x:55,y:52,s:35},{x:30,y:56,s:40},{x:60,y:42,s:30},{x:45,y:62,s:28}].map((a, i) => (
                <div key={`a${i}`} style={{ position: 'absolute', left: `${a.x}%`, top: `${a.y}%`,
                  width: a.s, height: a.s * 0.5, borderRadius: '50%',
                  background: 'radial-gradient(circle,rgba(80,120,30,0.25),transparent 70%)',
                  transform: `rotate(${i * 30}deg)`, pointerEvents: 'none' }} />
              ))}

              {/* Stones */}
              {[{x:10,y:65,s:16},{x:85,y:70,s:12},{x:60,y:75,s:10},{x:42,y:28,s:8}].map((r, i) => (
                <div key={`st${i}`} style={{ position: 'absolute', left: `${r.x}%`, top: `${r.y}%`,
                  width: r.s, height: r.s * 0.7, borderRadius: '40%',
                  background: 'linear-gradient(135deg,rgba(80,75,65,0.4),rgba(60,55,48,0.3))',
                  boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.2)', pointerEvents: 'none' }} />
              ))}

              {/* 3D OBJECT TILES */}
              {zone.objects.map((obj, i) => {
                const relIdx = relevantObjs.indexOf(obj);
                const { piece, color } = getPuzzlePiece(obj, relIdx >= 0 ? relIdx : i);
                return (
                  <Obj3D key={obj.idx} obj={obj} emoji={getEmoji(obj.icon)}
                    onClick={handleClick} found={foundIds.has(obj.name)}
                    disabled={!!modal} puzzlePiece={piece} pieceColor={color} />
                );
              })}

              {/* Hint glow highlights */}
              {hintOn && zone.objects.filter(o => o.relevant && !foundIds.has(o.name)).slice(0, 2).map(o => (
                <div key={`h${o.name}`} style={{ position: 'absolute', left: `${o.x}%`, top: `${o.y}%`,
                  transform: 'translate(-50%,-50%)', width: 70, height: 70, borderRadius: '50%',
                  background: 'radial-gradient(circle,rgba(212,168,67,0.3),transparent 70%)',
                  pointerEvents: 'none', animation: 'pulse 1.5s ease infinite', zIndex: 5 }} />
              ))}

              {/* Clue / Consequence Modal */}
              {modal && (
                <ClueModal obj={modal.obj} isRelevant={modal.isR} puzzlePiece={modal.piece} pieceColor={modal.color} onClose={dismissModal} />
              )}
            </div>

            {/* PUZZLE PROGRESS BAR */}
            <div style={{ padding: '6px 14px', background: 'rgba(61,43,31,0.7)',
              borderTop: '1px solid rgba(140,100,60,0.15)', borderBottom: '1px solid rgba(140,100,60,0.15)', flexShrink: 0 }}>
              <PuzzleBar foundPieces={discoveries.map(d => ({ piece: d.piece, color: d.color }))} />
            </div>

            {/* BOTTOM WOOD BAR */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px 10px',
              background: WOOD, boxShadow: '0 -4px 12px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,220,150,0.06)', position: 'relative', flexShrink: 0 }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                background: 'linear-gradient(90deg,#2d5a1e,#4a8a30,#2d5a1e,#4a8a30,#2d5a1e)', opacity: 0.4 }} />

              {/* Role icons */}
              <div style={{ display: 'flex', gap: 5 }}>
                {sortedPlayers.map((p, i) => (
                  <div key={p.id} style={{ width: 30, height: 30, borderRadius: 6, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 12, fontWeight: 700,
                    background: i === currentPlayerIdx ? ROLE_COLORS[p.roleId] : 'rgba(0,0,0,0.25)',
                    border: i === currentPlayerIdx ? '2px solid rgba(212,168,67,0.6)' : '1px solid rgba(140,100,60,0.25)',
                    color: '#e8e0d0' }}>
                    {p.name.slice(0, 2)}
                  </div>
                ))}
              </div>

              {/* Score */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(212,168,67,0.6)', letterSpacing: '0.1em', fontFamily: 'Georgia,serif' }}>SCORE</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#d4a843', fontFamily: 'Georgia,serif',
                  textShadow: '0 0 12px rgba(212,168,67,0.4),0 2px 4px rgba(0,0,0,0.5)' }}>{score.toLocaleString()}</div>
              </div>

              {/* Hint + Done */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={useHint} disabled={hintN <= 0}
                  style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: hintN > 0 ? 'pointer' : 'not-allowed',
                    background: hintN > 0 ? WOOD_L : 'rgba(0,0,0,0.2)', color: hintN > 0 ? '#d4a843' : 'rgba(180,150,100,0.3)',
                    fontWeight: 700, fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Georgia,serif',
                    boxShadow: hintN > 0 ? '0 2px 8px rgba(0,0,0,0.3)' : 'none' }}>
                  {'\u{1F4A1}'} HINT {Array.from({ length: HINT_MAX }, (_, i) => (
                    <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', display: 'inline-block',
                      background: i < hintN ? '#d4a843' : 'rgba(100,80,50,0.4)' }} />
                  ))}
                </button>
                <button onClick={advancePlayer}
                  style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(140,100,60,0.3)',
                    background: 'transparent', color: 'rgba(180,150,100,0.6)', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'Georgia,serif' }}>
                  DONE
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ SUMMARY ═══ */}
        {stage === 'summary' && (
          <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#1a120a,#2a1c12,#1a120a)',
              zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'auto' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: '#d4a843', fontFamily: 'Georgia,serif' }}>INVESTIGATION COMPLETE</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#e8e0d0', fontFamily: 'Georgia,serif', margin: '6px 0' }}>
              {zone.title} — {qualityLabel}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(180,150,100,0.6)', marginBottom: 20 }}>
              {discoveries.length}/{TOTAL_CLUES} pieces found {'\u00B7'} {mistakes.length} teaching moments {'\u00B7'} Score: {score}
            </div>

            {/* Found clues */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380, width: '100%', marginBottom: 20 }}>
              {discoveries.map(d => (
                <div key={d.obj.name} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)',
                  borderRadius: 10, padding: 12, border: `1px solid ${d.color}25` }}>
                  <div style={{ minWidth: 28, height: 28, borderRadius: 6, background: d.color + '18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                    {getEmoji(d.obj.icon)}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: d.color, fontFamily: 'Georgia,serif' }}>{d.piece}</div>
                    <div style={{ fontSize: 11, color: 'rgba(220,210,190,0.7)' }}>{d.obj.title}</div>
                  </div>
                </div>
              ))}
            </div>

            {discoveries.length >= TOTAL_CLUES && (
              <p style={{ color: '#6dda89', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                Complete investigation! +2 bonus CP for all players.
              </p>
            )}

            <button onClick={() => { sounds.playButtonClick(); setStage('continue'); }}
              style={{ padding: '9px 24px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg,#2ecc71,#27ae60)', color: '#0a2818',
                fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
              Phase 3: Solutions {'\u2192'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse{0%,100%{opacity:0.5;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}}
      `}</style>
    </div>
  );
}

export default ChallengePhase;
