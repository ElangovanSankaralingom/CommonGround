import type { Player, AbilityId, SkillId } from '../models/types';
import { LEVEL_TABLE } from '../models/constants';

export interface LevelUpResult {
  newLevel: number;
  perks: LevelPerks;
}

export interface LevelPerks {
  proficiencyBonus: number;
  handSize: number;
  uniqueAbilityUses: number;
  newSkill: boolean;
  abilityBonus: boolean;
}

/**
 * Get the level corresponding to a given CP total.
 * Returns the highest level whose cpRequired is <= cp.
 */
export function getLevelForCP(cp: number): number {
  let level = 1;
  for (const entry of LEVEL_TABLE) {
    if (cp >= entry.cpRequired) {
      level = entry.level;
    } else {
      break;
    }
  }
  return level;
}

/**
 * Check if a player qualifies for a level up.
 * Returns the new level and its perks, or null if no level up is available.
 */
export function checkLevelUp(player: Player): LevelUpResult | null {
  const newLevel = getLevelForCP(player.collaborationPoints);

  if (newLevel <= player.level) {
    return null;
  }

  const entry = LEVEL_TABLE.find((e) => e.level === newLevel);
  if (!entry) return null;

  return {
    newLevel,
    perks: {
      proficiencyBonus: entry.proficiencyBonus,
      handSize: entry.handSize,
      uniqueAbilityUses: entry.uniqueAbilityUses,
      newSkill: entry.newSkill,
      abilityBonus: entry.abilityBonus,
    },
  };
}

/**
 * Apply a level up to a player.
 * choices.newSkill: the skill to gain (if the level grants a new skill)
 * choices.abilityBonus: the ability to increase by +1 (if the level grants an ability bonus)
 */
export function applyLevelUp(
  player: Player,
  level: number,
  choices: { newSkill?: SkillId; abilityBonus?: AbilityId }
): Player {
  const entry = LEVEL_TABLE.find((e) => e.level === level);
  if (!entry) return player;

  const updated: Player = {
    ...player,
    level,
    proficiencyBonus: entry.proficiencyBonus,
    uniqueAbilityUsesRemaining: entry.uniqueAbilityUses,
    proficientSkills: [...player.proficientSkills],
    abilities: { ...player.abilities },
  };

  // Grant new skill if applicable
  if (entry.newSkill && choices.newSkill) {
    if (!updated.proficientSkills.includes(choices.newSkill)) {
      updated.proficientSkills.push(choices.newSkill);
    }
  }

  // Grant ability bonus if applicable
  if (entry.abilityBonus && choices.abilityBonus) {
    updated.abilities[choices.abilityBonus] += 1;
  }

  return updated;
}
