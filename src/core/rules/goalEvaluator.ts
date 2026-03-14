import type {
  GameSession,
  GoalCondition,
  Player,
  ZoneCondition,
} from '../models/types';

/**
 * Evaluate a GoalCondition against the current game state.
 * Returns true if the condition is satisfied.
 */
export function evaluatePlayerGoals(
  condition: GoalCondition,
  player: Player,
  gameState: GameSession
): boolean {
  switch (condition.type) {
    case 'zone_condition':
      return evaluateZoneCondition(condition.params, gameState);

    case 'resource_threshold':
      return evaluateResourceThreshold(condition.params, player);

    case 'challenges_resolved':
      return evaluateChallengesResolved(condition.params, player, gameState);

    case 'trades_completed':
      return evaluateTradesCompleted(condition.params, player, gameState);

    case 'zones_improved':
      return evaluateZonesImproved(condition.params, gameState);

    case 'cp_earned':
      return evaluateCPEarned(condition.params, player);

    case 'custom':
      return evaluateCustomCondition(condition.params, player, gameState);

    default:
      return false;
  }
}

/**
 * Check if a specific zone is at a target condition (or better).
 * params: { zoneId: string, targetCondition: ZoneCondition }
 */
function evaluateZoneCondition(
  params: Record<string, any>,
  gameState: GameSession
): boolean {
  const zoneId = params.zoneId as string;
  const targetCondition = params.targetCondition as ZoneCondition;

  const zone = gameState.board.zones[zoneId];
  if (!zone) return false;

  const conditionOrder: ZoneCondition[] = ['locked', 'critical', 'poor', 'fair', 'good'];
  const currentIdx = conditionOrder.indexOf(zone.condition);
  const targetIdx = conditionOrder.indexOf(targetCondition);

  return currentIdx >= targetIdx;
}

/**
 * Check if player has a resource at or above a minimum.
 * params: { resource: ResourceType, minimum: number }
 */
function evaluateResourceThreshold(
  params: Record<string, any>,
  player: Player
): boolean {
  const resource = params.resource as keyof Player['resources'];
  const minimum = params.minimum as number;

  return player.resources[resource] >= minimum;
}

/**
 * Check how many challenges the player has contributed to resolving.
 * params: { minimum: number }
 * We count from telemetry events of type 'challenge_resolved' where player is actor.
 */
function evaluateChallengesResolved(
  params: Record<string, any>,
  player: Player,
  gameState: GameSession
): boolean {
  const minimum = params.minimum as number;

  const resolvedCount = gameState.telemetry.filter(
    (e) =>
      e.eventType === 'challenge_resolved' &&
      (e.actorId === player.id ||
        (e.data.contributorIds && (e.data.contributorIds as string[]).includes(player.id)))
  ).length;

  return resolvedCount >= minimum;
}

/**
 * Check how many trades the player has initiated/completed.
 * params: { minimum: number }
 */
function evaluateTradesCompleted(
  params: Record<string, any>,
  player: Player,
  gameState: GameSession
): boolean {
  const minimum = params.minimum as number;

  const completedTrades = gameState.telemetry.filter(
    (e) =>
      e.eventType === 'trade_completed' && e.actorId === player.id
  ).length;

  return completedTrades >= minimum;
}

/**
 * Count how many zones are at or above a target condition.
 * params: { targetCondition: ZoneCondition, minimum: number }
 */
function evaluateZonesImproved(
  params: Record<string, any>,
  gameState: GameSession
): boolean {
  const targetCondition = params.targetCondition as ZoneCondition;
  const minimum = params.minimum as number;

  const conditionOrder: ZoneCondition[] = ['locked', 'critical', 'poor', 'fair', 'good'];
  const targetIdx = conditionOrder.indexOf(targetCondition);

  let count = 0;
  for (const zone of Object.values(gameState.board.zones)) {
    const zoneIdx = conditionOrder.indexOf(zone.condition);
    if (zoneIdx >= targetIdx) count++;
  }

  return count >= minimum;
}

/**
 * Check if player has earned at least a certain amount of CP.
 * params: { minimum: number }
 */
function evaluateCPEarned(
  params: Record<string, any>,
  player: Player
): boolean {
  const minimum = params.minimum as number;
  return player.collaborationPoints >= minimum;
}

/**
 * Evaluate custom conditions based on params.check value.
 */
function evaluateCustomCondition(
  params: Record<string, any>,
  player: Player,
  gameState: GameSession
): boolean {
  const check = params.check as string;

  switch (check) {
    case 'all_zones_fair_or_better': {
      const conditionOrder: ZoneCondition[] = ['locked', 'critical', 'poor', 'fair', 'good'];
      const fairIdx = conditionOrder.indexOf('fair');
      return Object.values(gameState.board.zones).every(
        (zone) => conditionOrder.indexOf(zone.condition) >= fairIdx
      );
    }

    case 'no_locked_zones': {
      return Object.values(gameState.board.zones).every(
        (zone) => !zone.isLocked && zone.condition !== 'locked'
      );
    }

    case 'player_not_in_crisis': {
      return !player.crisisState;
    }

    case 'all_players_not_in_crisis': {
      return Object.values(gameState.players).every((p) => !p.crisisState);
    }

    case 'focus_zone_good': {
      const focusZone = gameState.board.zones[player.focusZoneId];
      return focusZone ? focusZone.condition === 'good' : false;
    }

    case 'cws_above_target': {
      return gameState.cwsTracker.currentScore >= gameState.cwsTracker.targetScore;
    }

    case 'utility_above_threshold': {
      const threshold = (params.threshold as number) || 0;
      return player.utilityScore >= threshold;
    }

    case 'level_reached': {
      const targetLevel = (params.level as number) || 1;
      return player.level >= targetLevel;
    }

    case 'hand_size_minimum': {
      const minCards = (params.minCards as number) || 0;
      return player.hand.length >= minCards;
    }

    case 'has_status_effect': {
      const effectName = params.effectName as string;
      return player.statusEffects.some((e) => e.name === effectName);
    }

    case 'zone_has_no_problems': {
      const zoneId = params.zoneId as string;
      const zone = gameState.board.zones[zoneId];
      return zone ? zone.activeProblems.length === 0 && zone.problemMarkers === 0 : false;
    }

    case 'total_resources_above': {
      const threshold = (params.threshold as number) || 0;
      const total =
        player.resources.budget +
        player.resources.influence +
        player.resources.volunteer +
        player.resources.material +
        player.resources.knowledge;
      return total >= threshold;
    }

    case 'unique_ability_used': {
      return gameState.telemetry.some(
        (e) => e.eventType === 'unique_ability_used' && e.actorId === player.id
      );
    }

    case 'majority_zones_good': {
      const zones = Object.values(gameState.board.zones);
      const goodCount = zones.filter((z) => z.condition === 'good').length;
      return goodCount > zones.length / 2;
    }

    case 'gini_below_threshold': {
      const threshold = (params.threshold as number) || 0.3;
      const utilities = Object.values(gameState.players).map((p) => p.utilityScore);
      const n = utilities.length;
      if (n === 0) return true;
      const total = utilities.reduce((s, v) => s + v, 0);
      if (total === 0) return true;
      let sumAbsDiff = 0;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          sumAbsDiff += Math.abs(utilities[i] - utilities[j]);
        }
      }
      const gini = sumAbsDiff / (2 * n * total);
      return gini <= threshold;
    }

    default:
      return false;
  }
}
