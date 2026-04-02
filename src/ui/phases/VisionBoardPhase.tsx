import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameSession, Player, ChallengeCard, ResourceType } from '../../core/models/types';
import { ROLE_COLORS } from '../../core/models/constants';
import {
  type VisionFeatureTile, type HybridTile, type ObjectiveId, type FeatureTile,
  HYBRID_TILES, getVisionTilesForZone, toFeatureTile,
  RESOURCE_ABILITY_MAP, calculateEffectiveness,
} from '../../core/content/featureTiles';
import {
  calculateBoardCost, calculateGroupBudget, calculateThreshold,
  evaluateVision, finalizeBoard,
  nashCheckAction, calculateBuchiSatisfaction, calculateCollaborativeScore, evaluateGoalShot,
  type CollaborativeScoreResult, type GoalShotResult,
} from '../../core/engine/visionBoardEngine';
import { BUCHI_OBJECTIVES } from '../../core/models/constants';
import { sounds } from '../../utils/sounds';

/* ── Design Tokens ─────────────────────────────────────────── */
const T = {
  primary: '#aed456', secondary: '#f4bb92', tertiary: '#e9c349',
  surface: '#16130c', container: '#221f18', containerHigh: '#2d2a22',
  onSurface: '#e9e2d5', onSurfaceVariant: '#c6c8b8', outlineVariant: '#45483c',
  fontHeadline: 'Epilogue, sans-serif', fontBody: 'Manrope, sans-serif', fontNumber: 'Georgia, serif',
  woodBevel: 'inset 0 2px rgba(244,187,146,0.2), 0 4px rgba(22,19,12,0.8)',
};
const RESOURCE_COLORS: Record<ResourceType, string> = {
  budget: '#e9c349', knowledge: '#5d8ac4', volunteer: '#aed456', material: '#f4bb92', influence: '#a088c4',
};
const RESOURCE_TYPES: ResourceType[] = ['budget', 'knowledge', 'volunteer', 'material', 'influence'];
const ICON_EMOJI: Record<string, string> = {
  plumbing: '🔧', water_drop: '💧', chair: '🪑', local_cafe: '☕', park: '🌿', sports_soccer: '⚽',
  layers: '📐', route: '🛤️', light_mode: '☀️', signpost: '🪧', delete: '🗑️', water: '💧',
  forest: '🌳', store: '🏪', groups: '👥', child_care: '👶', deck: '🏡', directions_walk: '🚶', nature: '🌱',
  solar_power: '☀️', theater_comedy: '🎭', museum: '🏛️', accessible: '♿', nightlife: '🌃',
  psychiatry: '🦋', sensors: '📡', construction: '🛠️', palette: '🎨',
};
function emojiFor(icon: string): string { return ICON_EMOJI[icon] || '❓'; }
const ZONE_LABELS: Record<string, string> = {
  z1: 'Main Entrance', z2: 'Fountain Plaza', z3: 'Boating Pond',
  z4: 'Herbal Garden', z5: 'Walking Track', z6: 'Playground', z13: 'PPP Zone',
};
const OBJECTIVE_LABELS: Record<ObjectiveId, string> = {
  safety: 'Safety', greenery: 'Greenery', access: 'Accessibility',
  culture: 'Culture', revenue: 'Revenue', community: 'Community',
};

const SUCCESS_CRITERIA: Record<string, string> = {
  drainage_system: 'Water clarity: dissolved oxygen above 4.0 mg/L within 6 months',
  community_seating: 'Visitor count: evening footfall above 100/day within 3 months',
  native_plants: 'Biodiversity: 20+ native species established within 12 months',
  playground_equipment: 'Safety rating: zero fall-zone injuries within 6 months',
  walking_path: 'Accessibility: full wheelchair access on 100% of track within 4 months',
  cafe_space: 'Revenue: Rs 5,000/month vendor fees within 6 months',
  water_filtration: 'Quality: coliform below 500 MPN/100ml within 4 months',
  path_lighting: 'Safety: evening usage above 50 walkers/hour within 2 months',
  signage_system: 'Wayfinding: zero lost-visitor complaints within 3 months',
  waste_management: 'Cleanliness: segregation rate above 60% within 4 months',
  irrigation_link: 'Greenery: garden survival rate above 90% through next monsoon',
  ecological_buffer: 'Ecology: 3+ bird species nesting within 12 months',
  vendor_market: 'Livelihood: 14 vendors formally registered within 4 months',
  fountain_repair: 'Function: fountain operational 18+ hours daily within 2 months',
  disability_access: 'Inclusion: RPD compliance certification within 6 months',
  community_governance: 'Governance: monthly meetings with 80% attendance within 3 months',
};

/* ── Result Interface ──────────────────────────────────────── */
interface VisionBoardResult {
  tiles: FeatureTile[];
  objectivesCovered: string[];
  threshold: number;
  visionStatement: string;
  consensusLevel: number;
}

/* ── Props ─────────────────────────────────────────────────── */
interface VisionBoardPhaseProps {
  session: GameSession;
  players: Player[];
  challenge: ChallengeCard | null;
  onPhaseComplete: (result: VisionBoardResult) => void;
}

/* ── Component ─────────────────────────────────────────────── */
export default function VisionBoardPhase({ session, players, challenge, onPhaseComplete }: VisionBoardPhaseProps) {
  type Screen = 'individual_picks' | 'group_negotiation' | 'resource_allocation' | 'vote_finalize';
  type BallState = 'held' | 'passing' | 'received' | 'dropped' | 'shooting';

  const sorted = useMemo(() => [...players].sort((a, b) => a.utilityScore - b.utilityScore), [players]);

  const [screen, setScreen] = useState<Screen>('individual_picks');
  const [ballHolderIdx, setBallHolderIdx] = useState(0);
  const [ballState, setBallState] = useState<BallState>('held');
  const [dropCount, setDropCount] = useState(0);
  const [nashHistory, setNashHistory] = useState<number[]>([]);
  const [nashToast, setNashToast] = useState<string | null>(null);
  const [playerPicks, setPlayerPicks] = useState<Record<string, string[]>>({});
  const [visionTiles, setVisionTiles] = useState<VisionFeatureTile[]>([]);
  const [commitments, setCommitments] = useState<Record<string, Record<ResourceType, number>>>({});
  const [starsUsed, setStarsUsed] = useState<Record<string, number>>({});
  const [starVotes, setStarVotes] = useState<Record<string, number>>({});
  const [goalResult, setGoalResult] = useState<GoalShotResult | null>(null);
  const [hybridMergeCount, setHybridMergeCount] = useState(0);

  const ballHolder = sorted[ballHolderIdx];

  /* ── Derived ──────────────────────────────────────────────── */
  const zoneId = useMemo(() => {
    const map: Record<string, string> = { boating_pond: 'z3', main_entrance: 'z1', fountain_plaza: 'z2', herbal_garden: 'z4', walking_track: 'z5', playground: 'z6', ppp_zone: 'z13' };
    return map[challenge?.affectedZoneIds?.[0] || 'boating_pond'] || 'z3';
  }, [challenge]);
  const availableTiles = useMemo(() => getVisionTilesForZone(zoneId), [zoneId]);
  const difficultyDots = challenge?.publicFace?.difficultyRating || 3;

  const boardCost = useMemo(() => calculateBoardCost(visionTiles), [visionTiles]);
  const groupBudget = useMemo(() => calculateGroupBudget(sorted), [sorted]);
  const buchiResults = useMemo(() => sorted.map(p => calculateBuchiSatisfaction(p, { tiles: visionTiles })), [sorted, visionTiles]);
  const possibleHybrids = useMemo(() => {
    const ids = new Set(visionTiles.map(t => t.id));
    return HYBRID_TILES.filter(h => ids.has(h.mergedFrom[0]) && ids.has(h.mergedFrom[1]));
  }, [visionTiles]);

  const pickTally = useMemo(() => {
    const tally: Record<string, { tile: VisionFeatureTile; count: number; pickedBy: string[] }> = {};
    Object.entries(playerPicks).forEach(([pid, picks]) => {
      picks.forEach(tid => {
        if (!tally[tid]) {
          const tile = availableTiles.find(t => t.id === tid);
          if (tile) tally[tid] = { tile, count: 0, pickedBy: [] };
        }
        if (tally[tid]) { tally[tid].count++; tally[tid].pickedBy.push(pid); }
      });
    });
    return Object.values(tally).sort((a, b) => b.count - a.count);
  }, [playerPicks, availableTiles]);

  const totalCommitted = useMemo(() => {
    const t: Record<ResourceType, number> = { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 };
    Object.values(commitments).forEach(pc => RESOURCE_TYPES.forEach(r => { t[r] += pc[r] || 0; }));
    return t;
  }, [commitments]);
  const allResourcesMet = useMemo(() => RESOURCE_TYPES.every(r => totalCommitted[r] >= boardCost.totalCost[r]), [totalCommitted, boardCost]);

  const collabScore = useMemo((): CollaborativeScoreResult | null => {
    if (screen !== 'vote_finalize') return null;
    return calculateCollaborativeScore(sorted, { tiles: visionTiles, commitments }, nashHistory, hybridMergeCount, 0);
  }, [screen, sorted, visionTiles, commitments, nashHistory, hybridMergeCount]);

  /* ── Turn guard ───────────────────────────────────────────── */
  const isMyTurn = useCallback((playerId?: string) => {
    const ok = (playerId || '') === ballHolder?.id;
    if (!ok) console.log('BLOCKED: Not your turn. Ball holder is', ballHolder?.name);
    return ok;
  }, [ballHolder]);

  /* ── Ball passing ─────────────────────────────────────────── */
  const passBall = useCallback((targetIdx: number) => {
    if (targetIdx === ballHolderIdx) return;
    const prev = sorted[ballHolderIdx]?.name;
    setBallState('passing');
    setTimeout(() => {
      setBallHolderIdx(targetIdx);
      setBallState('received');
      setDropCount(0);
      console.log('TURN_CHANGE:', prev, '→', sorted[targetIdx]?.name, 'ballHolder=', targetIdx);
      setTimeout(() => setBallState('held'), 400);
    }, 500);
  }, [ballHolderIdx, sorted]);

  const passBallToNext = useCallback(() => {
    passBall((ballHolderIdx + 1) % sorted.length);
  }, [ballHolderIdx, sorted, passBall]);

  const triggerBallDrop = useCallback((reason: string) => {
    setBallState('dropped');
    setDropCount(prev => prev + 1);
    setNashToast(reason);
    console.log('BALL_DROP:', reason, 'count=', dropCount + 1);
    setTimeout(() => { setBallState('held'); setNashToast(null); }, 3500);
  }, [dropCount]);

  /* ── handleComplete ───────────────────────────────────────── */
  const handleComplete = useCallback(() => {
    sounds.playButtonClick();
    const vision = evaluateVision(visionTiles, sorted);
    const thr = calculateThreshold(visionTiles, difficultyDots);
    const final = finalizeBoard(visionTiles, commitments,
      [...visionTiles].sort((a, b) => (starVotes[b.id] || 0) - (starVotes[a.id] || 0)).map(t => t.id),
      sorted, difficultyDots);
    console.log('VISION_COMPLETE threshold=', thr.threshold);
    onPhaseComplete({
      tiles: visionTiles.map(t => toFeatureTile(t)),
      objectivesCovered: Object.entries(vision.objectiveScores).filter(([, v]) => v >= 30).map(([k]) => k),
      threshold: thr.threshold,
      visionStatement: final.visionStatement,
      consensusLevel: final.consensusLevel,
    });
  }, [visionTiles, commitments, starVotes, sorted, difficultyDots, onPhaseComplete]);

  /* ── Init commitments ─────────────────────────────────────── */
  useEffect(() => {
    const c: Record<string, Record<ResourceType, number>> = {};
    sorted.forEach(p => { c[p.id] = { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 }; });
    setCommitments(c);
  }, [sorted]);

  /* ── Helpers ──────────────────────────────────────────────── */
  const costText = (tile: VisionFeatureTile) =>
    RESOURCE_TYPES.filter(r => tile.resourceCost[r] > 0)
      .map(r => `${r[0].toUpperCase()}:${tile.resourceCost[r]}`)
      .join(' ');

  const allPicked = sorted.length > 0 && sorted.every(p => (playerPicks[p.id]?.length ?? 0) >= 3);

  const screenIdx = ['individual_picks', 'group_negotiation', 'resource_allocation', 'vote_finalize'].indexOf(screen);

  /* ── SCREEN 1: Individual Picks ───────────────────────────── */
  const renderIndividualPicks = () => {
    const myPicks = playerPicks[ballHolder?.id] || [];
    return (
      <div style={{ display: 'flex', flexDirection: 'row', flex: 1, gap: 10, overflow: 'hidden' }}>
        {/* LEFT: Tile list */}
        <div style={{ width: '45%', overflowY: 'auto', padding: 8 }}>
          <div style={{ fontFamily: T.fontHeadline, fontSize: 14, color: T.primary, marginBottom: 8 }}>
            {ZONE_LABELS[zoneId] || zoneId} Features ({availableTiles.length})
          </div>
          {availableTiles.map(tile => {
            const picked = myPicks.includes(tile.id);
            return (
              <motion.div key={tile.id} whileHover={{ scale: 1.01 }}
                style={{
                  background: picked ? T.containerHigh : T.container, boxShadow: T.woodBevel,
                  borderRadius: 8, padding: 10, marginBottom: 6, cursor: 'pointer',
                  border: picked ? `1px solid ${T.primary}` : '1px solid transparent',
                  opacity: picked ? 0.5 : 1,
                }}
                onClick={() => {
                  if (!isMyTurn(ballHolder?.id)) return;
                  if (myPicks.length >= 3 || picked) return;
                  const nash = nashCheckAction({ type: 'place_tile', payload: tile }, ballHolder, sorted, { tiles: visionTiles, commitments });
                  setNashHistory(prev => [...prev, nash.nashScore]);
                  if (!nash.passed) { triggerBallDrop(nash.reason); return; }
                  if (nash.nashScore >= 25 && nash.nashScore <= 40) setNashToast('Borderline collaborative');
                  setPlayerPicks(prev => ({ ...prev, [ballHolder.id]: [...(prev[ballHolder.id] || []), tile.id] }));
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18 }}>{emojiFor(tile.icon)}</span>
                  <span style={{ fontFamily: T.fontBody, fontWeight: 700, fontSize: 13, color: T.onSurface }}>{tile.name}</span>
                </div>
                <div style={{ fontFamily: T.fontBody, fontSize: 10, color: T.onSurfaceVariant, marginTop: 2 }}>{tile.description}</div>
                <div style={{ fontFamily: T.fontNumber, fontSize: 10, marginTop: 4, display: 'flex', gap: 6 }}>
                  {RESOURCE_TYPES.filter(r => tile.resourceCost[r] > 0).map(r => (
                    <span key={r} style={{ color: RESOURCE_COLORS[r] }}>{r[0].toUpperCase()}:{tile.resourceCost[r]}</span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
        {/* RIGHT: Player panels */}
        <div style={{ width: '55%', overflowY: 'auto', padding: 8 }}>
          {sorted.map((p, idx) => {
            const active = p.id === ballHolder?.id;
            const pPicks = playerPicks[p.id] || [];
            return (
              <div key={p.id} style={{
                borderLeft: `3px solid ${active ? T.primary : ROLE_COLORS[p.roleId]}`,
                background: active ? T.containerHigh : T.container,
                borderRadius: 8, padding: 8, marginBottom: 6, opacity: active ? 1 : 0.6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: ROLE_COLORS[p.roleId],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: T.fontBody, fontSize: 12, fontWeight: 700, color: '#fff',
                  }}>{p.name[0]}</div>
                  <div>
                    <div style={{ fontFamily: T.fontBody, fontWeight: 700, fontSize: 13, color: T.onSurface }}>{p.name}</div>
                    <div style={{ fontFamily: T.fontBody, fontSize: 10, color: T.onSurfaceVariant }}>{p.roleId}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  {[0, 1, 2].map(slot => {
                    const tid = pPicks[slot];
                    const tile = tid ? availableTiles.find(t => t.id === tid) : null;
                    return (
                      <div key={slot} style={{
                        flex: 1, background: T.surface, borderRadius: 6, padding: 6,
                        border: `1px dashed ${T.outlineVariant}`, minHeight: 32,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {tile ? (
                          <span style={{ fontFamily: T.fontBody, fontSize: 11, color: T.onSurface }}>
                            {emojiFor(tile.icon)} {tile.name}
                          </span>
                        ) : (
                          <span style={{ fontFamily: T.fontBody, fontSize: 10, color: T.outlineVariant }}>[Pick {slot + 1}]</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {/* Confirm & Pass */}
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <button
              disabled={(playerPicks[ballHolder?.id]?.length ?? 0) < 3}
              onClick={() => { sounds.playButtonClick(); passBallToNext(); }}
              style={{
                background: (playerPicks[ballHolder?.id]?.length ?? 0) >= 3 ? T.primary : T.outlineVariant,
                color: T.surface, fontFamily: T.fontBody, fontWeight: 700, fontSize: 13,
                border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', opacity: (playerPicks[ballHolder?.id]?.length ?? 0) >= 3 ? 1 : 0.4,
              }}
            >Confirm & Pass Ball</button>
            {allPicked && (
              <button
                onClick={() => { sounds.playButtonClick(); setScreen('group_negotiation'); }}
                style={{
                  background: T.tertiary, color: T.surface, fontFamily: T.fontBody, fontWeight: 700,
                  fontSize: 13, border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
                }}
              >All players selected! Next: Group Negotiation &rarr;</button>
            )}
          </div>
          {/* Compilation */}
          {allPicked && pickTally.length > 0 && (
            <div style={{ marginTop: 12, background: T.container, borderRadius: 8, padding: 10, boxShadow: T.woodBevel }}>
              <div style={{ fontFamily: T.fontHeadline, fontSize: 12, color: T.tertiary, marginBottom: 4 }}>Most Popular</div>
              {pickTally.slice(0, 5).map(e => (
                <div key={e.tile.id} style={{ fontFamily: T.fontBody, fontSize: 11, color: T.onSurface, marginBottom: 2 }}>
                  {emojiFor(e.tile.icon)} {e.tile.name} ({e.count}/{sorted.length} players)
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── SCREEN 2: Group Negotiation ──────────────────────────── */
  const renderGroupNegotiation = () => {
    const overBudget = RESOURCE_TYPES.some(r => boardCost.totalCost[r] > groupBudget.available[r]);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 10, overflowY: 'auto', padding: 8 }}>
        {/* Pick tally */}
        <div style={{ fontFamily: T.fontHeadline, fontSize: 14, color: T.primary, marginBottom: 4 }}>Feature Popularity</div>
        {pickTally.map(entry => {
          const onBoard = visionTiles.some(vt => vt.id === entry.tile.id);
          const canMerge = possibleHybrids.some(h => h.mergedFrom.includes(entry.tile.id));
          return (
            <div key={entry.tile.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, background: T.container,
              borderRadius: 8, padding: 8, boxShadow: T.woodBevel, marginBottom: 4,
              opacity: onBoard ? 0.5 : 1,
            }}>
              <span style={{ fontSize: 16 }}>{emojiFor(entry.tile.icon)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: T.fontBody, fontWeight: 700, fontSize: 12, color: T.onSurface }}>{entry.tile.name}</div>
                <div style={{ fontFamily: T.fontBody, fontSize: 10, color: T.onSurfaceVariant }}>
                  {RESOURCE_TYPES.filter(r => entry.tile.resourceCost[r] > 0).map(r => (
                    <span key={r} style={{ color: RESOURCE_COLORS[r], marginRight: 4 }}>{r[0].toUpperCase()}:{entry.tile.resourceCost[r]}</span>
                  ))}
                </div>
              </div>
              <span style={{
                background: T.tertiary, color: T.surface, borderRadius: 12, padding: '2px 8px',
                fontFamily: T.fontNumber, fontSize: 11, fontWeight: 700,
              }}>{entry.count}/{sorted.length}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {entry.pickedBy.map(pid => {
                  const p = sorted.find(pp => pp.id === pid);
                  return p ? (
                    <div key={pid} style={{
                      width: 18, height: 18, borderRadius: '50%', background: ROLE_COLORS[p.roleId],
                      fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                    }}>{p.name[0]}</div>
                  ) : null;
                })}
              </div>
              {!onBoard && (
                <button onClick={() => {
                  if (!isMyTurn(ballHolder?.id)) return;
                  const nash = nashCheckAction({ type: 'place_tile', payload: entry.tile }, ballHolder, sorted, { tiles: visionTiles, commitments });
                  setNashHistory(prev => [...prev, nash.nashScore]);
                  if (!nash.passed) { triggerBallDrop(nash.reason); return; }
                  setVisionTiles(prev => [...prev, entry.tile]);
                }} style={{
                  background: T.primary, color: T.surface, border: 'none', borderRadius: 6,
                  padding: '4px 10px', fontFamily: T.fontBody, fontWeight: 700, fontSize: 11, cursor: 'pointer',
                }}>Promote &uarr;</button>
              )}
              {canMerge && onBoard && (
                <button onClick={() => {
                  if (!isMyTurn(ballHolder?.id)) return;
                  const hybrid = possibleHybrids.find(h => h.mergedFrom.includes(entry.tile.id));
                  if (!hybrid) return;
                  setVisionTiles(prev => {
                    const without = prev.filter(t => !hybrid.mergedFrom.includes(t.id));
                    const merged: VisionFeatureTile = {
                      id: hybrid.id, name: hybrid.name, icon: hybrid.icon, description: hybrid.description,
                      resourceCost: hybrid.resourceCost, objectivesServed: hybrid.objectivesServed,
                      compatibleZones: [], hybridsWith: [],
                    };
                    return [...without, merged];
                  });
                  setHybridMergeCount(prev => prev + 1);
                }} style={{
                  background: T.secondary, color: T.surface, border: 'none', borderRadius: 6,
                  padding: '4px 10px', fontFamily: T.fontBody, fontWeight: 700, fontSize: 11, cursor: 'pointer',
                }}>Merge</button>
              )}
            </div>
          );
        })}

        {/* Vision Board */}
        <div style={{ fontFamily: T.fontHeadline, fontSize: 14, color: T.tertiary, marginTop: 8 }}>VISION BOARD</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {visionTiles.map(tile => (
            <div key={tile.id} style={{
              background: T.containerHigh, borderRadius: 8, padding: 8, boxShadow: T.woodBevel,
              display: 'flex', alignItems: 'center', gap: 6, position: 'relative',
            }}>
              <span style={{ fontSize: 16 }}>{emojiFor(tile.icon)}</span>
              <div>
                <div style={{ fontFamily: T.fontBody, fontWeight: 700, fontSize: 12, color: T.onSurface }}>{tile.name}</div>
                <div style={{ fontFamily: T.fontNumber, fontSize: 10, color: T.onSurfaceVariant }}>
                  {RESOURCE_TYPES.filter(r => tile.resourceCost[r] > 0).map(r => (
                    <span key={r} style={{ color: RESOURCE_COLORS[r], marginRight: 4 }}>{r[0].toUpperCase()}:{tile.resourceCost[r]}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => setVisionTiles(prev => prev.filter(t => t.id !== tile.id))} style={{
                position: 'absolute', top: 2, right: 4, background: 'none', border: 'none',
                color: '#e55', fontSize: 14, cursor: 'pointer', lineHeight: 1,
              }}>&times;</button>
            </div>
          ))}
          {visionTiles.length === 0 && (
            <div style={{ fontFamily: T.fontBody, fontSize: 12, color: T.outlineVariant, padding: 10 }}>
              No features promoted yet. Use Promote buttons above.
            </div>
          )}
        </div>

        {/* Resource meters */}
        <div style={{ marginTop: 8 }}>
          {RESOURCE_TYPES.map(r => {
            const cost = boardCost.totalCost[r];
            const avail = groupBudget.available[r];
            const over = cost > avail;
            const pct = avail > 0 ? Math.min(100, (cost / avail) * 100) : 0;
            return (
              <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 70, fontFamily: T.fontBody, fontSize: 11, color: RESOURCE_COLORS[r], textTransform: 'capitalize' }}>{r}</span>
                <div style={{ flex: 1, height: 8, background: T.surface, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: over ? '#e55' : RESOURCE_COLORS[r], borderRadius: 4, transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontFamily: T.fontNumber, fontSize: 10, color: over ? '#e55' : T.onSurfaceVariant, width: 50, textAlign: 'right' }}>
                  {cost}/{avail}
                </span>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={() => { sounds.playButtonClick(); passBallToNext(); }} style={{
            background: T.outlineVariant, color: T.onSurface, border: 'none', borderRadius: 8,
            padding: '8px 16px', fontFamily: T.fontBody, fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>Pass Ball</button>
          <button
            disabled={visionTiles.length < 3 || overBudget}
            onClick={() => { sounds.playButtonClick(); setScreen('resource_allocation'); }}
            style={{
              background: visionTiles.length >= 3 && !overBudget ? T.primary : T.outlineVariant,
              color: T.surface, border: 'none', borderRadius: 8, padding: '8px 16px',
              fontFamily: T.fontBody, fontWeight: 700, fontSize: 13, cursor: 'pointer',
              opacity: visionTiles.length >= 3 && !overBudget ? 1 : 0.4,
            }}
          >Next: Assign Resources &rarr;</button>
        </div>
      </div>
    );
  };

  /* ── SCREEN 3: Resource Allocation ────────────────────────── */
  const effColor = (eff: number) => eff >= 70 ? T.primary : eff >= 40 ? T.tertiary : T.secondary;

  const renderResourceAllocation = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 10, overflowY: 'auto', padding: 8 }}>
        <div style={{ fontFamily: T.fontHeadline, fontSize: 14, color: T.primary, marginBottom: 4 }}>Resource Allocation</div>
        {visionTiles.map(tile => {
          const needed: Record<ResourceType, number> = { ...tile.resourceCost };
          return (
            <div key={tile.id} style={{ background: T.container, borderRadius: 8, padding: 10, boxShadow: T.woodBevel, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{emojiFor(tile.icon)}</span>
                <span style={{ fontFamily: T.fontBody, fontWeight: 700, fontSize: 13, color: T.onSurface }}>{tile.name}</span>
                <span style={{ fontFamily: T.fontNumber, fontSize: 10, color: T.onSurfaceVariant, marginLeft: 'auto' }}>
                  Needs: {costText(tile)}
                </span>
              </div>
              {RESOURCE_TYPES.filter(r => needed[r] > 0).map(r => {
                const rTotal = Object.values(commitments).reduce((s, pc) => s + (pc[r] || 0), 0);
                const met = rTotal >= needed[r];

                // Calculate effective value and breakdown by effectiveness tier
                let totalEffValue = 0;
                let greenTokens = 0;
                let amberTokens = 0;
                let redTokens = 0;
                sorted.forEach(p => {
                  const c = commitments[p.id]?.[r] || 0;
                  if (c <= 0) return;
                  const ak = RESOURCE_ABILITY_MAP[r] as keyof typeof p.abilities;
                  const e = calculateEffectiveness((p.abilities as any)[ak] ?? 0);
                  totalEffValue += c * (e / 100) * 5;
                  if (e >= 70) greenTokens += c;
                  else if (e >= 40) amberTokens += c;
                  else redTokens += c;
                });

                // Find best 2 players for smart suggestion
                const ranked = [...sorted].map(p => {
                  const ak = RESOURCE_ABILITY_MAP[r] as keyof typeof p.abilities;
                  return { name: p.name, eff: calculateEffectiveness((p.abilities as any)[ak] ?? 0) };
                }).sort((a, b) => b.eff - a.eff);
                const topTwo = ranked.slice(0, 2);

                return (
                  <div key={r} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: RESOURCE_COLORS[r] }} />
                      <span style={{ fontFamily: T.fontBody, fontSize: 11, color: T.onSurface, textTransform: 'capitalize' }}>{r}</span>
                      <span style={{ fontFamily: T.fontNumber, fontSize: 10, color: T.onSurfaceVariant }}>({needed[r]} needed)</span>
                    </div>

                    {/* ALL 5 players — no filtering */}
                    {sorted.map(p => {
                      const abilityKey = RESOURCE_ABILITY_MAP[r] as keyof typeof p.abilities;
                      const eff = calculateEffectiveness((p.abilities as any)[abilityKey] ?? 0);
                      const committed = commitments[p.id]?.[r] || 0;
                      const maxAvail = p.resources[r] ?? 0;
                      const isBallHolder = p.id === ballHolder?.id;
                      const effValue = committed * (eff / 100) * 5;
                      const ec = effColor(eff);
                      return (
                        <div key={p.id} style={{ marginLeft: 16, marginBottom: 3 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{
                              width: 20, height: 20, borderRadius: '50%', background: ROLE_COLORS[p.roleId],
                              fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0,
                            }}>{p.name[0]}</div>
                            <span style={{ fontFamily: T.fontBody, fontSize: 10, color: ec, width: 32, fontWeight: 600 }}>{eff}%</span>
                            <button disabled={!isBallHolder || committed <= 0} onClick={() => {
                              if (!isMyTurn(ballHolder?.id)) return;
                              console.log(`RESOURCE_COMMIT: ${p.name} decreases ${r} to ${committed - 1}`);
                              setCommitments(prev => ({
                                ...prev, [p.id]: { ...(prev[p.id] || { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 }), [r]: Math.max(0, committed - 1) }
                              }));
                            }} style={{
                              width: 20, height: 20, background: T.surface, border: `1px solid ${T.outlineVariant}`,
                              borderRadius: 3, color: T.onSurface, cursor: isBallHolder ? 'pointer' : 'default',
                              fontSize: 13, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              opacity: (!isBallHolder || committed <= 0) ? 0.3 : 1,
                            }}>{'\u2212'}</button>
                            <span style={{ fontFamily: T.fontNumber, fontSize: 12, color: T.onSurface, width: 16, textAlign: 'center' }}>{committed}</span>
                            <button disabled={!isBallHolder || committed >= maxAvail} onClick={() => {
                              if (!isMyTurn(ballHolder?.id)) return;
                              // Nash check: hoarding detection (only fail if player withholds what group needs most from them)
                              const nash = nashCheckAction({ type: 'commit_resource', payload: { resource: r, amount: committed + 1 } }, p, sorted, { tiles: visionTiles, commitments });
                              setNashHistory(prev => [...prev, nash.nashScore]);
                              if (!nash.passed) { triggerBallDrop(nash.reason); return; }
                              console.log(`RESOURCE_COMMIT: ${p.name} commits ${committed + 1} ${r} at ${eff}% = ${((committed + 1) * (eff / 100) * 5).toFixed(1)} pts`);
                              setCommitments(prev => ({
                                ...prev, [p.id]: { ...(prev[p.id] || { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 }), [r]: Math.min(maxAvail, committed + 1) }
                              }));
                            }} style={{
                              width: 20, height: 20, background: T.surface, border: `1px solid ${T.outlineVariant}`,
                              borderRadius: 3, color: T.onSurface, cursor: isBallHolder ? 'pointer' : 'default',
                              fontSize: 13, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              opacity: (!isBallHolder || committed >= maxAvail) ? 0.3 : 1,
                            }}>+</button>
                            <span style={{ fontFamily: T.fontNumber, fontSize: 9, color: T.onSurfaceVariant, width: 20, textAlign: 'center' }}>/{maxAvail}</span>
                            {/* Effective value */}
                            {committed > 0 && (
                              <span style={{ fontFamily: T.fontNumber, fontSize: 10, color: ec, fontWeight: 600, marginLeft: 4 }}>
                                = {effValue.toFixed(1)} pts
                              </span>
                            )}
                          </div>
                          {/* Teaching feedback for low effectiveness commitment */}
                          {committed > 0 && eff < 30 && (
                            <div style={{ fontFamily: T.fontBody, fontSize: 8, color: T.secondary, marginLeft: 25, fontStyle: 'italic', marginTop: 1 }}>
                              Low efficiency — consider if another player can contribute this more effectively
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Smart suggestion */}
                    <div style={{ fontFamily: T.fontBody, fontSize: 9, color: T.onSurfaceVariant, opacity: 0.6, fontStyle: 'italic', marginLeft: 16, marginTop: 2 }}>
                      Tip: {topTwo.map(t => `${t.name} (${t.eff}%)`).join(' and ')} most effective here
                    </div>

                    {/* Segmented progress bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 16, marginTop: 4 }}>
                      <div style={{ flex: 1, height: 7, background: T.surface, borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                        {/* Green segment (high eff) */}
                        {greenTokens > 0 && (
                          <div style={{
                            width: `${(greenTokens / Math.max(needed[r], 1)) * 100}%`,
                            height: '100%', background: T.primary, transition: 'width 0.3s',
                          }} />
                        )}
                        {/* Amber segment (medium eff) */}
                        {amberTokens > 0 && (
                          <div style={{
                            width: `${(amberTokens / Math.max(needed[r], 1)) * 100}%`,
                            height: '100%', background: T.tertiary, transition: 'width 0.3s',
                          }} />
                        )}
                        {/* Red segment (low eff) */}
                        {redTokens > 0 && (
                          <div style={{
                            width: `${(redTokens / Math.max(needed[r], 1)) * 100}%`,
                            height: '100%', background: T.secondary, transition: 'width 0.3s',
                          }} />
                        )}
                      </div>
                      <span style={{ fontFamily: T.fontNumber, fontSize: 10, color: met ? T.primary : '#e55', minWidth: 30 }}>
                        {rTotal}/{needed[r]}
                      </span>
                      {rTotal > 0 && (
                        <span style={{ fontFamily: T.fontNumber, fontSize: 9, color: effColor(totalEffValue / Math.max(rTotal, 1) * 20) }}>
                          {totalEffValue.toFixed(1)} pts
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={() => { sounds.playButtonClick(); passBallToNext(); }} style={{
            background: T.outlineVariant, color: T.onSurface, border: 'none', borderRadius: 8,
            padding: '8px 16px', fontFamily: T.fontBody, fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>Pass Ball</button>
          <button
            disabled={!allResourcesMet}
            onClick={() => { sounds.playButtonClick(); setScreen('vote_finalize'); }}
            style={{
              background: allResourcesMet ? T.primary : T.outlineVariant,
              color: T.surface, border: 'none', borderRadius: 8, padding: '8px 16px',
              fontFamily: T.fontBody, fontWeight: 700, fontSize: 13, cursor: 'pointer',
              opacity: allResourcesMet ? 1 : 0.4,
            }}
          >Next: Vote &amp; Finalize &rarr;</button>
        </div>
      </div>
    );
  };

  /* ── SCREEN 4: Vote + Finalize ────────────────────────────── */
  const renderVoteFinalize = () => {
    const myStars = starsUsed[ballHolder?.id] || 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 10, overflowY: 'auto', padding: 8 }}>
        {/* Star voting */}
        <div style={{ fontFamily: T.fontHeadline, fontSize: 14, color: T.primary, marginBottom: 4 }}>
          Star Voting ({ballHolder?.name}: {2 - myStars} stars left)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {visionTiles.map(tile => (
            <motion.div key={tile.id} whileHover={{ scale: 1.03 }}
              onClick={() => {
                if (!isMyTurn(ballHolder?.id)) return;
                if (myStars >= 2) return;
                const nash = nashCheckAction({ type: 'cast_vote', payload: tile.id }, ballHolder, sorted, { tiles: visionTiles, commitments });
                setNashHistory(prev => [...prev, nash.nashScore]);
                if (!nash.passed) { triggerBallDrop(nash.reason); return; }
                setStarVotes(prev => ({ ...prev, [tile.id]: (prev[tile.id] || 0) + 1 }));
                setStarsUsed(prev => ({ ...prev, [ballHolder.id]: (prev[ballHolder.id] || 0) + 1 }));
              }}
              style={{
                background: T.containerHigh, borderRadius: 8, padding: 10, boxShadow: T.woodBevel,
                cursor: myStars < 2 ? 'pointer' : 'default', minWidth: 120, textAlign: 'center',
              }}
            >
              <span style={{ fontSize: 20 }}>{emojiFor(tile.icon)}</span>
              <div style={{ fontFamily: T.fontBody, fontWeight: 700, fontSize: 12, color: T.onSurface }}>{tile.name}</div>
              <div style={{ fontFamily: T.fontNumber, fontSize: 16, color: T.tertiary, marginTop: 4 }}>
                {'★'.repeat(starVotes[tile.id] || 0)}{'☆'.repeat(Math.max(0, 3 - (starVotes[tile.id] || 0)))}
              </div>
              <div style={{ fontFamily: T.fontNumber, fontSize: 10, color: T.onSurfaceVariant }}>{starVotes[tile.id] || 0} stars</div>
              {SUCCESS_CRITERIA[tile.id] && (
                <div style={{ fontFamily: T.fontBody, fontSize: 9, color: T.onSurfaceVariant, marginTop: 4, fontStyle: 'italic' }}>
                  {SUCCESS_CRITERIA[tile.id]}
                </div>
              )}
            </motion.div>
          ))}
        </div>
        <button onClick={() => { sounds.playButtonClick(); passBallToNext(); }} style={{
          background: T.outlineVariant, color: T.onSurface, border: 'none', borderRadius: 8,
          padding: '6px 14px', fontFamily: T.fontBody, fontWeight: 700, fontSize: 12, cursor: 'pointer', alignSelf: 'flex-start',
        }}>Pass Ball (Voting)</button>

        {/* Buchi satisfaction */}
        <div style={{ fontFamily: T.fontHeadline, fontSize: 13, color: T.tertiary, marginTop: 8 }}>Objective Satisfaction</div>
        {buchiResults.map((br, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', background: ROLE_COLORS[sorted[i]?.roleId],
              fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            }}>{sorted[i]?.name[0]}</div>
            <span style={{ fontFamily: T.fontBody, fontSize: 11, color: T.onSurface, width: 70 }}>{br.playerName}</span>
            {br.buchiObjectives.map(o => (
              <span key={o.name} style={{
                fontFamily: T.fontBody, fontSize: 10,
                color: o.met ? '#6c6' : '#e55', marginRight: 6,
              }}>{o.met ? '✓' : '✗'} {OBJECTIVE_LABELS[o.name as ObjectiveId] || o.name}</span>
            ))}
            <span style={{ fontFamily: T.fontNumber, fontSize: 10, color: T.onSurfaceVariant, marginLeft: 'auto' }}>
              {br.satisfactionPercentage}%
            </span>
          </div>
        ))}

        {/* Collaborative score */}
        {collabScore && (
          <div style={{ background: T.container, borderRadius: 8, padding: 12, boxShadow: T.woodBevel, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* SVG circle ring */}
              <svg width={72} height={72} viewBox="0 0 72 72">
                <circle cx={36} cy={36} r={30} fill="none" stroke={T.outlineVariant} strokeWidth={6} />
                <circle cx={36} cy={36} r={30} fill="none"
                  stroke={collabScore.sharedBalanceAchieved ? T.primary : '#e55'}
                  strokeWidth={6} strokeLinecap="round"
                  strokeDasharray={`${(collabScore.score / 100) * 188.5} 188.5`}
                  transform="rotate(-90 36 36)" />
                <text x={36} y={40} textAnchor="middle" style={{ fontFamily: T.fontNumber, fontSize: 18, fill: T.onSurface }}>{collabScore.score}</text>
              </svg>
              <div style={{ flex: 1 }}>
                {(Object.entries(collabScore.breakdown) as [string, number][]).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                    <span style={{ fontFamily: T.fontBody, fontSize: 10, color: T.onSurfaceVariant, width: 100, textTransform: 'capitalize' }}>
                      {k.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <div style={{ flex: 1, height: 5, background: T.surface, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, v)}%`, height: '100%', background: T.primary, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontFamily: T.fontNumber, fontSize: 10, color: T.onSurfaceVariant, width: 28, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{
              fontFamily: T.fontBody, fontSize: 12, fontWeight: 700, marginTop: 8,
              color: collabScore.sharedBalanceAchieved ? '#6c6' : '#e55',
            }}>
              {collabScore.sharedBalanceAchieved ? 'Shared balance achieved' : 'Shared balance NOT achieved'}
            </div>
          </div>
        )}

        {/* Goal Shot or Adjust */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {collabScore?.sharedBalanceAchieved ? (
            <button onClick={() => {
              sounds.playButtonClick();
              setBallState('shooting');
              const result = evaluateGoalShot(collabScore, buchiResults);
              setGoalResult(result);
              if (result.result === 'goal') {
                setTimeout(() => handleComplete(), 2000);
              }
            }} style={{
              background: T.primary, color: T.surface, border: 'none', borderRadius: 8,
              padding: '10px 20px', fontFamily: T.fontBody, fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>Shoot for Goal</button>
          ) : (
            <button onClick={() => { sounds.playButtonClick(); setScreen('group_negotiation'); }} style={{
              background: T.secondary, color: T.surface, border: 'none', borderRadius: 8,
              padding: '10px 20px', fontFamily: T.fontBody, fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>Adjust Vision</button>
          )}
        </div>
      </div>
    );
  };

  /* ── Ball animation style ─────────────────────────────────── */
  const ballStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = { width: 16, height: 16, borderRadius: '50%', background: T.tertiary, position: 'absolute', top: -8, left: '50%', marginLeft: -8 };
    if (ballState === 'held') return { ...base, animation: 'ballBob 1s ease-in-out infinite' };
    if (ballState === 'dropped') return { ...base, animation: 'ballDrop 0.6s ease-in forwards' };
    if (ballState === 'received') return { ...base, animation: 'ballPulse 0.4s ease-out' };
    if (ballState === 'shooting') return { ...base, animation: 'ballShoot 0.8s ease-in forwards' };
    if (ballState === 'passing') return { ...base, opacity: 0 };
    return base;
  };

  /* ── RENDER ───────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.surface, color: T.onSurface, fontFamily: T.fontBody, position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${T.outlineVariant}` }}>
        <span style={{ fontFamily: T.fontHeadline, fontSize: 16, fontWeight: 700, color: T.primary }}>Phase 3: Vision Board</span>
        <span style={{ fontFamily: T.fontBody, fontSize: 12, color: T.onSurfaceVariant }}>
          {screen === 'individual_picks' && 'Individual Picks'}
          {screen === 'group_negotiation' && 'Group Negotiation'}
          {screen === 'resource_allocation' && 'Resource Allocation'}
          {screen === 'vote_finalize' && 'Vote & Finalize'}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: i <= screenIdx ? T.primary : T.outlineVariant,
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          {screen === 'individual_picks' && (
            <motion.div key="s1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {renderIndividualPicks()}
            </motion.div>
          )}
          {screen === 'group_negotiation' && (
            <motion.div key="s2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {renderGroupNegotiation()}
            </motion.div>
          )}
          {screen === 'resource_allocation' && (
            <motion.div key="s3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {renderResourceAllocation()}
            </motion.div>
          )}
          {screen === 'vote_finalize' && (
            <motion.div key="s4" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {renderVoteFinalize()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom: Player avatars + ball */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
        padding: '10px 14px', borderTop: `1px solid ${T.outlineVariant}`, position: 'relative',
      }}>
        {sorted.map((p, idx) => {
          const isHolder = idx === ballHolderIdx;
          const buchi = buchiResults[idx];
          return (
            <div key={p.id} style={{ position: 'relative', textAlign: 'center', cursor: 'pointer' }}
              onClick={() => { if (isHolder) return; sounds.playButtonClick(); passBall(idx); }}>
              {isHolder && <div style={ballStyle()} />}
              <div style={{
                width: 34, height: 34, borderRadius: '50%', background: ROLE_COLORS[p.roleId],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: T.fontBody, fontSize: 14, fontWeight: 700, color: '#fff',
                border: isHolder ? `2px solid ${T.primary}` : '2px solid transparent',
                transition: 'border 0.3s',
              }}>{p.name[0]}</div>
              <div style={{ fontFamily: T.fontBody, fontSize: 9, color: T.onSurfaceVariant, marginTop: 2 }}>{p.name.split(' ')[0]}</div>
              {/* Buchi dots */}
              <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginTop: 1 }}>
                {buchi?.buchiObjectives.map((o, oi) => (
                  <div key={oi} style={{ width: 5, height: 5, borderRadius: '50%', background: o.met ? '#6c6' : '#e55' }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Nash toast */}
      <AnimatePresence>
        {nashToast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            style={{
              position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
              background: '#e55', color: '#fff', fontFamily: T.fontBody, fontSize: 12, fontWeight: 700,
              padding: '8px 16px', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.4)', zIndex: 100,
              maxWidth: 320, textAlign: 'center',
            }}
          >{nashToast}</motion.div>
        )}
      </AnimatePresence>

      {/* Goal result overlay */}
      <AnimatePresence>
        {goalResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'absolute', inset: 0, background: 'rgba(22,19,12,0.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
            }}
          >
            <div style={{
              background: T.container, borderRadius: 16, padding: 28, boxShadow: T.woodBevel,
              textAlign: 'center', maxWidth: 360,
            }}>
              <div style={{
                fontFamily: T.fontHeadline, fontSize: 28, fontWeight: 700,
                color: goalResult.result === 'goal' ? T.primary : goalResult.result === 'near_miss' ? T.tertiary : '#e55',
              }}>
                {goalResult.result === 'goal' ? 'GOAL!' : goalResult.result === 'near_miss' ? 'Near Miss' : 'Miss'}
              </div>
              <div style={{ fontFamily: T.fontNumber, fontSize: 32, color: T.onSurface, margin: '8px 0' }}>{goalResult.score}</div>
              <div style={{ fontFamily: T.fontBody, fontSize: 13, color: T.onSurfaceVariant }}>{goalResult.feedback}</div>
              {goalResult.result !== 'goal' && (
                <button onClick={() => {
                  sounds.playButtonClick();
                  setGoalResult(null);
                  if (goalResult.loopBack) setScreen('group_negotiation');
                }} style={{
                  background: T.secondary, color: T.surface, border: 'none', borderRadius: 8,
                  padding: '8px 20px', fontFamily: T.fontBody, fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', marginTop: 14,
                }}>Adjust Vision</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyframes */}
      <style>{`
        @keyframes ballBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes ballDrop { 0% { transform: translateY(0); opacity:1; } 100% { transform: translateY(60px); opacity:0.4; } }
        @keyframes ballPulse { 0% { transform: scale(0.9); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } }
        @keyframes ballShoot { 0% { transform: translateY(0) scale(1); } 100% { transform: translateY(-250px) scale(0.4); opacity:0; } }
      `}</style>
    </div>
  );
}
