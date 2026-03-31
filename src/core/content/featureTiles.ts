/**
 * Feature tiles for the Vision Board (Phase 3) and zone-specific hidden objects (Phase 2).
 * Each tile represents a buildable feature with resource costs and objective mappings.
 */

import type { ResourceType, RoleId } from '../models/types';

// ─── Feature Tile (Vision Board) ─────────────────────────────────

export interface FeatureTile {
  id: string;
  name: string;
  icon: string;
  cost: Partial<Record<ResourceType, number>>;
  objectivesServed: string[]; // ObjectiveId[]
  description: string;
  taskCategory: 'assess' | 'plan' | 'design' | 'build' | 'maintain';
}

// Zone-specific feature tile sets
export const ZONE_FEATURE_TILES: Record<string, FeatureTile[]> = {
  boating_pond: [
    { id: 'ft_bp_drain', name: 'Drainage System', icon: '\u{1F6B0}', cost: { knowledge: 3, material: 2, budget: 2 }, objectivesServed: ['safety', 'greenery'], description: 'Repair blocked drainage to prevent algae buildup', taskCategory: 'build' },
    { id: 'ft_bp_filter', name: 'Water Filtration', icon: '\u{1F4A7}', cost: { knowledge: 2, material: 1 }, objectivesServed: ['greenery'], description: 'Install bio-filtration for clean pond water', taskCategory: 'design' },
    { id: 'ft_bp_seat', name: 'Community Seating', icon: '\u{1FA91}', cost: { budget: 1, volunteer: 2 }, objectivesServed: ['community', 'safety'], description: 'Install benches for families along the pond', taskCategory: 'build' },
    { id: 'ft_bp_cafe', name: 'Lakeside Cafe', icon: '\u{2615}', cost: { budget: 3, material: 1, knowledge: 1 }, objectivesServed: ['revenue', 'community'], description: 'Small cafe generating revenue and community space', taskCategory: 'build' },
    { id: 'ft_bp_plants', name: 'Native Planting', icon: '\u{1F33F}', cost: { knowledge: 2, volunteer: 1 }, objectivesServed: ['greenery', 'culture'], description: 'Plant native species around the pond perimeter', taskCategory: 'maintain' },
    { id: 'ft_bp_path', name: 'Walking Path', icon: '\u{1F6B6}', cost: { material: 2, budget: 1 }, objectivesServed: ['access', 'safety'], description: 'Paved walkway circling the pond', taskCategory: 'build' },
    { id: 'ft_bp_waste', name: 'Waste Management', icon: '\u{267B}', cost: { budget: 1, volunteer: 1, material: 1 }, objectivesServed: ['safety', 'community'], description: 'Bins and regular cleanup schedule', taskCategory: 'maintain' },
    { id: 'ft_bp_light', name: 'Lighting System', icon: '\u{1F4A1}', cost: { budget: 2, material: 1 }, objectivesServed: ['safety', 'access'], description: 'Solar-powered pathway lights for evening safety', taskCategory: 'build' },
  ],
  playground: [
    { id: 'ft_pg_equip', name: 'New Equipment', icon: '\u{1F3A0}', cost: { budget: 3, material: 3 }, objectivesServed: ['safety', 'community'], description: 'Replace rusted playground equipment', taskCategory: 'build' },
    { id: 'ft_pg_fence', name: 'Safety Barrier', icon: '\u{1F6A7}', cost: { material: 2, budget: 1 }, objectivesServed: ['safety'], description: 'Install safety fencing around play area', taskCategory: 'build' },
    { id: 'ft_pg_shade', name: 'Shade Structure', icon: '\u{26F1}', cost: { budget: 2, material: 2 }, objectivesServed: ['safety', 'access'], description: 'Covered seating for parents and shade for children', taskCategory: 'design' },
    { id: 'ft_pg_path', name: 'Accessible Path', icon: '\u{267F}', cost: { material: 2, budget: 1 }, objectivesServed: ['access', 'community'], description: 'Wheelchair-accessible pathways to playground', taskCategory: 'build' },
    { id: 'ft_pg_art', name: 'Play Art', icon: '\u{1F3A8}', cost: { knowledge: 1, volunteer: 2 }, objectivesServed: ['culture', 'community'], description: 'Community mural and art installations', taskCategory: 'design' },
    { id: 'ft_pg_maint', name: 'Maintenance Plan', icon: '\u{1F527}', cost: { budget: 1, volunteer: 1 }, objectivesServed: ['safety'], description: 'Weekly inspection and repair schedule', taskCategory: 'maintain' },
  ],
  // Default tiles for any zone not specifically defined
  _default: [
    { id: 'ft_def_assess', name: 'Site Assessment', icon: '\u{1F50D}', cost: { knowledge: 2 }, objectivesServed: ['safety'], description: 'Professional assessment of current conditions', taskCategory: 'assess' },
    { id: 'ft_def_plan', name: 'Restoration Plan', icon: '\u{1F4CB}', cost: { knowledge: 2, influence: 1 }, objectivesServed: ['access', 'safety'], description: 'Comprehensive plan for zone improvement', taskCategory: 'plan' },
    { id: 'ft_def_infra', name: 'Infrastructure Fix', icon: '\u{1F3D7}', cost: { budget: 3, material: 2 }, objectivesServed: ['safety', 'access'], description: 'Repair core infrastructure issues', taskCategory: 'build' },
    { id: 'ft_def_green', name: 'Green Cover', icon: '\u{1F333}', cost: { volunteer: 2, knowledge: 1 }, objectivesServed: ['greenery'], description: 'Plant trees and maintain green areas', taskCategory: 'maintain' },
    { id: 'ft_def_comm', name: 'Community Space', icon: '\u{1F465}', cost: { budget: 1, volunteer: 2 }, objectivesServed: ['community'], description: 'Create gathering and activity areas', taskCategory: 'build' },
    { id: 'ft_def_culture', name: 'Cultural Feature', icon: '\u{1F3AD}', cost: { knowledge: 1, influence: 1, budget: 1 }, objectivesServed: ['culture'], description: 'Art installations or heritage preservation', taskCategory: 'design' },
    { id: 'ft_def_revenue', name: 'Revenue Point', icon: '\u{1F4B0}', cost: { budget: 2, material: 1 }, objectivesServed: ['revenue'], description: 'Income-generating amenity', taskCategory: 'build' },
    { id: 'ft_def_maintain', name: 'Maintenance System', icon: '\u{1F9F9}', cost: { budget: 1, volunteer: 1, material: 1 }, objectivesServed: ['safety', 'community'], description: 'Regular upkeep and cleaning protocols', taskCategory: 'maintain' },
  ],
};

export function getFeatureTilesForZone(zoneId: string): FeatureTile[] {
  return ZONE_FEATURE_TILES[zoneId] || ZONE_FEATURE_TILES._default;
}

// ─── Hidden Objects for Phase 2 Investigation ────────────────────

export interface HiddenObject {
  id: string;
  name: string;
  x: number;  // percentage position
  y: number;
  relevant: boolean;
  clueType?: 'consequence' | 'capability' | 'outcome' | 'resource' | 'connection' | 'evidence' | 'blueprint';
  revealText: string;
  teachingText?: string;       // shown for irrelevant objects
  teachingEffect?: 'timer_loss' | 'distracted' | 'awareness_gain' | 'turn_consumed' | 'bureaucratic';
  timerPenalty?: number;       // seconds lost
}

export const ZONE_HIDDEN_OBJECTS: Record<string, HiddenObject[]> = {
  boating_pond: [
    // RELEVANT (7)
    { id: 'bp_pipe', name: 'Cracked drainage pipe', x: 25, y: 65, relevant: true, clueType: 'consequence', revealText: 'This pipe has been blocked since 2019. If it stays blocked, the algae will spread to the Herbal Garden through shared groundwater. CONSEQUENCE: Zone degrades further AND adjacent zones lose 1 condition level.' },
    { id: 'bp_toy', name: 'Abandoned child toy', x: 60, y: 40, relevant: true, clueType: 'capability', revealText: 'A child\'s toy, abandoned by the murky water. Families used to gather here every evening. The algae drove them away.' },
    { id: 'bp_sign', name: 'Faded municipal sign', x: 80, y: 25, relevant: true, clueType: 'outcome', revealText: 'Corporation Eco-Park Beautification Project Phase 2: Boating Pond. Status: Never Started. Full Success restores the pond. Partial brings it to Fair. Failure means algae spreads.' },
    { id: 'bp_closet', name: 'Maintenance closet', x: 12, y: 45, relevant: true, clueType: 'resource', revealText: 'Behind overgrown bushes, an old maintenance closet with working equipment! +1 Material Token. Sometimes solutions are already there.' },
    { id: 'bp_junction', name: 'Pipe junction to Z6', x: 35, y: 80, relevant: true, clueType: 'connection', revealText: 'This pipe connects to the Herbal Garden. Fix drainage here and the garden benefits too. CASCADE: Adjacent zone improves +1 if resolved.' },
    { id: 'bp_sample', name: 'Water sample point', x: 50, y: 55, relevant: true, clueType: 'evidence', revealText: 'Algae concentration is 4x safe levels. The water is not just dirty \u2014 it is actively toxic. Ecological restoration requires both drainage AND bio-filtration.' },
    { id: 'bp_map', name: 'Drainage blueprint', x: 70, y: 70, relevant: true, clueType: 'blueprint', revealText: 'A technical map showing the original drainage design. The system was built for half the current water load. Any fix must account for increased capacity.' },
    // IRRELEVANT (5)
    { id: 'bp_lamp', name: 'Rusty lamp post', x: 90, y: 35, relevant: false, revealText: 'A decorative lamp, rusted but functional.', teachingText: 'Cosmetic issue \u2014 not connected to algae. In real planning, fixating on aesthetics while infrastructure fails is the most common mistake.', teachingEffect: 'timer_loss', timerPenalty: 3 },
    { id: 'bp_ticket', name: 'Old ticket booth', x: 15, y: 20, relevant: false, revealText: 'An abandoned ticket booth from when boats were rented.', teachingText: 'Revenue opportunity, not algae solution. Pursuing commercial interests during an ecological crisis diverts attention.', teachingEffect: 'distracted' },
    { id: 'bp_graffiti', name: 'Graffiti on wall', x: 45, y: 15, relevant: false, revealText: 'Spray-painted tags on the retaining wall.', teachingText: 'This is a symptom of neglect, not a cause. The graffiti appeared BECAUSE the area is abandoned.', teachingEffect: 'awareness_gain' },
    { id: 'bp_bench', name: 'Broken decorative bench', x: 75, y: 50, relevant: false, revealText: 'A bench with one broken slat.', teachingText: 'Aesthetic damage. Valid concern for long-term restoration but not the crisis priority.', teachingEffect: 'turn_consumed' },
    { id: 'bp_rules', name: 'Faded park rules sign', x: 55, y: 85, relevant: false, revealText: 'Park rules: No swimming, no littering, no feeding birds.', teachingText: 'Reading the rules while the pond dies. Sometimes governance focuses on process over outcome.', teachingEffect: 'bureaucratic' },
  ],
  // For other zones, generate a default set
};

export function getHiddenObjectsForZone(zoneId: string): HiddenObject[] {
  if (ZONE_HIDDEN_OBJECTS[zoneId]) return ZONE_HIDDEN_OBJECTS[zoneId];
  // Generate default objects for unmapped zones
  return [
    { id: `${zoneId}_infra`, name: 'Damaged infrastructure', x: 30, y: 60, relevant: true, clueType: 'consequence', revealText: 'Critical infrastructure damage that will worsen if unaddressed.' },
    { id: `${zoneId}_people`, name: 'Community activity area', x: 60, y: 35, relevant: true, clueType: 'capability', revealText: 'A space where the community once gathered. Who can help restore it?' },
    { id: `${zoneId}_notice`, name: 'Official notice', x: 80, y: 25, relevant: true, clueType: 'outcome', revealText: 'Official documentation showing the resolution criteria and graduated outcomes.' },
    { id: `${zoneId}_supply`, name: 'Hidden supplies', x: 15, y: 50, relevant: true, clueType: 'resource', revealText: 'Forgotten supplies that can be put to use. +1 Material Token.' },
    { id: `${zoneId}_connect`, name: 'Connection point', x: 40, y: 80, relevant: true, clueType: 'connection', revealText: 'This zone connects to adjacent areas. Improvements here cascade to neighbors.' },
    { id: `${zoneId}_evidence`, name: 'Environmental evidence', x: 55, y: 45, relevant: true, clueType: 'evidence', revealText: 'Evidence of the root cause requiring both technical and community solutions.' },
    { id: `${zoneId}_plan`, name: 'Technical diagram', x: 70, y: 65, relevant: true, clueType: 'blueprint', revealText: 'Technical documentation revealing the original design intent.' },
    { id: `${zoneId}_decor`, name: 'Decorative element', x: 88, y: 30, relevant: false, revealText: 'Cosmetic feature, not connected to the core problem.', teachingText: 'Cosmetic issue \u2014 stay focused on the structural problem.', teachingEffect: 'timer_loss', timerPenalty: 2 },
    { id: `${zoneId}_commerce`, name: 'Commercial opportunity', x: 20, y: 20, relevant: false, revealText: 'A potential revenue source.', teachingText: 'Commercial interest \u2014 important but not the current priority.', teachingEffect: 'distracted' },
    { id: `${zoneId}_symptom`, name: 'Visible damage', x: 50, y: 15, relevant: false, revealText: 'Surface damage \u2014 a symptom, not the cause.', teachingText: 'This is a symptom of neglect, not a cause. Look deeper.', teachingEffect: 'awareness_gain' },
  ];
}

// ─── Resource Effectiveness Model ────────────────────────────────

export const RESOURCE_ABILITY_MAP: Record<ResourceType, string> = {
  budget: 'authority',
  knowledge: 'technicalKnowledge',
  volunteer: 'communityTrust',
  material: 'adaptability',
  influence: 'politicalLeverage',
};

export const MAX_ABILITY_SCORE = 20;

export function calculateEffectiveness(abilityScore: number): number {
  return Math.round((abilityScore / MAX_ABILITY_SCORE) * 100);
}

export function calculatePoints(tokens: number, effectivenessPercent: number): number {
  return Math.round(tokens * (effectivenessPercent / 100) * 5 * 10) / 10;
}

// Starting tokens per role (12 total each)
export const STARTING_TOKENS: Record<RoleId, Record<ResourceType, number>> = {
  administrator: { budget: 5, knowledge: 1, volunteer: 2, material: 2, influence: 2 },
  investor:      { budget: 5, knowledge: 1, volunteer: 1, material: 3, influence: 2 },
  designer:      { budget: 1, knowledge: 5, volunteer: 2, material: 3, influence: 1 },
  citizen:       { budget: 1, knowledge: 1, volunteer: 6, material: 2, influence: 2 },
  advocate:      { budget: 1, knowledge: 4, volunteer: 2, material: 2, influence: 3 },
};
