import {
  GameSession,
  GamePhase,
  EventDieResult,
  ChallengeCard,
  Zone,
  ZoneCondition,
  Player,
  CWSBreakdown,
  ResourcePool,
} from '../models/types';
import { WELFARE_WEIGHTS, ZONE_CONDITION_ORDER, LEVEL_TABLE } from '../models/constants';
import { calculateTurnOrder } from './turnManager';

// ─── Seeded RNG helper ────────────────────────────────────────
function seededRandom(seed: number): { value: number; nextSeed: number } {
  // Simple LCG
  const next = (seed * 1664525 + 1013904223) & 0x7fffffff;
  return { value: next / 0x7fffffff, nextSeed: next };
}

// ─── Phase 1: Event Roll ──────────────────────────────────────
function rollEventDie(seed: number): { result: EventDieResult; nextSeed: number } {
  const { value, nextSeed } = seededRandom(seed);
  const roll = Math.floor(value * 6) + 1; // 1-6

  let outcome: EventDieResult['outcome'];
  if (roll <= 2) {
    outcome = 'negative_event';
  } else if (roll <= 4) {
    outcome = 'no_event';
  } else {
    outcome = 'positive_event';
  }

  return {
    result: { value: roll, outcome },
    nextSeed,
  };
}

function drawEventCard(
  gameState: GameSession,
  type: 'negative' | 'positive'
): GameSession {
  const deck = [...gameState.decks.eventDeck];
  const discard = [...gameState.decks.eventDiscard];

  const matchingIndex = deck.findIndex((c) => c.type === type);
  if (matchingIndex === -1) {
    // No matching event card available; skip
    return gameState;
  }

  const [card] = deck.splice(matchingIndex, 1);
  discard.push(card);

  // Apply event effects to game state
  let updatedState: GameSession = {
    ...gameState,
    decks: {
      ...gameState.decks,
      eventDeck: deck,
      eventDiscard: discard,
    },
  };

  // Apply each effect
  for (const effect of card.effects) {
    updatedState = applyEventEffect(updatedState, effect);
  }

  return updatedState;
}

function applyEventEffect(
  gameState: GameSession,
  effect: { type: string; target: string; params: Record<string, any> }
): GameSession {
  const zones = { ...gameState.board.zones };
  const players = { ...gameState.players };

  switch (effect.type) {
    case 'add_problem_marker': {
      const zone = zones[effect.target];
      if (zone) {
        zones[effect.target] = {
          ...zone,
          problemMarkers: zone.problemMarkers + (effect.params.count || 1),
        };
      }
      break;
    }
    case 'remove_problem_marker': {
      const zone = zones[effect.target];
      if (zone) {
        zones[effect.target] = {
          ...zone,
          problemMarkers: Math.max(0, zone.problemMarkers - (effect.params.count || 1)),
        };
      }
      break;
    }
    case 'modify_zone_condition': {
      const zone = zones[effect.target];
      if (zone) {
        const currentLevel = ZONE_CONDITION_ORDER[zone.condition] ?? 3;
        const degradeLevels = effect.params.degradeLevels || 0;
        const improveLevels = effect.params.improveLevels || 0;
        const newLevel = Math.max(1, Math.min(4, currentLevel - degradeLevels + improveLevels));
        const conditionMap: Record<number, ZoneCondition> = {
          1: 'critical', 2: 'poor', 3: 'fair', 4: 'good',
        };
        zones[effect.target] = {
          ...zone,
          condition: conditionMap[newLevel] || zone.condition,
        };
      }
      break;
    }
    case 'add_resources_to_zone': {
      const zone = zones[effect.target];
      if (zone && effect.params.resources) {
        const res = { ...zone.resources };
        for (const [key, val] of Object.entries(effect.params.resources)) {
          res[key as keyof ResourcePool] = (res[key as keyof ResourcePool] || 0) + (val as number);
        }
        zones[effect.target] = { ...zone, resources: res };
      }
      break;
    }
    case 'remove_resources_from_zone': {
      const zone = zones[effect.target];
      if (zone && effect.params.resources) {
        const res = { ...zone.resources };
        for (const [key, val] of Object.entries(effect.params.resources)) {
          res[key as keyof ResourcePool] = Math.max(0, (res[key as keyof ResourcePool] || 0) - (val as number));
        }
        zones[effect.target] = { ...zone, resources: res };
      }
      break;
    }
    case 'add_resources_to_player': {
      const player = players[effect.target];
      if (player && effect.params.resources) {
        const res = { ...player.resources };
        for (const [key, val] of Object.entries(effect.params.resources)) {
          res[key as keyof ResourcePool] = (res[key as keyof ResourcePool] || 0) + (val as number);
        }
        players[effect.target] = { ...player, resources: res };
      }
      break;
    }
    case 'modify_player_ability_temp': {
      // Find player by role or ID
      const targetPlayer = Object.values(players).find(
        (p) => p.roleId === effect.target || p.id === effect.target
      );
      if (targetPlayer && effect.params.ability && effect.params.modifier != null) {
        const statusEffect = {
          id: `event_${Date.now()}`,
          name: 'Event Effect',
          description: `Temporary ${effect.params.ability} modifier from event`,
          abilityModifiers: { [effect.params.ability]: effect.params.modifier },
          resourceModifiers: {},
          duration: effect.params.duration || 1,
          source: 'event',
        };
        players[targetPlayer.id] = {
          ...targetPlayer,
          statusEffects: [...targetPlayer.statusEffects, statusEffect],
        };
      }
      break;
    }
    case 'modify_difficulty': {
      // Modify active challenge difficulty if any
      if (gameState.activeChallenge) {
        const updated = gameState.activeChallenge.map((ch) => ({
          ...ch,
          difficulty: ch.difficulty + (effect.params.amount || 0),
        }));
        return {
          ...gameState,
          board: { ...gameState.board, zones },
          players,
          activeChallenge: updated,
        };
      }
      break;
    }
    case 'grant_tokens': {
      // Grant tokens to all players
      if (effect.params.resources) {
        for (const pid of Object.keys(players)) {
          const p = players[pid];
          const res = { ...p.resources };
          for (const [key, val] of Object.entries(effect.params.resources)) {
            res[key as keyof ResourcePool] = (res[key as keyof ResourcePool] || 0) + (val as number);
          }
          players[pid] = { ...p, resources: res };
        }
      }
      break;
    }
    default:
      // Unknown effect type, skip
      break;
  }

  return {
    ...gameState,
    board: { ...gameState.board, zones },
    players,
  };
}

// ─── Phase 2: Challenge Presentation ─────────────────────────
function drawChallenge(gameState: GameSession): GameSession {
  const deck = [...gameState.decks.challengeDeck];
  const discard = [...gameState.decks.challengeDiscard];

  if (deck.length === 0) {
    // Reshuffle discard into deck
    const reshuffled = shuffleArray(discard, gameState.rngSeed);
    return {
      ...gameState,
      activeChallenge: reshuffled.length > 0 ? [reshuffled[0]] : null,
      decks: {
        ...gameState.decks,
        challengeDeck: reshuffled.slice(1),
        challengeDiscard: [],
      },
    };
  }

  const card = deck.shift()!;

  // Apply difficulty escalation based on round number
  const escalatedCard: ChallengeCard = {
    ...card,
    difficulty: card.difficulty + (gameState.currentRound - 1) * (gameState.config.difficultyEscalation || 0),
  };

  return {
    ...gameState,
    activeChallenge: [escalatedCard],
    decks: {
      ...gameState.decks,
      challengeDeck: deck,
      challengeDiscard: [...discard, card],
    },
  };
}

function shuffleArray<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let currentSeed = seed;
  for (let i = result.length - 1; i > 0; i--) {
    const { value, nextSeed } = seededRandom(currentSeed);
    currentSeed = nextSeed;
    const j = Math.floor(value * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ─── Phase 3: Deliberation ───────────────────────────────────
function startDeliberation(gameState: GameSession): GameSession {
  return {
    ...gameState,
    currentPhase: 'phase_3_deliberation',
    status: 'deliberation',
    tradeOffers: [],
  };
}

// ─── Phase 4: Action Resolution ──────────────────────────────
function startActionResolution(gameState: GameSession): GameSession {
  const turnOrder = calculateTurnOrder(gameState.players);
  return {
    ...gameState,
    currentPhase: 'phase_4_action',
    status: 'resolution',
    turnOrder,
    currentPlayerTurnIndex: 0,
    activeSeries: null,
    activeCombination: null,
  };
}

// ─── Phase 5: Consequence & Scoring ──────────────────────────

function conditionToScore(condition: ZoneCondition): number {
  switch (condition) {
    case 'good': return 4;
    case 'fair': return 3;
    case 'poor': return 2;
    case 'critical': return 1;
    case 'locked': return 0;
  }
}

function calculateUtility(player: Player, zones: Record<string, Zone>): number {
  // Utility = sum of resources + weighted goal progress + zone condition of focus zone
  const resourceTotal =
    player.resources.budget +
    player.resources.influence +
    player.resources.volunteer +
    player.resources.material +
    player.resources.knowledge;

  // Goal progress contribution
  let goalProgress = 0;
  const allGoals = [
    ...player.goals.character.subGoals,
    ...player.goals.survival.subGoals,
    ...player.goals.mission.subGoals,
  ];
  for (const goal of allGoals) {
    if (goal.satisfied) {
      goalProgress += goal.weight;
    }
  }

  // Focus zone contribution
  const focusZone = zones[player.focusZoneId];
  const zoneBonus = focusZone ? conditionToScore(focusZone.condition) * 2 : 0;

  // Level & CP contribution
  const levelBonus = player.level * 2;
  const cpBonus = Math.floor(player.collaborationPoints / 2);

  return resourceTotal + goalProgress + zoneBonus + levelBonus + cpBonus;
}

function calculateCWSBreakdown(players: Record<string, Player>, zones: Record<string, Zone>): CWSBreakdown {
  const entries = Object.values(players).map((player) => {
    const welfareWeight = WELFARE_WEIGHTS[player.roleId] || 1.0;
    const utility = calculateUtility(player, zones);
    return {
      playerId: player.id,
      welfareWeight,
      utility,
      weighted: utility * welfareWeight,
    };
  });

  const totalWeighted = entries.reduce((sum, e) => sum + e.weighted, 0);
  const avgWeighted = entries.length > 0 ? totalWeighted / entries.length : 0;

  // Equity bonus: lower variance in utilities = higher bonus
  const utilities = entries.map((e) => e.utility);
  const mean = utilities.length > 0
    ? utilities.reduce((s, u) => s + u, 0) / utilities.length
    : 0;
  const variance = utilities.length > 0
    ? utilities.reduce((s, u) => s + (u - mean) ** 2, 0) / utilities.length
    : 0;
  const stdDev = Math.sqrt(variance);
  // Equity bonus inversely proportional to standard deviation
  const equityBonus = Math.max(0, Math.round(5 - stdDev));

  // Collaboration bonus based on total CP earned
  const totalCP = Object.values(players).reduce((s, p) => s + p.collaborationPoints, 0);
  const collaborationBonus = Math.floor(totalCP / 5);

  const totalRoundContribution = Math.round(avgWeighted + equityBonus + collaborationBonus);

  return {
    weightedUtilities: entries,
    equityBonus,
    collaborationBonus,
    totalRoundContribution,
  };
}

function regenerateZoneResources(zones: Record<string, Zone>): Record<string, Zone> {
  const updated: Record<string, Zone> = {};
  for (const [id, zone] of Object.entries(zones)) {
    if (zone.isLocked || zone.condition === 'locked') {
      updated[id] = zone;
      continue;
    }

    const regenAmount = zone.condition === 'good' ? 2
      : zone.condition === 'fair' ? 1
      : 0;

    if (regenAmount > 0) {
      const res = { ...zone.resources };
      res[zone.primaryResourceType] = (res[zone.primaryResourceType] || 0) + regenAmount;
      updated[id] = { ...zone, resources: res };
    } else {
      updated[id] = zone;
    }
  }
  return updated;
}

function updateZoneConditions(
  zones: Record<string, Zone>,
  round: number
): Record<string, Zone> {
  const updated: Record<string, Zone> = {};
  for (const [id, zone] of Object.entries(zones)) {
    // Record condition history
    const historyEntry = { round, condition: zone.condition };
    const newHistory = [...zone.conditionHistory, historyEntry];

    // Degrade zone if too many problem markers
    let newCondition = zone.condition;
    if (zone.problemMarkers >= 3 && zone.condition !== 'critical' && zone.condition !== 'locked') {
      const currentLevel = ZONE_CONDITION_ORDER[zone.condition] ?? 3;
      const degraded = Math.max(1, currentLevel - 1);
      const condMap: Record<number, ZoneCondition> = { 1: 'critical', 2: 'poor', 3: 'fair', 4: 'good' };
      newCondition = condMap[degraded] || zone.condition;
    }

    // Improve zone if enough progress markers
    if (zone.progressMarkers >= 3 && zone.condition !== 'good') {
      const currentLevel = ZONE_CONDITION_ORDER[newCondition] ?? 3;
      const improved = Math.min(4, currentLevel + 1);
      const condMap: Record<number, ZoneCondition> = { 1: 'critical', 2: 'poor', 3: 'fair', 4: 'good' };
      newCondition = condMap[improved] || newCondition;
    }

    updated[id] = {
      ...zone,
      condition: newCondition,
      conditionHistory: newHistory,
      // Reset markers after applying
      problemMarkers: zone.problemMarkers >= 3 ? zone.problemMarkers - 3 : zone.problemMarkers,
      progressMarkers: zone.progressMarkers >= 3 ? zone.progressMarkers - 3 : zone.progressMarkers,
    };
  }
  return updated;
}

function checkLevelUp(player: Player): Player {
  const currentLevelEntry = LEVEL_TABLE.find((l) => l.level === player.level);
  const nextLevelEntry = LEVEL_TABLE.find((l) => l.level === player.level + 1);

  if (!nextLevelEntry) return player; // Already at max level

  if (player.collaborationPoints >= nextLevelEntry.cpRequired) {
    return {
      ...player,
      level: nextLevelEntry.level,
      proficiencyBonus: nextLevelEntry.proficiencyBonus,
      uniqueAbilityUsesRemaining: nextLevelEntry.uniqueAbilityUses,
    };
  }

  return player;
}

function decrementStatusEffects(player: Player): Player {
  const remaining = player.statusEffects
    .map((e) => ({ ...e, duration: e.duration - 1 }))
    .filter((e) => e.duration > 0);
  return { ...player, statusEffects: remaining };
}

function checkSurvivalGoals(player: Player): Player {
  const updatedGoals = { ...player.goals };
  const updatedSurvival = { ...updatedGoals.survival };
  const updatedSubGoals = updatedSurvival.subGoals.map((sg) => {
    if (sg.condition.type === 'resource_threshold') {
      const resource = sg.condition.params.resource as keyof ResourcePool;
      const minimum = sg.condition.params.minimum as number;
      return { ...sg, satisfied: player.resources[resource] >= minimum };
    }
    return sg;
  });
  updatedSurvival.subGoals = updatedSubGoals;
  updatedGoals.survival = updatedSurvival;
  return { ...player, goals: updatedGoals };
}

// ─── Public Phase Controller API ─────────────────────────────

/**
 * Start a given phase, returning the updated game state.
 */
export function startPhase(gameState: GameSession, phase: GamePhase): GameSession {
  let state: GameSession = {
    ...gameState,
    currentPhase: phase,
  };

  switch (phase) {
    case 'phase_1_event': {
      // Roll event die
      const { result, nextSeed } = rollEventDie(state.rngSeed);
      state = {
        ...state,
        rngSeed: nextSeed,
        eventDieResult: result,
        status: 'playing',
      };

      // If event triggered, draw and apply event card
      if (result.outcome === 'negative_event') {
        state = drawEventCard(state, 'negative');
      } else if (result.outcome === 'positive_event') {
        state = drawEventCard(state, 'positive');
      }
      break;
    }

    case 'phase_2_challenge': {
      state = drawChallenge(state);
      break;
    }

    case 'phase_3_deliberation': {
      state = startDeliberation(state);
      break;
    }

    case 'phase_4_action': {
      state = startActionResolution(state);
      break;
    }

    case 'phase_5_scoring': {
      state = runScoring(state);
      break;
    }

    default:
      // Other phases (setup, round_end, etc.) just set the current phase
      break;
  }

  return state;
}

/**
 * Process an action within the current phase.
 */
export function processPhaseAction(
  gameState: GameSession,
  action: { type: string; payload?: Record<string, any> }
): GameSession {
  switch (gameState.currentPhase) {
    case 'phase_3_deliberation': {
      if (action.type === 'PROPOSE_TRADE' && action.payload) {
        return {
          ...gameState,
          tradeOffers: [...gameState.tradeOffers, action.payload as any],
        };
      }
      return gameState;
    }

    case 'phase_4_action': {
      // Action processing is handled by actionProcessor
      return gameState;
    }

    default:
      return gameState;
  }
}

/**
 * End the current phase, returning the next phase and updated game state.
 */
export function endPhase(gameState: GameSession): { nextPhase: GamePhase; gameState: GameSession } {
  const phaseOrder: GamePhase[] = [
    'phase_1_event',
    'phase_2_challenge',
    'phase_3_deliberation',
    'phase_4_action',
    'phase_5_scoring',
    'round_end',
  ];

  const currentIndex = phaseOrder.indexOf(gameState.currentPhase);

  if (gameState.currentPhase === 'round_end') {
    // Check if this was the final round
    if (gameState.currentRound >= gameState.totalRounds) {
      return {
        nextPhase: 'game_end',
        gameState: { ...gameState, currentPhase: 'game_end', status: 'ended' },
      };
    }
    // Advance to next round
    return {
      nextPhase: 'phase_1_event',
      gameState: {
        ...gameState,
        currentRound: gameState.currentRound + 1,
        currentPhase: 'phase_1_event',
        eventDieResult: null,
        activeChallenge: null,
        activeSeries: null,
        activeCombination: null,
        tradeOffers: [],
      },
    };
  }

  if (currentIndex >= 0 && currentIndex < phaseOrder.length - 1) {
    const nextPhase = phaseOrder[currentIndex + 1];
    return {
      nextPhase,
      gameState: { ...gameState, currentPhase: nextPhase },
    };
  }

  // Fallback
  return { nextPhase: gameState.currentPhase, gameState };
}

/**
 * Check if the current phase is complete and can be advanced.
 */
export function isPhaseComplete(gameState: GameSession): boolean {
  switch (gameState.currentPhase) {
    case 'phase_1_event':
      // Complete after event die result is set
      return gameState.eventDieResult !== null;

    case 'phase_2_challenge':
      // Complete after challenge card is drawn
      return gameState.activeChallenge !== null;

    case 'phase_3_deliberation':
      // Complete when timer expires or externally signaled
      // This is controlled by the timer service or player readiness
      return false; // Must be externally ended

    case 'phase_4_action':
      // Complete when all players have acted
      return gameState.currentPlayerTurnIndex >= gameState.turnOrder.length;

    case 'phase_5_scoring':
      // Complete after scoring is calculated (always complete once started)
      return gameState.status === 'scoring' || gameState.currentPhase === 'phase_5_scoring';

    case 'round_end':
      return true;

    default:
      return false;
  }
}

// ─── Internal scoring pipeline ───────────────────────────────

function runScoring(gameState: GameSession): GameSession {
  let zones = updateZoneConditions(gameState.board.zones, gameState.currentRound);
  zones = regenerateZoneResources(zones);

  // Update player utilities, check level-ups, decrement status effects, check survival goals
  const players: Record<string, Player> = {};
  for (const [id, player] of Object.entries(gameState.players)) {
    let p = { ...player };
    p.utilityScore = calculateUtility(p, zones);
    p.utilityHistory = [...p.utilityHistory, p.utilityScore];
    p = checkLevelUp(p);
    p = decrementStatusEffects(p);
    p = checkSurvivalGoals(p);
    players[id] = p;
  }

  // Calculate CWS
  const breakdown = calculateCWSBreakdown(players, zones);
  const newCWS = gameState.cwsTracker.currentScore + breakdown.totalRoundContribution;
  const cwsTracker = {
    ...gameState.cwsTracker,
    currentScore: newCWS,
    history: [
      ...gameState.cwsTracker.history,
      { round: gameState.currentRound, score: newCWS, breakdown },
    ],
  };

  return {
    ...gameState,
    board: { ...gameState.board, zones },
    players,
    cwsTracker,
    status: 'scoring',
  };
}

export { calculateUtility, calculateCWSBreakdown };
