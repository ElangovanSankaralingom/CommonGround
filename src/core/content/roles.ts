import { RoleDefinition, RoleId } from '../models/types';

export const ROLES: Record<RoleId, RoleDefinition> = {
  administrator: {
    id: 'administrator',
    name: 'The Administrator',
    subtitle: 'Municipal Authority',
    description: 'You hold the keys to regulatory power and public budgets, but you answer to the people and the political cycle.',
    realWorldAnalogue: 'Corporation Commissioner, Ward Councillor, Municipal Officer',
    color: '#C0392B',
    icon: '\u{1F3DB}\uFE0F',
    startingAbilities: { authority: 16, resourcefulness: 12, communityTrust: 10, technicalKnowledge: 10, politicalLeverage: 14, adaptability: 10 },
    startingResources: { budget: 8, influence: 4, volunteer: 0, material: 0, knowledge: 0 },
    proficientSkills: ['regulatoryNavigation', 'budgeting', 'coalitionBuilding'],
    uniqueAbility: { name: 'Regulatory Override', description: 'Instantly bypass one obstacle/requirement on a challenge. Difficulty threshold reduced by 5. Cost: -2 Political Leverage (permanent). All other players\' CTR toward Administrator decreases by 1 for 1 round.' },
    goals: {
      character: {
        description: 'Maintain approval ratings by delivering visible improvements',
        subGoals: [
          { id: 'adm_char_1', description: 'Improve at least 3 zones to Good condition', weight: 4, condition: { type: 'zones_improved', params: { count: 3, targetCondition: 'good' } }, satisfied: false },
          { id: 'adm_char_2', description: 'Complete a project in 3 or fewer rounds', weight: 3, condition: { type: 'custom', params: { check: 'fast_project_completion' } }, satisfied: false },
          { id: 'adm_char_3', description: 'Maintain positive relationship with Citizen (no utility gap > 5)', weight: 3, condition: { type: 'custom', params: { check: 'citizen_utility_gap', maxGap: 5 } }, satisfied: false },
        ],
        totalWeight: 10,
      },
      survival: {
        description: 'Preserve budget reserves above 3 Budget Tokens at all times',
        subGoals: [
          { id: 'adm_surv_1', description: 'Never drop below 3 Budget Tokens', weight: 5, condition: { type: 'resource_threshold', params: { resource: 'budget', minimum: 3 } }, satisfied: true },
        ],
        totalWeight: 5,
      },
      mission: {
        description: 'Contribute to raising the Shared Vision Score to the target',
        subGoals: [
          { id: 'adm_miss_1', description: 'Contribute to resolving at least 2 challenges', weight: 3, condition: { type: 'challenges_resolved', params: { minContributions: 2 } }, satisfied: false },
          { id: 'adm_miss_2', description: 'Ensure CWS reaches target', weight: 5, condition: { type: 'custom', params: { check: 'cws_target_met' } }, satisfied: false },
        ],
        totalWeight: 8,
      },
    },
    welfareWeight: 0.8,
  },

  designer: {
    id: 'designer',
    name: 'The Designer',
    subtitle: 'Architect / Urban Planner',
    description: 'You see possibilities others miss, but your visions depend on others for funding, approval, and implementation.',
    realWorldAnalogue: 'Landscape architect, urban planner, design consultant',
    color: '#2E86AB',
    icon: '\u{1F4D0}',
    startingAbilities: { authority: 8, resourcefulness: 10, communityTrust: 12, technicalKnowledge: 16, politicalLeverage: 10, adaptability: 14 },
    startingResources: { budget: 0, influence: 0, volunteer: 0, material: 3, knowledge: 5 },
    proficientSkills: ['designThinking', 'environmentalAssessment', 'crisisManagement'],
    uniqueAbility: { name: 'Visionary Blueprint', description: 'Present a comprehensive design. If accepted by majority vote (3/5), grants +3 CP to all who voted yes AND +5 to next series value targeting the zone. Cost: 2 Knowledge Tokens.' },
    goals: {
      character: {
        description: 'Get at least 60% of design proposals implemented',
        subGoals: [
          { id: 'des_char_1', description: 'Have at least 3 Design Proposal cards successfully played', weight: 4, condition: { type: 'custom', params: { check: 'design_proposals_implemented', min: 3 } }, satisfied: false },
          { id: 'des_char_2', description: 'Improve a zone from Critical to Good in a single game', weight: 3, condition: { type: 'custom', params: { check: 'full_zone_restoration' } }, satisfied: false },
          { id: 'des_char_3', description: 'Contribute Technical Knowledge to 3 different challenges', weight: 3, condition: { type: 'custom', params: { check: 'tkn_contributions', min: 3 } }, satisfied: false },
        ],
        totalWeight: 10,
      },
      survival: {
        description: 'Maintain professional credibility (never fail 2 ability checks in a row)',
        subGoals: [
          { id: 'des_surv_1', description: 'Avoid consecutive ability check failures', weight: 5, condition: { type: 'custom', params: { check: 'no_consecutive_failures' } }, satisfied: true },
        ],
        totalWeight: 5,
      },
      mission: {
        description: 'Contribute to the collective placemaking goal',
        subGoals: [
          { id: 'des_miss_1', description: 'Participate in at least 3 successful series', weight: 3, condition: { type: 'custom', params: { check: 'series_participations', min: 3 } }, satisfied: false },
          { id: 'des_miss_2', description: 'Ensure CWS reaches target', weight: 5, condition: { type: 'custom', params: { check: 'cws_target_met' } }, satisfied: false },
        ],
        totalWeight: 8,
      },
    },
    welfareWeight: 1.0,
  },

  citizen: {
    id: 'citizen',
    name: 'The Citizen',
    subtitle: 'Community Representative',
    description: 'You speak for the people who use this space every day. You lack formal power but carry the weight of community voice.',
    realWorldAnalogue: 'Resident association leader, daily park user, parent, elderly regular',
    color: '#27AE60',
    icon: '\u{1F3D8}\uFE0F',
    startingAbilities: { authority: 6, resourcefulness: 8, communityTrust: 16, technicalKnowledge: 8, politicalLeverage: 8, adaptability: 12 },
    startingResources: { budget: 0, influence: 0, volunteer: 6, material: 0, knowledge: 0 },
    proficientSkills: ['negotiation', 'publicSpeaking', 'crisisManagement'],
    uniqueAbility: { name: 'Community Rally', description: 'Adds +3 to any negotiation-related check or series value for the rest of this round. Generates 3 Volunteer Tokens immediately. Forces the current challenge to be discussed before any other action. Cost: 2 Volunteer Tokens.' },
    goals: {
      character: {
        description: 'Ensure community needs are prioritized',
        subGoals: [
          { id: 'cit_char_1', description: "Children's Playground reaches Good condition", weight: 4, condition: { type: 'zone_condition', params: { zoneId: 'playground', condition: 'good' } }, satisfied: false },
          { id: 'cit_char_2', description: 'Walking Track reaches Fair or better', weight: 3, condition: { type: 'zone_condition', params: { zoneId: 'walking_track', condition: 'fair' } }, satisfied: false },
          { id: 'cit_char_3', description: 'Initiate at least 2 trades that benefit another player', weight: 3, condition: { type: 'trades_completed', params: { minInitiated: 2 } }, satisfied: false },
        ],
        totalWeight: 10,
      },
      survival: {
        description: 'Maintain community engagement (Volunteer tokens never drop to 0)',
        subGoals: [
          { id: 'cit_surv_1', description: 'Always have at least 1 Volunteer Token', weight: 5, condition: { type: 'resource_threshold', params: { resource: 'volunteer', minimum: 1 } }, satisfied: true },
        ],
        totalWeight: 5,
      },
      mission: {
        description: 'Contribute to the collective placemaking goal',
        subGoals: [
          { id: 'cit_miss_1', description: 'Earn at least 8 Collaboration Points', weight: 3, condition: { type: 'cp_earned', params: { min: 8 } }, satisfied: false },
          { id: 'cit_miss_2', description: 'Ensure CWS reaches target', weight: 5, condition: { type: 'custom', params: { check: 'cws_target_met' } }, satisfied: false },
        ],
        totalWeight: 8,
      },
    },
    welfareWeight: 1.4,
  },

  investor: {
    id: 'investor',
    name: 'The Investor',
    subtitle: 'Private Sector / Developer',
    description: 'You bring capital and commercial acumen. Your resources are powerful, but your profit motive creates tension with public interest.',
    realWorldAnalogue: 'PPP contractor, local business owner, commercial developer, vendor',
    color: '#E67E22',
    icon: '\u{1F4BC}',
    startingAbilities: { authority: 10, resourcefulness: 16, communityTrust: 8, technicalKnowledge: 12, politicalLeverage: 10, adaptability: 12 },
    startingResources: { budget: 10, influence: 2, volunteer: 0, material: 2, knowledge: 0 },
    proficientSkills: ['budgeting', 'negotiation', 'coalitionBuilding'],
    uniqueAbility: { name: 'Capital Injection', description: 'Immediately funds any one project/challenge by providing up to 6 Budget Tokens from external source (newly created). A Revenue Token is placed on the funded zone; Investor collects 1 Budget Token from that zone each subsequent round.' },
    goals: {
      character: {
        description: 'Achieve a positive return on investment',
        subGoals: [
          { id: 'inv_char_1', description: 'Place at least 1 Revenue Token on the board', weight: 4, condition: { type: 'custom', params: { check: 'revenue_tokens_placed', min: 1 } }, satisfied: false },
          { id: 'inv_char_2', description: 'End the game with more Budget Tokens than starting amount (10)', weight: 3, condition: { type: 'resource_threshold', params: { resource: 'budget', minimum: 11 } }, satisfied: false },
          { id: 'inv_char_3', description: 'Successfully play a Commercial Proposal card', weight: 3, condition: { type: 'custom', params: { check: 'commercial_proposal_played' } }, satisfied: false },
        ],
        totalWeight: 10,
      },
      survival: {
        description: 'Maintain financial solvency (Budget never drops below 2)',
        subGoals: [
          { id: 'inv_surv_1', description: 'Never drop below 2 Budget Tokens', weight: 5, condition: { type: 'resource_threshold', params: { resource: 'budget', minimum: 2 } }, satisfied: true },
        ],
        totalWeight: 5,
      },
      mission: {
        description: 'Contribute to the collective placemaking goal',
        subGoals: [
          { id: 'inv_miss_1', description: 'Fund at least 2 challenge resolutions', weight: 3, condition: { type: 'custom', params: { check: 'challenges_funded', min: 2 } }, satisfied: false },
          { id: 'inv_miss_2', description: 'Ensure CWS reaches target', weight: 5, condition: { type: 'custom', params: { check: 'cws_target_met' } }, satisfied: false },
        ],
        totalWeight: 8,
      },
    },
    welfareWeight: 0.8,
  },

  advocate: {
    id: 'advocate',
    name: 'The Advocate',
    subtitle: 'NGO / Environmental / Social Activist',
    description: 'You champion sustainability and equity. You see what others overlook, but you must build alliances to create change.',
    realWorldAnalogue: 'Environmental NGO representative, social worker, heritage conservationist',
    color: '#8E44AD',
    icon: '\u{1F33F}',
    startingAbilities: { authority: 8, resourcefulness: 10, communityTrust: 14, technicalKnowledge: 12, politicalLeverage: 12, adaptability: 12 },
    startingResources: { budget: 0, influence: 2, volunteer: 0, material: 0, knowledge: 2 },
    proficientSkills: ['environmentalAssessment', 'publicSpeaking', 'coalitionBuilding'],
    uniqueAbility: { name: 'Media Spotlight', description: 'Forces an issue onto the agenda. The most-degraded zone (or chosen zone) becomes MANDATORY priority this round. All actions targeting this zone get +2 CWS bonus. Cost: 1 Influence Token.' },
    goals: {
      character: {
        description: 'Ensure environmental sustainability and social equity',
        subGoals: [
          { id: 'adv_char_1', description: 'Herbal Garden and Boating Pond both reach Fair or better', weight: 4, condition: { type: 'custom', params: { check: 'eco_zones_condition', zones: ['herbal_garden', 'boating_pond'], minCondition: 'fair' } }, satisfied: false },
          { id: 'adv_char_2', description: 'Block or modify at least 1 project that would harm ecology', weight: 3, condition: { type: 'custom', params: { check: 'eco_protection_actions', min: 1 } }, satisfied: false },
          { id: 'adv_char_3', description: 'Successfully apply for a grant (play Grant Application card, pass check)', weight: 3, condition: { type: 'custom', params: { check: 'grant_obtained' } }, satisfied: false },
        ],
        totalWeight: 10,
      },
      survival: {
        description: 'Maintain organizational credibility (Knowledge tokens never drop to 0)',
        subGoals: [
          { id: 'adv_surv_1', description: 'Always have at least 1 Knowledge Token', weight: 5, condition: { type: 'resource_threshold', params: { resource: 'knowledge', minimum: 1 } }, satisfied: true },
        ],
        totalWeight: 5,
      },
      mission: {
        description: 'Contribute to the collective placemaking goal',
        subGoals: [
          { id: 'adv_miss_1', description: 'Participate in at least 2 series/combinations', weight: 3, condition: { type: 'custom', params: { check: 'participation_count', min: 2 } }, satisfied: false },
          { id: 'adv_miss_2', description: 'Ensure CWS reaches target', weight: 5, condition: { type: 'custom', params: { check: 'cws_target_met' } }, satisfied: false },
        ],
        totalWeight: 8,
      },
    },
    welfareWeight: 1.2,
  },
};
