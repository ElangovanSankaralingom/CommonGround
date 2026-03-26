import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store';
import type {
  RoleId,
  RoleDefinition,
  GameConfig,
  AbilityScores,
  ResourcePool,
  SkillId,
  Zone,
} from '../../core/models/types';
import { SKILL_ABILITY_MAP } from '../../core/models/constants';
import { CharacterQuestionnaire } from '../components/CharacterQuestionnaire';
import { randomizeCharacterSheet, type CharacterCreationResult } from '../../core/engine/characterQuestionnaire';
import { ParkStory } from '../components/ParkStory';

// ── Role data ──────────────────────────────────────────────────

const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: 'administrator',
    name: 'City Administrator',
    subtitle: 'The Bureaucratic Backbone',
    description:
      'You oversee permits, budgets, and regulations. Your decisions shape what gets built and how resources are allocated across the park.',
    realWorldAnalogue: 'Municipal officer / City planner',
    color: '#C0392B',
    icon: '\u{1F3DB}',
    startingAbilities: { authority: 16, resourcefulness: 12, communityTrust: 10, technicalKnowledge: 10, politicalLeverage: 14, adaptability: 10 },
    startingResources: { budget: 8, influence: 4, volunteer: 0, material: 0, knowledge: 0 },
    proficientSkills: ['negotiation', 'budgeting', 'regulatoryNavigation'],
    uniqueAbility: { name: 'Executive Order', description: 'Once per season, bypass one resource requirement on a card play.' },
    goals: {
      character: { description: 'Maintain administrative control while balancing stakeholder demands', subGoals: [], totalWeight: 1 },
      survival: { description: 'Keep budget above 3 at all times', subGoals: [{ id: 'admin_surv_1', description: 'Budget >= 3', weight: 5, condition: { type: 'resource_threshold', params: { resource: 'budget', minimum: 3 } }, satisfied: true }], totalWeight: 5 },
      mission: { description: 'Improve all zones to fair or better condition', subGoals: [], totalWeight: 1 },
    },
    welfareWeight: 1.0,
  },
  {
    id: 'designer',
    name: 'Urban Designer',
    subtitle: 'The Creative Visionary',
    description:
      'You bring aesthetic vision and technical expertise to transform spaces. Your designs inspire the community and attract investment.',
    realWorldAnalogue: 'Landscape architect / Urban planner',
    color: '#2E86AB',
    icon: '\u{1F4D0}',
    startingAbilities: { authority: 8, resourcefulness: 10, communityTrust: 12, technicalKnowledge: 16, politicalLeverage: 10, adaptability: 14 },
    startingResources: { budget: 0, influence: 0, volunteer: 0, material: 3, knowledge: 5 },
    proficientSkills: ['designThinking', 'environmentalAssessment', 'publicSpeaking'],
    uniqueAbility: { name: 'Inspired Design', description: 'Once per season, double the progress markers placed on a zone this turn.' },
    goals: {
      character: { description: 'Create beautiful, functional spaces that serve all stakeholders', subGoals: [], totalWeight: 1 },
      survival: { description: 'Keep knowledge above 3 at all times', subGoals: [{ id: 'des_surv_1', description: 'Knowledge >= 3', weight: 5, condition: { type: 'resource_threshold', params: { resource: 'knowledge', minimum: 3 } }, satisfied: true }], totalWeight: 5 },
      mission: { description: 'Place progress markers in 3+ zones', subGoals: [], totalWeight: 1 },
    },
    welfareWeight: 1.0,
  },
  {
    id: 'citizen',
    name: 'Community Organizer',
    subtitle: 'The Voice of the People',
    description:
      'You rally volunteers, gather community input, and ensure that development serves the people who actually live near the park.',
    realWorldAnalogue: 'Neighborhood association leader / Activist',
    color: '#27AE60',
    icon: '\u{1F91D}',
    startingAbilities: { authority: 6, resourcefulness: 8, communityTrust: 16, technicalKnowledge: 8, politicalLeverage: 8, adaptability: 12 },
    startingResources: { budget: 0, influence: 0, volunteer: 6, material: 0, knowledge: 0 },
    proficientSkills: ['publicSpeaking', 'coalitionBuilding', 'crisisManagement'],
    uniqueAbility: { name: 'Rally the Community', description: 'Once per season, generate 3 volunteer tokens and distribute them freely.' },
    goals: {
      character: { description: 'Empower community voices in every decision', subGoals: [], totalWeight: 1 },
      survival: { description: 'Keep volunteer above 3 at all times', subGoals: [{ id: 'cit_surv_1', description: 'Volunteer >= 3', weight: 5, condition: { type: 'resource_threshold', params: { resource: 'volunteer', minimum: 3 } }, satisfied: true }], totalWeight: 5 },
      mission: { description: 'Complete 2+ trades with other players', subGoals: [], totalWeight: 1 },
    },
    welfareWeight: 1.0,
  },
  {
    id: 'investor',
    name: 'Private Investor',
    subtitle: 'The Financial Engine',
    description:
      'You bring capital and business acumen. Your investments can accelerate development, but you need returns to stay in the game.',
    realWorldAnalogue: 'Real estate developer / Business owner',
    color: '#E67E22',
    icon: '\u{1F4B0}',
    startingAbilities: { authority: 10, resourcefulness: 16, communityTrust: 8, technicalKnowledge: 12, politicalLeverage: 10, adaptability: 12 },
    startingResources: { budget: 10, influence: 2, volunteer: 0, material: 2, knowledge: 0 },
    proficientSkills: ['budgeting', 'negotiation', 'regulatoryNavigation'],
    uniqueAbility: { name: 'Capital Injection', description: 'Once per season, convert 4 budget into 2 of any other resource.' },
    goals: {
      character: { description: 'Maximize return on investment while contributing to community goals', subGoals: [], totalWeight: 1 },
      survival: { description: 'Keep budget above 5 at all times', subGoals: [{ id: 'inv_surv_1', description: 'Budget >= 5', weight: 5, condition: { type: 'resource_threshold', params: { resource: 'budget', minimum: 5 } }, satisfied: true }], totalWeight: 5 },
      mission: { description: 'Improve commercial zones', subGoals: [], totalWeight: 1 },
    },
    welfareWeight: 1.0,
  },
  {
    id: 'advocate',
    name: 'Environmental Advocate',
    subtitle: 'The Ecological Guardian',
    description:
      'You protect green spaces and biodiversity. Your expertise ensures the park remains ecologically viable for generations to come.',
    realWorldAnalogue: 'Environmental scientist / NGO representative',
    color: '#8E44AD',
    icon: '\u{1F33F}',
    startingAbilities: { authority: 8, resourcefulness: 10, communityTrust: 14, technicalKnowledge: 12, politicalLeverage: 12, adaptability: 12 },
    startingResources: { budget: 0, influence: 2, volunteer: 0, material: 0, knowledge: 2 },
    proficientSkills: ['environmentalAssessment', 'coalitionBuilding', 'publicSpeaking'],
    uniqueAbility: { name: 'Ecological Audit', description: 'Once per season, reveal hidden trigger tiles in adjacent zones.' },
    goals: {
      character: { description: 'Preserve ecological integrity against competing interests', subGoals: [], totalWeight: 1 },
      survival: { description: 'Keep knowledge above 3 at all times', subGoals: [{ id: 'adv_surv_1', description: 'Knowledge >= 3', weight: 5, condition: { type: 'resource_threshold', params: { resource: 'knowledge', minimum: 3 } }, satisfied: true }], totalWeight: 5 },
      mission: { description: 'Improve ecological zones to good', subGoals: [], totalWeight: 1 },
    },
    welfareWeight: 1.0,
  },
];

const ROLE_MAP = Object.fromEntries(ROLE_DEFINITIONS.map((r) => [r.id, r])) as Record<RoleId, RoleDefinition>;

const ALL_ROLES: RoleId[] = ['administrator', 'designer', 'citizen', 'investor', 'advocate'];

// Empathy mode: maps what they identify as → the OPPOSITE role they are assigned
const EMPATHY_OPPOSITE_MAP: Record<RoleId, RoleId> = {
  administrator: 'citizen',
  citizen: 'administrator',
  designer: 'advocate',
  advocate: 'designer',
  investor: 'citizen',
};

const EMPATHY_EXPLANATIONS: Partial<Record<RoleId, Partial<Record<RoleId, string>>>> = {
  administrator: {
    citizen: 'You identified as a government/admin professional, so you will play as The Community Organizer — to experience placemaking from the community perspective.',
  },
  citizen: {
    administrator: 'You identified as a community-oriented person, so you will play as The City Administrator — to experience the challenges of governance and bureaucracy.',
  },
  designer: {
    advocate: 'You identified as a design/creative professional, so you will play as The Environmental Advocate — to experience the tension between aesthetics and ecology.',
  },
  advocate: {
    designer: 'You identified as an environmentalist, so you will play as The Urban Designer — to balance ecological concerns with practical design.',
  },
  investor: {
    citizen: 'You identified as business-minded, so you will play as The Community Organizer — to experience how economic decisions affect ordinary people.',
  },
};

const EMPATHY_QUESTIONS = [
  {
    q: 'When visiting a neglected public park, what bothers you most?',
    options: [
      { label: 'Poor maintenance and lack of oversight', role: 'administrator' as RoleId },
      { label: 'Ugly, uninspiring design', role: 'designer' as RoleId },
      { label: 'Nobody from the community was consulted', role: 'citizen' as RoleId },
      { label: 'Wasted economic potential', role: 'investor' as RoleId },
      { label: 'Ecological damage and lost green space', role: 'advocate' as RoleId },
    ],
  },
  {
    q: 'If you had unlimited power, what would you fix first?',
    options: [
      { label: 'Streamline regulations and approvals', role: 'administrator' as RoleId },
      { label: 'Redesign the space for beauty and function', role: 'designer' as RoleId },
      { label: 'Organize community events and input sessions', role: 'citizen' as RoleId },
      { label: 'Attract businesses and create jobs', role: 'investor' as RoleId },
      { label: 'Restore natural habitats and plant trees', role: 'advocate' as RoleId },
    ],
  },
  {
    q: 'What defines a successful public space?',
    options: [
      { label: 'Well-managed with clear rules', role: 'administrator' as RoleId },
      { label: 'Beautiful and thoughtfully designed', role: 'designer' as RoleId },
      { label: 'Loved and used by the community', role: 'citizen' as RoleId },
      { label: 'Economically sustainable', role: 'investor' as RoleId },
      { label: 'Ecologically thriving', role: 'advocate' as RoleId },
    ],
  },
];

const ABILITY_LABELS: Record<keyof AbilityScores, string> = {
  authority: 'Authority',
  resourcefulness: 'Resourcefulness',
  communityTrust: 'Community Trust',
  technicalKnowledge: 'Technical Knowledge',
  politicalLeverage: 'Political Leverage',
  adaptability: 'Adaptability',
};

const RESOURCE_LABELS: Record<keyof ResourcePool, string> = {
  budget: 'Budget',
  influence: 'Influence',
  volunteer: 'Volunteer',
  material: 'Material',
  knowledge: 'Knowledge',
};

const RESOURCE_ICONS: Record<keyof ResourcePool, string> = {
  budget: '\u{1F4B0}',
  influence: '\u{1F451}',
  volunteer: '\u{1F465}',
  material: '\u{1F9F1}',
  knowledge: '\u{1F4DA}',
};

const ALL_SKILLS: SkillId[] = [
  'negotiation', 'budgeting', 'designThinking', 'publicSpeaking',
  'regulatoryNavigation', 'environmentalAssessment', 'coalitionBuilding', 'crisisManagement',
];

const SKILL_LABELS: Record<SkillId, string> = {
  negotiation: 'Negotiation',
  budgeting: 'Budgeting',
  designThinking: 'Design Thinking',
  publicSpeaking: 'Public Speaking',
  regulatoryNavigation: 'Regulatory Navigation',
  environmentalAssessment: 'Environmental Assessment',
  coalitionBuilding: 'Alliance Building',
  crisisManagement: 'Crisis Management',
};

// ── Component ──────────────────────────────────────────────────

const STEPS = [
  'The Park Story',
  'Role Discovery',
  'Character Shaping',
  'Mission Briefing',
  'Standee Placement',
  'Pre-Game Survey',
];

interface PlayerAssignment {
  name: string;
  roleId: RoleId | null;
  empathyIdentity: RoleId | null; // what they identified as (for explanation)
  empathyExplanation: string;
}

// Character customization per player
interface CharacterCustomization {
  abilities: AbilityScores;
  pointsUsed: number;
  selectedSkills: SkillId[];
  goalsAcknowledged: boolean;
  abilityRevealed: boolean;
  resourcesViewed: boolean;
  confirmed: boolean;
}

export default function SetupScreen() {
  const [step, setStep] = useState(0);

  // Step 0 state
  const [totalRounds, setTotalRounds] = useState(4);
  const [timerLength, setTimerLength] = useState<5 | 10>(5);
  const [facilitatorMode, setFacilitatorMode] = useState<'human' | 'ai'>('human');
  const [difficulty, setDifficulty] = useState(1);

  // Step 1 state
  const [assignmentMethod, setAssignmentMethod] = useState<'manual' | 'random' | 'empathy'>('manual');
  const [assignments, setAssignments] = useState<PlayerAssignment[]>(
    ALL_ROLES.map(() => ({ name: '', roleId: null, empathyIdentity: null, empathyExplanation: '' }))
  );
  const [empathyStep, setEmpathyStep] = useState(0);
  const [empathyAnswers, setEmpathyAnswers] = useState<RoleId[][]>(
    Array.from({ length: 5 }, () => [])
  );
  const [empathyPlayerIndex, setEmpathyPlayerIndex] = useState(0);
  const [empathyNames, setEmpathyNames] = useState<string[]>(Array(5).fill(''));
  const [empathyComplete, setEmpathyComplete] = useState(false);

  // Step 2 state — questionnaire-based character creation
  const [characterIndex, setCharacterIndex] = useState(0);
  const [characterResults, setCharacterResults] = useState<(CharacterCreationResult & { randomized?: boolean })[]>([]);
  const [randomizeAllProgress, setRandomizeAllProgress] = useState(-1); // -1 = not started, 0-4 = animating, 5 = done
  // Legacy compat
  const [characterCustomizations, setCharacterCustomizations] = useState<CharacterCustomization[]>([]);

  // Step 3 state — pre-built briefing
  const [briefingSegment, setBriefingSegment] = useState(0);
  const [typedText, setTypedText] = useState('');
  const typeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step 4 state
  const [placedStandees, setPlacedStandees] = useState<Record<number, string>>({});

  // Step 5 state — Pre-game survey (H4 baseline: power rankings)
  const [surveyPlayerIndex, setSurveyPlayerIndex] = useState(0);
  const [powerRankings, setPowerRankings] = useState<RoleId[][]>(Array.from({ length: 5 }, () => []));

  const { initializeGame, selectSite, assignRoles, completeFacilitatorBriefing, placeStandee, startGame, goBackSetup, returnToTitle, session } = useGameStore();

  // ── Derived data ──────────────────────────────────────────────

  const validAssignments = useMemo(() =>
    assignments.filter(
      (a): a is PlayerAssignment & { roleId: RoleId } => a.roleId !== null && a.name.trim() !== ''
    ),
    [assignments]
  );

  const currentCharRole = validAssignments[characterIndex]
    ? ROLE_MAP[validAssignments[characterIndex].roleId]
    : null;

  const currentCustomization = characterCustomizations[characterIndex] || null;

  const zones: Zone[] = session ? Object.values(session.board.zones) : [];

  // Initialize character customizations when entering step 2
  useEffect(() => {
    if (step === 2 && characterCustomizations.length === 0 && validAssignments.length > 0) {
      setCharacterCustomizations(
        validAssignments.map((a) => {
          const role = ROLE_MAP[a.roleId];
          return {
            abilities: { ...role.startingAbilities },
            pointsUsed: 0,
            selectedSkills: [...role.proficientSkills],
            goalsAcknowledged: false,
            abilityRevealed: false,
            resourcesViewed: false,
            confirmed: false,
          };
        })
      );
    }
  }, [step, validAssignments, characterCustomizations.length]);

  // ── Briefing segments (pre-built, no user input — Bug 3 fix) ──

  const BRIEFING_SEGMENTS = useMemo(() => [
    {
      title: 'The Site',
      subtitle: 'Corporation Eco-Park, Madurai',
      text: 'Corporation Eco-Park is a 5.5-acre public green space in Madurai, Tamil Nadu, established around 2009 by the Madurai City Corporation. The park features 124 varieties of herbal trees, a landmark 110-foot musical fountain, walking tracks, a boating pond, playgrounds, and exercise areas. Despite initial investment, many zones have deteriorated due to competing interests, inadequate maintenance, and bureaucratic inertia. Today, your team will attempt to restore it.',
      icon: '\u{1F3DE}\u{FE0F}',
      highlightZones: ['main_entrance', 'fountain_plaza', 'boating_pond', 'playground', 'walking_track', 'herbal_garden', 'open_lawn', 'exercise_zone', 'sculpture_garden', 'vendor_hub', 'restroom_block', 'fiber_optic_lane', 'ppp_zone', 'maintenance_depot'],
    },
    {
      title: 'The Problems',
      subtitle: 'Active Challenges Facing the Park',
      text: 'Several critical challenges demand your attention. The Boating Pond is in ecological crisis with toxic algae blooms threatening aquatic life. The 110-foot Fountain Plaza has broken down, becoming a symbol of neglect. Children\'s Playground equipment poses safety hazards with rusted parts. The Restroom Block is in severe disrepair with frequent breakdowns. Each challenge has a difficulty rating and requires specific resources to resolve. You will NOT see how to solve them — only what the problem is.',
      icon: '\u{26A0}\u{FE0F}',
      highlightZones: ['boating_pond', 'fountain_plaza', 'playground', 'restroom_block'],
    },
    {
      title: 'The Rules',
      subtitle: 'How the Game Works',
      text: 'Each season follows 7 phases: (1) Payment Day — receive profession income, (2) Event Roll — a 2d6 roll triggers random events, (3) Individual Action — play up to 2 cards solo, (4) Deliberation — negotiate, trade, and form alliances, (5) Action Resolution — alliance combinations resolve, (6) Season-End Accounting — zones decay or regenerate, SVS calculated, (7) Level Check — the game advances when milestones are hit. There is NO single winner. You succeed or fail together. Cards can be played in series (1-3 cards with escalating bonuses) or as alliance combinations (2-5 players combining for powerful effects).',
      icon: '\u{1F3B2}',
      highlightZones: [],
    },
    {
      title: 'The Mission',
      subtitle: 'Your Collective Objective',
      text: `Restore Corporation Eco-Park to a functional, well-maintained, community-serving public space. Your target Shared Vision Score (SVS) is 80. You have ${totalRounds} seasons. The SVS is calculated from all players' utility scores, weighted by equity — lifting up the weakest player matters more than boosting the strongest. Every decision you make will be recorded for research into collaborative governance. The park — and the data — depend on you.`,
      icon: '\u{1F3AF}',
      highlightZones: [],
    },
  ], [totalRounds]);

  // Typewriter effect for briefing
  useEffect(() => {
    if (step !== 3) return;
    if (briefingSegment >= BRIEFING_SEGMENTS.length) return;

    const fullText = BRIEFING_SEGMENTS[briefingSegment].text;
    let charIndex = 0;
    setTypedText('');

    typeIntervalRef.current = setInterval(() => {
      charIndex++;
      setTypedText(fullText.slice(0, charIndex));
      if (charIndex >= fullText.length) {
        if (typeIntervalRef.current) clearInterval(typeIntervalRef.current);
      }
    }, 18);

    return () => {
      if (typeIntervalRef.current) clearInterval(typeIntervalRef.current);
    };
  }, [step, briefingSegment, BRIEFING_SEGMENTS]);

  // ── Step Navigation ────────────────────────────────────────────

  const canGoNext = useCallback(() => {
    switch (step) {
      case 0:
        return true;
      case 1: {
        const valid = assignments.filter((a) => a.name.trim() && a.roleId);
        const uniqueRoles = new Set(valid.map((a) => a.roleId));
        return valid.length === 5 && uniqueRoles.size === 5;
      }
      case 2:
        return characterResults.length === validAssignments.length;
      case 3:
        return briefingSegment >= BRIEFING_SEGMENTS.length;
      case 4:
        return Object.keys(placedStandees).length === 5;
      case 5:
        return powerRankings.every(r => r.length === 5);
      default:
        return false;
    }
  }, [step, assignments, characterResults, validAssignments.length, briefingSegment, BRIEFING_SEGMENTS.length, placedStandees, powerRankings]);

  const handleNext = useCallback(() => {
    console.log('Setup handleNext: step', step, '->', step + 1);
    if (step === 1) {
      // Initialize game session with role assignments
      const config: GameConfig = {
        totalRounds,
        deliberationTimerSeconds: timerLength * 60,
        facilitatorMode,
        cwsTarget: 80,
        equityBandK: 0.15,
        difficultyEscalation: difficulty,
        enableTutorial: false,
        siteId: 'corporation-eco-park',
      };
      const playerAssignments = validAssignments.map((a) => ({ name: a.name, roleId: a.roleId }));
      initializeGame(config, playerAssignments);
      selectSite('corporation-eco-park');
      assignRoles(playerAssignments);
    }
    if (step === 2) {
      // Apply questionnaire-based character customizations to the game session
      if (session && characterResults.length > 0) {
        const updatedPlayers = { ...session.players };
        const playerIds = Object.keys(updatedPlayers);
        for (let i = 0; i < characterResults.length && i < playerIds.length; i++) {
          const r = characterResults[i];
          const pid = playerIds[i];
          if (updatedPlayers[pid]) {
            updatedPlayers[pid] = {
              ...updatedPlayers[pid],
              abilities: { ...r.finalAbilities },
              proficientSkills: [...r.selectedProficiencies],
            };
          }
        }
        useGameStore.setState({
          session: { ...session, players: updatedPlayers },
        });
        // Log telemetry for research
        console.log('Character creation telemetry:', characterResults.map(r => ({
          abilities: r.finalAbilities,
          deltas: r.abilityDeltas,
          objectives: r.finalObjectiveWeights,
          proficiencies: r.selectedProficiencies,
          profile: r.behavioralProfile,
          valid: r.totalScoreVerification.valid,
        })));
      }
    }
    if (step === 3) {
      completeFacilitatorBriefing();
    }
    if (step === 4) {
      // Place standees, then advance to survey (NOT start game yet)
      if (session) {
        const playerIds = Object.keys(session.players);
        for (const [indexStr, zoneId] of Object.entries(placedStandees)) {
          const pid = playerIds[parseInt(indexStr)];
          if (pid) placeStandee(pid, zoneId);
        }
      }
    }
    if (step === 5) {
      // Survey complete → start game
      console.log('TRANSITION CHAIN: handleNext step 5 → startGame()');
      console.log('  Pre-game survey data (H4 baseline):', powerRankings);
      console.log('  All rankings complete:', powerRankings.every(r => r.length === 5));
      startGame();
      console.log('TRANSITION CHAIN: startGame() returned, session phase should be payment_day');
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, [step, totalRounds, timerLength, facilitatorMode, difficulty, validAssignments, characterResults, initializeGame, selectSite, assignRoles, completeFacilitatorBriefing, session, placedStandees, placeStandee, startGame, powerRankings]);

  const handleBack = useCallback(() => {
    if (step === 0) {
      returnToTitle();
      return;
    }
    if (step === 3 && briefingSegment > 0) {
      // Go back within briefing segments
      setBriefingSegment((s) => s - 1);
      return;
    }
    goBackSetup();
    setStep((s) => Math.max(s - 1, 0));
  }, [step, briefingSegment, goBackSetup, returnToTitle]);

  // ── Empathy Mode (Bug 1 fix: OPPOSITE role assignment) ────────

  const handleEmpathyAnswer = useCallback(
    (role: RoleId) => {
      setEmpathyAnswers((prev) => {
        const next = [...prev];
        next[empathyPlayerIndex] = [...next[empathyPlayerIndex], role];
        return next;
      });
      if (empathyStep < EMPATHY_QUESTIONS.length - 1) {
        setEmpathyStep((s) => s + 1);
      } else {
        // Done with this player's questionnaire — assign OPPOSITE role
        const answers = [...empathyAnswers[empathyPlayerIndex], role];
        const roleCounts: Record<string, number> = {};
        for (const r of answers) {
          roleCounts[r] = (roleCounts[r] || 0) + 1;
        }
        // Find what they identify as most (their "real-world" identity)
        const sortedByIdentity = ALL_ROLES
          .sort((a, b) => (roleCounts[b] || 0) - (roleCounts[a] || 0));
        const identityRole = sortedByIdentity[0];

        // Assign the OPPOSITE role
        const assignedRoles = assignments.filter((a) => a.roleId).map((a) => a.roleId!);
        const oppositeRole = EMPATHY_OPPOSITE_MAP[identityRole];
        const targetRole = !assignedRoles.includes(oppositeRole)
          ? oppositeRole
          : ALL_ROLES.find((r) => !assignedRoles.includes(r))!;

        const explanation = EMPATHY_EXPLANATIONS[identityRole]?.[targetRole]
          || `You identified most with ${ROLE_MAP[identityRole].name}, so you will play as ${ROLE_MAP[targetRole].name} — to experience a different perspective on placemaking.`;

        const playerName = empathyNames[empathyPlayerIndex] || `Player ${empathyPlayerIndex + 1}`;

        setAssignments((prev) => {
          const next = [...prev];
          next[empathyPlayerIndex] = {
            name: playerName,
            roleId: targetRole,
            empathyIdentity: identityRole,
            empathyExplanation: explanation,
          };
          return next;
        });

        if (empathyPlayerIndex < 4) {
          setEmpathyPlayerIndex((i) => i + 1);
          setEmpathyStep(0);
        } else {
          setEmpathyComplete(true);
        }
      }
    },
    [empathyStep, empathyPlayerIndex, empathyAnswers, assignments, empathyNames]
  );

  const handleRandomAssignment = useCallback(() => {
    const shuffled = [...ALL_ROLES].sort(() => Math.random() - 0.5);
    setAssignments((prev) =>
      prev.map((a, i) => ({
        ...a,
        name: a.name || `Player ${i + 1}`,
        roleId: shuffled[i],
      }))
    );
  }, []);

  // ── Randomize All Players handler ─────────────────────────────
  const handleRandomizeAllPlayers = useCallback(() => {
    if (validAssignments.length < 5) return;
    console.log('Randomizing all 5 player characters...');
    setRandomizeAllProgress(0);

    // Generate all 5 characters with staggered animation
    const allResults: (CharacterCreationResult & { randomized?: boolean })[] = [];
    let idx = 0;
    const interval = setInterval(() => {
      const assignment = validAssignments[idx];
      const result = randomizeCharacterSheet(assignment.roleId);
      allResults.push(result);
      setRandomizeAllProgress(idx + 1);
      console.log(`  Generated ${assignment.name} (${assignment.roleId}): total=${result.totalScoreVerification.actual}, style=${result.behavioralProfile.coalitionStyle}`);

      idx++;
      if (idx >= validAssignments.length) {
        clearInterval(interval);
        // All done — save results and advance
        setTimeout(() => {
          setCharacterResults(allResults);
          setCharacterIndex(validAssignments.length); // Show summary
          setRandomizeAllProgress(validAssignments.length);
        }, 600);
      }
    }, 500);
  }, [validAssignments]);

  // ── Character customization handlers (Bug 2) ──────────────────

  const handleAbilityChange = useCallback((abilityKey: keyof AbilityScores, delta: number) => {
    setCharacterCustomizations((prev) => {
      const next = [...prev];
      const c = { ...next[characterIndex] };
      const currentVal = c.abilities[abilityKey];
      const newVal = currentVal + delta;

      // Enforce bounds: min 6, max 18
      if (newVal < 6 || newVal > 18) return prev;

      // Enforce total redistribution limit: 4 points
      const role = ROLE_MAP[validAssignments[characterIndex].roleId];
      const originalVal = role.startingAbilities[abilityKey];
      const currentTotalMoved = Object.keys(c.abilities).reduce((sum, k) => {
        const key = k as keyof AbilityScores;
        return sum + Math.abs(c.abilities[key] - role.startingAbilities[key]);
      }, 0);
      const newDiff = Math.abs(newVal - originalVal);
      const oldDiff = Math.abs(currentVal - originalVal);
      const newTotalMoved = currentTotalMoved - oldDiff + newDiff;

      // Each point moved counts: total redistributed can't exceed 4
      // But adding to one and subtracting from another both count
      // So we track: sum of absolute differences / 2 <= 4 (since each move is +1 somewhere -1 somewhere)
      // Actually simpler: track net points added. Must sum to 0. Max 4 added anywhere.
      const totalAdded = Object.keys(c.abilities).reduce((sum, k) => {
        const key = k as keyof AbilityScores;
        const d = (key === abilityKey ? newVal : c.abilities[key]) - role.startingAbilities[key];
        return sum + Math.max(0, d);
      }, 0);
      if (totalAdded > 4) return prev;

      // Net must stay 0 (redistribute, not add)
      const totalNet = Object.keys(c.abilities).reduce((sum, k) => {
        const key = k as keyof AbilityScores;
        return sum + ((key === abilityKey ? newVal : c.abilities[key]) - role.startingAbilities[key]);
      }, 0);
      if (totalNet !== 0) return prev;

      c.abilities = { ...c.abilities, [abilityKey]: newVal };
      c.pointsUsed = totalAdded;
      next[characterIndex] = c;
      return next;
    });
  }, [characterIndex, validAssignments]);

  const handleSkillToggle = useCallback((skillId: SkillId) => {
    setCharacterCustomizations((prev) => {
      const next = [...prev];
      const c = { ...next[characterIndex] };
      const role = ROLE_MAP[validAssignments[characterIndex].roleId];
      const defaults = role.proficientSkills;

      if (c.selectedSkills.includes(skillId)) {
        // Can only deselect if they have more than 2 (must keep at least 2 defaults)
        if (c.selectedSkills.length <= 2) return prev;
        c.selectedSkills = c.selectedSkills.filter((s) => s !== skillId);
      } else {
        // Can only add if they have fewer than 3
        if (c.selectedSkills.length >= 3) {
          // Must swap: remove one non-default or the swapped one
          // For simplicity, just replace the last non-default
          const swappable = c.selectedSkills.filter((s) => !defaults.includes(s));
          if (swappable.length > 0) {
            c.selectedSkills = c.selectedSkills.filter((s) => s !== swappable[swappable.length - 1]);
            c.selectedSkills = [...c.selectedSkills, skillId];
          } else {
            // All 3 are defaults — user must deselect one first to swap
            return prev;
          }
        } else {
          c.selectedSkills = [...c.selectedSkills, skillId];
        }
      }
      next[characterIndex] = c;
      return next;
    });
  }, [characterIndex, validAssignments]);

  const handleBriefingContinue = useCallback(() => {
    if (typeIntervalRef.current) clearInterval(typeIntervalRef.current);
    if (briefingSegment < BRIEFING_SEGMENTS.length - 1) {
      setBriefingSegment((s) => s + 1);
    } else {
      setBriefingSegment(BRIEFING_SEGMENTS.length);
    }
  }, [briefingSegment, BRIEFING_SEGMENTS.length]);

  const defaultZoneForRole: Record<RoleId, string> = {
    administrator: zones.find((z) => z.zoneType === 'administrative')?.id || zones[0]?.id || '',
    designer: zones.find((z) => z.zoneType === 'cultural')?.id || zones[1]?.id || '',
    citizen: zones.find((z) => z.zoneType === 'recreation')?.id || zones[2]?.id || '',
    investor: zones.find((z) => z.zoneType === 'commercial')?.id || zones[3]?.id || '',
    advocate: zones.find((z) => z.zoneType === 'ecological')?.id || zones[4]?.id || '',
  };

  // ── RENDER ────────────────────────────────────────────────────

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-stone-800 to-stone-900 text-stone-100">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 py-6 px-4">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <div className={`w-8 h-0.5 mx-1 ${i <= step ? 'bg-amber-400' : 'bg-stone-600'}`} />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i === step
                    ? 'bg-amber-400 text-stone-900 shadow-lg shadow-amber-400/30'
                    : i < step
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-700 text-stone-400'
                }`}
              >
                {i < step ? '\u2713' : i + 1}
              </div>
              <span className={`text-[10px] tracking-wide ${i === step ? 'text-amber-300' : 'text-stone-500'}`}>
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <AnimatePresence mode="wait">
          {/* ── Step 0: The Park Story ─────────────────────── */}
          {step === 0 && (
            <motion.div key="step-0" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="space-y-6">
              <p className="text-stone-500 text-xs uppercase tracking-wider">Step 1 of {STEPS.length}: The story of Corporation Eco-Park</p>

              {/* Park Story Animation */}
              <div className="rounded-2xl overflow-hidden border border-stone-600/50" style={{ height: '360px' }}>
                <ParkStory onComplete={() => {/* user can also click Next button below */}} />
              </div>

              {/* Game config below the story */}
              <h3 className="text-lg font-serif font-bold text-amber-300">Configure Your Session</h3>
              {/* Game Config */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-stone-700/50 rounded-xl p-4 border border-stone-600/30">
                  <label className="text-xs text-stone-400 uppercase tracking-wider font-semibold">Rounds</label>
                  <div className="flex items-center gap-2 mt-2">
                    {[3, 4, 5].map((n) => (
                      <button key={n} className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${totalRounds === n ? 'bg-amber-400 text-stone-900' : 'bg-stone-600 text-stone-300 hover:bg-stone-500'}`} onClick={() => setTotalRounds(n)}>{n}</button>
                    ))}
                  </div>
                </div>
                <div className="bg-stone-700/50 rounded-xl p-4 border border-stone-600/30">
                  <label className="text-xs text-stone-400 uppercase tracking-wider font-semibold">Timer (min)</label>
                  <div className="flex items-center gap-2 mt-2">
                    {([5, 10] as const).map((n) => (
                      <button key={n} className={`w-12 h-10 rounded-lg text-sm font-bold transition-all ${timerLength === n ? 'bg-amber-400 text-stone-900' : 'bg-stone-600 text-stone-300 hover:bg-stone-500'}`} onClick={() => setTimerLength(n)}>{n}</button>
                    ))}
                  </div>
                </div>
                <div className="bg-stone-700/50 rounded-xl p-4 border border-stone-600/30">
                  <label className="text-xs text-stone-400 uppercase tracking-wider font-semibold">Facilitator</label>
                  <div className="flex items-center gap-2 mt-2">
                    {(['human', 'ai'] as const).map((mode) => (
                      <button key={mode} className={`flex-1 h-10 rounded-lg text-sm font-bold capitalize transition-all ${facilitatorMode === mode ? 'bg-amber-400 text-stone-900' : 'bg-stone-600 text-stone-300 hover:bg-stone-500'}`} onClick={() => setFacilitatorMode(mode)}>{mode}</button>
                    ))}
                  </div>
                </div>
                <div className="bg-stone-700/50 rounded-xl p-4 border border-stone-600/30">
                  <label className="text-xs text-stone-400 uppercase tracking-wider font-semibold">Difficulty</label>
                  <div className="flex items-center gap-2 mt-2">
                    {[1, 2, 3].map((d) => (
                      <button key={d} className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all ${difficulty === d ? 'bg-amber-400 text-stone-900' : 'bg-stone-600 text-stone-300 hover:bg-stone-500'}`} onClick={() => setDifficulty(d)}>{d === 1 ? 'Easy' : d === 2 ? 'Normal' : 'Hard'}</button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 1: Role Assignment (Bug 1 fix) ──────── */}
          {step === 1 && (
            <motion.div key="step-1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="space-y-6">
              <p className="text-stone-500 text-xs uppercase tracking-wider">Step 2 of {STEPS.length}: Assign a role to each of the 5 players</p>
              <h2 className="text-2xl font-serif font-bold text-amber-300">Assign Roles</h2>
              <div className="flex gap-2">
                {(['manual', 'random', 'empathy'] as const).map((method) => (
                  <button key={method} className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${assignmentMethod === method ? 'bg-amber-400 text-stone-900' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'}`} onClick={() => { setAssignmentMethod(method); if (method === 'random') handleRandomAssignment(); }}>
                    {method === 'empathy' ? 'Empathy Mode' : method}
                  </button>
                ))}
              </div>

              {/* Empathy questionnaire — only show when not all assigned */}
              {assignmentMethod === 'empathy' && !empathyComplete && assignments[empathyPlayerIndex]?.roleId === null && (
                <div className="bg-stone-700/50 rounded-xl p-6 border border-purple-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-purple-300 text-sm font-semibold">Player {empathyPlayerIndex + 1} of 5</span>
                      <span className="text-stone-500 text-xs ml-2">Question {empathyStep + 1}/{EMPATHY_QUESTIONS.length}</span>
                    </div>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < empathyPlayerIndex ? 'bg-emerald-500' : i === empathyPlayerIndex ? 'bg-purple-400' : 'bg-stone-600'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="text-xs text-stone-400 uppercase tracking-wider font-semibold">Player Name</label>
                    <input type="text" className="mt-1 w-full bg-stone-600 rounded-lg px-3 py-2 text-stone-100 text-sm border border-stone-500 focus:border-amber-400 focus:outline-none" placeholder={`Player ${empathyPlayerIndex + 1}`} value={empathyNames[empathyPlayerIndex]} onChange={(e) => { setEmpathyNames((prev) => { const next = [...prev]; next[empathyPlayerIndex] = e.target.value; return next; }); }} />
                  </div>
                  <h3 className="text-lg font-semibold text-purple-300 mb-3">{EMPATHY_QUESTIONS[empathyStep].q}</h3>
                  <div className="space-y-2">
                    {EMPATHY_QUESTIONS[empathyStep].options.map((opt) => (
                      <button key={opt.label} className="w-full text-left px-4 py-3 rounded-lg bg-stone-600/50 text-stone-200 hover:bg-purple-900/30 hover:border-purple-500/50 transition-colors text-sm border border-stone-500/30" onClick={() => handleEmpathyAnswer(opt.role)}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Empathy results — show assigned roles with explanations */}
              {assignmentMethod === 'empathy' && assignments.some((a) => a.roleId) && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-purple-300 uppercase tracking-wider">Empathy Assignments</h3>
                  {assignments.map((a, i) => {
                    if (!a.roleId) return null;
                    const role = ROLE_MAP[a.roleId];
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-stone-700/50 rounded-xl p-4 border-l-4 flex items-start gap-4" style={{ borderColor: role.color }}>
                        <div className="text-3xl flex-shrink-0">{role.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm" style={{ color: role.color }}>{role.name}</span>
                            <span className="text-stone-400 text-xs">assigned to</span>
                            <span className="text-stone-200 text-sm font-semibold">{a.name}</span>
                          </div>
                          {a.empathyExplanation && (
                            <p className="text-stone-400 text-xs mt-1 italic">{a.empathyExplanation}</p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Role cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {ROLE_DEFINITIONS.map((role) => {
                  const assignedIndex = assignments.findIndex((a) => a.roleId === role.id);
                  const isAssigned = assignedIndex >= 0;
                  const playerName = isAssigned ? assignments[assignedIndex].name : '';
                  return (
                    <motion.div key={role.id} className={`rounded-xl border-2 overflow-hidden transition-all ${assignmentMethod === 'manual' ? 'cursor-pointer' : ''} ${isAssigned ? 'border-opacity-100 shadow-lg' : 'border-stone-600/50 hover:border-stone-500'}`} style={{ borderColor: isAssigned ? role.color : undefined, boxShadow: isAssigned ? `0 0 20px ${role.color}33` : undefined }} whileHover={assignmentMethod === 'manual' ? { scale: 1.02 } : {}} onClick={() => {
                      if (assignmentMethod !== 'manual') return;
                      const slot = assignments.findIndex((a) => !a.roleId);
                      if (slot >= 0 && !isAssigned) {
                        setAssignments((prev) => { const next = [...prev]; next[slot] = { ...next[slot], roleId: role.id }; return next; });
                      } else if (isAssigned) {
                        setAssignments((prev) => { const next = [...prev]; next[assignedIndex] = { ...next[assignedIndex], roleId: null }; return next; });
                      }
                    }}>
                      <div className="p-4 text-center" style={{ background: `linear-gradient(180deg, ${role.color}22 0%, transparent 100%)` }}>
                        <div className="text-3xl mb-2">{role.icon}</div>
                        <h3 className="font-bold text-sm" style={{ color: role.color }}>{role.name}</h3>
                        <p className="text-stone-400 text-xs mt-0.5">{role.subtitle}</p>
                      </div>
                      <div className="px-3 py-3">
                        <p className="text-stone-400 text-xs leading-relaxed line-clamp-3">{role.description}</p>
                        {isAssigned && (
                          <div className="mt-2 rounded-lg px-2 py-1 text-xs font-semibold text-center" style={{ backgroundColor: `${role.color}22`, color: role.color }}>{playerName || 'Assigned'}</div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Player name inputs (manual mode) */}
              {assignmentMethod === 'manual' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wider">Player Names</h3>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {assignments.map((a, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: a.roleId ? ROLE_MAP[a.roleId].color : '#555' }} />
                        <input type="text" className="w-full bg-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 border border-stone-600 focus:border-amber-400 focus:outline-none" placeholder={`Player ${i + 1}`} value={a.name} onChange={(e) => { setAssignments((prev) => { const next = [...prev]; next[i] = { ...next[i], name: e.target.value }; return next; }); }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Step 2: Questionnaire-Based Character Creation ── */}
          {step === 2 && (
            <motion.div key="step-2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
              {/* Randomize All Players — shown when no player has started yet */}
              {randomizeAllProgress >= 0 && randomizeAllProgress < validAssignments.length ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 space-y-8">
                  <h2 className="text-2xl font-serif font-bold text-amber-300">Generating Characters...</h2>
                  <div className="grid grid-cols-5 gap-3 max-w-3xl mx-auto">
                    {validAssignments.map((a, i) => {
                      const role = ROLE_MAP[a.roleId];
                      const isGenerated = i < randomizeAllProgress;
                      const isActive = i === randomizeAllProgress;
                      return (
                        <motion.div
                          key={i}
                          className={`rounded-xl p-4 text-center border-2 transition-all ${isGenerated ? 'border-emerald-500/50 bg-emerald-900/10' : isActive ? 'border-amber-400/50 bg-amber-900/10' : 'border-stone-600/30 bg-stone-800/30'}`}
                          animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                          transition={isActive ? { duration: 0.4, repeat: Infinity } : {}}
                        >
                          <div className="text-3xl mb-2">{role.icon}</div>
                          <p className="text-xs font-bold" style={{ color: role.color }}>{a.name}</p>
                          <p className="text-[10px] text-stone-500">{role.name}</p>
                          {isGenerated && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-2">
                              <span className="text-emerald-400 text-sm font-bold">{'\u2713'} Generated</span>
                            </motion.div>
                          )}
                          {isActive && (
                            <p className="mt-2 text-amber-400 text-xs animate-pulse">Creating...</p>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              ) : characterIndex < validAssignments.length && currentCharRole && characterResults.length < validAssignments.length ? (
                <div>
                  {/* Randomize All button — only show when first player hasn't started yet */}
                  {characterIndex === 0 && characterResults.length === 0 && (
                    <div className="flex justify-end mb-4">
                      <button
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-stone-500/50 text-stone-400 hover:text-amber-300 hover:border-amber-400/50 hover:bg-amber-900/10 transition-all"
                        onClick={handleRandomizeAllPlayers}
                        title="Generate random characters for all 5 players and proceed to briefing"
                      >
                        <span>🎲</span>
                        <span>Randomize All 5 Players</span>
                      </button>
                    </div>
                  )}
                  <CharacterQuestionnaire
                  key={characterIndex}
                  playerName={validAssignments[characterIndex].name}
                  playerIndex={characterIndex}
                  totalPlayers={validAssignments.length}
                  role={currentCharRole}
                  onComplete={(result) => {
                    const newResults = [...characterResults, result];
                    setCharacterResults(newResults);
                    if (characterIndex < validAssignments.length - 1) {
                      // More players to go — advance to next player
                      setCharacterIndex(i => i + 1);
                    } else {
                      // Last player confirmed — advance past the questionnaire
                      // so the summary screen shows
                      setCharacterIndex(validAssignments.length);
                    }
                  }}
                />
                </div>
              ) : characterResults.length === validAssignments.length ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                  <h2 className="text-3xl font-serif font-bold text-emerald-400 mb-4">All Characters Created</h2>
                  <p className="text-stone-400 text-lg mb-2">
                    {validAssignments.length} players have completed the questionnaire.
                  </p>
                  <p className="text-stone-500 text-sm">
                    Each character sheet has been computed from 12 contextual questions.
                    Ability scores are redistributed within role totals. Objective weights personalized.
                  </p>
                  <div className="mt-8 grid grid-cols-5 gap-3 max-w-3xl mx-auto">
                    {validAssignments.map((a, i) => {
                      const r = characterResults[i];
                      const role = ROLE_MAP[a.roleId];
                      return (
                        <div key={i} className="bg-stone-700/50 rounded-xl p-3 text-center border" style={{ borderColor: `${role.color}44` }}>
                          <div className="text-2xl mb-1">{role.icon}</div>
                          <p className="text-xs font-bold" style={{ color: role.color }}>{a.name}</p>
                          <p className="text-[10px] text-stone-500">{role.name}</p>
                          {r && (
                            <div className="mt-2 text-[10px] text-stone-400">
                              <span className="text-emerald-400">Score: {r.totalScoreVerification.actual}</span>
                              {' | '}
                              <span>{r.behavioralProfile.coalitionStyle}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <motion.button
                    className="mt-8 px-10 py-3 rounded-xl text-sm font-bold bg-amber-400 text-stone-900 hover:bg-amber-300 shadow-lg shadow-amber-400/20 transition-all"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    onClick={handleNext}
                  >
                    Continue to Facilitator Briefing
                  </motion.button>
                </motion.div>
              ) : null}
            </motion.div>
          )}

          {/* ── Step 3: Facilitator Briefing (Bug 3 fix — pre-built) ── */}
          {step === 3 && (
            <motion.div key="step-3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
              {briefingSegment < BRIEFING_SEGMENTS.length ? (
                <div className="max-w-2xl w-full text-center space-y-6">
                  <div className="text-5xl mb-2">{BRIEFING_SEGMENTS[briefingSegment].icon}</div>
                  <motion.div key={briefingSegment} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <h2 className="text-3xl font-serif font-bold text-amber-300">{BRIEFING_SEGMENTS[briefingSegment].title}</h2>
                    <p className="text-stone-500 text-sm mt-1">{BRIEFING_SEGMENTS[briefingSegment].subtitle}</p>
                  </motion.div>
                  <div className="bg-stone-700/50 rounded-2xl p-8 border border-stone-600/30 text-left">
                    <p className="text-stone-200 text-base leading-relaxed font-serif">
                      {typedText}
                      <motion.span className="inline-block w-0.5 h-5 bg-amber-400 ml-1" animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }} />
                    </p>
                  </div>

                  {/* Zone highlights for segments that reference zones */}
                  {BRIEFING_SEGMENTS[briefingSegment].highlightZones.length > 0 && zones.length > 0 && (
                    <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-600/30">
                      <div className="flex flex-wrap gap-2 justify-center">
                        {BRIEFING_SEGMENTS[briefingSegment].highlightZones.map((zoneId, i) => {
                          const zone = zones.find(z => z.id === zoneId);
                          if (!zone) return null;
                          return (
                            <motion.div key={zoneId} className="px-3 py-1.5 rounded-lg bg-stone-700/50 border border-stone-600/30 text-xs" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}>
                              <span className="text-stone-300 font-medium">{zone.name}</span>
                              <span className={`ml-1.5 text-[10px] ${zone.condition === 'critical' ? 'text-red-400' : zone.condition === 'poor' ? 'text-orange-400' : zone.condition === 'fair' ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                {zone.condition}
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Discussion prompt for problems segment */}
                  {briefingSegment === 1 && (
                    <p className="text-stone-500 text-xs italic">Stakeholders — do you have questions about these challenges? Discuss before continuing.</p>
                  )}

                  <button className="px-8 py-3 rounded-xl text-sm font-bold bg-amber-400 text-stone-900 hover:bg-amber-300 transition-colors" onClick={handleBriefingContinue}>
                    {briefingSegment === BRIEFING_SEGMENTS.length - 1 ? 'Ready to Begin' : 'Continue'}
                  </button>
                  <div className="flex items-center justify-center gap-2">
                    {BRIEFING_SEGMENTS.map((_, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === briefingSegment ? 'bg-amber-400' : i < briefingSegment ? 'bg-emerald-500' : 'bg-stone-600'}`} />
                    ))}
                  </div>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                  <h2 className="text-3xl font-serif font-bold text-emerald-400 mb-4">Briefing Complete</h2>
                  <p className="text-stone-400 text-lg">The team is ready. Time to take your positions on the board.</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── Step 4: Standee Placement ──────────────── */}
          {step === 4 && (
            <motion.div key="step-4" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-amber-300">Place Your Standees</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  {validAssignments.map((a, i) => {
                    const roleDef = ROLE_MAP[a.roleId];
                    const placed = placedStandees[i];
                    const suggestedZone = defaultZoneForRole[a.roleId];
                    return (
                      <motion.div key={i} className="bg-stone-700/50 rounded-xl p-4 border transition-all" style={{ borderColor: placed ? `${roleDef.color}66` : 'transparent' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-2xl">{roleDef.icon}</div>
                          <div>
                            <p className="font-semibold text-sm" style={{ color: roleDef.color }}>{roleDef.name}</p>
                            <p className="text-stone-400 text-xs">{a.name}</p>
                          </div>
                          {placed && <span className="ml-auto text-xs font-semibold text-emerald-400">\u2713 Placed</span>}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {zones.map((zone) => (
                            <button key={zone.id} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${placedStandees[i] === zone.id ? 'text-white shadow-md' : 'bg-stone-600/50 text-stone-300 hover:bg-stone-500'}`} style={placedStandees[i] === zone.id ? { backgroundColor: roleDef.color } : undefined} onClick={() => setPlacedStandees((prev) => ({ ...prev, [i]: zone.id }))}>
                              {zone.name}
                              {zone.id === suggestedZone && !placed && <span className="ml-1 text-amber-300 text-[10px]">(suggested)</span>}
                            </button>
                          ))}
                        </div>
                        {!placed && suggestedZone && (
                          <button className="mt-2 text-xs text-amber-400 hover:text-amber-300 underline" onClick={() => setPlacedStandees((prev) => ({ ...prev, [i]: suggestedZone }))}>Use suggested zone</button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
                <div className="bg-stone-700/50 rounded-2xl border border-stone-600/30 p-4 min-h-[400px]">
                  {zones.length > 0 ? (
                    <div className="w-full space-y-2">
                      <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-4">Board Preview</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {zones.map((zone) => {
                          const placedHere = Object.entries(placedStandees)
                            .filter(([, zId]) => zId === zone.id)
                            .map(([idx]) => validAssignments[parseInt(idx)]);
                          return (
                            <div key={zone.id} className="bg-stone-600/30 rounded-lg p-3 border border-stone-500/20">
                              <p className="text-stone-300 text-sm font-medium">{zone.name}</p>
                              <p className="text-stone-500 text-xs capitalize">{zone.zoneType}{zone.poolType === 'common' ? ' (shared)' : ''}</p>
                              {placedHere.length > 0 && (
                                <div className="flex gap-1 mt-2">
                                  {placedHere.map((a) => (
                                    <motion.div key={a.roleId} className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ backgroundColor: ROLE_MAP[a.roleId].color }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
                                      {ROLE_MAP[a.roleId].icon}
                                    </motion.div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-stone-500 text-sm">Board will appear after initialization</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          {/* ── Step 5: Pre-Game Survey ──────────────── */}
          {step === 5 && (
            <motion.div key="step-5" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-serif font-bold text-amber-300">Pre-Game Power Ranking</h2>
                <p className="text-stone-400 text-sm mt-1">Step 6 of 6: Before we begin, each player ranks the 5 roles by perceived power</p>
                <p className="text-stone-500 text-xs mt-1">This is research baseline data (H4). Rank 1 = most powerful, 5 = least powerful.</p>
              </div>

              {surveyPlayerIndex < validAssignments.length ? (
                <div className="max-w-lg mx-auto bg-stone-700/30 rounded-2xl p-6 border border-stone-600/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-3xl">{ROLE_MAP[validAssignments[surveyPlayerIndex].roleId]?.icon}</div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: ROLE_MAP[validAssignments[surveyPlayerIndex].roleId]?.color }}>
                        {validAssignments[surveyPlayerIndex].name}
                      </p>
                      <p className="text-xs text-stone-500">Rank all 5 roles by how powerful you think they are</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {powerRankings[surveyPlayerIndex].length < 5 ? (
                      <>
                        <p className="text-stone-400 text-xs mb-2">
                          Rank {powerRankings[surveyPlayerIndex].length + 1} of 5: Select the {
                            powerRankings[surveyPlayerIndex].length === 0 ? 'MOST powerful' :
                            powerRankings[surveyPlayerIndex].length === 4 ? 'LEAST powerful' :
                            `#${powerRankings[surveyPlayerIndex].length + 1} most powerful`
                          } role
                        </p>
                        {ALL_ROLES.filter(r => !powerRankings[surveyPlayerIndex].includes(r)).map(roleId => {
                          const role = ROLE_MAP[roleId];
                          return (
                            <button
                              key={roleId}
                              className="w-full flex items-center gap-3 p-3 rounded-lg bg-stone-600/30 border border-stone-500/30 hover:bg-stone-600/50 hover:border-stone-400/50 transition-all text-left"
                              onClick={() => {
                                setPowerRankings(prev => {
                                  const next = [...prev];
                                  next[surveyPlayerIndex] = [...next[surveyPlayerIndex], roleId];
                                  // Auto-advance: next player OR past-the-end to show completion screen
                                  if (next[surveyPlayerIndex].length === 5) {
                                    setTimeout(() => setSurveyPlayerIndex(i => i + 1), 500);
                                  }
                                  return next;
                                });
                              }}
                            >
                              <span className="text-xl">{role?.icon}</span>
                              <div>
                                <span className="text-sm font-semibold" style={{ color: role?.color }}>{role?.name}</span>
                                <span className="text-xs text-stone-500 ml-2">{role?.subtitle}</span>
                              </div>
                            </button>
                          );
                        })}
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-emerald-400 font-bold">{'\u2713'} Ranking Complete</p>
                        <div className="flex justify-center gap-2 mt-3">
                          {powerRankings[surveyPlayerIndex].map((roleId, i) => (
                            <div key={roleId} className="text-center">
                              <span className="text-stone-500 text-[10px]">#{i + 1}</span>
                              <div className="text-lg">{ROLE_MAP[roleId]?.icon}</div>
                            </div>
                          ))}
                        </div>
                        {surveyPlayerIndex < validAssignments.length - 1 ? (
                          <button className="mt-4 px-6 py-2 rounded-lg bg-stone-600 text-stone-300 text-sm hover:bg-stone-500" onClick={() => setSurveyPlayerIndex(i => i + 1)}>
                            Next Player
                          </button>
                        ) : (
                          <button
                            className="mt-4 px-6 py-2 rounded-lg bg-amber-400 text-stone-900 text-sm font-bold hover:bg-amber-300 shadow-lg shadow-amber-400/20"
                            onClick={() => setSurveyPlayerIndex(i => i + 1)}
                          >
                            Complete Survey
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Already ranked badges */}
                  {powerRankings[surveyPlayerIndex].length > 0 && powerRankings[surveyPlayerIndex].length < 5 && (
                    <div className="mt-3 flex gap-1">
                      {powerRankings[surveyPlayerIndex].map((roleId, i) => (
                        <span key={roleId} className="px-2 py-0.5 rounded text-[10px] bg-stone-600/50 text-stone-400">
                          #{i + 1} {ROLE_MAP[roleId]?.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
                  <h3 className="text-2xl font-serif font-bold text-emerald-400 mb-4">All Rankings Complete</h3>
                  <p className="text-stone-400 mb-2">Pre-game power perceptions recorded. Ready to begin!</p>
                  <p className="text-stone-500 text-xs mb-6">All {validAssignments.length} players have submitted their power rankings.</p>
                  <motion.button
                    className="px-14 py-4 rounded-2xl text-lg font-bold bg-gradient-to-r from-amber-400 to-amber-500 text-stone-900 hover:from-amber-300 hover:to-amber-400 shadow-xl shadow-amber-400/30 tracking-wide"
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      console.log('TRANSITION CHAIN: Begin Round 1 clicked');
                      console.log('  → calling handleNext at step:', step);
                      handleNext();
                    }}
                  >
                    Begin Season 1 {'\u2192'}
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-stone-900/95 backdrop-blur-sm border-t border-stone-700/50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-stone-700 text-stone-300 hover:bg-stone-600 transition-colors" onClick={handleBack}>
            {step === 0 ? '\u2190 Back to Title' : step === 3 && briefingSegment > 0 ? '\u2190 Previous Segment' : '\u2190 Back'}
          </button>
          <span className="text-stone-500 text-sm">Step {step + 1} of {STEPS.length}</span>
          <button
            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${
              canGoNext()
                ? 'bg-amber-400 text-stone-900 hover:bg-amber-300 shadow-lg shadow-amber-400/20'
                : 'bg-stone-700 text-stone-500 cursor-not-allowed'
            }`}
            disabled={!canGoNext()}
            onClick={handleNext}
          >
            {step === 5 ? 'Begin Game' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
