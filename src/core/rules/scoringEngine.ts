import type { GameSession, Player } from '../models/types';
import { WELFARE_WEIGHTS } from '../models/constants';
import { evaluatePlayerGoals } from './goalEvaluator';

export interface PlayerUtilityResult {
  playerId: string;
  utility: number;
  satisfiedSubGoals: string[];
  crisisPenaltyApplied: boolean;
}

export interface CWSResult {
  weightedSum: number;
  equityBonus: number;
  collaborationBonus: number;
  totalRoundContribution: number;
  breakdown: {
    playerId: string;
    welfareWeight: number;
    utility: number;
    weighted: number;
  }[];
}

/**
 * Calculate a player's utility score.
 * Evaluate all subgoals across all tiers, sum weights of satisfied ones.
 * Apply crisis penalty: -3, minimum 0.
 */
export function calculatePlayerUtility(
  player: Player,
  gameState: GameSession
): PlayerUtilityResult {
  const satisfiedSubGoals: string[] = [];
  let totalWeight = 0;

  const tiers: Array<'character' | 'survival' | 'mission'> = ['character', 'survival', 'mission'];

  for (const tier of tiers) {
    const goalTier = player.goals[tier];
    for (const subGoal of goalTier.subGoals) {
      const isSatisfied = evaluatePlayerGoals(subGoal.condition, player, gameState);
      if (isSatisfied) {
        totalWeight += subGoal.weight;
        satisfiedSubGoals.push(subGoal.id);
      }
    }
  }

  let utility = totalWeight;
  const crisisPenaltyApplied = player.crisisState;
  if (crisisPenaltyApplied) {
    utility = Math.max(0, utility - 3);
  }

  return {
    playerId: player.id,
    utility,
    satisfiedSubGoals,
    crisisPenaltyApplied,
  };
}

/**
 * Calculate Community Welfare Score for a round.
 *
 * weightedSum = SUM(welfareWeight * utility) for each player
 * equityBonus = round(10 * (1 - min(variance / 529, 1)))
 * collaborationBonus = sum of all players' CP
 * totalRoundContribution = weightedSum + equityBonus + collaborationBonus
 */
export function calculateCWS(gameState: GameSession): CWSResult {
  const players = Object.values(gameState.players);
  const breakdown: CWSResult['breakdown'] = [];
  const utilities: number[] = [];

  // Calculate utility for each player
  for (const player of players) {
    const result = calculatePlayerUtility(player, gameState);
    const welfareWeight = WELFARE_WEIGHTS[player.roleId] || 1.0;
    const weighted = welfareWeight * result.utility;

    utilities.push(result.utility);
    breakdown.push({
      playerId: player.id,
      welfareWeight,
      utility: result.utility,
      weighted,
    });
  }

  const weightedSum = breakdown.reduce((sum, b) => sum + b.weighted, 0);

  // Equity bonus: based on variance of utility values
  const variance = calculateVariance(utilities);
  const equityBonus = Math.round(10 * (1 - Math.min(variance / 529, 1)));

  // Collaboration bonus: sum of all players' CP
  const collaborationBonus = players.reduce((sum, p) => sum + p.collaborationPoints, 0);

  const totalRoundContribution = weightedSum + equityBonus + collaborationBonus;

  return {
    weightedSum,
    equityBonus,
    collaborationBonus,
    totalRoundContribution,
    breakdown,
  };
}

/**
 * Calculate the Gini coefficient from spec Section 12.3.
 * Gini = (sum of |xi - xj| for all pairs i,j) / (2 * n * sum of xi)
 * Returns 0 if all values are 0.
 */
export function calculateGini(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;

  const total = values.reduce((sum, v) => sum + v, 0);
  if (total === 0) return 0;

  let sumAbsDiff = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumAbsDiff += Math.abs(values[i] - values[j]);
    }
  }

  return sumAbsDiff / (2 * n * total);
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
}
