/**
 * seriesEngine.ts -- Series Building Phase Logic (Phase 4)
 *
 * Functional engine for placing task cards into series, calculating
 * chain bonuses, combination multipliers, capabilities, cross-perspectives,
 * dependencies, conditionals, and transformation thresholds.
 */

import type { Player, ResourceType } from '../models/types';
import { RESOURCE_ABILITY_MAP, calculateEffectiveness } from '../content/featureTiles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskCategory = 'assess' | 'plan' | 'design' | 'build' | 'maintain' | 'innovate';

export interface TaskContribution {
  playerId: string;
  playerName: string;
  playerRole: string;
  resourceType: ResourceType;
  tokensCommitted: number;
  effectiveness: number;
  basePoints: number;
  justification: string;
}

export interface TaskCard {
  id: string;
  seriesId: string;
  turnNumber: number;
  taskType: TaskCategory;
  title: string;
  description: string;
  successCriteria: string;
  placedBy: { playerId: string; playerName: string; role: string };
  contributions: TaskContribution[];
  crossPerspectives: { playerId: string; role: string; text: string }[];
  capabilities: { capabilityId: string; capabilityName: string; activatedBy: string; activatorRole: string; usedOnSelf: boolean; description: string; bonusPercent: number }[];
  dependencies: { dependsOnTaskId: string; dependsOnTaskTitle: string; connectionText: string; isValid: boolean }[];
  investigationCluesReferenced: string[];
  uniqueRoles: number;
  combinationMultiplier: number;
  innovationMultiplier: number;
  capabilityBonus: number;
  crossPerspectiveBonus: number;
  dependencyBonus: number;
  chainContribution: string | null;
  baseTotal: number;
  finalTotal: number;
  locked: boolean;
  isConditional: boolean;
  condition: { targetPlayerId: string; requiredResource: string; requiredAmount: number; deadline: number } | null;
  conditionMet: boolean;
  // Telemetry: card selections and text metrics
  cardSelections?: Record<string, any>;
  textMetrics?: Record<string, any>;
}

export interface Series {
  id: string;
  name: string;
  tasks: TaskCard[];
  runningTotal: number;
  chainSequence: string[];
  chainBonus: number;
  supporters: string[];
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
  error?: string;
  discovery?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TASK_SEQUENCE: TaskCategory[] = ['assess', 'plan', 'design', 'build', 'maintain'];
const CHAIN_BONUSES: Record<number, number> = { 2: 3, 3: 7, 4: 12, 5: 18 };
const COMBINATION_MULTIPLIERS: Record<number, number> = { 1: 1.0, 2: 1.3, 3: 1.6, 4: 2.0, 5: 2.5 };
const RESOURCE_TYPES: ResourceType[] = ['budget', 'knowledge', 'volunteer', 'material', 'influence'];

const DISCOVERIES = [
  { text: 'Hidden spring discovered beneath the site', resource: 'knowledge' as ResourceType, amount: 2 },
  { text: 'Local artisan guild offers volunteer support', resource: 'volunteer' as ResourceType, amount: 2 },
  { text: 'Heritage grant unlocked by council records', resource: 'budget' as ResourceType, amount: 3 },
  { text: 'Reclaimed materials found in nearby depot', resource: 'material' as ResourceType, amount: 2 },
  { text: 'Community leader endorses the project publicly', resource: 'influence' as ResourceType, amount: 2 },
];

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

export function createSeries(name: string): Series {
  const series: Series = {
    id: `series_${Date.now()}`,
    name,
    tasks: [],
    runningTotal: 0,
    chainSequence: [],
    chainBonus: 0,
    supporters: [],
    isActive: true,
  };
  console.log(`SERIES_ENGINE: SERIES_CREATED name=${name} id=${series.id}`);
  return series;
}

export function calculateChainBonus(chainSequence: string[]): ChainResult {
  let maxChain = 0, curChain = 0, expectedIdx = 0;
  for (const type of chainSequence) {
    const idx = TASK_SEQUENCE.indexOf(type as TaskCategory);
    if (idx === expectedIdx) { curChain++; expectedIdx++; maxChain = Math.max(maxChain, curChain); }
    else if (idx === 0) { curChain = 1; expectedIdx = 1; maxChain = Math.max(maxChain, curChain); }
    // else: skip, doesn't break chain attempt
  }
  const bonus = CHAIN_BONUSES[maxChain] || 0;
  console.log(`CHAIN_BONUS: chainLength=${maxChain} bonus=${bonus}`);
  return { chainLength: maxChain, bonus };
}

export function getCombinationMultiplier(uniqueRoleCount: number): number {
  return COMBINATION_MULTIPLIERS[uniqueRoleCount] || 1.0;
}

export function calculateContributionPoints(
  player: Player, resourceType: ResourceType, tokens: number,
): { effectiveness: number; basePoints: number } {
  const abilityKey = RESOURCE_ABILITY_MAP[resourceType];
  const abilityScore = (player.abilities as unknown as Record<string, number>)[abilityKey] ?? 0;
  const effectiveness = calculateEffectiveness(abilityScore);
  const basePoints = Math.round(tokens * (effectiveness / 100) * 5 * 10) / 10;
  console.log(`SERIES_ENGINE: CONTRIBUTION player=${player.name} resource=${resourceType} tokens=${tokens} eff=${effectiveness}% pts=${basePoints}`);
  return { effectiveness, basePoints };
}

export function calculateTaskTotal(task: TaskCard): number {
  const baseSum = task.contributions.reduce((s, c) => s + c.basePoints, 0);
  const roles = new Set(task.contributions.map(c => c.playerRole));
  task.uniqueRoles = roles.size;
  task.combinationMultiplier = getCombinationMultiplier(task.uniqueRoles);
  const combined = baseSum * task.combinationMultiplier;

  task.capabilityBonus = task.capabilities.reduce((s, cap) => s + combined * (cap.bonusPercent / 100), 0);
  task.crossPerspectiveBonus = task.crossPerspectives.length * 0.5;
  task.dependencyBonus = task.dependencies.filter(d => d.isValid).length * 1.0;

  const subtotal = combined + task.capabilityBonus + task.crossPerspectiveBonus + task.dependencyBonus;
  task.innovationMultiplier = task.taskType === 'innovate' ? 1.5 : 1.0;
  task.baseTotal = Math.round(combined * 10) / 10;
  task.finalTotal = Math.round(subtotal * task.innovationMultiplier * 10) / 10;

  console.log(`SERIES_ENGINE: TASK_TOTAL id=${task.id} base=${baseSum} combined=${combined.toFixed(1)} caps=${task.capabilityBonus.toFixed(1)} cross=${task.crossPerspectiveBonus} dep=${task.dependencyBonus} final=${task.finalTotal}`);
  return task.finalTotal;
}

export function placeTask(
  series: Series, task: TaskCard, hiddenThreshold: number,
  resourcePools: Record<string, Record<ResourceType, number>>,
): PlaceTaskResult {
  // Validate and deduct tokens
  for (const c of task.contributions) {
    const pool = resourcePools[c.playerId];
    if (!pool || (pool[c.resourceType] || 0) < c.tokensCommitted) {
      return { success: false, seriesTotal: series.runningTotal, chainBonus: series.chainBonus, thresholdCrossed: false, transformationLevel: 0, error: `Insufficient ${c.resourceType} for ${c.playerName}` };
    }
  }
  for (const c of task.contributions) {
    resourcePools[c.playerId][c.resourceType] -= c.tokensCommitted;
  }

  calculateTaskTotal(task);
  series.tasks.push(task);

  // Chain: innovate resets, others extend
  if (task.taskType === 'innovate') { series.chainSequence = []; }
  else { series.chainSequence.push(task.taskType); }
  const chain = calculateChainBonus(series.chainSequence);
  series.chainBonus = chain.bonus;

  series.runningTotal = series.tasks.reduce((s, t) => s + t.finalTotal, 0) + series.chainBonus;

  // Update supporters
  for (const c of task.contributions) {
    if (!series.supporters.includes(c.playerId)) series.supporters.push(c.playerId);
  }

  const thresholdCrossed = series.runningTotal >= hiddenThreshold;
  const ratio = hiddenThreshold > 0 ? series.runningTotal / hiddenThreshold : 0;
  const transformationLevel = ratio < 1.0 ? 0 : ratio >= 2.0 ? 100 : ratio >= 1.5 ? 66 : 33;

  // Discovery check (15%)
  let discovery: string | undefined;
  if (Math.random() < 0.15) {
    const d = DISCOVERIES[Math.floor(Math.random() * DISCOVERIES.length)];
    const placerPool = resourcePools[task.placedBy.playerId];
    if (placerPool) { placerPool[d.resource] = (placerPool[d.resource] || 0) + d.amount; }
    discovery = d.text;
    console.log(`DISCOVERY: ${d.text} (+${d.amount} ${d.resource} to ${task.placedBy.playerName})`);
  }

  console.log(`TASK_PLACED: series=${series.name} task=${task.title} type=${task.taskType} total=${series.runningTotal} chain=${chain.chainLength} threshold=${thresholdCrossed} transform=${transformationLevel}`);
  return { success: true, seriesTotal: series.runningTotal, chainBonus: series.chainBonus, thresholdCrossed, transformationLevel, discovery };
}

export function getAvailableResources(
  player: Player, lockedResources: Record<ResourceType, number>,
): Record<ResourceType, number> {
  const available = {} as Record<ResourceType, number>;
  for (const r of RESOURCE_TYPES) {
    available[r] = Math.max(0, (player.resources[r] || 0) - (lockedResources[r] || 0));
  }
  return available;
}

export function canPlayerAct(player: Player, lockedResources: Record<ResourceType, number>): boolean {
  const available = getAvailableResources(player, lockedResources);
  return RESOURCE_TYPES.some(r => available[r] > 0);
}

export function getSeriesSummary(series: Series): {
  taskCount: number; runningTotal: number; chainBonus: number; chainLength: number; avgCombination: number; topContributor: string;
} {
  const chain = calculateChainBonus(series.chainSequence);
  const avgCombination = series.tasks.length > 0
    ? Math.round(series.tasks.reduce((s, t) => s + t.combinationMultiplier, 0) / series.tasks.length * 100) / 100
    : 0;

  const totals: Record<string, number> = {};
  for (const t of series.tasks) for (const c of t.contributions) {
    totals[c.playerName] = (totals[c.playerName] || 0) + c.basePoints;
  }
  let topContributor = 'none', topPts = 0;
  for (const [name, pts] of Object.entries(totals)) {
    if (pts > topPts) { topPts = pts; topContributor = name; }
  }

  return { taskCount: series.tasks.length, runningTotal: series.runningTotal, chainBonus: series.chainBonus, chainLength: chain.chainLength, avgCombination, topContributor };
}

export function makeConditional(
  task: TaskCard, targetPlayerId: string, requiredResource: string, requiredAmount: number,
): void {
  task.isConditional = true;
  task.condition = { targetPlayerId, requiredResource, requiredAmount, deadline: task.turnNumber + 2 };
  console.log(`CONDITIONAL: task=${task.id} requires ${requiredAmount} ${requiredResource} from ${targetPlayerId} by turn ${task.turnNumber + 2}`);
}

export function checkConditionals(
  series: Series, resourcePools: Record<string, Record<ResourceType, number>>,
): string[] {
  const messages: string[] = [];
  const toRemove: string[] = [];

  for (const task of series.tasks) {
    if (!task.isConditional || task.conditionMet || !task.condition) continue;
    const cond = task.condition;
    const pool = resourcePools[cond.targetPlayerId];
    const available = pool ? (pool[cond.requiredResource as ResourceType] || 0) : 0;

    if (available >= cond.requiredAmount) {
      task.conditionMet = true;
      task.locked = true;
      messages.push(`CONDITIONAL: ${task.title} condition MET - locked in`);
      console.log(`CONDITIONAL: ${task.id} condition MET`);
    } else if (task.turnNumber >= cond.deadline) {
      // Refund contributions
      for (const c of task.contributions) {
        const p = resourcePools[c.playerId];
        if (p) p[c.resourceType] = (p[c.resourceType] || 0) + c.tokensCommitted;
      }
      toRemove.push(task.id);
      messages.push(`CONDITIONAL: ${task.title} EXPIRED - resources refunded`);
      console.log(`CONDITIONAL: ${task.id} EXPIRED, refunded`);
    }
  }

  if (toRemove.length > 0) {
    series.tasks = series.tasks.filter(t => !toRemove.includes(t.id));
    series.runningTotal = series.tasks.reduce((s, t) => s + t.finalTotal, 0) + series.chainBonus;
  }

  return messages;
}
