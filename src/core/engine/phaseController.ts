import {
  GameSession,
  GamePhase,
  EventDieResult,
  EventRollResult,
  ChallengeCard,
  Zone,
  ZoneCondition,
  Player,
  CWSBreakdown,
  ResourcePool,
  RoleId,
  ResourceType,
  CoalitionCombination,
} from '../models/types';
import {
  WELFARE_WEIGHTS,
  ZONE_CONDITION_ORDER,
  LEVEL_TABLE,
  PROFESSION_INCOME,
  EVENT_TABLE,
  CONDITION_TO_WELFARE,
  DEFAULT_ZONE_WEIGHTS,
  INVESTOR_ZONE_WEIGHT_OVERRIDES,
  GAME_LEVEL_THRESHOLDS,
  COMBINATION_MATRIX,
} from '../models/constants';
import { calculateTurnOrder } from './turnManager';

// ─── Seeded RNG helper ────────────────────────────────────────
function seededRandom(seed: number): { value: number; nextSeed: number } {
  const next = (seed * 1664525 + 1013904223) & 0x7fffffff;
  return { value: next / 0x7fffffff, nextSeed: next };
}

// ─── PHASE 1: Payment Day (Fix 5) ────────────────────────────
function processPaymentDay(gameState: GameSession): GameSession {
  const players = { ...gameState.players };
  const zones = gameState.board.zones;
  const isPublicHoliday = gameState.eventRollResult?.total === 9;
  const incomeMultiplier = isPublicHoliday ? 2 : 1;
  const levelBonus = Math.max(0, gameState.gameLevel - 1); // +1 per level above 1

  for (const [id, player] of Object.entries(players)) {
    const income = PROFESSION_INCOME[player.roleId];
    if (!income) continue;

    const res = { ...player.resources };

    // Apply base income
    for (const [key, val] of Object.entries(income.base)) {
      if (val > 0) {
        res[key as keyof ResourcePool] += (val + levelBonus) * incomeMultiplier;
      }
    }

    // Check bonus conditions
    const bonusMet = checkBonusCondition(player, income.bonusCondition, gameState);
    if (bonusMet && income.bonusAmount) {
      for (const [key, val] of Object.entries(income.bonusAmount)) {
        if (val && (val as number) > 0) {
          res[key as keyof ResourcePool] += (val as number) * incomeMultiplier;
        }
      }
    }

    // Check penalty conditions
    if (income.penaltyCondition && income.penaltyAmount) {
      const penaltyMet = checkPenaltyCondition(player, income.penaltyCondition, gameState);
      if (penaltyMet) {
        for (const [key, val] of Object.entries(income.penaltyAmount)) {
          if (val && (val as number) < 0) {
            res[key as keyof ResourcePool] = Math.max(0, res[key as keyof ResourcePool] + (val as number));
          }
        }
      }
    }

    players[id] = { ...player, resources: res };
  }

  // Common Pool Zones auto-income (Fix 1)
  const updatedZones = { ...gameState.board.zones };
  for (const [zoneId, zone] of Object.entries(updatedZones)) {
    if (zone.poolType === 'common' && zone.commonPoolConfig) {
      const res = { ...zone.resources };
      const resourceType = zone.commonPoolConfig.resourceType;
      res[resourceType] = (res[resourceType] || 0) + zone.commonPoolConfig.autoIncomePerRound;
      updatedZones[zoneId] = {
        ...zone,
        resources: res,
        investedThisRound: false, // Reset at round start
      };
    } else {
      updatedZones[zoneId] = { ...zone, investedThisRound: false };
    }
  }

  return {
    ...gameState,
    players,
    board: { ...gameState.board, zones: updatedZones },
    zonesInvestedThisRound: [],
  };
}

function checkBonusCondition(player: Player, condition: string, gameState: GameSession): boolean {
  switch (player.roleId) {
    case 'citizen': {
      const playground = gameState.board.zones['playground'];
      const walkingTrack = gameState.board.zones['walking_track'];
      return (
        (playground && ['fair', 'good'].includes(playground.condition)) ||
        (walkingTrack && ['fair', 'good'].includes(walkingTrack.condition))
      );
    }
    case 'advocate': {
      // Check if any active challenge is a crisis
      if (gameState.activeChallenge) {
        return gameState.activeChallenge.some(c =>
          c.publicFace?.category === 'crisis' || c.category === 'crisis'
        );
      }
      return false;
    }
    case 'administrator':
      return gameState.eventRollResult?.total !== 4;
    case 'designer':
      return player.resolvedChallengeLastRound;
    case 'investor':
      return player.revenueTokens.length > 0;
    default:
      return false;
  }
}

function checkPenaltyCondition(player: Player, condition: string, gameState: GameSession): boolean {
  switch (player.roleId) {
    case 'administrator':
      return gameState.eventRollResult?.total === 4;
    case 'investor': {
      // Check if investor visited/invested in any zone last round
      const invested = (gameState.zonesInvestedThisRound as string[]).some(zoneId => {
        const zone = gameState.board.zones[zoneId];
        return zone?.playerStandees.includes(player.id);
      });
      return !invested;
    }
    default:
      return false;
  }
}

// ─── PHASE 2: Event Roll (Fix 3: 2d6) ───────────────────────
function rollEventDie2d6(seed: number): { dice: [number, number]; total: number; nextSeed: number } {
  const { value: v1, nextSeed: s1 } = seededRandom(seed);
  const { value: v2, nextSeed: s2 } = seededRandom(s1);
  const d1 = Math.floor(v1 * 6) + 1;
  const d2 = Math.floor(v2 * 6) + 1;
  return { dice: [d1, d2], total: d1 + d2, nextSeed: s2 };
}

function processEventRoll(gameState: GameSession): GameSession {
  const { dice, total, nextSeed } = rollEventDie2d6(gameState.rngSeed);

  // Find matching event entry
  const eventEntry = EVENT_TABLE.find(e => e.roll === total) || EVENT_TABLE.find(e => e.roll === 7)!;

  // Determine affected players
  const affectedPlayers: string[] = [];
  if (eventEntry.requiredPlayers === 'all') {
    affectedPlayers.push(...Object.keys(gameState.players));
  } else {
    for (const [pid, player] of Object.entries(gameState.players)) {
      if ((eventEntry.requiredPlayers as RoleId[]).includes(player.roleId)) {
        affectedPlayers.push(pid);
      }
    }
  }

  const eventRollResult: EventRollResult = {
    dice,
    total,
    eventEntry,
    affectedZones: [],
    affectedPlayers,
    phaseTriggered: eventEntry.phaseTriggered,
    deliberationPlayerCount: affectedPlayers.length,
  };

  // Legacy EventDieResult for backward compat
  const eventDieResult: EventDieResult = {
    value: total,
    outcome: total <= 4 ? 'negative_event' : total >= 9 ? 'positive_event' : 'no_event',
  };

  // Apply zone effects based on the event
  let state: GameSession = {
    ...gameState,
    rngSeed: nextSeed,
    eventDieResult,
    eventRollResult,
  };

  state = applyEventTableEffects(state, eventEntry, total);

  return state;
}

function applyEventTableEffects(gameState: GameSession, entry: EventTableEntry, roll: number): GameSession {
  const zones = { ...gameState.board.zones };
  const players = { ...gameState.players };

  switch (roll) {
    case 2: {
      // Infrastructure Collapse: random zone loses 2 resources
      const zoneIds = Object.keys(zones).filter(z => !zones[z].isLocked);
      if (zoneIds.length > 0) {
        const { value, nextSeed } = seededRandom(gameState.rngSeed);
        const targetZone = zoneIds[Math.floor(value * zoneIds.length)];
        const zone = zones[targetZone];
        const res = { ...zone.resources };
        res[zone.primaryResourceType] = Math.max(0, res[zone.primaryResourceType] - 2);
        zones[targetZone] = { ...zone, resources: res };
        // Administrator loses 1 budget
        for (const p of Object.values(players)) {
          if (p.roleId === 'administrator') {
            const pRes = { ...p.resources };
            pRes.budget = Math.max(0, pRes.budget - 1);
            players[p.id] = { ...p, resources: pRes };
          }
        }
        return { ...gameState, board: { ...gameState.board, zones }, players, rngSeed: nextSeed };
      }
      break;
    }
    case 3: {
      // Community Protest: boating_pond or restroom_block escalates
      const target = zones['boating_pond']?.condition === 'critical' ? 'restroom_block' : 'boating_pond';
      if (zones[target]) {
        const currentLevel = ZONE_CONDITION_ORDER[zones[target].condition] ?? 2;
        const degraded = Math.max(1, currentLevel - 1);
        const condMap: Record<number, ZoneCondition> = { 1: 'critical', 2: 'poor', 3: 'fair', 4: 'good' };
        zones[target] = { ...zones[target], condition: condMap[degraded] || zones[target].condition };
      }
      // Citizen draws extra card
      for (const p of Object.values(players)) {
        if (p.roleId === 'citizen' && p.drawPile.length > 0) {
          const drawPile = [...p.drawPile];
          const card = drawPile.shift()!;
          players[p.id] = { ...p, hand: [...p.hand, card], drawPile };
        }
      }
      break;
    }
    case 4: {
      // Budget Cut: Common Pool Zones lose 1 resource
      for (const [zid, zone] of Object.entries(zones)) {
        if (zone.poolType === 'common' && zone.commonPoolConfig) {
          const res = { ...zone.resources };
          res[zone.commonPoolConfig.resourceType] = Math.max(0, res[zone.commonPoolConfig.resourceType] - 1);
          zones[zid] = { ...zone, resources: res };
        }
      }
      // Administrator gets status effect blocking funding-tagged cards
      for (const p of Object.values(players)) {
        if (p.roleId === 'administrator') {
          players[p.id] = {
            ...p,
            statusEffects: [...p.statusEffects, {
              id: `budget_cut_${Date.now()}`,
              name: 'Budget Cut',
              description: 'Cannot play funding-tagged cards this round',
              abilityModifiers: {},
              resourceModifiers: {},
              duration: 1,
              source: 'event_budget_cut',
            }],
          };
        }
      }
      break;
    }
    case 5: {
      // Monsoon Damage: boating_pond resources halved
      if (zones['boating_pond']) {
        const res = { ...zones['boating_pond'].resources };
        for (const key of Object.keys(res) as ResourceType[]) {
          res[key] = Math.floor(res[key] / 2);
        }
        zones['boating_pond'] = { ...zones['boating_pond'], resources: res };
      }
      break;
    }
    case 6: {
      // Media Spotlight: highest-CWS zone gains +1 resource
      let bestZone: Zone | null = null;
      let bestScore = -1;
      for (const zone of Object.values(zones)) {
        const score = CONDITION_TO_WELFARE[zone.condition] || 0;
        if (score > bestScore) {
          bestScore = score;
          bestZone = zone;
        }
      }
      if (bestZone) {
        const res = { ...bestZone.resources };
        res[bestZone.primaryResourceType] += 1;
        zones[bestZone.id] = { ...bestZone, resources: res };
      }
      break;
    }
    case 7: {
      // Neutral: all players draw 1 extra card
      for (const [pid, p] of Object.entries(players)) {
        if (p.drawPile.length > 0) {
          const drawPile = [...p.drawPile];
          const card = drawPile.shift()!;
          players[pid] = { ...p, hand: [...p.hand, card], drawPile };
        }
      }
      break;
    }
    case 8: {
      // Grant Unlocked: ppp_zone gains +2 budget
      if (zones['ppp_zone']) {
        const res = { ...zones['ppp_zone'].resources };
        res.budget += 2;
        zones['ppp_zone'] = { ...zones['ppp_zone'], resources: res };
      }
      break;
    }
    case 9: {
      // Public Holiday: handled in Payment Day (income doubled)
      // Already applied via multiplier in processPaymentDay
      break;
    }
    case 10: {
      // Developer Interest: ppp_zone escalates
      if (zones['ppp_zone']) {
        zones['ppp_zone'] = {
          ...zones['ppp_zone'],
          problemMarkers: zones['ppp_zone'].problemMarkers + 1,
        };
      }
      break;
    }
    case 11: {
      // Political Scrutiny: just informational
      break;
    }
    case 12: {
      // Community Festival: all common pool zones gain +1
      for (const [zid, zone] of Object.entries(zones)) {
        if (zone.poolType === 'common' && zone.commonPoolConfig) {
          const res = { ...zone.resources };
          res[zone.commonPoolConfig.resourceType] += 1;
          zones[zid] = { ...zone, resources: res };
        }
      }
      // Citizen draws a bonus card
      for (const p of Object.values(players)) {
        if (p.roleId === 'citizen' && p.drawPile.length > 0) {
          const drawPile = [...p.drawPile];
          const card = drawPile.shift()!;
          players[p.id] = { ...p, hand: [...p.hand, card], drawPile };
        }
      }
      break;
    }
  }

  return { ...gameState, board: { ...gameState.board, zones }, players };
}

// ─── PHASE 3: Individual Action ──────────────────────────────
function startIndividualAction(gameState: GameSession): GameSession {
  const turnOrder = calculateTurnOrder(gameState.players);
  const players = { ...gameState.players };

  // Reset per-round action tracking
  for (const [pid, p] of Object.entries(players)) {
    players[pid] = { ...p, cardsPlayedThisRound: 0, passedIndividualAction: false };
  }

  return {
    ...gameState,
    turnOrder,
    currentPlayerTurnIndex: 0,
    players,
    activeSeries: null,
    activeCombination: null,
    status: 'playing',
  };
}

// ─── PHASE 4: Deliberation ──────────────────────────────────
function startDeliberation(gameState: GameSession): GameSession {
  // Check promises from previous rounds
  let state = checkPromises(gameState);

  return {
    ...state,
    currentPhase: 'deliberation',
    status: 'deliberation',
    tradeOffers: [],
    activeCoalitions: [],
  };
}

function checkPromises(gameState: GameSession): GameSession {
  const promises = [...gameState.promises];
  const players = { ...gameState.players };

  for (let i = 0; i < promises.length; i++) {
    const promise = promises[i];
    if (promise.fulfilled || promise.broken) continue;

    if (promise.promisedRound <= gameState.currentRound && !promise.fulfilled) {
      // Promise is due — mark as broken
      promises[i] = { ...promise, broken: true };

      // Promisor loses 2 community trust for 2 rounds
      const promisor = players[promise.fromPlayerId];
      if (promisor) {
        players[promise.fromPlayerId] = {
          ...promisor,
          communityTrustPenalty: (promisor.communityTrustPenalty || 0) + 2,
          communityTrustPenaltyRoundsLeft: 2,
        };
      }

      // Promisee gains +1 influence
      const promisee = players[promise.toPlayerId];
      if (promisee) {
        const res = { ...promisee.resources };
        res.influence += 1;
        players[promise.toPlayerId] = { ...promisee, resources: res };
      }
    }
  }

  return { ...gameState, promises, players };
}

// ─── PHASE 5: Action Resolution (Fix 4) ─────────────────────
function startActionResolution(gameState: GameSession): GameSession {
  const turnOrder = calculateTurnOrder(gameState.players);
  return {
    ...gameState,
    currentPhase: 'action_resolution',
    status: 'resolution',
    turnOrder,
    currentPlayerTurnIndex: 0,
  };
}

// ─── PHASE 6: Round-End Accounting ──────────────────────────
function processRoundEndAccounting(gameState: GameSession): GameSession {
  let zones = { ...gameState.board.zones };
  const investedZones = new Set(gameState.zonesInvestedThisRound as string[]);

  // 1. Common Pool Zone Decay (Fix 1)
  for (const [zoneId, zone] of Object.entries(zones)) {
    if (zone.poolType === 'common' && zone.commonPoolConfig && !zone.investedThisRound) {
      const res = { ...zone.resources };
      const rt = zone.commonPoolConfig.resourceType;
      res[rt] = Math.max(0, res[rt] - zone.commonPoolConfig.decayPerRoundIfNeglected);
      zones[zoneId] = { ...zone, resources: res };
    }
  }

  // 2. Zone Condition Auto-Degradation
  for (const [zoneId, zone] of Object.entries(zones)) {
    if (
      (zone.condition === 'poor' || zone.condition === 'critical') &&
      !investedZones.has(zoneId) &&
      !zone.isLocked
    ) {
      const currentLevel = ZONE_CONDITION_ORDER[zone.condition] ?? 2;
      const degraded = Math.max(1, currentLevel - 1);
      const condMap: Record<number, ZoneCondition> = { 1: 'critical', 2: 'poor', 3: 'fair', 4: 'good' };
      zones[zoneId] = { ...zones[zoneId], condition: condMap[degraded] || zone.condition };
    }
  }

  // 3. Zone condition updates from markers
  zones = updateZoneConditions(zones, gameState.currentRound);

  // 4. Resource regeneration
  zones = regenerateZoneResources(zones);

  // 5. Revenue Token Collection (investor)
  const players: Record<string, Player> = {};
  for (const [id, player] of Object.entries(gameState.players)) {
    let p = { ...player };

    // Revenue token collection
    if (p.roleId === 'investor' && p.revenueTokens.length > 0) {
      const res = { ...p.resources };
      res.budget += p.revenueTokens.length; // +1 budget per revenue token
      p = { ...p, resources: res };
    }

    // Update utilities
    p.utilityScore = calculateUtility(p, zones);
    p.utilityHistory = [...p.utilityHistory, p.utilityScore];

    // Check level ups
    p = checkLevelUp(p);

    // Decrement status effects
    p = decrementStatusEffects(p);

    // Decrement community trust penalty
    if (p.communityTrustPenaltyRoundsLeft > 0) {
      p = {
        ...p,
        communityTrustPenaltyRoundsLeft: p.communityTrustPenaltyRoundsLeft - 1,
        communityTrustPenalty: p.communityTrustPenaltyRoundsLeft <= 1 ? 0 : p.communityTrustPenalty,
      };
    }

    // Check survival goals
    p = checkSurvivalGoals(p);

    // Hand refill
    p = refillHand(p);

    players[id] = p;
  }

  // 6. CWS Calculation
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

function refillHand(player: Player): Player {
  const levelEntry = LEVEL_TABLE.find(l => l.level === player.level) || LEVEL_TABLE[0];
  const handSize = levelEntry.handSize;

  if (player.hand.length >= handSize) return player;

  const drawPile = [...player.drawPile];
  let discardPile = [...player.discardPile];
  const hand = [...player.hand];

  while (hand.length < handSize && (drawPile.length > 0 || discardPile.length > 0)) {
    if (drawPile.length === 0 && discardPile.length > 0) {
      // Shuffle discard into draw pile
      const shuffled = [...discardPile].sort(() => Math.random() - 0.5);
      drawPile.push(...shuffled);
      discardPile = [];
    }
    if (drawPile.length > 0) {
      hand.push(drawPile.shift()!);
    }
  }

  return { ...player, hand, drawPile, discardPile };
}

// ─── PHASE 7: Level Check (Fix 5) ───────────────────────────
function processLevelCheck(gameState: GameSession): { gameState: GameSession; leveledUp: boolean } {
  const currentLevel = gameState.gameLevel;
  const zones = Object.values(gameState.board.zones);

  if (currentLevel === 1) {
    // Check: 3+ zones at fair or better
    const fairOrBetter = zones.filter(z => ['good', 'fair'].includes(z.condition)).length;
    if (fairOrBetter >= 3) {
      return {
        gameState: applyLevelUp(gameState, 2),
        leveledUp: true,
      };
    }
  } else if (currentLevel === 2) {
    // Check: full coalition achieved
    if (gameState.fullCoalitionAchieved) {
      return {
        gameState: applyLevelUp(gameState, 3),
        leveledUp: true,
      };
    }
  } else if (currentLevel === 3) {
    // Check: all zones fair or better
    const allFairOrBetter = zones.every(z => ['good', 'fair'].includes(z.condition) || z.isLocked);
    if (allFairOrBetter) {
      // Game ends
      return {
        gameState: { ...gameState, status: 'ended' },
        leveledUp: false,
      };
    }
  }

  return { gameState, leveledUp: false };
}

function applyLevelUp(gameState: GameSession, newLevel: number): GameSession {
  let state = { ...gameState, gameLevel: newLevel };

  // Payment Day incomes increase automatically via levelBonus in processPaymentDay
  // New challenge cards would be added to deck here in a full implementation

  return state;
}

// ─── Scoring helpers ─────────────────────────────────────────

function conditionToScore(condition: ZoneCondition): number {
  return CONDITION_TO_WELFARE[condition] || 0;
}

function calculateUtility(player: Player, zones: Record<string, Zone>): number {
  const resourceTotal =
    player.resources.budget +
    player.resources.influence +
    player.resources.volunteer +
    player.resources.material +
    player.resources.knowledge;

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

  const focusZone = zones[player.focusZoneId];
  const zoneBonus = focusZone ? conditionToScore(focusZone.condition) * 2 : 0;
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

  const utilities = entries.map((e) => e.utility);
  const mean = utilities.length > 0
    ? utilities.reduce((s, u) => s + u, 0) / utilities.length
    : 0;
  const variance = utilities.length > 0
    ? utilities.reduce((s, u) => s + (u - mean) ** 2, 0) / utilities.length
    : 0;
  const stdDev = Math.sqrt(variance);
  const equityBonus = Math.max(0, Math.round(5 - stdDev));

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
    const historyEntry = { round, condition: zone.condition };
    const newHistory = [...zone.conditionHistory, historyEntry];

    let newCondition = zone.condition;
    if (zone.problemMarkers >= 3 && zone.condition !== 'critical' && zone.condition !== 'locked') {
      const currentLevel = ZONE_CONDITION_ORDER[zone.condition] ?? 3;
      const degraded = Math.max(1, currentLevel - 1);
      const condMap: Record<number, ZoneCondition> = { 1: 'critical', 2: 'poor', 3: 'fair', 4: 'good' };
      newCondition = condMap[degraded] || zone.condition;
    }

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
      problemMarkers: zone.problemMarkers >= 3 ? zone.problemMarkers - 3 : zone.problemMarkers,
      progressMarkers: zone.progressMarkers >= 3 ? zone.progressMarkers - 3 : zone.progressMarkers,
    };
  }
  return updated;
}

function checkLevelUp(player: Player): Player {
  const nextLevelEntry = LEVEL_TABLE.find((l) => l.level === player.level + 1);
  if (!nextLevelEntry) return player;

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

// ─── Fix 4: Coalition Resolution ─────────────────────────────
export function resolveCoalitions(gameState: GameSession): GameSession {
  let state = { ...gameState };
  const coalitions = [...state.activeCoalitions];

  for (let i = 0; i < coalitions.length; i++) {
    const coalition = coalitions[i];
    if (coalition.resolved) continue;

    const participantRoles = coalition.participants.map(p => p.roleId).sort();

    // Check Full Coalition (all 5 players)
    if (coalition.combinationType === 'full' && participantRoles.length >= 5) {
      coalitions[i] = {
        ...coalition,
        resolved: true,
        success: true,
        bonusOutcome: 'Full Coalition achieved! Maximum CWS bonus.',
      };
      state = applyFullCoalitionReward(state, coalition);
      continue;
    }

    // Check Combination Matrix
    const match = findCombinationMatch(coalition);
    if (match) {
      coalitions[i] = {
        ...coalition,
        resolved: true,
        success: true,
        bonusOutcome: match.bonusDescription,
      };
      state = applyCombinationReward(state, coalition, match);
    } else {
      // Failed coalition — resources NOT returned
      coalitions[i] = {
        ...coalition,
        resolved: true,
        success: false,
        bonusOutcome: 'Coalition failed — individual effects only',
      };
    }
  }

  return { ...state, activeCoalitions: coalitions };
}

function findCombinationMatch(coalition: CoalitionCombination): typeof COMBINATION_MATRIX[0] | null {
  const roles = coalition.participants.map(p => p.roleId).sort();
  const allTags = coalition.participants.flatMap(p => p.cardsPlayed.flatMap(c => c.tags));

  for (const entry of COMBINATION_MATRIX) {
    const entryRoles = [...entry.roles].sort();
    if (entryRoles.length !== roles.length) continue;
    if (!entryRoles.every((r, i) => r === roles[i])) continue;

    // Check tag requirements — at least one tag from each required set must be present
    const tagsMatch = entry.requiredTags.every(tagSet =>
      tagSet.some(tag => allTags.includes(tag))
    );
    if (tagsMatch) return entry;
  }

  // Check generic multi-player combinations
  if (roles.length >= 3 && roles.length < 5) {
    return {
      roles: roles as RoleId[],
      requiredTags: [],
      bonusDescription: `${roles.length}-player coalition bonus`,
      bonusEffects: [
        { type: 'modify_zone_condition', target: 'zone', params: { improveBy: roles.length >= 4 ? 2 : 1 } },
        { type: 'grant_cp', target: 'participants', params: { amount: roles.length >= 4 ? 3 : 2 } },
        { type: 'cws_bonus', params: { amount: roles.length >= 4 ? 5 : 3 } },
      ],
    };
  }

  return null;
}

function applyFullCoalitionReward(gameState: GameSession, coalition: CoalitionCombination): GameSession {
  const players = { ...gameState.players };

  // +4 CP and bonus to all participants
  for (const p of coalition.participants) {
    const player = players[p.playerId];
    if (player) {
      players[p.playerId] = {
        ...player,
        collaborationPoints: player.collaborationPoints + 4,
      };
    }
  }

  // +8 CWS
  const cwsTracker = {
    ...gameState.cwsTracker,
    currentScore: gameState.cwsTracker.currentScore + 8,
  };

  // Improve target zone to maximum
  const zones = { ...gameState.board.zones };
  if (zones[coalition.targetZoneId]) {
    zones[coalition.targetZoneId] = {
      ...zones[coalition.targetZoneId],
      condition: 'good',
      problemMarkers: 0,
      activeProblems: [],
    };
  }

  return {
    ...gameState,
    players,
    cwsTracker,
    board: { ...gameState.board, zones },
    fullCoalitionAchieved: true,
  };
}

function applyCombinationReward(
  gameState: GameSession,
  coalition: CoalitionCombination,
  entry: typeof COMBINATION_MATRIX[0]
): GameSession {
  let state = { ...gameState };
  const players = { ...state.players };
  const zones = { ...state.board.zones };

  for (const effect of entry.bonusEffects) {
    switch (effect.type) {
      case 'modify_zone_condition': {
        const zone = zones[coalition.targetZoneId];
        if (zone) {
          const currentLevel = ZONE_CONDITION_ORDER[zone.condition] ?? 2;
          const improved = Math.min(4, currentLevel + (effect.params.improveBy || 1));
          const condMap: Record<number, ZoneCondition> = { 1: 'critical', 2: 'poor', 3: 'fair', 4: 'good' };
          zones[coalition.targetZoneId] = { ...zone, condition: condMap[improved] || zone.condition };
        }
        break;
      }
      case 'grant_cp': {
        for (const p of coalition.participants) {
          const player = players[p.playerId];
          if (player) {
            players[p.playerId] = {
              ...player,
              collaborationPoints: player.collaborationPoints + (effect.params.amount || 1),
            };
          }
        }
        break;
      }
      case 'cws_bonus': {
        state = {
          ...state,
          cwsTracker: {
            ...state.cwsTracker,
            currentScore: state.cwsTracker.currentScore + (effect.params.amount || 0),
          },
        };
        break;
      }
      case 'remove_problem_marker': {
        const zone = zones[coalition.targetZoneId];
        if (zone) {
          zones[coalition.targetZoneId] = {
            ...zone,
            problemMarkers: 0,
            activeProblems: effect.params.all ? [] : zone.activeProblems,
          };
        }
        break;
      }
      case 'add_resources': {
        const zone = zones[coalition.targetZoneId];
        if (zone) {
          const res = { ...zone.resources };
          for (const [key, val] of Object.entries(effect.params)) {
            if (key in res) {
              res[key as keyof ResourcePool] += val as number;
            }
          }
          zones[coalition.targetZoneId] = { ...zone, resources: res };
        }
        break;
      }
    }
  }

  return { ...state, players, board: { ...state.board, zones } };
}

// ─── Fix 6: Game Graph ───────────────────────────────────────
export function updateGameGraph(gameState: GameSession): GameSession {
  const zones = Object.values(gameState.board.zones);
  const round = gameState.currentRound;
  const graph = { ...gameState.gameGraph };

  // Create vertices for this round
  const newVertices = zones.map(zone => ({
    id: `${zone.id}_r${round}`,
    zoneId: zone.id,
    round,
    configuration: {
      welfareScore: CONDITION_TO_WELFARE[zone.condition] || 0,
      activeLayer: gameState.gameLevel,
      activeCrisis: zone.activeProblems.length > 0 ? zone.activeProblems[0] : null,
      resourcesInvested: Object.values(zone.resources).reduce((s, v) => s + v, 0),
      condition: zone.condition,
      isCommonPool: zone.poolType === 'common',
    },
  }));

  // Create edges based on relationships
  const newEdges = createGraphEdges(gameState, round);

  // Calculate VO
  const objectiveFunction = calculateObjectiveFunction(gameState);

  // Create snapshot
  const snapshot = {
    round,
    vertices: newVertices,
    edges: newEdges,
    vo: objectiveFunction.currentVO,
    timestamp: new Date().toISOString(),
  };

  return {
    ...gameState,
    gameGraph: {
      vertices: [...graph.vertices, ...newVertices],
      edges: [...graph.edges, ...newEdges],
      objectiveFunction,
      snapshots: [...graph.snapshots, snapshot],
    },
  };
}

function createGraphEdges(gameState: GameSession, round: number) {
  const edges: GameSession['gameGraph']['edges'] = [];
  const adjacency = gameState.board.adjacency;
  const zones = gameState.board.zones;

  for (const [zoneId, neighbors] of Object.entries(adjacency)) {
    for (const neighbor of neighbors) {
      const edgeId = `${zoneId}_${neighbor}_r${round}`;
      // Only create one direction to avoid duplicates
      if (zoneId > neighbor) continue;

      const zone = zones[zoneId];
      const neighborZone = zones[neighbor];
      if (!zone || !neighborZone) continue;

      // Check for shared stakeholder
      const sharedPlayers = zone.playerStandees.filter(p => neighborZone.playerStandees.includes(p));
      const sharedStakeholder = sharedPlayers.length > 0
        ? gameState.players[sharedPlayers[0]]?.roleId || null
        : null;

      // Determine edge type
      let edgeType: 'negotiation' | 'crisis_propagation' | 'resource_dependency' | 'stakeholder_shared' = 'stakeholder_shared';
      if (zone.condition === 'critical' || neighborZone.condition === 'critical') {
        edgeType = 'crisis_propagation';
      } else if (zone.poolType === 'common' || neighborZone.poolType === 'common') {
        edgeType = 'resource_dependency';
      }

      // Check if a trade happened between players in these zones
      const tradeActivated = gameState.tradeOffers.some(t =>
        t.status === 'completed' || t.status === 'accepted'
      );

      edges.push({
        id: edgeId,
        fromVertexId: `${zoneId}_r${round}`,
        toVertexId: `${neighbor}_r${round}`,
        edgeType,
        sharedStakeholder,
        weight: sharedPlayers.length + (tradeActivated ? 1 : 0),
        description: `${zone.name} - ${neighborZone.name}`,
        wasActivated: tradeActivated || sharedPlayers.length > 0,
        activatedInRound: tradeActivated ? round : null,
      });
    }
  }

  return edges;
}

function calculateObjectiveFunction(gameState: GameSession): GameSession['gameGraph']['objectiveFunction'] {
  const zones = Object.values(gameState.board.zones);
  const players = Object.values(gameState.players);

  const zoneContributions = zones.map(zone => {
    // Average weight across all players' perspectives
    let totalWeight = 0;
    for (const player of players) {
      const override = player.roleId === 'investor'
        ? (INVESTOR_ZONE_WEIGHT_OVERRIDES[zone.id] || DEFAULT_ZONE_WEIGHTS[zone.id] || 2)
        : (DEFAULT_ZONE_WEIGHTS[zone.id] || 2);
      totalWeight += override;
    }
    const avgWeight = players.length > 0 ? totalWeight / players.length : DEFAULT_ZONE_WEIGHTS[zone.id] || 2;
    const welfareScore = CONDITION_TO_WELFARE[zone.condition] || 0;

    return {
      zoneId: zone.id,
      weight: avgWeight,
      welfareScore,
      contribution: avgWeight * welfareScore,
    };
  });

  const currentVO = zoneContributions.reduce((s, zc) => s + zc.contribution, 0);
  const maxPossibleVO = zoneContributions.reduce((s, zc) => s + zc.weight * 4, 0); // max welfare = 4 (good)

  return {
    formula: 'VO = Sum(Wi x Si) for all zones i',
    currentVO,
    maxPossibleVO,
    zoneContributions,
    thresholdVO: maxPossibleVO * 0.6, // 60% of max as target
  };
}

// ─── Challenge draw (kept from original) ─────────────────────
function drawChallenge(gameState: GameSession): GameSession {
  const deck = [...gameState.decks.challengeDeck];
  const discard = [...gameState.decks.challengeDiscard];

  if (deck.length === 0) {
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

// ─── Legacy event card draw (still used for deck-based events) ──
function drawEventCard(
  gameState: GameSession,
  type: 'negative' | 'positive'
): GameSession {
  const deck = [...gameState.decks.eventDeck];
  const discard = [...gameState.decks.eventDiscard];

  const matchingIndex = deck.findIndex((c) => c.type === type);
  if (matchingIndex === -1) return gameState;

  const [card] = deck.splice(matchingIndex, 1);
  discard.push(card);

  let updatedState: GameSession = {
    ...gameState,
    decks: { ...gameState.decks, eventDeck: deck, eventDiscard: discard },
  };

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
        zones[effect.target] = { ...zone, problemMarkers: zone.problemMarkers + (effect.params.count || 1) };
      }
      break;
    }
    case 'remove_problem_marker': {
      const zone = zones[effect.target];
      if (zone) {
        zones[effect.target] = { ...zone, problemMarkers: Math.max(0, zone.problemMarkers - (effect.params.count || 1)) };
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
        const conditionMap: Record<number, ZoneCondition> = { 1: 'critical', 2: 'poor', 3: 'fair', 4: 'good' };
        zones[effect.target] = { ...zone, condition: conditionMap[newLevel] || zone.condition };
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
          res[key as keyof ResourcePool] = Math.max(0, (res[key as keyof ResourcePool] || 0) + (val as number));
        }
        players[effect.target] = { ...player, resources: res };
      }
      break;
    }
    case 'modify_player_ability_temp': {
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
    case 'grant_tokens': {
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
      break;
  }

  return { ...gameState, board: { ...gameState.board, zones }, players };
}

// ─── Public Phase Controller API ─────────────────────────────

export function startPhase(gameState: GameSession, phase: GamePhase): GameSession {
  let state: GameSession = { ...gameState, currentPhase: phase };

  switch (phase) {
    // Fix 5: New 7-phase system
    case 'payment_day': {
      state = processPaymentDay(state);
      state = { ...state, status: 'playing' };
      break;
    }

    case 'event_roll': {
      state = processEventRoll(state);
      // Also draw a challenge card during event roll phase
      state = drawChallenge(state);
      break;
    }

    case 'individual_action': {
      state = startIndividualAction(state);
      break;
    }

    case 'deliberation': {
      state = startDeliberation(state);
      break;
    }

    case 'action_resolution': {
      state = startActionResolution(state);
      break;
    }

    case 'round_end_accounting': {
      state = processRoundEndAccounting(state);
      state = updateGameGraph(state);
      break;
    }

    case 'level_check': {
      const { gameState: checkedState } = processLevelCheck(state);
      state = checkedState;
      break;
    }

    // Legacy phase support (maps to new phases)
    case 'phase_1_event' as any: {
      state = processPaymentDay(state);
      state = processEventRoll(state);
      state = { ...state, status: 'playing' };
      break;
    }

    case 'phase_2_challenge' as any: {
      state = drawChallenge(state);
      break;
    }

    case 'phase_3_deliberation' as any: {
      state = startDeliberation(state);
      break;
    }

    case 'phase_4_action' as any: {
      state = startActionResolution(state);
      break;
    }

    case 'phase_5_scoring' as any: {
      state = processRoundEndAccounting(state);
      break;
    }

    default:
      break;
  }

  return state;
}

export function processPhaseAction(
  gameState: GameSession,
  action: { type: string; payload?: Record<string, any> }
): GameSession {
  switch (gameState.currentPhase) {
    case 'deliberation': {
      if (action.type === 'PROPOSE_TRADE' && action.payload) {
        return {
          ...gameState,
          tradeOffers: [...gameState.tradeOffers, action.payload as any],
        };
      }
      if (action.type === 'FORM_COALITION' && action.payload) {
        const coalition: CoalitionCombination = {
          id: `coalition_${Date.now()}`,
          participants: action.payload.participants || [],
          targetZoneId: action.payload.targetZoneId || '',
          combinationType: action.payload.combinationType || 'pair',
          bonusOutcome: '',
          resolved: false,
          success: false,
        };
        return {
          ...gameState,
          activeCoalitions: [...gameState.activeCoalitions, coalition],
        };
      }
      if (action.type === 'MAKE_PROMISE' && action.payload) {
        const promise = action.payload as any;
        return {
          ...gameState,
          promises: [...gameState.promises, promise],
        };
      }
      return gameState;
    }

    case 'action_resolution': {
      return gameState;
    }

    default:
      return gameState;
  }
}

export function endPhase(gameState: GameSession): { nextPhase: GamePhase; gameState: GameSession } {
  const phaseOrder: GamePhase[] = [
    'payment_day',
    'event_roll',
    'individual_action',
    'deliberation',
    'action_resolution',
    'round_end_accounting',
    'level_check',
    'round_end',
  ];

  const currentIndex = phaseOrder.indexOf(gameState.currentPhase);

  if (gameState.currentPhase === 'round_end') {
    if (gameState.currentRound >= gameState.totalRounds || gameState.status === 'ended') {
      return {
        nextPhase: 'game_end',
        gameState: { ...gameState, currentPhase: 'game_end', status: 'ended' },
      };
    }
    return {
      nextPhase: 'payment_day',
      gameState: {
        ...gameState,
        currentRound: gameState.currentRound + 1,
        currentPhase: 'payment_day',
        eventDieResult: null,
        eventRollResult: null,
        activeChallenge: null,
        activeSeries: null,
        activeCombination: null,
        activeCoalitions: [],
        tradeOffers: [],
        zonesInvestedThisRound: [],
      },
    };
  }

  // Handle event_roll → deliberation branching
  // If event triggers deliberation, go to deliberation BEFORE individual_action
  if (gameState.currentPhase === 'event_roll') {
    const pt = gameState.eventRollResult?.phaseTriggered;
    if (pt === 'deliberation_all' || pt === 'deliberation_partial') {
      console.log('endPhase: event triggered deliberation:', pt);
      return {
        nextPhase: 'deliberation',
        gameState: { ...gameState, currentPhase: 'deliberation' },
      };
    }
    // Otherwise fall through to default: event_roll → individual_action
  }

  // Handle deliberation → individual_action (after event-triggered deliberation)
  if (gameState.currentPhase === 'deliberation') {
    return {
      nextPhase: 'individual_action',
      gameState: { ...gameState, currentPhase: 'individual_action' },
    };
  }

  // Handle individual_action → action_resolution (always, since deliberation is handled above)
  if (gameState.currentPhase === 'individual_action') {
    console.log('endPhase: individual_action complete → action_resolution');
    return {
      nextPhase: 'action_resolution',
      gameState: { ...gameState, currentPhase: 'action_resolution' },
    };
  }

  if (currentIndex >= 0 && currentIndex < phaseOrder.length - 1) {
    const nextPhase = phaseOrder[currentIndex + 1];
    return {
      nextPhase,
      gameState: { ...gameState, currentPhase: nextPhase },
    };
  }

  return { nextPhase: gameState.currentPhase, gameState };
}

export function isPhaseComplete(gameState: GameSession): boolean {
  switch (gameState.currentPhase) {
    case 'payment_day':
      return true; // Auto-completes

    case 'event_roll':
      return gameState.eventRollResult !== null;

    case 'individual_action':
      return gameState.currentPlayerTurnIndex >= gameState.turnOrder.length;

    case 'deliberation':
      return false; // Must be externally ended

    case 'action_resolution':
      return gameState.currentPlayerTurnIndex >= gameState.turnOrder.length;

    case 'round_end_accounting':
      return gameState.status === 'scoring';

    case 'level_check':
      return true;

    case 'round_end':
      return true;

    default:
      return false;
  }
}

export { calculateUtility, calculateCWSBreakdown };
