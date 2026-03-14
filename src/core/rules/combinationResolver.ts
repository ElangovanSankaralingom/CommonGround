import type {
  ChallengeCard,
  CombinationInProgress,
  Player,
  ResourcePool,
  ResourceType,
} from '../models/types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCombination(
  combination: CombinationInProgress,
  challenge: ChallengeCard
): ValidationResult {
  const errors: string[] = [];

  // Must have contributions from 2+ players
  const uniqueContributors = new Set(combination.contributions.map((c) => c.playerId));
  if (uniqueContributors.size < 2) {
    errors.push('Combination requires contributions from at least 2 players.');
  }

  // Check that total contributed resources meet challenge resource requirements
  const totalResources: ResourcePool = { budget: 0, influence: 0, volunteer: 0, material: 0, knowledge: 0 };
  for (const contribution of combination.contributions) {
    for (const [res, amount] of Object.entries(contribution.resources)) {
      totalResources[res as ResourceType] += amount as number;
    }
  }

  const required = challenge.requirements.resourceCost;
  for (const [res, amount] of Object.entries(required)) {
    if (amount && totalResources[res as ResourceType] < amount) {
      errors.push(
        `Insufficient ${res}: need ${amount}, have ${totalResources[res as ResourceType]}.`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

export function calculateCombinationValue(
  combination: CombinationInProgress
): number {
  let totalTokens = 0;
  for (const contribution of combination.contributions) {
    for (const amount of Object.values(contribution.resources)) {
      totalTokens += amount as number;
    }
  }

  const uniqueContributors = new Set(combination.contributions.map((c) => c.playerId));

  if (uniqueContributors.size >= 3) {
    return Math.ceil(totalTokens * 1.5);
  }

  return totalTokens;
}

export function canContribute(
  player: Player,
  resources: Partial<ResourcePool>
): boolean {
  for (const [res, amount] of Object.entries(resources)) {
    if (amount && player.resources[res as ResourceType] < amount) {
      return false;
    }
  }
  return true;
}
