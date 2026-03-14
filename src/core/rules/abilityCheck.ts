import type { Player, AbilityId, SkillId } from '../models/types';

export interface AbilityCheckResult {
  success: boolean;
  checkValue: number;
  threshold: number;
  proficiencyApplied: boolean;
  crisisPenaltyApplied: boolean;
}

export function performAbilityCheck(
  player: Player,
  ability: AbilityId,
  threshold: number,
  skill?: SkillId
): AbilityCheckResult {
  let checkValue = player.abilities[ability];

  // Crisis state penalty: -2 to all ability scores for checks
  const crisisPenaltyApplied = player.crisisState;
  if (crisisPenaltyApplied) {
    checkValue -= 2;
  }

  // Apply status effect ability modifiers
  for (const effect of player.statusEffects) {
    if (effect.abilityModifiers[ability]) {
      checkValue += effect.abilityModifiers[ability]!;
    }
  }

  // Proficiency bonus if player has the relevant skill
  let proficiencyApplied = false;
  if (skill && player.proficientSkills.includes(skill)) {
    checkValue += player.proficiencyBonus;
    proficiencyApplied = true;
  }

  return {
    success: checkValue >= threshold,
    checkValue,
    threshold,
    proficiencyApplied,
    crisisPenaltyApplied,
  };
}
