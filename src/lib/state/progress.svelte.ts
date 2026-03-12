/**
 * Student progress reactive state — shared across Astro islands.
 *
 * Loads from localStorage at module top-level (no flash of "no data").
 * Auto-saves on mutation with 500ms debounce.
 * Flushes pending writes on beforeunload.
 */

import type { CardData, ProgressData, SM2Quality, ISODateString } from "../types";
import { toISODateString } from "../types";
import { calculateSM2, createNewCard } from "../sm2";
import {
  loadProgress,
  saveProgress,
  isStorageAvailable,
} from "../persistence";

// --- Initial load ---

const stored = loadProgress();
const storageAvailable = isStorageAvailable();

export const progressState: ProgressData = $state(
  stored ?? { schemaVersion: 1 as const, cards: {} },
);

/** Whether localStorage is available for persistence */
export const canPersist = storageAvailable;

// --- Persistence metadata (not part of stored data) ---

const persistenceMeta = $state({
  importInProgress: false,
});

// --- Auto-save with debounce ---

let saveTimeout: ReturnType<typeof setTimeout>;

const dispose = $effect.root(() => {
  $effect(() => {
    if (persistenceMeta.importInProgress) return;
    // Touch cards to subscribe to changes
    void progressState.cards;
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveProgress(progressState);
    }, 500);
  });
});

// Flush pending save on tab close
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveProgress(progressState);
    }
  });
}

// --- Public API ---

/**
 * Record a quiz answer and update SM-2 scheduling.
 *
 * Scoring policy: Quiz component reports `correct: boolean`.
 * We map that to SM-2 quality scores:
 *   correct → quality 5 (perfect recall)
 *   incorrect → quality 1 (wrong, but remembered upon seeing answer)
 */
export function recordAnswer(questionId: string, correct: boolean): void {
  const quality: SM2Quality = correct ? 5 : 1;
  const now = toISODateString(new Date());

  const existing = progressState.cards[questionId];
  const input = existing
    ? {
        quality,
        repetitions: existing.repetitions,
        easeFactor: existing.easeFactor,
        interval: existing.interval,
      }
    : { quality, ...createNewCard() };

  const result = calculateSM2(input);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + result.interval);

  progressState.cards[questionId] = {
    interval: result.interval,
    repetitions: result.repetitions,
    easeFactor: result.easeFactor,
    dueDate: toISODateString(dueDate),
    lastAnswer: quality,
    lastReviewed: now,
  };
}

/**
 * Check if a quiz is due for review.
 */
export function isDue(questionId: string): boolean {
  const card = progressState.cards[questionId];
  if (!card) return false;
  return card.dueDate <= new Date().toISOString();
}

/**
 * Get questions due for review, sorted by most overdue first.
 * Capped at `limit` results.
 */
export function getDueQuestions(limit = 7): string[] {
  const now = new Date().toISOString();
  return Object.entries(progressState.cards)
    .filter(([, card]) => card.dueDate <= now)
    .sort(([, a], [, b]) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, limit)
    .map(([id]) => id);
}

/**
 * Check if a question has been answered before.
 */
export function hasBeenAnswered(questionId: string): boolean {
  return questionId in progressState.cards;
}

/**
 * Import progress data, replacing current state.
 * Suspends auto-save during import to prevent race conditions.
 */
export function importProgress(data: ProgressData): void {
  // Kill any pending stale write
  clearTimeout(saveTimeout);
  persistenceMeta.importInProgress = true;

  // Replace state
  progressState.schemaVersion = data.schemaVersion;
  progressState.cards = data.cards;

  // Save imported data immediately
  saveProgress(progressState);

  // Re-enable auto-save
  persistenceMeta.importInProgress = false;
}
