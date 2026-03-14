import { GameSession, Player } from '../models/types';

/**
 * Calculate turn order: players sorted by utility score ascending (lowest first).
 * On tie, alphabetical by role name.
 */
export function calculateTurnOrder(players: Record<string, Player>): string[] {
  const playerList = Object.values(players);

  playerList.sort((a, b) => {
    if (a.utilityScore !== b.utilityScore) {
      return a.utilityScore - b.utilityScore;
    }
    return a.roleId.localeCompare(b.roleId);
  });

  return playerList.map((p) => p.id);
}

/**
 * Get the player whose turn it currently is.
 */
export function getCurrentPlayer(gameState: GameSession): Player {
  const currentId = gameState.turnOrder[gameState.currentPlayerTurnIndex];
  if (!currentId) {
    throw new Error(
      `No player found at turn index ${gameState.currentPlayerTurnIndex}. ` +
      `Turn order has ${gameState.turnOrder.length} entries.`
    );
  }
  const player = gameState.players[currentId];
  if (!player) {
    throw new Error(`Player "${currentId}" not found in game state.`);
  }
  return player;
}

/**
 * Advance to the next player in the turn order.
 * Returns a new game state with the updated turn index.
 */
export function advanceToNextPlayer(gameState: GameSession): GameSession {
  const nextIndex = gameState.currentPlayerTurnIndex + 1;

  return {
    ...gameState,
    currentPlayerTurnIndex: nextIndex,
  };
}

/**
 * Check whether all players have had their turn (or passed) this round.
 */
export function haveAllPlayersActed(gameState: GameSession): boolean {
  return gameState.currentPlayerTurnIndex >= gameState.turnOrder.length;
}

/**
 * Recalculate turn order based on current utility scores and reset the turn index.
 */
export function resetTurnOrder(gameState: GameSession): GameSession {
  const newOrder = calculateTurnOrder(gameState.players);

  return {
    ...gameState,
    turnOrder: newOrder,
    currentPlayerTurnIndex: 0,
  };
}
