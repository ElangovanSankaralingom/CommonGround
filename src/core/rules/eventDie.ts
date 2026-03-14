import type { EventDieResult } from '../models/types';

/**
 * Seeded PRNG using mulberry32 algorithm.
 * Produces deterministic sequences for reproducible game events.
 */
export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /** Returns a float in [0, 1) */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max] inclusive */
  nextInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
}

/**
 * Roll the event die:
 * - 1-2: negative event
 * - 3-4: no event
 * - 5-6: positive event
 */
export function rollEventDie(rng: SeededRNG): EventDieResult {
  const value = rng.nextInt(1, 6);

  let outcome: EventDieResult['outcome'];
  if (value <= 2) {
    outcome = 'negative_event';
  } else if (value <= 4) {
    outcome = 'no_event';
  } else {
    outcome = 'positive_event';
  }

  return { value, outcome };
}
