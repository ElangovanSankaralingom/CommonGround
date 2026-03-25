import { v4 as uuidv4 } from 'uuid';
import {
  GameSession,
  GameConfig,
  Player,
  Board,
  DeckState,
  RoleId,
  RoleDefinition,
  ActionCard,
  ChallengeCard,
  EventCard,
  TradeCard,
  CWSTracker,
  ResourcePool,
  GameGraph,
} from '../models/types';
import { LEVEL_TABLE } from '../models/constants';
import {
  ROLES,
  ZONES,
  ADJACENCY,
  TRIGGER_TILES,
  ADMINISTRATOR_CARDS,
  DESIGNER_CARDS,
  CITIZEN_CARDS,
  INVESTOR_CARDS,
  ADVOCATE_CARDS,
  ALL_CHALLENGES,
  EVENT_CARDS,
  TRADE_CARDS,
} from '../content';

// ─── Seeded RNG ───────────────────────────────────────────────

function createSeededRng(seed: number): () => number {
  let current = seed;
  return () => {
    current = (current * 1664525 + 1013904223) & 0x7fffffff;
    return current / 0x7fffffff;
  };
}

function shuffleWithRng<T>(array: T[], rng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ─── Role to cards mapping ────────────────────────────────────

function getCardsForRole(roleId: RoleId): ActionCard[] {
  switch (roleId) {
    case 'administrator': return [...ADMINISTRATOR_CARDS];
    case 'designer': return [...DESIGNER_CARDS];
    case 'citizen': return [...CITIZEN_CARDS];
    case 'investor': return [...INVESTOR_CARDS];
    case 'advocate': return [...ADVOCATE_CARDS];
  }
}

// ─── Public API ───────────────────────────────────────────────

export function createPlayer(
  name: string,
  roleId: RoleId,
  roleDefinition: RoleDefinition,
  rng: () => number
): Player {
  const id = uuidv4();
  const levelEntry = LEVEL_TABLE[0]; // Level 1

  const allCards = getCardsForRole(roleId);
  const shuffled = shuffleWithRng(allCards, rng);

  const handSize = levelEntry.handSize;
  const hand = shuffled.slice(0, handSize);
  const drawPile = shuffled.slice(handSize);

  const zoneIds = Object.keys(ZONES);
  const focusZoneId = zoneIds[Math.floor(rng() * zoneIds.length)];

  return {
    id,
    name,
    roleId,
    level: 1,
    collaborationPoints: 0,
    abilities: { ...roleDefinition.startingAbilities },
    proficiencyBonus: levelEntry.proficiencyBonus,
    proficientSkills: [...roleDefinition.proficientSkills],
    hand,
    drawPile,
    discardPile: [],
    resources: { ...roleDefinition.startingResources },
    goals: JSON.parse(JSON.stringify(roleDefinition.goals)),
    utilityScore: 0,
    utilityHistory: [],
    focusZoneId,
    crisisState: false,
    uniqueAbilityUsesRemaining: levelEntry.uniqueAbilityUses,
    statusEffects: [],
    // New fields for fixes
    revenueTokens: [],
    resolvedChallengeLastRound: false,
    communityTrustPenalty: 0,
    communityTrustPenaltyRoundsLeft: 0,
    cardsPlayedThisRound: 0,
    passedIndividualAction: false,
  };
}

export function initializeDecks(rng: () => number): DeckState {
  const challengeDeck = shuffleWithRng<ChallengeCard>([...ALL_CHALLENGES], rng);
  const eventDeck = shuffleWithRng<EventCard>([...EVENT_CARDS], rng);
  const tradeDeck = shuffleWithRng<TradeCard>([...TRADE_CARDS], rng);

  return {
    challengeDeck,
    challengeDiscard: [],
    eventDeck,
    eventDiscard: [],
    tradeDeck,
  };
}

export function initializeBoard(siteId: string): Board {
  const zones: Record<string, typeof ZONES[keyof typeof ZONES]> = {};
  for (const [id, zone] of Object.entries(ZONES)) {
    zones[id] = {
      ...zone,
      conditionHistory: [],
      resources: { ...zone.resources },
      activeProblems: [...zone.activeProblems],
      playerStandees: [],
      revealedTrigger: null,
      investedThisRound: false,
    };
  }

  const triggerTiles: Record<string, typeof TRIGGER_TILES[keyof typeof TRIGGER_TILES]> = {};
  for (const [id, tile] of Object.entries(TRIGGER_TILES)) {
    triggerTiles[id] = {
      ...tile,
      revealed: false,
      effects: tile.effects.map((e) => ({ ...e, params: { ...e.params } })),
    };
  }

  return {
    siteId,
    siteName: siteId === 'eco_park' ? 'Indira Gandhi Eco-Park' : siteId,
    zones,
    adjacency: { ...ADJACENCY },
    triggerTiles,
  };
}

function initializeGameGraph(): GameGraph {
  return {
    vertices: [],
    edges: [],
    objectiveFunction: {
      formula: 'VO = Sum(Wi x Si) for all zones i',
      currentVO: 0,
      maxPossibleVO: 0,
      zoneContributions: [],
      thresholdVO: 0,
    },
    snapshots: [],
  };
}

export function initializeGame(
  config: GameConfig,
  playerAssignments: { name: string; roleId: RoleId }[]
): GameSession {
  const sessionId = uuidv4();
  const seed = config.siteId
    ? hashString(config.siteId + Date.now().toString())
    : Math.floor(Math.random() * 0x7fffffff);

  const rng = createSeededRng(seed);

  // Create players
  const players: Record<string, Player> = {};
  const turnOrder: string[] = [];
  const callDeliberationUsed: Record<string, boolean> = {};

  for (const assignment of playerAssignments) {
    const roleDef = ROLES[assignment.roleId];
    if (!roleDef) {
      throw new Error(`Unknown role: ${assignment.roleId}`);
    }
    const player = createPlayer(assignment.name, assignment.roleId, roleDef, rng);
    players[player.id] = player;
    turnOrder.push(player.id);
    callDeliberationUsed[player.id] = false;
  }

  turnOrder.sort((a, b) => {
    const pa = players[a];
    const pb = players[b];
    if (pa.utilityScore !== pb.utilityScore) {
      return pa.utilityScore - pb.utilityScore;
    }
    return pa.roleId.localeCompare(pb.roleId);
  });

  const decks = initializeDecks(rng);
  const board = initializeBoard(config.siteId);

  const cwsTracker: CWSTracker = {
    currentScore: 0,
    targetScore: config.cwsTarget,
    history: [],
  };

  return {
    id: sessionId,
    createdAt: new Date().toISOString(),
    siteName: board.siteName,
    config,
    currentRound: 1,
    totalRounds: config.totalRounds,
    currentPhase: 'setup_site_selection',
    currentPlayerTurnIndex: 0,
    turnOrder,
    players,
    board,
    decks,
    cwsTracker,
    eventDieResult: null,
    eventRollResult: null,
    activeChallenge: null,
    activeSeries: null,
    activeCombination: null,
    activeCoalitions: [],
    tradeOffers: [],
    promises: [],
    roundLog: [],
    gameLog: [],
    telemetry: [],
    status: 'setup',
    endResult: null,
    rngSeed: seed,
    gameLevel: 1,
    gameGraph: initializeGameGraph(),
    zonesInvestedThisRound: [],
    fullCoalitionAchieved: false,
    callDeliberationUsed,
    nashEngineOutput: null,
    buchiHistory: {},
  };
}

// ─── Helpers ──────────────────────────────────────────────────

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) & 0x7fffffff;
  }
  return Math.abs(hash) || 1;
}
