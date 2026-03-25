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
import { ZoneIllustration, ZONE_CLUE_POSITIONS } from '../zones/ZoneIllustrations';
import { PhaseNavigation } from '../effects/PhaseNavigation';

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
  onPhaseComplete: (results: TreasureHuntResults) => void;
}

type Stage =
  | 'intro'
  | 'card_draw'
  | 'exploration_intro'
  | 'exploration'
  | 'results'
  | 'continue';

type ClueType = 'consequence' | 'capability' | 'outcome' | 'resource' | 'connection';

interface ClueObject {
  id: string;
  type: ClueType;
  x: number;
  y: number;
  content: string;
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
  consequence: 'CONSEQUENCE',
  capability: 'STAKEHOLDERS',
  outcome: 'OUTCOMES',
  resource: 'HIDDEN SUPPLY',
  connection: 'CONNECTION',
};

const TURN_SECONDS = 15;
const TOTAL_CLUES = 5;
const PROXIMITY_PX = 60;
const CLUE_RADIUS = 24;

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

const RESOURCE_ICONS: Record<ResourceType, string> = {
  budget: '\u{1F4B0}',
  influence: '\u{1F3DB}',
  volunteer: '\u{1F91D}',
  material: '\u{1F9F1}',
  knowledge: '\u{1F4DA}',
};

// ─── Helpers ────────────────────────────────────────────────────

function generateClues(
  challenge: ChallengeCard,
  session: GameSession,
  players: Player[],
  zoneId: string
): ClueObject[] {
  const positions = ZONE_CLUE_POSITIONS[zoneId] ?? [
    { id: 'c1', x: 150, y: 200, type: 'consequence' },
    { id: 'c2', x: 400, y: 150, type: 'capability' },
    { id: 'c3', x: 600, y: 300, type: 'outcome' },
    { id: 'c4', x: 250, y: 400, type: 'resource' },
    { id: 'c5', x: 550, y: 350, type: 'connection' },
  ];

  // 1. Consequence
  const consequenceText = challenge.failureConsequences
    .map((c) => {
      switch (c.type) {
        case 'cws_penalty':
          return `CWS penalty: -${c.params.amount ?? '?'}`;
        case 'zone_degrade':
          return `Zone degrades by ${c.params.levels ?? 1} level(s)`;
        case 'resource_loss':
          return `Resource loss: ${Object.entries(c.params).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
        case 'new_problem':
          return `New problem emerges: ${c.params.problem || 'unknown'}`;
        case 'lock_zone':
          return `Zone locked for ${c.params.duration ?? '?'} rounds`;
        case 'status_effect':
          return `Status effect: ${c.params.effect || 'debuff'} applied`;
        case 'difficulty_increase':
          return `Difficulty increases by ${c.params.amount || 2}`;
        default:
          return `Effect: ${c.type}`;
      }
    })
    .join('. ');

  // 2. Capability / Stakeholders
  const checks = challenge.requirements.abilityChecks;
  const capabilityLines: string[] = [];
  if (checks.length > 0) {
    for (const check of checks) {
      for (const p of players) {
        const score = p.abilities[check.ability];
        const pass = score >= check.threshold;
        const roleColor = ROLE_COLORS[p.roleId];
        capabilityLines.push(
          `${ROLE_DISPLAY[p.roleId]}: ${ABILITY_DISPLAY[check.ability]} ${score}/${check.threshold} ${pass ? '\u2713' : '\u2717'}`
        );
      }
    }
  } else {
    capabilityLines.push('No specific ability checks required.');
  }

  // 3. Outcome tiers
  const outcomeText =
    'Full Success: exceed threshold by 4+ | Partial: 1-3 above | Narrow: exact match | Failure: below threshold';

  // 4. Resource
  const zone = session.board.zones[zoneId];
  const primaryRes = zone?.primaryResourceType ?? 'budget';
  const resourceText = `+1 ${primaryRes.charAt(0).toUpperCase() + primaryRes.slice(1)} Token added to zone!`;

  // 5. Connection
  const adjacency = session.board.adjacency[zoneId] ?? [];
  const adjNames = adjacency
    .map((id) => session.board.zones[id]?.name ?? id)
    .join(', ');
  const connectionText = adjacency.length > 0
    ? `This zone connects to ${adjNames}. Improvements here cascade.`
    : 'This zone has no direct adjacencies mapped.';

  const typeOrder: ClueType[] = ['consequence', 'capability', 'outcome', 'resource', 'connection'];
  const contents = [
    `CONSEQUENCE: If unresolved: ${consequenceText || 'Unknown consequences.'}`,
    `STAKEHOLDERS: ${capabilityLines.join(' | ')}`,
    `OUTCOMES: ${outcomeText}`,
    `HIDDEN SUPPLY: ${resourceText}`,
    `CONNECTION: ${connectionText}`,
  ];

  return typeOrder.map((type, i) => {
    const pos = positions.find((p) => p.type === type) ?? positions[i];
    return {
      id: pos?.id ?? `clue_${type}`,
      type,
      x: pos?.x ?? 100 + i * 140,
      y: pos?.y ?? 250,
      content: contents[i],
      found: false,
      finderId: null,
    };
  });
}

// ─── Sub-components ─────────────────────────────────────────────

const DifficultyDots: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex gap-1 items-center">
    {Array.from({ length: 5 }).map((_, i) => (
      <span key={i} className="text-lg leading-none">
        {i < rating ? '\u25CF' : '\u25CB'}
      </span>
    ))}
  </div>
);

const CluePopup: React.FC<{
  clue: ClueObject;
  type: ClueType;
  onClose: () => void;
}> = ({ clue, type, onClose }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    className="fixed inset-0 z-50 flex items-center justify-center"
    style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
    onClick={onClose}
  >
    <motion.div
      className="bg-gray-900 border-2 rounded-xl p-6 max-w-lg w-full mx-4"
      style={{ borderColor: CLUE_TYPE_COLORS[type] }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: CLUE_TYPE_COLORS[type] }}
        />
        <h3
          className="text-lg font-bold"
          style={{ color: CLUE_TYPE_COLORS[type] }}
        >
          {CLUE_TYPE_LABELS[type]}
        </h3>
      </div>
      <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
        {clue.content}
      </p>
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

export function ChallengePhase({
  session,
  challenge,
  players,
  onPhaseComplete,
}: ChallengePhaseProps) {
  const [stage, setStage] = useState<Stage>('intro');
  const [cardFlipped, setCardFlipped] = useState(false);

  // Determine affected zone
  const zoneId = challenge.publicFace.zoneId || challenge.affectedZoneIds[0] || '';
  const zoneName = challenge.publicFace.zoneName || session.board.zones[zoneId]?.name || zoneId;

  // Exploration state
  const [clues, setClues] = useState<ClueObject[]>(() =>
    generateClues(challenge, session, players, zoneId)
  );
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TURN_SECONDS);
  const [activeCluePopup, setActiveCluePopup] = useState<ClueObject | null>(null);
  const [huntComplete, setHuntComplete] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [viewOffsetX, setViewOffsetX] = useState(0);
  const explorationRef = useRef<HTMLDivElement>(null);
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
    if (stage === 'exploration_intro') {
      const t = setTimeout(() => setStage('exploration'), 1000);
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
    if (stage !== 'exploration' || huntComplete || activeCluePopup) return;

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
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
      setHuntComplete(true);
      setStage('results');
    }
  }, [currentPlayerIndex, turnOrder.length]);

  // ── Mouse tracking for proximity hint ────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (huntComplete || !explorationRef.current) return;
      const rect = explorationRef.current.getBoundingClientRect();
      // The SVG viewBox is 800x500. Map mouse to viewBox coords.
      const svgWidth = rect.width;
      const svgHeight = rect.height;
      const mx = ((e.clientX - rect.left) / svgWidth) * 800;
      const my = ((e.clientY - rect.top) / svgHeight) * 500;
      setMousePos({ x: mx, y: my });
    },
    [huntComplete]
  );

  // ── Clue click handler ───────────────────────────────────────
  const handleClueClick = useCallback(
    (clueId: string) => {
      if (!currentPlayer || huntComplete) return;

      const clue = clues.find((c) => c.id === clueId);
      if (!clue || clue.found) return;

      const updatedClue = { ...clue, found: true, finderId: currentPlayer.id };

      setClues((prev) =>
        prev.map((c) => (c.id === clueId ? updatedClue : c))
      );

      setActiveCluePopup(updatedClue);
    },
    [currentPlayer, clues, huntComplete]
  );

  const closeCluePopup = useCallback(() => {
    setActiveCluePopup(null);
  }, []);

  // ── Panorama scrolling ───────────────────────────────────────
  const scrollLeft = useCallback(() => {
    setViewOffsetX((prev) => Math.min(prev + 200, 0));
  }, []);

  const scrollRight = useCallback(() => {
    setViewOffsetX((prev) => Math.max(prev - 200, -400));
  }, []);

  // ── Proximity computation for each clue ──────────────────────
  const getClueProximity = useCallback(
    (clue: ClueObject): number => {
      if (!mousePos || clue.found) return 0;
      const dx = mousePos.x - clue.x;
      const dy = mousePos.y - clue.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > PROXIMITY_PX) return 0;
      return 1 - dist / PROXIMITY_PX; // 0..1, 1 = right on top
    },
    [mousePos]
  );

  // ── Compute results ──────────────────────────────────────────
  const results = useMemo((): TreasureHuntResults => {
    const found = clues.filter((c) => c.found);
    const allFound = found.length === TOTAL_CLUES;

    const cpAwarded: Record<string, number> = {};
    players.forEach((p) => {
      cpAwarded[p.id] = 0;
    });
    found.forEach((c) => {
      if (c.finderId) {
        cpAwarded[c.finderId] = (cpAwarded[c.finderId] || 0) + 1;
      }
    });
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

  // ── Count mandatory unfound ──────────────────────────────────
  const mandatoryTypes: ClueType[] = ['consequence', 'capability', 'outcome'];
  const mandatoryUnfound = clues.filter(
    (c) => mandatoryTypes.includes(c.type) && !c.found
  );

  // ── Render: Intro ────────────────────────────────────────────

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
        <h1 className="text-4xl font-bold text-amber-400 mb-2">
          Phase 2: Challenge
        </h1>
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

  // ── Render: Card Draw (3D flip) ──────────────────────────────

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
        {/* 3D Card flip container */}
        <div style={{ perspective: 1200 }}>
          <motion.div
            className="relative w-80"
            style={{ transformStyle: 'preserve-3d' }}
            animate={{ rotateY: cardFlipped ? 0 : 180 }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
          >
            {/* Front face (public) */}
            <div
              className="bg-gray-900 border-2 rounded-xl p-6 shadow-2xl"
              style={{
                backfaceVisibility: 'hidden',
                borderColor: catColor,
              }}
            >
              {/* Category badge + Difficulty dots */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white"
                  style={{ backgroundColor: catColor }}
                >
                  {face.category}
                </span>
                <DifficultyDots rating={face.difficultyRating} />
              </div>

              {/* Name */}
              <h2 className="text-xl font-bold text-white mb-1">
                {challenge.name}
              </h2>

              {/* Zone badge */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium text-white"
                  style={{ backgroundColor: catColor + '66' }}
                >
                  {face.zoneName}
                </span>
              </div>

              {/* Problem description */}
              <p className="text-gray-200 text-sm leading-relaxed mb-4">
                {face.problemDescription}
              </p>

              {/* Resources required */}
              <div className="mb-4">
                <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Resources Required
                </h4>
                <div className="flex flex-wrap gap-2">
                  {face.resourcesRequired.map((r) => (
                    <span
                      key={r.type}
                      className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300 flex items-center gap-1"
                    >
                      <span>{RESOURCE_ICONS[r.type] || ''}</span>
                      {r.displayName} x{r.amount}
                    </span>
                  ))}
                </div>
              </div>

              {/* Flavor text */}
              {face.flavorText && (
                <p className="text-gray-500 italic text-xs border-l-2 border-gray-700 pl-3 mb-4">
                  {face.flavorText}
                </p>
              )}
            </div>

            {/* Card back (shown before flip) */}
            <div
              className="absolute inset-0 bg-gray-800 border-2 border-gray-600 rounded-xl flex items-center justify-center"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <div className="text-center">
                <div className="text-6xl mb-4 opacity-40">?</div>
                <p className="text-gray-400 text-sm uppercase tracking-widest">
                  Challenge Card
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Investigate Zone button */}
        {cardFlipped && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={() => setStage('exploration_intro')}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            Investigate Zone &rarr;
          </motion.button>
        )}
      </motion.div>
    );
  };

  // ── Render: Exploration Intro ────────────────────────────────

  const renderExplorationIntro = () => (
    <motion.div
      key="exploration_intro"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center h-full gap-4"
    >
      <h2 className="text-3xl font-bold text-cyan-400">
        Entering {zoneName}...
      </h2>
      <p className="text-gray-300 text-lg">
        Look for clues to understand this challenge.
      </p>
    </motion.div>
  );

  // ── Render: Exploration (immersive zone) ─────────────────────

  const renderExploration = () => {
    const foundCount = clues.filter((c) => c.found).length;
    const foundClueIds = clues.filter((c) => c.found).map((c) => c.id);

    // Build cluePositions for ZoneIllustration, but we handle click ourselves via overlay
    const cluePositionsForIllustration = clues.map((c) => ({
      id: c.id,
      x: c.x,
      y: c.y,
      found: c.found,
      type: c.type as 'consequence' | 'capability' | 'outcome' | 'resource' | 'connection',
    }));

    return (
      <motion.div
        key="exploration"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col h-full"
      >
        {/* Header: current player + turn info */}
        {currentPlayer && !huntComplete && (
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-900/80 border-b border-gray-800">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: ROLE_COLORS[currentPlayer.roleId] || '#6B7280' }}
            />
            <span className="text-white font-semibold">
              {currentPlayer.name}
            </span>
            <span className="text-gray-400 text-sm">
              ({ROLE_DISPLAY[currentPlayer.roleId]})
            </span>
            <div className="flex-1" />
            <span className="text-gray-400 text-sm">
              Player {currentPlayerIndex + 1} of {turnOrder.length}
            </span>
            <span className="text-gray-500 mx-2">|</span>
            <span className="text-gray-400 text-sm">
              Clues: {foundCount}/{TOTAL_CLUES}
            </span>
          </div>
        )}

        {/* Timer bar */}
        {currentPlayer && !huntComplete && (
          <div className="px-4 py-2 bg-gray-900/60">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Time remaining</span>
              <span>{secondsLeft}s</span>
            </div>
            <TimerBar secondsLeft={secondsLeft} total={TURN_SECONDS} />
          </div>
        )}

        {/* Full-screen zone illustration with panorama scroll */}
        <div className="flex-1 relative overflow-hidden bg-gray-950">
          {/* Left arrow */}
          {viewOffsetX < 0 && (
            <button
              onClick={scrollLeft}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center text-xl transition-colors"
            >
              &larr;
            </button>
          )}
          {/* Right arrow */}
          {viewOffsetX > -400 && (
            <button
              onClick={scrollRight}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center text-xl transition-colors"
            >
              &rarr;
            </button>
          )}

          <div
            ref={explorationRef}
            className="relative"
            style={{
              width: '150%',
              transform: `translateX(${viewOffsetX}px)`,
              transition: 'transform 0.3s ease-out',
            }}
            onMouseMove={handleMouseMove}
          >
            {/* Zone illustration as background */}
            <ZoneIllustration
              zoneId={zoneId}
              cluePositions={[]}
              foundClues={[]}
              activePlayerId={null}
              onClueClick={() => {}}
            />

            {/* Overlay: interactive clue hotspots */}
            <svg
              viewBox="0 0 800 500"
              className="absolute inset-0 w-full h-full"
              style={{ pointerEvents: 'none' }}
            >
              {clues.map((clue) => {
                const proximity = getClueProximity(clue);
                const isNearby = proximity > 0;
                const baseOpacity = clue.found ? 0.9 : 0.15 + proximity * 0.35;
                const scale = clue.found ? 1 : 1 + proximity * 0.3;
                const glowRadius = CLUE_RADIUS + proximity * 12;

                return (
                  <g key={clue.id} style={{ pointerEvents: 'auto' }}>
                    {/* Proximity glow ring */}
                    {!clue.found && isNearby && (
                      <circle
                        cx={clue.x}
                        cy={clue.y}
                        r={glowRadius}
                        fill="none"
                        stroke={CLUE_TYPE_COLORS[clue.type]}
                        strokeWidth={2}
                        opacity={proximity * 0.6}
                      />
                    )}

                    {/* Pulse ring for unfound clues */}
                    {!clue.found && (
                      <circle
                        cx={clue.x}
                        cy={clue.y}
                        r={CLUE_RADIUS}
                        fill={CLUE_TYPE_COLORS[clue.type]}
                        opacity={baseOpacity}
                        style={{
                          transform: `scale(${scale})`,
                          transformOrigin: `${clue.x}px ${clue.y}px`,
                          animation: isNearby ? 'none' : 'zone-clue-pulse 2s ease-in-out infinite',
                          cursor: huntComplete ? 'default' : 'pointer',
                        }}
                        onClick={() => {
                          if (!clue.found && !huntComplete) {
                            handleClueClick(clue.id);
                          }
                        }}
                      />
                    )}

                    {/* Found clue marker */}
                    {clue.found && (
                      <>
                        <circle
                          cx={clue.x}
                          cy={clue.y}
                          r={CLUE_RADIUS}
                          fill={CLUE_TYPE_COLORS[clue.type]}
                          opacity={0.85}
                          stroke="white"
                          strokeWidth={2}
                        />
                        <text
                          x={clue.x}
                          y={clue.y + 5}
                          textAnchor="middle"
                          fill="white"
                          fontSize={14}
                          fontWeight="bold"
                          style={{ pointerEvents: 'none' }}
                        >
                          {CLUE_TYPE_LABELS[clue.type].charAt(0)}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Turn order footer */}
        {!huntComplete && (
          <div className="flex gap-2 items-center justify-center py-3 bg-gray-900/80 border-t border-gray-800">
            {turnOrder.map((p, idx) => (
              <div
                key={p.id}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  idx === currentPlayerIndex
                    ? 'ring-2 ring-white scale-110'
                    : idx < currentPlayerIndex
                    ? 'opacity-40'
                    : 'opacity-70'
                }`}
                style={{
                  backgroundColor: ROLE_COLORS[p.roleId] || '#6B7280',
                  color: 'white',
                }}
                title={`${p.name} (${ROLE_DISPLAY[p.roleId]})`}
              >
                {p.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        )}

        {/* Clue popup overlay */}
        <AnimatePresence>
          {activeCluePopup && (
            <CluePopup
              clue={activeCluePopup}
              type={activeCluePopup.type}
              onClose={closeCluePopup}
            />
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  // ── Render: Results ──────────────────────────────────────────

  const renderResults = () => {
    const { totalFound, allFound, cpAwarded } = results;

    return (
      <motion.div
        key="results"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center h-full gap-6 px-4 py-8 overflow-y-auto"
      >
        <h2 className="text-3xl font-bold text-white">Investigation Complete</h2>
        <p className="text-xl text-gray-300">
          <span className="text-amber-400 font-bold">{totalFound}</span>/{TOTAL_CLUES} clues found
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
                  clue.found ? 'bg-gray-800' : 'bg-gray-900 opacity-60'
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
                  {CLUE_TYPE_LABELS[clue.type]}
                </span>
                {clue.found && finder ? (
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <span className="text-green-500">{'\u2713'}</span>
                    <span style={{ color: ROLE_COLORS[finder.roleId] || '#9CA3AF' }}>
                      {finder.name}
                    </span>
                  </span>
                ) : (
                  <span className="text-xs text-red-400 flex items-center gap-1">
                    <span className="text-red-500">{'\u2717'}</span>
                    Information missing
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Warning for mandatory unfound clues */}
        {mandatoryUnfound.length > 0 && (
          <div className="w-full max-w-md px-4 py-3 bg-amber-900/30 border border-amber-600/50 rounded-lg">
            <p className="text-amber-400 text-sm font-medium">
              {'\u26A0\uFE0F'} Proceeding with incomplete information
            </p>
            <p className="text-amber-300/70 text-xs mt-1">
              {mandatoryUnfound.length} mandatory clue{mandatoryUnfound.length > 1 ? 's' : ''} not found.
              This may affect deliberation quality.
            </p>
          </div>
        )}

        {/* CP awards info */}
        <div className="w-full max-w-md">
          <p className="text-xs text-gray-500 text-center mb-2">
            +1 CP per clue found. All 5 = +2 bonus CP shared.
          </p>
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

  // ── Render: Continue ─────────────────────────────────────────

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
        {stage === 'exploration_intro' && renderExplorationIntro()}
        {stage === 'exploration' && renderExploration()}
        {stage === 'results' && renderResults()}
        {stage === 'continue' && renderContinue()}
      </AnimatePresence>

      <PhaseNavigation
        canContinue={stage === 'continue' || stage === 'results'}
        continueLabel="Continue to Phase 3: Deliberation \u2192"
        onContinue={() => {
          console.log('PHASE TRANSITION: Challenge → Deliberation');
          onPhaseComplete(results);
        }}
        showBack={false}
        onSkip={() => {
          console.log('PHASE SKIP: Skipping exploration');
          onPhaseComplete(results);
        }}
        skipLabel="Skip Exploration"
      />
    </div>
  );
}

export default ChallengePhase;
