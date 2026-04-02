/**
 * seriesEngine.ts -- Series Building Phase Logic (Phase 4)
 *
 * Functional engine for placing task cards into series, calculating
 * chain bonuses from sequential task ordering, tracking contributions,
 * and determining transformation thresholds.
 */

import type { Player, ResourceType } from '../models/types';
import { RESOURCE_ABILITY_MAP, calculateEffectiveness } from '../content/featureTiles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskCategory = 'assess' | 'plan' | 'design' | 'build' | 'maintain';

export interface TaskContribution {
  playerId: string;
  playerName: string;
  playerRole: string;
  resourceType: ResourceType;
  tokensCommitted: number;
  effectiveness: number;
  effectivePoints: number;
}

export interface TaskCard {
  id: string;
  seriesId: string;
  turnNumber: number;
  placedBy: string;
  taskName: string;
  taskType: TaskCategory;
  contributions: TaskContribution[];
  totalPoints: number;
  chainPosition: number;
  locked: boolean;
}

export interface Series {
  id: string;
  name: string;
  tasks: TaskCard[];
  runningTotal: number;
  chainBonus: number;
  chainLength: number;
  isActive: boolean;
}

export interface ChainResult {
  chainLength: number;
  bonus: number;
}

export interface PlaceTaskResult {
  success: boolean;
  seriesTotal: number;
  chainBonus: number;
  thresholdCrossed: boolean;
  transformationLevel: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TASK_SEQUENCE: TaskCategory[] = ['assess', 'plan', 'design', 'build', 'maintain'];

const CHAIN_BONUSES: Record<number, number> = {
  2: 3,
  3: 7,
  4: 12,
  5: 18,
};

const RESOURCE_TYPES: ResourceType[] = ['budget', 'knowledge', 'volunteer', 'material', 'influence'];

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

export function createSeries(name: string): Series {
  const series: Series = {
    id: `series_${Date.now()}`,
    name,
    tasks: [],
    runningTotal: 0,
    chainBonus: 0,
    chainLength: 0,
    isActive: true,
  };
  console.log(`SERIES_ENGINE: SERIES_CREATED: ${name}`);
  return series;
}

export function calculateChainBonus(tasks: TaskCard[]): ChainResult {
  let maxChain = 0;
  let currentChain = 0;
  let expectedIdx = 0;

  for (const task of tasks) {
    const seqIdx = TASK_SEQUENCE.indexOf(task.taskType);
    if (seqIdx === expectedIdx) {
      currentChain++;
      expectedIdx++;
      maxChain = Math.max(maxChain, currentChain);
    } else if (seqIdx === 0) {
      currentChain = 1;
      expectedIdx = 1;
      maxChain = Math.max(maxChain, currentChain);
    } else {
      // doesn't extend, doesn't restart -- keep looking
    }
  }

  const bonus = CHAIN_BONUSES[maxChain] || 0;
  console.log(`CHAIN_BONUS: chainLength=${maxChain} bonus=${bonus}`);
  return { chainLength: maxChain, bonus };
}

export function calculateContributionPoints(
  player: Player,
  resourceType: ResourceType,
  tokens: number,
): TaskContribution {
  const abilityKey = RESOURCE_ABILITY_MAP[resourceType];
  const abilityScore = (player.abilities as unknown as Record<string, number>)[abilityKey] ?? 0;
  const effectiveness = calculateEffectiveness(abilityScore);
  const effectivePoints = Math.round(tokens * (effectiveness / 100) * 5 * 10) / 10;

  console.log(
    `SERIES_ENGINE: CONTRIBUTION player=${player.name} resource=${resourceType} tokens=${tokens} eff=${effectiveness}% pts=${effectivePoints}`,
  );

  return {
    playerId: player.id,
    playerName: player.name,
    playerRole: player.roleId,
    resourceType,
    tokensCommitted: tokens,
    effectiveness,
    effectivePoints,
  };
}

export function placeTaskCard(
  series: Series,
  taskCard: TaskCard,
  hiddenThreshold: number,
): PlaceTaskResult {
  series.tasks.push(taskCard);

  const chain = calculateChainBonus(series.tasks);
  series.chainBonus = chain.bonus;
  series.chainLength = chain.chainLength;

  series.runningTotal =
    series.tasks.reduce((sum, t) => sum + t.totalPoints, 0) + series.chainBonus;

  const thresholdCrossed = series.runningTotal >= hiddenThreshold;
  const transformationLevel = calculateTransformationLevel(series.runningTotal, hiddenThreshold);

  console.log(
    `SERIES_ENGINE: TASK_PLACED series=${series.name} task=${taskCard.taskName} type=${taskCard.taskType} total=${series.runningTotal} chain=${series.chainLength} threshold=${thresholdCrossed} transform=${transformationLevel}`,
  );

  return {
    success: true,
    seriesTotal: series.runningTotal,
    chainBonus: series.chainBonus,
    thresholdCrossed,
    transformationLevel,
  };
}

export function calculateTransformationLevel(seriesTotal: number, threshold: number): number {
  if (seriesTotal < threshold) return 0;
  const ratio = seriesTotal / threshold;
  if (ratio >= 2.0) return 100;
  if (ratio >= 1.5) return 66;
  if (ratio >= 1.0) return 33;
  return 0;
}

export function getAvailableResources(
  player: Player,
  lockedResources: Record<ResourceType, number>,
): Record<ResourceType, number> {
  const available = {} as Record<ResourceType, number>;
  for (const r of RESOURCE_TYPES) {
    available[r] = Math.max(0, (player.resources[r] || 0) - (lockedResources[r] || 0));
  }
  return available;
}

export function lockResources(
  currentLocked: Record<ResourceType, number>,
  contributions: TaskContribution[],
): Record<ResourceType, number> {
  const updated = { ...currentLocked };
  for (const c of contributions) {
    updated[c.resourceType] = (updated[c.resourceType] || 0) + c.tokensCommitted;
  }
  console.log(`SERIES_ENGINE: RESOURCE_LOCKED: ${contributions.length} contributions`);
  return updated;
}

export function canPlayerAct(
  player: Player,
  lockedResources: Record<ResourceType, number>,
): boolean {
  const available = getAvailableResources(player, lockedResources);
  return RESOURCE_TYPES.some((r) => available[r] > 0);
}

export function getSeriesSummary(
  series: Series,
): { tasks: number; runningTotal: number; chainBonus: number; chainLength: number; topContributor: string } {
  const contributorTotals: Record<string, number> = {};

  for (const task of series.tasks) {
    for (const c of task.contributions) {
      contributorTotals[c.playerName] = (contributorTotals[c.playerName] || 0) + c.effectivePoints;
    }
  }

  let topContributor = 'none';
  let topPoints = 0;
  for (const [name, pts] of Object.entries(contributorTotals)) {
    if (pts > topPoints) {
      topPoints = pts;
      topContributor = name;
    }
  }

  return {
    tasks: series.tasks.length,
    runningTotal: series.runningTotal,
    chainBonus: series.chainBonus,
    chainLength: series.chainLength,
    topContributor,
  };
}
