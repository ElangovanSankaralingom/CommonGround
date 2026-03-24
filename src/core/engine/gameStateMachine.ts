import { GamePhase } from '../models/types';

/**
 * Top-level game states that wrap the GamePhase values.
 */
export type GameState =
  | 'title_screen'
  | GamePhase;

/**
 * Actions that trigger state transitions.
 */
export type GameAction =
  // Top-level
  | 'START_GAME'
  | 'BEGIN_SETUP'
  // Setup sub-states
  | 'SELECT_SITE'
  | 'ASSIGN_ROLES'
  | 'CREATE_CHARACTERS'
  | 'BRIEF_FACILITATOR'
  | 'PLACE_STANDEES'
  | 'READY_TO_PLAY'
  // Setup backward navigation
  | 'BACK_TO_SITE_SELECTION'
  | 'BACK_TO_ROLE_ASSIGNMENT'
  | 'BACK_TO_CHARACTER_CREATION'
  | 'BACK_TO_FACILITATOR_BRIEFING'
  | 'BACK_TO_STANDEE_PLACEMENT'
  // Gameplay — 7-phase round (Fix 5)
  | 'BEGIN_ROUND'
  | 'COMPLETE_PAYMENT_DAY'
  | 'COMPLETE_EVENT_ROLL'
  | 'COMPLETE_INDIVIDUAL_ACTION'
  | 'START_DELIBERATION'
  | 'SKIP_DELIBERATION'
  | 'END_DELIBERATION'
  | 'ALL_PLAYERS_READY'
  | 'COMPLETE_ACTION_RESOLUTION'
  | 'COMPLETE_ROUND_END_ACCOUNTING'
  | 'COMPLETE_LEVEL_CHECK'
  | 'NEXT_ROUND'
  | 'END_GAME'
  // Legacy actions for backwards compat
  | 'RESOLVE_EVENT'
  | 'CONFIRM_CHALLENGE'
  | 'START_ACTION_RESOLUTION'
  | 'ALL_PLAYERS_ACTED'
  | 'SCORING_DISPLAYED'
  // Post-game
  | 'START_DEBRIEF'
  | 'START_EXPORT'
  | 'RETURN_TO_TITLE';

/**
 * Defines valid transitions: from state -> { action -> target state }
 */
const validTransitions: Record<string, Partial<Record<GameAction, GameState>>> = {
  title_screen: {
    START_GAME: 'setup_site_selection',
  },
  setup_site_selection: {
    SELECT_SITE: 'setup_role_assignment',
    RETURN_TO_TITLE: 'title_screen',
  },
  setup_role_assignment: {
    ASSIGN_ROLES: 'setup_character_creation',
    BACK_TO_SITE_SELECTION: 'setup_site_selection',
    RETURN_TO_TITLE: 'title_screen',
  },
  setup_character_creation: {
    CREATE_CHARACTERS: 'setup_facilitator_briefing',
    BACK_TO_ROLE_ASSIGNMENT: 'setup_role_assignment',
    RETURN_TO_TITLE: 'title_screen',
  },
  setup_facilitator_briefing: {
    BRIEF_FACILITATOR: 'setup_standee_placement',
    BACK_TO_CHARACTER_CREATION: 'setup_character_creation',
    RETURN_TO_TITLE: 'title_screen',
  },
  setup_standee_placement: {
    PLACE_STANDEES: 'setup_ready',
    BACK_TO_FACILITATOR_BRIEFING: 'setup_facilitator_briefing',
    RETURN_TO_TITLE: 'title_screen',
  },
  setup_ready: {
    READY_TO_PLAY: 'payment_day',
    BACK_TO_STANDEE_PLACEMENT: 'setup_standee_placement',
    RETURN_TO_TITLE: 'title_screen',
  },

  // ─── 7-Phase Round Structure (Fix 5) ──────────────────────
  payment_day: {
    COMPLETE_PAYMENT_DAY: 'event_roll',
  },
  event_roll: {
    COMPLETE_EVENT_ROLL: 'individual_action',
  },
  individual_action: {
    COMPLETE_INDIVIDUAL_ACTION: 'deliberation',
    SKIP_DELIBERATION: 'action_resolution',
  },
  deliberation: {
    END_DELIBERATION: 'action_resolution',
    ALL_PLAYERS_READY: 'action_resolution',
  },
  action_resolution: {
    COMPLETE_ACTION_RESOLUTION: 'round_end_accounting',
  },
  round_end_accounting: {
    COMPLETE_ROUND_END_ACCOUNTING: 'level_check',
  },
  level_check: {
    COMPLETE_LEVEL_CHECK: 'round_end',
  },
  round_end: {
    NEXT_ROUND: 'payment_day',
    END_GAME: 'game_end',
  },

  game_end: {
    START_DEBRIEF: 'debrief',
  },
  debrief: {
    START_EXPORT: 'export',
  },
  export: {
    RETURN_TO_TITLE: 'title_screen',
  },
};

export class GameStateMachine {
  private _currentState: GameState;

  constructor(initialState: GameState = 'title_screen') {
    this._currentState = initialState;
  }

  get currentState(): GameState {
    return this._currentState;
  }

  canTransition(action: GameAction): boolean {
    const transitions = validTransitions[this._currentState];
    if (!transitions) return false;
    return action in transitions;
  }

  transition(action: GameAction): GameState {
    const transitions = validTransitions[this._currentState];
    if (!transitions || !(action in transitions)) {
      throw new Error(
        `Invalid transition: cannot perform action "${action}" from state "${this._currentState}".`
      );
    }
    const nextState = transitions[action]!;
    this._currentState = nextState;
    return nextState;
  }

  getAvailableActions(): GameAction[] {
    const transitions = validTransitions[this._currentState];
    if (!transitions) return [];
    return Object.keys(transitions) as GameAction[];
  }

  setState(state: GameState): void {
    this._currentState = state;
  }

  static getValidTransitions(): Record<string, Partial<Record<GameAction, GameState>>> {
    return { ...validTransitions };
  }
}
