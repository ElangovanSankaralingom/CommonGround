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
  CoalitionCombination,
  Promise as GamePromise,
  ResourceType,
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
  resolveCoalitions,
} from '../core/engine/phaseController';
import {
  getCurrentPlayer as engineGetCurrentPlayer,
  advanceToNextPlayer,
  haveAllPlayersActed,
} from '../core/engine/turnManager';
import { GameStateMachine, GameAction } from '../core/engine/gameStateMachine';
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
  type: 'card_played' | 'dice_roll' | 'resource_change' | 'zone_update' | 'trade'
    | 'level_up' | 'phase_change' | 'payment_day' | 'coalition_reveal'
    | 'game_level_up' | 'zone_decay' | 'two_dice_roll';
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
  showCoalitionModal: boolean;
  showPromiseModal: boolean;
  showNashDashboard: boolean;
  showGameGraph: boolean;
  showPaymentDay: boolean;
  showLevelUp: boolean;
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

  // Fix 4: Coalition actions
  formCoalition: (partnerIds: string[], targetZoneId: string) => void;
  confirmCoalitionCards: (coalitionId: string, playerId: string, cards: ActionCard[]) => void;
  revealCoalition: (coalitionId: string) => void;
  makePromise: (toPlayerId: string, resource: ResourceType, amount: number, round: number) => void;

  // Fix 6: Game Graph
  toggleGameGraph: () => void;

  // Scoring actions
  calculateRoundScoring: () => void;
  checkLevelUps: () => void;

  // UI actions
  selectCard: (cardId: string | null) => void;
  selectZone: (zoneId: string | null) => void;
  dismissHandoff: () => void;
  dismissPaymentDay: () => void;
  dismissLevelUp: () => void;
  toggleAudio: () => void;
  toggleMusic: () => void;
  toggleHighContrast: () => void;

  // Navigation actions
  returnToTitle: () => void;
  goBackSetup: () => void;

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
  showCoalitionModal: false,
  showPromiseModal: false,
  showNashDashboard: false,
  showGameGraph: false,
  showPaymentDay: false,
  showLevelUp: false,
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
    sm.transition('START_GAME');

    recorder.record(
      session.currentRound,
      session.currentPhase,
      'game_started',
      'system',
      'system',
      { config, playerCount: playerAssignments.length }
    );

    set({
      session: { ...session, currentPhase: 'setup_site_selection' },
      stateMachine: sm,
      telemetryRecorder: recorder,
      deliberationTimer: null,
      selectedCardId: null,
      selectedZoneId: null,
      showHandoff: false,
      showTradeModal: false,
      showVoteModal: false,
      showCoalitionModal: false,
      showPromiseModal: false,
      showGameGraph: false,
      showPaymentDay: false,
      showLevelUp: false,
      deliberationTimeRemaining: config.deliberationTimerSeconds,
      animationQueue: [],
    });
  },

  selectSite: (siteId) => {
    const { session, stateMachine } = get();
    if (!session) return;
    if (stateMachine.canTransition('SELECT_SITE')) {
      stateMachine.transition('SELECT_SITE');
    }
    set({
      session: { ...session, config: { ...session.config, siteId }, currentPhase: 'setup_role_assignment' },
    });
  },

  assignRoles: (_assignments) => {
    const { session, stateMachine } = get();
    if (!session) return;
    if (stateMachine.canTransition('ASSIGN_ROLES')) {
      stateMachine.transition('ASSIGN_ROLES');
    }
    set({ session: { ...session, currentPhase: 'setup_character_creation' } });
  },

  completeFacilitatorBriefing: () => {
    const { session, stateMachine } = get();
    if (!session) return;
    if (stateMachine.canTransition('CREATE_CHARACTERS')) {
      stateMachine.transition('CREATE_CHARACTERS');
    }
    if (stateMachine.canTransition('BRIEF_FACILITATOR')) {
      stateMachine.transition('BRIEF_FACILITATOR');
    }
    set({ session: { ...session, currentPhase: 'setup_standee_placement' } });
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
    if (!session) {
      console.error('TRANSITION CHAIN BREAK: startGame called but session is null!');
      return;
    }

    console.log('TRANSITION CHAIN: startGame() → stateMachine at:', stateMachine.currentState);

    const setupActions: GameAction[] = [
      'SELECT_SITE', 'ASSIGN_ROLES', 'CREATE_CHARACTERS',
      'BRIEF_FACILITATOR', 'PLACE_STANDEES', 'READY_TO_PLAY',
    ];

    for (const action of setupActions) {
      if (stateMachine.canTransition(action)) {
        const newState = stateMachine.transition(action);
        console.log(`TRANSITION CHAIN: ${action} → ${newState}`);
      }
    }

    console.log('TRANSITION CHAIN: stateMachine final state:', stateMachine.currentState);

    // Start with Payment Day (Phase 1 of new 7-phase system)
    const updatedSession = startPhase(session, 'payment_day');
    console.log('TRANSITION CHAIN: startPhase complete → phase:', updatedSession.currentPhase, 'status:', updatedSession.status);

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
      session: { ...updatedSession, status: 'playing' },
      showPaymentDay: true,
      animationQueue: [
        ...get().animationQueue,
        {
          id: `payment_day_${Date.now()}`,
          type: 'payment_day',
          data: { round: updatedSession.currentRound },
          timestamp: Date.now(),
        },
      ],
    });

    console.log('TRANSITION CHAIN COMPLETE: button → handleNext → startGame → stateMachine(payment_day) → set(playing) → GameScreen renders');
    console.log('  Final session phase:', get().session?.currentPhase, '| status:', get().session?.status);
  },

  // ── Gameplay Actions ──────────────────────────────────────────

  advancePhase: () => {
    const { session, stateMachine, telemetryRecorder } = get();
    if (!session) return;

    const fromPhase = session.currentPhase;

    // Resolve coalitions before leaving action_resolution
    let preState = session;
    if (session.currentPhase === 'action_resolution' && session.activeCoalitions.length > 0) {
      preState = resolveCoalitions(session);
    }

    const { nextPhase, gameState: transitionedState } = endPhase(preState);

    console.log('Phase transition:', fromPhase, '->', nextPhase);

    // Map phase transitions to state machine actions
    // Must handle both normal flow and skip-deliberation path
    const phaseActionMap: Partial<Record<string, GameAction>> = {
      // Normal flow: nextPhase -> action needed on state machine
      [`${fromPhase}->${nextPhase}`]: undefined, // filled dynamically below
    };

    // Determine the correct SM action based on from->to transition
    let smAction: GameAction | null = null;
    if (fromPhase === 'payment_day' && nextPhase === 'event_roll') smAction = 'COMPLETE_PAYMENT_DAY';
    else if (fromPhase === 'event_roll' && nextPhase === 'individual_action') smAction = 'EVENT_RESOLVED_NO_DELIB';
    else if (fromPhase === 'event_roll' && nextPhase === 'deliberation') smAction = 'EVENT_RESOLVED_DELIBERATION';
    else if (fromPhase === 'deliberation' && nextPhase === 'individual_action') smAction = 'END_DELIBERATION';
    else if (fromPhase === 'deliberation' && nextPhase === 'action_resolution') smAction = 'END_DELIBERATION';
    else if (fromPhase === 'individual_action' && nextPhase === 'action_resolution') smAction = 'ALL_PLAYERS_ACTED';
    else if (fromPhase === 'individual_action' && nextPhase === 'deliberation') smAction = 'COMPLETE_INDIVIDUAL_ACTION';
    else if (fromPhase === 'action_resolution' && nextPhase === 'round_end_accounting') smAction = 'COMPLETE_ACTION_RESOLUTION';
    else if (fromPhase === 'round_end_accounting' && nextPhase === 'level_check') smAction = 'COMPLETE_ROUND_END_ACCOUNTING';
    else if (fromPhase === 'level_check' && nextPhase === 'round_end') smAction = 'COMPLETE_LEVEL_CHECK';
    else if (fromPhase === 'round_end' && nextPhase === 'payment_day') smAction = 'NEXT_ROUND';
    else if (fromPhase === 'round_end' && nextPhase === 'game_end') smAction = 'END_GAME';

    if (smAction && stateMachine.canTransition(smAction)) {
      console.log('  SM transition:', stateMachine.currentState, '+', smAction);
      stateMachine.transition(smAction);
    } else if (smAction) {
      console.warn('  SM cannot transition with action:', smAction, 'from state:', stateMachine.currentState);
      // Force SM state to match
      stateMachine.setState(nextPhase);
    }

    if (telemetryRecorder) {
      telemetryRecorder.record(
        transitionedState.currentRound,
        nextPhase,
        'phase_start',
        'system',
        'system',
        { phase: nextPhase, fromPhase }
      );
    }

    const updatedSession = startPhase(transitionedState, nextPhase);

    // Show Payment Day overlay at start of new round
    const isPaymentDay = nextPhase === 'payment_day';
    const isLevelCheck = nextPhase === 'level_check' && updatedSession.gameLevel > (session.gameLevel || 1);

    console.log('  Phase started:', nextPhase, '| Status:', updatedSession.status);

    set({
      session: updatedSession,
      showHandoff: nextPhase === 'individual_action' || nextPhase === 'action_resolution',
      showPaymentDay: isPaymentDay,
      showLevelUp: isLevelCheck,
      selectedCardId: null,
      selectedZoneId: null,
    });
  },

  rollEventDie: () => {
    const { session, telemetryRecorder } = get();
    if (!session) return;

    console.log('Rolling event die (2d6)...');
    const updatedSession = startPhase(session, 'event_roll');
    console.log('Event roll result:', updatedSession.eventRollResult?.total, updatedSession.eventRollResult?.eventEntry.name);

    if (telemetryRecorder && updatedSession.eventRollResult) {
      telemetryRecorder.record(
        updatedSession.currentRound,
        updatedSession.currentPhase,
        'event_roll_2d6',
        'system',
        'system',
        {
          dice: updatedSession.eventRollResult.dice,
          total: updatedSession.eventRollResult.total,
          eventName: updatedSession.eventRollResult.eventEntry.name,
          phaseTriggered: updatedSession.eventRollResult.phaseTriggered,
        }
      );
    }

    set({
      session: updatedSession,
      animationQueue: [
        ...get().animationQueue,
        {
          id: `die_roll_${Date.now()}`,
          type: 'two_dice_roll',
          data: {
            dice: updatedSession.eventRollResult?.dice,
            total: updatedSession.eventRollResult?.total,
            eventName: updatedSession.eventRollResult?.eventEntry.name,
          },
          timestamp: Date.now(),
        },
      ],
    });
  },

  drawChallenge: () => {
    const { session, telemetryRecorder } = get();
    if (!session) return;

    const updatedSession = startPhase(session, 'event_roll');

    if (telemetryRecorder && updatedSession.activeChallenge) {
      const challenge = updatedSession.activeChallenge[0];
      telemetryRecorder.record(
        updatedSession.currentRound,
        updatedSession.currentPhase,
        'challenge_drawn',
        'system',
        'system',
        { challengeId: challenge.id, challengeName: challenge.name, difficulty: challenge.difficulty }
      );
    }

    set({ session: updatedSession });
  },

  startDeliberation: () => {
    const { session, telemetryRecorder } = get();
    if (!session) return;

    const updatedSession = startPhase(session, 'deliberation');

    if (telemetryRecorder) {
      telemetryRecorder.record(
        updatedSession.currentRound,
        updatedSession.currentPhase,
        'phase_start',
        'system',
        'system',
        { phase: 'deliberation' }
      );
    }

    const timer = new TimerService(
      session.config.deliberationTimerSeconds,
      (remaining) => { set({ deliberationTimeRemaining: remaining }); },
      () => { get().endDeliberation(); }
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

    if (deliberationTimer) deliberationTimer.stop();

    if (telemetryRecorder) {
      telemetryRecorder.record(
        session.currentRound,
        session.currentPhase,
        'phase_end',
        'system',
        'system',
        { phase: 'deliberation' }
      );
    }

    const updatedSession = startPhase(session, 'action_resolution');

    set({
      session: updatedSession,
      deliberationTimer: null,
      deliberationTimeRemaining: 0,
      showTradeModal: false,
      showCoalitionModal: false,
      showPromiseModal: false,
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

    // Mark zone as invested
    if (result.success && zoneId) {
      const invested = [...(updatedSession.zonesInvestedThisRound as string[])];
      if (!invested.includes(zoneId)) invested.push(zoneId);
      const zones = { ...updatedSession.board.zones };
      if (zones[zoneId]) {
        zones[zoneId] = { ...zones[zoneId], investedThisRound: true };
      }
      updatedSession = {
        ...updatedSession,
        zonesInvestedThisRound: invested,
        board: { ...updatedSession.board, zones },
      };
    }

    if (result.success) {
      // Track cards played this round
      if (currentPlayer) {
        const players = { ...updatedSession.players };
        const p = players[currentPlayer.id];
        if (p) {
          players[currentPlayer.id] = { ...p, cardsPlayedThisRound: (p.cardsPlayedThisRound || 0) + 1 };
          updatedSession = { ...updatedSession, players };
        }
      }

      updatedSession = advanceToNextPlayer(updatedSession);

      if (haveAllPlayersActed(updatedSession)) {
        set({
          session: updatedSession,
          selectedCardId: null,
          showHandoff: false,
          animationQueue: [
            ...get().animationQueue,
            { id: `card_${Date.now()}`, type: 'card_played', data: { cardId, zoneId, success: true }, timestamp: Date.now() },
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
          { id: `card_${Date.now()}`, type: 'card_played', data: { cardId, zoneId, success: true }, timestamp: Date.now() },
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
        result.gameState.currentRound, result.gameState.currentPhase,
        result.telemetryEvent.eventType, result.telemetryEvent.actorId,
        result.telemetryEvent.actorRole, result.telemetryEvent.data
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

    const newHand = currentPlayer.hand.filter((c) => c.id !== cardId);
    const updatedPlayer = { ...currentPlayer, hand: newHand };

    // Series escalation bonus (Fix 4)
    const cardCount = session.activeSeries.cards.length + 1;
    const seriesBonus = cardCount === 2 ? 2 : cardCount === 3 ? 5 : 0;

    const updatedSeries = {
      ...session.activeSeries,
      cards: [...session.activeSeries.cards, { card, playerId: currentPlayer.id }],
      currentValue: session.activeSeries.currentValue + card.baseValue + seriesBonus,
    };

    if (telemetryRecorder) {
      telemetryRecorder.record(
        session.currentRound, session.currentPhase,
        'series_contributed', currentPlayer.id, currentPlayer.roleId,
        { cardId, cardName: card.name, seriesBonus }
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
        result.gameState.currentRound, result.gameState.currentPhase,
        result.telemetryEvent.eventType, result.telemetryEvent.actorId,
        result.telemetryEvent.actorRole, result.telemetryEvent.data
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
        result.gameState.currentRound, result.gameState.currentPhase,
        result.telemetryEvent.eventType, result.telemetryEvent.actorId,
        result.telemetryEvent.actorRole, result.telemetryEvent.data
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
        result.gameState.currentRound, result.gameState.currentPhase,
        result.telemetryEvent.eventType, result.telemetryEvent.actorId,
        result.telemetryEvent.actorRole, result.telemetryEvent.data
      );
    }
    if (result.success) {
      set({
        session: result.gameState,
        selectedZoneId: null,
        animationQueue: [
          ...get().animationQueue,
          { id: `move_${Date.now()}`, type: 'zone_update', data: { targetZoneId }, timestamp: Date.now() },
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
        result.gameState.currentRound, result.gameState.currentPhase,
        result.telemetryEvent.eventType, result.telemetryEvent.actorId,
        result.telemetryEvent.actorRole, result.telemetryEvent.data
      );
    }

    // If passing in individual action, player draws 2 cards
    let updatedSession = result.gameState;
    if (session.currentPhase === 'individual_action') {
      const players = { ...updatedSession.players };
      const p = players[currentPlayer.id];
      if (p && p.drawPile.length >= 2) {
        const drawPile = [...p.drawPile];
        const drawn = drawPile.splice(0, 2);
        players[currentPlayer.id] = {
          ...p,
          hand: [...p.hand, ...drawn],
          drawPile,
          passedIndividualAction: true,
        };
        updatedSession = { ...updatedSession, players };
      }
    }

    updatedSession = advanceToNextPlayer(updatedSession);

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
    const result = engineProposeTrade(session, { proposerId: currentPlayer.id, targetId, offering, requesting });
    if (telemetryRecorder && result.telemetryEvent) {
      telemetryRecorder.record(
        result.gameState.currentRound, result.gameState.currentPhase,
        result.telemetryEvent.eventType, result.telemetryEvent.actorId,
        result.telemetryEvent.actorRole, result.telemetryEvent.data
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
        result.gameState.currentRound, result.gameState.currentPhase,
        result.telemetryEvent.eventType, result.telemetryEvent.actorId,
        result.telemetryEvent.actorRole, result.telemetryEvent.data
      );
    }
    set({
      session: result.gameState,
      animationQueue: [
        ...get().animationQueue,
        { id: `trade_${Date.now()}`, type: 'trade', data: { tradeId, accepted: true }, timestamp: Date.now() },
      ],
    });
  },

  rejectTrade: (tradeId) => {
    const { session, telemetryRecorder } = get();
    if (!session) return;
    const result = engineRejectTrade(session, tradeId);
    if (telemetryRecorder && result.telemetryEvent) {
      telemetryRecorder.record(
        result.gameState.currentRound, result.gameState.currentPhase,
        result.telemetryEvent.eventType, result.telemetryEvent.actorId,
        result.telemetryEvent.actorRole, result.telemetryEvent.data
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
        session.currentRound, session.currentPhase,
        'vote_called', currentPlayer.id, currentPlayer.roleId, { vote }
      );
    }
    set({ showVoteModal: false });
  },

  // ── Fix 4: Coalition Actions ───────────────────────────────
  formCoalition: (partnerIds, targetZoneId) => {
    const { session, telemetryRecorder } = get();
    if (!session) return;
    const currentPlayer = getCurrentPlayerSafe(session);
    if (!currentPlayer) return;

    const allParticipantIds = [currentPlayer.id, ...partnerIds];
    const participants = allParticipantIds.map(pid => {
      const p = session.players[pid];
      return {
        playerId: pid,
        roleId: p?.roleId || 'citizen' as RoleId,
        cardsPlayed: [] as ActionCard[],
        resourcesContributed: {} as Partial<ResourcePool>,
        confirmed: pid === currentPlayer.id,
        cardsRevealed: false,
      };
    });

    const combinationType = allParticipantIds.length >= 5 ? 'full'
      : allParticipantIds.length >= 4 ? 'quad'
      : allParticipantIds.length >= 3 ? 'trio'
      : 'pair';

    const coalition: CoalitionCombination = {
      id: `coalition_${Date.now()}`,
      participants,
      targetZoneId,
      combinationType,
      bonusOutcome: '',
      resolved: false,
      success: false,
    };

    if (telemetryRecorder) {
      telemetryRecorder.record(
        session.currentRound, session.currentPhase,
        'coalition_formed', currentPlayer.id, currentPlayer.roleId,
        { coalitionId: coalition.id, partnerIds, targetZoneId, combinationType }
      );
    }

    set({
      session: {
        ...session,
        activeCoalitions: [...session.activeCoalitions, coalition],
      },
      showCoalitionModal: false,
    });
  },

  confirmCoalitionCards: (coalitionId, playerId, cards) => {
    const { session } = get();
    if (!session) return;

    const coalitions = session.activeCoalitions.map(c => {
      if (c.id !== coalitionId) return c;
      return {
        ...c,
        participants: c.participants.map(p => {
          if (p.playerId !== playerId) return p;
          return { ...p, cardsPlayed: cards, confirmed: true };
        }),
      };
    });

    // Remove cards from player hand
    const players = { ...session.players };
    const player = players[playerId];
    if (player) {
      const cardIds = new Set(cards.map(c => c.id));
      players[playerId] = {
        ...player,
        hand: player.hand.filter(c => !cardIds.has(c.id)),
      };
    }

    set({ session: { ...session, activeCoalitions: coalitions, players } });
  },

  revealCoalition: (coalitionId) => {
    const { session, telemetryRecorder } = get();
    if (!session) return;

    const coalitions = session.activeCoalitions.map(c => {
      if (c.id !== coalitionId) return c;
      return {
        ...c,
        participants: c.participants.map(p => ({ ...p, cardsRevealed: true })),
      };
    });

    if (telemetryRecorder) {
      telemetryRecorder.record(
        session.currentRound, session.currentPhase,
        'coalition_reveal', 'system', 'system',
        { coalitionId }
      );
    }

    set({
      session: { ...session, activeCoalitions: coalitions },
      animationQueue: [
        ...get().animationQueue,
        { id: `coalition_reveal_${Date.now()}`, type: 'coalition_reveal', data: { coalitionId }, timestamp: Date.now() },
      ],
    });
  },

  makePromise: (toPlayerId, resource, amount, round) => {
    const { session, telemetryRecorder } = get();
    if (!session) return;
    const currentPlayer = getCurrentPlayerSafe(session);
    if (!currentPlayer) return;

    const promise: GamePromise = {
      id: `promise_${Date.now()}`,
      fromPlayerId: currentPlayer.id,
      toPlayerId,
      promisedResource: { type: resource, amount },
      promisedRound: round,
      fulfilled: false,
      broken: false,
    };

    if (telemetryRecorder) {
      telemetryRecorder.record(
        session.currentRound, session.currentPhase,
        'promise_made', currentPlayer.id, currentPlayer.roleId,
        { promiseId: promise.id, toPlayerId, resource, amount, round }
      );
    }

    set({
      session: { ...session, promises: [...session.promises, promise] },
      showPromiseModal: false,
    });
  },

  // ── Fix 6: Game Graph ──────────────────────────────────────
  toggleGameGraph: () => {
    set(state => ({ showGameGraph: !state.showGameGraph }));
  },

  // ── Scoring Actions ───────────────────────────────────────────

  calculateRoundScoring: () => {
    const { session, telemetryRecorder } = get();
    if (!session) return;

    const scoredSession = startPhase(session, 'round_end_accounting');

    if (telemetryRecorder) {
      telemetryRecorder.record(
        scoredSession.currentRound, scoredSession.currentPhase,
        'cws_updated', 'system', 'system',
        { cwsScore: scoredSession.cwsTracker.currentScore, targetScore: scoredSession.cwsTracker.targetScore }
      );
    }

    set({
      session: scoredSession,
      animationQueue: [
        ...get().animationQueue,
        { id: `scoring_${Date.now()}`, type: 'resource_change', data: { cwsScore: scoredSession.cwsTracker.currentScore }, timestamp: Date.now() },
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
            session.currentRound, session.currentPhase,
            'level_up', id, player.roleId,
            { previousLevel: player.level, newLevel: levelUpResult.newLevel, perks: levelUpResult.perks }
          );
        }
      }
    }

    if (anyLevelUp) {
      set({
        session: { ...session, players: updatedPlayers },
        animationQueue: [
          ...get().animationQueue,
          { id: `levelup_${Date.now()}`, type: 'level_up', data: {}, timestamp: Date.now() },
        ],
      });
    }
  },

  // ── UI Actions ────────────────────────────────────────────────

  selectCard: (cardId) => { set({ selectedCardId: cardId }); },
  selectZone: (zoneId) => { set({ selectedZoneId: zoneId }); },
  dismissHandoff: () => { set({ showHandoff: false }); },
  dismissPaymentDay: () => { set({ showPaymentDay: false }); },
  dismissLevelUp: () => { set({ showLevelUp: false }); },
  toggleAudio: () => { set((state) => ({ audioEnabled: !state.audioEnabled })); },
  toggleMusic: () => { set((state) => ({ musicEnabled: !state.musicEnabled })); },
  toggleHighContrast: () => { set((state) => ({ highContrastMode: !state.highContrastMode })); },

  // ── Navigation Actions ──────────────────────────────────────

  returnToTitle: () => {
    const { deliberationTimer } = get();
    if (deliberationTimer) deliberationTimer.stop();
    set({
      session: null,
      stateMachine: new GameStateMachine('title_screen'),
      telemetryRecorder: null,
      deliberationTimer: null,
      selectedCardId: null,
      selectedZoneId: null,
      showHandoff: false,
      showTradeModal: false,
      showVoteModal: false,
      showCoalitionModal: false,
      showPromiseModal: false,
      showGameGraph: false,
      showPaymentDay: false,
      showLevelUp: false,
      deliberationTimeRemaining: 0,
      animationQueue: [],
    });
  },

  goBackSetup: () => {
    const { session, stateMachine } = get();
    if (!session) return;

    const phase = session.currentPhase;
    const backMap: Record<string, { action: GameAction; phase: GamePhase }> = {
      'setup_role_assignment': { action: 'BACK_TO_SITE_SELECTION', phase: 'setup_site_selection' },
      'setup_character_creation': { action: 'BACK_TO_ROLE_ASSIGNMENT', phase: 'setup_role_assignment' },
      'setup_facilitator_briefing': { action: 'BACK_TO_CHARACTER_CREATION', phase: 'setup_character_creation' },
      'setup_standee_placement': { action: 'BACK_TO_FACILITATOR_BRIEFING', phase: 'setup_facilitator_briefing' },
    };

    const back = backMap[phase];
    if (back) {
      if (stateMachine.canTransition(back.action)) {
        stateMachine.transition(back.action);
      } else {
        stateMachine.setState(back.phase);
      }
      set({ session: { ...session, currentPhase: back.phase } });
    } else if (phase === 'setup_site_selection') {
      get().returnToTitle();
    }
  },

  // ── Save/Load Actions ────────────────────────────────────────

  saveGame: () => {
    const { session } = get();
    if (!session) return;
    const saveData = JSON.stringify(session, (key, value) => {
      if (value instanceof Set) return Array.from(value);
      return value;
    });
    try {
      localStorage.setItem(`commonground_save_${session.id}`, saveData);
    } catch { /* Storage full */ }
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
        showCoalitionModal: false,
        showPromiseModal: false,
        showGameGraph: false,
        showPaymentDay: false,
        showLevelUp: false,
        deliberationTimeRemaining: session.config.deliberationTimerSeconds,
        animationQueue: [],
      });
    } catch { /* Invalid JSON */ }
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
    if (!session || !session.activeChallenge || session.activeChallenge.length === 0) return null;
    return session.activeChallenge[0];
  },

  canPlayCard: (cardId) => {
    const { session } = get();
    if (!session) return false;
    if (session.currentPhase !== 'individual_action' && session.currentPhase !== 'action_resolution') return false;

    const player = getCurrentPlayerSafe(session);
    if (!player) return false;

    const card = player.hand.find((c) => c.id === cardId);
    if (!card) return false;

    // Check max 2 cards in individual action
    if (session.currentPhase === 'individual_action' && (player.cardsPlayedThisRound || 0) >= 2) return false;

    // Check resource cost
    if (card.cost) {
      for (const [resource, amount] of Object.entries(card.cost)) {
        if (amount && (amount as number) > 0 && player.resources[resource as keyof ResourcePool] < (amount as number)) {
          return false;
        }
      }
    }

    // Check budget cut restriction (Fix 3)
    if (player.statusEffects.some(e => e.source === 'event_budget_cut') && card.tags.includes('funding')) {
      return false;
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
