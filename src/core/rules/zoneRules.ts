import type { Board, Zone, ZoneCondition } from '../models/types';

const CONDITION_LADDER: ZoneCondition[] = ['locked', 'critical', 'poor', 'fair', 'good'];

export function improveZoneCondition(zone: Zone, levels: number = 1): ZoneCondition {
  if (zone.isLocked) return 'locked';

  const idx = CONDITION_LADDER.indexOf(zone.condition);
  // Cannot improve from locked via this function; use unlockZone instead
  if (idx <= 0) return zone.condition;

  const newIdx = Math.min(CONDITION_LADDER.length - 1, idx + levels);
  return CONDITION_LADDER[newIdx];
}

export function degradeZoneCondition(zone: Zone): ZoneCondition {
  const idx = CONDITION_LADDER.indexOf(zone.condition);
  if (idx <= 0) return zone.condition; // Already locked or at bottom

  const newIdx = idx - 1;
  return CONDITION_LADDER[newIdx];
}

export function isZoneLocked(zone: Zone): boolean {
  return zone.isLocked || zone.condition === 'locked';
}

export function canUnlockZone(zone: Zone, board: Board): boolean {
  if (!isZoneLocked(zone)) return false;

  const adjacentZoneIds = board.adjacency[zone.id] || [];
  return adjacentZoneIds.some((adjId) => {
    const adjZone = board.zones[adjId];
    return adjZone && adjZone.condition === 'good';
  });
}

export function unlockZone(zone: Zone): Zone {
  return {
    ...zone,
    isLocked: false,
    condition: 'critical' as ZoneCondition,
  };
}
