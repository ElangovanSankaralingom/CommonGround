import type {
  ChallengeCard,
  CombinationInProgress,
  GameSession,
  Player,
  SeriesInProgress,
  ResourceType,
} from '../models/types';
import { performAbilityCheck } from './abilityCheck';
import type { AbilityCheckResult } from './abilityCheck';
import { calculateSeriesValue, validateSeriesFormation } from './seriesResolver';
import { calculateCombinationValue, validateCombination } from './combinationResolver';

export interface ResolutionResult {
  canResolve: boolean;
  seriesValid: boolean;
  seriesValue: number;
  combinationValid: boolean;
  combinationValue: number;
  abilityCheckResults: AbilityCheckResult[];
  resourcesMet: boolean;
  errors: string[];
}

export interface ChallengeEffect {
  type: string;
  params: Record<string, any>;
}

export function canResolveChallenge(
  challenge: ChallengeCard,
  series: SeriesInProgress | null,
  combination: CombinationInProgress | null,
  players: Record<string, Player>
): ResolutionResult {
  const errors: string[] = [];
  let seriesValid = false;
  let seriesValue = 0;
  let combinationValid = false;
  let combinationValue = 0;
  const abilityCheckResults: AbilityCheckResult[] = [];
  let resourcesMet = false;

  // Validate series if provided
  if (series && series.cards.length > 0) {
    const seriesValidation = validateSeriesFormation(series.cards, players);
    seriesValid = seriesValidation.valid;
    if (!seriesValid) {
      errors.push(...seriesValidation.errors);
    } else {
      seriesValue = calculateSeriesValue(series, players);

      // Check minimum series length
      if (series.cards.length < challenge.requirements.minSeriesLength) {
        errors.push(
          `Series needs at least ${challenge.requirements.minSeriesLength} cards, has ${series.cards.length}.`
        );
        seriesValid = false;
      }

      // Check minimum unique roles
      const uniqueRoles = new Set(
        series.cards.map((c) => players[c.playerId]?.roleId).filter(Boolean)
      );
      if (uniqueRoles.size < challenge.requirements.minUniqueRoles) {
        errors.push(
          `Need ${challenge.requirements.minUniqueRoles} unique roles, have ${uniqueRoles.size}.`
        );
        seriesValid = false;
      }

      // Check series value vs difficulty
      if (seriesValue < challenge.difficulty) {
        errors.push(
          `Series value ${seriesValue} is below difficulty ${challenge.difficulty}.`
        );
        seriesValid = false;
      }
    }
  }

  // Validate combination if provided
  if (combination && combination.contributions.length > 0) {
    const combValidation = validateCombination(combination, challenge);
    combinationValid = combValidation.valid;
    if (!combinationValid) {
      errors.push(...combValidation.errors);
    } else {
      combinationValue = calculateCombinationValue(combination);
    }
  }

  // Ability checks: use the first contributing player for each check
  if (series && series.cards.length > 0) {
    for (const check of challenge.requirements.abilityChecks) {
      const firstPlayer = players[series.cards[0].playerId];
      if (firstPlayer) {
        const result = performAbilityCheck(
          firstPlayer,
          check.ability,
          check.threshold,
          check.skill
        );
        abilityCheckResults.push(result);
        if (!result.success) {
          errors.push(
            `Ability check failed: ${check.ability} (${result.checkValue} < ${check.threshold}).`
          );
        }
      }
    }
  }

  // Resource check: sum resources from all contributing players
  const totalResources: Record<string, number> = {
    budget: 0, influence: 0, volunteer: 0, material: 0, knowledge: 0,
  };

  if (series) {
    for (const entry of series.cards) {
      const player = players[entry.playerId];
      if (player) {
        for (const [res, amount] of Object.entries(player.resources)) {
          totalResources[res] += amount;
        }
      }
    }
  }
  if (combination) {
    for (const contrib of combination.contributions) {
      for (const [res, amount] of Object.entries(contrib.resources)) {
        totalResources[res] += amount as number;
      }
    }
  }

  resourcesMet = true;
  for (const [res, amount] of Object.entries(challenge.requirements.resourceCost)) {
    if (amount && totalResources[res] < amount) {
      resourcesMet = false;
      errors.push(`Insufficient ${res}: need ${amount}, have ${totalResources[res]}.`);
    }
  }

  const allAbilityChecksPassed = abilityCheckResults.every((r) => r.success);
  const canResolve =
    (seriesValid || combinationValid) && allAbilityChecksPassed && resourcesMet;

  return {
    canResolve,
    seriesValid,
    seriesValue,
    combinationValid,
    combinationValue,
    abilityCheckResults,
    resourcesMet,
    errors,
  };
}

export function resolveChallenge(
  gameState: GameSession,
  challengeId: string
): ChallengeEffect[] {
  const challenge = gameState.activeChallenge?.find((c) => c.id === challengeId);
  if (!challenge) return [];

  const result = canResolveChallenge(
    challenge,
    gameState.activeSeries,
    gameState.activeCombination,
    gameState.players
  );

  if (result.canResolve) {
    const contributorIds = new Set<string>();
    if (gameState.activeSeries) {
      for (const entry of gameState.activeSeries.cards) {
        contributorIds.add(entry.playerId);
      }
    }
    if (gameState.activeCombination) {
      for (const contrib of gameState.activeCombination.contributions) {
        contributorIds.add(contrib.playerId);
      }
    }
    return applySuccessRewards(gameState, challenge, Array.from(contributorIds));
  } else {
    return applyFailureConsequences(gameState, challenge);
  }
}

export function escalateChallenge(challenge: ChallengeCard): ChallengeCard {
  return {
    ...challenge,
    difficulty: challenge.difficulty + challenge.escalationPerRound,
    roundsActive: challenge.roundsActive + 1,
  };
}

export function applyFailureConsequences(
  gameState: GameSession,
  challenge: ChallengeCard
): ChallengeEffect[] {
  const effects: ChallengeEffect[] = [];

  for (const consequence of challenge.failureConsequences) {
    switch (consequence.type) {
      case 'cws_penalty': {
        const penalty = (consequence.params.amount as number) || 0;
        gameState.cwsTracker.currentScore = Math.max(
          0,
          gameState.cwsTracker.currentScore - penalty
        );
        effects.push({ type: 'cws_penalty', params: { amount: penalty } });
        break;
      }
      case 'zone_degrade': {
        const zoneId = consequence.params.zoneId as string;
        const zone = gameState.board.zones[zoneId];
        if (zone) {
          const condOrder: Array<'good' | 'fair' | 'poor' | 'critical' | 'locked'> = [
            'good', 'fair', 'poor', 'critical', 'locked',
          ];
          const idx = condOrder.indexOf(zone.condition);
          if (idx < condOrder.length - 1) {
            zone.condition = condOrder[idx + 1];
            if (zone.condition === 'locked') zone.isLocked = true;
          }
          effects.push({ type: 'zone_degrade', params: { zoneId, newCondition: zone.condition } });
        }
        break;
      }
      case 'resource_loss': {
        const targetPlayers = consequence.params.targetPlayers as string[] | undefined;
        const resource = consequence.params.resource as ResourceType;
        const amount = (consequence.params.amount as number) || 0;
        const pids = targetPlayers || Object.keys(gameState.players);
        for (const pid of pids) {
          const player = gameState.players[pid];
          if (player) {
            player.resources[resource] = Math.max(0, player.resources[resource] - amount);
          }
        }
        effects.push({ type: 'resource_loss', params: consequence.params });
        break;
      }
      case 'new_problem': {
        const zoneId = consequence.params.zoneId as string;
        const zone = gameState.board.zones[zoneId];
        if (zone) {
          zone.problemMarkers += 1;
          if (consequence.params.problemId) {
            zone.activeProblems.push(consequence.params.problemId as string);
          }
        }
        effects.push({ type: 'new_problem', params: consequence.params });
        break;
      }
      case 'lock_zone': {
        const zoneId = consequence.params.zoneId as string;
        const zone = gameState.board.zones[zoneId];
        if (zone) {
          zone.condition = 'locked';
          zone.isLocked = true;
        }
        effects.push({ type: 'lock_zone', params: { zoneId } });
        break;
      }
      case 'status_effect': {
        effects.push({ type: 'status_effect', params: consequence.params });
        break;
      }
      case 'difficulty_increase': {
        const amount = (consequence.params.amount as number) || 1;
        challenge.difficulty += amount;
        effects.push({ type: 'difficulty_increase', params: { amount } });
        break;
      }
    }
  }

  return effects;
}

export function applySuccessRewards(
  gameState: GameSession,
  challenge: ChallengeCard,
  contributorIds: string[]
): ChallengeEffect[] {
  const effects: ChallengeEffect[] = [];

  for (const reward of challenge.successRewards) {
    switch (reward.type) {
      case 'cws_bonus': {
        const bonus = (reward.params.amount as number) || 0;
        gameState.cwsTracker.currentScore += bonus;
        effects.push({ type: 'cws_bonus', params: { amount: bonus } });
        break;
      }
      case 'zone_improve': {
        const zoneId = reward.params.zoneId as string;
        const zone = gameState.board.zones[zoneId];
        if (zone) {
          const condOrder: Array<'good' | 'fair' | 'poor' | 'critical'> = [
            'critical', 'poor', 'fair', 'good',
          ];
          const idx = condOrder.indexOf(zone.condition as any);
          const levels = (reward.params.levels as number) || 1;
          const newIdx = Math.min(condOrder.length - 1, idx + levels);
          if (idx >= 0) {
            zone.condition = condOrder[newIdx];
          }
          effects.push({ type: 'zone_improve', params: { zoneId, newCondition: zone.condition } });
        }
        break;
      }
      case 'resource_gain': {
        const resource = reward.params.resource as ResourceType;
        const amount = (reward.params.amount as number) || 0;
        for (const pid of contributorIds) {
          const player = gameState.players[pid];
          if (player) {
            player.resources[resource] += amount;
          }
        }
        effects.push({ type: 'resource_gain', params: { resource, amount, playerIds: contributorIds } });
        break;
      }
      case 'cp_bonus': {
        const amount = (reward.params.amount as number) || 0;
        for (const pid of contributorIds) {
          const player = gameState.players[pid];
          if (player) {
            player.collaborationPoints += amount;
          }
        }
        effects.push({ type: 'cp_bonus', params: { amount, playerIds: contributorIds } });
        break;
      }
      case 'remove_problem': {
        const zoneId = reward.params.zoneId as string;
        const zone = gameState.board.zones[zoneId];
        if (zone) {
          zone.problemMarkers = Math.max(0, zone.problemMarkers - 1);
          if (reward.params.problemId && zone.activeProblems.includes(reward.params.problemId as string)) {
            zone.activeProblems = zone.activeProblems.filter(
              (p) => p !== reward.params.problemId
            );
          }
        }
        effects.push({ type: 'remove_problem', params: reward.params });
        break;
      }
      case 'unlock_zone': {
        const zoneId = reward.params.zoneId as string;
        const zone = gameState.board.zones[zoneId];
        if (zone && zone.isLocked) {
          zone.isLocked = false;
          zone.condition = 'critical';
        }
        effects.push({ type: 'unlock_zone', params: { zoneId } });
        break;
      }
    }
  }

  // Deduct resource costs from contributors proportionally (first contributor pays)
  const resourceCost = challenge.requirements.resourceCost;
  for (const [res, amount] of Object.entries(resourceCost)) {
    if (!amount) continue;
    let remaining = amount;
    for (const pid of contributorIds) {
      if (remaining <= 0) break;
      const player = gameState.players[pid];
      if (player) {
        const deduct = Math.min(player.resources[res as ResourceType], remaining);
        player.resources[res as ResourceType] -= deduct;
        remaining -= deduct;
      }
    }
  }

  return effects;
}
