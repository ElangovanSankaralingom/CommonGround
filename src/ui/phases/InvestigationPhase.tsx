import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import type { GameSession, ChallengeCard, Player } from '../../core/models/types';
import { ROLE_COLORS } from '../../core/models/constants';
import {
  type InvestigationObject,
  type InvestigationZone,
  getInvestigationZone,
  getInvestigationZoneIdFromEngine,
} from '../../core/content/investigationData';
import {
  findNearestObject,
  handleObjectClick,
  handleHintUse,
  getInvestigationSummary,
  type ClickResult,
  type InvestigationQuality,
} from '../../core/engine/investigationEngine';
import { sounds } from '../../utils/sounds';

// ─── Types ──────────────────────────────────────────────────────
export interface InvestigationPhaseResult {
  relevantFound: string[];
  irrelevantClicked: { objectId: string; consequence: string }[];
  totalFound: number;
  quality: InvestigationQuality;
  score: number;
  cpAwarded: Record<string, number>;
}

interface InvestigationPhaseProps {
  session: GameSession;
  challenge: ChallengeCard;
  players: Player[];
  onPhaseComplete: (results: InvestigationPhaseResult) => void;
}

type ScreenState = 'playing' | 'showing_clue' | 'showing_consequence' | 'pass_turn' | 'summary';

// ─── Constants ──────────────────────────────────────────────────
const TURN_SECONDS = 20;
const MAX_HINTS = 3;

const ICON_MAP: Record<string, string> = {
  pipe: '\u{1F527}', boat: '\u{1F9F8}', sign: '\u{1FAA7}', closet: '\u{1F6AA}',
  grate: '\u2699\uFE0F', flask: '\u{1F9EA}', map: '\u{1F5FA}\uFE0F', lamp: '\u{1F3EE}',
  booth: '\u{1F3AA}', mural: '\u{1F3A8}', bench: '\u{1FA91}', rules: '\u{1F4CB}',
  ramp: '\u{1F527}', pump: '\u{1F527}', regulator: '\u{1F527}', license: '\u{1FAA7}',
  channel: '\u2699\uFE0F', folder: '\u{1F5FA}\uFE0F', report: '\u{1F5FA}\uFE0F',
  counter: '\u{1F3AA}', petition: '\u{1F4CB}', box: '\u{1F6AA}', cooler: '\u2744\uFE0F',
  flag: '\u{1F6A9}', plaque: '\u{1F4DC}', droppings: '\u26A0\uFE0F', cart: '\u{1F6D2}',
};

function getEmoji(icon: string): string {
  return ICON_MAP[icon] || '\u2753';
}

const CONSEQUENCE_LABELS: Record<string, string> = {
  timer: 'Time Lost',
  distracted: 'Distracted',
  awareness: 'Heightened Awareness',
  wasted: 'Wasted Effort',
  bureaucratic: 'Bureaucratic Dead End',
};

// ─── 3D Object Card ─────────────────────────────────────────────
function ObjectCard({ obj, index, found, foundRelevant, disabled, onClick }: {
  obj: InvestigationObject; index: number; found: boolean;
  foundRelevant: boolean | null; disabled: boolean;
  onClick: (o: InvestigationObject) => void;
}) {
  const [hov, setHov] = useState(false);
  const emoji = getEmoji(obj.icon);

  const rotY = Math.sin(index * 2.7) * 12;
  const rotX = Math.cos(index * 3.1) * 8;
  const zIdx = 10 + Math.floor(obj.y * 100 / 5);

  const borderColor = found
    ? (foundRelevant ? '#aed456' : '#e9c349')
    : 'transparent';
  const glowShadow = found
    ? (foundRelevant
      ? '0 0 12px rgba(174,212,86,0.4)'
      : '0 0 12px rgba(233,195,73,0.4)')
    : '';

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && !found) {
          onClick(obj);
        }
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'absolute',
        left: `${obj.x * 100}%`,
        top: `${obj.y * 100}%`,
        width: 72,
        height: 62,
        transform: `translate(-50%,-50%) perspective(300px) rotateY(${hov ? 0 : rotY}deg) rotateX(${hov ? -8 : rotX}deg) scale(${hov && !disabled && !found ? 1.08 : 1})`,
        cursor: found ? 'default' : (disabled ? 'not-allowed' : 'pointer'),
        zIndex: hov ? 50 : zIdx,
        transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        filter: hov && !disabled && !found ? 'brightness(1.15)' : 'none',
        pointerEvents: 'auto',
        opacity: found ? 0.5 : (disabled ? 0.6 : 1),
      }}
    >
      {/* Wood grain card body */}
      <div style={{
        width: '100%', height: '100%', borderRadius: 8,
        background: `repeating-linear-gradient(90deg, rgba(60,40,20,0.03) 0px, rgba(60,40,20,0.03) 2px, transparent 2px, transparent 5px), linear-gradient(135deg, #2a2218, #1e1810)`,
        border: `2px solid ${borderColor}`,
        boxShadow: `inset 0 2px rgba(244,187,146,0.2), 0 4px rgba(22,19,12,0.8)${glowShadow ? ', ' + glowShadow : ''}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Corner rivets via pseudo-element simulation */}
        {[[4, 4], [4, 52], [60, 4], [60, 52]].map(([cx, cy], i) => (
          <div key={i} style={{
            position: 'absolute', left: cx, top: cy, width: 5, height: 5, borderRadius: '50%',
            background: 'radial-gradient(circle, #d4a843 30%, #8b6914 100%)',
            boxShadow: 'inset 0 -1px 1px rgba(0,0,0,0.3)',
          }} />
        ))}
        {/* Icon */}
        <span style={{
          fontSize: 24, opacity: 0.6, position: 'relative', zIndex: 2,
          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))',
        }}>
          {emoji}
        </span>
      </div>
      {/* Hover tooltip */}
      {hov && !disabled && !found && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: 6, background: 'rgba(42,34,24,0.95)', color: '#d4a843',
          padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
          whiteSpace: 'nowrap', border: '1px solid rgba(212,168,67,0.4)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)', fontFamily: 'Georgia,serif',
          zIndex: 100,
        }}>
          {obj.name}
        </div>
      )}
    </div>
  );
}

// ─── Clue Overlay ───────────────────────────────────────────────
function ClueOverlay({ obj, distractedMarker, awarenessBonus, onDismiss }: {
  obj: InvestigationObject; distractedMarker: boolean; awarenessBonus: boolean; onDismiss: () => void;
}) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(10,8,5,0.88)', backdropFilter: 'blur(10px)',
      zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{
          background: 'linear-gradient(135deg, #1a2e1a, #0d1f0d)',
          borderRadius: 14, padding: 22, maxWidth: 400, width: '100%',
          borderLeft: '4px solid #aed456',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', fontFamily: 'Georgia,serif', color: '#aed456', marginBottom: 4 }}>
          INVESTIGATION BREAKTHROUGH
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#e9e2d5', fontFamily: 'Georgia,serif', marginBottom: 12 }}>
          {obj.title}
        </div>
        <p style={{
          fontSize: 13, lineHeight: 1.65, color: '#c6c8b8', margin: '0 0 14px', fontFamily: 'Manrope, sans-serif',
          filter: distractedMarker ? 'blur(0px)' : 'none',
        }}>
          {distractedMarker ? obj.body.split('.').slice(0, 1).join('.') + '.' : obj.body}
          {distractedMarker && <span style={{ filter: 'blur(3px)', display: 'inline' }}>{' ' + obj.body.split('.').slice(1).join('.')}</span>}
        </p>
        {obj.resourceHint && (
          <div style={{
            background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: 8, marginBottom: 12,
            fontSize: 11, color: '#aed456',
          }}>
            Resource Insight: {obj.resourceHint}
          </div>
        )}
        {awarenessBonus && (
          <div style={{
            background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.3)',
            borderRadius: 6, padding: 8, marginBottom: 12, fontSize: 11, color: '#d4a843',
          }}>
            Awareness Bonus: +200 additional points from heightened observation
          </div>
        )}
        {obj.meaning && (
          <p style={{ fontSize: 11, color: '#808878', fontStyle: 'italic', margin: '0 0 14px', lineHeight: 1.5 }}>
            {obj.meaning}
          </p>
        )}
        <button onClick={onDismiss} style={{
          width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #aed456, #8cb844)', color: '#16130c',
          fontWeight: 700, fontSize: 13, fontFamily: 'Georgia,serif',
        }}>
          Got it
        </button>
      </motion.div>
    </div>
  );
}

// ─── Consequence Overlay ────────────────────────────────────────
function ConsequenceOverlay({ obj, clickResult, onDismiss }: {
  obj: InvestigationObject; clickResult: ClickResult; onDismiss: () => void;
}) {
  const kind = clickResult.consequenceDetail?.kind || 'wasted';
  const label = CONSEQUENCE_LABELS[kind] || 'Consequence';

  const typeMessages: Record<string, string> = {
    timer: `You lost ${clickResult.consequenceDetail?.timerLoss || 5} seconds investigating this.`,
    distracted: 'You are now distracted. Your next clue text will be partially blurred.',
    awareness: 'Your awareness is heightened. Your next relevant find earns bonus points.',
    wasted: 'Time spent but no lasting effect. Stay focused on structural issues.',
    bureaucratic: 'A bureaucratic dead end. Paperwork without progress.',
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(10,8,5,0.88)', backdropFilter: 'blur(10px)',
      zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{
          background: 'linear-gradient(135deg, #3d2b1f, #2a1c12)',
          borderRadius: 14, padding: 22, maxWidth: 400, width: '100%',
          borderLeft: '4px solid #e9c349',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <span style={{
            padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700,
            background: 'rgba(233,195,73,0.15)', color: '#e9c349', border: '1px solid rgba(233,195,73,0.3)',
          }}>
            {label}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#c04030' }}>-500</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#e9e2d5', fontFamily: 'Georgia,serif', marginBottom: 10 }}>
          {obj.title}
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: '#c6c8b8', margin: '0 0 12px', fontFamily: 'Manrope, sans-serif' }}>
          {obj.body}
        </p>
        <p style={{ fontSize: 12, color: '#e9c349', margin: '0 0 14px' }}>
          {typeMessages[kind]}
        </p>
        {obj.meaning && (
          <p style={{ fontSize: 11, color: '#808878', fontStyle: 'italic', margin: '0 0 14px', lineHeight: 1.5 }}>
            {obj.meaning}
          </p>
        )}
        <button onClick={onDismiss} style={{
          width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #e9c349, #c9a329)', color: '#16130c',
          fontWeight: 700, fontSize: 13, fontFamily: 'Georgia,serif',
        }}>
          Continue investigating
        </button>
      </motion.div>
    </div>
  );
}

// ─── Pass Turn Overlay ──────────────────────────────────────────
function PassTurnOverlay({ nextPlayer, onReady }: {
  nextPlayer: Player; onReady: () => void;
}) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(22,19,12,0.92)',
      zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', maxWidth: 360 }}
      >
        <div style={{ fontSize: 11, color: '#808878', letterSpacing: '0.1em', fontFamily: 'Georgia,serif', marginBottom: 8 }}>
          PASS THE DEVICE
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#aed456', fontFamily: 'Georgia,serif', marginBottom: 6 }}>
          {nextPlayer.name}
        </div>
        <div style={{ fontSize: 13, color: '#c6c8b8', marginBottom: 24, textTransform: 'capitalize' }}>
          {nextPlayer.roleId}
        </div>
        <button onClick={onReady} style={{
          padding: '12px 36px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: '#aed456', color: '#16130c', fontWeight: 700, fontSize: 14,
          fontFamily: 'Georgia,serif', boxShadow: '0 4px 16px rgba(174,212,86,0.3)',
        }}>
          Ready
        </button>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function InvestigationPhase({
  session, challenge, players, onPhaseComplete,
}: InvestigationPhaseProps) {
  // State — starts directly in 'playing' (no intro screen)
  console.log('INVESTIGATION_PHASE: Mounted → direct to playing (no intro)');
  const [screenState, setScreenState] = useState<ScreenState>('playing');
  const [timer, setTimer] = useState(TURN_SECONDS);
  const [score, setScore] = useState(0);
  const [foundObjects, setFoundObjects] = useState<Set<string>>(new Set());
  const [foundRelevance, setFoundRelevance] = useState<Record<string, boolean>>({});
  const [discoveries, setDiscoveries] = useState<InvestigationObject[]>([]);
  const [mistakes, setMistakes] = useState<InvestigationObject[]>([]);
  const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintGlow, setHintGlow] = useState<string | null>(null);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [activeClue, setActiveClue] = useState<{ obj: InvestigationObject; result: ClickResult } | null>(null);
  const [activeConsequence, setActiveConsequence] = useState<{ obj: InvestigationObject; result: ClickResult } | null>(null);

  const sceneRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Resolve zone
  const engineZoneId = challenge.affectedZoneIds?.[0] || 'boating_pond';
  const invZoneId = useMemo(() => getInvestigationZoneIdFromEngine(engineZoneId), [engineZoneId]);
  const zone = useMemo(() => getInvestigationZone(invZoneId), [invZoneId]);

  const sortedPlayers = useMemo(() => [...players].sort((a, b) => a.utilityScore - b.utilityScore), [players]);
  const currentPlayer = sortedPlayers[currentPlayerIdx] || players[0];
  const relevantCount = useMemo(() => zone.objects.filter(o => o.relevant).length, [zone]);

  // Timer color
  const timerColor = timer > 5 ? '#aed456' : timer > 3 ? '#e9c349' : '#c04030';

  // Turn timer
  useEffect(() => {
    if (screenState !== 'playing') {
      clearInterval(timerRef.current);
      return;
    }
    if (timer <= 0) {
      advancePlayer();
      return;
    }
    if (timer <= 3) sounds.playTimerTick();
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          advancePlayer();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [screenState, timer]);

  // Advance to next player or summary
  const advancePlayer = useCallback(() => {
    const next = currentPlayerIdx + 1;
    if (next >= sortedPlayers.length || discoveries.length >= relevantCount) {
      setScreenState('summary');
    } else {
      setCurrentPlayerIdx(next);
      setTimer(TURN_SECONDS);
      setScreenState('pass_turn');
    }
  }, [currentPlayerIdx, sortedPlayers.length, discoveries.length, relevantCount]);

  // Scene click handler
  const handleSceneClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (screenState !== 'playing') return;
    if (!sceneRef.current) return;

    const rect = sceneRef.current.getBoundingClientRect();
    const result = findNearestObject(
      e.clientX - rect.left,
      e.clientY - rect.top,
      rect.width,
      rect.height,
      zone.objects,
      foundObjects,
    );

    if (!result) return;

    const clickResult = handleObjectClick(result, activeEffects);

    // Update found set
    const newFound = new Set(foundObjects);
    newFound.add(result.id);
    setFoundObjects(newFound);
    setFoundRelevance(prev => ({ ...prev, [result.id]: result.relevant }));

    // Update score
    setScore(s => s + clickResult.scoreChange);

    if (clickResult.type === 'clue') {
      sounds.playTokenGain();
      setDiscoveries(prev => [...prev, result]);
      // Clear effects after finding a clue
      setActiveEffects(new Set());
      setScreenState('showing_clue');
      setActiveClue({ obj: result, result: clickResult });
    } else {
      sounds.playTokenLoss();
      setMistakes(prev => [...prev, result]);

      // Apply consequence effects
      if (clickResult.consequenceDetail) {
        const kind = clickResult.consequenceDetail.kind;
        if (kind === 'timer') {
          setTimer(t => Math.max(0, t - (clickResult.consequenceDetail!.timerLoss || 5)));
        } else if (kind === 'distracted') {
          setActiveEffects(prev => { const s = new Set(prev); s.add('distracted'); return s; });
        } else if (kind === 'awareness') {
          setActiveEffects(prev => { const s = new Set(prev); s.add('awareness'); return s; });
          setScore(s => s + 25);
        }
      }
      setScreenState('showing_consequence');
      setActiveConsequence({ obj: result, result: clickResult });
    }
  }, [screenState, zone.objects, foundObjects, activeEffects]);

  // Dismiss clue -> pass turn
  const dismissClue = useCallback(() => {
    setActiveClue(null);
    advancePlayer();
  }, [advancePlayer]);

  // Dismiss consequence -> resume playing
  const dismissConsequence = useCallback(() => {
    setActiveConsequence(null);
    setScreenState('playing');
  }, []);

  // Pass turn ready
  const handlePassReady = useCallback(() => {
    setTimer(TURN_SECONDS);
    setScreenState('playing');
  }, []);

  // Hint
  const useHintAction = useCallback(() => {
    const result = handleHintUse(zone.objects, foundObjects, hintsUsed);
    if (!result) return;
    setHintsUsed(h => h + 1);
    setScore(s => s - result.scorePenalty);
    setHintGlow(result.object.id);
    setTimeout(() => setHintGlow(null), 3000);
  }, [zone.objects, foundObjects, hintsUsed]);

  // Summary / complete
  const summary = useMemo(() => {
    return getInvestigationSummary(zone.objects, foundObjects, score);
  }, [zone.objects, foundObjects, score]);

  const handleComplete = useCallback(() => {
    const results: InvestigationPhaseResult = {
      relevantFound: discoveries.map(d => d.name),
      irrelevantClicked: mistakes.map(m => ({ objectId: m.name, consequence: m.consequence || 'wasted' })),
      totalFound: discoveries.length,
      quality: summary.quality,
      score: summary.finalScore,
      cpAwarded: Object.fromEntries(sortedPlayers.map(p => [p.id, Math.floor(discoveries.length * 0.5)])),
    };
    console.log('INVESTIGATION_COMPLETE:', results);
    onPhaseComplete(results);
  }, [discoveries, mistakes, summary, sortedPlayers, onPhaseComplete]);

  // Inventory slots
  const inventorySlots = useMemo(() => {
    const relevant = zone.objects.filter(o => o.relevant);
    return relevant.slice(0, 5).map(obj => ({
      obj,
      found: foundObjects.has(obj.id),
    }));
  }, [zone.objects, foundObjects]);

  // ─── RENDER ───────────────────────────────────────────────────
  return (
    <div style={{
      width: '100%', height: '100vh', background: '#16130c', fontFamily: "'Segoe UI',system-ui,sans-serif",
      color: '#e9e2d5', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* ═══ LAYER 1 (z-50): TOP HUD BAR ═══ */}
      {(
        <div style={{
          background: `repeating-linear-gradient(90deg, rgba(60,40,20,0.03) 0px, rgba(60,40,20,0.03) 2px, transparent 2px, transparent 5px), linear-gradient(180deg, #2a1e12, #1a1208)`,
          padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '2px solid #1a1208',
          boxShadow: 'inset 0 2px rgba(244,187,146,0.2), 0 4px rgba(22,19,12,0.8)',
          zIndex: 50, flexShrink: 0, position: 'relative',
        }}>
          {/* Green vine strip */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, #2d5a1e, #4a8a30, #2d5a1e, #4a8a30, #2d5a1e)', opacity: 0.5,
          }} />

          {/* Left: zone title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{'\u{1F3DE}\uFE0F'}</span>
            <span style={{
              fontSize: 14, fontWeight: 800, letterSpacing: '0.06em', color: '#aed456',
              fontFamily: 'Epilogue, sans-serif', textTransform: 'uppercase',
            }}>
              {zone.title}
            </span>
            {/* Difficulty dots */}
            <span style={{ letterSpacing: 3, fontSize: 12 }}>
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} style={{ color: i < zone.difficulty ? '#e9c349' : '#45483c' }}>
                  {i < zone.difficulty ? '\u25CF' : '\u25CB'}
                </span>
              ))}
            </span>
          </div>

          {/* Center: score */}
          <div style={{
            background: `repeating-linear-gradient(90deg, rgba(60,40,20,0.03) 0px, rgba(60,40,20,0.03) 2px, transparent 2px, transparent 5px), linear-gradient(135deg, #221f18, #1e1b14)`,
            padding: '4px 16px', borderRadius: 6,
            boxShadow: 'inset 0 2px rgba(244,187,146,0.2), 0 4px rgba(22,19,12,0.8)',
          }}>
            <span style={{
              fontSize: 28, fontWeight: 700, color: '#d4a843', fontFamily: 'Georgia, serif',
              textShadow: '0 0 12px rgba(212,168,67,0.4)',
            }}>
              {score.toLocaleString()}
            </span>
          </div>

          {/* Right: player + timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Player tag */}
            {currentPlayer && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: ROLE_COLORS[currentPlayer.roleId] || '#666',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: '#fff',
                }}>
                  {currentPlayer.name.slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#aed456' }}>{currentPlayer.name}</div>
                  <div style={{ fontSize: 9, color: '#c6c8b8', textTransform: 'capitalize' }}>{currentPlayer.roleId}</div>
                </div>
              </div>
            )}

            {/* Timer */}
            <span style={{
              fontSize: 22, fontWeight: 800, color: timerColor, fontFamily: 'Georgia, serif',
              fontVariantNumeric: 'tabular-nums',
              animation: timer <= 3 ? 'pulse 0.5s ease infinite' : 'none',
            }}>
              {timer}s
            </span>

            {/* Settings gear */}
            <span style={{ fontSize: 16, color: '#f4bb92', cursor: 'pointer', opacity: 0.6 }}>{'\u2699\uFE0F'}</span>
          </div>
        </div>
      )}

      {/* ═══ LAYER 3 (z-0) + LAYER 2 (z-10): SCENE AREA ═══ */}
      {(
        <div
          ref={sceneRef}
          onClick={handleSceneClick}
          style={{
            flex: 1, position: 'relative', overflow: 'hidden', cursor: 'crosshair',
            pointerEvents: 'auto',
          }}
        >
          {/* LAYER 3: Background */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse 100% 80% at 50% 30%, ${zone.backgroundGradient}, #16130c 70%)`,
            filter: 'brightness(0.85) contrast(1.1)',
          }} />
          {/* Vignette */}
          <div style={{
            position: 'absolute', inset: 0,
            boxShadow: 'inset 0 0 150px rgba(22,19,12,0.9)',
            pointerEvents: 'none', zIndex: 1,
          }} />

          {/* LAYER 2: Scene elements (pointer-events none) */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
            {/* Water surface */}
            {zone.hasWater && (
              <div style={{
                position: 'absolute', top: '30%', left: '15%', right: '15%', bottom: '20%',
                background: 'linear-gradient(180deg, rgba(20,60,35,0.4), rgba(15,50,30,0.5), rgba(10,40,25,0.3))',
                borderRadius: '50%', transform: 'perspective(600px) rotateX(40deg)',
                boxShadow: 'inset 0 0 80px rgba(60,140,80,0.12), 0 0 60px rgba(30,100,50,0.1)',
                animation: 'shimmer 4s ease-in-out infinite',
              }} />
            )}

            {/* Lily pads */}
            {zone.hasWater && [{x:28,y:42,s:24,r:20},{x:52,y:48,s:18,r:-15},{x:40,y:54,s:14,r:45},{x:62,y:38,s:20,r:10},
              {x:35,y:60,s:12,r:-30},{x:55,y:55,s:16,r:60},{x:45,y:35,s:22,r:-5},{x:70,y:50,s:14,r:35}].map((l,i) => (
              <div key={`l${i}`} style={{
                position: 'absolute', left: `${l.x}%`, top: `${l.y}%`,
                width: l.s, height: l.s * 0.55, borderRadius: '50%',
                background: `radial-gradient(circle at 40% 40%, rgba(${60+i*8},${130+i*5},${50+i*4},0.4), rgba(40,90,35,0.2))`,
                transform: `rotate(${l.r}deg)`,
              }} />
            ))}

            {/* Dock planks */}
            {[{x:20,y:62,w:55,a:2},{x:18,y:66,w:58,a:1},{x:22,y:70,w:50,a:3}].map((d,i) => (
              <div key={`d${i}`} style={{
                position: 'absolute', left: `${d.x}%`, top: `${d.y}%`, width: `${d.w}%`, height: 5,
                background: 'linear-gradient(90deg, rgba(100,70,40,0.35), rgba(130,90,55,0.25), rgba(100,70,40,0.35))',
                borderRadius: 2, transform: `perspective(400px) rotateX(15deg) rotate(${d.a}deg)`,
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              }} />
            ))}

            {/* Reed clusters */}
            {[8,15,22,50,55,75,82,90].map((x, i) => (
              <div key={`r${i}`} style={{
                position: 'absolute', left: `${x}%`, top: `${18 + i * 5}%`,
                width: 2, height: 22 + i * 4,
                background: `linear-gradient(to top, rgba(50,100,40,0.4), rgba(90,160,60,0.2))`,
                borderRadius: 4, transform: `rotate(${-6 + i * 2}deg)`,
              }} />
            ))}

            {/* Algae patches */}
            {zone.hasWater && [{x:38,y:44,s:50},{x:55,y:52,s:35},{x:30,y:56,s:40},{x:60,y:42,s:30}].map((a,i) => (
              <div key={`a${i}`} style={{
                position: 'absolute', left: `${a.x}%`, top: `${a.y}%`,
                width: a.s, height: a.s * 0.5, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(80,120,30,0.25), transparent 70%)',
                transform: `rotate(${i * 30}deg)`,
              }} />
            ))}

            {/* Atmospheric fog */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse 120% 80% at 50% 100%, rgba(22,19,12,0.4), transparent 60%)',
            }} />
          </div>

          {/* Interactive object cards (z-10) */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
            {zone.objects.map((obj, i) => (
              <ObjectCard
                key={obj.id}
                obj={obj}
                index={i}
                found={foundObjects.has(obj.id)}
                foundRelevant={foundObjects.has(obj.id) ? (foundRelevance[obj.id] ?? null) : null}
                disabled={screenState !== 'playing'}
                onClick={(o) => {
                  // Direct click on card — bypass findNearestObject since we know the exact object
                  if (screenState !== 'playing') return;
                  console.log('PHASE4_CLICK: direct on', o.name);
                  const clickResult = handleObjectClick(o, activeEffects);
                  const newFound = new Set(foundObjects);
                  newFound.add(o.id);
                  setFoundObjects(newFound);
                  setFoundRelevance(prev => ({ ...prev, [o.id]: o.relevant }));
                  setScore(s => s + clickResult.scoreChange);

                  if (clickResult.type === 'clue') {
                    sounds.playTokenGain();
                    setDiscoveries(prev => [...prev, o]);
                    setActiveEffects(new Set());
                    setScreenState('showing_clue');
                    setActiveClue({ obj: o, result: clickResult });
                  } else {
                    sounds.playTokenLoss();
                    setMistakes(prev => [...prev, o]);
                    if (clickResult.consequenceDetail) {
                      const kind = clickResult.consequenceDetail.kind;
                      if (kind === 'timer') setTimer(t => Math.max(0, t - (clickResult.consequenceDetail!.timerLoss || 5)));
                      else if (kind === 'distracted') setActiveEffects(prev => { const s = new Set(prev); s.add('distracted'); return s; });
                      else if (kind === 'awareness') { setActiveEffects(prev => { const s = new Set(prev); s.add('awareness'); return s; }); setScore(s => s + 25); }
                    }
                    setScreenState('showing_consequence');
                    setActiveConsequence({ obj: o, result: clickResult });
                  }
                }}
              />
            ))}

            {/* Hint glow */}
            {hintGlow && (() => {
              const obj = zone.objects.find(o => o.id === hintGlow);
              if (!obj) return null;
              return (
                <div style={{
                  position: 'absolute', left: `${obj.x * 100}%`, top: `${obj.y * 100}%`,
                  transform: 'translate(-50%,-50%)', width: 80, height: 80, borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(233,195,73,0.4), transparent 70%)',
                  pointerEvents: 'none', animation: 'pulse 1.5s ease infinite', zIndex: 5,
                }} />
              );
            })()}
          </div>

          {/* Status effects bar */}
          {activeEffects.size > 0 && (
            <div style={{
              position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', gap: 6, zIndex: 30,
            }}>
              {activeEffects.has('distracted') && (
                <span style={{
                  padding: '3px 12px', borderRadius: 12, fontSize: 10, fontWeight: 700,
                  background: 'rgba(192,64,48,0.2)', color: '#c04030', border: '1px solid rgba(192,64,48,0.3)',
                  fontFamily: 'Georgia,serif',
                }}>
                  DISTRACTED
                </span>
              )}
              {activeEffects.has('awareness') && (
                <span style={{
                  padding: '3px 12px', borderRadius: 12, fontSize: 10, fontWeight: 700,
                  background: 'rgba(174,212,86,0.15)', color: '#aed456', border: '1px solid rgba(174,212,86,0.3)',
                  fontFamily: 'Georgia,serif',
                }}>
                  AWARENESS +1
                </span>
              )}
            </div>
          )}

          {/* ═══ OVERLAYS (z-60, conditional render) ═══ */}
          {screenState === 'showing_clue' && activeClue && (
            <ClueOverlay
              obj={activeClue.obj}
              distractedMarker={activeClue.result.distractedMarker || false}
              awarenessBonus={activeClue.result.awarenessBonus || false}
              onDismiss={dismissClue}
            />
          )}

          {screenState === 'showing_consequence' && activeConsequence && (
            <ConsequenceOverlay
              obj={activeConsequence.obj}
              clickResult={activeConsequence.result}
              onDismiss={dismissConsequence}
            />
          )}

          {screenState === 'pass_turn' && currentPlayer && (
            <PassTurnOverlay
              nextPlayer={currentPlayer}
              onReady={handlePassReady}
            />
          )}
        </div>
      )}

      {/* ═══ LAYER 1 (z-50): BOTTOM HUD BAR ═══ */}
      {screenState !== 'summary' && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px 10px',
          background: `repeating-linear-gradient(90deg, rgba(60,40,20,0.03) 0px, rgba(60,40,20,0.03) 2px, transparent 2px, transparent 5px), linear-gradient(0deg, #2a1e12, #1a1208)`,
          boxShadow: 'inset 0 2px rgba(244,187,146,0.2), 0 -4px rgba(22,19,12,0.8)',
          position: 'relative', flexShrink: 0, zIndex: 50,
        }}>
          {/* Green vine strip at top */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, #2d5a1e, #4a8a30, #2d5a1e, #4a8a30, #2d5a1e)', opacity: 0.4,
          }} />

          {/* Score counter (far left) */}
          <div style={{ textAlign: 'center', minWidth: 60 }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(212,168,67,0.5)', letterSpacing: '0.1em', fontFamily: 'Georgia,serif' }}>SCORE</div>
            <div style={{
              fontSize: 18, fontWeight: 800, color: '#d4a843', fontFamily: 'Georgia, serif',
              textShadow: '0 0 8px rgba(212,168,67,0.3)',
            }}>
              {score.toLocaleString()}
            </div>
          </div>

          {/* Inventory slots */}
          <div style={{ display: 'flex', gap: 4 }}>
            {inventorySlots.map(({ obj, found }) => (
              <div key={obj.id} style={{
                width: 72, height: 50, borderRadius: 6, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 2,
                background: found ? 'rgba(174,212,86,0.1)' : 'rgba(0,0,0,0.3)',
                border: found ? '1px solid rgba(174,212,86,0.3)' : '1px solid rgba(69,72,60,0.3)',
              }}>
                <span style={{
                  fontSize: 18, opacity: found ? 1 : 0.3,
                  filter: found ? 'brightness(1.2)' : 'none',
                }}>
                  {getEmoji(obj.icon)}
                </span>
                <span style={{
                  fontSize: 8, fontWeight: 600, color: found ? '#aed456' : '#45483c',
                  maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {obj.name}
                </span>
              </div>
            ))}
          </div>

          {/* Hint section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Hint pips */}
            <div style={{ display: 'flex', gap: 3 }}>
              {Array.from({ length: MAX_HINTS }, (_, i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: i < (MAX_HINTS - hintsUsed) ? '#e9c349' : '#45483c',
                }} />
              ))}
            </div>
            <button onClick={useHintAction} disabled={hintsUsed >= MAX_HINTS || screenState !== 'playing'}
              style={{
                width: 88, height: 40, borderRadius: 6, border: 'none', cursor: hintsUsed < MAX_HINTS ? 'pointer' : 'not-allowed',
                background: hintsUsed < MAX_HINTS ? '#aed456' : 'rgba(69,72,60,0.5)',
                color: hintsUsed < MAX_HINTS ? '#16130c' : '#45483c',
                fontWeight: 700, fontSize: 12, fontFamily: 'Georgia, serif',
                boxShadow: hintsUsed < MAX_HINTS ? '0 2px 8px rgba(174,212,86,0.3)' : 'none',
              }}>
              HINT
            </button>
          </div>
        </div>
      )}

      {/* ═══ SUMMARY SCREEN ═══ */}
      {screenState === 'summary' && (
        <div style={{
          position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #16130c, #221f18, #16130c)',
          zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 24, overflow: 'auto',
        }}>
          {/* Quality badge */}
          <div style={{
            padding: '6px 20px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            letterSpacing: '0.1em', fontFamily: 'Epilogue, sans-serif', textTransform: 'uppercase',
            background: summary.quality === 'Complete' ? 'rgba(174,212,86,0.15)' : 'rgba(233,195,73,0.15)',
            color: summary.quality === 'Complete' ? '#aed456' : '#e9c349',
            border: `1px solid ${summary.quality === 'Complete' ? 'rgba(174,212,86,0.3)' : 'rgba(233,195,73,0.3)'}`,
            marginBottom: 12,
          }}>
            {summary.quality} Investigation
          </div>

          <div style={{
            fontSize: 22, fontWeight: 800, color: '#e9e2d5', fontFamily: 'Georgia, serif', marginBottom: 4,
          }}>
            {zone.title}
          </div>

          {/* Found count */}
          <div style={{
            fontSize: 16, fontWeight: 700, color: '#d4a843', fontFamily: 'Georgia, serif', marginBottom: 20,
          }}>
            {summary.relevantFound}/{summary.relevantTotal} clues found
          </div>

          {/* Found list */}
          <div style={{ maxWidth: 420, width: '100%', marginBottom: 16 }}>
            {discoveries.map(d => (
              <div key={d.id} style={{
                display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px',
                background: 'rgba(174,212,86,0.05)', borderRadius: 8, marginBottom: 6,
                border: '1px solid rgba(174,212,86,0.1)',
              }}>
                <span style={{ fontSize: 18 }}>{getEmoji(d.icon)}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#aed456' }}>{d.title}</div>
                  <div style={{ fontSize: 10, color: '#c6c8b8' }}>{d.resourceHint}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Missed list */}
          {(() => {
            const missed = zone.objects.filter(o => o.relevant && !foundObjects.has(o.id));
            if (missed.length === 0) return null;
            return (
              <div style={{ maxWidth: 420, width: '100%', marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#808878', marginBottom: 6, letterSpacing: '0.1em' }}>MISSED</div>
                {missed.map(m => (
                  <div key={m.id} style={{
                    display: 'flex', gap: 10, alignItems: 'center', padding: '6px 12px',
                    background: 'rgba(192,64,48,0.05)', borderRadius: 8, marginBottom: 4,
                    border: '1px solid rgba(192,64,48,0.1)',
                  }}>
                    <span style={{ fontSize: 16, opacity: 0.5 }}>{getEmoji(m.icon)}</span>
                    <div style={{ fontSize: 11, color: '#808878' }}>{m.title}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Score breakdown */}
          <div style={{
            maxWidth: 420, width: '100%', padding: 16, borderRadius: 10,
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(69,72,60,0.3)', marginBottom: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#c6c8b8', marginBottom: 4 }}>
              <span>Investigation Score</span>
              <span style={{ fontFamily: 'Georgia, serif', color: '#d4a843' }}>{summary.score.toLocaleString()}</span>
            </div>
            {summary.completionBonus > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#aed456', marginBottom: 4 }}>
                <span>{summary.quality} Bonus</span>
                <span style={{ fontFamily: 'Georgia, serif' }}>+{summary.completionBonus.toLocaleString()}</span>
              </div>
            )}
            <div style={{
              display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700,
              color: '#e9e2d5', borderTop: '1px solid rgba(69,72,60,0.3)', paddingTop: 8, marginTop: 4,
            }}>
              <span>Final Score</span>
              <span style={{ fontFamily: 'Georgia, serif', color: '#d4a843' }}>{summary.finalScore.toLocaleString()}</span>
            </div>
          </div>

          {/* Phase 3 transition button */}
          <button onClick={() => { console.log('HOG_SUMMARY → PHASE3_SOLUTIONS'); handleComplete(); }} style={{
            padding: '12px 36px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: '#aed456', color: '#16130c', fontWeight: 700, fontSize: 15,
            fontFamily: 'Georgia, serif', boxShadow: '0 4px 16px rgba(174,212,86,0.3)',
          }}>
            Phase 3: Solutions {'\u2192'}
          </button>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
