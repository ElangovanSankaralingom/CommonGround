import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameSession, ChallengeCard, Player, RoleId } from '../../core/models/types';
import { ROLE_COLORS, CHALLENGE_CATEGORY_COLORS } from '../../core/models/constants';
import { getHiddenObjectsForZone, HiddenObject } from '../../core/content/featureTiles';
import { PhaseNavigation } from '../effects/PhaseNavigation';
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
interface ObjectState { obj: HiddenObject; status: 'hidden' | 'found_relevant' | 'found_irrelevant'; finderId: string | null; }

const TURN_SEC = 15, TIMER_PEN = 3, LOCKOUT_MS = 3000, DISTRACT_R = 0.6;
const CLUE_ICO: Record<string, string> = { consequence: '\u26A0\uFE0F', capability: '\u{1F9E0}', outcome: '\u{1F3AF}', resource: '\u{1F4E6}', connection: '\u{1F517}', evidence: '\u{1F50D}', blueprint: '\u{1F5FA}\uFE0F' };
const EFF_LBL: Record<string, string> = { timer_loss: 'Lost 3s', distracted: 'Next reveal truncated', awareness_gain: 'Awareness gained', turn_consumed: 'Brief lockout', bureaucratic: 'Bureaucratic Thinking!' };
const S = { box: (bg: string, bdr: string) => ({ width: '100%' as const, background: bg, border: `1px solid ${bdr}`, borderRadius: 12, padding: 20, marginBottom: 16 }) };

function ZoneBackground({ zoneId }: { zoneId: string }) {
  if (zoneId.includes('pond') || zoneId.includes('boat')) return (<>
    <rect width="800" height="500" fill="#0D2B3E" />
    <path d="M0 300Q200 270 400 310Q600 350 800 290L800 500L0 500Z" fill="#0A3D5C" opacity="0.6" />
    <path d="M0 340Q200 310 400 350Q600 380 800 330" stroke="#1A6B8A" strokeWidth="2" fill="none" opacity="0.4" />
    <path d="M0 360Q250 330 500 370Q700 400 800 350" stroke="#1A6B8A" strokeWidth="1.5" fill="none" opacity="0.3" />
  </>);
  if (zoneId.includes('herb') || zoneId.includes('garden')) return (<>
    <rect width="800" height="500" fill="#0F2E1A" />
    <ellipse cx="200" cy="350" rx="80" ry="50" fill="#1A4D2E" opacity="0.5" />
    <ellipse cx="600" cy="300" rx="100" ry="60" fill="#1A4D2E" opacity="0.4" />
    <path d="M400 400Q410 350 400 300M400 350Q430 340 450 360M400 330Q370 320 360 340" stroke="#2D6B3F" strokeWidth="2" fill="none" opacity="0.5" />
  </>);
  if (zoneId.includes('play') || zoneId.includes('restroom')) return (<>
    <rect width="800" height="500" fill="#1A1A2E" />
    <rect x="150" y="200" width="120" height="150" fill="#252545" opacity="0.5" rx="4" />
    <rect x="500" y="250" width="160" height="120" fill="#252545" opacity="0.4" rx="4" />
    <polygon points="210,200 210,160 270,200" fill="#2A2A4A" opacity="0.4" />
  </>);
  if (zoneId.includes('track') || zoneId.includes('fiber') || zoneId.includes('path')) return (<>
    <rect width="800" height="500" fill="#1E1A14" />
    <path d="M50 450Q200 400 350 420Q500 440 650 380Q750 340 800 350" stroke="#4A3E30" strokeWidth="6" fill="none" opacity="0.5" />
    <path d="M0 250Q150 230 300 260Q500 290 700 240L800 260" stroke="#3D3228" strokeWidth="3" fill="none" opacity="0.3" />
  </>);
  return (<><rect width="800" height="500" fill="#141422" /><circle cx="200" cy="250" r="80" fill="#1C1C35" opacity="0.3" /><circle cx="600" cy="300" r="100" fill="#1C1C35" opacity="0.25" /></>);
}

function DifficultyDots({ level }: { level: number }) {
  return <span style={{ letterSpacing: 2 }}>{Array.from({ length: 5 }, (_, i) => <span key={i} style={{ color: i < level ? '#F59E0B' : '#4B5563' }}>{'\u25CF'}</span>)}</span>;
}

const Badge = ({ show, color, label }: { show: boolean; color: string; label: string }) =>
  show ? <span style={{ fontSize: 11, color, background: `${color}26`, padding: '2px 8px', borderRadius: 4 }}>{label}</span> : null;

// ─── Main Component ─────────────────────────────────────────────
export function ChallengePhase({ session, challenge, players, onPhaseComplete }: ChallengePhaseProps) {
  const [stage, setStage] = useState<Stage>('intro');
  const [cardFlipped, setCardFlipped] = useState(false);
  const zoneId = challenge.affectedZoneIds[0] || 'default';
  const allObjects = useMemo(() => getHiddenObjectsForZone(zoneId), [zoneId]);
  const sortedPlayers = useMemo(() => [...players].sort((a, b) => a.utilityScore - b.utilityScore), [players]);
  const [objStates, setObjStates] = useState<ObjectState[]>(() => allObjects.map(obj => ({ obj, status: 'hidden', finderId: null })));
  const [pIdx, setPIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TURN_SEC);
  const [popup, setPopup] = useState<{ text: string; type: 'relevant' | 'irrelevant'; effect?: string } | null>(null);
  const [locked, setLocked] = useState(false);
  const [distracted, setDistracted] = useState(false);
  const [awareness, setAwareness] = useState(false);
  const [bureaucratic, setBureaucratic] = useState(false);
  const [cpMap, setCpMap] = useState<Record<string, number>>({});
  const [flash, setFlash] = useState(false);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { if (stage === 'intro') { const t = setTimeout(() => setStage('card'), 1500); return () => clearTimeout(t); } }, [stage]);

  const advancePlayer = useCallback(() => {
    setPopup(null); setDistracted(false); setAwareness(false); setBureaucratic(false); setLocked(false);
    if (pIdx >= sortedPlayers.length - 1) { setDone(true); setTimeout(() => setStage('summary'), 800); }
    else setPIdx(p => p + 1);
  }, [pIdx, sortedPlayers.length]);

  useEffect(() => {
    if (stage !== 'scene' || done) return;
    setTimeLeft(TURN_SEC);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => { if (prev <= 1) { clearInterval(timerRef.current!); advancePlayer(); return 0; } return prev - 1; });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [stage, pIdx, done]);

  const handleClick = useCallback((idx: number) => {
    if (stage !== 'scene' || locked || done) return;
    const st = objStates[idx]; if (st.status !== 'hidden') return;
    const player = sortedPlayers[pIdx], obj = st.obj, next = [...objStates];
    if (obj.relevant) {
      next[idx] = { ...st, status: 'found_relevant', finderId: player.id };
      let text = obj.revealText;
      if (distracted) { text = text.slice(0, Math.floor(text.length * DISTRACT_R)) + '...'; setDistracted(false); }
      if (awareness) { text += ' [BONUS: Enhanced awareness from previous mistake]'; setAwareness(false); }
      setPopup({ text, type: 'relevant' });
      sounds.playTokenGain();
      setCpMap(prev => ({ ...prev, [player.id]: (prev[player.id] || 0) + 1 }));
    } else {
      next[idx] = { ...st, status: 'found_irrelevant', finderId: player.id };
      const eff = obj.teachingEffect || 'timer_loss';
      setPopup({ text: obj.teachingText || 'Not relevant.', type: 'irrelevant', effect: eff });
      sounds.playTokenLoss();
      if (eff === 'timer_loss') { setTimeLeft(p => Math.max(0, p - (obj.timerPenalty || TIMER_PEN))); setFlash(true); setTimeout(() => setFlash(false), 500); }
      else if (eff === 'distracted') setDistracted(true);
      else if (eff === 'awareness_gain') setAwareness(true);
      else if (eff === 'turn_consumed') { setLocked(true); setTimeout(() => setLocked(false), LOCKOUT_MS); }
      else if (eff === 'bureaucratic') setBureaucratic(true);
    }
    setObjStates(next);
  }, [stage, locked, done, objStates, sortedPlayers, pIdx, distracted, awareness]);

  const results = useMemo((): InvestigationResult => {
    const rel = objStates.filter(s => s.status === 'found_relevant').map(s => s.obj.id);
    const irr = objStates.filter(s => s.status === 'found_irrelevant').map(s => ({ objectId: s.obj.id, teachingEffect: s.obj.teachingEffect || 'timer_loss' }));
    return { relevantFound: rel, irrelevantClicked: irr, totalFound: rel.length, teachingMoments: irr.length, cpAwarded: cpMap };
  }, [objStates, cpMap]);

  const totalRel = allObjects.filter(o => o.relevant).length;
  const curPlayer = sortedPlayers[pIdx] as Player | undefined;
  const timerPct = (timeLeft / TURN_SEC) * 100;
  const catColor = CHALLENGE_CATEGORY_COLORS[challenge.category] || '#6B7280';
  const goldBtn = { borderRadius: 14, fontSize: 16, fontWeight: 700 as const, background: 'linear-gradient(135deg,#F59E0B,#F4D03F)', color: '#1C1917', border: 'none', cursor: 'pointer' as const };

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A14', color: '#E5E7EB', fontFamily: 'system-ui,sans-serif' }}>
      <AnimatePresence mode="wait">
        {stage === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <motion.h1 initial={{ y: 30 }} animate={{ y: 0 }} style={{ fontSize: 42, fontWeight: 800, color: '#F59E0B', margin: 0 }}>Phase 2</motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.3 } }} style={{ fontSize: 20, color: '#9CA3AF', marginTop: 8 }}>Investigate the Ground</motion.p>
          </motion.div>
        )}

        {stage === 'card' && (
          <motion.div key="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 24 }}>
            <motion.div onClick={() => { setCardFlipped(true); sounds.playCardFlip(); }} animate={{ rotateY: cardFlipped ? 0 : 180 }} transition={{ duration: 0.6 }}
              style={{ width: 380, minHeight: 420, background: 'rgba(25,25,45,0.95)', borderRadius: 20, border: `2px solid ${catColor}`, padding: 32, cursor: cardFlipped ? 'default' : 'pointer', boxShadow: `0 0 40px ${catColor}33` }}>
              {!cardFlipped ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', transform: 'rotateY(180deg)' }}>
                  <p style={{ fontSize: 18, color: '#6B7280' }}>Click to reveal challenge</p>
                </div>
              ) : (<div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ background: catColor, color: '#fff', padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>{challenge.category}</span>
                  <DifficultyDots level={challenge.difficulty} />
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px', color: '#F1F5F9' }}>{challenge.name}</h2>
                <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 12 }}>Zone: {challenge.publicFace?.zoneName || zoneId}</p>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: '#D1D5DB', marginBottom: 20 }}>{challenge.description}</p>
                {challenge.publicFace?.resourcesRequired && (
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Required Resources:</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {challenge.publicFace.resourcesRequired.map((r, i) => (
                        <span key={i} style={{ background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 6, fontSize: 13 }}>{r.displayName}: {r.amount}</span>
                      ))}
                    </div>
                  </div>
                )}
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => setStage('scene')}
                  style={{ ...goldBtn, width: '100%', padding: '14px 0', marginTop: 8 }}>Enter Zone &rarr;</motion.button>
              </div>)}
            </motion.div>
          </motion.div>
        )}

        {stage === 'scene' && (
          <motion.div key="scene" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 16px 80px' }}>
            {curPlayer && !done && (
              <div style={{ width: '100%', maxWidth: 820, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: ROLE_COLORS[curPlayer.roleId], display: 'inline-block' }} />
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{curPlayer.name}</span>
                    <span style={{ fontSize: 13, color: '#9CA3AF' }}>({curPlayer.roleId})</span>
                  </div>
                  <span style={{ fontSize: 14, color: '#9CA3AF' }}>Player {pIdx + 1} of {sortedPlayers.length}</span>
                </div>
                <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                  <motion.div animate={{ width: `${timerPct}%` }} transition={{ duration: 0.3 }}
                    style={{ height: '100%', borderRadius: 4, background: timerPct > 30 ? '#22C55E' : timerPct > 15 ? '#F59E0B' : '#EF4444' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>{timeLeft}s remaining</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Badge show={distracted} color="#F59E0B" label="Distracted" />
                    <Badge show={awareness} color="#22C55E" label="+Awareness" />
                    <Badge show={bureaucratic} color="#A78BFA" label="Bureaucratic Thinking" />
                    <Badge show={locked} color="#EF4444" label="Locked" />
                  </div>
                </div>
              </div>
            )}
            <div style={{ position: 'relative', width: '100%', maxWidth: 820, border: flash ? '2px solid #EF4444' : '2px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s' }}>
              <svg viewBox="0 0 800 500" style={{ width: '100%', display: 'block' }}>
                <ZoneBackground zoneId={zoneId} />
                {objStates.map((st, idx) => {
                  const cx = (st.obj.x / 100) * 800, cy = (st.obj.y / 100) * 500;
                  const h = st.status === 'hidden', r = st.status === 'found_relevant', ir = st.status === 'found_irrelevant';
                  return (
                    <g key={st.obj.id} onClick={() => h && handleClick(idx)} style={{ cursor: h ? 'pointer' : 'default' }}>
                      <circle cx={cx} cy={cy} r={28} fill={r ? 'rgba(34,197,94,0.35)' : ir ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.12)'}
                        stroke={r ? '#22C55E' : ir ? '#EF4444' : 'rgba(255,255,255,0.25)'} strokeWidth={2}>
                        {h && <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />}
                      </circle>
                      {r && <text x={cx} y={cy + 5} textAnchor="middle" fontSize="18" fill="#22C55E">{'\u2713'}</text>}
                      {ir && <text x={cx} y={cy + 5} textAnchor="middle" fontSize="18" fill="#EF4444">{'\u2717'}</text>}
                      {h && <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.5)">?</text>}
                    </g>);
                })}
              </svg>
              <AnimatePresence>
                {popup && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    style={{ position: 'absolute', bottom: 12, left: 12, right: 12, padding: 16, borderRadius: 12, background: popup.type === 'relevant' ? 'rgba(20,60,30,0.95)' : 'rgba(60,20,20,0.95)', border: `1px solid ${popup.type === 'relevant' ? '#22C55E' : '#EF4444'}`, backdropFilter: 'blur(8px)', maxHeight: 160, overflow: 'auto' }}>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: '#E5E7EB' }}>{popup.text}</p>
                    {popup.effect && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>Effect: {EFF_LBL[popup.effect] || popup.effect}</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {stage === 'summary' && (
          <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px 100px', maxWidth: 700, margin: '0 auto' }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32, color: '#F1F5F9' }}>Investigation Complete</h2>
            <div style={S.box('rgba(34,197,94,0.08)', 'rgba(34,197,94,0.2)')}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#22C55E', margin: '0 0 12px' }}>Relevant Clues Found: {results.relevantFound.length}/{totalRel}</h3>
              {objStates.filter(s => s.status === 'found_relevant').map(s => (
                <div key={s.obj.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ color: '#22C55E' }}>{'\u2713'}</span>
                  <span style={{ fontSize: 14 }}>{CLUE_ICO[s.obj.clueType || ''] || ''} {s.obj.name}</span>
                </div>))}
            </div>
            {results.irrelevantClicked.length > 0 && (
              <div style={S.box('rgba(239,68,68,0.08)', 'rgba(239,68,68,0.2)')}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#EF4444', margin: '0 0 12px' }}>Irrelevant Clicked: {results.irrelevantClicked.length}</h3>
                {objStates.filter(s => s.status === 'found_irrelevant').map(s => (
                  <div key={s.obj.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: '#EF4444' }}>{'\u2717'}</span>
                    <span style={{ fontSize: 14 }}>{s.obj.name}</span>
                    <span style={{ fontSize: 12, color: '#F59E0B', marginLeft: 'auto' }}>{EFF_LBL[s.obj.teachingEffect || ''] || ''}</span>
                  </div>))}
              </div>
            )}
            <div style={S.box('rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)')}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F59E0B', margin: '0 0 12px' }}>CP Awarded</h3>
              {sortedPlayers.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: ROLE_COLORS[p.roleId], display: 'inline-block' }} />
                  <span style={{ fontSize: 14 }}>{p.name}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#F59E0B' }}>+{cpMap[p.id] || 0} CP</span>
                </div>))}
            </div>
            {(() => {
              const unfound = objStates.filter(s => s.status === 'hidden' && s.obj.relevant);
              if (!unfound.length) return null;
              return (<div style={S.box('rgba(245,158,11,0.08)', 'rgba(245,158,11,0.2)')}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F59E0B', margin: '0 0 12px' }}>Information Gaps</h3>
                {unfound.map(s => (
                  <div key={s.obj.id} style={{ fontSize: 14, color: '#D1D5DB', marginBottom: 6 }}>
                    Information Gap &mdash; you'll proceed without knowing <span style={{ color: '#F59E0B', fontWeight: 600 }}>[{s.obj.clueType || 'clue'}]</span>
                  </div>))}
              </div>);
            })()}
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => { sounds.playButtonClick(); setStage('continue'); }}
              style={{ ...goldBtn, marginTop: 32, padding: '14px 36px' }}>Continue &rarr;</motion.button>
          </motion.div>
        )}

        {stage === 'continue' && (
          <motion.div key="continue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#F1F5F9', marginBottom: 8 }}>Continue to Phase 3: Build Your Vision</h2>
            <p style={{ fontSize: 15, color: '#9CA3AF', marginBottom: 32 }}>{results.relevantFound.length}/{totalRel} clues found &bull; {results.teachingMoments} teaching moments</p>
            <PhaseNavigation canContinue onContinue={() => onPhaseComplete(results)} continueLabel="Continue to Phase 3: Build Your Vision &rarr;" onSkip={() => onPhaseComplete(results)} skipLabel="Skip &rarr;" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ChallengePhase;
