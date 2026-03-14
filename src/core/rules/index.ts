export { performAbilityCheck } from './abilityCheck';
export type { AbilityCheckResult } from './abilityCheck';

export {
  validateSeriesFormation,
  calculateSeriesValue,
  canAddCardToSeries,
  hasCommonTag,
} from './seriesResolver';
export type { ValidationResult as SeriesValidationResult } from './seriesResolver';

export {
  validateCombination,
  calculateCombinationValue,
  canContribute,
} from './combinationResolver';

export {
  canResolveChallenge,
  resolveChallenge,
  escalateChallenge,
  applyFailureConsequences,
  applySuccessRewards,
} from './challengeResolver';
export type { ResolutionResult, ChallengeEffect } from './challengeResolver';

export {
  improveZoneCondition,
  degradeZoneCondition,
  isZoneLocked,
  canUnlockZone,
  unlockZone,
} from './zoneRules';

export {
  performResourceRegeneration,
  drawCardForPlayer,
} from './resourceRegen';
export type { ResourceRegenResult } from './resourceRegen';

export { canUseAbility, useAbility } from './uniqueAbilities';
export type { AbilityResult, AbilityEffect } from './uniqueAbilities';

export { validateTrade, executeTrade, applyTradeCard } from './tradingRules';

export { SeededRNG, rollEventDie } from './eventDie';

export { EquityMonitor } from './equityMonitor';
export type { EquityPrompt } from './equityMonitor';

export {
  calculatePlayerUtility,
  calculateCWS,
  calculateGini,
} from './scoringEngine';
export type { PlayerUtilityResult, CWSResult } from './scoringEngine';

export { evaluatePlayerGoals } from './goalEvaluator';

export { checkLevelUp, getLevelForCP, applyLevelUp } from './levelProgression';
export type { LevelUpResult, LevelPerks } from './levelProgression';
