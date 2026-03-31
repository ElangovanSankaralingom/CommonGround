/**
 * Event Card Deck — 12 cards for the Winds of Change phase.
 * 4 negative (drawn on roll 1-2), 4 neutral (roll 3-4), 4 positive (roll 5-6).
 * Each card is used ONCE per game session and moved to the discard pile.
 */

export interface EventCardEffect {
  type: 'zone_condition_drop' | 'zone_condition_up' | 'resource_loss' | 'player_resource_loss' | 'player_resource_gain' | 'objective_threat';
  zoneId?: string;
  roleId?: string;
  resourceType?: string;
  amount?: number;
  levels?: number;
  objective?: string;
  severity?: string;
}

export interface RippleEffect {
  zoneId: string;
  description: string;
  effectType: 'warning' | 'positive';
}

export interface WindsEventCard {
  id: string;
  type: 'negative' | 'neutral' | 'positive';
  name: string;
  description: string;
  affectedZone: string | null;
  effects: EventCardEffect[];
  rippleEffects: RippleEffect[];
  followUpMessage?: string;
  spatialLesson: string;
}

// ─── Zone ID map (short → full) ──────────────────────────────────
export const ZONE_NAMES: Record<string, string> = {
  Z1: 'Main Entrance', Z2: 'Fountain Plaza', Z3: 'Boating Pond',
  Z4: 'Playground', Z5: 'Walking Track', Z6: 'Herbal Garden',
  Z7: 'Open Lawn', Z8: 'Exercise Zone', Z9: 'Sculpture Garden',
  Z10: 'Vendor Hub', Z11: 'Restroom Block', Z12: 'Fiber-Optic Lane',
  Z13: 'PPP Zone', Z14: 'Maintenance Depot',
};

export const ZONE_ID_MAP: Record<string, string> = {
  Z1: 'main_entrance', Z2: 'fountain_plaza', Z3: 'boating_pond',
  Z4: 'playground', Z5: 'walking_track', Z6: 'herbal_garden',
  Z7: 'open_lawn', Z8: 'exercise_zone', Z9: 'sculpture_garden',
  Z10: 'vendor_hub', Z11: 'restroom_block', Z12: 'fiber_optic_lane',
  Z13: 'ppp_zone', Z14: 'maintenance_depot',
};

// ─── THE DECK: 12 EVENT CARDS ────────────────────────────────────

export const ALL_EVENT_CARDS: WindsEventCard[] = [
  // ── NEGATIVE (drawn on roll 1-2) ─────────────────────────────
  {
    id: 'neg_1',
    type: 'negative',
    name: 'Monsoon Flooding',
    description: 'Heavy rains overwhelm the drainage system. Boating Pond drainage completely blocked.',
    affectedZone: 'Z3',
    effects: [
      { type: 'zone_condition_drop', zoneId: 'Z3', levels: 1 },
      { type: 'resource_loss', zoneId: 'Z3', resourceType: 'material', amount: 2 },
    ],
    rippleEffects: [
      { zoneId: 'Z2', description: 'Fountain Plaza \u2014 shared drainage at risk', effectType: 'warning' },
      { zoneId: 'Z6', description: 'Herbal Garden \u2014 water supply reduced', effectType: 'warning' },
    ],
    spatialLesson: 'Monsoons affect every low-lying zone. Connected drainage means one blockage cascades.',
  },
  {
    id: 'neg_2',
    type: 'negative',
    name: 'Budget Freeze',
    description: 'State government freezes municipal discretionary spending. All administrators lose Budget.',
    affectedZone: null,
    effects: [
      { type: 'player_resource_loss', roleId: 'administrator', resourceType: 'budget', amount: 3 },
      { type: 'player_resource_loss', roleId: 'investor', resourceType: 'budget', amount: 2 },
    ],
    rippleEffects: [
      { zoneId: 'Z13', description: 'PPP Zone \u2014 funding pipeline stalled', effectType: 'warning' },
      { zoneId: 'Z14', description: 'Maintenance Depot \u2014 supply orders cancelled', effectType: 'warning' },
    ],
    spatialLesson: 'When government budgets freeze, maintenance is always the first casualty.',
  },
  {
    id: 'neg_3',
    type: 'negative',
    name: 'Vandalism Incident',
    description: 'Overnight vandalism damages playground equipment. Safety concerns escalate.',
    affectedZone: 'Z4',
    effects: [
      { type: 'zone_condition_drop', zoneId: 'Z4', levels: 1 },
      { type: 'objective_threat', objective: 'safety', severity: 'high' },
    ],
    rippleEffects: [
      { zoneId: 'Z5', description: 'Walking Track \u2014 families avoiding this section', effectType: 'warning' },
      { zoneId: 'Z8', description: 'Exercise Zone \u2014 reduced evening visitors', effectType: 'warning' },
    ],
    spatialLesson: 'Safety incidents in one zone drive people away from the entire surrounding area.',
  },
  {
    id: 'neg_4',
    type: 'negative',
    name: 'Vendor Encroachment',
    description: 'Unauthorized vendors expand into pedestrian pathways near the main entrance.',
    affectedZone: 'Z1',
    effects: [
      { type: 'zone_condition_drop', zoneId: 'Z1', levels: 1 },
      { type: 'objective_threat', objective: 'access', severity: 'medium' },
    ],
    rippleEffects: [
      { zoneId: 'Z2', description: 'Fountain Plaza \u2014 foot traffic blocked', effectType: 'warning' },
      { zoneId: 'Z10', description: 'Vendor Hub \u2014 competition and congestion', effectType: 'warning' },
    ],
    spatialLesson: 'Public space encroachment is a governance failure \u2014 it requires both enforcement and alternative provision.',
  },

  // ── NEUTRAL (shown on roll 3-4) ──────────────────────────────
  {
    id: 'neu_1', type: 'neutral',
    name: 'Quiet Season',
    description: 'A calm period. No external disruptions this season. Use the stability wisely.',
    affectedZone: null, effects: [], rippleEffects: [],
    spatialLesson: 'Stability is rare in urban governance. Smart planners use quiet periods to build, not rest.',
  },
  {
    id: 'neu_2', type: 'neutral',
    name: 'Local Festival',
    description: 'A neighborhood festival brings visitors to the park. No lasting impact, but the park feels alive today.',
    affectedZone: null, effects: [], rippleEffects: [],
    spatialLesson: 'Events remind communities what their parks could be \u2014 temporary joy that fuels permanent change.',
  },
  {
    id: 'neu_3', type: 'neutral',
    name: 'Media Visit',
    description: 'A local newspaper photographs the park. No immediate effect, but public attention is now on you.',
    affectedZone: null, effects: [], rippleEffects: [],
    spatialLesson: 'Public scrutiny creates accountability. Plans made under observation tend to be more equitable.',
  },
  {
    id: 'neu_4', type: 'neutral',
    name: 'Seasonal Transition',
    description: 'The weather shifts. Neither harm nor help \u2014 the park waits for human action.',
    affectedZone: null, effects: [], rippleEffects: [],
    spatialLesson: 'Nature is patient. The park will not fix itself, but it will wait for those who care.',
  },

  // ── POSITIVE (drawn on roll 5-6) ─────────────────────────────
  {
    id: 'pos_1',
    type: 'positive',
    name: 'Government Grant',
    description: 'State announces special park restoration grant. Administrator receives additional funding.',
    affectedZone: null,
    effects: [
      { type: 'player_resource_gain', roleId: 'administrator', resourceType: 'budget', amount: 3 },
      { type: 'player_resource_gain', roleId: 'administrator', resourceType: 'influence', amount: 1 },
    ],
    rippleEffects: [],
    followUpMessage: 'Resources alone cannot fix the park. You will need the Designer\u2019s expertise and the Citizen\u2019s volunteers to make this count.',
    spatialLesson: 'Grants create opportunity but not capacity. Money without expertise and labor produces nothing.',
  },
  {
    id: 'pos_2',
    type: 'positive',
    name: 'NGO Partnership',
    description: 'An environmental NGO offers to partner on park restoration. Advocate gains support.',
    affectedZone: null,
    effects: [
      { type: 'player_resource_gain', roleId: 'advocate', resourceType: 'knowledge', amount: 2 },
      { type: 'player_resource_gain', roleId: 'advocate', resourceType: 'influence', amount: 1 },
    ],
    rippleEffects: [],
    followUpMessage: 'External expertise strengthens your position \u2014 but the community must lead the implementation.',
    spatialLesson: 'NGO partnerships multiply capacity when they augment local knowledge rather than replace it.',
  },
  {
    id: 'pos_3',
    type: 'positive',
    name: 'Corporate CSR Initiative',
    description: 'A local business commits CSR funds to park improvement. Investor gains resources.',
    affectedZone: null,
    effects: [
      { type: 'player_resource_gain', roleId: 'investor', resourceType: 'budget', amount: 4 },
      { type: 'player_resource_gain', roleId: 'investor', resourceType: 'material', amount: 1 },
    ],
    rippleEffects: [],
    followUpMessage: 'Corporate funding comes with expectations. The community voice must shape how these resources are used.',
    spatialLesson: 'Private capital can accelerate restoration \u2014 but only if community needs guide the spending.',
  },
  {
    id: 'pos_4',
    type: 'positive',
    name: 'Volunteer Surge',
    description: 'A college student group offers weekend volunteer labor for park maintenance.',
    affectedZone: null,
    effects: [
      { type: 'player_resource_gain', roleId: 'citizen', resourceType: 'volunteer', amount: 3 },
      { type: 'zone_condition_up', zoneId: 'Z6', levels: 1 },
    ],
    rippleEffects: [
      { zoneId: 'Z6', description: 'Herbal Garden \u2014 students begin weekly maintenance', effectType: 'positive' },
    ],
    followUpMessage: 'Volunteer energy is powerful but temporary. Build systems that sustain the momentum.',
    spatialLesson: 'Youth engagement transforms maintenance from burden to community activity.',
  },
];
