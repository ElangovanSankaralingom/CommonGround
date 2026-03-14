import { TradeCard } from '../models/types';

export const TRADE_CARDS: TradeCard[] = [
  // Resource Swap cards (4)
  {
    id: 'trade_swap_01',
    name: 'Budget-for-Volunteers Exchange',
    description: 'Trade budget tokens for volunteer tokens at a 1:2 ratio. Money can mobilize people.',
    type: 'resource_swap',
    effects: [
      { type: 'enable_swap', params: { give: 'budget', receive: 'volunteer', ratio: { give: 1, receive: 2 }, maxGive: 3 } },
    ],
    artworkId: 'art_trade_budget_vol',
  },
  {
    id: 'trade_swap_02',
    name: 'Knowledge-for-Influence Exchange',
    description: 'Trade knowledge tokens for influence tokens at a 1:1 ratio. Expertise opens doors.',
    type: 'resource_swap',
    effects: [
      { type: 'enable_swap', params: { give: 'knowledge', receive: 'influence', ratio: { give: 1, receive: 1 }, maxGive: 3 } },
    ],
    artworkId: 'art_trade_know_inf',
  },
  {
    id: 'trade_swap_03',
    name: 'Material-for-Budget Exchange',
    description: 'Trade surplus materials for budget tokens at a 2:1 ratio. Sell what you do not need.',
    type: 'resource_swap',
    effects: [
      { type: 'enable_swap', params: { give: 'material', receive: 'budget', ratio: { give: 2, receive: 1 }, maxGive: 4 } },
    ],
    artworkId: 'art_trade_mat_budget',
  },
  {
    id: 'trade_swap_04',
    name: 'Volunteer-for-Knowledge Exchange',
    description: 'Trade volunteer effort for knowledge tokens at a 2:1 ratio. Learning by doing.',
    type: 'resource_swap',
    effects: [
      { type: 'enable_swap', params: { give: 'volunteer', receive: 'knowledge', ratio: { give: 2, receive: 1 }, maxGive: 4 } },
    ],
    artworkId: 'art_trade_vol_know',
  },

  // Coalition Pact cards (4)
  {
    id: 'trade_coalition_01',
    name: 'Development Alliance',
    description: 'Form a temporary alliance between Administrator and Investor. Both gain +2 to series contributions for 2 rounds.',
    type: 'coalition_pact',
    effects: [
      { type: 'coalition_bonus', params: { roles: ['administrator', 'investor'], seriesBonus: 2, duration: 2, cpBonus: 1 } },
    ],
    artworkId: 'art_trade_dev_alliance',
  },
  {
    id: 'trade_coalition_02',
    name: 'Green Coalition',
    description: 'Form a temporary alliance between Designer and Advocate. Both gain +2 to ecological zone actions for 2 rounds.',
    type: 'coalition_pact',
    effects: [
      { type: 'coalition_bonus', params: { roles: ['designer', 'advocate'], ecoBonus: 2, duration: 2, cpBonus: 1 } },
    ],
    artworkId: 'art_trade_green_coalition',
  },
  {
    id: 'trade_coalition_03',
    name: 'People\'s Front',
    description: 'Form a temporary alliance between Citizen and Advocate. Both gain +2 to community trust checks for 2 rounds.',
    type: 'coalition_pact',
    effects: [
      { type: 'coalition_bonus', params: { roles: ['citizen', 'advocate'], abilityBonus: { communityTrust: 2 }, duration: 2, cpBonus: 1 } },
    ],
    artworkId: 'art_trade_peoples_front',
  },
  {
    id: 'trade_coalition_04',
    name: 'Public Works Pact',
    description: 'Form a temporary alliance between Administrator and Designer. Both gain +2 to construction-tagged actions for 2 rounds.',
    type: 'coalition_pact',
    effects: [
      { type: 'coalition_bonus', params: { roles: ['administrator', 'designer'], constructionBonus: 2, duration: 2, cpBonus: 1 } },
    ],
    artworkId: 'art_trade_public_works',
  },

  // Mediation Request cards (4)
  {
    id: 'trade_mediation_01',
    name: 'Facilitator Intervention',
    description: 'Request the facilitator to mediate a trade dispute. Both parties must agree to the facilitator\'s proposed terms.',
    type: 'mediation_request',
    effects: [
      { type: 'facilitator_mediate', params: { bindingDecision: true, cpReward: 1 } },
    ],
    artworkId: 'art_trade_facilitator',
  },
  {
    id: 'trade_mediation_02',
    name: 'Neutral Ground Meeting',
    description: 'Request a structured negotiation session. Both parties reveal their goals for the current round before trading.',
    type: 'mediation_request',
    effects: [
      { type: 'facilitator_mediate', params: { revealGoals: true, cpReward: 1, bindingDecision: false } },
    ],
    artworkId: 'art_trade_neutral_ground',
  },
  {
    id: 'trade_mediation_03',
    name: 'Arbitration Panel',
    description: 'Convene a 3-player arbitration panel to resolve a resource dispute. The majority ruling is binding.',
    type: 'mediation_request',
    effects: [
      { type: 'facilitator_mediate', params: { panelSize: 3, bindingDecision: true, cpReward: 2 } },
    ],
    artworkId: 'art_trade_arbitration',
  },
  {
    id: 'trade_mediation_04',
    name: 'Good Faith Gesture',
    description: 'Offer a small resource gift to another player to initiate dialogue. Recipient must respond with a trade offer.',
    type: 'mediation_request',
    effects: [
      { type: 'facilitator_mediate', params: { giftAmount: 1, requiresResponse: true, cpReward: 1 } },
    ],
    artworkId: 'art_trade_good_faith',
  },

  // Compromise cards (4)
  {
    id: 'trade_compromise_01',
    name: 'Split the Difference',
    description: 'When a trade negotiation stalls, automatically split the contested resources equally between both parties.',
    type: 'compromise',
    effects: [
      { type: 'auto_agree', params: { method: 'split_equal', cpBonus: 1 } },
    ],
    artworkId: 'art_trade_split',
  },
  {
    id: 'trade_compromise_02',
    name: 'Delayed Payment Plan',
    description: 'Accept a trade now with payment deferred to next round. Trust-based trade that rewards both parties if honored.',
    type: 'compromise',
    effects: [
      { type: 'auto_agree', params: { method: 'deferred_payment', delayRounds: 1, cpBonus: 2, penaltyForDefault: 3 } },
    ],
    artworkId: 'art_trade_deferred',
  },
  {
    id: 'trade_compromise_03',
    name: 'Package Deal',
    description: 'Bundle multiple resource types into a single trade. Both parties must trade at least 2 different resource types.',
    type: 'compromise',
    effects: [
      { type: 'auto_agree', params: { method: 'package_deal', minResourceTypes: 2, cpBonus: 1 } },
    ],
    artworkId: 'art_trade_package',
  },
  {
    id: 'trade_compromise_04',
    name: 'Conditional Agreement',
    description: 'Agree to a trade that only executes if a specific condition is met by end of round (e.g., a challenge is resolved).',
    type: 'compromise',
    effects: [
      { type: 'auto_agree', params: { method: 'conditional', requiresCondition: true, cpBonus: 2 } },
    ],
    artworkId: 'art_trade_conditional',
  },
];
