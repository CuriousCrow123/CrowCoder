/**
 * SM-2 Spaced Repetition Algorithm (Wozniak 1990)
 *
 * Calculates review intervals based on recall quality.
 * Pure function — no side effects, no framework dependencies.
 *
 * Algorithm source: https://super-memory.com/english/ol/sm2.htm
 *
 * Quality scale:
 *   5 — perfect response
 *   4 — correct after hesitation
 *   3 — correct with serious difficulty
 *   2 — incorrect; correct answer seemed easy to recall
 *   1 — incorrect; correct answer remembered upon seeing it
 *   0 — complete blackout
 */

import type { SM2Quality } from "./types";

/** Default ease factor for new cards */
export const INITIAL_EASE_FACTOR = 2.5;

/** Ease factor floor — prevents intervals from shrinking too aggressively */
export const MIN_EASE_FACTOR = 1.3;

export interface SM2Input {
  quality: SM2Quality;
  repetitions: number;
  easeFactor: number;
  interval: number; // days
}

export interface SM2Output {
  repetitions: number;
  easeFactor: number;
  interval: number; // days
}

/**
 * Core SM-2 calculation.
 *
 * Interval rules:
 *   I(1) = 1 day
 *   I(2) = 6 days
 *   I(n) = I(n-1) × EF   (for n > 2)
 *
 * Ease factor update (only when q >= 3):
 *   EF' = EF + (0.1 - (5 - q) × (0.08 + (5 - q) × 0.02))
 *   EF' is clamped to a minimum of 1.3
 *
 * Quality < 3 resets the repetition count and interval
 * but preserves the ease factor unchanged (per original spec).
 */
export function calculateSM2(input: SM2Input): SM2Output {
  const { quality, repetitions, easeFactor, interval } = input;

  // Quality < 3: incorrect — restart schedule, preserve ease factor unchanged
  if (quality < 3) {
    return {
      repetitions: 0,
      easeFactor,
      interval: 1,
    };
  }

  // Quality >= 3: correct — update ease factor and advance schedule
  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  const newEaseFactor = Math.max(MIN_EASE_FACTOR, easeFactor + delta);

  let newInterval: number;
  const newRepetitions = repetitions + 1;

  if (repetitions === 0) {
    // First successful review: 1 day
    newInterval = 1;
  } else if (repetitions === 1) {
    // Second successful review: 6 days
    newInterval = 6;
  } else {
    // Subsequent reviews: previous interval × ease factor, rounded to nearest integer
    newInterval = Math.round(interval * newEaseFactor);
  }

  return {
    repetitions: newRepetitions,
    easeFactor: newEaseFactor,
    interval: newInterval,
  };
}

/**
 * Create initial SM-2 card data for a new question.
 */
export function createNewCard() {
  return {
    interval: 0,
    repetitions: 0,
    easeFactor: INITIAL_EASE_FACTOR,
  };
}
