import { AbilityId, CombinationEntry, EventTableEntry, LevelEntry, ProfessionIncome, RoleId, SkillId, ZoneCondition } from './types';

// ═══════════════════════════════════════════════════════════════
// AUTHORITATIVE VALUES — from CommonGround_Complete_Specification.docx
// These are research-critical. Do NOT modify without specification change.
// ═══════════════════════════════════════════════════════════════

// ─── Part 2.1: Welfare Weights (inverse power weighting) ─────
export const WELFARE_WEIGHTS: Record<RoleId, number> = {
  administrator: 0.8,   // Most powerful → lowest weight
  investor: 0.8,
  designer: 1.0,         // Baseline
  citizen: 1.4,          // Most marginalised → highest weight
  advocate: 1.2,
};

// ─── Part 2.1: Survival Thresholds (T_i) ────────────────────
export const SURVIVAL_THRESHOLDS: Record<RoleId, number> = {
  administrator: 12,
  investor: 8,
  designer: 10,
  citizen: 10,
  advocate: 8,
};

// ─── Part 1.4: S-Fixed vs Environment distinction ────────────
export const PLAYER_TYPE: Record<RoleId, 'S-FIXED' | 'ENVIRONMENT'> = {
  administrator: 'S-FIXED',
  investor: 'S-FIXED',
  designer: 'ENVIRONMENT',
  citizen: 'ENVIRONMENT',
  advocate: 'ENVIRONMENT',
};

// ─── Part 2.2: 6-Objective Weight Functions per role ─────────
export type ObjectiveId = 'safety' | 'greenery' | 'access' | 'culture' | 'revenue' | 'community';

export const OBJECTIVE_WEIGHTS: Record<RoleId, Record<ObjectiveId, number>> = {
  administrator: { safety: 4, greenery: 3, access: 4, culture: 2, revenue: 1, community: 3 },  // sum=17
  investor:      { safety: 1, greenery: 1, access: 3, culture: 0, revenue: 5, community: -1 }, // sum=9, Community=-1 is structural conflict engine
  designer:      { safety: 3, greenery: 4, access: 4, culture: 5, revenue: 0, community: 3 },  // sum=19
  citizen:       { safety: 5, greenery: 4, access: 3, culture: 2, revenue: 0, community: 5 },  // sum=19
  advocate:      { safety: 4, greenery: 5, access: 3, culture: 4, revenue: 0, community: 4 },  // sum=20
};

// ─── Part 2.2: Büchi Objectives (must be in sat every 2 rounds) ─
export const BUCHI_OBJECTIVES: Record<RoleId, ObjectiveId[]> = {
  administrator: ['safety', 'access', 'community'],
  investor:      ['revenue', 'access'],
  designer:      ['culture', 'access', 'greenery'],
  citizen:       ['safety', 'community', 'greenery'],
  advocate:      ['greenery', 'safety', 'culture', 'community'],
};

// ─── Part 2.4: Zone → Objective Mapping ──────────────────────
// Each objective is 'in sat' if at least one of its linked zones is Fair or better
export const OBJECTIVE_ZONE_MAP: Record<ObjectiveId, string[]> = {
  safety:    ['fountain_plaza', 'playground', 'walking_track', 'exercise_zone', 'restroom_block', 'fiber_optic_lane', 'maintenance_depot', 'boating_pond'],
  greenery:  ['boating_pond', 'herbal_garden', 'open_lawn', 'sculpture_garden'],
  access:    ['main_entrance', 'walking_track', 'open_lawn', 'exercise_zone', 'playground', 'restroom_block'],
  culture:   ['fountain_plaza', 'sculpture_garden', 'herbal_garden', 'fiber_optic_lane'],
  revenue:   ['vendor_hub', 'ppp_zone', 'main_entrance'],
  community: ['open_lawn', 'playground', 'main_entrance', 'vendor_hub', 'sculpture_garden'],
};

// ─── Part 5.1: Nash Check Parameters ─────────────────────────
export const NASH_PARAMS = {
  equityBandK: 4,        // Variance threshold for Q3
  cwsTarget: 75,         // CWS threshold for Q3
  maxEquityBonus: 10,    // Equity bonus ceiling
  maxVariance: 100,      // Calibration constant for equity bonus
  fullDneThreshold: 85,  // CWS for FULL DNE SUCCESS
  partialThreshold: 60,  // CWS for PARTIAL SUCCESS
};

// ─── Part 3.4: Graduated Outcomes ────────────────────────────
// Series Value vs Threshold comparison
export const GRADUATED_OUTCOMES = {
  fullSuccess:    { minExceedBy: 4, zoneImprovement: 2, cwsBonusPct: 1.0, description: 'Full Success' },
  partialSuccess: { minExceedBy: 1, zoneImprovement: 1, cwsBonusPct: 0.6, description: 'Partial Success' },
  narrowSuccess:  { minExceedBy: 0, zoneImprovement: 0, cwsBonusPct: 0.4, resourceCost: 1, description: 'Narrow Success' },
  failure:        { zoneDegrade: 1, thresholdEscalation: 2, description: 'Failure' },
};

// ─── Part 3.5: Constraints ───────────────────────────────────
export const MAX_SOLO_SERIES_VALUE = 10; // 5 (best card) + 3 (max modifier) + 2 (proficiency)
export const MIN_CHALLENGE_THRESHOLD = 11; // Forces cooperation

// ─── Part 2.3: Starting Resources & Round Income ─────────────
export const PROFESSION_INCOME: Record<RoleId, ProfessionIncome> = {
  administrator: {
    base: { budget: 2, influence: 1, volunteer: 0, material: 0, knowledge: 0 },
    bonusCondition: 'Standard round income',
    bonusAmount: {},
  },
  investor: {
    base: { budget: 3, influence: 0, volunteer: 0, material: 0, knowledge: 0 },
    bonusCondition: 'Standard round income',
    bonusAmount: {},
  },
  designer: {
    base: { budget: 0, influence: 0, volunteer: 0, material: 0, knowledge: 2 },
    bonusCondition: 'Standard round income',
    bonusAmount: {},
  },
  citizen: {
    base: { budget: 0, influence: 0, volunteer: 3, material: 0, knowledge: 0 },
    bonusCondition: 'Standard round income',
    bonusAmount: {},
  },
  advocate: {
    base: { budget: 0, influence: 1, volunteer: 0, material: 0, knowledge: 1 },
    bonusCondition: 'Standard round income',
    bonusAmount: {},
  },
};

// ─── Existing constants (unchanged) ──────────────────────────

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

export const CONDITION_TO_WELFARE: Record<ZoneCondition, number> = {
  locked: 0,
  critical: 1,
  poor: 2,
  fair: 3,
  good: 4,
};

// ─── Event Table (2d6) ───────────────────────────────────────
export const EVENT_TABLE: EventTableEntry[] = [
  { roll: 2, name: 'Infrastructure Collapse', zoneEffect: 'Random zone loses 2 resources', playerEffect: 'Administrator must spend 1 Budget Token', phaseTriggered: 'deliberation_all', requiredPlayers: 'all' },
  { roll: 3, name: 'Community Protest', zoneEffect: 'boating_pond OR restroom_block escalates to crisis', playerEffect: 'Citizen gains +1 Action Card draw', phaseTriggered: 'deliberation_partial', requiredPlayers: ['citizen', 'advocate', 'administrator'] },
  { roll: 4, name: 'Budget Cut', zoneEffect: 'All Common Pool Zones lose 1 resource', playerEffect: 'Administrator cannot play funding-tagged cards this round', phaseTriggered: 'individual_only', requiredPlayers: 'all' },
  { roll: 5, name: 'Monsoon Damage', zoneEffect: 'boating_pond resources disrupted (halved)', playerEffect: 'Designer must repair before building', phaseTriggered: 'deliberation_partial', requiredPlayers: ['designer', 'administrator'] },
  { roll: 6, name: 'Media Spotlight', zoneEffect: 'Highest-CWS-contributing zone gains +1 resource', playerEffect: 'Any player may play an extra card this round', phaseTriggered: 'individual_only', requiredPlayers: 'all' },
  { roll: 7, name: 'Neutral Round', zoneEffect: 'No zone effect', playerEffect: 'All players draw 1 extra card', phaseTriggered: 'individual_only', requiredPlayers: 'all' },
  { roll: 8, name: 'Grant Unlocked', zoneEffect: 'ppp_zone gains +2 Budget Tokens', playerEffect: 'Investor may take a free action at ppp_zone', phaseTriggered: 'deliberation_partial', requiredPlayers: ['investor'] },
  { roll: 9, name: 'Public Holiday', zoneEffect: 'Payment Day bonuses doubled this round', playerEffect: 'All players receive double profession income', phaseTriggered: 'individual_only', requiredPlayers: 'all' },
  { roll: 10, name: 'Developer Interest', zoneEffect: 'ppp_zone escalates (new Tension Card drawn)', playerEffect: 'Investor + Designer must respond with cards or lose resources', phaseTriggered: 'deliberation_partial', requiredPlayers: ['investor', 'designer'] },
  { roll: 11, name: 'Political Scrutiny', zoneEffect: "Administrator's resource pool becomes visible to all", playerEffect: "All players can see Administrator's hand and resources", phaseTriggered: 'deliberation_all', requiredPlayers: 'all' },
  { roll: 12, name: 'Community Festival', zoneEffect: 'All Common Pool Zones gain +1 resource', playerEffect: 'Citizen plays a bonus Community card for free', phaseTriggered: 'deliberation_all', requiredPlayers: 'all' },
];

// ─── Combination Matrix ──────────────────────────────────────
export const COMBINATION_MATRIX: CombinationEntry[] = [
  { roles: ['administrator', 'designer'], requiredTags: [['funding', 'approval'], ['design', 'construction']], bonusDescription: 'Infrastructure fully resolved', bonusEffects: [{ type: 'modify_zone_condition', target: 'zone', params: { improveBy: 2 } }, { type: 'remove_problem_marker', target: 'zone', params: { all: true } }] },
  { roles: ['citizen', 'advocate'], requiredTags: [['community'], ['ecological', 'assessment']], bonusDescription: 'Social-ecological synergy', bonusEffects: [{ type: 'cws_bonus', params: { amount: 2 } }, { type: 'grant_cp', target: 'participants', params: { amount: 2 } }] },
  { roles: ['investor', 'administrator'], requiredTags: [['commercial', 'funding'], ['approval', 'policy']], bonusDescription: 'PPP activated', bonusEffects: [{ type: 'unlock_zone', params: { zoneId: 'ppp_zone' } }, { type: 'add_resources', target: 'zone', params: { budget: 3 } }] },
  { roles: ['designer', 'citizen'], requiredTags: [['design'], ['community']], bonusDescription: 'Community-backed design', bonusEffects: [{ type: 'auto_succeed_proposal', params: {} }, { type: 'grant_cp', target: 'participants', params: { amount: 1 } }] },
  { roles: ['advocate', 'citizen', 'investor'], requiredTags: [['ecological', 'community'], ['community'], ['funding', 'commercial']], bonusDescription: 'Public interest forces investor contribution', bonusEffects: [{ type: 'force_contribution', target: 'investor', params: { budget: -2 } }, { type: 'create_revenue_token', target: 'investor', params: {} }] },
];

// ─── Game Level Thresholds ───────────────────────────────────
export const GAME_LEVEL_THRESHOLDS = [
  { from: 1, to: 2, condition: '3 or more zones at Fair or better', changes: ['New harder Challenge Cards', 'Payment Day incomes +1', 'Locked zones unlockable'] },
  { from: 2, to: 3, condition: 'Full Coalition achieved once', changes: ['Master Challenge Cards', 'Payment Day incomes +1 again', 'Final countdown begins'] },
  { from: 3, to: 'end' as const, condition: 'All zones Fair or better', changes: ['Game concludes'] },
];

// ─── Zone Weights for VO (Game Graph) ────────────────────────
export const DEFAULT_ZONE_WEIGHTS: Record<string, number> = {
  boating_pond: 3, fountain_plaza: 3, playground: 4, walking_track: 2, herbal_garden: 4,
  open_lawn: 2, exercise_zone: 2, sculpture_garden: 3, vendor_hub: 2, restroom_block: 3,
  fiber_optic_lane: 1, ppp_zone: 1, maintenance_depot: 2, main_entrance: 2,
};

export const INVESTOR_ZONE_WEIGHT_OVERRIDES: Record<string, number> = { ppp_zone: 5 };

export const SERIES_ESCALATION = {
  1: { bonus: 0, description: 'Base effect only' },
  2: { bonus: 2, description: 'Coalition Bonus +2' },
  3: { bonus: 5, description: 'Multi-Role Bonus +3 (3+ roles) + Coalition Bonus +2' },
};

export const CHALLENGE_CATEGORY_COLORS: Record<string, string> = {
  crisis: '#EF4444',
  opportunity: '#22C55E',
  tension: '#F59E0B',
};
