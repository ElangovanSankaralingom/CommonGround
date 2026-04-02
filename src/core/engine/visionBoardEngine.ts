/**
 * visionBoardEngine.ts -- Vision Board Phase Logic
 *
 * Functional engine for the Vision Board tile selection, costing,
 * affordability checking, and board finalization.
 * Follows the same functional patterns as investigationEngine.ts and nashEngine.ts.
 */

import type { Player, ResourceType, GameSession, RoleId } from '../models/types';
import {
  type VisionFeatureTile,
  type HybridTile,
  type ObjectiveId,
  FEATURE_TILES,
  HYBRID_TILES,
  getVisionTilesForZone,
  toFeatureTile,
  RESOURCE_ABILITY_MAP,
  calculateEffectiveness,
  STARTING_TOKENS,
} from '../content/featureTiles';
import { BUCHI_OBJECTIVES, OBJECTIVE_WEIGHTS, SURVIVAL_THRESHOLDS } from '../models/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnrichedTile extends VisionFeatureTile {
  unlocked: boolean;
  discoveryNote: string;
}

export interface BoardCostResult {
  totalCost: Record<ResourceType, number>;
  grandTotal: number;
  hybridOpportunities: HybridTile[];
}

export interface GroupBudgetResult {
  available: Record<ResourceType, number>;
  byPlayer: {
    name: string;
    roleId: string;
    tokens: Record<ResourceType, number>;
    effectiveness: Record<ResourceType, number>;
  }[];
}

export interface AffordabilityResult {
  affordable: boolean;
  surplus: Record<ResourceType, number>;
  deficit: Record<ResourceType, number>;
  constrainedResources: ResourceType[];
}

export interface ThresholdResult {
  threshold: number;
  isHidden: true;
}

export interface VisionEvaluation {
  objectiveScores: Record<ObjectiveId, number>;
  consensusLevel: number;
}

export interface FinalizedBoard {
  selectedFeatures: VisionFeatureTile[];
  resourceCommitments: Record<string, Record<ResourceType, number>>;
  priorityOrder: string[];
  objectiveScores: Record<ObjectiveId, number>;
  hiddenThreshold: number;
  visionStatement: string;
  consensusLevel: number;
}

// ---------------------------------------------------------------------------
// Resource type helpers
// ---------------------------------------------------------------------------

const RESOURCE_TYPES: ResourceType[] = ['budget', 'knowledge', 'volunteer', 'material', 'influence'];

function emptyResourceRecord(): Record<ResourceType, number> {
  return { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 };
}

// ---------------------------------------------------------------------------
// 1. getAvailableTiles
// ---------------------------------------------------------------------------

export function getAvailableTiles(
  zoneId: string,
  investigationFindings: string[],
): EnrichedTile[] {
  const baseTiles = getVisionTilesForZone(zoneId);
  const findingsLower = investigationFindings.map(f => f.toLowerCase());

  const hasMaintenanceCloset = findingsLower.some(f => f.includes('maintenance closet'));
  const hasPipeJunction = findingsLower.some(f => f.includes('pipe junction'));

  console.log('getAvailableTiles:', zoneId, '| findings:', investigationFindings.length);

  return baseTiles.map(tile => {
    const tileIdLower = tile.id.toLowerCase();

    // Determine unlock status via keyword matching
    let unlocked = false;
    if (tileIdLower.includes('drainage')) {
      unlocked = findingsLower.some(f => f.includes('pipe') || f.includes('drain'));
    } else if (tileIdLower.includes('filtration') || tileIdLower.includes('filter')) {
      unlocked = findingsLower.some(f => f.includes('water') || f.includes('sample') || f.includes('algae'));
    } else if (tileIdLower.includes('seating') || tileIdLower.includes('seat')) {
      unlocked = findingsLower.some(f => f.includes('bench') || f.includes('seat') || f.includes('community'));
    } else if (tileIdLower.includes('cafe') || tileIdLower.includes('vendor')) {
      unlocked = findingsLower.some(f => f.includes('ticket') || f.includes('vendor') || f.includes('revenue'));
    } else if (tileIdLower.includes('plant') || tileIdLower.includes('ecological')) {
      unlocked = findingsLower.some(f => f.includes('plant') || f.includes('green') || f.includes('ecological'));
    } else if (tileIdLower.includes('playground')) {
      unlocked = findingsLower.some(f => f.includes('equipment') || f.includes('playground') || f.includes('rusted'));
    } else if (tileIdLower.includes('path') || tileIdLower.includes('walking')) {
      unlocked = findingsLower.some(f => f.includes('path') || f.includes('walk') || f.includes('slab'));
    } else if (tileIdLower.includes('light')) {
      unlocked = findingsLower.some(f => f.includes('lamp') || f.includes('light'));
    } else if (tileIdLower.includes('irrigation')) {
      unlocked = findingsLower.some(f => f.includes('pipe') || f.includes('irrigation') || f.includes('junction'));
    } else if (tileIdLower.includes('waste')) {
      unlocked = findingsLower.some(f => f.includes('waste') || f.includes('bin') || f.includes('litter'));
    } else if (tileIdLower.includes('governance') || tileIdLower.includes('committee')) {
      unlocked = findingsLower.some(f => f.includes('community') || f.includes('governance'));
    } else if (tileIdLower.includes('signage') || tileIdLower.includes('sign')) {
      unlocked = findingsLower.some(f => f.includes('sign') || f.includes('notice'));
    } else if (tileIdLower.includes('fountain')) {
      unlocked = findingsLower.some(f => f.includes('fountain') || f.includes('pump') || f.includes('motor'));
    } else if (tileIdLower.includes('safety') || tileIdLower.includes('surface')) {
      unlocked = findingsLower.some(f => f.includes('safety') || f.includes('surface') || f.includes('fall'));
    } else {
      // Generic: any finding loosely matching tile name words
      const words = tile.name.toLowerCase().split(/\s+/);
      unlocked = findingsLower.some(f => words.some(w => w.length > 3 && f.includes(w)));
    }

    // Apply resource adjustments
    const adjustedCost = { ...tile.resourceCost };
    if (hasMaintenanceCloset) {
      adjustedCost.material = Math.max(0, adjustedCost.material - 1);
    }

    // Build discovery note
    let discoveryNote = '';
    if (unlocked) {
      discoveryNote = `Unlocked by investigation findings in ${zoneId}.`;
    }
    if (hasPipeJunction && tile.id === 'irrigation_link') {
      discoveryNote += ' CASCADE BONUS: Pipe Junction found — irrigation connects to adjacent zone drainage.';
    }

    return {
      ...tile,
      resourceCost: adjustedCost,
      unlocked,
      discoveryNote,
    };
  });
}

// ---------------------------------------------------------------------------
// 2. calculateBoardCost
// ---------------------------------------------------------------------------

export function calculateBoardCost(selectedTiles: VisionFeatureTile[]): BoardCostResult {
  const totalCost = emptyResourceRecord();

  for (const tile of selectedTiles) {
    for (const r of RESOURCE_TYPES) {
      totalCost[r] += tile.resourceCost[r] ?? 0;
    }
  }

  const grandTotal = RESOURCE_TYPES.reduce((sum, r) => sum + totalCost[r], 0);

  // Identify hybrid opportunities
  const selectedIds = new Set(selectedTiles.map(t => t.id));
  const hybridOpportunities = HYBRID_TILES.filter(
    h => selectedIds.has(h.mergedFrom[0]) && selectedIds.has(h.mergedFrom[1]),
  );

  console.log('calculateBoardCost: grandTotal =', grandTotal, '| hybrids =', hybridOpportunities.length);

  return { totalCost, grandTotal, hybridOpportunities };
}

// ---------------------------------------------------------------------------
// 3. calculateGroupBudget
// ---------------------------------------------------------------------------

export function calculateGroupBudget(players: Player[]): GroupBudgetResult {
  const available = emptyResourceRecord();
  const byPlayer: GroupBudgetResult['byPlayer'] = [];

  for (const player of players) {
    const tokens = emptyResourceRecord();
    const effectiveness = emptyResourceRecord();

    for (const r of RESOURCE_TYPES) {
      const tokenValue = player.resources[r] ?? 0;
      tokens[r] = tokenValue;
      available[r] += tokenValue;

      const abilityName = RESOURCE_ABILITY_MAP[r];
      const abilityScore = (player.abilities as unknown as Record<string, number>)[abilityName] ?? 0;
      effectiveness[r] = calculateEffectiveness(abilityScore);
    }

    byPlayer.push({
      name: player.name,
      roleId: player.roleId,
      tokens,
      effectiveness,
    });
  }

  console.log('calculateGroupBudget: players =', players.length, '| available =', available);

  return { available, byPlayer };
}

// ---------------------------------------------------------------------------
// 4. checkAffordability
// ---------------------------------------------------------------------------

export function checkAffordability(
  totalCost: Record<ResourceType, number>,
  available: Record<ResourceType, number>,
): AffordabilityResult {
  const surplus = emptyResourceRecord();
  const deficit = emptyResourceRecord();
  const constrainedResources: ResourceType[] = [];

  for (const r of RESOURCE_TYPES) {
    const diff = (available[r] ?? 0) - (totalCost[r] ?? 0);
    if (diff >= 0) {
      surplus[r] = diff;
      deficit[r] = 0;
    } else {
      surplus[r] = 0;
      deficit[r] = Math.abs(diff);
      constrainedResources.push(r);
    }
  }

  const affordable = constrainedResources.length === 0;

  console.log('checkAffordability: affordable =', affordable, '| constrained =', constrainedResources);

  return { affordable, surplus, deficit, constrainedResources };
}

// ---------------------------------------------------------------------------
// 5. calculateThreshold
// ---------------------------------------------------------------------------

const DIFFICULTY_MULTIPLIERS: Record<number, number> = {
  1: 0.8,
  2: 0.9,
  3: 1.0,
  4: 1.1,
  5: 1.2,
};

export function calculateThreshold(
  selectedTiles: VisionFeatureTile[],
  difficultyDots: number,
): ThresholdResult {
  const { grandTotal } = calculateBoardCost(selectedTiles);
  const multiplier = DIFFICULTY_MULTIPLIERS[difficultyDots] ?? 1.0;
  const threshold = Math.round(grandTotal * multiplier * 10) / 10;

  console.log('HIDDEN_THRESHOLD:', threshold);

  return { threshold, isHidden: true };
}

// ---------------------------------------------------------------------------
// 6. evaluateVision
// ---------------------------------------------------------------------------

const ALL_OBJECTIVES: ObjectiveId[] = ['safety', 'greenery', 'access', 'culture', 'revenue', 'community'];

export function evaluateVision(
  selectedTiles: VisionFeatureTile[],
  players: Player[],
): VisionEvaluation {
  const objectiveScores = {} as Record<ObjectiveId, number>;

  for (const obj of ALL_OBJECTIVES) {
    if (selectedTiles.length === 0) {
      objectiveScores[obj] = 0;
    } else {
      const maxWeight = Math.max(...selectedTiles.map(t => t.objectivesServed[obj] ?? 0));
      objectiveScores[obj] = Math.round(maxWeight * 100);
    }
  }

  const consensusLevel = Math.round(
    ALL_OBJECTIVES.reduce((sum, obj) => sum + objectiveScores[obj], 0) / ALL_OBJECTIVES.length,
  );

  console.log('evaluateVision: consensusLevel =', consensusLevel, '| scores =', objectiveScores);

  return { objectiveScores, consensusLevel };
}

// ---------------------------------------------------------------------------
// 7. proposeHybrid
// ---------------------------------------------------------------------------

export function proposeHybrid(tile1Id: string, tile2Id: string): HybridTile | null {
  const match = HYBRID_TILES.find(
    h =>
      (h.mergedFrom[0] === tile1Id && h.mergedFrom[1] === tile2Id) ||
      (h.mergedFrom[0] === tile2Id && h.mergedFrom[1] === tile1Id),
  );

  if (match) {
    console.log('proposeHybrid: found', match.id, 'from', tile1Id, '+', tile2Id);
  } else {
    console.log('proposeHybrid: no hybrid for', tile1Id, '+', tile2Id);
  }

  return match ?? null;
}

// ---------------------------------------------------------------------------
// 8. finalizeBoard
// ---------------------------------------------------------------------------

export function finalizeBoard(
  selectedTiles: VisionFeatureTile[],
  commitments: Record<string, Record<ResourceType, number>>,
  priorityOrder: string[],
  players: Player[],
  difficultyDots: number,
): FinalizedBoard {
  const { objectiveScores, consensusLevel } = evaluateVision(selectedTiles, players);
  const { threshold: hiddenThreshold } = calculateThreshold(selectedTiles, difficultyDots);

  // Build a vision statement from the selected tiles
  const featureNames = selectedTiles.map(t => t.name);
  const topObjective = ALL_OBJECTIVES.reduce((best, obj) =>
    objectiveScores[obj] > objectiveScores[best] ? obj : best, ALL_OBJECTIVES[0]);

  const visionStatement = featureNames.length > 0
    ? `A vision prioritizing ${topObjective}, featuring: ${featureNames.join(', ')}. Consensus: ${consensusLevel}%.`
    : 'No features selected.';

  console.log('finalizeBoard:', {
    features: selectedTiles.length,
    hiddenThreshold,
    consensusLevel,
    topObjective,
  });

  return {
    selectedFeatures: selectedTiles,
    resourceCommitments: commitments,
    priorityOrder,
    objectiveScores,
    hiddenThreshold,
    visionStatement,
    consensusLevel,
  };
}

// ═══════════════════════════════════════════════════════════════
// BALL PASSING & NASH EQUILIBRIUM CHECK
// ═══════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NashAction {
  type: 'place_tile' | 'commit_resource' | 'cast_vote' | 'propose_trade';
  payload: any;
}

export interface NashCheckResult {
  passed: boolean;
  nashScore: number;
  reason: string;
  selfishness: number;
  consideration: number;
}

export interface BuchiSatisfactionResult {
  playerName: string;
  role: string;
  buchiObjectives: { name: string; current: number; threshold: number; met: boolean }[];
  overallSatisfied: boolean;
  satisfactionPercentage: number;
}

export interface CollaborativeScoreResult {
  score: number;
  breakdown: {
    nashAverage: number;
    buchiCoverage: number;
    resourceEquity: number;
    featureDiversity: number;
    hybridBonus: number;
    tradeBonus: number;
  };
  sharedBalanceAchieved: boolean;
}

export interface SharedBalanceResult {
  balanced: boolean;
  score: number;
  blockers: string[];
  loopBack: boolean;
  loopTarget: string;
}

export interface GoalShotResult {
  result: 'goal' | 'near_miss' | 'miss';
  score: number;
  feedback: string;
  loopBack: boolean;
}

// ---------------------------------------------------------------------------
// 9. nashCheckAction
// ---------------------------------------------------------------------------

export function nashCheckAction(
  action: NashAction,
  actingPlayer: Player,
  allPlayers: Player[],
  currentBoardState: { tiles: VisionFeatureTile[]; commitments: Record<string, Record<ResourceType, number>> },
): NashCheckResult {
  const playerBuchi = BUCHI_OBJECTIVES[actingPlayer.roleId] || [];
  const otherPlayers = allPlayers.filter(p => p.id !== actingPlayer.id);

  if (action.type === 'place_tile') {
    const tile = action.payload as VisionFeatureTile;
    const selfScore = playerBuchi.reduce((s, obj) => s + (tile.objectivesServed[obj] ?? 0), 0);
    const othersScore = otherPlayers.reduce((s, p) => {
      const pBuchi = BUCHI_OBJECTIVES[p.roleId] || [];
      return s + pBuchi.reduce((ss, obj) => ss + (tile.objectivesServed[obj] ?? 0), 0);
    }, 0);
    const total = selfScore + othersScore;
    const consideration = total > 0 ? othersScore / total : 0.5;

    const passed = consideration >= 0.25;
    const reason = consideration < 0.25
      ? 'This feature serves mainly your objectives. Consider what others need.'
      : consideration < 0.4
        ? 'This helps you most but has some group benefit. Acceptable but not collaborative.'
        : 'Good collaborative choice — serves multiple stakeholders.';

    console.log(`NASH_CHECK place_tile "${tile.name}": self=${selfScore.toFixed(2)} others=${othersScore.toFixed(2)} consideration=${consideration.toFixed(2)} → ${passed ? 'PASS' : 'FAIL'}`);
    return { passed, nashScore: Math.round(consideration * 100), reason, selfishness: Math.round((1 - consideration) * 100), consideration: Math.round(consideration * 100) };
  }

  if (action.type === 'commit_resource') {
    const { resource, amount } = action.payload as { resource: ResourceType; amount: number };
    const abilityKey = RESOURCE_ABILITY_MAP[resource] as keyof Player['abilities'];
    const abilityScore = (actingPlayer.abilities as any)[abilityKey] ?? 0;
    const effectiveness = calculateEffectiveness(abilityScore);

    // Check if this fills a deficit nobody else can fill easily
    const needed = currentBoardState.tiles.reduce((s, t) => s + (t.resourceCost[resource] ?? 0), 0);
    const totalCommitted = Object.values(currentBoardState.commitments).reduce((s, pc) => s + (pc[resource] ?? 0), 0);
    const deficit = needed - totalCommitted;
    const deficitFilled = deficit > 0 && amount > 0;

    // Check hoarding: is the player keeping their best resource uncommitted?
    const bestResource = RESOURCE_TYPES.reduce((best, r) => {
      const ak = RESOURCE_ABILITY_MAP[r] as keyof Player['abilities'];
      const score = (actingPlayer.abilities as any)[ak] ?? 0;
      const bak = RESOURCE_ABILITY_MAP[best] as keyof Player['abilities'];
      const bestScore = (actingPlayer.abilities as any)[bak] ?? 0;
      return score > bestScore ? r : best;
    }, RESOURCE_TYPES[0]);
    const committedBest = (currentBoardState.commitments[actingPlayer.id]?.[bestResource] ?? 0);
    const hoarding = resource !== bestResource && committedBest === 0 && actingPlayer.resources[bestResource] > 0;

    const nashScore = Math.round((effectiveness * 0.4) + (deficitFilled ? 30 : 0) + (hoarding ? -20 : 0));
    const passed = nashScore >= 40;
    const reason = !passed
      ? `You're committing a resource you're not effective at${hoarding ? ' while keeping your strongest resource uncommitted' : ''}. Play to your strengths.`
      : deficitFilled
        ? 'Filling a critical resource gap — strong collaborative commitment.'
        : 'Good resource commitment matching your abilities.';

    console.log(`NASH_CHECK commit_resource ${resource}×${amount}: eff=${effectiveness} deficit=${deficitFilled} hoarding=${hoarding} score=${nashScore} → ${passed ? 'PASS' : 'FAIL'}`);
    return { passed, nashScore, reason, selfishness: hoarding ? 60 : 20, consideration: Math.min(100, nashScore) };
  }

  if (action.type === 'cast_vote') {
    const featureId = action.payload as string;
    const tile = currentBoardState.tiles.find(t => t.id === featureId);
    if (!tile) return { passed: true, nashScore: 50, reason: 'Feature not found.', selfishness: 0, consideration: 50 };

    const ownMatch = playerBuchi.filter(obj => (tile.objectivesServed[obj] ?? 0) >= 0.3).length;
    const othersMatch = otherPlayers.filter(p => {
      const pBuchi = BUCHI_OBJECTIVES[p.roleId] || [];
      return pBuchi.some(obj => (tile.objectivesServed[obj] ?? 0) >= 0.3);
    }).length;

    const passed = !(ownMatch > 0 && othersMatch === 0);
    const reason = !passed
      ? 'You voted for something only you benefit from. Consider group needs.'
      : othersMatch >= 2
        ? 'Your vote reflects group needs — multiple players benefit.'
        : 'Acceptable vote — some group benefit.';

    const nashScore = passed ? Math.min(100, 30 + othersMatch * 20) : 15;
    console.log(`NASH_CHECK cast_vote "${featureId}": ownMatch=${ownMatch} othersMatch=${othersMatch} → ${passed ? 'PASS' : 'FAIL'}`);
    return { passed, nashScore, reason, selfishness: ownMatch > 0 && othersMatch === 0 ? 80 : 20, consideration: Math.min(100, nashScore) };
  }

  if (action.type === 'propose_trade') {
    const { offeredType, offeredAmount, requestedType, requestedAmount, targetPlayerId } = action.payload as {
      offeredType: ResourceType; offeredAmount: number; requestedType: ResourceType; requestedAmount: number; targetPlayerId: string;
    };
    const targetPlayer = allPlayers.find(p => p.id === targetPlayerId);
    if (!targetPlayer) return { passed: true, nashScore: 50, reason: 'Target not found.', selfishness: 0, consideration: 50 };

    const offerAbility = RESOURCE_ABILITY_MAP[offeredType] as keyof Player['abilities'];
    const requestAbility = RESOURCE_ABILITY_MAP[requestedType] as keyof Player['abilities'];
    const playerAValue = offeredAmount * calculateEffectiveness((actingPlayer.abilities as any)[offerAbility] ?? 0) / 100 * 5;
    const playerBValue = requestedAmount * calculateEffectiveness((targetPlayer.abilities as any)[requestAbility] ?? 0) / 100 * 5;
    const maxVal = Math.max(playerAValue, playerBValue, 0.01);
    const fairness = Math.min(playerAValue, playerBValue) / maxVal;

    const passed = fairness >= 0.6;
    const reason = !passed
      ? 'This trade heavily favors one side. Negotiate better terms.'
      : 'Fair trade — both sides gain effective value.';

    console.log(`NASH_CHECK propose_trade: fairness=${fairness.toFixed(2)} → ${passed ? 'PASS' : 'FAIL'}`);
    return { passed, nashScore: Math.round(fairness * 100), reason, selfishness: Math.round((1 - fairness) * 100), consideration: Math.round(fairness * 100) };
  }

  return { passed: true, nashScore: 50, reason: 'Unknown action type.', selfishness: 0, consideration: 50 };
}

// ---------------------------------------------------------------------------
// 10. calculateBuchiSatisfaction
// ---------------------------------------------------------------------------

export function calculateBuchiSatisfaction(
  player: Player,
  boardState: { tiles: VisionFeatureTile[] },
): BuchiSatisfactionResult {
  const buchiObjs = BUCHI_OBJECTIVES[player.roleId] || [];
  const roleWeights = OBJECTIVE_WEIGHTS[player.roleId] || {};
  const threshold = SURVIVAL_THRESHOLDS[player.roleId] || 10;

  const results = buchiObjs.map(obj => {
    // Sum tile contributions for this objective, weighted by tile cost
    const rawScore = boardState.tiles.reduce((sum, tile) => {
      const tileWeight = tile.objectivesServed[obj] ?? 0;
      const tileCost = RESOURCE_TYPES.reduce((s, r) => s + (tile.resourceCost[r] ?? 0), 0);
      return sum + tileWeight * tileCost;
    }, 0);
    // Scale by role weight
    const w = roleWeights[obj as ObjectiveId] ?? 1;
    const scaled = rawScore * (w / 5); // normalize weight to ~1.0 range
    const objThreshold = threshold * 0.5; // per-objective threshold is half the survival threshold
    return { name: obj, current: Math.round(scaled * 10) / 10, threshold: objThreshold, met: scaled >= objThreshold };
  });

  const metCount = results.filter(r => r.met).length;
  const satisfactionPercentage = buchiObjs.length > 0 ? Math.round((metCount / buchiObjs.length) * 100) : 100;

  console.log(`BUCHI_CHECK ${player.name} (${player.roleId}): ${metCount}/${buchiObjs.length} met = ${satisfactionPercentage}%`);

  return {
    playerName: player.name,
    role: player.roleId,
    buchiObjectives: results,
    overallSatisfied: metCount === buchiObjs.length,
    satisfactionPercentage,
  };
}

// ---------------------------------------------------------------------------
// 11. calculateCollaborativeScore
// ---------------------------------------------------------------------------

export function calculateCollaborativeScore(
  allPlayers: Player[],
  boardState: { tiles: VisionFeatureTile[]; commitments: Record<string, Record<ResourceType, number>> },
  nashHistory: number[],
  hybridCount: number,
  tradeCount: number,
): CollaborativeScoreResult {
  // Nash average
  const nashAverage = nashHistory.length > 0
    ? Math.round(nashHistory.reduce((s, n) => s + n, 0) / nashHistory.length)
    : 50;

  // Buchi coverage
  const allBuchi = allPlayers.map(p => calculateBuchiSatisfaction(p, boardState));
  const totalObjectives = allBuchi.reduce((s, b) => s + b.buchiObjectives.length, 0);
  const metObjectives = allBuchi.reduce((s, b) => s + b.buchiObjectives.filter(o => o.met).length, 0);
  const buchiCoverage = totalObjectives > 0 ? Math.round((metObjectives / totalObjectives) * 100) : 0;

  // Resource equity (inverse Gini coefficient simplified)
  const playerTotals = allPlayers.map(p => {
    const pc = boardState.commitments[p.id];
    if (!pc) return 0;
    return RESOURCE_TYPES.reduce((s, r) => s + (pc[r] ?? 0), 0);
  });
  const totalCommitted = playerTotals.reduce((s, v) => s + v, 0);
  const meanCommit = totalCommitted / Math.max(allPlayers.length, 1);
  const variance = playerTotals.reduce((s, v) => s + Math.abs(v - meanCommit), 0) / Math.max(allPlayers.length, 1);
  const maxDeviation = meanCommit || 1;
  const resourceEquity = Math.round(Math.max(0, 100 - (variance / maxDeviation) * 100));

  // Feature diversity
  const coveredObjectives = new Set<string>();
  for (const tile of boardState.tiles) {
    for (const obj of ALL_OBJECTIVES) {
      if ((tile.objectivesServed[obj] ?? 0) >= 0.3) coveredObjectives.add(obj);
    }
  }
  const featureDiversity = Math.round((coveredObjectives.size / ALL_OBJECTIVES.length) * 100);

  const hybridBonus = hybridCount * 10;
  const tradeBonus = tradeCount * 5;

  const score = Math.round(
    nashAverage * 0.3 + buchiCoverage * 0.3 + resourceEquity * 0.2 + featureDiversity * 0.1 + hybridBonus + tradeBonus
  );

  console.log(`COLLABORATIVE_SCORE: ${score} (nash=${nashAverage} buchi=${buchiCoverage} equity=${resourceEquity} diversity=${featureDiversity} +hybrid=${hybridBonus} +trade=${tradeBonus})`);

  return {
    score,
    breakdown: { nashAverage, buchiCoverage, resourceEquity, featureDiversity, hybridBonus, tradeBonus },
    sharedBalanceAchieved: score >= 60,
  };
}

// ---------------------------------------------------------------------------
// 12. checkSharedBalance
// ---------------------------------------------------------------------------

export function checkSharedBalance(
  collaborativeScore: CollaborativeScoreResult,
  allPlayersBuchi: BuchiSatisfactionResult[],
): SharedBalanceResult {
  const blockers: string[] = [];

  // Check for players with 0% satisfaction
  for (const pb of allPlayersBuchi) {
    if (pb.satisfactionPercentage === 0) {
      const unmet = pb.buchiObjectives.filter(o => !o.met).map(o => o.name).join(', ');
      blockers.push(`[${pb.playerName}] has 0% objective satisfaction — vision ignores ${unmet}`);
    }
  }

  if (collaborativeScore.breakdown.nashAverage < 35) {
    blockers.push(`Nash average ${collaborativeScore.breakdown.nashAverage} — players are not considering each other`);
  }

  if (collaborativeScore.breakdown.resourceEquity < 25) {
    blockers.push(`Resource equity ${collaborativeScore.breakdown.resourceEquity} — distribution is severely uneven`);
  }

  const balanced = collaborativeScore.score >= 60 && blockers.length === 0;
  const loopBack = !balanced;
  const loopTarget = collaborativeScore.breakdown.featureDiversity < 50
    ? 'tile_selection'
    : collaborativeScore.breakdown.resourceEquity < 30
      ? 'resource_negotiation'
      : 'tile_selection';

  console.log(`SHARED_BALANCE: ${balanced ? 'ACHIEVED' : 'NOT ACHIEVED'} score=${collaborativeScore.score} blockers=${blockers.length}`);

  return { balanced, score: collaborativeScore.score, blockers, loopBack, loopTarget };
}

// ---------------------------------------------------------------------------
// 13. evaluateGoalShot
// ---------------------------------------------------------------------------

export function evaluateGoalShot(
  collaborativeScore: CollaborativeScoreResult,
  allPlayersBuchi: BuchiSatisfactionResult[],
): GoalShotResult {
  const score = collaborativeScore.score;
  const allAbove40 = allPlayersBuchi.every(p => p.satisfactionPercentage >= 40);
  const anyAtZero = allPlayersBuchi.some(p => p.satisfactionPercentage === 0);
  const mostSatisfied = allPlayersBuchi.filter(p => p.satisfactionPercentage >= 40).length >= Math.ceil(allPlayersBuchi.length * 0.6);

  if (score >= 60 && allAbove40) {
    console.log(`GOAL_SHOT: GOAL! score=${score}`);
    return { result: 'goal', score, feedback: 'Vision achieved! The group found shared balance.', loopBack: false };
  }

  if (score >= 45 && mostSatisfied) {
    const unsatisfied = allPlayersBuchi.filter(p => p.satisfactionPercentage < 40).map(p => p.playerName);
    console.log(`GOAL_SHOT: NEAR MISS score=${score} unsatisfied=[${unsatisfied}]`);
    return {
      result: 'near_miss', score,
      feedback: `Almost there! ${unsatisfied.length > 0 ? `${unsatisfied.join(', ')} still need adjustments.` : 'Minor adjustments needed.'}`,
      loopBack: false,
    };
  }

  const blockerNames = allPlayersBuchi.filter(p => p.satisfactionPercentage === 0).map(p => p.playerName);
  console.log(`GOAL_SHOT: MISS score=${score} blockers=[${blockerNames}]`);
  return {
    result: 'miss', score,
    feedback: `Vision not balanced.${blockerNames.length > 0 ? ` ${blockerNames.join(', ')} have no objectives met.` : ''} Rethink the approach.`,
    loopBack: true,
  };
}
