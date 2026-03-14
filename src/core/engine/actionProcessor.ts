import { v4 as uuidv4 } from 'uuid';
import {
  GameSession,
  Player,
  ActionCard,
  ResourcePool,
  Zone,
  ZoneCondition,
  TradeOffer,
  SeriesInProgress,
  CombinationInProgress,
  CardEffect,
  RoundLogEntry,
  TelemetryEvent,
} from '../models/types';
import { ZONE_CONDITION_ORDER } from '../models/constants';
import { performAbilityCheck } from '../rules/abilityCheck';
import { canAddCardToSeries, calculateSeriesValue } from '../rules/seriesResolver';

// ─── Result type ──────────────────────────────────────────────

export interface ActionResult {
  success: boolean;
  gameState: GameSession;
  message: string;
  telemetryEvent?: TelemetryEvent;
}

// ─── Helper: create telemetry event ───────────────────────────

function createTelemetryEvent(
  gameState: GameSession,
  eventType: TelemetryEvent['eventType'],
  actorId: string,
  actorRole: TelemetryEvent['actorRole'],
  data: Record<string, any>
): TelemetryEvent {
  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    sessionId: gameState.id,
    round: gameState.currentRound,
    phase: gameState.currentPhase,
    eventType,
    actorId,
    actorRole,
    data,
  };
}

function addLogEntry(
  gameState: GameSession,
  playerId: string,
  action: string,
  details: Record<string, any>
): GameSession {
  const entry: RoundLogEntry = {
    round: gameState.currentRound,
    playerId,
    action,
    details,
    timestamp: new Date().toISOString(),
  };
  return {
    ...gameState,
    roundLog: [...gameState.roundLog, entry],
    gameLog: [...gameState.gameLog, entry],
  };
}

function appendTelemetry(gameState: GameSession, event: TelemetryEvent): GameSession {
  return {
    ...gameState,
    telemetry: [...gameState.telemetry, event],
  };
}

function hasEnoughResources(pool: ResourcePool, cost: Partial<ResourcePool>): boolean {
  for (const [key, amount] of Object.entries(cost)) {
    if ((amount as number) > 0 && pool[key as keyof ResourcePool] < (amount as number)) {
      return false;
    }
  }
  return true;
}

function deductResources(pool: ResourcePool, cost: Partial<ResourcePool>): ResourcePool {
  const result = { ...pool };
  for (const [key, amount] of Object.entries(cost)) {
    if ((amount as number) > 0) {
      result[key as keyof ResourcePool] = Math.max(0, result[key as keyof ResourcePool] - (amount as number));
    }
  }
  return result;
}

function addResources(pool: ResourcePool, gains: Partial<ResourcePool>): ResourcePool {
  const result = { ...pool };
  for (const [key, amount] of Object.entries(gains)) {
    if ((amount as number) > 0) {
      result[key as keyof ResourcePool] = (result[key as keyof ResourcePool] || 0) + (amount as number);
    }
  }
  return result;
}

function improveZoneCondition(zone: Zone, levels: number): Zone {
  const currentLevel = ZONE_CONDITION_ORDER[zone.condition] ?? 3;
  const newLevel = Math.min(4, currentLevel + levels);
  const condMap: Record<number, ZoneCondition> = { 1: 'critical', 2: 'poor', 3: 'fair', 4: 'good' };
  return { ...zone, condition: condMap[newLevel] || zone.condition };
}

function degradeZoneCondition(zone: Zone, levels: number): Zone {
  const currentLevel = ZONE_CONDITION_ORDER[zone.condition] ?? 3;
  const newLevel = Math.max(1, currentLevel - levels);
  const condMap: Record<number, ZoneCondition> = { 1: 'critical', 2: 'poor', 3: 'fair', 4: 'good' };
  return { ...zone, condition: condMap[newLevel] || zone.condition };
}

// ─── Apply card effects ───────────────────────────────────────

function applyCardEffects(
  gameState: GameSession,
  playerId: string,
  card: ActionCard,
  targetZoneId: string
): GameSession {
  let state = { ...gameState };
  const zones = { ...state.board.zones };
  const players = { ...state.players };

  for (const effect of card.effects) {
    switch (effect.type) {
      case 'add_resources': {
        if (effect.target === 'zone' && effect.params.resources) {
          const zone = zones[targetZoneId];
          if (zone) {
            zones[targetZoneId] = {
              ...zone,
              resources: addResources(zone.resources, effect.params.resources),
            };
          }
        } else if (effect.target === 'self' && effect.params.resources) {
          const player = players[playerId];
          if (player) {
            players[playerId] = {
              ...player,
              resources: addResources(player.resources, effect.params.resources),
            };
          }
        } else if (effect.target === 'all_players' && effect.params.resources) {
          for (const pid of Object.keys(players)) {
            players[pid] = {
              ...players[pid],
              resources: addResources(players[pid].resources, effect.params.resources),
            };
          }
        }
        break;
      }

      case 'remove_resources': {
        if (effect.target === 'zone' && effect.params.resources) {
          const zone = zones[targetZoneId];
          if (zone) {
            zones[targetZoneId] = {
              ...zone,
              resources: deductResources(zone.resources, effect.params.resources),
            };
          }
        } else if (effect.target === 'self' && effect.params.resources) {
          const player = players[playerId];
          if (player) {
            players[playerId] = {
              ...player,
              resources: deductResources(player.resources, effect.params.resources),
            };
          }
        }
        break;
      }

      case 'modify_zone_condition': {
        const zone = zones[targetZoneId];
        if (zone) {
          if (effect.params.improveLevels) {
            zones[targetZoneId] = improveZoneCondition(zone, effect.params.improveLevels);
          }
          if (effect.params.degradeLevels) {
            zones[targetZoneId] = degradeZoneCondition(
              zones[targetZoneId],
              effect.params.degradeLevels
            );
          }
        }
        break;
      }

      case 'add_progress_marker': {
        const zone = zones[targetZoneId];
        if (zone) {
          zones[targetZoneId] = {
            ...zone,
            progressMarkers: zone.progressMarkers + (effect.params.count || 1),
          };
        }
        break;
      }

      case 'remove_problem_marker': {
        const zone = zones[targetZoneId];
        if (zone) {
          zones[targetZoneId] = {
            ...zone,
            problemMarkers: Math.max(0, zone.problemMarkers - (effect.params.count || 1)),
          };
        }
        break;
      }

      case 'grant_cp': {
        if (effect.target === 'self') {
          const player = players[playerId];
          if (player) {
            players[playerId] = {
              ...player,
              collaborationPoints: player.collaborationPoints + (effect.params.amount || 0),
            };
          }
        } else if (effect.target === 'all_players') {
          for (const pid of Object.keys(players)) {
            players[pid] = {
              ...players[pid],
              collaborationPoints: players[pid].collaborationPoints + (effect.params.amount || 0),
            };
          }
        }
        break;
      }

      case 'grant_tokens_to_other': {
        if (effect.params.targetPlayerId && effect.params.resources) {
          const target = players[effect.params.targetPlayerId];
          if (target) {
            players[effect.params.targetPlayerId] = {
              ...target,
              resources: addResources(target.resources, effect.params.resources),
            };
          }
        }
        break;
      }

      case 'modify_ability_temp': {
        const targetId = effect.target === 'self' ? playerId : effect.params.targetPlayerId;
        if (targetId && players[targetId]) {
          const statusEffect = {
            id: `card_effect_${uuidv4()}`,
            name: card.name,
            description: `Temporary ability modifier from ${card.name}`,
            abilityModifiers: effect.params.abilityModifiers || {},
            resourceModifiers: {},
            duration: effect.params.duration || 1,
            source: card.id,
          };
          players[targetId] = {
            ...players[targetId],
            statusEffects: [...players[targetId].statusEffects, statusEffect],
          };
        }
        break;
      }

      case 'apply_status_effect': {
        const seTargetId = effect.target === 'self' ? playerId : effect.params.targetPlayerId;
        if (seTargetId && players[seTargetId] && effect.params.statusEffect) {
          players[seTargetId] = {
            ...players[seTargetId],
            statusEffects: [
              ...players[seTargetId].statusEffects,
              { ...effect.params.statusEffect, id: uuidv4() },
            ],
          };
        }
        break;
      }

      case 'draw_cards': {
        const player = players[playerId];
        if (player) {
          const count = effect.params.count || 1;
          const drawPile = [...player.drawPile];
          const hand = [...player.hand];
          for (let i = 0; i < count && drawPile.length > 0; i++) {
            hand.push(drawPile.shift()!);
          }
          players[playerId] = { ...player, hand, drawPile };
        }
        break;
      }

      case 'generate_volunteers': {
        const player = players[playerId];
        if (player) {
          players[playerId] = {
            ...player,
            resources: {
              ...player.resources,
              volunteer: player.resources.volunteer + (effect.params.count || 1),
            },
          };
        }
        break;
      }

      case 'create_revenue_token': {
        const zone = zones[targetZoneId];
        if (zone) {
          zones[targetZoneId] = {
            ...zone,
            specialProperties: {
              ...zone.specialProperties,
              revenueTokens: (zone.specialProperties.revenueTokens || 0) + 1,
              revenueOwner: playerId,
            },
          };
        }
        break;
      }

      case 'reveal_zone_info': {
        // Reveal trigger tile if any
        const zone = zones[targetZoneId];
        if (zone) {
          const triggerTiles = { ...state.board.triggerTiles };
          for (const [tId, tile] of Object.entries(triggerTiles)) {
            if (tile.zoneId === targetZoneId && !tile.revealed) {
              triggerTiles[tId] = { ...tile, revealed: true };
              zones[targetZoneId] = { ...zone, revealedTrigger: triggerTiles[tId] };
              break;
            }
          }
          state = { ...state, board: { ...state.board, triggerTiles } };
        }
        break;
      }

      default:
        // Unknown effect type, skip
        break;
    }
  }

  return {
    ...state,
    board: { ...state.board, zones },
    players,
  };
}

// ─── Public Action Functions ──────────────────────────────────

/**
 * Play a card from the player's hand onto a target zone.
 */
export function playCard(
  gameState: GameSession,
  playerId: string,
  cardId: string,
  targetZoneId: string
): ActionResult {
  const player = gameState.players[playerId];
  if (!player) {
    return { success: false, gameState, message: `Player "${playerId}" not found.` };
  }

  const cardIndex = player.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) {
    return { success: false, gameState, message: `Card "${cardId}" not in player's hand.` };
  }

  const card = player.hand[cardIndex];
  const zone = gameState.board.zones[targetZoneId];
  if (!zone) {
    return { success: false, gameState, message: `Zone "${targetZoneId}" not found.` };
  }

  if (zone.isLocked) {
    return { success: false, gameState, message: `Zone "${targetZoneId}" is locked.` };
  }

  // Check resource cost
  if (card.cost && !hasEnoughResources(player.resources, card.cost)) {
    return { success: false, gameState, message: `Not enough resources to play "${card.name}".` };
  }

  // Perform ability check if required
  if (card.abilityCheck) {
    const result = performAbilityCheck(
      player,
      card.abilityCheck.ability,
      card.abilityCheck.threshold,
      card.abilityCheck.skill
    );
    if (!result.success) {
      // Card is discarded on failure, cost is still paid
      const newHand = [...player.hand];
      newHand.splice(cardIndex, 1);
      const newDiscard = [...player.discardPile, card];
      const newResources = card.cost ? deductResources(player.resources, card.cost) : player.resources;

      const updatedPlayer = {
        ...player,
        hand: newHand,
        discardPile: newDiscard,
        resources: newResources,
      };

      const telemetryEvent = createTelemetryEvent(
        gameState, 'card_played', playerId, player.roleId,
        { cardId, cardName: card.name, targetZoneId, abilityCheckFailed: true, checkResult: result }
      );

      let newState = {
        ...gameState,
        players: { ...gameState.players, [playerId]: updatedPlayer },
      };
      newState = addLogEntry(newState, playerId, 'play_card_failed', { cardId, cardName: card.name, reason: 'ability_check' });
      newState = appendTelemetry(newState, telemetryEvent);

      return {
        success: false,
        gameState: newState,
        message: `Ability check failed for "${card.name}" (${result.checkValue} vs ${result.threshold}).`,
        telemetryEvent,
      };
    }
  }

  // Pay cost
  const newResources = card.cost ? deductResources(player.resources, card.cost) : player.resources;

  // Remove card from hand, add to discard
  const newHand = [...player.hand];
  newHand.splice(cardIndex, 1);

  const updatedPlayer = {
    ...player,
    hand: newHand,
    discardPile: [...player.discardPile, card],
    resources: newResources,
  };

  let newState: GameSession = {
    ...gameState,
    players: { ...gameState.players, [playerId]: updatedPlayer },
  };

  // Apply card effects
  newState = applyCardEffects(newState, playerId, card, targetZoneId);

  const telemetryEvent = createTelemetryEvent(
    gameState, 'card_played', playerId, player.roleId,
    { cardId, cardName: card.name, targetZoneId, effects: card.effects }
  );
  newState = addLogEntry(newState, playerId, 'play_card', { cardId, cardName: card.name, targetZoneId });
  newState = appendTelemetry(newState, telemetryEvent);

  return {
    success: true,
    gameState: newState,
    message: `Played "${card.name}" on ${zone.name}.`,
    telemetryEvent,
  };
}

/**
 * Start a new series with the first card targeting a challenge.
 */
export function startSeries(
  gameState: GameSession,
  playerId: string,
  cardId: string,
  challengeId: string
): ActionResult {
  const player = gameState.players[playerId];
  if (!player) {
    return { success: false, gameState, message: `Player "${playerId}" not found.` };
  }

  if (gameState.activeSeries) {
    return { success: false, gameState, message: 'A series is already in progress.' };
  }

  const cardIndex = player.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) {
    return { success: false, gameState, message: `Card "${cardId}" not in player's hand.` };
  }

  const card = player.hand[cardIndex];

  // Check card can start a series
  if (card.seriesPosition !== 'starter' && card.seriesPosition !== 'any') {
    return { success: false, gameState, message: `Card "${card.name}" cannot start a series (position: ${card.seriesPosition}).` };
  }

  // Check cost
  if (card.cost && !hasEnoughResources(player.resources, card.cost)) {
    return { success: false, gameState, message: `Not enough resources to play "${card.name}".` };
  }

  // Pay cost
  const newResources = card.cost ? deductResources(player.resources, card.cost) : player.resources;
  const newHand = [...player.hand];
  newHand.splice(cardIndex, 1);

  const updatedPlayer = {
    ...player,
    hand: newHand,
    resources: newResources,
  };

  const series: SeriesInProgress = {
    cards: [{ card, playerId }],
    targetChallengeId: challengeId,
    currentValue: card.baseValue,
    coalitionPactActive: false,
  };

  const telemetryEvent = createTelemetryEvent(
    gameState, 'series_started', playerId, player.roleId,
    { cardId, cardName: card.name, challengeId }
  );

  let newState: GameSession = {
    ...gameState,
    players: { ...gameState.players, [playerId]: updatedPlayer },
    activeSeries: series,
  };
  newState = addLogEntry(newState, playerId, 'start_series', { cardId, cardName: card.name, challengeId });
  newState = appendTelemetry(newState, telemetryEvent);

  return {
    success: true,
    gameState: newState,
    message: `Started a series with "${card.name}" targeting challenge.`,
    telemetryEvent,
  };
}

/**
 * Contribute resources to the active combination.
 */
export function contributeToCombination(
  gameState: GameSession,
  playerId: string,
  resources: Partial<ResourcePool>
): ActionResult {
  const player = gameState.players[playerId];
  if (!player) {
    return { success: false, gameState, message: `Player "${playerId}" not found.` };
  }

  if (!hasEnoughResources(player.resources, resources)) {
    return { success: false, gameState, message: 'Not enough resources to contribute.' };
  }

  // Count total tokens being contributed
  const tokenCount = Object.values(resources).reduce((sum, v) => sum + (v || 0), 0);

  const newResources = deductResources(player.resources, resources);
  const updatedPlayer = { ...player, resources: newResources };

  let combination = gameState.activeCombination;
  if (!combination) {
    // Start a new combination if there's an active challenge
    const challengeId = gameState.activeChallenge?.[0]?.id || '';
    combination = {
      contributions: [],
      targetChallengeId: challengeId,
      totalTokens: 0,
    };
  }

  const updatedCombination: CombinationInProgress = {
    ...combination,
    contributions: [...combination.contributions, { playerId, resources }],
    totalTokens: combination.totalTokens + tokenCount,
  };

  const telemetryEvent = createTelemetryEvent(
    gameState, 'combination_contributed', playerId, player.roleId,
    { resources, tokenCount }
  );

  let newState: GameSession = {
    ...gameState,
    players: { ...gameState.players, [playerId]: updatedPlayer },
    activeCombination: updatedCombination,
  };
  newState = addLogEntry(newState, playerId, 'contribute_combination', { resources, tokenCount });
  newState = appendTelemetry(newState, telemetryEvent);

  return {
    success: true,
    gameState: newState,
    message: `Contributed ${tokenCount} tokens to the combination.`,
    telemetryEvent,
  };
}

/**
 * Use a player's unique ability.
 */
export function useUniqueAbility(
  gameState: GameSession,
  playerId: string,
  params: Record<string, any>
): ActionResult {
  const player = gameState.players[playerId];
  if (!player) {
    return { success: false, gameState, message: `Player "${playerId}" not found.` };
  }

  if (player.uniqueAbilityUsesRemaining <= 0) {
    return { success: false, gameState, message: 'No unique ability uses remaining.' };
  }

  const updatedPlayer = {
    ...player,
    uniqueAbilityUsesRemaining: player.uniqueAbilityUsesRemaining - 1,
  };

  let newState: GameSession = {
    ...gameState,
    players: { ...gameState.players, [playerId]: updatedPlayer },
  };

  // Apply role-specific ability effects
  switch (player.roleId) {
    case 'administrator': {
      // Regulatory Override: reduce challenge difficulty by 5, cost -2 political leverage
      if (gameState.activeChallenge && gameState.activeChallenge.length > 0) {
        const updatedChallenge = gameState.activeChallenge.map((ch) => ({
          ...ch,
          difficulty: Math.max(0, ch.difficulty - 5),
        }));
        const abilities = { ...updatedPlayer.abilities };
        abilities.politicalLeverage = Math.max(0, abilities.politicalLeverage - 2);

        // Apply CTR penalty to admin from all other players (status effect)
        const otherPlayers = { ...newState.players };
        for (const pid of Object.keys(otherPlayers)) {
          if (pid !== playerId) {
            otherPlayers[pid] = {
              ...otherPlayers[pid],
              statusEffects: [
                ...otherPlayers[pid].statusEffects,
                {
                  id: uuidv4(),
                  name: 'Regulatory Override Backlash',
                  description: 'Community Trust toward Administrator decreases',
                  abilityModifiers: { communityTrust: -1 },
                  resourceModifiers: {},
                  duration: 1,
                  source: 'regulatory_override',
                },
              ],
            };
          }
        }

        newState = {
          ...newState,
          activeChallenge: updatedChallenge,
          players: {
            ...otherPlayers,
            [playerId]: { ...updatedPlayer, abilities },
          },
        };
      }
      break;
    }

    case 'designer': {
      // Visionary Blueprint: costs 2 knowledge, grants +5 to next series value
      const res = { ...updatedPlayer.resources };
      if (res.knowledge < 2) {
        return { success: false, gameState, message: 'Need 2 Knowledge Tokens for Visionary Blueprint.' };
      }
      res.knowledge -= 2;

      // Grant CP to all who participate (handled during series resolution)
      // For now, add a status effect that boosts series value
      newState = {
        ...newState,
        players: {
          ...newState.players,
          [playerId]: {
            ...updatedPlayer,
            resources: res,
            statusEffects: [
              ...updatedPlayer.statusEffects,
              {
                id: uuidv4(),
                name: 'Visionary Blueprint',
                description: '+5 to next series value targeting the zone',
                abilityModifiers: {},
                resourceModifiers: {},
                duration: 1,
                source: 'visionary_blueprint',
              },
            ],
          },
        },
      };
      break;
    }

    case 'citizen': {
      // Community Rally: +3 to negotiation checks, generates 3 volunteers, costs 2 volunteers
      const res = { ...updatedPlayer.resources };
      if (res.volunteer < 2) {
        return { success: false, gameState, message: 'Need 2 Volunteer Tokens for Community Rally.' };
      }
      res.volunteer = res.volunteer - 2 + 3; // -2 cost + 3 generated

      newState = {
        ...newState,
        players: {
          ...newState.players,
          [playerId]: {
            ...updatedPlayer,
            resources: res,
            statusEffects: [
              ...updatedPlayer.statusEffects,
              {
                id: uuidv4(),
                name: 'Community Rally',
                description: '+3 to negotiation checks this round',
                abilityModifiers: { communityTrust: 3 },
                resourceModifiers: {},
                duration: 1,
                source: 'community_rally',
              },
            ],
          },
        },
      };
      break;
    }

    case 'investor': {
      // Capital Injection: provide up to 6 budget to fund a challenge, place revenue token
      const targetZoneId = params.targetZoneId;
      if (!targetZoneId || !newState.board.zones[targetZoneId]) {
        return { success: false, gameState, message: 'Must specify a valid target zone for Capital Injection.' };
      }

      const budgetAmount = Math.min(6, params.budgetAmount || 6);
      const zones = { ...newState.board.zones };
      const zone = zones[targetZoneId];
      zones[targetZoneId] = {
        ...zone,
        resources: addResources(zone.resources, { budget: budgetAmount }),
        specialProperties: {
          ...zone.specialProperties,
          revenueTokens: (zone.specialProperties.revenueTokens || 0) + 1,
          revenueOwner: playerId,
        },
      };

      newState = {
        ...newState,
        board: { ...newState.board, zones },
      };
      break;
    }

    case 'advocate': {
      // Media Spotlight: costs 1 influence, most-degraded zone becomes mandatory priority
      const res = { ...updatedPlayer.resources };
      if (res.influence < 1) {
        return { success: false, gameState, message: 'Need 1 Influence Token for Media Spotlight.' };
      }
      res.influence -= 1;

      // Find most degraded zone or use specified zone
      let targetZoneId = params.targetZoneId;
      if (!targetZoneId) {
        let worstCondition = 5;
        for (const [zid, zone] of Object.entries(newState.board.zones)) {
          const level = ZONE_CONDITION_ORDER[zone.condition] ?? 3;
          if (level < worstCondition) {
            worstCondition = level;
            targetZoneId = zid;
          }
        }
      }

      newState = {
        ...newState,
        players: {
          ...newState.players,
          [playerId]: { ...updatedPlayer, resources: res },
        },
      };

      // Mark zone as mandatory priority (stored as special property)
      if (targetZoneId && newState.board.zones[targetZoneId]) {
        const zones = { ...newState.board.zones };
        zones[targetZoneId] = {
          ...zones[targetZoneId],
          specialProperties: {
            ...zones[targetZoneId].specialProperties,
            mediaSpotlight: true,
            mediaSpotlightCWSBonus: 2,
          },
        };
        newState = { ...newState, board: { ...newState.board, zones } };
      }
      break;
    }
  }

  const telemetryEvent = createTelemetryEvent(
    gameState, 'unique_ability_used', playerId, player.roleId,
    { roleId: player.roleId, params }
  );
  newState = addLogEntry(newState, playerId, 'use_unique_ability', { roleId: player.roleId, params });
  newState = appendTelemetry(newState, telemetryEvent);

  return {
    success: true,
    gameState: newState,
    message: `Used unique ability.`,
    telemetryEvent,
  };
}

/**
 * Move a player's standee to a target zone.
 */
export function moveStandee(
  gameState: GameSession,
  playerId: string,
  targetZoneId: string
): ActionResult {
  const player = gameState.players[playerId];
  if (!player) {
    return { success: false, gameState, message: `Player "${playerId}" not found.` };
  }

  const targetZone = gameState.board.zones[targetZoneId];
  if (!targetZone) {
    return { success: false, gameState, message: `Zone "${targetZoneId}" not found.` };
  }

  if (targetZone.isLocked) {
    return { success: false, gameState, message: `Zone "${targetZoneId}" is locked.` };
  }

  // Check adjacency from current focus zone
  const adjacentZones = gameState.board.adjacency[player.focusZoneId] || [];
  if (player.focusZoneId !== targetZoneId && !adjacentZones.includes(targetZoneId)) {
    return {
      success: false,
      gameState,
      message: `Cannot move to "${targetZoneId}" - not adjacent to current zone "${player.focusZoneId}".`,
    };
  }

  // Remove standee from old zone
  const zones = { ...gameState.board.zones };
  const oldZone = zones[player.focusZoneId];
  if (oldZone) {
    zones[player.focusZoneId] = {
      ...oldZone,
      playerStandees: oldZone.playerStandees.filter((id) => id !== playerId),
    };
  }

  // Add standee to new zone
  zones[targetZoneId] = {
    ...targetZone,
    playerStandees: [...targetZone.playerStandees, playerId],
  };

  const updatedPlayer = { ...player, focusZoneId: targetZoneId };

  // Check for trigger tile
  let newState: GameSession = {
    ...gameState,
    board: { ...gameState.board, zones },
    players: { ...gameState.players, [playerId]: updatedPlayer },
  };

  // Reveal trigger tile if present and not yet revealed
  const triggerTiles = { ...newState.board.triggerTiles };
  for (const [tId, tile] of Object.entries(triggerTiles)) {
    if (tile.zoneId === targetZoneId && !tile.revealed) {
      triggerTiles[tId] = { ...tile, revealed: true };
      zones[targetZoneId] = { ...zones[targetZoneId], revealedTrigger: triggerTiles[tId] };

      const triggerEvent = createTelemetryEvent(
        newState, 'trigger_tile_revealed', playerId, player.roleId,
        { triggerId: tId, triggerTitle: tile.title, zoneId: targetZoneId }
      );
      newState = appendTelemetry(
        { ...newState, board: { ...newState.board, zones, triggerTiles } },
        triggerEvent
      );
      break;
    }
  }

  const telemetryEvent = createTelemetryEvent(
    gameState, 'standee_moved', playerId, player.roleId,
    { from: player.focusZoneId, to: targetZoneId }
  );
  newState = addLogEntry(newState, playerId, 'move_standee', { from: player.focusZoneId, to: targetZoneId });
  newState = appendTelemetry(newState, telemetryEvent);

  return {
    success: true,
    gameState: newState,
    message: `Moved to ${targetZone.name}.`,
    telemetryEvent,
  };
}

/**
 * Player passes their turn.
 */
export function pass(
  gameState: GameSession,
  playerId: string
): ActionResult {
  const player = gameState.players[playerId];
  if (!player) {
    return { success: false, gameState, message: `Player "${playerId}" not found.` };
  }

  const telemetryEvent = createTelemetryEvent(
    gameState, 'player_passed', playerId, player.roleId,
    {}
  );

  let newState = addLogEntry(gameState, playerId, 'pass', {});
  newState = appendTelemetry(newState, telemetryEvent);

  return {
    success: true,
    gameState: newState,
    message: `${player.name} passed.`,
    telemetryEvent,
  };
}

/**
 * Propose a trade between two players.
 */
export function proposeTrade(
  gameState: GameSession,
  offer: {
    proposerId: string;
    targetId: string;
    offering: Partial<ResourcePool>;
    requesting: Partial<ResourcePool>;
    tradeCardId?: string;
  }
): ActionResult {
  const proposer = gameState.players[offer.proposerId];
  if (!proposer) {
    return { success: false, gameState, message: `Proposer "${offer.proposerId}" not found.` };
  }

  const target = gameState.players[offer.targetId];
  if (!target) {
    return { success: false, gameState, message: `Target "${offer.targetId}" not found.` };
  }

  // Validate proposer has the resources they're offering
  if (!hasEnoughResources(proposer.resources, offer.offering)) {
    return { success: false, gameState, message: 'Proposer does not have enough resources to offer.' };
  }

  // Validate target has the resources being requested
  if (!hasEnoughResources(target.resources, offer.requesting)) {
    return { success: false, gameState, message: 'Target does not have enough requested resources.' };
  }

  const tradeOffer: TradeOffer = {
    id: uuidv4(),
    proposerId: offer.proposerId,
    targetId: offer.targetId,
    offering: offer.offering,
    requesting: offer.requesting,
    status: 'pending',
    tradeCardId: offer.tradeCardId,
  };

  const telemetryEvent = createTelemetryEvent(
    gameState, 'trade_proposed', offer.proposerId, proposer.roleId,
    { tradeId: tradeOffer.id, targetId: offer.targetId, offering: offer.offering, requesting: offer.requesting }
  );

  let newState: GameSession = {
    ...gameState,
    tradeOffers: [...gameState.tradeOffers, tradeOffer],
  };
  newState = addLogEntry(newState, offer.proposerId, 'propose_trade', {
    tradeId: tradeOffer.id,
    targetId: offer.targetId,
    offering: offer.offering,
    requesting: offer.requesting,
  });
  newState = appendTelemetry(newState, telemetryEvent);

  return {
    success: true,
    gameState: newState,
    message: `Trade proposed to ${target.name}.`,
    telemetryEvent,
  };
}

/**
 * Accept a pending trade offer, executing the resource exchange.
 */
export function acceptTrade(
  gameState: GameSession,
  tradeId: string
): ActionResult {
  const tradeIndex = gameState.tradeOffers.findIndex((t) => t.id === tradeId);
  if (tradeIndex === -1) {
    return { success: false, gameState, message: `Trade "${tradeId}" not found.` };
  }

  const trade = gameState.tradeOffers[tradeIndex];
  if (trade.status !== 'pending') {
    return { success: false, gameState, message: `Trade "${tradeId}" is not pending.` };
  }

  const proposer = gameState.players[trade.proposerId];
  const target = gameState.players[trade.targetId];
  if (!proposer || !target) {
    return { success: false, gameState, message: 'Trade participants not found.' };
  }

  // Execute the exchange
  const updatedProposer = {
    ...proposer,
    resources: addResources(deductResources(proposer.resources, trade.offering), trade.requesting),
  };
  const updatedTarget = {
    ...target,
    resources: addResources(deductResources(target.resources, trade.requesting), trade.offering),
  };

  // Update trade status
  const updatedTrades = [...gameState.tradeOffers];
  updatedTrades[tradeIndex] = { ...trade, status: 'completed' };

  // Award CP for successful trade
  updatedProposer.collaborationPoints += 1;
  updatedTarget.collaborationPoints += 1;

  const telemetryEvent = createTelemetryEvent(
    gameState, 'trade_completed', trade.targetId, target.roleId,
    { tradeId, proposerId: trade.proposerId, offering: trade.offering, requesting: trade.requesting }
  );

  let newState: GameSession = {
    ...gameState,
    players: {
      ...gameState.players,
      [trade.proposerId]: updatedProposer,
      [trade.targetId]: updatedTarget,
    },
    tradeOffers: updatedTrades,
  };
  newState = addLogEntry(newState, trade.targetId, 'accept_trade', { tradeId });
  newState = appendTelemetry(newState, telemetryEvent);

  return {
    success: true,
    gameState: newState,
    message: 'Trade completed successfully.',
    telemetryEvent,
  };
}

/**
 * Reject a pending trade offer.
 */
export function rejectTrade(
  gameState: GameSession,
  tradeId: string
): ActionResult {
  const tradeIndex = gameState.tradeOffers.findIndex((t) => t.id === tradeId);
  if (tradeIndex === -1) {
    return { success: false, gameState, message: `Trade "${tradeId}" not found.` };
  }

  const trade = gameState.tradeOffers[tradeIndex];
  const target = gameState.players[trade.targetId];

  const updatedTrades = [...gameState.tradeOffers];
  updatedTrades[tradeIndex] = { ...trade, status: 'rejected' };

  const telemetryEvent = createTelemetryEvent(
    gameState, 'trade_rejected', trade.targetId, target?.roleId || 'system',
    { tradeId }
  );

  let newState: GameSession = {
    ...gameState,
    tradeOffers: updatedTrades,
  };
  newState = addLogEntry(newState, trade.targetId, 'reject_trade', { tradeId });
  newState = appendTelemetry(newState, telemetryEvent);

  return {
    success: true,
    gameState: newState,
    message: 'Trade rejected.',
    telemetryEvent,
  };
}
