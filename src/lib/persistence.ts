/**
 * LocalStorage persistence for student progress data.
 *
 * Handles: Zod validation, schema versioning, JSON export/import.
 * Does NOT handle auto-save or reactivity — that belongs in progress.svelte.ts.
 */

import { ProgressDataSchema } from "./types";
import type { ProgressData } from "./types";

const STORAGE_KEY = "crowcoder-progress";
const MAX_IMPORT_CARDS = 10_000;
const MAX_IMPORT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Load progress from localStorage, returning null on failure.
 * All data passes through Zod validation before being trusted.
 */
export function loadProgress(): ProgressData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const result = ProgressDataSchema.safeParse(parsed);
    if (!result.success) {
      console.warn("[persistence] Invalid stored data, discarding:", result.error);
      return null;
    }
    return result.data;
  } catch (e) {
    console.warn("[persistence] Failed to load progress:", e);
    return null;
  }
}

/**
 * Save progress to localStorage.
 */
export function saveProgress(data: ProgressData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn("[persistence] Failed to save progress:", e);
    return false;
  }
}

/**
 * Check if localStorage is available and writable.
 */
export function isStorageAvailable(): boolean {
  try {
    const testKey = "__crowcoder_test__";
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Export progress as a downloadable JSON file.
 * Filename: crowcoder-progress-YYYY-MM-DD.json
 */
export function exportProgress(data: ProgressData): void {
  const exportData: ProgressData = {
    ...data,
    exportedAt: new Date().toISOString(),
  };
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `crowcoder-progress-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Validate and parse an imported JSON file.
 * Returns the validated ProgressData or an error message.
 */
export function validateImport(
  file: File,
): Promise<{ data: ProgressData } | { error: string }> {
  return new Promise((resolve) => {
    // Size check before reading
    if (file.size > MAX_IMPORT_SIZE_BYTES) {
      resolve({ error: "File too large (max 5MB)" });
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const result = ProgressDataSchema.safeParse(parsed);

        if (!result.success) {
          resolve({ error: "Invalid file format" });
          return;
        }

        // Cap card count
        const cardCount = Object.keys(result.data.cards).length;
        if (cardCount > MAX_IMPORT_CARDS) {
          resolve({ error: `Too many cards (${cardCount}, max ${MAX_IMPORT_CARDS})` });
          return;
        }

        resolve({ data: result.data });
      } catch {
        resolve({ error: "File is not valid JSON" });
      }
    };

    reader.onerror = () => {
      resolve({ error: "Failed to read file" });
    };

    reader.readAsText(file);
  });
}
