import type {
  GameSession,
  Player,
  StatusEffect,
} from '../models/types';

export interface AbilityResult {
  success: boolean;
  effects: AbilityEffect[];
  message: string;
  updatedGameState: GameSession;
}

export interface AbilityEffect {
  type: string;
  params: Record<string, any>;
}

type UniqueAbilityName =
  | 'regulatory_override'
  | 'visionary_blueprint'
  | 'community_rally'
  | 'capital_injection'
  | 'media_spotlight';

export function canUseAbility(
  player: Player,
  abilityName: UniqueAbilityName,
  _gameState: GameSession
): boolean {
  if (player.uniqueAbilityUsesRemaining <= 0) return false;

  switch (abilityName) {
    case 'regulatory_override':
      return player.roleId === 'administrator';

    case 'visionary_blueprint':
      if (player.roleId !== 'designer') return false;
      return player.resources.knowledge >= 2;

    case 'community_rally':
      if (player.roleId !== 'citizen') return false;
      return player.resources.volunteer >= 2;

    case 'capital_injection':
      return player.roleId === 'investor';

    case 'media_spotlight':
      if (player.roleId !== 'advocate') return false;
      return player.resources.influence >= 1;

    default:
      return false;
  }
}

export function useAbility(
  player: Player,
  abilityName: UniqueAbilityName,
  gameState: GameSession,
  params: Record<string, any> = {}
): AbilityResult {
  if (!canUseAbility(player, abilityName, gameState)) {
    return {
      success: false,
      effects: [],
      message: `Cannot use ability "${abilityName}".`,
      updatedGameState: gameState,
    };
  }

  const state = structuredClone(gameState);
  const updatedPlayer = state.players[player.id];
  updatedPlayer.uniqueAbilityUsesRemaining -= 1;
  const effects: AbilityEffect[] = [];

  switch (abilityName) {
    case 'regulatory_override': {
      // Difficulty -5 on active challenge
      if (state.activeChallenge) {
        for (const challenge of state.activeChallenge) {
          challenge.difficulty = Math.max(0, challenge.difficulty - 5);
        }
        effects.push({ type: 'difficulty_reduction', params: { amount: 5 } });
      }

      // Permanent -2 PLV (politicalLeverage) to self
      updatedPlayer.abilities.politicalLeverage -= 2;
      effects.push({
        type: 'ability_penalty',
        params: { ability: 'politicalLeverage', amount: -2, permanent: true, target: player.id },
      });

      // -1 communityTrust to all OTHER players for 1 round
      for (const [pid, p] of Object.entries(state.players)) {
        if (pid === player.id) continue;
        const statusEffect: StatusEffect = {
          id: `regulatory_override_ctr_${pid}_${Date.now()}`,
          name: 'Regulatory Override Backlash',
          description: '-1 Community Trust from Regulatory Override',
          abilityModifiers: { communityTrust: -1 },
          resourceModifiers: {},
          duration: 1,
          source: player.id,
        };
        p.statusEffects.push(statusEffect);
      }
      effects.push({
        type: 'status_effect_others',
        params: { ability: 'communityTrust', modifier: -1, duration: 1 },
      });

      return {
        success: true,
        effects,
        message: 'Regulatory Override: Challenge difficulty reduced by 5. Political Leverage permanently reduced by 2. Other players suffer -1 Community Trust for 1 round.',
        updatedGameState: state,
      };
    }

    case 'visionary_blueprint': {
      // Cost: 2 knowledge
      updatedPlayer.resources.knowledge -= 2;
      effects.push({ type: 'resource_cost', params: { knowledge: 2 } });

      // Requires majority vote; params.votes is an array of { playerId, vote: boolean }
      const votes: Array<{ playerId: string; vote: boolean }> = params.votes || [];
      const yesVoters = votes.filter((v) => v.vote).map((v) => v.playerId);
      const totalVoters = Object.keys(state.players).length;
      const majorityReached = yesVoters.length > totalVoters / 2;

      if (!majorityReached) {
        return {
          success: false,
          effects,
          message: 'Visionary Blueprint: Majority vote not reached. Knowledge spent.',
          updatedGameState: state,
        };
      }

      // +3 CP to yes voters
      for (const pid of yesVoters) {
        const p = state.players[pid];
        if (p) {
          p.collaborationPoints += 3;
        }
      }
      effects.push({ type: 'cp_bonus', params: { amount: 3, playerIds: yesVoters } });

      // +5 series value to target zone (stored as progress markers for tracking)
      const targetZoneId = params.targetZoneId as string;
      if (targetZoneId && state.board.zones[targetZoneId]) {
        state.board.zones[targetZoneId].progressMarkers += 5;
        effects.push({ type: 'series_value_bonus', params: { zoneId: targetZoneId, amount: 5 } });
      }

      return {
        success: true,
        effects,
        message: 'Visionary Blueprint: Yes voters gain +3 CP. Target zone gains +5 series value bonus.',
        updatedGameState: state,
      };
    }

    case 'community_rally': {
      // Cost: 2 volunteer
      updatedPlayer.resources.volunteer -= 2;
      effects.push({ type: 'resource_cost', params: { volunteer: 2 } });

      // +3 negotiation bonus this round (as status effect with ability modifier)
      const negotiationBonus: StatusEffect = {
        id: `community_rally_${player.id}_${Date.now()}`,
        name: 'Community Rally',
        description: '+3 Community Trust from Community Rally',
        abilityModifiers: { communityTrust: 3 },
        resourceModifiers: {},
        duration: 1,
        source: player.id,
      };
      updatedPlayer.statusEffects.push(negotiationBonus);
      effects.push({ type: 'negotiation_bonus', params: { amount: 3, duration: 1 } });

      // +3 volunteer tokens
      updatedPlayer.resources.volunteer += 3;
      effects.push({ type: 'resource_gain', params: { volunteer: 3 } });

      // Force challenge discussion: mark in game state
      effects.push({ type: 'force_discussion', params: {} });

      return {
        success: true,
        effects,
        message: 'Community Rally: +3 negotiation bonus this round, +3 volunteer tokens, challenge discussion forced.',
        updatedGameState: state,
      };
    }

    case 'capital_injection': {
      // Provide up to 6 budget tokens (newly created)
      const budgetAmount = Math.min(6, Math.max(0, (params.budgetAmount as number) || 6));
      updatedPlayer.resources.budget += budgetAmount;
      effects.push({ type: 'budget_injection', params: { amount: budgetAmount } });

      // Place revenue token on zone (collects 1 budget/round)
      const targetZoneId = params.targetZoneId as string;
      if (targetZoneId && state.board.zones[targetZoneId]) {
        const zone = state.board.zones[targetZoneId];
        // Track revenue token via specialProperties
        const existingRevenue = (zone.specialProperties.revenueTokens as number) || 0;
        zone.specialProperties.revenueTokens = existingRevenue + 1;
        zone.specialProperties.revenueOwnerId = player.id;
        effects.push({
          type: 'revenue_token',
          params: { zoneId: targetZoneId, collectionRate: 1, ownerId: player.id },
        });
      }

      return {
        success: true,
        effects,
        message: `Capital Injection: ${budgetAmount} budget tokens created. Revenue token placed on zone.`,
        updatedGameState: state,
      };
    }

    case 'media_spotlight': {
      // Cost: 1 influence
      updatedPlayer.resources.influence -= 1;
      effects.push({ type: 'resource_cost', params: { influence: 1 } });

      // Force most-degraded zone as priority
      let worstZoneId: string | null = null;
      let worstConditionIdx = 999;
      const condOrder = ['locked', 'critical', 'poor', 'fair', 'good'];
      for (const [zid, zone] of Object.entries(state.board.zones)) {
        const idx = condOrder.indexOf(zone.condition);
        if (idx < worstConditionIdx) {
          worstConditionIdx = idx;
          worstZoneId = zid;
        }
      }

      if (worstZoneId) {
        effects.push({ type: 'force_priority_zone', params: { zoneId: worstZoneId } });

        // +2 CWS bonus for actions in that zone (track as zone special property)
        const zone = state.board.zones[worstZoneId];
        zone.specialProperties.mediaSpotlightBonus = 2;
        zone.specialProperties.mediaSpotlightRoundsRemaining = 1;
        effects.push({
          type: 'cws_zone_bonus',
          params: { zoneId: worstZoneId, bonus: 2, duration: 1 },
        });
      }

      return {
        success: true,
        effects,
        message: `Media Spotlight: Most degraded zone (${worstZoneId}) is now priority. +2 CWS bonus for actions there.`,
        updatedGameState: state,
      };
    }

    default:
      return {
        success: false,
        effects: [],
        message: `Unknown ability: ${abilityName}.`,
        updatedGameState: state,
      };
  }
}
