/**
 * investigationEngine.ts -- Investigation Phase Logic
 *
 * Functional engine for the hidden object investigation mechanic.
 * Follows the same functional patterns as actionProcessor.ts and turnManager.ts.
 */

import {
  type InvestigationZone,
  type InvestigationObject,
  getInvestigationZone,
  getInvestigationZoneIdFromEngine,
} from '../content/investigationData';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClickResult {
  type: 'clue' | 'consequence';
  object: InvestigationObject;
  scoreChange: number;
  endsTurn: boolean;
  consequenceDetail?: {
    kind: 'timer' | 'distracted' | 'awareness' | 'wasted' | 'bureaucratic';
    timerLoss?: number;
  };
  awarenessBonus?: boolean;
  distractedMarker?: boolean;
}

export interface HintResult {
  object: InvestigationObject;
  hintsRemaining: number;
  scorePenalty: number;
}

export type InvestigationQuality = 'Complete' | 'Thorough' | 'Partial' | 'Incomplete';

export interface InvestigationSummary {
  quality: InvestigationQuality;
  relevantFound: number;
  relevantTotal: number;
  irrelevantClicked: number;
  score: number;
  completionBonus: number;
  finalScore: number;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Load a zone config for investigation by zone ID or engine zone ID.
 */
export function loadZone(zoneId: string): InvestigationZone {
  // Try direct lookup first, then engine ID mapping
  const zone = getInvestigationZone(zoneId);
  console.log(`INVESTIGATION_ENGINE: loadZone "${zoneId}" → "${zone.title}" (${zone.objects.length} objects)`);
  return zone;
}

/**
 * Load a zone by engine zone ID (e.g. 'boating_pond' → z3).
 */
export function loadZoneByEngineId(engineZoneId: string): InvestigationZone {
  const invZoneId = getInvestigationZoneIdFromEngine(engineZoneId);
  return loadZone(invZoneId);
}

/**
 * Find the nearest unfound object to a click position.
 * Converts pixel coordinates to normalized (0-1) coordinates and finds
 * the nearest object within hit radius.
 */
export function findNearestObject(
  clickX: number,
  clickY: number,
  containerWidth: number,
  containerHeight: number,
  objects: InvestigationObject[],
  foundSet: Set<string>,
): InvestigationObject | null {
  const normX = clickX / containerWidth;
  const normY = clickY / containerHeight;
  const hitRadius = 0.06; // 6% of container dimension

  console.log(`PHASE4_CLICK: x=${normX.toFixed(3)} y=${normY.toFixed(3)}`);

  let nearest: InvestigationObject | null = null;
  let nearestDist = Infinity;

  for (const obj of objects) {
    if (foundSet.has(obj.id)) continue;

    const dx = normX - obj.x;
    const dy = normY - obj.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < hitRadius && dist < nearestDist) {
      nearest = obj;
      nearestDist = dist;
    }
  }

  if (nearest) {
    console.log(`PHASE4_HIT: ${nearest.name} (dist=${nearestDist.toFixed(3)})`);
  } else {
    console.log('PHASE4_MISS');
  }

  return nearest;
}

/**
 * Handle clicking an object. Returns score changes and turn effects.
 */
export function handleObjectClick(
  object: InvestigationObject,
  activeEffects: Set<string>,
): ClickResult {
  if (object.relevant) {
    const awarenessBonus = activeEffects.has('awareness');
    const distractedMarker = activeEffects.has('distracted');
    const baseScore = 1500;
    const bonus = awarenessBonus ? 200 : 0;

    return {
      type: 'clue',
      object,
      scoreChange: baseScore + bonus,
      endsTurn: true,
      awarenessBonus,
      distractedMarker,
    };
  }

  // Irrelevant object
  const consequence = object.consequence || 'wasted';
  return {
    type: 'consequence',
    object,
    scoreChange: -500,
    endsTurn: false,
    consequenceDetail: {
      kind: consequence,
      timerLoss: consequence === 'timer' ? (object.timerLoss || 5) : undefined,
    },
  };
}

/**
 * Use a hint to reveal a random undiscovered relevant object.
 * Max 3 hints per investigation. Each costs 200 score.
 */
export function handleHintUse(
  objects: InvestigationObject[],
  foundSet: Set<string>,
  hintsUsed: number,
): HintResult | null {
  const maxHints = 3;
  if (hintsUsed >= maxHints) {
    console.log('PHASE4_HINT: No hints remaining');
    return null;
  }

  const undiscovered = objects.filter(o => o.relevant && !foundSet.has(o.id));
  if (undiscovered.length === 0) {
    console.log('PHASE4_HINT: All relevant objects found');
    return null;
  }

  const randomIdx = Math.floor(Math.random() * undiscovered.length);
  const hinted = undiscovered[randomIdx];
  console.log(`PHASE4_HINT: Revealing "${hinted.name}" (hint ${hintsUsed + 1}/${maxHints})`);

  return {
    object: hinted,
    hintsRemaining: maxHints - hintsUsed - 1,
    scorePenalty: 200,
  };
}

/**
 * Generate investigation summary with quality rating and completion bonus.
 */
export function getInvestigationSummary(
  objects: InvestigationObject[],
  foundSet: Set<string>,
  score: number,
): InvestigationSummary {
  const relevant = objects.filter(o => o.relevant);
  const relevantFound = relevant.filter(o => foundSet.has(o.id)).length;
  const irrelevantClicked = objects.filter(o => !o.relevant && foundSet.has(o.id)).length;
  const relevantTotal = relevant.length;

  let quality: InvestigationQuality;
  let completionBonus = 0;

  if (relevantFound >= relevantTotal) {
    quality = 'Complete';
    completionBonus = 3000;
  } else if (relevantFound >= 5) {
    quality = 'Thorough';
    completionBonus = 1500;
  } else if (relevantFound >= 3) {
    quality = 'Partial';
    completionBonus = 500;
  } else {
    quality = 'Incomplete';
    completionBonus = 0;
  }

  const finalScore = score + completionBonus;

  console.log(`PHASE4_SUMMARY: ${quality} (${relevantFound}/${relevantTotal} found, score=${finalScore})`);

  return {
    quality,
    relevantFound,
    relevantTotal,
    irrelevantClicked,
    score,
    completionBonus,
    finalScore,
  };
}
