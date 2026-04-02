import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameSession, Player, ChallengeCard, ResourceType } from '../../core/models/types';
import { ROLE_COLORS } from '../../core/models/constants';
import {
  type VisionFeatureTile, type HybridTile, type ObjectiveId, type FeatureTile,
  FEATURE_TILES, HYBRID_TILES, getVisionTilesForZone, toFeatureTile,
  RESOURCE_ABILITY_MAP, calculateEffectiveness,
} from '../../core/content/featureTiles';
import {
  calculateBoardCost, calculateGroupBudget, checkAffordability,
  calculateThreshold, evaluateVision, proposeHybrid, finalizeBoard,
  nashCheckAction, calculateBuchiSatisfaction, calculateCollaborativeScore,
  evaluateGoalShot,
  type NashCheckResult, type BuchiSatisfactionResult, type CollaborativeScoreResult, type GoalShotResult,
} from '../../core/engine/visionBoardEngine';
import { BUCHI_OBJECTIVES } from '../../core/models/constants';
import { sounds } from '../../utils/sounds';

// ─── Types ──────────────────────────────────────────────────────

interface VisionBoardResult {
  tiles: FeatureTile[];
  objectivesCovered: string[];
  threshold: number;
  visionStatement: string;
  consensusLevel: number;
}

interface VisionBoardPhaseProps {
  session: GameSession;
  players: Player[];
  challenge: ChallengeCard | null;
  onPhaseComplete: (result: VisionBoardResult) => void;
}

type Screen = 'tile_selection' | 'resource_negotiation' | 'priority_vote' | 'vision_finalized';

// ─── Design tokens ──────────────────────────────────────────────

const T = {
  primary: '#aed456',
  secondary: '#f4bb92',
  tertiary: '#e9c349',
  surface: '#16130c',
  container: '#221f18',
  containerHigh: '#2d2a22',
  onSurface: '#e9e2d5',
  onSurfaceVariant: '#c6c8b8',
  outlineVariant: '#45483c',
  fontHeadline: 'Epilogue, sans-serif',
  fontBody: 'Manrope, sans-serif',
  fontNumber: 'Georgia, serif',
  woodBevel: 'inset 0 2px rgba(244,187,146,0.2), 0 4px rgba(22,19,12,0.8)',
};

const RESOURCE_COLORS: Record<ResourceType, string> = {
  budget: '#e9c349',
  knowledge: '#5d8ac4',
  volunteer: '#aed456',
  material: '#f4bb92',
  influence: '#a088c4',
};

const RESOURCE_TYPES: ResourceType[] = ['budget', 'knowledge', 'volunteer', 'material', 'influence'];

const ICON_EMOJI: Record<string, string> = {
  plumbing: '\u{1F527}', water_drop: '\u{1F4A7}', chair: '\u{1FA91}', local_cafe: '\u2615',
  park: '\u{1F33F}', sports_soccer: '\u26BD', layers: '\u{1F4D0}', route: '\u{1F6E4}\uFE0F',
  light_mode: '\u2600\uFE0F', signpost: '\u{1FAA7}', delete: '\u{1F5D1}\uFE0F', water: '\u{1F4A7}',
  forest: '\u{1F333}', store: '\u{1F3EA}', groups: '\u{1F465}', child_care: '\u{1F476}',
  deck: '\u{1F3E1}', directions_walk: '\u{1F6B6}', nature: '\u{1F331}',
  // Batch 2 tile icons
  solar_power: '\u2600\uFE0F', theater_comedy: '\u{1F3AD}', museum: '\u{1F3DB}\uFE0F',
  accessible: '\u267F', nightlife: '\u{1F303}', psychiatry: '\u{1F98B}',
  sensors: '\u{1F4E1}', construction: '\u{1F6E0}\uFE0F', palette: '\u{1F3A8}',
};

function emojiFor(icon: string): string {
  return ICON_EMOJI[icon] || '\u2753';
}

const OBJECTIVE_LABELS: Record<ObjectiveId, string> = {
  safety: 'Safety', greenery: 'Greenery', access: 'Accessibility',
  culture: 'Culture', revenue: 'Revenue', community: 'Community',
};

const ZONE_LABELS: Record<string, string> = {
  z1: 'Main Entrance', z2: 'Fountain Plaza', z3: 'Boating Pond',
  z4: 'Herbal Garden', z5: 'Walking Track', z6: 'Playground', z13: 'PPP Zone',
};

// ─── Main Component ─────────────────────────────────────────────

export default function VisionBoardPhase({ session, players, challenge, onPhaseComplete }: VisionBoardPhaseProps) {
  const [screen, setScreen] = useState<Screen>('tile_selection');
  const [selectedTiles, setSelectedTiles] = useState<VisionFeatureTile[]>([]);
  const [commitments, setCommitments] = useState<Record<string, Record<ResourceType, number>>>({});
  const [votes, setVotes] = useState<Record<string, string[]>>({});
  const [priorityOrder, setPriorityOrder] = useState<string[]>([]);

  // Ball & Nash state
  type BallState = 'held' | 'passing' | 'received' | 'dropped' | 'shooting';
  const [ballHolder, setBallHolder] = useState<string>(players[0]?.id || '');
  const [ballState, setBallState] = useState<BallState>('held');
  const [dropCount, setDropCount] = useState<Record<string, number>>({});
  const [nashHistory, setNashHistory] = useState<number[]>([]);
  const [nashToast, setNashToast] = useState<{ message: string; hint?: string } | null>(null);
  const [hybridMergeCount, setHybridMergeCount] = useState(0);
  const [tradeCount, setTradeCount] = useState(0);
  const [goalResult, setGoalResult] = useState<GoalShotResult | null>(null);
  const [adjustmentRound, setAdjustmentRound] = useState(false);

  // Zone resolution
  const engineZoneId = challenge?.affectedZoneIds?.[0] || 'boating_pond';
  const zoneIdMap: Record<string, string> = {
    boating_pond: 'z3', main_entrance: 'z1', fountain_plaza: 'z2',
    herbal_garden: 'z4', walking_track: 'z5', playground: 'z6', ppp_zone: 'z13',
  };
  const zoneId = zoneIdMap[engineZoneId] || 'z3';
  const availableTiles = useMemo(() => getVisionTilesForZone(zoneId), [zoneId]);

  // Group budget
  const groupBudget = useMemo(() => calculateGroupBudget(players), [players]);
  const boardCost = useMemo(() => calculateBoardCost(selectedTiles), [selectedTiles]);
  const affordability = useMemo(() => checkAffordability(boardCost.totalCost, groupBudget.available), [boardCost, groupBudget]);

  // Check for possible hybrids
  const possibleHybrids = useMemo(() => {
    const ids = new Set(selectedTiles.map(t => t.id));
    return HYBRID_TILES.filter(h => ids.has(h.mergedFrom[0]) && ids.has(h.mergedFrom[1]));
  }, [selectedTiles]);

  // Initialize commitments when entering negotiation
  const initCommitments = useCallback(() => {
    const init: Record<string, Record<ResourceType, number>> = {};
    players.forEach(p => {
      init[p.id] = { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 };
    });
    setCommitments(init);
  }, [players]);

  // Initialize votes
  const initVotes = useCallback(() => {
    const v: Record<string, string[]> = {};
    players.forEach(p => { v[p.id] = []; });
    setVotes(v);
  }, [players]);

  // Toggle tile selection
  const toggleTile = useCallback((tile: VisionFeatureTile) => {
    setSelectedTiles(prev => {
      const exists = prev.find(t => t.id === tile.id);
      if (exists) return prev.filter(t => t.id !== tile.id);
      return [...prev, tile];
    });
    sounds.playButtonClick();
  }, []);

  // Remove tile
  const removeTile = useCallback((tileId: string) => {
    setSelectedTiles(prev => prev.filter(t => t.id !== tileId));
    sounds.playButtonClick();
  }, []);

  // Merge hybrid
  const mergeHybrid = useCallback((hybrid: HybridTile) => {
    setSelectedTiles(prev => {
      const filtered = prev.filter(t => !hybrid.mergedFrom.includes(t.id));
      const syntheticTile: VisionFeatureTile = {
        id: hybrid.id,
        name: hybrid.name,
        icon: hybrid.icon,
        description: hybrid.description,
        resourceCost: hybrid.resourceCost,
        objectivesServed: hybrid.objectivesServed,
        compatibleZones: [],
        hybridsWith: [],
      };
      return [...filtered, syntheticTile];
    });
    setHybridMergeCount(c => c + 1);
    sounds.playButtonClick();
  }, []);

  // Commitment adjustment
  const adjustCommitment = useCallback((playerId: string, resource: ResourceType, delta: number) => {
    setCommitments(prev => {
      const playerCommit = { ...prev[playerId] };
      const player = players.find(p => p.id === playerId);
      if (!player) return prev;
      const maxAvailable = player.resources[resource];
      const newVal = Math.max(0, Math.min(maxAvailable, playerCommit[resource] + delta));
      playerCommit[resource] = newVal;
      return { ...prev, [playerId]: playerCommit };
    });
  }, [players]);

  // Total committed per resource
  const totalCommitted = useMemo(() => {
    const totals: Record<ResourceType, number> = { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 };
    Object.values(commitments).forEach(pc => {
      RESOURCE_TYPES.forEach(r => { totals[r] += pc[r]; });
    });
    return totals;
  }, [commitments]);

  // Check if all resource needs are met
  const allResourcesMet = useMemo(() => {
    return RESOURCE_TYPES.every(r => totalCommitted[r] >= boardCost.totalCost[r]);
  }, [totalCommitted, boardCost]);

  // Vote toggle
  const toggleVote = useCallback((playerId: string, featureId: string) => {
    setVotes(prev => {
      const pv = [...(prev[playerId] || [])];
      const idx = pv.indexOf(featureId);
      if (idx >= 0) {
        pv.splice(idx, 1);
      } else if (pv.length < 2) {
        pv.push(featureId);
      }
      return { ...prev, [playerId]: pv };
    });
    sounds.playButtonClick();
  }, []);

  // Check all votes placed
  const allVotesPlaced = useMemo(() => {
    return players.every(p => (votes[p.id] || []).length === 2);
  }, [players, votes]);

  // Vote counts per feature
  const voteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    selectedTiles.forEach(t => { counts[t.id] = 0; });
    Object.values(votes).forEach(pv => {
      pv.forEach(fid => { counts[fid] = (counts[fid] || 0) + 1; });
    });
    return counts;
  }, [votes, selectedTiles]);

  // Compute priority order from votes
  const computePriorityOrder = useCallback(() => {
    const sorted = [...selectedTiles].sort((a, b) => (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0));
    setPriorityOrder(sorted.map(t => t.id));
  }, [selectedTiles, voteCounts]);

  // Final evaluation
  const difficultyDots = challenge?.publicFace?.difficultyRating || 3;

  const finalResult = useMemo(() => {
    if (screen !== 'vision_finalized') return null;
    return finalizeBoard(selectedTiles, commitments, priorityOrder, players, difficultyDots);
  }, [screen, selectedTiles, commitments, priorityOrder, players, difficultyDots]);

  const vision = useMemo(() => {
    if (screen !== 'vision_finalized') return null;
    return evaluateVision(selectedTiles, players);
  }, [screen, selectedTiles, players]);

  const thresholdResult = useMemo(() => {
    if (screen !== 'vision_finalized') return null;
    return calculateThreshold(selectedTiles, difficultyDots);
  }, [screen, selectedTiles, difficultyDots]);

  // Buchi satisfaction per player (live)
  const buchiResults = useMemo(() => {
    return players.map(p => calculateBuchiSatisfaction(p, { tiles: selectedTiles }));
  }, [players, selectedTiles]);

  // Collaborative score (computed on finalized screen)
  const collabScore = useMemo(() => {
    if (screen !== 'vision_finalized') return null;
    return calculateCollaborativeScore(players, { tiles: selectedTiles, commitments }, nashHistory, hybridMergeCount, tradeCount);
  }, [screen, players, selectedTiles, commitments, nashHistory, hybridMergeCount, tradeCount]);

  // Nash-gated action wrapper
  const nashGatedAction = useCallback((
    actionType: 'place_tile' | 'commit_resource' | 'cast_vote' | 'propose_trade',
    payload: any,
    onPass: () => void,
  ) => {
    const actingPlayer = players.find(p => p.id === ballHolder);
    if (!actingPlayer) { onPass(); return; }

    const result = nashCheckAction(
      { type: actionType, payload },
      actingPlayer,
      players,
      { tiles: selectedTiles, commitments },
    );

    setNashHistory(prev => [...prev, result.nashScore]);

    if (result.passed) {
      onPass();
      // Pass ball to next player
      const currentIdx = players.findIndex(p => p.id === ballHolder);
      const nextIdx = (currentIdx + 1) % players.length;
      setBallState('passing');
      setTimeout(() => {
        setBallHolder(players[nextIdx].id);
        setBallState('received');
        setTimeout(() => setBallState('held'), 400);
      }, 300);
    } else {
      // Ball drop
      setBallState('dropped');
      const pd = dropCount[ballHolder] || 0;
      setDropCount(prev => ({ ...prev, [ballHolder]: pd + 1 }));
      const hint = pd >= 1
        ? `Hint: ${players.filter(p => p.id !== ballHolder).map(p => {
            const unmet = (BUCHI_OBJECTIVES[p.roleId] || []).filter(obj => {
              const tileScore = selectedTiles.reduce((s, t) => s + (t.objectivesServed[obj as ObjectiveId] ?? 0), 0);
              return tileScore < 0.5;
            });
            return unmet.length > 0 ? `${p.name} needs ${unmet.join(', ')}` : null;
          }).filter(Boolean).join('; ')}`
        : undefined;
      setNashToast({ message: result.reason, hint });
      setTimeout(() => {
        setBallState('held');
        setNashToast(null);
      }, 4000);
    }
  }, [ballHolder, players, selectedTiles, commitments, dropCount]);

  // Shoot for goal
  const shootForGoal = useCallback(() => {
    if (!collabScore) return;
    sounds.playButtonClick();
    setBallState('shooting');
    const shotResult = evaluateGoalShot(collabScore, buchiResults);
    setTimeout(() => {
      setGoalResult(shotResult);
      setBallState('held');
      console.log(`GOAL_SHOT_UI: ${shotResult.result} score=${shotResult.score}`);
      if (shotResult.result === 'goal') {
        // Proceed after animation
      } else if (shotResult.result === 'near_miss') {
        setAdjustmentRound(true);
      } else {
        // Miss — will loop back
      }
    }, 1500);
  }, [collabScore, buchiResults]);

  // ─── Screen navigation ─────────────────────────────────────────

  const goToNegotiation = useCallback(() => {
    sounds.playButtonClick();
    initCommitments();
    setScreen('resource_negotiation');
  }, [initCommitments]);

  const goToVote = useCallback(() => {
    sounds.playButtonClick();
    initVotes();
    setScreen('priority_vote');
  }, [initVotes]);

  const goToFinalized = useCallback(() => {
    sounds.playButtonClick();
    computePriorityOrder();
    setScreen('vision_finalized');
  }, [computePriorityOrder]);

  const handleComplete = useCallback(() => {
    sounds.playButtonClick();
    if (!finalResult || !vision || !thresholdResult) return;
    console.log('[VisionBoard] Hidden threshold:', thresholdResult.threshold);
    onPhaseComplete({
      tiles: selectedTiles.map(t => toFeatureTile(t)),
      objectivesCovered: Object.entries(vision.objectiveScores)
        .filter(([, v]) => v >= 30)
        .map(([k]) => k),
      threshold: thresholdResult.threshold,
      visionStatement: finalResult.visionStatement,
      consensusLevel: finalResult.consensusLevel,
    });
  }, [finalResult, vision, thresholdResult, selectedTiles, onPhaseComplete]);

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div style={{
      width: '100%', height: '100vh', background: T.surface,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: T.fontBody, color: T.onSurface,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16,
        borderBottom: `1px solid ${T.outlineVariant}`,
        background: T.container,
      }}>
        <div style={{
          fontFamily: T.fontHeadline, fontWeight: 700, fontSize: 18, color: T.primary,
        }}>
          Phase 3: Vision Board
        </div>
        <div style={{ fontSize: 12, color: T.onSurfaceVariant }}>
          {screen === 'tile_selection' && 'Select features for the zone'}
          {screen === 'resource_negotiation' && 'Commit resources to the plan'}
          {screen === 'priority_vote' && 'Vote on feature priorities'}
          {screen === 'vision_finalized' && 'Vision finalized'}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {(['tile_selection', 'resource_negotiation', 'priority_vote', 'vision_finalized'] as Screen[]).map((s, i) => (
            <div key={s} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: screen === s ? T.primary : (
                (['tile_selection', 'resource_negotiation', 'priority_vote', 'vision_finalized'].indexOf(screen) > i)
                  ? T.secondary : T.outlineVariant
              ),
            }} />
          ))}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {screen === 'tile_selection' && (
          <motion.div
            key="tile_selection"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
          >
            {renderTileSelection()}
          </motion.div>
        )}
        {screen === 'resource_negotiation' && (
          <motion.div
            key="resource_negotiation"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            {renderNegotiation()}
          </motion.div>
        )}
        {screen === 'priority_vote' && (
          <motion.div
            key="priority_vote"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            {renderPriorityVote()}
          </motion.div>
        )}
        {screen === 'vision_finalized' && (
          <motion.div
            key="vision_finalized"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            {renderFinalized()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ BALL & PLAYER AVATARS OVERLAY ═══ */}
      {screen !== 'vision_finalized' && (
        <div style={{
          position: 'relative', padding: '8px 24px 12px',
          background: T.container, borderTop: `1px solid ${T.outlineVariant}`,
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16,
        }}>
          {/* Player avatars with buchi dots */}
          {players.map((player, i) => {
            const isHolder = player.id === ballHolder;
            const buchi = buchiResults.find(b => b.playerName === player.name);
            const roleColor = ROLE_COLORS[player.roleId] || '#888';
            return (
              <div key={player.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <motion.div
                  animate={isHolder ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={isHolder ? { duration: 1.5, repeat: Infinity } : {}}
                  style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: roleColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: T.fontBody, fontWeight: 700, fontSize: 16, color: '#fff',
                    boxShadow: isHolder ? `0 0 12px ${T.primary}, 0 0 4px ${T.primary}` : '0 2px 6px rgba(0,0,0,0.3)',
                    border: isHolder ? `2px solid ${T.primary}` : '2px solid transparent',
                    opacity: isHolder ? 1 : 0.6,
                    position: 'relative',
                  }}
                >
                  {player.name.charAt(0)}
                  {/* Ball indicator */}
                  {isHolder && ballState === 'held' && (
                    <motion.div
                      animate={{ y: [-2, 2, -2] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      style={{
                        position: 'absolute', top: -16, width: 20, height: 20, borderRadius: '50%',
                        background: 'radial-gradient(circle at 35% 35%, #aed456, #465f00)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 8, fontWeight: 700, color: T.surface,
                      }}
                    >
                      {player.name.charAt(0)}
                    </motion.div>
                  )}
                </motion.div>
                <div style={{ fontSize: 9, color: isHolder ? T.primary : T.onSurfaceVariant, fontWeight: isHolder ? 700 : 400 }}>
                  {isHolder ? 'YOUR TURN' : player.name}
                </div>
                {/* Buchi objective dots */}
                <div style={{ display: 'flex', gap: 3 }}>
                  {(BUCHI_OBJECTIVES[player.roleId] || []).map((obj, j) => {
                    const met = buchi?.buchiObjectives[j]?.met ?? false;
                    return (
                      <div key={obj} title={`${obj}: ${met ? 'met' : 'unmet'}`} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: met ? T.primary : '#e74c3c',
                      }} />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Ball drop animation */}
          <AnimatePresence>
            {ballState === 'dropped' && (
              <motion.div
                initial={{ y: -20, opacity: 1 }}
                animate={{ y: 80, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeIn' }}
                style={{
                  position: 'absolute', left: '50%', top: -10,
                  transform: 'translateX(-50%)',
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 35%, #e74c3c, #8b0000)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              />
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ═══ NASH FEEDBACK TOAST ═══ */}
      <AnimatePresence>
        {nashToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'absolute', bottom: 120, left: '50%', transform: 'translateX(-50%)',
              zIndex: 80, maxWidth: 400, width: '90%',
              background: 'rgba(30,27,20,0.92)', backdropFilter: 'blur(8px)',
              borderRadius: 10, padding: '12px 16px',
              borderLeft: `4px solid ${T.tertiary}`,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
            onClick={() => setNashToast(null)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 16, color: T.tertiary }}>{'⚠️'}</span>
              <span style={{ fontFamily: T.fontBody, fontSize: 13, color: T.onSurface }}>
                {nashToast.message}
              </span>
            </div>
            {nashToast.hint && (
              <div style={{ fontSize: 10, color: T.onSurfaceVariant, marginTop: 4 }}>
                {nashToast.hint}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ GOAL RESULT OVERLAY ═══ */}
      <AnimatePresence>
        {goalResult && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0, zIndex: 90,
              background: 'rgba(22,19,12,0.92)', backdropFilter: 'blur(12px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {goalResult.result === 'goal' && (
              <>
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                  style={{
                    width: 100, height: 100, borderRadius: '50%',
                    background: `radial-gradient(circle at 35% 35%, ${T.primary}, #465f00)`,
                    boxShadow: `0 0 40px ${T.primary}, 0 0 80px rgba(174,212,86,0.3)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 40,
                    marginBottom: 20,
                  }}
                >
                  {'⚽'}
                </motion.div>
                <div style={{ fontFamily: T.fontHeadline, fontSize: 28, fontWeight: 700, color: T.primary, marginBottom: 8 }}>
                  GOAL!
                </div>
                <div style={{ fontFamily: T.fontNumber, fontSize: 40, fontWeight: 700, color: T.tertiary, marginBottom: 12 }}>
                  {goalResult.score}
                </div>
                <div style={{ fontSize: 14, color: T.onSurface, marginBottom: 24, textAlign: 'center', maxWidth: 360 }}>
                  {goalResult.feedback}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => { setGoalResult(null); handleComplete(); }}
                  style={{
                    padding: '12px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: T.primary, color: T.surface,
                    fontFamily: T.fontHeadline, fontWeight: 700, fontSize: 15,
                  }}
                >
                  Begin Phase 4: Build the Path
                </motion.button>
              </>
            )}
            {goalResult.result === 'near_miss' && (
              <>
                <div style={{ fontSize: 40, marginBottom: 16 }}>{'🥅'}</div>
                <div style={{ fontFamily: T.fontHeadline, fontSize: 22, fontWeight: 700, color: T.tertiary, marginBottom: 8 }}>
                  Almost!
                </div>
                <div style={{ fontSize: 14, color: T.onSurface, marginBottom: 24, textAlign: 'center', maxWidth: 360 }}>
                  {goalResult.feedback}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => { setGoalResult(null); setScreen('tile_selection'); }}
                  style={{
                    padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: T.tertiary, color: T.surface,
                    fontFamily: T.fontHeadline, fontWeight: 700, fontSize: 13,
                  }}
                >
                  Adjust Vision
                </motion.button>
              </>
            )}
            {goalResult.result === 'miss' && (
              <>
                <div style={{ fontSize: 40, marginBottom: 16 }}>{'❌'}</div>
                <div style={{ fontFamily: T.fontHeadline, fontSize: 22, fontWeight: 700, color: '#e74c3c', marginBottom: 8 }}>
                  Not Balanced
                </div>
                <div style={{ fontSize: 14, color: T.onSurface, marginBottom: 24, textAlign: 'center', maxWidth: 360 }}>
                  {goalResult.feedback}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => { setGoalResult(null); setScreen('tile_selection'); }}
                  style={{
                    padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: '#e74c3c', color: '#fff',
                    fontFamily: T.fontHeadline, fontWeight: 700, fontSize: 13,
                  }}
                >
                  Rethink Vision
                </motion.button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // ─── Screen 1: Tile Selection ──────────────────────────────────

  function renderTileSelection() {
    const selectedIds = new Set(selectedTiles.map(t => t.id));

    return (
      <>
        {/* LEFT: Available tiles */}
        <div style={{
          width: '40%', overflowY: 'auto', padding: 16,
          background: 'linear-gradient(135deg, #3d2b1f 0%, #5c3d2e 30%, #4a3222 60%, #3d2b1f 100%)',
          borderRight: `1px solid ${T.outlineVariant}`,
        }}>
          <div style={{ fontFamily: T.fontHeadline, fontWeight: 700, fontSize: 14, color: T.secondary, marginBottom: 12 }}>
            Available Features
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {availableTiles.map(tile => {
              const isSelected = selectedIds.has(tile.id);
              return (
                <motion.div
                  key={tile.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleTile(tile)}
                  style={{
                    background: T.container,
                    boxShadow: T.woodBevel,
                    borderRadius: 8,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderLeft: isSelected ? `3px solid ${T.primary}` : '3px solid transparent',
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{emojiFor(tile.icon)}</span>
                    <span style={{ fontFamily: T.fontBody, fontWeight: 700, fontSize: 13, color: T.onSurface }}>
                      {tile.name}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: T.onSurfaceVariant, lineHeight: 1.3 }}>
                    {tile.description}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                    {RESOURCE_TYPES.map(r => {
                      const cost = tile.resourceCost[r];
                      if (!cost) return null;
                      return Array.from({ length: cost }).map((_, i) => (
                        <div key={`${r}-${i}`} style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: RESOURCE_COLORS[r],
                        }} />
                      ));
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Vision board */}
        <div style={{ width: '60%', display: 'flex', flexDirection: 'column', padding: 16, overflow: 'hidden' }}>
          <div style={{
            fontFamily: T.fontHeadline, fontWeight: 700, fontSize: 20, color: T.primary, marginBottom: 12,
          }}>
            Vision for {ZONE_LABELS[zoneId] || zoneId}
          </div>

          {/* Resource budget bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {RESOURCE_TYPES.map(r => {
              const used = boardCost.totalCost[r];
              const total = groupBudget.available[r];
              const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
              const over = used > total;
              return (
                <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 70, fontSize: 11, color: T.onSurfaceVariant,
                    textTransform: 'capitalize', fontFamily: T.fontBody,
                  }}>
                    {r}
                  </div>
                  <div style={{
                    flex: 1, height: 8, background: T.containerHigh, borderRadius: 4, overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: 4,
                      background: over ? '#e74c3c' : RESOURCE_COLORS[r],
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <div style={{
                    width: 40, fontSize: 11, fontFamily: T.fontNumber,
                    color: over ? '#e74c3c' : T.onSurfaceVariant, textAlign: 'right',
                  }}>
                    {used}/{total}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Placed tiles */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedTiles.length === 0 && (
              <div style={{ color: T.onSurfaceVariant, fontSize: 13, textAlign: 'center', padding: 40 }}>
                Select features from the left panel to build your vision
              </div>
            )}
            {selectedTiles.map(tile => (
              <div key={tile.id} style={{
                background: T.container, borderRadius: 8, padding: '10px 12px',
                boxShadow: T.woodBevel, display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 20 }}>{emojiFor(tile.icon)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{tile.name}</div>
                  <div style={{ fontSize: 10, color: T.onSurfaceVariant }}>{tile.description}</div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); removeTile(tile.id); }}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', border: 'none',
                    background: 'rgba(231,76,60,0.2)', color: '#e74c3c', cursor: 'pointer',
                    fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  X
                </motion.button>
              </div>
            ))}

            {/* Hybrid merge buttons */}
            {possibleHybrids.map(hybrid => (
              <motion.button
                key={hybrid.id}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => mergeHybrid(hybrid)}
                style={{
                  background: 'rgba(174,212,86,0.1)', border: `1px dashed ${T.primary}`,
                  borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: T.primary,
                  fontSize: 12, fontFamily: T.fontBody, textAlign: 'left',
                }}
              >
                <span style={{ fontWeight: 700 }}>Merge:</span> {hybrid.mergedFrom.join(' + ')} ={'>'}  {hybrid.name}
                <span style={{ color: T.tertiary, marginLeft: 8, fontSize: 10 }}>
                  (saves {Object.entries(hybrid.savingsVsOriginal).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`).join(', ')})
                </span>
              </motion.button>
            ))}
          </div>

          {/* Bottom stats */}
          <div style={{
            borderTop: `1px solid ${T.outlineVariant}`, paddingTop: 12, marginTop: 8,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ fontSize: 11, color: T.onSurfaceVariant }}>
              {selectedTiles.length} feature{selectedTiles.length !== 1 ? 's' : ''} selected
              {' | '}
              Cost: {Object.values(boardCost).reduce((a, b) => a + b, 0)} tokens
              {' | '}
              Budget: {Object.values(groupBudget).reduce((a, b) => a + b, 0)} tokens
              {' | '}
              Remaining: {Object.values(groupBudget).reduce((a, b) => a + b, 0) - Object.values(boardCost).reduce((a, b) => a + b, 0)}
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={goToNegotiation}
              disabled={selectedTiles.length === 0}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none', cursor: selectedTiles.length === 0 ? 'not-allowed' : 'pointer',
                background: selectedTiles.length === 0 ? T.outlineVariant : T.primary,
                color: selectedTiles.length === 0 ? T.onSurfaceVariant : T.surface,
                fontFamily: T.fontHeadline, fontWeight: 700, fontSize: 13,
                opacity: selectedTiles.length === 0 ? 0.5 : 1,
              }}
            >
              Next: Negotiate Resources
            </motion.button>
          </div>
        </div>
      </>
    );
  }

  // ─── Screen 2: Resource Negotiation ────────────────────────────

  function renderNegotiation() {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, overflow: 'hidden' }}>
        <div style={{ fontFamily: T.fontHeadline, fontWeight: 700, fontSize: 18, color: T.primary, marginBottom: 4 }}>
          Resource Negotiation
        </div>
        <div style={{ fontSize: 12, color: T.onSurfaceVariant, marginBottom: 16 }}>
          Each player commits tokens from their pool. Effectiveness depends on role abilities.
        </div>

        {/* Selected features summary */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {selectedTiles.map(t => (
            <div key={t.id} style={{
              background: T.containerHigh, borderRadius: 6, padding: '4px 10px',
              fontSize: 11, color: T.onSurface, display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span>{emojiFor(t.icon)}</span> {t.name}
            </div>
          ))}
        </div>

        {/* Player commitment table */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {players.map(player => {
            const pc = commitments[player.id] || { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 };
            return (
              <div key={player.id} style={{
                background: T.container, borderRadius: 8, padding: 12,
                boxShadow: T.woodBevel, borderLeft: `3px solid ${ROLE_COLORS[player.roleId] || '#888'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    fontWeight: 700, fontSize: 14, color: ROLE_COLORS[player.roleId] || '#888',
                  }}>
                    {player.name}
                  </div>
                  <div style={{ fontSize: 10, color: T.onSurfaceVariant, textTransform: 'capitalize' }}>
                    {player.roleId}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {RESOURCE_TYPES.map(r => {
                    const available = player.resources[r];
                    const committed = pc[r];
                    const abilityKey = RESOURCE_ABILITY_MAP[r] as keyof typeof player.abilities;
                    const abilityScore = player.abilities[abilityKey] || 0;
                    const effectiveness = calculateEffectiveness(abilityScore);
                    return (
                      <div key={r} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                        minWidth: 80,
                      }}>
                        <div style={{ fontSize: 10, color: RESOURCE_COLORS[r], textTransform: 'capitalize', fontWeight: 600 }}>
                          {r}
                        </div>
                        <div style={{ fontSize: 10, color: T.onSurfaceVariant }}>
                          {available} available
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => adjustCommitment(player.id, r, -1)}
                            disabled={committed <= 0}
                            style={{
                              width: 22, height: 22, borderRadius: 4, border: 'none',
                              background: committed <= 0 ? T.outlineVariant : T.containerHigh,
                              color: T.onSurface, cursor: committed <= 0 ? 'not-allowed' : 'pointer',
                              fontWeight: 700, fontSize: 14,
                            }}
                          >
                            -
                          </motion.button>
                          <div style={{
                            fontFamily: T.fontNumber, fontSize: 16, fontWeight: 700,
                            color: RESOURCE_COLORS[r], width: 24, textAlign: 'center',
                          }}>
                            {committed}
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => adjustCommitment(player.id, r, 1)}
                            disabled={committed >= available}
                            style={{
                              width: 22, height: 22, borderRadius: 4, border: 'none',
                              background: committed >= available ? T.outlineVariant : T.containerHigh,
                              color: T.onSurface, cursor: committed >= available ? 'not-allowed' : 'pointer',
                              fontWeight: 700, fontSize: 14,
                            }}
                          >
                            +
                          </motion.button>
                        </div>
                        <div style={{ fontSize: 9, color: T.onSurfaceVariant }}>
                          {effectiveness}% eff.
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Commitment tracker */}
        <div style={{
          borderTop: `1px solid ${T.outlineVariant}`, paddingTop: 12, marginTop: 12,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.onSurface, marginBottom: 4 }}>
            Commitment Tracker
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {RESOURCE_TYPES.map(r => {
              const needed = boardCost.totalCost[r];
              const committed = totalCommitted[r];
              const met = committed >= needed;
              return (
                <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: RESOURCE_COLORS[r],
                  }} />
                  <span style={{ fontSize: 11, color: T.onSurfaceVariant, textTransform: 'capitalize' }}>
                    {r}:
                  </span>
                  <span style={{
                    fontFamily: T.fontNumber, fontSize: 12, fontWeight: 700,
                    color: met ? T.primary : '#e74c3c',
                  }}>
                    {committed}/{needed}
                  </span>
                  {met && <span style={{ fontSize: 10, color: T.primary }}>OK</span>}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={goToVote}
              disabled={!allResourcesMet}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                cursor: allResourcesMet ? 'pointer' : 'not-allowed',
                background: allResourcesMet ? T.primary : T.outlineVariant,
                color: allResourcesMet ? T.surface : T.onSurfaceVariant,
                fontFamily: T.fontHeadline, fontWeight: 700, fontSize: 13,
                opacity: allResourcesMet ? 1 : 0.5,
              }}
            >
              Next: Priority Vote
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Screen 3: Priority Vote ───────────────────────────────────

  function renderPriorityVote() {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, overflow: 'hidden' }}>
        <div style={{ fontFamily: T.fontHeadline, fontWeight: 700, fontSize: 18, color: T.primary, marginBottom: 4 }}>
          Priority Vote
        </div>
        <div style={{ fontSize: 12, color: T.onSurfaceVariant, marginBottom: 16 }}>
          Each player places 2 votes on their priority features. Click a feature to vote.
        </div>

        {/* Player vote tokens */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          {players.map(player => {
            const pv = votes[player.id] || [];
            return (
              <div key={player.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: T.container, borderRadius: 6, padding: '6px 10px',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: ROLE_COLORS[player.roleId] || '#888' }}>
                  {player.name}
                </span>
                {[0, 1].map(i => (
                  <div key={i} style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: pv.length > i ? ROLE_COLORS[player.roleId] || '#888' : T.outlineVariant,
                    border: `1px solid ${T.onSurfaceVariant}`,
                  }} />
                ))}
              </div>
            );
          })}
        </div>

        {/* Feature cards for voting — one column per player */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {selectedTiles.map(tile => {
            const vc = voteCounts[tile.id] || 0;
            return (
              <div key={tile.id} style={{
                background: T.container, borderRadius: 8, padding: '10px 14px',
                boxShadow: T.woodBevel, display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 20 }}>{emojiFor(tile.icon)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{tile.name}</div>
                  <div style={{ fontSize: 10, color: T.onSurfaceVariant }}>{tile.description}</div>
                </div>
                <div style={{
                  fontFamily: T.fontNumber, fontSize: 20, fontWeight: 700,
                  color: vc > 0 ? T.tertiary : T.outlineVariant, minWidth: 24, textAlign: 'center',
                }}>
                  {vc}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {players.map(player => {
                    const pv = votes[player.id] || [];
                    const voted = pv.includes(tile.id);
                    return (
                      <motion.button
                        key={player.id}
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => toggleVote(player.id, tile.id)}
                        title={`${player.name}'s vote`}
                        style={{
                          width: 24, height: 24, borderRadius: '50%', border: 'none',
                          background: voted ? ROLE_COLORS[player.roleId] || '#888' : T.containerHigh,
                          cursor: 'pointer', fontSize: 10, color: voted ? '#fff' : T.onSurfaceVariant,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700,
                        }}
                      >
                        {player.name.charAt(0)}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom */}
        <div style={{
          borderTop: `1px solid ${T.outlineVariant}`, paddingTop: 12, marginTop: 8,
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={goToFinalized}
            disabled={!allVotesPlaced}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              cursor: allVotesPlaced ? 'pointer' : 'not-allowed',
              background: allVotesPlaced ? T.primary : T.outlineVariant,
              color: allVotesPlaced ? T.surface : T.onSurfaceVariant,
              fontFamily: T.fontHeadline, fontWeight: 700, fontSize: 13,
              opacity: allVotesPlaced ? 1 : 0.5,
            }}
          >
            Finalize Vision
          </motion.button>
        </div>
      </div>
    );
  }

  // ─── Screen 4: Vision Finalized ────────────────────────────────

  function renderFinalized() {
    if (!finalResult || !vision || !thresholdResult) {
      return <div style={{ padding: 40, color: T.onSurfaceVariant }}>Computing vision...</div>;
    }

    const sortedTiles = priorityOrder
      .map(id => selectedTiles.find(t => t.id === id))
      .filter(Boolean) as VisionFeatureTile[];

    const objectiveIds: ObjectiveId[] = ['safety', 'greenery', 'access', 'culture', 'revenue', 'community'];

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, overflow: 'hidden' }}>
        {/* Vision statement */}
        <div style={{
          background: T.container, borderRadius: 10, padding: 16, marginBottom: 16,
          boxShadow: T.woodBevel, borderLeft: `4px solid ${T.primary}`,
        }}>
          <div style={{ fontFamily: T.fontHeadline, fontWeight: 700, fontSize: 14, color: T.tertiary, marginBottom: 6 }}>
            Vision Statement
          </div>
          <div style={{ fontSize: 14, color: T.onSurface, lineHeight: 1.5, fontStyle: 'italic' }}>
            {finalResult.visionStatement}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', gap: 20, overflow: 'hidden' }}>
          {/* Features in priority order */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.onSurfaceVariant, marginBottom: 4 }}>
              Features (by priority)
            </div>
            {sortedTiles.map((tile, i) => (
              <div key={tile.id} style={{
                background: T.container, borderRadius: 8, padding: '8px 12px',
                boxShadow: T.woodBevel, display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  fontFamily: T.fontNumber, fontSize: 16, fontWeight: 700,
                  color: T.tertiary, width: 24, textAlign: 'center',
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 18 }}>{emojiFor(tile.icon)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{tile.name}</div>
                  <div style={{ fontSize: 10, color: T.onSurfaceVariant }}>{tile.description}</div>
                </div>
                <div style={{
                  fontSize: 10, color: T.tertiary, fontFamily: T.fontNumber,
                }}>
                  {voteCounts[tile.id] || 0} votes
                </div>
              </div>
            ))}
          </div>

          {/* Objective scores + consensus */}
          <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.onSurfaceVariant }}>
              Objective Coverage
            </div>
            {objectiveIds.map(obj => {
              const score = vision.objectiveScores[obj] || 0;
              const pct = Math.min(Math.round(score * 100), 100);
              return (
                <div key={obj} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 80, fontSize: 11, color: T.onSurfaceVariant }}>
                    {OBJECTIVE_LABELS[obj]}
                  </div>
                  <div style={{
                    flex: 1, height: 10, background: T.containerHigh, borderRadius: 5, overflow: 'hidden',
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                      style={{ height: '100%', borderRadius: 5, background: T.primary }}
                    />
                  </div>
                  <div style={{
                    fontFamily: T.fontNumber, fontSize: 11, color: T.onSurface,
                    width: 36, textAlign: 'right',
                  }}>
                    {pct}%
                  </div>
                </div>
              );
            })}

            {/* Consensus level */}
            <div style={{
              background: T.container, borderRadius: 8, padding: 12, marginTop: 8,
              boxShadow: T.woodBevel, textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: T.onSurfaceVariant, marginBottom: 4 }}>
                Consensus Level
              </div>
              <div style={{
                fontFamily: T.fontNumber, fontSize: 28, fontWeight: 700,
                color: finalResult.consensusLevel >= 70 ? T.primary : (finalResult.consensusLevel >= 40 ? T.tertiary : '#e74c3c'),
              }}>
                {Math.round(finalResult.consensusLevel)}%
              </div>
            </div>
          </div>
        </div>

        {/* Collaborative Score Panel */}
        {collabScore && (
          <div style={{
            background: T.containerHigh, borderRadius: 10, padding: 16, marginTop: 12,
            boxShadow: T.woodBevel,
          }}>
            <div style={{ fontFamily: T.fontHeadline, fontWeight: 700, fontSize: 14, color: T.tertiary, marginBottom: 10 }}>
              Team Collaboration
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              {/* Score ring */}
              <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                <svg width={80} height={80} viewBox="0 0 80 80">
                  <circle cx={40} cy={40} r={34} fill="none" stroke={T.outlineVariant} strokeWidth={6} />
                  <circle cx={40} cy={40} r={34} fill="none"
                    stroke={collabScore.score >= 60 ? T.primary : collabScore.score >= 45 ? T.tertiary : '#e74c3c'}
                    strokeWidth={6} strokeLinecap="round"
                    strokeDasharray={`${(collabScore.score / 100) * 213.6} 213.6`}
                    transform="rotate(-90 40 40)"
                  />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: T.fontNumber, fontSize: 24, fontWeight: 700,
                  color: collabScore.score >= 60 ? T.primary : collabScore.score >= 45 ? T.tertiary : '#e74c3c',
                }}>
                  {collabScore.score}
                </div>
              </div>
              {/* Breakdown bars */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {([
                  ['Nash Average', collabScore.breakdown.nashAverage],
                  ['Buchi Coverage', collabScore.breakdown.buchiCoverage],
                  ['Resource Equity', collabScore.breakdown.resourceEquity],
                  ['Feature Diversity', collabScore.breakdown.featureDiversity],
                ] as [string, number][]).map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 100, fontSize: 10, color: T.onSurfaceVariant }}>{label}</div>
                    <div style={{ flex: 1, height: 6, background: T.container, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${val}%`, height: '100%', background: T.primary, borderRadius: 3 }} />
                    </div>
                    <div style={{ width: 24, fontSize: 10, fontFamily: T.fontNumber, color: T.onSurfaceVariant, textAlign: 'right' }}>
                      {val}
                    </div>
                  </div>
                ))}
                {(collabScore.breakdown.hybridBonus > 0 || collabScore.breakdown.tradeBonus > 0) && (
                  <div style={{ fontSize: 10, color: T.tertiary, marginTop: 2 }}>
                    Bonuses: {collabScore.breakdown.hybridBonus > 0 ? `+${collabScore.breakdown.hybridBonus} hybrid` : ''}
                    {collabScore.breakdown.tradeBonus > 0 ? ` +${collabScore.breakdown.tradeBonus} trade` : ''}
                  </div>
                )}
              </div>
            </div>
            {/* Balance status */}
            <div style={{
              marginTop: 10, fontSize: 12, fontWeight: 700, textAlign: 'center',
              color: collabScore.sharedBalanceAchieved ? T.primary : '#e74c3c',
            }}>
              {collabScore.sharedBalanceAchieved
                ? 'Shared balance achieved. Ready to shoot!'
                : 'Shared balance NOT achieved. Adjust the vision.'}
            </div>
          </div>
        )}

        {/* Shoot for Goal / Complete button */}
        <div style={{
          borderTop: `1px solid ${T.outlineVariant}`, paddingTop: 12, marginTop: 12,
          display: 'flex', justifyContent: 'flex-end', gap: 12,
        }}>
          {collabScore && collabScore.sharedBalanceAchieved ? (
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={shootForGoal}
              style={{
                padding: '12px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: T.primary, color: T.surface,
                fontFamily: T.fontHeadline, fontWeight: 700, fontSize: 15,
                boxShadow: `0 0 16px ${T.primary}40`,
              }}
            >
              {'⚽'} Shoot for Goal
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={handleComplete}
              style={{
                padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: T.primary, color: T.surface,
                fontFamily: T.fontHeadline, fontWeight: 700, fontSize: 14,
              }}
            >
              Begin Phase 4: Build the Path
            </motion.button>
          )}
        </div>
      </div>
    );
  }
}
