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

// ─── Vision Board Feature Tiles (Phase 3 — rich tile data) ──────

export type ObjectiveId = 'safety' | 'greenery' | 'access' | 'culture' | 'revenue' | 'community';

export interface VisionFeatureTile {
  id: string;
  name: string;
  icon: string;
  description: string;
  resourceCost: Record<ResourceType, number>;
  objectivesServed: Record<ObjectiveId, number>;
  compatibleZones: string[];
  hybridsWith: string[];
}

export interface HybridTile {
  id: string;
  name: string;
  mergedFrom: [string, string];
  icon: string;
  description: string;
  resourceCost: Record<ResourceType, number>;
  savingsVsOriginal: Record<ResourceType, number>;
  objectivesServed: Record<ObjectiveId, number>;
}

export const FEATURE_TILES: VisionFeatureTile[] = [
  { id: 'drainage_system', name: 'Drainage System Repair', icon: 'plumbing',
    description: 'Clear and restore the blocked 450mm RCC drainage network.',
    resourceCost: { budget: 3, knowledge: 2, volunteer: 1, material: 3, influence: 1 },
    objectivesServed: { safety: 0.6, greenery: 0.8, access: 0.2, culture: 0, revenue: 0.3, community: 0.4 },
    compatibleZones: ['z3', 'z4', 'z5'], hybridsWith: ['water_filtration', 'irrigation_link'] },
  { id: 'water_filtration', name: 'Water Filtration Unit', icon: 'water_drop',
    description: 'Install biological filtration to restore water quality to bathing standard.',
    resourceCost: { budget: 2, knowledge: 3, volunteer: 0, material: 2, influence: 1 },
    objectivesServed: { safety: 0.7, greenery: 0.9, access: 0.3, culture: 0, revenue: 0.4, community: 0.5 },
    compatibleZones: ['z3', 'z2'], hybridsWith: ['drainage_system'] },
  { id: 'community_seating', name: 'Community Seating Area', icon: 'chair',
    description: 'Shaded benches and gathering space for residents and elderly visitors.',
    resourceCost: { budget: 1, knowledge: 0, volunteer: 2, material: 2, influence: 0 },
    objectivesServed: { safety: 0.2, greenery: 0.1, access: 0.7, culture: 0.4, revenue: 0.1, community: 0.9 },
    compatibleZones: ['z1', 'z2', 'z3', 'z5', 'z6'], hybridsWith: ['cafe_space'] },
  { id: 'cafe_space', name: 'Community Cafe Kiosk', icon: 'local_cafe',
    description: 'Small vendor space generating revenue while serving visitors.',
    resourceCost: { budget: 2, knowledge: 1, volunteer: 1, material: 2, influence: 2 },
    objectivesServed: { safety: 0.1, greenery: 0, access: 0.3, culture: 0.5, revenue: 0.9, community: 0.6 },
    compatibleZones: ['z1', 'z2', 'z3', 'z13'], hybridsWith: ['community_seating'] },
  { id: 'native_plants', name: 'Native Plant Restoration', icon: 'park',
    description: 'Replant indigenous species to restore biodiversity and reduce maintenance.',
    resourceCost: { budget: 1, knowledge: 2, volunteer: 3, material: 1, influence: 0 },
    objectivesServed: { safety: 0.1, greenery: 1.0, access: 0.2, culture: 0.3, revenue: 0.1, community: 0.4 },
    compatibleZones: ['z3', 'z4', 'z5', 'z6'], hybridsWith: ['ecological_buffer'] },
  { id: 'playground_equipment', name: 'Playground Equipment Overhaul', icon: 'sports_soccer',
    description: 'Replace rusted equipment with safe modern play structures.',
    resourceCost: { budget: 3, knowledge: 1, volunteer: 1, material: 3, influence: 1 },
    objectivesServed: { safety: 0.9, greenery: 0.1, access: 0.5, culture: 0.3, revenue: 0.2, community: 0.8 },
    compatibleZones: ['z6'], hybridsWith: ['safety_surfacing'] },
  { id: 'safety_surfacing', name: 'Impact-Absorbing Surface', icon: 'layers',
    description: 'Rubber safety flooring in fall zones around play equipment.',
    resourceCost: { budget: 2, knowledge: 1, volunteer: 1, material: 3, influence: 0 },
    objectivesServed: { safety: 1.0, greenery: 0, access: 0.3, culture: 0, revenue: 0, community: 0.5 },
    compatibleZones: ['z6'], hybridsWith: ['playground_equipment'] },
  { id: 'walking_path', name: 'Walking Path Restoration', icon: 'route',
    description: 'Repair cracked slabs, install root barriers, restore full width.',
    resourceCost: { budget: 2, knowledge: 1, volunteer: 2, material: 2, influence: 0 },
    objectivesServed: { safety: 0.6, greenery: 0.3, access: 0.9, culture: 0.2, revenue: 0.2, community: 0.7 },
    compatibleZones: ['z5', 'z1'], hybridsWith: ['path_lighting'] },
  { id: 'path_lighting', name: 'Solar Path Lighting', icon: 'light_mode',
    description: 'Replace 8 dead light poles with solar-powered units for evening safety.',
    resourceCost: { budget: 2, knowledge: 1, volunteer: 0, material: 2, influence: 1 },
    objectivesServed: { safety: 0.9, greenery: 0.1, access: 0.6, culture: 0.1, revenue: 0.3, community: 0.7 },
    compatibleZones: ['z5', 'z1', 'z3'], hybridsWith: ['walking_path'] },
  { id: 'signage_system', name: 'Wayfinding & Information Signage', icon: 'signpost',
    description: 'Distance markers, directional signs, and interpretive boards.',
    resourceCost: { budget: 1, knowledge: 1, volunteer: 1, material: 1, influence: 0 },
    objectivesServed: { safety: 0.3, greenery: 0.1, access: 0.6, culture: 0.5, revenue: 0.2, community: 0.4 },
    compatibleZones: ['z1', 'z2', 'z3', 'z5', 'z6', 'z13'], hybridsWith: [] },
  { id: 'waste_management', name: 'Waste Collection System', icon: 'delete',
    description: 'Segregated bins with scheduled collection and composting station.',
    resourceCost: { budget: 1, knowledge: 0, volunteer: 2, material: 1, influence: 1 },
    objectivesServed: { safety: 0.4, greenery: 0.5, access: 0.3, culture: 0.2, revenue: 0.1, community: 0.6 },
    compatibleZones: ['z1', 'z2', 'z3', 'z4', 'z5', 'z6'], hybridsWith: [] },
  { id: 'irrigation_link', name: 'Irrigation Network Extension', icon: 'water',
    description: 'Extend water supply from tanker point or restored Z3 junction to garden beds.',
    resourceCost: { budget: 1, knowledge: 2, volunteer: 1, material: 2, influence: 0 },
    objectivesServed: { safety: 0.1, greenery: 0.9, access: 0.1, culture: 0.1, revenue: 0.2, community: 0.5 },
    compatibleZones: ['z4', 'z3'], hybridsWith: ['drainage_system'] },
  { id: 'ecological_buffer', name: 'Ecological Buffer Zone', icon: 'forest',
    description: 'Natural barrier of native vegetation to protect pond from runoff.',
    resourceCost: { budget: 1, knowledge: 2, volunteer: 3, material: 1, influence: 1 },
    objectivesServed: { safety: 0.2, greenery: 1.0, access: 0.1, culture: 0.3, revenue: 0.1, community: 0.3 },
    compatibleZones: ['z3', 'z4'], hybridsWith: ['native_plants'] },
  { id: 'vendor_market', name: 'Organized Vendor Market', icon: 'store',
    description: 'Designated vendor area with infrastructure freeing up main pathways.',
    resourceCost: { budget: 2, knowledge: 1, volunteer: 2, material: 2, influence: 3 },
    objectivesServed: { safety: 0.3, greenery: 0, access: 0.8, culture: 0.5, revenue: 0.8, community: 0.7 },
    compatibleZones: ['z1', 'z13'], hybridsWith: ['cafe_space'] },
  { id: 'community_governance', name: 'Community Management Committee', icon: 'groups',
    description: 'Resident-led maintenance and oversight body with Corporation coordination.',
    resourceCost: { budget: 0, knowledge: 1, volunteer: 3, material: 0, influence: 2 },
    objectivesServed: { safety: 0.3, greenery: 0.3, access: 0.4, culture: 0.6, revenue: 0.3, community: 1.0 },
    compatibleZones: ['z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z13'], hybridsWith: [] },
  { id: 'fountain_repair', name: 'Fountain Motor Replacement', icon: 'water_drop',
    description: 'Replace burnt pump motor and resolve SPV-Corporation warranty deadlock.',
    resourceCost: { budget: 2, knowledge: 1, volunteer: 0, material: 2, influence: 3 },
    objectivesServed: { safety: 0.4, greenery: 0.5, access: 0.5, culture: 0.7, revenue: 0.4, community: 0.8 },
    compatibleZones: ['z2'], hybridsWith: [] },
  // ── New tiles (batch 2) ────────────────────────────────────────
  { id: 'solar_pump', name: 'Solar-Powered Water Pump', icon: 'solar_power',
    description: 'Off-grid pump for fountain and irrigation using rooftop solar panels.',
    resourceCost: { budget: 2, knowledge: 2, volunteer: 1, material: 3, influence: 0 },
    objectivesServed: { safety: 0.3, greenery: 0.7, access: 0.2, culture: 0.1, revenue: 0.2, community: 0.4 },
    compatibleZones: ['z2', 'z3', 'z4'], hybridsWith: ['fountain_repair', 'irrigation_link'] },
  { id: 'amphitheatre', name: 'Open-Air Amphitheatre', icon: 'theater_comedy',
    description: 'Tiered stone seating for cultural events, school programs, and community meetings.',
    resourceCost: { budget: 3, knowledge: 1, volunteer: 2, material: 3, influence: 1 },
    objectivesServed: { safety: 0.1, greenery: 0.1, access: 0.5, culture: 1.0, revenue: 0.5, community: 0.9 },
    compatibleZones: ['z2', 'z13'], hybridsWith: ['community_seating'] },
  { id: 'heritage_trail', name: 'Heritage Interpretation Trail', icon: 'museum',
    description: 'Marked walking route connecting historical and ecological points with QR code info boards.',
    resourceCost: { budget: 1, knowledge: 3, volunteer: 2, material: 1, influence: 0 },
    objectivesServed: { safety: 0.2, greenery: 0.3, access: 0.7, culture: 0.9, revenue: 0.4, community: 0.6 },
    compatibleZones: ['z1', 'z3', 'z5'], hybridsWith: ['signage_system', 'walking_path'] },
  { id: 'rainwater_harvest', name: 'Rainwater Harvesting System', icon: 'water_drop',
    description: 'Collection tanks at park buildings to supplement irrigation during dry months.',
    resourceCost: { budget: 2, knowledge: 2, volunteer: 1, material: 2, influence: 0 },
    objectivesServed: { safety: 0.1, greenery: 0.8, access: 0.1, culture: 0.2, revenue: 0.1, community: 0.3 },
    compatibleZones: ['z3', 'z4', 'z5'], hybridsWith: ['irrigation_link', 'drainage_system'] },
  { id: 'disability_access', name: 'Universal Accessibility Retrofit', icon: 'accessible',
    description: 'Ramps, tactile paths, and wheelchair-friendly surfaces across the zone.',
    resourceCost: { budget: 2, knowledge: 1, volunteer: 1, material: 3, influence: 2 },
    objectivesServed: { safety: 0.5, greenery: 0, access: 1.0, culture: 0.3, revenue: 0.2, community: 0.8 },
    compatibleZones: ['z1', 'z2', 'z5', 'z6'], hybridsWith: ['walking_path'] },
  { id: 'night_market', name: 'Weekend Night Market', icon: 'nightlife',
    description: 'Designated evening vendor zone with lighting and waste management built in.',
    resourceCost: { budget: 2, knowledge: 0, volunteer: 3, material: 2, influence: 3 },
    objectivesServed: { safety: 0.4, greenery: 0, access: 0.5, culture: 0.7, revenue: 1.0, community: 0.8 },
    compatibleZones: ['z1', 'z2', 'z13'], hybridsWith: ['vendor_market', 'cafe_space'] },
  { id: 'butterfly_garden', name: 'Butterfly & Pollinator Garden', icon: 'psychiatry',
    description: 'Native flowering plants attracting pollinators with educational signage.',
    resourceCost: { budget: 1, knowledge: 2, volunteer: 3, material: 1, influence: 0 },
    objectivesServed: { safety: 0.1, greenery: 1.0, access: 0.3, culture: 0.6, revenue: 0.3, community: 0.7 },
    compatibleZones: ['z3', 'z4', 'z5'], hybridsWith: ['native_plants', 'ecological_buffer'] },
  { id: 'smart_monitoring', name: 'IoT Environmental Monitoring', icon: 'sensors',
    description: 'Water quality sensors, footfall counters, and air quality monitors with public dashboard.',
    resourceCost: { budget: 2, knowledge: 3, volunteer: 0, material: 2, influence: 1 },
    objectivesServed: { safety: 0.6, greenery: 0.4, access: 0.2, culture: 0.1, revenue: 0.3, community: 0.5 },
    compatibleZones: ['z2', 'z3', 'z4', 'z5'], hybridsWith: ['water_filtration'] },
  { id: 'skill_workshop', name: 'Community Skill Workshop Space', icon: 'construction',
    description: 'Covered area for gardening workshops, repair cafes, and environmental education.',
    resourceCost: { budget: 2, knowledge: 1, volunteer: 3, material: 2, influence: 0 },
    objectivesServed: { safety: 0.1, greenery: 0.2, access: 0.4, culture: 0.8, revenue: 0.3, community: 1.0 },
    compatibleZones: ['z4', 'z6', 'z13'], hybridsWith: ['community_governance'] },
  { id: 'public_art', name: 'Community Mural & Art Installations', icon: 'palette',
    description: 'Local artist murals replacing graffiti with children art workshop component.',
    resourceCost: { budget: 1, knowledge: 0, volunteer: 3, material: 1, influence: 1 },
    objectivesServed: { safety: 0.2, greenery: 0.1, access: 0.3, culture: 1.0, revenue: 0.2, community: 0.9 },
    compatibleZones: ['z1', 'z2', 'z3', 'z6', 'z13'], hybridsWith: ['heritage_trail'] },
];

export const HYBRID_TILES: HybridTile[] = [
  // drainage(B3K2V1M3I1=10) + filtration(B2K3V0M2I1=8) = 18 → hybrid 14 saves 4 (22%)
  { id: 'integrated_drainage_hybrid', name: 'Integrated Drainage & Filtration', mergedFrom: ['drainage_system', 'water_filtration'], icon: 'water_drop',
    description: 'Combined drainage clearance with inline biological filtration system.',
    resourceCost: { budget: 4, knowledge: 4, volunteer: 1, material: 4, influence: 1 },
    savingsVsOriginal: { budget: 1, knowledge: 1, volunteer: 0, material: 1, influence: 1 },
    objectivesServed: { safety: 0.8, greenery: 0.9, access: 0.3, culture: 0, revenue: 0.4, community: 0.5 } },
  // seating(B1K0V2M2I0=5) + cafe(B2K1V1M2I2=8) = 13 → hybrid 10 saves 3 (23%)
  { id: 'community_cafe_hybrid', name: 'Community Cafe with Public Seating', mergedFrom: ['community_seating', 'cafe_space'], icon: 'deck',
    description: 'Combined social space with subsidized food service and shaded gathering area.',
    resourceCost: { budget: 2, knowledge: 1, volunteer: 2, material: 3, influence: 2 },
    savingsVsOriginal: { budget: 1, knowledge: 0, volunteer: 1, material: 1, influence: 0 },
    objectivesServed: { safety: 0.2, greenery: 0.1, access: 0.6, culture: 0.5, revenue: 0.7, community: 0.9 } },
  // playground(B3K1V1M3I1=9) + surfacing(B2K1V1M3I0=7) = 16 → hybrid 13 saves 3 (19%)
  { id: 'safe_playground_hybrid', name: 'Complete Playground Safety Package', mergedFrom: ['playground_equipment', 'safety_surfacing'], icon: 'child_care',
    description: 'New equipment with integrated safety surfacing — single contractor, lower cost.',
    resourceCost: { budget: 4, knowledge: 1, volunteer: 1, material: 5, influence: 1 },
    savingsVsOriginal: { budget: 1, knowledge: 1, volunteer: 1, material: 1, influence: 0 },
    objectivesServed: { safety: 1.0, greenery: 0.1, access: 0.5, culture: 0.3, revenue: 0.2, community: 0.8 } },
  // walking(B2K1V2M2I0=7) + lighting(B2K1V0M2I1=6) = 13 → hybrid 10 saves 3 (23%)
  { id: 'lit_walking_path_hybrid', name: 'Illuminated Walking Track', mergedFrom: ['walking_path', 'path_lighting'], icon: 'directions_walk',
    description: 'Repaired path with integrated solar lighting — shared trenching saves cost.',
    resourceCost: { budget: 3, knowledge: 1, volunteer: 2, material: 3, influence: 1 },
    savingsVsOriginal: { budget: 1, knowledge: 1, volunteer: 0, material: 1, influence: 0 },
    objectivesServed: { safety: 0.8, greenery: 0.3, access: 0.9, culture: 0.2, revenue: 0.3, community: 0.8 } },
  // native(B1K2V3M1I0=7) + buffer(B1K2V3M1I1=8) = 15 → hybrid 12 saves 3 (20%)
  { id: 'green_restoration_hybrid', name: 'Ecological Restoration Package', mergedFrom: ['native_plants', 'ecological_buffer'], icon: 'nature',
    description: 'Combined native planting with buffer zone — single nursery order, volunteer planting day.',
    resourceCost: { budget: 1, knowledge: 3, volunteer: 5, material: 1, influence: 1 },
    savingsVsOriginal: { budget: 1, knowledge: 1, volunteer: 1, material: 1, influence: 0 },
    objectivesServed: { safety: 0.2, greenery: 1.0, access: 0.2, culture: 0.3, revenue: 0.1, community: 0.4 } },
  // heritage(B1K3V2M1I0=7) + walking(B2K1V2M2I0=7) = 14 → hybrid 11 saves 3 (21%)
  { id: 'heritage_walk_hybrid', name: 'Heritage Walking Circuit', mergedFrom: ['heritage_trail', 'walking_path'], icon: 'directions_walk',
    description: 'Restored heritage path with interpretive boards — shared construction, unified design.',
    resourceCost: { budget: 2, knowledge: 3, volunteer: 3, material: 2, influence: 0 },
    savingsVsOriginal: { budget: 1, knowledge: 1, volunteer: 1, material: 1, influence: 0 },
    objectivesServed: { safety: 0.5, greenery: 0.3, access: 0.9, culture: 0.9, revenue: 0.3, community: 0.7 } },
  // night(B2K0V3M2I3=10) + cafe(B2K1V1M2I2=8) = 18 → hybrid 14 saves 4 (22%)
  { id: 'night_cafe_hybrid', name: 'Evening Food Court', mergedFrom: ['night_market', 'cafe_space'], icon: 'local_cafe',
    description: 'Combined permanent kiosk with weekend evening market — shared infrastructure and waste management.',
    resourceCost: { budget: 3, knowledge: 1, volunteer: 3, material: 3, influence: 4 },
    savingsVsOriginal: { budget: 1, knowledge: 0, volunteer: 1, material: 1, influence: 1 },
    objectivesServed: { safety: 0.3, greenery: 0, access: 0.4, culture: 0.6, revenue: 1.0, community: 0.8 } },
  // butterfly(B1K2V3M1I0=7) + workshop(B2K1V3M2I0=8) = 15 → hybrid 12 saves 3 (20%)
  { id: 'eco_learn_hybrid', name: 'Eco-Learning Center', mergedFrom: ['butterfly_garden', 'skill_workshop'], icon: 'nature',
    description: 'Pollinator garden with adjoining workshop space — nature classroom for schools and community.',
    resourceCost: { budget: 2, knowledge: 2, volunteer: 5, material: 2, influence: 0 },
    savingsVsOriginal: { budget: 1, knowledge: 1, volunteer: 1, material: 1, influence: 0 },
    objectivesServed: { safety: 0.1, greenery: 0.8, access: 0.4, culture: 0.8, revenue: 0.3, community: 0.9 } },
  // monitoring(B2K3V0M2I1=8) + filtration(B2K3V0M2I1=8) = 16 → hybrid 13 saves 3 (19%)
  { id: 'smart_water_hybrid', name: 'Smart Water Management System', mergedFrom: ['smart_monitoring', 'water_filtration'], icon: 'water_drop',
    description: 'Integrated sensors with automated filtration — real-time quality data driving treatment cycles.',
    resourceCost: { budget: 3, knowledge: 5, volunteer: 0, material: 3, influence: 2 },
    savingsVsOriginal: { budget: 1, knowledge: 1, volunteer: 0, material: 1, influence: 0 },
    objectivesServed: { safety: 0.7, greenery: 0.7, access: 0.3, culture: 0.1, revenue: 0.4, community: 0.5 } },
  // access(B2K1V1M3I2=9) + walking(B2K1V2M2I0=7) = 16 → hybrid 13 saves 3 (19%)
  { id: 'access_path_hybrid', name: 'Universal Access Pathway', mergedFrom: ['disability_access', 'walking_path'], icon: 'accessible',
    description: 'Fully accessible walking track with ramps, tactile strips, and rest points — single contractor.',
    resourceCost: { budget: 3, knowledge: 1, volunteer: 2, material: 4, influence: 2 },
    savingsVsOriginal: { budget: 1, knowledge: 1, volunteer: 1, material: 1, influence: 0 },
    objectivesServed: { safety: 0.6, greenery: 0.2, access: 1.0, culture: 0.3, revenue: 0.2, community: 0.8 } },
];

/** Convert a VisionFeatureTile to the legacy FeatureTile format for downstream compatibility */
export function toFeatureTile(vt: VisionFeatureTile): FeatureTile {
  const objectives = (Object.entries(vt.objectivesServed) as [string, number][])
    .filter(([, w]) => w >= 0.3)
    .map(([k]) => k);
  return {
    id: vt.id, name: vt.name, icon: vt.icon, description: vt.description,
    cost: Object.fromEntries(Object.entries(vt.resourceCost).filter(([, v]) => v > 0)) as Partial<Record<ResourceType, number>>,
    objectivesServed: objectives,
    taskCategory: 'build',
  };
}

/** Get VisionFeatureTiles compatible with a given investigation zone */
export function getVisionTilesForZone(zoneId: string): VisionFeatureTile[] {
  return FEATURE_TILES.filter(t => t.compatibleZones.includes(zoneId));
}

// Starting tokens per role (12 total each)
export const STARTING_TOKENS: Record<RoleId, Record<ResourceType, number>> = {
  administrator: { budget: 5, knowledge: 1, volunteer: 2, material: 2, influence: 2 },
  investor:      { budget: 5, knowledge: 1, volunteer: 1, material: 3, influence: 2 },
  designer:      { budget: 1, knowledge: 5, volunteer: 2, material: 3, influence: 1 },
  citizen:       { budget: 1, knowledge: 1, volunteer: 6, material: 2, influence: 2 },
  advocate:      { budget: 1, knowledge: 4, volunteer: 2, material: 2, influence: 3 },
};
