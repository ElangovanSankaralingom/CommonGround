import type { GameSession, Player, RoleId } from '../models/types';

const INACTIVITY_THRESHOLD_MS = 90_000; // 90 seconds

export interface EquityPrompt {
  playerId: string;
  prompt: string;
  inactiveDurationMs: number;
}

export class EquityMonitor {
  private lastActivityTime: Map<string, number> = new Map();

  /** Record activity for a player at the given timestamp (ms) */
  trackActivity(playerId: string, timestampMs?: number): void {
    this.lastActivityTime.set(playerId, timestampMs ?? Date.now());
  }

  /** Initialize tracking for all players */
  initializePlayers(playerIds: string[], timestampMs?: number): void {
    const now = timestampMs ?? Date.now();
    for (const id of playerIds) {
      this.lastActivityTime.set(id, now);
    }
  }

  /** Check which players have been inactive beyond the threshold */
  checkInactivity(currentTimeMs?: number): string[] {
    const now = currentTimeMs ?? Date.now();
    const inactivePlayers: string[] = [];

    for (const [playerId, lastTime] of this.lastActivityTime.entries()) {
      if (now - lastTime > INACTIVITY_THRESHOLD_MS) {
        inactivePlayers.push(playerId);
      }
    }

    return inactivePlayers;
  }

  /** Get how long a player has been inactive in ms */
  getInactiveDuration(playerId: string, currentTimeMs?: number): number {
    const now = currentTimeMs ?? Date.now();
    const lastTime = this.lastActivityTime.get(playerId);
    if (lastTime === undefined) return 0;
    return Math.max(0, now - lastTime);
  }

  /** Generate a contextual equity prompt for an inactive player */
  generatePrompt(playerId: string, gameState: GameSession): EquityPrompt {
    const player = gameState.players[playerId];
    const inactiveDuration = this.getInactiveDuration(playerId);

    if (!player) {
      return {
        playerId,
        prompt: 'We would love to hear your perspective. What do you think about the current situation?',
        inactiveDurationMs: inactiveDuration,
      };
    }

    const prompt = buildContextualPrompt(player, gameState);

    return {
      playerId,
      prompt,
      inactiveDurationMs: inactiveDuration,
    };
  }
}

function buildContextualPrompt(player: Player, gameState: GameSession): string {
  const roleName = formatRoleName(player.roleId);
  const phase = gameState.currentPhase;

  // Check if player is in crisis
  if (player.crisisState) {
    return `${player.name}, as the ${roleName}, you're currently in crisis. What resources or support would help stabilize your situation? The group might be able to assist.`;
  }

  // Check active challenges
  if (gameState.activeChallenge && gameState.activeChallenge.length > 0) {
    const challenge = gameState.activeChallenge[0];
    const affectsPlayerZone = challenge.affectedZoneIds.includes(player.focusZoneId);
    if (affectsPlayerZone) {
      return `${player.name}, the "${challenge.name}" challenge directly affects your focus zone. How do you think the group should approach this? Your ${roleName} perspective could be valuable.`;
    }
    return `${player.name}, as the ${roleName}, what is your take on the "${challenge.name}" challenge? Do you have resources or cards that could contribute?`;
  }

  // Check if in deliberation phase
  if (phase === 'deliberation') {
    return `${player.name}, the group is deliberating. As the ${roleName}, what priorities would you like to advocate for this round?`;
  }

  // Check zone conditions relevant to player
  const focusZone = gameState.board.zones[player.focusZoneId];
  if (focusZone && (focusZone.condition === 'poor' || focusZone.condition === 'critical')) {
    return `${player.name}, your focus zone "${focusZone.name}" is in ${focusZone.condition} condition. What actions do you think should be taken to improve it?`;
  }

  // Check if player has strong resources they could share
  const totalResources =
    player.resources.budget +
    player.resources.influence +
    player.resources.volunteer +
    player.resources.material +
    player.resources.knowledge;
  if (totalResources > 10) {
    return `${player.name}, you have substantial resources available. As the ${roleName}, would you consider contributing to any collaborative efforts this round?`;
  }

  // Default prompt
  return `${player.name}, we haven't heard from you in a while. As the ${roleName}, what are your thoughts on the current state of the community? Every voice matters in CommonGround.`;
}

function formatRoleName(roleId: RoleId): string {
  const names: Record<RoleId, string> = {
    administrator: 'Administrator',
    designer: 'Designer',
    citizen: 'Citizen',
    investor: 'Investor',
    advocate: 'Advocate',
  };
  return names[roleId] || roleId;
}
