/**
 * Character Creation Questionnaire — 12 questions that compute character sheet values.
 *
 * Design principle: Role defines ARCHETYPE + CONSTRAINTS (fixed total ability score),
 * but player answers REDISTRIBUTE points within that total.
 * Welfare weights, S-fixed/Environment, survival thresholds, Büchi objectives are NEVER modified.
 */

import type { AbilityScores, RoleId, SkillId } from '../models/types';
import { OBJECTIVE_WEIGHTS, type ObjectiveId } from '../models/constants';

// ─── Role Total Ability Scores (FIXED — from spec Part 2.1) ──
export const ROLE_TOTALS: Record<RoleId, number> = {
  administrator: 72,
  investor: 68,
  designer: 70,
  citizen: 58,
  advocate: 68,
};

// ─── Role Default Ability Scores (from spec Part 2.1) ────────
export const ROLE_DEFAULT_ABILITIES: Record<RoleId, AbilityScores> = {
  administrator: { authority: 16, resourcefulness: 12, communityTrust: 10, technicalKnowledge: 10, politicalLeverage: 14, adaptability: 10 },
  investor:      { authority: 10, resourcefulness: 16, communityTrust: 8,  technicalKnowledge: 12, politicalLeverage: 10, adaptability: 12 },
  designer:      { authority: 8,  resourcefulness: 10, communityTrust: 12, technicalKnowledge: 16, politicalLeverage: 10, adaptability: 14 },
  citizen:       { authority: 6,  resourcefulness: 8,  communityTrust: 16, technicalKnowledge: 8,  politicalLeverage: 8,  adaptability: 12 },
  advocate:      { authority: 8,  resourcefulness: 10, communityTrust: 14, technicalKnowledge: 12, politicalLeverage: 12, adaptability: 12 },
};

// ─── Types ───────────────────────────────────────────────────

type AbilityId = keyof AbilityScores;

export interface QuestionAnswer {
  id: string;
  text: string;
  abilityDeltas: Partial<Record<AbilityId, number>>;
  objectiveDeltas?: Partial<Record<ObjectiveId, number>>;
  skillTags?: SkillId[];
  behavioralTag?: { key: string; value: string };
}

export interface Question {
  id: string;
  category: 'ability' | 'objective' | 'proficiency' | 'behavioral';
  text: string;
  context?: string;
  answers: [QuestionAnswer, QuestionAnswer, QuestionAnswer, QuestionAnswer];
}

export interface BehavioralProfile {
  sfixedVsEnvironment: 'sfixed_lean' | 'environment_lean' | 'balanced';
  coalitionStyle: 'leader' | 'mediator' | 'specialist' | 'innovator';
  riskTolerance: 'high' | 'low' | 'moderate' | 'strategic';
}

export interface CharacterCreationResult {
  finalAbilities: AbilityScores;
  abilityDeltas: Record<AbilityId, number>;
  finalObjectiveWeights: Record<ObjectiveId, number>;
  objectiveWeightDeltas: Record<ObjectiveId, number>;
  selectedProficiencies: SkillId[];
  behavioralProfile: BehavioralProfile;
  answers: { questionId: string; answerId: string; answerText: string }[];
  totalScoreVerification: { roleTarget: number; actual: number; valid: boolean };
}

// ─── Question Bank (all 12 questions) ────────────────────────

export const QUESTION_BANK: Question[] = [
  // Q1 — Authority vs Community Trust
  {
    id: 'q1',
    category: 'ability',
    text: 'A public park in your neighborhood is falling apart. The municipal corporation has a plan to fix it, but it doesn\'t include what residents actually want. What do you do?',
    context: 'This reveals your instinct toward authority vs community trust.',
    answers: [
      { id: 'q1a', text: 'Support the corporation\'s plan — they have the expertise and budget to act fast.', abilityDeltas: { authority: 2, communityTrust: -2 } },
      { id: 'q1b', text: 'Organize a residents\' meeting to draft an alternative proposal.', abilityDeltas: { communityTrust: 2, authority: -2 } },
      { id: 'q1c', text: 'Try to get a seat on the planning committee to influence from inside.', abilityDeltas: { politicalLeverage: 1, authority: 1, communityTrust: -1, adaptability: -1 } },
      { id: 'q1d', text: 'Gather data on what residents actually need and present it publicly.', abilityDeltas: { technicalKnowledge: 1, communityTrust: 1, authority: -1, politicalLeverage: -1 } },
    ],
  },
  // Q2 — Resourcefulness vs Technical Knowledge
  {
    id: 'q2',
    category: 'ability',
    text: 'You\'re given \u20B95 lakhs to improve one aspect of a neglected park. How do you spend it?',
    context: 'This reveals whether you value speed/pragmatism or expertise/planning.',
    answers: [
      { id: 'q2a', text: 'Hire the best contractor and get the most critical repair done fast.', abilityDeltas: { resourcefulness: 2, technicalKnowledge: -2 } },
      { id: 'q2b', text: 'Commission a professional landscape study first, then spend what\'s left on implementation.', abilityDeltas: { technicalKnowledge: 2, resourcefulness: -2 } },
      { id: 'q2c', text: 'Split it: some on quick fixes that people see immediately, rest on a long-term plan.', abilityDeltas: { adaptability: 2, resourcefulness: -1, technicalKnowledge: -1 } },
      { id: 'q2d', text: 'Use it as seed funding to attract matching grants and corporate sponsorship.', abilityDeltas: { resourcefulness: 1, politicalLeverage: 1, technicalKnowledge: -1, adaptability: -1 } },
    ],
  },
  // Q3 — Political Leverage vs Adaptability
  {
    id: 'q3',
    category: 'ability',
    text: 'A powerful local politician wants to build a commercial complex inside the park. You disagree. What\'s your move?',
    context: 'This reveals whether you fight with power or adapt around it.',
    answers: [
      { id: 'q3a', text: 'Build a coalition with other politicians who oppose it. Fight power with power.', abilityDeltas: { politicalLeverage: 2, adaptability: -2 } },
      { id: 'q3b', text: 'Adapt — propose an alternative that gives the politician a visible win while protecting the park.', abilityDeltas: { adaptability: 2, politicalLeverage: -2 } },
      { id: 'q3c', text: 'Mobilize the community to protest. Public pressure overrides political deals.', abilityDeltas: { communityTrust: 1, adaptability: 1, politicalLeverage: -1, resourcefulness: -1 } },
      { id: 'q3d', text: 'Present a technical counter-proposal showing the commercial complex will fail financially.', abilityDeltas: { technicalKnowledge: 1, politicalLeverage: 1, adaptability: -1, communityTrust: -1 } },
    ],
  },
  // Q4 — Safety vs Revenue
  {
    id: 'q4',
    category: 'objective',
    text: 'The park\'s children\'s playground is dangerous (rusty equipment), but the food court generates the park\'s only revenue. You can only fix one this month. Which one?',
    context: 'This reveals your priority between safety and revenue.',
    answers: [
      { id: 'q4a', text: 'Fix the playground immediately — children\'s safety is non-negotiable.', abilityDeltas: {}, objectiveDeltas: { safety: 1, revenue: -1 } },
      { id: 'q4b', text: 'Fix the food court — without revenue, nothing gets maintained long-term.', abilityDeltas: {}, objectiveDeltas: { revenue: 1, safety: -1 } },
      { id: 'q4c', text: 'Temporarily close both and fundraise for fixing both properly.', abilityDeltas: {}, objectiveDeltas: { community: 1, revenue: -1 } },
      { id: 'q4d', text: 'Quick-patch the playground (minimum safety) and invest in the food court.', abilityDeltas: {}, objectiveDeltas: { revenue: 1, greenery: -1 } },
    ],
  },
  // Q5 — Greenery vs Access
  {
    id: 'q5',
    category: 'objective',
    text: 'The park\'s herbal garden (124 rare species) is thriving, but it blocks the most direct walking path for elderly visitors. What do you prioritize?',
    context: 'This reveals your priority between ecology and accessibility.',
    answers: [
      { id: 'q5a', text: 'Protect the garden at all costs — biodiversity is irreplaceable.', abilityDeltas: {}, objectiveDeltas: { greenery: 1, access: -1 } },
      { id: 'q5b', text: 'Redesign the path to go around the garden, even if it costs more.', abilityDeltas: {}, objectiveDeltas: { access: 1, revenue: -1 } },
      { id: 'q5c', text: 'Create a guided nature walk through the garden — it becomes both access AND greenery.', abilityDeltas: {}, objectiveDeltas: { greenery: 1, access: 1, revenue: -1, culture: -1 } },
      { id: 'q5d', text: 'Trim the garden to open the path — some plants can be relocated.', abilityDeltas: {}, objectiveDeltas: { access: 1, greenery: -1 } },
    ],
  },
  // Q6 — Culture vs Community
  {
    id: 'q6',
    category: 'objective',
    text: 'A beautiful iron sculpture in the park is being used as a meeting point by study groups who sometimes leave litter. What matters more?',
    context: 'This reveals your priority between cultural preservation and community use.',
    answers: [
      { id: 'q6a', text: 'Preserve the sculpture\'s dignity — install benches elsewhere for study groups.', abilityDeltas: {}, objectiveDeltas: { culture: 1, community: -1 } },
      { id: 'q6b', text: 'The sculpture is a meeting place now — that IS its cultural value. Add a trash bin.', abilityDeltas: {}, objectiveDeltas: { community: 1, culture: -1 } },
      { id: 'q6c', text: 'Turn the area into a formal community-art space with scheduled events.', abilityDeltas: {}, objectiveDeltas: { culture: 1, community: 1, safety: -1, revenue: -1 } },
      { id: 'q6d', text: 'Let the community decide — it\'s their park.', abilityDeltas: {}, objectiveDeltas: { community: 1, access: -1 } },
    ],
  },
  // Q7 — Proficiency: Negotiation vs Regulation
  {
    id: 'q7',
    category: 'proficiency',
    text: 'Two vendors are fighting over the best spot near the park entrance. Both have been there for years. How do you resolve it?',
    context: 'This reveals your approach to conflict resolution.',
    answers: [
      { id: 'q7a', text: 'Sit them down and mediate — find a schedule or space-sharing deal.', abilityDeltas: {}, skillTags: ['negotiation', 'publicSpeaking'] },
      { id: 'q7b', text: 'Check the municipal vendor licensing rules and enforce them strictly.', abilityDeltas: {}, skillTags: ['regulatoryNavigation', 'budgeting'] },
      { id: 'q7c', text: 'Ask the park visitors which vendor they prefer and let demand decide.', abilityDeltas: {}, skillTags: ['publicSpeaking', 'crisisManagement'] },
      { id: 'q7d', text: 'Redesign the entrance area so both can have good spots.', abilityDeltas: {}, skillTags: ['designThinking', 'environmentalAssessment'] },
    ],
  },
  // Q8 — Proficiency: Technical vs Social
  {
    id: 'q8',
    category: 'proficiency',
    text: 'The park\'s 110-foot fountain has been broken for 2 years. What\'s your first step to fix it?',
    context: 'This reveals whether you lead with technical solutions or social mobilization.',
    answers: [
      { id: 'q8a', text: 'Get an engineer to assess exactly what\'s broken and what it costs.', abilityDeltas: {}, skillTags: ['designThinking', 'environmentalAssessment'] },
      { id: 'q8b', text: 'Start a crowd-funding campaign — make the community own the restoration.', abilityDeltas: {}, skillTags: ['publicSpeaking', 'negotiation'] },
      { id: 'q8c', text: 'Write a proposal to the corporation with budget justification.', abilityDeltas: {}, skillTags: ['budgeting', 'regulatoryNavigation'] },
      { id: 'q8d', text: 'Form a task force with residents, engineers, and the corporation together.', abilityDeltas: {}, skillTags: ['coalitionBuilding', 'crisisManagement'] },
    ],
  },
  // Q9 — Proficiency: Crisis vs Coalition
  {
    id: 'q9',
    category: 'proficiency',
    text: 'Monsoon flooding has damaged three park zones simultaneously. Resources are limited. What do you do?',
    context: 'This reveals your crisis response style.',
    answers: [
      { id: 'q9a', text: 'Triage — identify the most critical damage and fix that first.', abilityDeltas: {}, skillTags: ['crisisManagement', 'designThinking'] },
      { id: 'q9b', text: 'Call an emergency meeting of all stakeholders to coordinate response.', abilityDeltas: {}, skillTags: ['coalitionBuilding', 'negotiation'] },
      { id: 'q9c', text: 'Assess the environmental damage before acting — rushing causes more harm.', abilityDeltas: {}, skillTags: ['environmentalAssessment', 'designThinking'] },
      { id: 'q9d', text: 'Get emergency municipal funds released — this is a crisis, not business as usual.', abilityDeltas: {}, skillTags: ['regulatoryNavigation', 'budgeting'] },
    ],
  },
  // Q10 — S-fixed vs Environment tendency
  {
    id: 'q10',
    category: 'behavioral',
    text: 'You\'ve been working on a park improvement project for 6 months. A new study shows your approach might harm local bird nesting. What do you do?',
    context: 'This reveals whether you lean toward institutional constraint or adaptive freedom.',
    answers: [
      { id: 'q10a', text: 'Pause immediately and redesign, even if it means starting over.', abilityDeltas: {}, behavioralTag: { key: 'sfixedVsEnvironment', value: 'environment_lean' } },
      { id: 'q10b', text: 'Continue as planned — the birds will adapt. The project serves more people.', abilityDeltas: {}, behavioralTag: { key: 'sfixedVsEnvironment', value: 'sfixed_lean' } },
      { id: 'q10c', text: 'Modify the timeline to work around nesting season, but don\'t redesign.', abilityDeltas: {}, behavioralTag: { key: 'sfixedVsEnvironment', value: 'balanced' } },
      { id: 'q10d', text: 'Bring in an ecologist to find a solution that serves both — delay if needed.', abilityDeltas: {}, behavioralTag: { key: 'sfixedVsEnvironment', value: 'environment_lean' } },
    ],
  },
  // Q11 — Coalition Style
  {
    id: 'q11',
    category: 'behavioral',
    text: 'In group projects, you naturally tend to...',
    context: 'This reveals your collaboration archetype.',
    answers: [
      { id: 'q11a', text: 'Take charge and assign tasks — someone needs to lead.', abilityDeltas: { politicalLeverage: 1, communityTrust: -1 }, behavioralTag: { key: 'coalitionStyle', value: 'leader' } },
      { id: 'q11b', text: 'Listen to everyone first, then suggest a plan that incorporates all views.', abilityDeltas: { communityTrust: 1, authority: -1 }, behavioralTag: { key: 'coalitionStyle', value: 'mediator' } },
      { id: 'q11c', text: 'Focus on your part and do it excellently — let others handle theirs.', abilityDeltas: { technicalKnowledge: 1, adaptability: -1 }, behavioralTag: { key: 'coalitionStyle', value: 'specialist' } },
      { id: 'q11d', text: 'Push for the most creative or unconventional approach.', abilityDeltas: { adaptability: 1, resourcefulness: -1 }, behavioralTag: { key: 'coalitionStyle', value: 'innovator' } },
    ],
  },
  // Q12 — Risk Tolerance
  {
    id: 'q12',
    category: 'behavioral',
    text: 'A \u20B950 lakh grant is available for park restoration, but the application deadline is tomorrow and you\'d need to submit an incomplete proposal. What do you do?',
    context: 'This reveals your risk appetite.',
    answers: [
      { id: 'q12a', text: 'Submit it — an imperfect application is better than no application.', abilityDeltas: { resourcefulness: 1, technicalKnowledge: -1 }, behavioralTag: { key: 'riskTolerance', value: 'high' } },
      { id: 'q12b', text: 'Don\'t submit — a rejected proposal is worse than no proposal.', abilityDeltas: { technicalKnowledge: 1, resourcefulness: -1 }, behavioralTag: { key: 'riskTolerance', value: 'low' } },
      { id: 'q12c', text: 'Submit a skeleton proposal with a note requesting an extension.', abilityDeltas: { adaptability: 1, politicalLeverage: -1 }, behavioralTag: { key: 'riskTolerance', value: 'moderate' } },
      { id: 'q12d', text: 'Call the grant officer directly and negotiate an extension before submitting.', abilityDeltas: { politicalLeverage: 1, adaptability: -1 }, behavioralTag: { key: 'riskTolerance', value: 'strategic' } },
    ],
  },
];

// ─── Scoring Algorithm ───────────────────────────────────────

const ABILITY_KEYS: AbilityId[] = ['authority', 'resourcefulness', 'communityTrust', 'technicalKnowledge', 'politicalLeverage', 'adaptability'];
const OBJECTIVE_KEYS: ObjectiveId[] = ['safety', 'greenery', 'access', 'culture', 'revenue', 'community'];
const ALL_SKILLS: SkillId[] = ['negotiation', 'budgeting', 'designThinking', 'publicSpeaking', 'regulatoryNavigation', 'environmentalAssessment', 'coalitionBuilding', 'crisisManagement'];

export function computeCharacterSheet(
  roleId: RoleId,
  selectedAnswers: { questionId: string; answerId: string }[]
): CharacterCreationResult {
  const baseAbilities = { ...ROLE_DEFAULT_ABILITIES[roleId] };
  const baseObjectiveWeights = { ...OBJECTIVE_WEIGHTS[roleId] };
  const targetTotal = ROLE_TOTALS[roleId];

  // Step 1: Start with role defaults
  const abilityDeltas: Record<AbilityId, number> = { authority: 0, resourcefulness: 0, communityTrust: 0, technicalKnowledge: 0, politicalLeverage: 0, adaptability: 0 };
  const objectiveDeltas: Record<ObjectiveId, number> = { safety: 0, greenery: 0, access: 0, culture: 0, revenue: 0, community: 0 };
  const skillTagCounts: Record<SkillId, number> = {} as any;
  for (const s of ALL_SKILLS) skillTagCounts[s] = 0;
  const behavioralTags: Record<string, string> = {};
  const answerLog: { questionId: string; answerId: string; answerText: string }[] = [];

  // Step 2: Apply answer modifiers
  for (const sel of selectedAnswers) {
    const question = QUESTION_BANK.find(q => q.id === sel.questionId);
    if (!question) continue;
    const answer = question.answers.find(a => a.id === sel.answerId);
    if (!answer) continue;

    answerLog.push({ questionId: sel.questionId, answerId: sel.answerId, answerText: answer.text });

    // Ability deltas
    for (const [key, val] of Object.entries(answer.abilityDeltas)) {
      abilityDeltas[key as AbilityId] += val as number;
    }

    // Objective deltas
    if (answer.objectiveDeltas) {
      for (const [key, val] of Object.entries(answer.objectiveDeltas)) {
        objectiveDeltas[key as ObjectiveId] += val as number;
      }
    }

    // Skill tags
    if (answer.skillTags) {
      for (const tag of answer.skillTags) {
        skillTagCounts[tag] = (skillTagCounts[tag] || 0) + 1;
      }
    }

    // Behavioral tags
    if (answer.behavioralTag) {
      behavioralTags[answer.behavioralTag.key] = answer.behavioralTag.value;
    }
  }

  // Step 3: Enforce total constraint
  let currentTotal = 0;
  for (const key of ABILITY_KEYS) {
    currentTotal += baseAbilities[key] + abilityDeltas[key];
  }
  const excess = currentTotal - targetTotal;
  if (excess !== 0) {
    // Find ability with largest absolute delta and adjust
    const sorted = ABILITY_KEYS
      .slice()
      .sort((a, b) => Math.abs(abilityDeltas[b]) - Math.abs(abilityDeltas[a]));
    abilityDeltas[sorted[0]] -= excess;
  }

  // Step 4: Enforce score bounds (4-20)
  for (const key of ABILITY_KEYS) {
    const finalVal = baseAbilities[key] + abilityDeltas[key];
    if (finalVal < 4) abilityDeltas[key] = 4 - baseAbilities[key];
    if (finalVal > 20) abilityDeltas[key] = 20 - baseAbilities[key];
  }
  // Re-check total after bounds
  let recheckedTotal = 0;
  for (const key of ABILITY_KEYS) {
    recheckedTotal += baseAbilities[key] + abilityDeltas[key];
  }
  if (recheckedTotal !== targetTotal) {
    const diff = recheckedTotal - targetTotal;
    // Distribute excess/deficit across abilities proportionally
    for (const key of ABILITY_KEYS) {
      const finalVal = baseAbilities[key] + abilityDeltas[key];
      if (diff > 0 && finalVal > 4) {
        const adj = Math.min(diff, finalVal - 4);
        abilityDeltas[key] -= adj;
        break;
      } else if (diff < 0 && finalVal < 20) {
        const adj = Math.min(-diff, 20 - finalVal);
        abilityDeltas[key] += adj;
        break;
      }
    }
  }

  // Build final abilities
  const finalAbilities: AbilityScores = { ...baseAbilities };
  for (const key of ABILITY_KEYS) {
    finalAbilities[key] = baseAbilities[key] + abilityDeltas[key];
  }

  // Step 6: Apply objective weight modifiers with constraints
  const finalObjectiveWeights: Record<ObjectiveId, number> = { ...baseObjectiveWeights };
  for (const key of OBJECTIVE_KEYS) {
    finalObjectiveWeights[key] = baseObjectiveWeights[key] + objectiveDeltas[key];
    // Constraints: all >= -1, all <= 6
    if (finalObjectiveWeights[key] < -1) {
      objectiveDeltas[key] = -1 - baseObjectiveWeights[key];
      finalObjectiveWeights[key] = -1;
    }
    if (finalObjectiveWeights[key] > 6) {
      objectiveDeltas[key] = 6 - baseObjectiveWeights[key];
      finalObjectiveWeights[key] = 6;
    }
  }
  // Investor's Community can go to -2 but never to 0 or positive
  if (roleId === 'investor') {
    if (finalObjectiveWeights.community > -1) {
      objectiveDeltas.community = -1 - baseObjectiveWeights.community;
      finalObjectiveWeights.community = -1;
    }
    if (finalObjectiveWeights.community < -2) {
      objectiveDeltas.community = -2 - baseObjectiveWeights.community;
      finalObjectiveWeights.community = -2;
    }
  }

  // Step 7: Determine proficiencies from Q7-Q9 skill tags
  const defaultProfs = getDefaultProficiencies(roleId);
  const sortedSkills = ALL_SKILLS
    .slice()
    .sort((a, b) => {
      const countDiff = (skillTagCounts[b] || 0) - (skillTagCounts[a] || 0);
      if (countDiff !== 0) return countDiff;
      // Tiebreaker: default proficiencies get priority
      const aDefault = defaultProfs.includes(a) ? 1 : 0;
      const bDefault = defaultProfs.includes(b) ? 1 : 0;
      return bDefault - aDefault;
    });
  const selectedProficiencies = sortedSkills.slice(0, 3);

  // Step 8: Behavioral profile
  const behavioralProfile: BehavioralProfile = {
    sfixedVsEnvironment: (behavioralTags.sfixedVsEnvironment as any) || 'balanced',
    coalitionStyle: (behavioralTags.coalitionStyle as any) || 'mediator',
    riskTolerance: (behavioralTags.riskTolerance as any) || 'moderate',
  };

  // Verification
  let actualTotal = 0;
  for (const key of ABILITY_KEYS) actualTotal += finalAbilities[key];

  return {
    finalAbilities,
    abilityDeltas,
    finalObjectiveWeights,
    objectiveWeightDeltas: objectiveDeltas,
    selectedProficiencies,
    behavioralProfile,
    answers: answerLog,
    totalScoreVerification: { roleTarget: targetTotal, actual: actualTotal, valid: actualTotal === targetTotal },
  };
}

function getDefaultProficiencies(roleId: RoleId): SkillId[] {
  const map: Record<RoleId, SkillId[]> = {
    administrator: ['negotiation', 'budgeting', 'regulatoryNavigation'],
    investor: ['budgeting', 'negotiation', 'regulatoryNavigation'],
    designer: ['designThinking', 'environmentalAssessment', 'publicSpeaking'],
    citizen: ['publicSpeaking', 'coalitionBuilding', 'crisisManagement'],
    advocate: ['environmentalAssessment', 'coalitionBuilding', 'publicSpeaking'],
  };
  return map[roleId] || [];
}

// ─── Randomize Helper ────────────────────────────────────────

/**
 * Generate a random character sheet by randomly selecting one of the 4 answers
 * for each of the 12 questions. Returns the same CharacterCreationResult as
 * the manual flow, but with a `randomized` flag for telemetry.
 */
export function randomizeCharacterSheet(roleId: RoleId): CharacterCreationResult & { randomized: true } {
  const randomAnswers = QUESTION_BANK.map(q => {
    const idx = Math.floor(Math.random() * q.answers.length);
    return { questionId: q.id, answerId: q.answers[idx].id };
  });

  const result = computeCharacterSheet(roleId, randomAnswers);
  return { ...result, randomized: true as const };
}
