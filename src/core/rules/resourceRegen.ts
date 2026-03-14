import type { Board, Player, ResourceType, ZoneCondition } from '../models/types';

export interface ResourceRegenResult {
  zoneChanges: { zoneId: string; resourceType: ResourceType; delta: number }[];
  drains: { sourceZoneId: string; targetZoneId: string; amount: number }[];
}

export function performResourceRegeneration(
  board: Board,
  adjacency: Record<string, string[]>,
  rng: { nextInt(min: number, max: number): number }
): ResourceRegenResult {
  const zoneChanges: ResourceRegenResult['zoneChanges'] = [];
  const drains: ResourceRegenResult['drains'] = [];

  for (const [zoneId, zone] of Object.entries(board.zones)) {
    const condition: ZoneCondition = zone.condition;
    const adjIds = adjacency[zoneId] || [];

    switch (condition) {
      case 'good': {
        // +1 primary resource
        const resType = zone.primaryResourceType;
        zone.resources[resType] += 1;
        zoneChanges.push({ zoneId, resourceType: resType, delta: 1 });
        break;
      }

      case 'fair': {
        // Nothing happens
        break;
      }

      case 'poor': {
        // Drain 1 resource from one random adjacent zone
        const eligibleAdj = adjIds.filter((id) => {
          const adj = board.zones[id];
          return adj && !adj.isLocked;
        });
        if (eligibleAdj.length > 0) {
          const targetId = eligibleAdj[rng.nextInt(0, eligibleAdj.length - 1)];
          const targetZone = board.zones[targetId];
          if (targetZone) {
            const resType = targetZone.primaryResourceType;
            if (targetZone.resources[resType] > 0) {
              targetZone.resources[resType] -= 1;
              zoneChanges.push({ zoneId: targetId, resourceType: resType, delta: -1 });
              drains.push({ sourceZoneId: zoneId, targetZoneId: targetId, amount: 1 });
            }
          }
        }
        break;
      }

      case 'critical': {
        // Drain 1 from ALL adjacent zones
        for (const adjId of adjIds) {
          const adjZone = board.zones[adjId];
          if (adjZone && !adjZone.isLocked) {
            const resType = adjZone.primaryResourceType;
            if (adjZone.resources[resType] > 0) {
              adjZone.resources[resType] -= 1;
              zoneChanges.push({ zoneId: adjId, resourceType: resType, delta: -1 });
              drains.push({ sourceZoneId: zoneId, targetZoneId: adjId, amount: 1 });
            }
          }
        }
        break;
      }

      case 'locked': {
        // Drain 2 from ALL adjacent zones
        for (const adjId of adjIds) {
          const adjZone = board.zones[adjId];
          if (adjZone && !adjZone.isLocked) {
            const resType = adjZone.primaryResourceType;
            const drainAmount = Math.min(2, adjZone.resources[resType]);
            if (drainAmount > 0) {
              adjZone.resources[resType] -= drainAmount;
              zoneChanges.push({ zoneId: adjId, resourceType: resType, delta: -drainAmount });
              drains.push({ sourceZoneId: zoneId, targetZoneId: adjId, amount: drainAmount });
            }
          }
        }
        break;
      }
    }
  }

  return { zoneChanges, drains };
}

export function drawCardForPlayer(player: Player): Player {
  const updated = { ...player };

  if (updated.drawPile.length === 0) {
    // Shuffle discard pile into draw pile
    if (updated.discardPile.length === 0) {
      return updated; // No cards available
    }
    updated.drawPile = [...updated.discardPile];
    updated.discardPile = [];
    // Simple shuffle (Fisher-Yates)
    for (let i = updated.drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [updated.drawPile[i], updated.drawPile[j]] = [updated.drawPile[j], updated.drawPile[i]];
    }
  }

  if (updated.drawPile.length > 0) {
    const drawn = updated.drawPile.shift()!;
    updated.hand = [...updated.hand, drawn];
  }

  return updated;
}
