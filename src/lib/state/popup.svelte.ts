/**
 * Popup state machine — manages popup lifecycle across Astro islands.
 *
 * State machine phases: idle → entering → active → exiting → idle
 * Queue: max 5 pending popups, "dismiss all" clears queue.
 * Trigger deduplication: each popup ID fires at most once per page load.
 */

export type PopupPhase = "idle" | "entering" | "active" | "exiting";

export type PopupMode = "inline" | "modal" | "slide-in";

export interface PopupRequest {
  id: string;
  mode: PopupMode;
}

const MAX_QUEUE_DEPTH = 5;

/** IDs that have already been triggered this page load (not persisted) */
const triggeredThisSession = new Set<string>();

export const popupState = $state({
  /** Currently displayed popup, or null */
  current: null as PopupRequest | null,
  /** Current animation phase */
  phase: "idle" as PopupPhase,
  /** Pending popup requests */
  queue: [] as PopupRequest[],
});

/**
 * Request a popup to open. Respects trigger deduplication and queue limits.
 * Returns true if the request was accepted (either displayed or queued).
 */
export function requestPopup(id: string, mode: PopupMode): boolean {
  // Already triggered this session
  if (triggeredThisSession.has(id)) return false;
  triggeredThisSession.add(id);

  const request: PopupRequest = { id, mode };

  // If idle, show immediately
  if (popupState.phase === "idle" && !popupState.current) {
    popupState.current = request;
    popupState.phase = "entering";
    return true;
  }

  // Otherwise queue (if not full)
  if (popupState.queue.length >= MAX_QUEUE_DEPTH) return false;
  popupState.queue = [...popupState.queue, request];
  return true;
}

/**
 * Signal that the enter animation has finished.
 */
export function onEntered(): void {
  if (popupState.phase === "entering") {
    popupState.phase = "active";
  }
}

/**
 * Begin closing the current popup.
 */
export function dismissCurrent(): void {
  if (popupState.phase === "active" || popupState.phase === "entering") {
    popupState.phase = "exiting";
  }
}

/**
 * Signal that the exit animation has finished. Advances to next queued popup.
 */
export function onExited(): void {
  if (popupState.phase !== "exiting") return;

  popupState.current = null;
  popupState.phase = "idle";

  // Advance queue
  if (popupState.queue.length > 0) {
    const [next, ...rest] = popupState.queue;
    popupState.queue = rest;
    popupState.current = next;
    popupState.phase = "entering";
  }
}

/**
 * Dismiss current popup and clear entire queue.
 */
export function dismissAll(): void {
  popupState.queue = [];
  if (popupState.current) {
    popupState.phase = "exiting";
  }
}

/**
 * Check if a popup ID has already been triggered this session.
 */
export function wasTriggered(id: string): boolean {
  return triggeredThisSession.has(id);
}

/**
 * Allow a popup to be re-triggered (e.g., dismissed without answering).
 */
export function resetTrigger(id: string): void {
  triggeredThisSession.delete(id);
}
