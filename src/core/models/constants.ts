import { AbilityId, LevelEntry, RoleId, SkillId } from './types';

export const WELFARE_WEIGHTS: Record<RoleId, number> = {
  citizen: 1.5,
  advocate: 1.3,
  designer: 1.0,
  investor: 0.9,
  administrator: 0.8,
};

export const SKILL_ABILITY_MAP: Record<SkillId, AbilityId> = {
  negotiation: 'communityTrust',
  budgeting: 'resourcefulness',
  designThinking: 'technicalKnowledge',
  publicSpeaking: 'communityTrust',
  regulatoryNavigation: 'authority',
  environmentalAssessment: 'technicalKnowledge',
  coalitionBuilding: 'politicalLeverage',
  crisisManagement: 'adaptability',
};

export const TAG_ABILITY_MAP: Record<string, AbilityId> = {
  funding: 'resourcefulness',
  commercial: 'resourcefulness',
  design: 'technicalKnowledge',
  construction: 'technicalKnowledge',
  assessment: 'technicalKnowledge',
  ecological: 'technicalKnowledge',
  approval: 'authority',
  policy: 'authority',
  community: 'communityTrust',
  maintenance: 'adaptability',
};

export const LEVEL_TABLE: LevelEntry[] = [
  { level: 1, cpRequired: 0, proficiencyBonus: 2, newSkill: false, abilityBonus: false, handSize: 5, uniqueAbilityUses: 1 },
  { level: 2, cpRequired: 5, proficiencyBonus: 2, newSkill: true, abilityBonus: false, handSize: 6, uniqueAbilityUses: 1 },
  { level: 3, cpRequired: 12, proficiencyBonus: 3, newSkill: false, abilityBonus: true, handSize: 6, uniqueAbilityUses: 1 },
  { level: 4, cpRequired: 20, proficiencyBonus: 3, newSkill: true, abilityBonus: false, handSize: 7, uniqueAbilityUses: 1 },
  { level: 5, cpRequired: 30, proficiencyBonus: 4, newSkill: false, abilityBonus: true, handSize: 7, uniqueAbilityUses: 2 },
  { level: 6, cpRequired: 42, proficiencyBonus: 4, newSkill: true, abilityBonus: false, handSize: 8, uniqueAbilityUses: 2 },
  { level: 7, cpRequired: 56, proficiencyBonus: 5, newSkill: false, abilityBonus: true, handSize: 8, uniqueAbilityUses: 2 },
  { level: 8, cpRequired: 72, proficiencyBonus: 5, newSkill: true, abilityBonus: false, handSize: 9, uniqueAbilityUses: 2 },
  { level: 9, cpRequired: 90, proficiencyBonus: 6, newSkill: false, abilityBonus: true, handSize: 9, uniqueAbilityUses: 3 },
];

export const ZONE_CONDITION_ORDER: Record<string, number> = {
  locked: 0,
  critical: 1,
  poor: 2,
  fair: 3,
  good: 4,
};

export const ROLE_COLORS: Record<RoleId, string> = {
  administrator: '#C0392B',
  designer: '#2E86AB',
  citizen: '#27AE60',
  investor: '#E67E22',
  advocate: '#8E44AD',
};

export const RESOURCE_COLORS: Record<string, string> = {
  budget: '#F4D03F',
  influence: '#3498DB',
  volunteer: '#27AE60',
  material: '#95A5A6',
  knowledge: '#8E44AD',
};
