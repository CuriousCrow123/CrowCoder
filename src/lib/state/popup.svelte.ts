/**
 * Popup state machine — manages popup lifecycle across Astro islands.
 *
 * Multi-slot: multiple popups can be active concurrently.
 * Each popup independently tracks its own phase: idle → entering → active → exiting → idle
 * Trigger deduplication: each popup ID fires at most once per page load.
 *
 * SvelteMap values are NOT deeply reactive — phase transitions use
 * immutable entry replacement via .set(), never in-place mutation.
 */

import { SvelteMap } from "svelte/reactivity";

export type PopupPhase = "idle" | "entering" | "active" | "exiting";

export type PopupMode = "inline" | "modal" | "slide-in";

export interface PopupRequest {
  id: string;
  mode: PopupMode;
}

export interface PopupEntry {
  request: PopupRequest;
  phase: PopupPhase;
}

const MAX_CONCURRENT = 10;

// Imperative only — NOT reactive, do not wrap in $state or read in $derived
const triggeredThisSession = new Set<string>();

export const popupState = $state({
  /** All currently active popups, keyed by ID */
  active: new SvelteMap<string, PopupEntry>(),
});

/**
 * Request a popup to open. Respects trigger deduplication.
 * Returns true if the request was accepted and the popup is now entering.
 */
export function requestPopup(id: string, mode: PopupMode): boolean {
  // Already triggered this session
  if (triggeredThisSession.has(id)) return false;

  // Already in the active map (e.g., still in exit animation)
  if (popupState.active.has(id)) return false;

  // Defensive guard against runaway popup creation
  if (popupState.active.size >= MAX_CONCURRENT) {
    console.warn(
      `[popup] MAX_CONCURRENT (${MAX_CONCURRENT}) reached, rejecting popup "${id}"`,
    );
    return false;
  }

  triggeredThisSession.add(id);

  popupState.active.set(id, {
    request: { id, mode },
    phase: "entering",
  });
  return true;
}

/**
 * Signal that the enter animation has finished.
 */
export function onEntered(id: string): void {
  const entry = popupState.active.get(id);
  if (!entry || entry.phase !== "entering") return;
  popupState.active.set(id, { ...entry, phase: "active" });
}

/**
 * Begin closing a specific popup.
 */
export function dismiss(id: string): void {
  const entry = popupState.active.get(id);
  if (!entry || entry.phase === "exiting") return;
  popupState.active.set(id, { ...entry, phase: "exiting" });
}

/**
 * Signal that the exit animation has finished. Removes popup from active map.
 */
export function onExited(id: string): void {
  const entry = popupState.active.get(id);
  if (!entry || entry.phase !== "exiting") return;
  popupState.active.delete(id);
}

/**
 * Dismiss all active popups.
 */
export function dismissAll(): void {
  for (const [id, entry] of popupState.active) {
    if (entry.phase !== "exiting") {
      popupState.active.set(id, { ...entry, phase: "exiting" });
    }
  }
}

/**
 * Check if a popup ID has already been triggered this session.
 */
export function wasTriggered(id: string): boolean {
  return triggeredThisSession.has(id);
}

/**
 * Mark a popup as triggered without opening it.
 * Used to suppress scroll triggers for already-answered quizzes.
 */
export function markTriggered(id: string): void {
  triggeredThisSession.add(id);
}

/**
 * Allow a popup to be re-triggered (e.g., dismissed without answering).
 */
export function resetTrigger(id: string): void {
  triggeredThisSession.delete(id);
}
