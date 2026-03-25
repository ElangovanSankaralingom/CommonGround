import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  GameSession,
  ChallengeCard,
  Player,
  RoleId,
  AbilityId,
  ResourceType,
} from '../../core/models/types';
import { CHALLENGE_CATEGORY_COLORS, ROLE_COLORS } from '../../core/models/constants';
import { ZoneIllustration } from '../zones/ZoneIllustrations';

// ─── Types ──────────────────────────────────────────────────────

export interface TreasureHuntResults {
  cluesFound: { clueId: string; finderId: string; type: string }[];
  totalFound: number;
  allFound: boolean;
  cpAwarded: Record<string, number>;
}

interface ChallengePhaseProps {
  session: GameSession;
  challenge: ChallengeCard;
  players: Player[];
  onPhaseComplete: (treasureHuntResults: TreasureHuntResults) => void;
}

type Stage =
  | 'intro'
  | 'card_draw'
  | 'treasure_hunt_intro'
  | 'treasure_hunt'
  | 'results'
  | 'continue';

type ClueType = 'consequence' | 'capability' | 'outcome' | 'resource' | 'connection';

interface ClueHotspot {
  id: string;
  type: ClueType;
  label: string;
  content: string;
  /** Position as percentage of container */
  x: number;
  y: number;
  found: boolean;
  finderId: string | null;
}

// ─── Constants ──────────────────────────────────────────────────

const CLUE_TYPE_COLORS: Record<ClueType, string> = {
  consequence: '#EF4444',
  capability: '#3B82F6',
  outcome: '#F59E0B',
  resource: '#22C55E',
  connection: '#A855F7',
};

const CLUE_TYPE_LABELS: Record<ClueType, string> = {
  consequence: 'Consequence',
  capability: 'Capability',
  outcome: 'Outcome',
  resource: 'Resource',
  connection: 'Connection',
};

const TURN_SECONDS = 12;
const TOTAL_CLUES = 5;

const ABILITY_DISPLAY: Record<AbilityId, string> = {
  authority: 'Authority',
  resourcefulness: 'Resourcefulness',
  communityTrust: 'Community Trust',
  technicalKnowledge: 'Technical Knowledge',
  politicalLeverage: 'Political Leverage',
  adaptability: 'Adaptability',
};

const ROLE_DISPLAY: Record<RoleId, string> = {
  administrator: 'Administrator',
  designer: 'Designer',
  citizen: 'Citizen',
  investor: 'Investor',
  advocate: 'Advocate',
};

// ─── Helpers ────────────────────────────────────────────────────

/** Spread 5 hotspot positions in a roughly scattered layout */
const HOTSPOT_POSITIONS: { x: number; y: number }[] = [
  { x: 18, y: 25 },
  { x: 72, y: 18 },
  { x: 45, y: 55 },
  { x: 82, y: 65 },
  { x: 25, y: 78 },
];

function generateClues(challenge: ChallengeCard): ClueHotspot[] {
  // 1. Consequence clue — derived from failureConsequences
  const consequenceText = challenge.failureConsequences
    .map((c) => {
      switch (c.type) {
        case 'cws_penalty':
          return `CWS penalty: -${c.params.amount}`;
        case 'zone_degrade':
          return `Zone degrades by ${c.params.levels} level(s)`;
        case 'resource_loss':
          return `Resource loss: ${JSON.stringify(c.params)}`;
        case 'new_problem':
          return `New problem: ${c.params.problem || 'unknown'}`;
        case 'lock_zone':
          return `Zone locked for ${c.params.duration} rounds`;
        case 'status_effect':
          return `Status effect: ${c.params.effect || 'debuff'} applied`;
        case 'difficulty_increase':
          return `Difficulty increases by ${c.params.amount || 2}`;
        default:
          return `Effect: ${c.type}`;
      }
    })
    .join('. ');

  // 2. Capability clue — which roles/abilities pass checks
  const checks = challenge.requirements.abilityChecks;
  const capabilityText =
    checks.length > 0
      ? checks
          .map(
            (ck) =>
              `${ABILITY_DISPLAY[ck.ability]} check (DC ${ck.threshold})${
                ck.skill ? ` — proficiency: ${ck.skill}` : ''
              }`
          )
          .join('; ')
      : 'No specific ability checks required.';

  // 3. Outcome clue — graduated outcome tiers
  const outcomes = challenge.hiddenBack.outcomes;
  const outcomeText = [
    `Full: ${outcomes.full.description}`,
    `Partial: ${outcomes.partial.description}`,
    `Fail: ${outcomes.fail.description}`,
  ].join(' | ');

  // 4. Resource bonus (generic)
  const resourceText = 'Bonus: +1 resource token granted to the affected zone for investigation effort.';

  // 5. Connection clue (generic)
  const zoneIds = challenge.affectedZoneIds;
  const connectionText =
    zoneIds.length > 1
      ? `This challenge spans connected zones: ${zoneIds.join(', ')}. Adjacent zones may be impacted by the outcome.`
      : `This challenge is localized to ${zoneIds[0] || 'a single zone'}. Adjacent zones may still feel secondary effects.`;

  const types: ClueType[] = ['consequence', 'capability', 'outcome', 'resource', 'connection'];
  const texts = [consequenceText, capabilityText, outcomeText, resourceText, connectionText];

  return types.map((type, i) => ({
    id: `clue_${type}`,
    type,
    label: CLUE_TYPE_LABELS[type],
    content: texts[i],
    x: HOTSPOT_POSITIONS[i].x,
    y: HOTSPOT_POSITIONS[i].y,
    found: false,
    finderId: null,
  }));
}

// ─── Sub-components ─────────────────────────────────────────────

const DifficultyDots: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex gap-1">
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className={`w-3 h-3 rounded-full ${
          i < rating ? 'bg-red-500' : 'bg-gray-600'
        }`}
      />
    ))}
  </div>
);

const CluePopup: React.FC<{
  clue: ClueHotspot;
  onClose: () => void;
}> = ({ clue, onClose }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    className="fixed inset-0 z-50 flex items-center justify-center"
    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
    onClick={onClose}
  >
    <motion.div
      className="bg-gray-900 border-2 rounded-xl p-6 max-w-md w-full mx-4"
      style={{ borderColor: CLUE_TYPE_COLORS[clue.type] }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: CLUE_TYPE_COLORS[clue.type] }}
        />
        <h3
          className="text-lg font-bold"
          style={{ color: CLUE_TYPE_COLORS[clue.type] }}
        >
          {clue.label} Clue
        </h3>
      </div>
      <p className="text-gray-200 text-sm leading-relaxed">{clue.content}</p>
      <button
        onClick={onClose}
        className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition-colors"
      >
        Close
      </button>
    </motion.div>
  </motion.div>
);

const TimerBar: React.FC<{ secondsLeft: number; total: number }> = ({
  secondsLeft,
  total,
}) => {
  const pct = (secondsLeft / total) * 100;
  const color = pct > 50 ? '#22C55E' : pct > 25 ? '#F59E0B' : '#EF4444';
  return (
    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────

export const ChallengePhase: React.FC<ChallengePhaseProps> = ({
  session,
  challenge,
  players,
  onPhaseComplete,
}) => {
  const [stage, setStage] = useState<Stage>('intro');
  const [cardFlipped, setCardFlipped] = useState(false);

  // Treasure hunt state
  const [clues, setClues] = useState<ClueHotspot[]>(() => generateClues(challenge));
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TURN_SECONDS);
  const [activeCluePopup, setActiveCluePopup] = useState<ClueHotspot | null>(null);
  const [huntComplete, setHuntComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sort players by utility ascending (lowest first)
  const turnOrder = useMemo(
    () => [...players].sort((a, b) => a.utilityScore - b.utilityScore),
    [players]
  );

  const currentPlayer = turnOrder[currentPlayerIndex] ?? null;

  // ── Stage auto-transitions ───────────────────────────────────
  useEffect(() => {
    if (stage === 'intro') {
      const t = setTimeout(() => setStage('card_draw'), 1500);
      return () => clearTimeout(t);
    }
    if (stage === 'treasure_hunt_intro') {
      const t = setTimeout(() => setStage('treasure_hunt'), 1000);
      return () => clearTimeout(t);
    }
  }, [stage]);

  // Card flip animation trigger
  useEffect(() => {
    if (stage === 'card_draw') {
      const t = setTimeout(() => setCardFlipped(true), 400);
      return () => clearTimeout(t);
    }
  }, [stage]);

  // ── Turn timer ───────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 'treasure_hunt' || huntComplete || activeCluePopup) return;

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // End this player's turn
          advanceTurn();
          return TURN_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, currentPlayerIndex, huntComplete, activeCluePopup]);

  // ── Turn advance ─────────────────────────────────────────────
  const advanceTurn = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSecondsLeft(TURN_SECONDS);

    if (currentPlayerIndex + 1 < turnOrder.length) {
      setCurrentPlayerIndex((prev) => prev + 1);
    } else {
      // All players done
      setHuntComplete(true);
      setStage('results');
    }
  }, [currentPlayerIndex, turnOrder.length]);

  // ── Clue click handler ───────────────────────────────────────
  const handleClueClick = useCallback(
    (clueId: string) => {
      if (!currentPlayer || huntComplete) return;

      setClues((prev) =>
        prev.map((c) =>
          c.id === clueId && !c.found
            ? { ...c, found: true, finderId: currentPlayer.id }
            : c
        )
      );

      const clue = clues.find((c) => c.id === clueId);
      if (clue && !clue.found) {
        // Show popup with revealed clue content
        setActiveCluePopup({ ...clue, found: true, finderId: currentPlayer.id });
      }
    },
    [currentPlayer, clues, huntComplete]
  );

  const closeCluePopup = useCallback(() => {
    setActiveCluePopup(null);
  }, []);

  // ── Compute results ──────────────────────────────────────────
  const results = useMemo((): TreasureHuntResults => {
    const found = clues.filter((c) => c.found);
    const allFound = found.length === TOTAL_CLUES;

    const cpAwarded: Record<string, number> = {};
    // Initialize all players to 0
    players.forEach((p) => {
      cpAwarded[p.id] = 0;
    });
    // +1 CP per clue found
    found.forEach((c) => {
      if (c.finderId) {
        cpAwarded[c.finderId] = (cpAwarded[c.finderId] || 0) + 1;
      }
    });
    // All 5 found: +2 bonus CP shared
    if (allFound) {
      players.forEach((p) => {
        cpAwarded[p.id] = (cpAwarded[p.id] || 0) + 2;
      });
    }

    return {
      cluesFound: found.map((c) => ({
        clueId: c.id,
        finderId: c.finderId || '',
        type: c.type,
      })),
      totalFound: found.length,
      allFound,
      cpAwarded,
    };
  }, [clues, players]);

  // ── Render helpers ───────────────────────────────────────────

  const renderIntro = () => (
    <motion.div
      key="intro"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center h-full gap-4"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold text-amber-400 mb-2">Phase 2: Challenge</h1>
        <p className="text-gray-300 text-lg">
          A new problem emerges. Investigate to understand it.
        </p>
      </motion.div>
      <motion.div
        className="w-16 h-1 bg-amber-500 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: 64 }}
        transition={{ duration: 1 }}
      />
    </motion.div>
  );

  const renderCardDraw = () => {
    const face = challenge.publicFace;
    const catColor =
      CHALLENGE_CATEGORY_COLORS[face.category] || face.categoryColor || '#6B7280';

    return (
      <motion.div
        key="card_draw"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center h-full gap-6 px-4"
      >
        {/* Card flip container */}
        <motion.div
          className="relative"
          style={{ perspective: 1000 }}
        >
          <motion.div
            className="relative w-80 min-h-[420px]"
            animate={{ rotateY: cardFlipped ? 0 : 180 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Card front (public face) */}
            <div
              className="bg-gray-900 border-2 border-gray-600 rounded-xl p-6 shadow-2xl"
              style={{
                backfaceVisibility: 'hidden',
                borderColor: catColor,
              }}
            >
              {/* Category badge */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white"
                  style={{ backgroundColor: catColor }}
                >
                  {face.category}
                </span>
                <DifficultyDots rating={face.difficultyRating} />
              </div>

              {/* Card name */}
              <h2 className="text-xl font-bold text-white mb-1">{challenge.name}</h2>
              <p className="text-sm text-gray-400 mb-3">{face.zoneName}</p>

              {/* Problem description */}
              <p className="text-gray-200 text-sm leading-relaxed mb-4">
                {face.problemDescription}
              </p>

              {/* Flavor text */}
              {face.flavorText && (
                <p className="text-gray-500 italic text-xs mb-4 border-l-2 border-gray-700 pl-3">
                  {face.flavorText}
                </p>
              )}

              {/* Resources required */}
              <div className="mb-2">
                <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Resources Required
                </h4>
                <div className="flex flex-wrap gap-2">
                  {face.resourcesRequired.map((r) => (
                    <span
                      key={r.type}
                      className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300"
                    >
                      {r.displayName} x{r.amount}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Hex board mini-view with problem marker */}
        {cardFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="relative w-24 h-24">
              <div
                className="w-24 h-24 rounded-lg flex items-center justify-center text-xs text-white font-medium text-center p-1"
                style={{
                  backgroundColor: catColor + '33',
                  border: `2px solid ${catColor}`,
                }}
              >
                {face.zoneName}
              </div>
              {/* Problem marker pulse */}
              <motion.div
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: catColor }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                !
              </motion.div>
            </div>
            <span className="text-xs text-gray-500">Problem marker placed</span>
          </motion.div>
        )}

        {cardFlipped && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            onClick={() => setStage('treasure_hunt_intro')}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors"
          >
            Begin Investigation
          </motion.button>
        )}
      </motion.div>
    );
  };

  const renderTreasureHuntIntro = () => (
    <motion.div
      key="treasure_hunt_intro"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center h-full gap-4"
    >
      <h2 className="text-3xl font-bold text-cyan-400">Zone Investigation</h2>
      <p className="text-gray-300 text-lg">Find clues to understand this challenge</p>
    </motion.div>
  );

  const renderTreasureHunt = () => {
    const face = challenge.publicFace;
    const foundCount = clues.filter((c) => c.found).length;

    return (
      <motion.div
        key="treasure_hunt"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center h-full gap-4 px-4 py-6"
      >
        {/* Header: current player */}
        {currentPlayer && !huntComplete && (
          <div className="flex items-center gap-3 w-full max-w-lg">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: ROLE_COLORS[currentPlayer.roleId] || '#6B7280' }}
            />
            <span className="text-white font-semibold">{currentPlayer.name}</span>
            <span className="text-gray-400 text-sm">
              ({ROLE_DISPLAY[currentPlayer.roleId]})
            </span>
            <div className="flex-1" />
            <span className="text-gray-400 text-sm">
              Clues: {foundCount}/{TOTAL_CLUES}
            </span>
          </div>
        )}

        {/* Timer */}
        {currentPlayer && !huntComplete && (
          <div className="w-full max-w-lg">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Time remaining</span>
              <span>{secondsLeft}s</span>
            </div>
            <TimerBar secondsLeft={secondsLeft} total={TURN_SECONDS} />
          </div>
        )}

        {/* Zone illustration with hotspots */}
        <div className="relative w-full max-w-lg">
          <div
            className="relative w-full rounded-xl overflow-hidden"
            style={{ backgroundColor: '#1a2e1a', aspectRatio: '500/350' }}
          >
            {/* Zone name watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-white/10 text-4xl font-bold uppercase tracking-widest">{face.zoneName}</span>
            </div>
            {clues.map((clue) => (
              <motion.button
                key={clue.id}
                className="absolute flex items-center justify-center rounded-full shadow-lg transition-transform"
                style={{
                  left: `${clue.x}%`,
                  top: `${clue.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: clue.found ? 32 : 40,
                  height: clue.found ? 32 : 40,
                  backgroundColor: clue.found
                    ? CLUE_TYPE_COLORS[clue.type]
                    : 'rgba(255,255,255,0.15)',
                  border: clue.found
                    ? `2px solid ${CLUE_TYPE_COLORS[clue.type]}`
                    : '2px solid rgba(255,255,255,0.4)',
                  cursor: clue.found || huntComplete ? 'default' : 'pointer',
                }}
                whileHover={!clue.found && !huntComplete ? { scale: 1.2 } : {}}
                whileTap={!clue.found && !huntComplete ? { scale: 0.95 } : {}}
                animate={
                  !clue.found
                    ? { opacity: [0.6, 1, 0.6] }
                    : { opacity: 1 }
                }
                transition={
                  !clue.found
                    ? { repeat: Infinity, duration: 2 }
                    : {}
                }
                onClick={() => {
                  if (!clue.found && !huntComplete) {
                    handleClueClick(clue.id);
                  }
                }}
                disabled={clue.found || huntComplete}
              >
                {clue.found ? (
                  <span className="text-white text-xs font-bold">
                    {clue.label.charAt(0)}
                  </span>
                ) : (
                  <span className="text-white text-lg">?</span>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Turn order indicator */}
        {!huntComplete && (
          <div className="flex gap-2 items-center">
            {turnOrder.map((p, idx) => (
              <div
                key={p.id}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx === currentPlayerIndex
                    ? 'ring-2 ring-white'
                    : idx < currentPlayerIndex
                    ? 'opacity-40'
                    : 'opacity-70'
                }`}
                style={{
                  backgroundColor: ROLE_COLORS[p.roleId] || '#6B7280',
                  color: 'white',
                }}
                title={p.name}
              >
                {p.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        )}

        {/* Clue popup */}
        <AnimatePresence>
          {activeCluePopup && (
            <CluePopup clue={activeCluePopup} onClose={closeCluePopup} />
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const renderResults = () => {
    const { cluesFound, totalFound, allFound, cpAwarded } = results;

    return (
      <motion.div
        key="results"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center h-full gap-6 px-4"
      >
        <h2 className="text-3xl font-bold text-white">Investigation Complete</h2>
        <p className="text-xl text-gray-300">
          <span className="text-amber-400 font-bold">{totalFound}</span>/{TOTAL_CLUES}{' '}
          clues found
        </p>

        {allFound && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-4 py-2 bg-green-900/50 border border-green-500 rounded-lg text-green-400 text-sm font-semibold"
          >
            All clues found! +2 bonus CP for everyone
          </motion.div>
        )}

        {/* Clue list */}
        <div className="w-full max-w-md space-y-2">
          {clues.map((clue) => {
            const finder = clue.finderId
              ? players.find((p) => p.id === clue.finderId)
              : null;

            return (
              <div
                key={clue.id}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
                  clue.found ? 'bg-gray-800' : 'bg-gray-900 opacity-50'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: clue.found
                      ? CLUE_TYPE_COLORS[clue.type]
                      : '#4B5563',
                  }}
                />
                <span
                  className="text-sm font-medium flex-1"
                  style={{
                    color: clue.found ? CLUE_TYPE_COLORS[clue.type] : '#6B7280',
                  }}
                >
                  {clue.label}
                </span>
                {clue.found && finder ? (
                  <span className="text-xs text-gray-400">
                    Found by{' '}
                    <span style={{ color: ROLE_COLORS[finder.roleId] || '#9CA3AF' }}>
                      {finder.name}
                    </span>
                  </span>
                ) : (
                  <span className="text-xs text-gray-600">Not found</span>
                )}
              </div>
            );
          })}
        </div>

        {/* CP awards */}
        <div className="w-full max-w-md">
          <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2 text-center">
            CP Awarded
          </h4>
          <div className="flex flex-wrap justify-center gap-3">
            {players.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-lg"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: ROLE_COLORS[p.roleId] || '#6B7280' }}
                />
                <span className="text-sm text-gray-300">{p.name}</span>
                <span className="text-sm font-bold text-amber-400">
                  +{cpAwarded[p.id] || 0} CP
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => setStage('continue')}
          className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors mt-2"
        >
          Continue
        </button>
      </motion.div>
    );
  };

  const renderContinue = () => (
    <motion.div
      key="continue"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center h-full gap-6"
    >
      <h2 className="text-2xl font-bold text-white">Ready for Deliberation</h2>
      <p className="text-gray-400">
        Use what you learned to negotiate a plan of action.
      </p>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onPhaseComplete(results)}
        className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg rounded-xl transition-colors shadow-lg"
      >
        Continue to Phase 3: Deliberation &rarr;
      </motion.button>
    </motion.div>
  );

  // ── Main render ──────────────────────────────────────────────

  return (
    <div className="relative w-full h-full min-h-screen bg-gray-950 text-white overflow-y-auto">
      <AnimatePresence mode="wait">
        {stage === 'intro' && renderIntro()}
        {stage === 'card_draw' && renderCardDraw()}
        {stage === 'treasure_hunt_intro' && renderTreasureHuntIntro()}
        {stage === 'treasure_hunt' && renderTreasureHunt()}
        {stage === 'results' && renderResults()}
        {stage === 'continue' && renderContinue()}
      </AnimatePresence>
    </div>
  );
};

export default ChallengePhase;
