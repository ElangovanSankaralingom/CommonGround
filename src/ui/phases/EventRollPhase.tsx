import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store';
import type { GameSession, ResourceType, RoleId } from '../../core/models/types';
import { ROLE_COLORS, RESOURCE_COLORS } from '../../core/models/constants';
import { ALL_EVENT_CARDS, ZONE_NAMES, ZONE_ID_MAP, type WindsEventCard } from '../../core/content/eventDeck';
import { PhaseNavigation } from '../effects/PhaseNavigation';
import { sounds } from '../../utils/sounds';
import { tokenFlyAway, tokenFlyIn, diceShake, diceLand } from '../../utils/animations';

// ─── Module-level deck state (persists across component remounts) ────
let deckState = {
  available: [...ALL_EVENT_CARDS],
  discarded: [] as WindsEventCard[],
  initialized: false,
  sessionId: '',
};

function initDeck(sessionId: string) {
  if (!deckState.initialized || deckState.sessionId !== sessionId) {
    deckState = {
      available: [...ALL_EVENT_CARDS],
      discarded: [],
      initialized: true,
      sessionId,
    };
    console.log('[PHASE 1] Deck initialized — 12 cards available');
  }
}

function drawCard(type: 'negative' | 'neutral' | 'positive'): WindsEventCard {
  let pool = deckState.available.filter(c => c.type === type);
  if (pool.length === 0) {
    const reshuffled = deckState.discarded.filter(c => c.type === type);
    if (reshuffled.length > 0) {
      deckState.available.push(...reshuffled);
      deckState.discarded = deckState.discarded.filter(c => c.type !== type);
      pool = deckState.available.filter(c => c.type === type);
      console.log(`[PHASE 1] Reshuffled ${reshuffled.length} ${type} cards`);
    }
    if (pool.length === 0) pool = deckState.available.length > 0 ? deckState.available : [...ALL_EVENT_CARDS];
  }
  const card = pool[Math.floor(Math.random() * pool.length)];
  deckState.available = deckState.available.filter(c => c.id !== card.id);
  deckState.discarded.push(card);
  console.log(`[PHASE 1] Drew card: ${card.name} (${card.type}) — ${deckState.available.length}/12 remaining`);
  return card;
}

// ─── Die SVG component ──────────────────────────────────────────────
const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[70, 70]],
  2: [[100, 40], [40, 100]],
  3: [[100, 40], [70, 70], [40, 100]],
  4: [[40, 40], [100, 40], [40, 100], [100, 100]],
  5: [[40, 40], [100, 40], [70, 70], [40, 100], [100, 100]],
  6: [[40, 40], [40, 70], [40, 100], [100, 40], [100, 70], [100, 100]],
};

function DieFace({ value, rolling }: { value: number; rolling: boolean }) {
  const pips = PIP_LAYOUTS[value] || PIP_LAYOUTS[1];
  return (
    <motion.svg
      width="120" height="120" viewBox="0 0 140 140"
      animate={rolling ? { scale: [1, 1.1, 0.95, 1.08, 1], rotate: [0, 10, -8, 5, 0] } : { scale: 1 }}
      transition={rolling ? { duration: 0.35, repeat: Infinity } : { duration: 0.3 }}
    >
      <rect x="4" y="4" width="132" height="132" rx="18" fill="#FAFAFA" stroke="#334155" strokeWidth="3" />
      {pips.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="12" fill="#1E293B" />
      ))}
    </motion.svg>
  );
}

// ─── Types & constants ──────────────────────────────────────────────
type Stage = 'intro' | 'rolling' | 'result_banner' | 'card_reveal' | 'effects' | 'ripple' | 'discard' | 'lesson' | 'continue';

const TYPE_CONFIG = {
  negative: { label: 'NEGATIVE EVENT', bg: 'rgba(220,38,38,0.08)', border: '#DC2626', cardBack: '#DC2626' },
  neutral:  { label: 'STABLE SEASON',  bg: 'rgba(148,163,184,0.08)', border: '#64748B', cardBack: '#64748B' },
  positive: { label: 'POSITIVE EVENT', bg: 'rgba(34,197,94,0.08)', border: '#22C55E', cardBack: '#22C55E' },
};

function rollToType(roll: number): 'negative' | 'neutral' | 'positive' {
  if (roll <= 2) return 'negative';
  if (roll <= 4) return 'neutral';
  return 'positive';
}

const CONDITION_LABELS: Record<string, string> = { good: 'Good', fair: 'Fair', poor: 'Poor', critical: 'Critical', locked: 'Locked' };
const CONDITION_ORDER = ['locked', 'critical', 'poor', 'fair', 'good'];

function shiftCondition(current: string, delta: number): string {
  const idx = CONDITION_ORDER.indexOf(current);
  if (idx < 0) return current;
  return CONDITION_ORDER[Math.max(0, Math.min(CONDITION_ORDER.length - 1, idx + delta))];
}

// ─── Main component ────────────────────────────────────────────────
interface EventRollPhaseProps {
  session: GameSession;
  onPhaseComplete: () => void;
}

export function EventRollPhase({ session, onPhaseComplete }: EventRollPhaseProps) {
  const rollEventDie = useGameStore(s => s.rollEventDie);
  const [stage, setStage] = useState<Stage>('intro');
  const [dieValue, setDieValue] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [finalRoll, setFinalRoll] = useState<number | null>(null);
  const [currentCard, setCurrentCard] = useState<WindsEventCard | null>(null);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [effectLines, setEffectLines] = useState<string[]>([]);
  const [visibleEffects, setVisibleEffects] = useState(0);
  const [visibleRipples, setVisibleRipples] = useState(0);
  const rollDone = useRef(false);

  useEffect(() => { initDeck(session.id); }, [session.id]);
  useEffect(() => { console.log(`[PHASE 1] Stage: ${stage}`); }, [stage]);

  const buildEffectLines = useCallback((card: WindsEventCard): string[] => {
    const lines: string[] = [];
    for (const eff of card.effects) {
      const zoneName = eff.zoneId ? (ZONE_NAMES[eff.zoneId] || eff.zoneId) : '';
      const zoneFullId = eff.zoneId ? (ZONE_ID_MAP[eff.zoneId] || eff.zoneId) : '';
      const zone = zoneFullId ? session.board.zones[zoneFullId] : null;
      switch (eff.type) {
        case 'zone_condition_drop': {
          const cur = zone?.condition || 'fair';
          const next = shiftCondition(cur, -(eff.levels || 1));
          lines.push(`${eff.zoneId} ${zoneName} Condition: ${CONDITION_LABELS[cur] || cur} \u2192 ${CONDITION_LABELS[next] || next}`);
          break;
        }
        case 'zone_condition_up': {
          const cur = zone?.condition || 'poor';
          const next = shiftCondition(cur, (eff.levels || 1));
          lines.push(`${eff.zoneId} ${zoneName} Condition: ${CONDITION_LABELS[cur] || cur} \u2192 ${CONDITION_LABELS[next] || next}`);
          break;
        }
        case 'resource_loss': {
          const cur = zone?.resources?.[eff.resourceType as keyof typeof zone.resources] ?? '?';
          const amt = eff.amount || 0;
          const next = typeof cur === 'number' ? Math.max(0, cur - amt) : '?';
          lines.push(`${eff.zoneId} ${eff.resourceType}: ${cur} \u2192 ${next}`);
          break;
        }
        case 'player_resource_loss': {
          const player = Object.values(session.players).find(p => p.roleId === eff.roleId);
          const rType = eff.resourceType as ResourceType;
          const cur = player?.resources?.[rType] ?? '?';
          const amt = eff.amount || 0;
          const next = typeof cur === 'number' ? Math.max(0, cur - amt) : '?';
          const roleName = eff.roleId ? eff.roleId.charAt(0).toUpperCase() + eff.roleId.slice(1) : '';
          lines.push(`${roleName} ${rType}: ${cur} \u2192 ${next}`);
          break;
        }
        case 'player_resource_gain': {
          const player = Object.values(session.players).find(p => p.roleId === eff.roleId);
          const rType = eff.resourceType as ResourceType;
          const cur = player?.resources?.[rType] ?? '?';
          const amt = eff.amount || 0;
          const next = typeof cur === 'number' ? cur + amt : '?';
          const roleName = eff.roleId ? eff.roleId.charAt(0).toUpperCase() + eff.roleId.slice(1) : '';
          lines.push(`${roleName} ${rType}: ${cur} \u2192 ${next}`);
          break;
        }
        case 'objective_threat': {
          const obj = eff.objective || 'unknown';
          lines.push(`${obj.charAt(0).toUpperCase() + obj.slice(1)} objective: AT RISK`);
          break;
        }
      }
    }
    return lines;
  }, [session]);

  // ─── Roll animation (3 phases: rapid, medium, slow) ───────────────
  const handleRoll = useCallback(() => {
    if (rolling || rollDone.current) return;
    setRolling(true);
    setStage('rolling');
    sounds.playDiceRoll();
    console.log('[PHASE 1] Die roll initiated');

    const result = Math.floor(Math.random() * 6) + 1;
    let tick = 0;

    const phase1 = setInterval(() => {
      setDieValue(Math.floor(Math.random() * 6) + 1);
      tick++;
      if (tick >= 20) {
        clearInterval(phase1);
        let t2 = 0;
        const phase2 = setInterval(() => {
          setDieValue(Math.floor(Math.random() * 6) + 1);
          t2++;
          if (t2 >= 6) {
            clearInterval(phase2);
            let t3 = 0;
            const phase3 = setInterval(() => {
              setDieValue(Math.floor(Math.random() * 6) + 1);
              t3++;
              if (t3 >= 3) {
                clearInterval(phase3);
                setDieValue(result);
                setRolling(false);
                sounds.playDiceLand();
                setFinalRoll(result);
                rollDone.current = true;
                console.log(`[PHASE 1] Die result: ${result}`);
                rollEventDie();
                setTimeout(() => setStage('result_banner'), 600);
              }
            }, 300);
          }
        }, 150);
      }
    }, 70);
  }, [rolling, rollEventDie]);

  // ─── Stage auto-advance timers ────────────────────────────────────
  useEffect(() => {
    if (stage === 'result_banner' && finalRoll !== null) {
      const eventType = rollToType(finalRoll);
      const card = drawCard(eventType);
      setCurrentCard(card);
      setEffectLines(buildEffectLines(card));
      if (eventType === 'negative') sounds.playNegativeEvent();
      else if (eventType === 'positive') sounds.playPositiveEvent();
      const t = setTimeout(() => setStage('card_reveal'), 1800);
      return () => clearTimeout(t);
    }
  }, [stage, finalRoll, buildEffectLines]);

  useEffect(() => {
    if (stage === 'card_reveal' && !cardFlipped) {
      const t = setTimeout(() => { setCardFlipped(true); sounds.playCardFlip(); }, 800);
      return () => clearTimeout(t);
    }
    if (stage === 'card_reveal' && cardFlipped) {
      const t = setTimeout(() => setStage('effects'), 1000);
      return () => clearTimeout(t);
    }
  }, [stage, cardFlipped]);

  useEffect(() => {
    if (stage === 'effects' && effectLines.length > 0 && visibleEffects < effectLines.length) {
      const t = setTimeout(() => {
        setVisibleEffects(v => v + 1);
        if (currentCard) {
          const eff = currentCard.effects[visibleEffects];
          if (eff && (eff.type === 'player_resource_gain' || eff.type === 'zone_condition_up')) {
            sounds.playTokenGain();
          } else if (eff && (eff.type === 'player_resource_loss' || eff.type === 'resource_loss' || eff.type === 'zone_condition_drop')) {
            sounds.playTokenLoss();
          }
        }
      }, 500);
      return () => clearTimeout(t);
    }
    if (stage === 'effects' && (effectLines.length === 0 || visibleEffects >= effectLines.length)) {
      const t = setTimeout(() => {
        setStage(currentCard?.rippleEffects?.length ? 'ripple' : 'discard');
      }, effectLines.length > 0 ? 800 : 400);
      return () => clearTimeout(t);
    }
  }, [stage, visibleEffects, effectLines, currentCard]);

  useEffect(() => {
    if (stage === 'ripple' && currentCard?.rippleEffects) {
      if (visibleRipples < currentCard.rippleEffects.length) {
        const t = setTimeout(() => setVisibleRipples(v => v + 1), 500);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setStage('discard'), 800);
      return () => clearTimeout(t);
    }
  }, [stage, visibleRipples, currentCard]);

  useEffect(() => {
    if (stage === 'discard') {
      const t = setTimeout(() => setStage('lesson'), 1200);
      return () => clearTimeout(t);
    }
  }, [stage]);

  useEffect(() => {
    if (stage === 'lesson') {
      const t = setTimeout(() => setStage('continue'), 2000);
      return () => clearTimeout(t);
    }
  }, [stage]);

  // ─── Derived values ───────────────────────────────────────────────
  const eventType = finalRoll !== null ? rollToType(finalRoll) : null;
  const cfg = eventType ? TYPE_CONFIG[eventType] : null;
  const showCard = stage !== 'intro' && stage !== 'rolling' && stage !== 'result_banner';

  return (
    <div style={{ minHeight: '100vh', background: cfg?.bg || '#0F172A', color: '#E2E8F0', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Phase 1: Winds of Change</h1>
        <p style={{ opacity: 0.6, margin: '0.25rem 0 0' }}>Round {session.currentRound} of {session.totalRounds}</p>
      </div>

      <AnimatePresence mode="wait">
        {/* Intro */}
        {stage === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center', marginTop: '4rem' }}>
            <p style={{ fontSize: '1.1rem', maxWidth: 500, margin: '0 auto 2rem' }}>
              The city never stays still. Roll the die to see what forces sweep through the park this season.
            </p>
            <motion.div style={{ cursor: 'pointer', display: 'inline-block' }}
              whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }} onClick={handleRoll}>
              <DieFace value={dieValue} rolling={false} />
              <p style={{ marginTop: '0.75rem', opacity: 0.7, fontSize: '0.9rem' }}>Click to roll</p>
            </motion.div>
          </motion.div>
        )}

        {/* Rolling */}
        {stage === 'rolling' && (
          <motion.div key="rolling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center', marginTop: '4rem' }}>
            <DieFace value={dieValue} rolling={true} />
            <p style={{ marginTop: '1rem', opacity: 0.7 }}>Rolling...</p>
          </motion.div>
        )}

        {/* Result banner */}
        {stage === 'result_banner' && cfg && (
          <motion.div key="banner" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center', marginTop: '3rem' }}>
            <DieFace value={finalRoll!} rolling={false} />
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
              style={{ marginTop: '1.5rem', padding: '0.75rem 2rem', borderRadius: 8, border: `2px solid ${cfg.border}`,
                display: 'inline-block', fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.1em', color: cfg.border }}>
              {cfg.label}
            </motion.div>
            <p style={{ marginTop: '0.5rem', opacity: 0.5 }}>You rolled a {finalRoll}</p>
          </motion.div>
        )}

        {/* Card area (card_reveal through continue) */}
        {showCard && currentCard && cfg && (
          <motion.div key="card-area" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 560, margin: '0 auto' }}>
            {/* Card with flip */}
            <div style={{ perspective: 1000, marginBottom: '1.5rem' }}>
              <motion.div animate={{ rotateY: cardFlipped ? 0 : 180 }} transition={{ duration: 0.6 }}
                style={{ transformStyle: 'preserve-3d', position: 'relative' }}>
                {/* Front face */}
                <motion.div
                  animate={stage === 'discard' ? { x: 300, opacity: 0, height: 0, marginBottom: 0, padding: 0 } : {}}
                  transition={{ duration: 0.6 }}
                  style={{ backfaceVisibility: 'hidden', background: '#1E293B', borderRadius: 12,
                    border: `2px solid ${cfg.border}`, padding: '1.5rem', minHeight: 180 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{currentCard.name}</span>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', padding: '2px 8px',
                      borderRadius: 4, background: cfg.border + '22', color: cfg.border, fontWeight: 600 }}>
                      {currentCard.type}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 0.75rem', lineHeight: 1.5, opacity: 0.85 }}>{currentCard.description}</p>
                  {currentCard.affectedZone && (
                    <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6 }}>
                      Affected zone: {ZONE_NAMES[currentCard.affectedZone] || currentCard.affectedZone}
                    </p>
                  )}
                </motion.div>
                {/* Back face */}
                {!cardFlipped && (
                  <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
                    background: cfg.cardBack, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', fontFamily: 'serif' }}>CG</span>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Effects list */}
            {stage !== 'card_reveal' && effectLines.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', opacity: 0.5, marginBottom: '0.5rem' }}>Effects</h3>
                {effectLines.slice(0, stage === 'effects' ? visibleEffects : effectLines.length).map((line, i) => (
                  <motion.div key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                    style={{ padding: '0.4rem 0.75rem', marginBottom: 4, borderRadius: 6,
                      background: 'rgba(255,255,255,0.04)', fontSize: '0.9rem', borderLeft: `3px solid ${cfg!.border}` }}>
                    {line}
                  </motion.div>
                ))}
              </div>
            )}

            {/* Ripple effects */}
            {stage !== 'card_reveal' && stage !== 'effects' && currentCard.rippleEffects.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', opacity: 0.5, marginBottom: '0.5rem' }}>Ripple Effects</h3>
                {currentCard.rippleEffects.slice(0, stage === 'ripple' ? visibleRipples : currentCard.rippleEffects.length).map((rip, i) => (
                  <motion.div key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                    style={{ padding: '0.4rem 0.75rem', marginBottom: 4, borderRadius: 6,
                      background: 'rgba(255,255,255,0.04)', fontSize: '0.9rem',
                      borderLeft: `3px solid ${rip.effectType === 'warning' ? '#EF4444' : '#22C55E'}` }}>
                    {rip.description}
                  </motion.div>
                ))}
              </div>
            )}

            {/* Follow-up message */}
            {(stage === 'lesson' || stage === 'continue') && currentCard.followUpMessage && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ fontSize: '0.9rem', padding: '0.75rem', background: 'rgba(255,255,255,0.04)',
                  borderRadius: 8, marginBottom: '0.75rem', lineHeight: 1.5 }}>
                {currentCard.followUpMessage}
              </motion.p>
            )}

            {/* Deck counter */}
            {(stage === 'discard' || stage === 'lesson' || stage === 'continue') && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.5 }}
                style={{ fontSize: '0.8rem', textAlign: 'center', margin: '0.5rem 0' }}>
                Event Deck: {deckState.available.length}/{ALL_EVENT_CARDS.length} remaining
              </motion.p>
            )}

            {/* Spatial lesson */}
            {(stage === 'lesson' || stage === 'continue') && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                style={{ fontStyle: 'italic', fontSize: '0.95rem', lineHeight: 1.6, textAlign: 'center',
                  margin: '1rem 0', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                What this teaches: {currentCard.spatialLesson}
              </motion.p>
            )}

            {/* Continue button */}
            {stage === 'continue' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { sounds.playButtonClick(); console.log('[PHASE 1] Continuing to Phase 2'); onPhaseComplete(); }}
                  style={{ padding: '0.9rem 2.5rem', fontSize: '1.05rem', fontWeight: 700,
                    background: '#D97706', color: '#FFF', border: 'none', borderRadius: 10,
                    cursor: 'pointer', letterSpacing: '0.02em' }}>
                  Continue to Phase 2: Investigate the Ground &rarr;
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom navigation */}
      <div style={{ marginTop: '2rem' }}>
        <PhaseNavigation onContinue={() => { sounds.playButtonClick(); onPhaseComplete(); }} canContinue={stage === 'continue'} continueLabel="Next Phase \u2192" />
      </div>
    </div>
  );
}

export default EventRollPhase;
