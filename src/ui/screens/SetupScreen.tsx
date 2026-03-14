import React, { useState, useCallback, useEffect, useRef } from 'react';
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
    startingAbilities: { authority: 16, resourcefulness: 12, communityTrust: 8, technicalKnowledge: 10, politicalLeverage: 14, adaptability: 10 },
    startingResources: { budget: 8, influence: 6, volunteer: 2, material: 4, knowledge: 4 },
    proficientSkills: ['negotiation', 'budgeting', 'regulatoryNavigation'],
    uniqueAbility: { name: 'Executive Order', description: 'Once per round, bypass one resource requirement on a card play.' },
    goals: {
      character: { description: 'Maintain administrative control', subGoals: [], totalWeight: 1 },
      survival: { description: 'Keep budget above 3', subGoals: [], totalWeight: 1 },
      mission: { description: 'Improve all zones to fair or better', subGoals: [], totalWeight: 1 },
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
    startingAbilities: { authority: 8, resourcefulness: 14, communityTrust: 12, technicalKnowledge: 16, politicalLeverage: 8, adaptability: 12 },
    startingResources: { budget: 4, influence: 4, volunteer: 4, material: 6, knowledge: 6 },
    proficientSkills: ['designThinking', 'environmentalAssessment', 'publicSpeaking'],
    uniqueAbility: { name: 'Inspired Design', description: 'Once per round, double the progress markers placed on a zone this turn.' },
    goals: {
      character: { description: 'Create beautiful, functional spaces', subGoals: [], totalWeight: 1 },
      survival: { description: 'Keep knowledge above 3', subGoals: [], totalWeight: 1 },
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
    startingAbilities: { authority: 8, resourcefulness: 10, communityTrust: 16, technicalKnowledge: 8, politicalLeverage: 12, adaptability: 14 },
    startingResources: { budget: 2, influence: 6, volunteer: 8, material: 2, knowledge: 4 },
    proficientSkills: ['publicSpeaking', 'coalitionBuilding', 'crisisManagement'],
    uniqueAbility: { name: 'Rally the Community', description: 'Once per round, generate 3 volunteer tokens and distribute them freely.' },
    goals: {
      character: { description: 'Empower community voices', subGoals: [], totalWeight: 1 },
      survival: { description: 'Keep volunteer above 3', subGoals: [], totalWeight: 1 },
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
    startingAbilities: { authority: 12, resourcefulness: 16, communityTrust: 8, technicalKnowledge: 10, politicalLeverage: 10, adaptability: 14 },
    startingResources: { budget: 10, influence: 4, volunteer: 0, material: 6, knowledge: 2 },
    proficientSkills: ['budgeting', 'negotiation', 'regulatoryNavigation'],
    uniqueAbility: { name: 'Capital Injection', description: 'Once per round, convert 4 budget into 2 of any other resource.' },
    goals: {
      character: { description: 'Maximize return on investment', subGoals: [], totalWeight: 1 },
      survival: { description: 'Keep budget above 5', subGoals: [], totalWeight: 1 },
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
    startingAbilities: { authority: 10, resourcefulness: 10, communityTrust: 14, technicalKnowledge: 14, politicalLeverage: 8, adaptability: 12 },
    startingResources: { budget: 2, influence: 4, volunteer: 4, material: 4, knowledge: 8 },
    proficientSkills: ['environmentalAssessment', 'coalitionBuilding', 'publicSpeaking'],
    uniqueAbility: { name: 'Ecological Audit', description: 'Once per round, reveal hidden trigger tiles in adjacent zones.' },
    goals: {
      character: { description: 'Preserve ecological integrity', subGoals: [], totalWeight: 1 },
      survival: { description: 'Keep knowledge above 3', subGoals: [], totalWeight: 1 },
      mission: { description: 'Improve ecological zones to good', subGoals: [], totalWeight: 1 },
    },
    welfareWeight: 1.0,
  },
];

const ROLE_MAP = Object.fromEntries(ROLE_DEFINITIONS.map((r) => [r.id, r])) as Record<RoleId, RoleDefinition>;

const ALL_ROLES: RoleId[] = ['administrator', 'designer', 'citizen', 'investor', 'advocate'];

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

const SKILL_LABELS: Record<SkillId, string> = {
  negotiation: 'Negotiation',
  budgeting: 'Budgeting',
  designThinking: 'Design Thinking',
  publicSpeaking: 'Public Speaking',
  regulatoryNavigation: 'Regulatory Navigation',
  environmentalAssessment: 'Environmental Assessment',
  coalitionBuilding: 'Coalition Building',
  crisisManagement: 'Crisis Management',
};

// ── Component ──────────────────────────────────────────────────

const STEPS = [
  'Site Selection',
  'Role Assignment',
  'Character Creation',
  'Facilitator Briefing',
  'Standee Placement',
];

interface PlayerAssignment {
  name: string;
  roleId: RoleId | null;
}

export default function SetupScreen() {
  const [step, setStep] = useState(0);

  // Step 1 state
  const [totalRounds, setTotalRounds] = useState(4);
  const [timerLength, setTimerLength] = useState<5 | 10>(5);
  const [facilitatorMode, setFacilitatorMode] = useState<'human' | 'ai'>('human');
  const [difficulty, setDifficulty] = useState(1);

  // Step 2 state
  const [assignmentMethod, setAssignmentMethod] = useState<'manual' | 'random' | 'empathy'>('manual');
  const [assignments, setAssignments] = useState<PlayerAssignment[]>(
    ALL_ROLES.map(() => ({ name: '', roleId: null }))
  );
  const [empathyStep, setEmpathyStep] = useState(0);
  const [empathyAnswers, setEmpathyAnswers] = useState<RoleId[][]>(
    Array.from({ length: 5 }, () => [])
  );
  const [empathyPlayerIndex, setEmpathyPlayerIndex] = useState(0);
  const [empathyNames, setEmpathyNames] = useState<string[]>(Array(5).fill(''));

  // Step 3 state
  const [characterIndex, setCharacterIndex] = useState(0);
  const [readyPlayers, setReadyPlayers] = useState<Set<number>>(new Set());

  // Step 4 state
  const [briefingSegment, setBriefingSegment] = useState(0);
  const [typedText, setTypedText] = useState('');
  const typeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step 5 state
  const [placedStandees, setPlacedStandees] = useState<Record<number, string>>({});

  const { initializeGame, placeStandee, startGame, session } = useGameStore();

  // ── Step Navigation ────────────────────────────────────────────

  const canGoNext = useCallback(() => {
    switch (step) {
      case 0:
        return true;
      case 1: {
        const validAssignments = assignments.filter((a) => a.name.trim() && a.roleId);
        const uniqueRoles = new Set(validAssignments.map((a) => a.roleId));
        return validAssignments.length === 5 && uniqueRoles.size === 5;
      }
      case 2:
        return readyPlayers.size === 5;
      case 3:
        return briefingSegment >= BRIEFING_SEGMENTS.length;
      case 4: {
        return Object.keys(placedStandees).length === 5;
      }
      default:
        return false;
    }
  }, [step, assignments, readyPlayers, briefingSegment, placedStandees]);

  const handleNext = useCallback(() => {
    if (step === 1) {
      // Initialize the game when moving past role assignment
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
      const playerAssignments = assignments
        .filter((a): a is { name: string; roleId: RoleId } => a.roleId !== null && a.name.trim() !== '')
        .map((a) => ({ name: a.name, roleId: a.roleId }));
      initializeGame(config, playerAssignments);
    }
    if (step === 4) {
      // Place standees and start game
      if (session) {
        const playerIds = Object.keys(session.players);
        for (const [indexStr, zoneId] of Object.entries(placedStandees)) {
          const pid = playerIds[parseInt(indexStr)];
          if (pid) placeStandee(pid, zoneId);
        }
      }
      startGame();
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, [step, totalRounds, timerLength, facilitatorMode, difficulty, assignments, initializeGame, session, placedStandees, placeStandee, startGame]);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  // ── Empathy Mode ────────────────────────────────────────────────

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
        // Done with this player's questionnaire; assign role
        const answers = [...empathyAnswers[empathyPlayerIndex], role as RoleId];
        const roleCounts: Record<string, number> = {};
        for (const r of answers) {
          roleCounts[r] = (roleCounts[r] || 0) + 1;
        }
        // Find unassigned role with highest score
        const assignedRoles = assignments.filter((a) => a.roleId).map((a) => a.roleId!);
        const sorted = ALL_ROLES
          .filter((r) => !assignedRoles.includes(r))
          .sort((a, b) => (roleCounts[b] || 0) - (roleCounts[a] || 0));
        const bestRole = sorted[0] || ALL_ROLES.find((r) => !assignedRoles.includes(r))!;

        setAssignments((prev) => {
          const next = [...prev];
          next[empathyPlayerIndex] = { name: empathyNames[empathyPlayerIndex] || `Player ${empathyPlayerIndex + 1}`, roleId: bestRole };
          return next;
        });

        if (empathyPlayerIndex < 4) {
          setEmpathyPlayerIndex((i) => i + 1);
          setEmpathyStep(0);
        }
      }
    },
    [empathyStep, empathyPlayerIndex, empathyAnswers, assignments, empathyNames]
  );

  const handleRandomAssignment = useCallback(() => {
    const shuffled = [...ALL_ROLES].sort(() => Math.random() - 0.5);
    setAssignments((prev) =>
      prev.map((a, i) => ({
        name: a.name || `Player ${i + 1}`,
        roleId: shuffled[i],
      }))
    );
  }, []);

  // ── Briefing Typewriter ─────────────────────────────────────────

  const BRIEFING_SEGMENTS = [
    {
      title: 'The Site',
      text: 'Corporation Eco-Park sits on 15 acres of former industrial land in central Madurai. Once a thriving factory complex, it was abandoned in 2005 and has slowly been reclaimed by nature. The city council has approved a public-private partnership to transform this space into a community eco-park.',
    },
    {
      title: 'Your Mission',
      text: 'Your team must work together to revitalize Corporation Eco-Park. Each zone of the park requires attention, resources, and collaborative problem-solving. The Community Welfare Score (CWS) measures your collective success. Reach the target CWS to achieve a full victory.',
    },
    {
      title: 'Win Condition',
      text: `Achieve a Community Welfare Score of 80 or higher by the end of round ${totalRounds}. The CWS is calculated from all players\' utility scores, weighted by equity. Individual survival goals must also be met to avoid penalties. Work together, but remember: each role has unique pressures.`,
    },
    {
      title: 'Round Structure',
      text: 'Each round follows five phases: (1) Event - a die roll determines random events, (2) Challenge - a new challenge card is drawn, (3) Deliberation - timed discussion and trading, (4) Action - each player takes turns playing cards, and (5) Scoring - CWS and utility are recalculated.',
    },
  ];

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
    }, 20);

    return () => {
      if (typeIntervalRef.current) clearInterval(typeIntervalRef.current);
    };
  }, [step, briefingSegment, BRIEFING_SEGMENTS]);

  const handleBriefingContinue = useCallback(() => {
    if (typeIntervalRef.current) clearInterval(typeIntervalRef.current);
    if (briefingSegment < BRIEFING_SEGMENTS.length - 1) {
      setBriefingSegment((s) => s + 1);
    } else {
      setBriefingSegment(BRIEFING_SEGMENTS.length);
    }
  }, [briefingSegment, BRIEFING_SEGMENTS.length]);

  // ── Render helpers ──────────────────────────────────────────────

  const validAssignments = assignments.filter(
    (a): a is { name: string; roleId: RoleId } => a.roleId !== null && a.name.trim() !== ''
  );

  const currentCharRole = validAssignments[characterIndex]
    ? ROLE_MAP[validAssignments[characterIndex].roleId]
    : null;

  // Get zones for standee placement
  const zones: Zone[] = session ? Object.values(session.board.zones) : [];

  const defaultZoneForRole: Record<RoleId, string> = {
    administrator: zones.find((z) => z.zoneType === 'administrative')?.id || zones[0]?.id || '',
    designer: zones.find((z) => z.zoneType === 'cultural')?.id || zones[1]?.id || '',
    citizen: zones.find((z) => z.zoneType === 'recreation')?.id || zones[2]?.id || '',
    investor: zones.find((z) => z.zoneType === 'commercial')?.id || zones[3]?.id || '',
    advocate: zones.find((z) => z.zoneType === 'ecological')?.id || zones[4]?.id || '',
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-stone-800 to-stone-900 text-stone-100">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 py-6 px-4">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <div
                className={`w-8 h-0.5 mx-1 ${
                  i <= step ? 'bg-amber-400' : 'bg-stone-600'
                }`}
              />
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
              <span
                className={`text-[10px] tracking-wide ${
                  i === step ? 'text-amber-300' : 'text-stone-500'
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <AnimatePresence mode="wait">
          {/* ── Step 0: Site Selection ─────────────────────── */}
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-serif font-bold text-amber-300">Select Your Site</h2>

              {/* Site Card */}
              <div className="bg-stone-700/50 rounded-2xl border border-stone-600/50 overflow-hidden">
                <div
                  className="h-48 flex items-end p-6"
                  style={{
                    background: 'linear-gradient(135deg, #2D5016 0%, #4A7C2E 50%, #2D5016 100%)',
                  }}
                >
                  <div>
                    <span className="text-emerald-200/70 text-xs uppercase tracking-wider font-semibold">
                      Madurai, Tamil Nadu
                    </span>
                    <h3 className="text-2xl font-bold text-white">Corporation Eco-Park</h3>
                    <p className="text-emerald-100/80 text-sm mt-1">
                      15 acres of former industrial land awaiting transformation
                    </p>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-stone-300 text-sm leading-relaxed">
                    A once-thriving factory complex abandoned in 2005, now partially reclaimed by nature.
                    The city council has approved a public-private partnership to transform this space into
                    a vibrant community eco-park. Multiple stakeholder interests must be balanced: ecological
                    restoration, commercial viability, community needs, and administrative oversight.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['7 Zones', '5 Players', 'Medium Complexity'].map((tag) => (
                      <span
                        key={tag}
                        className="bg-stone-600/50 text-stone-300 rounded-full px-3 py-1 text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Game Config */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Rounds */}
                <div className="bg-stone-700/50 rounded-xl p-4 border border-stone-600/30">
                  <label className="text-xs text-stone-400 uppercase tracking-wider font-semibold">
                    Rounds
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    {[3, 4, 5].map((n) => (
                      <button
                        key={n}
                        className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                          totalRounds === n
                            ? 'bg-amber-400 text-stone-900'
                            : 'bg-stone-600 text-stone-300 hover:bg-stone-500'
                        }`}
                        onClick={() => setTotalRounds(n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timer */}
                <div className="bg-stone-700/50 rounded-xl p-4 border border-stone-600/30">
                  <label className="text-xs text-stone-400 uppercase tracking-wider font-semibold">
                    Timer (min)
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    {([5, 10] as const).map((n) => (
                      <button
                        key={n}
                        className={`w-12 h-10 rounded-lg text-sm font-bold transition-all ${
                          timerLength === n
                            ? 'bg-amber-400 text-stone-900'
                            : 'bg-stone-600 text-stone-300 hover:bg-stone-500'
                        }`}
                        onClick={() => setTimerLength(n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Facilitator */}
                <div className="bg-stone-700/50 rounded-xl p-4 border border-stone-600/30">
                  <label className="text-xs text-stone-400 uppercase tracking-wider font-semibold">
                    Facilitator
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    {(['human', 'ai'] as const).map((mode) => (
                      <button
                        key={mode}
                        className={`flex-1 h-10 rounded-lg text-sm font-bold capitalize transition-all ${
                          facilitatorMode === mode
                            ? 'bg-amber-400 text-stone-900'
                            : 'bg-stone-600 text-stone-300 hover:bg-stone-500'
                        }`}
                        onClick={() => setFacilitatorMode(mode)}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div className="bg-stone-700/50 rounded-xl p-4 border border-stone-600/30">
                  <label className="text-xs text-stone-400 uppercase tracking-wider font-semibold">
                    Difficulty
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    {[1, 2, 3].map((d) => (
                      <button
                        key={d}
                        className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all ${
                          difficulty === d
                            ? 'bg-amber-400 text-stone-900'
                            : 'bg-stone-600 text-stone-300 hover:bg-stone-500'
                        }`}
                        onClick={() => setDifficulty(d)}
                      >
                        {d === 1 ? 'Easy' : d === 2 ? 'Normal' : 'Hard'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 1: Role Assignment ─────────────────── */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-serif font-bold text-amber-300">Assign Roles</h2>

              {/* Assignment method tabs */}
              <div className="flex gap-2">
                {(['manual', 'random', 'empathy'] as const).map((method) => (
                  <button
                    key={method}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                      assignmentMethod === method
                        ? 'bg-amber-400 text-stone-900'
                        : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                    }`}
                    onClick={() => {
                      setAssignmentMethod(method);
                      if (method === 'random') handleRandomAssignment();
                    }}
                  >
                    {method === 'empathy' ? 'Empathy Mode' : method}
                  </button>
                ))}
              </div>

              {/* Empathy questionnaire */}
              {assignmentMethod === 'empathy' && (
                <div className="bg-stone-700/50 rounded-xl p-6 border border-purple-500/30">
                  <div className="mb-4">
                    <label className="text-xs text-stone-400 uppercase tracking-wider font-semibold">
                      Player {empathyPlayerIndex + 1} Name
                    </label>
                    <input
                      type="text"
                      className="mt-1 w-full bg-stone-600 rounded-lg px-3 py-2 text-stone-100 text-sm
                                 border border-stone-500 focus:border-amber-400 focus:outline-none"
                      placeholder={`Player ${empathyPlayerIndex + 1}`}
                      value={empathyNames[empathyPlayerIndex]}
                      onChange={(e) => {
                        setEmpathyNames((prev) => {
                          const next = [...prev];
                          next[empathyPlayerIndex] = e.target.value;
                          return next;
                        });
                      }}
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-purple-300 mb-2">
                    Question {empathyStep + 1} of {EMPATHY_QUESTIONS.length}
                  </h3>
                  <p className="text-stone-200 mb-4">{EMPATHY_QUESTIONS[empathyStep].q}</p>
                  <div className="space-y-2">
                    {EMPATHY_QUESTIONS[empathyStep].options.map((opt) => (
                      <button
                        key={opt.label}
                        className="w-full text-left px-4 py-3 rounded-lg bg-stone-600/50 text-stone-200
                                   hover:bg-stone-600 transition-colors text-sm border border-stone-500/30"
                        onClick={() => handleEmpathyAnswer(opt.role)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Role cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {ROLE_DEFINITIONS.map((role) => {
                  const assignedIndex = assignments.findIndex((a) => a.roleId === role.id);
                  const isAssigned = assignedIndex >= 0;
                  const playerName = isAssigned ? assignments[assignedIndex].name : '';

                  return (
                    <motion.div
                      key={role.id}
                      className={`rounded-xl border-2 overflow-hidden transition-all cursor-pointer ${
                        isAssigned
                          ? 'border-opacity-100 shadow-lg'
                          : 'border-stone-600/50 hover:border-stone-500'
                      }`}
                      style={{
                        borderColor: isAssigned ? role.color : undefined,
                        boxShadow: isAssigned ? `0 0 20px ${role.color}33` : undefined,
                      }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => {
                        if (assignmentMethod !== 'manual') return;
                        // Find first unassigned slot
                        const slot = assignments.findIndex((a) => !a.roleId);
                        if (slot >= 0 && !isAssigned) {
                          setAssignments((prev) => {
                            const next = [...prev];
                            next[slot] = { ...next[slot], roleId: role.id };
                            return next;
                          });
                        } else if (isAssigned) {
                          // Unassign
                          setAssignments((prev) => {
                            const next = [...prev];
                            next[assignedIndex] = { ...next[assignedIndex], roleId: null };
                            return next;
                          });
                        }
                      }}
                    >
                      <div
                        className="p-4 text-center"
                        style={{
                          background: `linear-gradient(180deg, ${role.color}22 0%, transparent 100%)`,
                        }}
                      >
                        <div className="text-3xl mb-2">{role.icon}</div>
                        <h3 className="font-bold text-sm" style={{ color: role.color }}>
                          {role.name}
                        </h3>
                        <p className="text-stone-400 text-xs mt-0.5">{role.subtitle}</p>
                      </div>
                      <div className="px-3 py-3">
                        <p className="text-stone-400 text-xs leading-relaxed line-clamp-3">
                          {role.description}
                        </p>
                        {isAssigned && (
                          <div
                            className="mt-2 rounded-lg px-2 py-1 text-xs font-semibold text-center"
                            style={{ backgroundColor: `${role.color}22`, color: role.color }}
                          >
                            {playerName || 'Assigned'}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Player name inputs (manual mode) */}
              {assignmentMethod === 'manual' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wider">
                    Player Names
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {assignments.map((a, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: a.roleId ? ROLE_MAP[a.roleId].color : '#555' }}
                        />
                        <input
                          type="text"
                          className="w-full bg-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100
                                     border border-stone-600 focus:border-amber-400 focus:outline-none"
                          placeholder={`Player ${i + 1}`}
                          value={a.name}
                          onChange={(e) => {
                            setAssignments((prev) => {
                              const next = [...prev];
                              next[i] = { ...next[i], name: e.target.value };
                              return next;
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Step 2: Character Creation ──────────────── */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-serif font-bold text-amber-300">
                Character Creation - Player {characterIndex + 1} of {validAssignments.length}
              </h2>

              {currentCharRole && (
                <motion.div
                  key={characterIndex}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-stone-700/50 rounded-2xl border overflow-hidden"
                  style={{ borderColor: `${currentCharRole.color}44` }}
                >
                  {/* Header */}
                  <div
                    className="p-6 flex items-center gap-4"
                    style={{
                      background: `linear-gradient(135deg, ${currentCharRole.color}33 0%, transparent 100%)`,
                    }}
                  >
                    <div className="text-5xl">{currentCharRole.icon}</div>
                    <div>
                      <p className="text-stone-400 text-sm">
                        {validAssignments[characterIndex].name}
                      </p>
                      <h3 className="text-2xl font-bold" style={{ color: currentCharRole.color }}>
                        {currentCharRole.name}
                      </h3>
                      <p className="text-stone-400 text-sm">{currentCharRole.subtitle}</p>
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Ability Scores */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                        Ability Scores
                      </h4>
                      {(Object.entries(currentCharRole.startingAbilities) as [keyof AbilityScores, number][]).map(
                        ([key, value], i) => (
                          <motion.div
                            key={key}
                            className="flex items-center justify-between"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                          >
                            <span className="text-stone-300 text-sm">{ABILITY_LABELS[key]}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-stone-600 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: currentCharRole.color }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(value / 20) * 100}%` }}
                                  transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }}
                                />
                              </div>
                              <span className="text-stone-200 font-bold text-sm w-6 text-right">
                                {value}
                              </span>
                              <span className="text-stone-500 text-xs w-8">
                                ({Math.floor((value - 10) / 2) >= 0 ? '+' : ''}
                                {Math.floor((value - 10) / 2)})
                              </span>
                            </div>
                          </motion.div>
                        )
                      )}
                    </div>

                    {/* Resources */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                        Starting Resources
                      </h4>
                      {(Object.entries(currentCharRole.startingResources) as [keyof ResourcePool, number][]).map(
                        ([key, value], i) => (
                          <motion.div
                            key={key}
                            className="flex items-center justify-between bg-stone-600/30 rounded-lg px-3 py-2"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 + 0.5 }}
                          >
                            <span className="text-stone-300 text-sm flex items-center gap-2">
                              <span>{RESOURCE_ICONS[key]}</span>
                              {RESOURCE_LABELS[key]}
                            </span>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: value }).map((_, t) => (
                                <motion.div
                                  key={t}
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: currentCharRole.color }}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: i * 0.08 + 0.5 + t * 0.05 }}
                                />
                              ))}
                              <span className="text-stone-200 font-bold text-sm ml-1">{value}</span>
                            </div>
                          </motion.div>
                        )
                      )}
                    </div>

                    {/* Skills & Goals */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                          Proficient Skills
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {currentCharRole.proficientSkills.map((skillId, i) => (
                            <motion.span
                              key={skillId}
                              className="px-3 py-1 rounded-full text-xs font-semibold"
                              style={{
                                backgroundColor: `${currentCharRole.color}22`,
                                color: currentCharRole.color,
                                border: `1px solid ${currentCharRole.color}44`,
                              }}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.1 + 0.8 }}
                            >
                              {SKILL_LABELS[skillId]}
                            </motion.span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                          Goals
                        </h4>
                        <div className="space-y-2">
                          {[
                            { type: 'Character', goal: currentCharRole.goals.character },
                            { type: 'Survival', goal: currentCharRole.goals.survival },
                            { type: 'Mission', goal: currentCharRole.goals.mission },
                          ].map(({ type, goal }) => (
                            <div
                              key={type}
                              className="bg-stone-600/30 rounded-lg px-3 py-2"
                            >
                              <span className="text-xs font-semibold text-amber-300/80">{type}</span>
                              <p className="text-stone-300 text-xs mt-0.5">{goal.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                          Unique Ability
                        </h4>
                        <div
                          className="rounded-lg px-3 py-2 border"
                          style={{
                            backgroundColor: `${currentCharRole.color}11`,
                            borderColor: `${currentCharRole.color}33`,
                          }}
                        >
                          <p className="font-semibold text-sm" style={{ color: currentCharRole.color }}>
                            {currentCharRole.uniqueAbility.name}
                          </p>
                          <p className="text-stone-400 text-xs mt-0.5">
                            {currentCharRole.uniqueAbility.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ready button */}
                  <div className="p-6 pt-0 flex justify-between items-center">
                    {characterIndex > 0 && (
                      <button
                        className="px-6 py-2 rounded-lg text-sm font-semibold bg-stone-600 text-stone-300
                                   hover:bg-stone-500 transition-colors"
                        onClick={() => setCharacterIndex((i) => i - 1)}
                      >
                        Previous Player
                      </button>
                    )}
                    <div className="flex-1" />
                    <button
                      className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${
                        readyPlayers.has(characterIndex)
                          ? 'bg-emerald-600 text-white'
                          : 'text-stone-900'
                      }`}
                      style={
                        !readyPlayers.has(characterIndex)
                          ? { backgroundColor: currentCharRole.color }
                          : undefined
                      }
                      onClick={() => {
                        setReadyPlayers((prev) => new Set(prev).add(characterIndex));
                        if (characterIndex < validAssignments.length - 1) {
                          setCharacterIndex((i) => i + 1);
                        }
                      }}
                    >
                      {readyPlayers.has(characterIndex) ? '\u2713 Ready' : 'Ready'}
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── Step 3: Facilitator Briefing ─────────────── */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="flex flex-col items-center justify-center min-h-[60vh] space-y-8"
            >
              {briefingSegment < BRIEFING_SEGMENTS.length ? (
                <div className="max-w-2xl w-full text-center space-y-6">
                  <motion.h2
                    key={briefingSegment}
                    className="text-3xl font-serif font-bold text-amber-300"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {BRIEFING_SEGMENTS[briefingSegment].title}
                  </motion.h2>
                  <div className="bg-stone-700/50 rounded-2xl p-8 border border-stone-600/30">
                    <p className="text-stone-200 text-lg leading-relaxed font-serif">
                      {typedText}
                      <motion.span
                        className="inline-block w-0.5 h-5 bg-amber-400 ml-1"
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
                      />
                    </p>
                  </div>
                  <button
                    className="px-8 py-3 rounded-xl text-sm font-bold bg-amber-400 text-stone-900
                               hover:bg-amber-300 transition-colors"
                    onClick={handleBriefingContinue}
                  >
                    Continue
                  </button>
                  <div className="flex items-center justify-center gap-2">
                    {BRIEFING_SEGMENTS.map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i === briefingSegment ? 'bg-amber-400' : i < briefingSegment ? 'bg-emerald-500' : 'bg-stone-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center"
                >
                  <h2 className="text-3xl font-serif font-bold text-emerald-400 mb-4">
                    Briefing Complete
                  </h2>
                  <p className="text-stone-400 text-lg">
                    The team is ready. Time to take your positions on the board.
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── Step 4: Standee Placement ──────────────── */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-serif font-bold text-amber-300">Place Your Standees</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Player list */}
                <div className="space-y-3">
                  {validAssignments.map((a, i) => {
                    const roleDef = ROLE_MAP[a.roleId];
                    const placed = placedStandees[i];
                    const suggestedZone = defaultZoneForRole[a.roleId];

                    return (
                      <motion.div
                        key={i}
                        className="bg-stone-700/50 rounded-xl p-4 border transition-all"
                        style={{
                          borderColor: placed ? `${roleDef.color}66` : 'transparent',
                        }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-2xl">{roleDef.icon}</div>
                          <div>
                            <p className="font-semibold text-sm" style={{ color: roleDef.color }}>
                              {roleDef.name}
                            </p>
                            <p className="text-stone-400 text-xs">{a.name}</p>
                          </div>
                          {placed && (
                            <span className="ml-auto text-xs font-semibold text-emerald-400">
                              \u2713 Placed
                            </span>
                          )}
                        </div>

                        {/* Zone selector */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {zones.map((zone) => (
                            <button
                              key={zone.id}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                placedStandees[i] === zone.id
                                  ? 'text-white shadow-md'
                                  : 'bg-stone-600/50 text-stone-300 hover:bg-stone-500'
                              }`}
                              style={
                                placedStandees[i] === zone.id
                                  ? { backgroundColor: roleDef.color }
                                  : undefined
                              }
                              onClick={() =>
                                setPlacedStandees((prev) => ({ ...prev, [i]: zone.id }))
                              }
                            >
                              {zone.name}
                              {zone.id === suggestedZone && !placed && (
                                <span className="ml-1 text-amber-300 text-[10px]">(suggested)</span>
                              )}
                            </button>
                          ))}
                        </div>

                        {/* Suggest button */}
                        {!placed && suggestedZone && (
                          <button
                            className="mt-2 text-xs text-amber-400 hover:text-amber-300 underline"
                            onClick={() =>
                              setPlacedStandees((prev) => ({ ...prev, [i]: suggestedZone }))
                            }
                          >
                            Use suggested zone
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Board preview */}
                <div className="bg-stone-700/50 rounded-2xl border border-stone-600/30 p-4 min-h-[400px] flex items-center justify-center">
                  {zones.length > 0 ? (
                    <div className="w-full space-y-2">
                      <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-4">
                        Board Preview
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {zones.map((zone) => {
                          const placedHere = Object.entries(placedStandees)
                            .filter(([, zId]) => zId === zone.id)
                            .map(([idx]) => validAssignments[parseInt(idx)]);

                          return (
                            <div
                              key={zone.id}
                              className="bg-stone-600/30 rounded-lg p-3 border border-stone-500/20"
                            >
                              <p className="text-stone-300 text-sm font-medium">{zone.name}</p>
                              <p className="text-stone-500 text-xs capitalize">{zone.zoneType}</p>
                              {placedHere.length > 0 && (
                                <div className="flex gap-1 mt-2">
                                  {placedHere.map((a) => (
                                    <motion.div
                                      key={a.roleId}
                                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                                      style={{ backgroundColor: ROLE_MAP[a.roleId].color }}
                                      initial={{ scale: 0, y: -20 }}
                                      animate={{ scale: 1, y: 0 }}
                                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                                    >
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
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-stone-900/95 backdrop-blur-sm border-t border-stone-700/50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-stone-700 text-stone-300
                       hover:bg-stone-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={step === 0}
            onClick={handleBack}
          >
            Back
          </button>
          <span className="text-stone-500 text-sm">
            Step {step + 1} of {STEPS.length}
          </span>
          <button
            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${
              canGoNext()
                ? 'bg-amber-400 text-stone-900 hover:bg-amber-300 shadow-lg shadow-amber-400/20'
                : 'bg-stone-700 text-stone-500 cursor-not-allowed'
            }`}
            disabled={!canGoNext()}
            onClick={handleNext}
          >
            {step === 4 ? 'Start Game' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
