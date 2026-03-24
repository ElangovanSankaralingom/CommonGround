import { AbilityId, CombinationEntry, EventTableEntry, LevelEntry, ProfessionIncome, RoleId, SkillId, ZoneCondition } from './types';

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

// ─── Fix 5: Profession Income ────────────────────────────────
export const PROFESSION_INCOME: Record<RoleId, ProfessionIncome> = {
  citizen: {
    base: { budget: 0, influence: 0, volunteer: 2, material: 0, knowledge: 0 },
    bonusCondition: 'Home zone (playground or walking_track) is in Fair or better condition',
    bonusAmount: { volunteer: 1 },
  },
  advocate: {
    base: { budget: 0, influence: 1, volunteer: 0, material: 0, knowledge: 2 },
    bonusCondition: 'Any Crisis Card is currently active on the board',
    bonusAmount: { knowledge: 1 },
  },
  administrator: {
    base: { budget: 3, influence: 1, volunteer: 0, material: 0, knowledge: 0 },
    bonusCondition: 'Event Roll was NOT 4 (Budget Cut)',
    bonusAmount: { budget: 0 },
    penaltyCondition: 'Event Roll was 4',
    penaltyAmount: { budget: -1 },
  },
  designer: {
    base: { budget: 0, influence: 0, volunteer: 0, material: 1, knowledge: 2 },
    bonusCondition: 'Designer resolved a zone challenge in the previous round',
    bonusAmount: { knowledge: 1 },
  },
  investor: {
    base: { budget: 3, influence: 0, volunteer: 0, material: 1, knowledge: 0 },
    bonusCondition: 'Investor has a Revenue Token on any zone',
    bonusAmount: { budget: 1 },
    penaltyCondition: 'Investor did not visit or invest in any zone last round',
    penaltyAmount: { budget: -2 },
  },
};

// ─── Fix 3: Event Table (2d6) ────────────────────────────────
export const EVENT_TABLE: EventTableEntry[] = [
  {
    roll: 2,
    name: 'Infrastructure Collapse',
    zoneEffect: 'Random zone loses 2 resources',
    playerEffect: 'Administrator must spend 1 Budget Token',
    phaseTriggered: 'deliberation_all',
    requiredPlayers: 'all',
  },
  {
    roll: 3,
    name: 'Community Protest',
    zoneEffect: 'boating_pond OR restroom_block escalates to crisis',
    playerEffect: 'Citizen gains +1 Action Card draw',
    phaseTriggered: 'deliberation_partial',
    requiredPlayers: ['citizen', 'advocate', 'administrator'],
  },
  {
    roll: 4,
    name: 'Budget Cut',
    zoneEffect: 'All Common Pool Zones lose 1 resource',
    playerEffect: 'Administrator cannot play funding-tagged cards this round',
    phaseTriggered: 'individual_only',
    requiredPlayers: 'all', // not used for individual_only
  },
  {
    roll: 5,
    name: 'Monsoon Damage',
    zoneEffect: 'boating_pond resources disrupted (halved)',
    playerEffect: 'Designer must repair before building',
    phaseTriggered: 'deliberation_partial',
    requiredPlayers: ['designer', 'administrator'],
  },
  {
    roll: 6,
    name: 'Media Spotlight',
    zoneEffect: 'Highest-CWS-contributing zone gains +1 resource',
    playerEffect: 'Any player may play an extra card this round',
    phaseTriggered: 'individual_only',
    requiredPlayers: 'all',
  },
  {
    roll: 7,
    name: 'Neutral Round',
    zoneEffect: 'No zone effect',
    playerEffect: 'All players draw 1 extra card',
    phaseTriggered: 'individual_only',
    requiredPlayers: 'all',
  },
  {
    roll: 8,
    name: 'Grant Unlocked',
    zoneEffect: 'ppp_zone gains +2 Budget Tokens',
    playerEffect: 'Investor may take a free action at ppp_zone',
    phaseTriggered: 'deliberation_partial',
    requiredPlayers: ['investor'],
  },
  {
    roll: 9,
    name: 'Public Holiday',
    zoneEffect: 'Payment Day bonuses doubled this round',
    playerEffect: 'All players receive double profession income',
    phaseTriggered: 'individual_only',
    requiredPlayers: 'all',
  },
  {
    roll: 10,
    name: 'Developer Interest',
    zoneEffect: 'ppp_zone escalates (new Tension Card drawn)',
    playerEffect: 'Investor + Designer must respond with cards or lose resources',
    phaseTriggered: 'deliberation_partial',
    requiredPlayers: ['investor', 'designer'],
  },
  {
    roll: 11,
    name: 'Political Scrutiny',
    zoneEffect: "Administrator's resource pool becomes visible to all",
    playerEffect: "All players can see Administrator's hand and resources",
    phaseTriggered: 'deliberation_all',
    requiredPlayers: 'all',
  },
  {
    roll: 12,
    name: 'Community Festival',
    zoneEffect: 'All Common Pool Zones gain +1 resource',
    playerEffect: 'Citizen plays a bonus Community card for free',
    phaseTriggered: 'deliberation_all',
    requiredPlayers: 'all',
  },
];

// ─── Fix 4: Combination Matrix ───────────────────────────────
export const COMBINATION_MATRIX: CombinationEntry[] = [
  {
    roles: ['administrator', 'designer'],
    requiredTags: [['funding', 'approval'], ['design', 'construction']],
    bonusDescription: 'Infrastructure fully resolved',
    bonusEffects: [
      { type: 'modify_zone_condition', target: 'zone', params: { improveBy: 2 } },
      { type: 'remove_problem_marker', target: 'zone', params: { all: true } },
    ],
  },
  {
    roles: ['citizen', 'advocate'],
    requiredTags: [['community'], ['ecological', 'assessment']],
    bonusDescription: 'Social-ecological synergy',
    bonusEffects: [
      { type: 'cws_bonus', params: { amount: 2 } },
      { type: 'grant_cp', target: 'participants', params: { amount: 2 } },
    ],
  },
  {
    roles: ['investor', 'administrator'],
    requiredTags: [['commercial', 'funding'], ['approval', 'policy']],
    bonusDescription: 'PPP activated',
    bonusEffects: [
      { type: 'unlock_zone', params: { zoneId: 'ppp_zone' } },
      { type: 'add_resources', target: 'zone', params: { budget: 3 } },
    ],
  },
  {
    roles: ['designer', 'citizen'],
    requiredTags: [['design'], ['community']],
    bonusDescription: 'Community-backed design',
    bonusEffects: [
      { type: 'auto_succeed_proposal', params: {} },
      { type: 'grant_cp', target: 'participants', params: { amount: 1 } },
    ],
  },
  {
    roles: ['advocate', 'citizen', 'investor'],
    requiredTags: [['ecological', 'community'], ['community'], ['funding', 'commercial']],
    bonusDescription: 'Public interest forces investor contribution',
    bonusEffects: [
      { type: 'force_contribution', target: 'investor', params: { budget: -2 } },
      { type: 'create_revenue_token', target: 'investor', params: {} },
    ],
  },
];

// ─── Fix 5: Game Level Thresholds ────────────────────────────
export const GAME_LEVEL_THRESHOLDS = [
  {
    from: 1,
    to: 2,
    condition: '3 or more zones have reached Fair condition or better',
    changes: [
      'New harder Challenge Cards enter the deck',
      'Payment Day incomes increase by +1 across all roles',
      'Locked zones become unlockable',
      'Event Table shifts to Level 2 events',
    ],
  },
  {
    from: 2,
    to: 3,
    condition: 'A Full Coalition Resolution has been achieved at least once',
    changes: [
      'Master Challenge Cards enter the deck',
      'Payment Day incomes increase by +1 again',
      'All zone interactions available',
      'Final round countdown begins (game ends in 2 more rounds)',
    ],
  },
  {
    from: 3,
    to: 'end' as const,
    condition: 'All zones reach Fair condition or better simultaneously',
    changes: ['Game concludes. Final Welfare Function calculated.'],
  },
];

// ─── Fix 6: Zone Weights for VO ──────────────────────────────
export const DEFAULT_ZONE_WEIGHTS: Record<string, number> = {
  boating_pond: 3,
  fountain_plaza: 3,
  playground: 4,
  walking_track: 2,
  herbal_garden: 4,
  open_lawn: 2,
  exercise_zone: 2,
  sculpture_garden: 3,
  vendor_hub: 2,
  restroom_block: 3,
  fiber_optic_lane: 1,
  ppp_zone: 1,
  maintenance_depot: 2,
  main_entrance: 2,
};

// Investor sees ppp_zone with weight 5
export const INVESTOR_ZONE_WEIGHT_OVERRIDES: Record<string, number> = {
  ppp_zone: 5,
};

export const CONDITION_TO_WELFARE: Record<ZoneCondition, number> = {
  locked: 0,
  critical: 1,
  poor: 2,
  fair: 3,
  good: 4,
};

// Series escalation bonuses (Fix 4)
export const SERIES_ESCALATION = {
  1: { bonus: 0, description: 'Base effect only' },
  2: { bonus: 2, description: 'Series bonus +2' },
  3: { bonus: 5, description: 'Series bonus +5 + special completion effect' },
};

// Challenge category colors (Fix 2)
export const CHALLENGE_CATEGORY_COLORS: Record<string, string> = {
  crisis: '#EF4444',
  opportunity: '#22C55E',
  tension: '#F59E0B',
};
