import { create } from 'zustand';
import {
  GameSession,
  GameConfig,
  GamePhase,
  Player,
  ActionCard,
  ChallengeCard,
  Zone,
  ResourcePool,
  RoleId,
} from '../core/models/types';
import {
  initializeGame as engineInitializeGame,
} from '../core/engine/gameInitializer';
import {
  playCard as enginePlayCard,
  startSeries as engineStartSeries,
  contributeToCombination as engineContributeToCombination,
  useUniqueAbility as engineUseUniqueAbility,
  moveStandee as engineMoveStandee,
  pass as enginePass,
  proposeTrade as engineProposeTrade,
  acceptTrade as engineAcceptTrade,
  rejectTrade as engineRejectTrade,
} from '../core/engine/actionProcessor';
import {
  startPhase,
  endPhase,
} from '../core/engine/phaseController';
import {
  getCurrentPlayer as engineGetCurrentPlayer,
  advanceToNextPlayer,
  haveAllPlayersActed,
} from '../core/engine/turnManager';
import { GameStateMachine } from '../core/engine/gameStateMachine';
import { TelemetryRecorder } from '../core/telemetry/telemetryRecorder';
import { TelemetryExporter } from '../core/telemetry/telemetryExporter';
import {
  checkLevelUp as rulesCheckLevelUp,
  applyLevelUp,
} from '../core/rules/levelProgression';
import { canAddCardToSeries } from '../core/rules/seriesResolver';
import { TimerService } from '../services/timer/timerService';

// ─── Animation Event type ──────────────────────────────────────

export interface AnimationEvent {
  id: string;
  type: 'card_played' | 'dice_roll' | 'resource_change' | 'zone_update' | 'trade' | 'level_up' | 'phase_change';
  data: Record<string, unknown>;
  timestamp: number;
}

// ─── Store State ────────────────────────────────────────────────

interface GameStoreState {
  // Core game state
  session: GameSession | null;
  stateMachine: GameStateMachine;
  telemetryRecorder: TelemetryRecorder | null;
  deliberationTimer: TimerService | null;

  // UI state
  selectedCardId: string | null;
  selectedZoneId: string | null;
  showHandoff: boolean;
  showTradeModal: boolean;
  showVoteModal: boolean;
  deliberationTimeRemaining: number;
  animationQueue: AnimationEvent[];
  audioEnabled: boolean;
  musicEnabled: boolean;
  highContrastMode: boolean;

  // Setup actions
  initializeGame: (config: GameConfig, playerAssignments: { name: string; roleId: RoleId }[]) => void;
  selectSite: (siteId: string) => void;
  assignRoles: (assignments: { name: string; roleId: RoleId }[]) => void;
  completeFacilitatorBriefing: () => void;
  placeStandee: (playerId: string, zoneId: string) => void;
  startGame: () => void;

  // Gameplay actions
  advancePhase: () => void;
  rollEventDie: () => void;
  drawChallenge: () => void;
  startDeliberation: () => void;
  endDeliberation: () => void;
  playCard: (cardId: string, targetZoneId?: string) => void;
  startSeries: (cardId: string, challengeId: string) => void;
  contributeToSeries: (cardId: string) => void;
  contributeToCombination: (resources: Partial<ResourcePool>) => void;
  useUniqueAbility: (params?: Record<string, unknown>) => void;
  moveStandee: (targetZoneId: string) => void;
  passTurn: () => void;
  proposeTrade: (targetId: string, offering: Partial<ResourcePool>, requesting: Partial<ResourcePool>) => void;
  acceptTrade: (tradeId: string) => void;
  rejectTrade: (tradeId: string) => void;
  castVote: (vote: boolean) => void;

  // Scoring actions
  calculateRoundScoring: () => void;
  checkLevelUps: () => void;

  // UI actions
  selectCard: (cardId: string | null) => void;
  selectZone: (zoneId: string | null) => void;
  dismissHandoff: () => void;
  toggleAudio: () => void;
  toggleMusic: () => void;
  toggleHighContrast: () => void;

  // Save/Load actions
  saveGame: () => void;
  loadGame: (data: string) => void;
  exportTelemetry: () => void;

  // Computed getters
  getCurrentPlayer: () => Player | null;
  getCurrentPhase: () => GamePhase;
  getPlayerHand: () => ActionCard[];
  getActiveChallenge: () => ChallengeCard | null;
  canPlayCard: (cardId: string) => boolean;
  getBoardZones: () => Zone[];
}

// ─── Store Implementation ───────────────────────────────────────

export const useGameStore = create<GameStoreState>((set, get) => ({
  // ── Core game state ───────────────────────────────────────────
  session: null,
  stateMachine: new GameStateMachine('title_screen'),
  telemetryRecorder: null,
  deliberationTimer: null,

  // ── UI state ──────────────────────────────────────────────────
  selectedCardId: null,
  selectedZoneId: null,
  showHandoff: false,
  showTradeModal: false,
  showVoteModal: false,
  deliberationTimeRemaining: 0,
  animationQueue: [],
  audioEnabled: true,
  musicEnabled: true,
  highContrastMode: false,

  // ── Setup Actions ─────────────────────────────────────────────

  initializeGame: (config, playerAssignments) => {
    const session = engineInitializeGame(config, playerAssignments);
    const recorder = new TelemetryRecorder(session.id);
    const sm = new GameStateMachine('title_screen');

    recorder.record(
      session.currentRound,
      session.currentPhase,
      'game_started',
      'system',
      'system',
      { config, playerCount: playerAssignments.length }
    );

    set({
      session,
      stateMachine: sm,
      telemetryRecorder: recorder,
      deliberationTimer: null,
      selectedCardId: null,
      selectedZoneId: null,
      showHandoff: false,
      showTradeModal: false,
      showVoteModal: false,
      deliberationTimeRemaining: config.deliberationTimerSeconds,
      animationQueue: [],
    });
  },

  selectSite: (siteId) => {
    const { session, stateMachine } = get();
    if (!session) return;

    stateMachine.transition('SELECT_SITE');

    set({
      session: {
        ...session,
        config: { ...session.config, siteId },
        currentPhase: 'setup_role_assignment',
      },
    });
  },

  assignRoles: (_assignments) => {
    const { session, stateMachine } = get();
    if (!session) return;

    stateMachine.transition('ASSIGN_ROLES');

    set({
      session: {
        ...session,
        currentPhase: 'setup_character_creation',
      },
    });
  },

  completeFacilitatorBriefing: () => {
    const { session, stateMachine } = get();
    if (!session) return;

    if (stateMachine.canTransition('CREATE_CHARACTERS')) {
      stateMachine.transition('CREATE_CHARACTERS');
    }
    stateMachine.transition('BRIEF_FACILITATOR');

    set({
      session: {
        ...session,
        currentPhase: 'setup_standee_placement',
      },
    });
  },

  placeStandee: (playerId, zoneId) => {
    const { session } = get();
    if (!session) return;

    const result = engineMoveStandee(session, playerId, zoneId);
    if (result.success) {
      set({ session: result.gameState });
    }
  },

  startGame: () => {
    const { session, stateMachine, telemetryRecorder } = get();
    if (!session) return;

    if (stateMachine.canTransition('PLACE_STANDEES')) {
      stateMachine.transition('PLACE_STANDEES');
    }
    stateMachine.transition('READY_TO_PLAY');

    const updatedSession = startPhase(session, 'phase_1_event');

    if (telemetryRecorder) {
      telemetryRecorder.record(
        updatedSession.currentRound,
        updatedSession.currentPhase,
        'round_start',
        'system',
        'system',
        { round: updatedSession.currentRound }
      );
    }

    set({
      session: {
        ...updatedSession,
        status: 'playing',
      },
      showHandoff: true,
    });
  },

  // ── Gameplay Actions ──────────────────────────────────────────

  advancePhase: () => {
    const { session, stateMachine, telemetryRecorder } = get();
    if (!session) return;

    const { nextPhase, gameState: transitionedState } = endPhase(session);

    // Map phase transitions to state machine actions
    const phaseActionMap: Partial<Record<GamePhase, string>> = {
      'phase_2_challenge': 'RESOLVE_EVENT',
      'phase_3_deliberation': 'CONFIRM_CHALLENGE',
      'phase_4_action': 'END_DELIBERATION',
      'phase_5_scoring': 'ALL_PLAYERS_ACTED',
      'round_end': 'SCORING_DISPLAYED',
      'phase_1_event': 'NEXT_ROUND',
      'game_end': 'END_GAME',
    };

    const action = phaseActionMap[nextPhase];
    if (action && stateMachine.canTransition(action as any)) {
      stateMachine.transition(action as any);
    }

    if (telemetryRecorder) {
      telemetryRecorder.record(
        transitionedState.currentRound,
        nextPhase,
        'phase_start',
        'system',
        'system',
        { phase: nextPhase }
      );
    }

    const updatedSession = startPhase(transitionedState, nextPhase);

    set({
      session: updatedSession,
      showHandoff: true,
      selectedCardId: null,
      selectedZoneId: null,
    });
  },

  rollEventDie: () => {
    const { session, telemetryRecorder } = get();
    if (!session) return;

    const updatedSession = startPhase(session, 'phase_1_event');

    if (telemetryRecorder && updatedSession.eventDieResult) {
      telemetryRecorder.record(
        updatedSession.currentRound,
        updatedSession.currentPhase,
        'event_die_rolled',
        'system',
        'system',
        { result: updatedSession.eventDieResult }
      );
    }

    set({
      session: updatedSession,
      animationQueue: [
        ...get().animationQueue,
        {
          id: `die_roll_${Date.now()}`,
          type: 'dice_roll',
          data: { result: updatedSession.eventDieResult },
          timestamp: Date.now(),
        },
      ],
    });
  },

  drawChallenge: () => {
    const { session, telemetryRecorder } = get();
    if (!session) return;

    const updatedSession = startPhase(session, 'phase_2_challenge');

    if (telemetryRecorder && updatedSession.activeChallenge) {
      const challenge = updatedSession.activeChallenge[0];
      telemetryRecorder.record(
        updatedSession.currentRound,
        updatedSession.currentPhase,
        'challenge_drawn',
        'system',
        'system',
        {
          challengeId: challenge.id,
          challengeName: challenge.name,
          difficulty: challenge.difficulty,
        }
      );
    }

    set({ session: updatedSession });
  },

  startDeliberation: () => {
    const { session, telemetryRecorder } = get();
    if (!session) return;

    const updatedSession = startPhase(session, 'phase_3_deliberation');

    if (telemetryRecorder) {
      telemetryRecorder.record(
        updatedSession.currentRound,
        updatedSession.currentPhase,
        'phase_start',
        'system',
        'system',
        { phase: 'phase_3_deliberation' }
      );
    }

    const timer = new TimerService(
      session.config.deliberationTimerSeconds,
      (remaining) => {
        set({ deliberationTimeRemaining: remaining });
      },
      () => {
        get().endDeliberation();
      }
    );
    timer.start();

    set({
      session: updatedSession,
      deliberationTimer: timer,
      deliberationTimeRemaining: session.config.deliberationTimerSeconds,
    });
  },

  endDeliberation: () => {
    const { session, deliberationTimer, telemetryRecorder } = get();
    if (!session) return;

    if (deliberationTimer) {
      deliberationTimer.stop();
    }

    if (telemetryRecorder) {
      telemetryRecorder.record(
        session.currentRound,
        session.currentPhase,
        'phase_end',
        'system',
        'system',
        { phase: 'phase_3_deliberation' }
      );
    }

    const updatedSession = startPhase(session, 'phase_4_action');

    set({
      session: updatedSession,
      deliberationTimer: null,
      deliberationTimeRemaining: 0,
      showTradeModal: false,
    });
  },

  playCard: (cardId, targetZoneId) => {
    const { session, telemetryRecorder } = get();
    if (!session) return;

    const currentPlayer = getCurrentPlayerSafe(session);
    if (!currentPlayer) return;

    const zoneId = targetZoneId || currentPlayer.focusZoneId;
    const result = enginePlayCard(session, currentPlayer.id, cardId, zoneId);

    if (telemetryRecorder && result.telemetryEvent) {
      telemetryRecorder.record(
        result.gameState.currentRound,
        result.gameState.currentPhase,
        result.telemetryEvent.eventType,
        result.telemetryEvent.actorId,
        result.telemetryEvent.actorRole,
        result.telemetryEvent.data
      );
    }

    let updatedSession = result.gameState;

    // Auto-advance to next player after playing a card
    if (result.success) {
      updatedSession = advanceToNextPlayer(updatedSession);

      // Check if all players have acted
      if (haveAllPlayersActed(updatedSession)) {
        set({
          session: updatedSession,
          selectedCardId: null,
          showHandoff: false,
          animationQueue: [
            ...get().animationQueue,
            {
              id: `card_${Date.now()}`,
              type: 'card_played',
              data: { cardId, zoneId, success: true, message: result.message },
              timestamp: Date.now(),
            },
          ],
        });
        return;
      }

      set({
        session: updatedSession,
        selectedCardId: null,
        showHandoff: true,
        animationQueue: [
          ...get().animationQueue,
          {
            id: `card_${Date.now()}`,
            type: 'card_played',
            data: { cardId, zoneId, success: true, message: result.message },
            timestamp: Date.now(),
          },
        ],
      });
    } else {
      set({ session: updatedSession });
    }
  },

  startSeries: (cardId, challengeId) => {
    const { session, telemetryRecorder } = get();
    if (!session) return;

    const currentPlayer = getCurrentPlayerSafe(session);
    if (!currentPlayer) return;

    const result = engineStartSeries(session, currentPlayer.id, cardId, challengeId);

    if (telemetryRecorder && result.telemetryEvent) {
      telemetryRecorder.record(
        result.gameState.currentRound,
        result.gameState.currentPhase,
        result.telemetryEvent.eventType,
        result.telemetryEvent.actorId,
        result.telemetryEvent.actorRole,
        result.telemetryEvent.data
      );
    }

    set({ session: result.gameState });
  },

  contributeToSeries: (cardId) => {
    const { session, telemetryRecorder } = get();
    if (!session || !session.activeSeries) return;

    const currentPlayer = getCurrentPlayerSafe(session);
    if (!currentPlayer) return;

    const card = currentPlayer.hand.find((c) => c.id === cardId);
    if (!card) return;

    if (!canAddCardToSeries(session.activeSeries, card, currentPlayer)) return;

    // Remove card from hand and add to series
    const newHand = currentPlayer.hand.filter((c) => c.id !== cardId);
    const updatedPlayer = { ...currentPlayer, hand: newHand };

    const updatedSeries = {
      ...session.activeSeries,
      cards: [...session.activeSeries.cards, { card, playerId: currentPlayer.id }],
      currentValue: session.activeSeries.currentValue + card.baseValue,
    };

    if (telemetryRecorder) {
      telemetryRecorder.record(
        session.currentRound,
        session.currentPhase,
        'series_contributed',
        currentPlayer.id,
        currentPlayer.roleId,
        { cardId, cardName: card.name }
      );
    }

    set({
      session: {
        ...session,
        players: { ...session.players, [currentPlayer.id]: updatedPlayer },
        activeSeries: updatedSeries,
      },
      selectedCardId: null,
    });
  },

  contributeToCombination: (resources) => {
    const { session, telemetryRecorder } = get();
    if (!session) return;

    const currentPlayer = getCurrentPlayerSafe(session);
    if (!currentPlayer) return;

    const result = engineContributeToCombination(session, currentPlayer.id, resources);

    if (telemetryRecorder && result.telemetryEvent) {
      telemetryRecorder.record(
        result.gameState.currentRound,
        result.gameState.currentPhase,
        result.telemetryEvent.eventType,
        result.telemetryEvent.actorId,
        result.telemetryEvent.actorRole,
        result.telemetryEvent.data
      );
    }

    set({ session: result.gameState });
  },

  useUniqueAbility: (params) => {
    const { session, telemetryRecorder } = get();
    if (!session) return;

    const currentPlayer = getCurrentPlayerSafe(session);
    if (!currentPlayer) return;

    const result = engineUseUniqueAbility(session, currentPlayer.id, params || {});

    if (telemetryRecorder && result.telemetryEvent) {
      telemetryRecorder.record(
        result.gameState.currentRound,
        result.gameState.currentPhase,
        result.telemetryEvent.eventType,
        result.telemetryEvent.actorId,
        result.telemetryEvent.actorRole,
        result.telemetryEvent.data
      );
    }

    set({ session: result.gameState });
  },

  moveStandee: (targetZoneId) => {
    const { session, telemetryRecorder } = get();
    if (!session) return;

    const currentPlayer = getCurrentPlayerSafe(session);
    if (!currentPlayer) return;

    const result = engineMoveStandee(session, currentPlayer.id, targetZoneId);

    if (telemetryRecorder && result.telemetryEvent) {
      telemetryRecorder.record(
        result.gameState.currentRound,
        result.gameState.currentPhase,
        result.telemetryEvent.eventType,
        result.telemetryEvent.actorId,
        result.telemetryEvent.actorRole,
        result.telemetryEvent.data
      );
    }

    if (result.success) {
      set({
        session: result.gameState,
        selectedZoneId: null,
        animationQueue: [
          ...get().animationQueue,
          {
            id: `move_${Date.now()}`,
            type: 'zone_update',
            data: { targetZoneId, message: result.message },
            timestamp: Date.now(),
          },
        ],
      });
    } else {
      set({ session: result.gameState });
    }
  },

  passTurn: () => {
    const { session, telemetryRecorder } = get();
    if (!session) return;

    const currentPlayer = getCurrentPlayerSafe(session);
    if (!currentPlayer) return;

    const result = enginePass(session, currentPlayer.id);

    if (telemetryRecorder && result.telemetryEvent) {
      telemetryRecorder.record(
        result.gameState.currentRound,
        result.gameState.currentPhase,
        result.telemetryEvent.eventType,
        result.telemetryEvent.actorId,
        result.telemetryEvent.actorRole,
        result.telemetryEvent.data
      );
    }

    let updatedSession = advanceToNextPlayer(result.gameState);

    if (haveAllPlayersActed(updatedSession)) {
      set({ session: updatedSession, showHandoff: false });
    } else {
      set({ session: updatedSession, showHandoff: true });
    }
  },

  proposeTrade: (targetId, offering, requesting) => {
    const { session, telemetryRecorder } = get();
    if (!session) return;

    const currentPlayer = getCurrentPlayerSafe(session);
    if (!currentPlayer) return;

    const result = engineProposeTrade(session, {
      proposerId: currentPlayer.id,
      targetId,
      offering,
      requesting,
    });

    if (telemetryRecorder && result.telemetryEvent) {
      telemetryRecorder.record(
        result.gameState.currentRound,
        result.gameState.currentPhase,
        result.telemetryEvent.eventType,
        result.telemetryEvent.actorId,
        result.telemetryEvent.actorRole,
        result.telemetryEvent.data
      );
    }

    set({ session: result.gameState, showTradeModal: false });
  },

  acceptTrade: (tradeId) => {
    const { session, telemetryRecorder } = get();
    if (!session) return;

    const result = engineAcceptTrade(session, tradeId);

    if (telemetryRecorder && result.telemetryEvent) {
      telemetryRecorder.record(
        result.gameState.currentRound,
        result.gameState.currentPhase,
        result.telemetryEvent.eventType,
        result.telemetryEvent.actorId,
        result.telemetryEvent.actorRole,
        result.telemetryEvent.data
      );
    }

    set({
      session: result.gameState,
      animationQueue: [
        ...get().animationQueue,
        {
          id: `trade_${Date.now()}`,
          type: 'trade',
          data: { tradeId, accepted: true },
          timestamp: Date.now(),
        },
      ],
    });
  },

  rejectTrade: (tradeId) => {
    const { session, telemetryRecorder } = get();
    if (!session) return;

    const result = engineRejectTrade(session, tradeId);

    if (telemetryRecorder && result.telemetryEvent) {
      telemetryRecorder.record(
        result.gameState.currentRound,
        result.gameState.currentPhase,
        result.telemetryEvent.eventType,
        result.telemetryEvent.actorId,
        result.telemetryEvent.actorRole,
        result.telemetryEvent.data
      );
    }

    set({ session: result.gameState });
  },

  castVote: (vote) => {
    const { session, telemetryRecorder } = get();
    if (!session) return;

    const currentPlayer = getCurrentPlayerSafe(session);
    if (!currentPlayer) return;

    if (telemetryRecorder) {
      telemetryRecorder.record(
        session.currentRound,
        session.currentPhase,
        'vote_called',
        currentPlayer.id,
        currentPlayer.roleId,
        { vote }
      );
    }

    set({ showVoteModal: false });
  },

  // ── Scoring Actions ───────────────────────────────────────────

  calculateRoundScoring: () => {
    const { session, telemetryRecorder } = get();
    if (!session) return;

    const scoredSession = startPhase(session, 'phase_5_scoring');

    if (telemetryRecorder) {
      telemetryRecorder.record(
        scoredSession.currentRound,
        scoredSession.currentPhase,
        'cws_updated',
        'system',
        'system',
        {
          cwsScore: scoredSession.cwsTracker.currentScore,
          targetScore: scoredSession.cwsTracker.targetScore,
        }
      );
    }

    set({
      session: scoredSession,
      animationQueue: [
        ...get().animationQueue,
        {
          id: `scoring_${Date.now()}`,
          type: 'resource_change',
          data: { cwsScore: scoredSession.cwsTracker.currentScore },
          timestamp: Date.now(),
        },
      ],
    });
  },

  checkLevelUps: () => {
    const { session, telemetryRecorder } = get();
    if (!session) return;

    const updatedPlayers = { ...session.players };
    let anyLevelUp = false;

    for (const [id, player] of Object.entries(updatedPlayers)) {
      const levelUpResult = rulesCheckLevelUp(player);
      if (levelUpResult) {
        updatedPlayers[id] = applyLevelUp(player, levelUpResult.newLevel, {});
        anyLevelUp = true;

        if (telemetryRecorder) {
          telemetryRecorder.record(
            session.currentRound,
            session.currentPhase,
            'level_up',
            id,
            player.roleId,
            {
              previousLevel: player.level,
              newLevel: levelUpResult.newLevel,
              perks: levelUpResult.perks,
            }
          );
        }
      }
    }

    if (anyLevelUp) {
      set({
        session: { ...session, players: updatedPlayers },
        animationQueue: [
          ...get().animationQueue,
          {
            id: `levelup_${Date.now()}`,
            type: 'level_up',
            data: {},
            timestamp: Date.now(),
          },
        ],
      });
    }
  },

  // ── UI Actions ────────────────────────────────────────────────

  selectCard: (cardId) => {
    set({ selectedCardId: cardId });
  },

  selectZone: (zoneId) => {
    set({ selectedZoneId: zoneId });
  },

  dismissHandoff: () => {
    set({ showHandoff: false });
  },

  toggleAudio: () => {
    set((state) => ({ audioEnabled: !state.audioEnabled }));
  },

  toggleMusic: () => {
    set((state) => ({ musicEnabled: !state.musicEnabled }));
  },

  toggleHighContrast: () => {
    set((state) => ({ highContrastMode: !state.highContrastMode }));
  },

  // ── Save/Load Actions ────────────────────────────────────────

  saveGame: () => {
    const { session } = get();
    if (!session) return;

    const saveData = JSON.stringify(session);
    try {
      localStorage.setItem(`commonground_save_${session.id}`, saveData);
    } catch {
      // Storage full or unavailable; caller should handle via UI
    }
  },

  loadGame: (data) => {
    try {
      const session: GameSession = JSON.parse(data);
      const recorder = new TelemetryRecorder(session.id);
      const sm = new GameStateMachine(session.currentPhase);

      set({
        session,
        stateMachine: sm,
        telemetryRecorder: recorder,
        deliberationTimer: null,
        selectedCardId: null,
        selectedZoneId: null,
        showHandoff: false,
        showTradeModal: false,
        showVoteModal: false,
        deliberationTimeRemaining: session.config.deliberationTimerSeconds,
        animationQueue: [],
      });
    } catch {
      // Invalid JSON; caller should handle via UI
    }
  },

  exportTelemetry: () => {
    const { session } = get();
    if (!session) return;

    const exporter = new TelemetryExporter();
    exporter.downloadAllCSVs(session);
  },

  // ── Computed Getters ──────────────────────────────────────────

  getCurrentPlayer: () => {
    const { session } = get();
    return getCurrentPlayerSafe(session);
  },

  getCurrentPhase: () => {
    const { session } = get();
    if (!session) return 'setup_site_selection';
    return session.currentPhase;
  },

  getPlayerHand: () => {
    const { session } = get();
    if (!session) return [];

    const player = getCurrentPlayerSafe(session);
    return player ? player.hand : [];
  },

  getActiveChallenge: () => {
    const { session } = get();
    if (!session || !session.activeChallenge || session.activeChallenge.length === 0) {
      return null;
    }
    return session.activeChallenge[0];
  },

  canPlayCard: (cardId) => {
    const { session } = get();
    if (!session) return false;
    if (session.currentPhase !== 'phase_4_action') return false;

    const player = getCurrentPlayerSafe(session);
    if (!player) return false;

    const card = player.hand.find((c) => c.id === cardId);
    if (!card) return false;

    // Check resource cost
    if (card.cost) {
      for (const [resource, amount] of Object.entries(card.cost)) {
        if (
          amount &&
          (amount as number) > 0 &&
          player.resources[resource as keyof ResourcePool] < (amount as number)
        ) {
          return false;
        }
      }
    }

    return true;
  },

  getBoardZones: () => {
    const { session } = get();
    if (!session) return [];
    return Object.values(session.board.zones);
  },
}));

// ─── Internal helpers ─────────────────────────────────────────

function getCurrentPlayerSafe(session: GameSession | null): Player | null {
  if (!session) return null;
  try {
    return engineGetCurrentPlayer(session);
  } catch {
    return null;
  }
}
