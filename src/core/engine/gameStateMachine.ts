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
  // Gameplay
  | 'BEGIN_ROUND'
  | 'RESOLVE_EVENT'
  | 'PRESENT_CHALLENGE'
  | 'CONFIRM_CHALLENGE'
  | 'START_DELIBERATION'
  | 'END_DELIBERATION'
  | 'ALL_PLAYERS_READY'
  | 'START_ACTION_RESOLUTION'
  | 'ALL_PLAYERS_ACTED'
  | 'SCORING_DISPLAYED'
  | 'NEXT_ROUND'
  | 'END_GAME'
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
  },
  setup_role_assignment: {
    ASSIGN_ROLES: 'setup_character_creation',
  },
  setup_character_creation: {
    CREATE_CHARACTERS: 'setup_facilitator_briefing',
  },
  setup_facilitator_briefing: {
    BRIEF_FACILITATOR: 'setup_standee_placement',
  },
  setup_standee_placement: {
    PLACE_STANDEES: 'setup_ready',
  },
  setup_ready: {
    READY_TO_PLAY: 'phase_1_event',
  },
  phase_1_event: {
    RESOLVE_EVENT: 'phase_2_challenge',
  },
  phase_2_challenge: {
    CONFIRM_CHALLENGE: 'phase_3_deliberation',
  },
  phase_3_deliberation: {
    END_DELIBERATION: 'phase_4_action',
    ALL_PLAYERS_READY: 'phase_4_action',
  },
  phase_4_action: {
    ALL_PLAYERS_ACTED: 'phase_5_scoring',
  },
  phase_5_scoring: {
    SCORING_DISPLAYED: 'round_end',
  },
  round_end: {
    NEXT_ROUND: 'phase_1_event',
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

  /**
   * Check whether a given action is valid from the current state.
   */
  canTransition(action: GameAction): boolean {
    const transitions = validTransitions[this._currentState];
    if (!transitions) return false;
    return action in transitions;
  }

  /**
   * Attempt to transition to the next state via an action.
   * Throws if the transition is not valid.
   */
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

  /**
   * Returns all actions available from the current state.
   */
  getAvailableActions(): GameAction[] {
    const transitions = validTransitions[this._currentState];
    if (!transitions) return [];
    return Object.keys(transitions) as GameAction[];
  }

  /**
   * Force the state machine to a specific state (e.g., for loading saved games).
   */
  setState(state: GameState): void {
    this._currentState = state;
  }

  /**
   * Expose the full valid transitions map for external inspection.
   */
  static getValidTransitions(): Record<string, Partial<Record<GameAction, GameState>>> {
    return { ...validTransitions };
  }
}
