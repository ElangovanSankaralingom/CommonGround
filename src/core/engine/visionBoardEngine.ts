/**
 * visionBoardEngine.ts -- Vision Board Phase Logic
 *
 * Functional engine for the Vision Board tile selection, costing,
 * affordability checking, and board finalization.
 * Follows the same functional patterns as investigationEngine.ts and nashEngine.ts.
 */

import type { Player, ResourceType, GameSession } from '../models/types';
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
