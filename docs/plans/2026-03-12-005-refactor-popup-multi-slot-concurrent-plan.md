---
title: "refactor: Multi-slot concurrent popups + simplified quiz flow"
type: refactor
status: completed
date: 2026-03-12
deepened: 2026-03-12
---

# refactor: Multi-slot concurrent popups + simplified quiz flow

## Enhancement Summary

**Deepened on:** 2026-03-12
**Agents used:** Svelte 5 races reviewer, architecture strategist, a11y reviewer, Astro island reviewer, performance oracle, code simplicity reviewer, pattern recognition specialist, SM-2 domain expert, framework docs researcher, security sentinel

### Key Improvements from Deepening
1. **Simplified Part A**: Removed group queue system (YAGNI) — replaced with plain multi-slot map + simple gate check
2. **Critical SvelteMap gotcha discovered**: Values are NOT deeply reactive — must replace entries via `.set()`, not mutate `.phase` in place
3. **Critical a11y fix**: `aria-live` region must live outside Popup's `{#if isActive}` block or announcements are destroyed before screen readers process them
4. **Focus management specified**: `justSubmitted` flag with `untrack()` prevents unwanted auto-focus on page load
5. **SSR safety**: `reviewSelectedIndex` must be `number | undefined` with bounds-checking against `answers.length`

### Simplification Applied
The code simplicity review identified that `groupQueues`, `group` field, `MAX_QUEUE_DEPTH`, and `dismissAll()` are YAGNI violations. The scroll dedup system (`triggeredThisSession` + `observeOnce`) already prevents concurrent quiz triggers. The plan has been simplified to a plain `SvelteMap` of active popups with no queue/group layer — ~40% less new code.

---

## Overview

Two tightly coupled refactors delivered together:

1. **Multi-slot popup state machine** — Replace the single-slot popup system with a `SvelteMap`-based architecture where each popup independently manages its own lifecycle. Any popup can activate concurrently with any other.

2. **Simplified quiz flow** — Remove Quiz's internal feedback phase. After submitting, the popup closes immediately. An inline "Review answer" button lets users reopen the popup in read-only review mode. "Try again" resets to answering mode.

These are combined because both modify the same files (`popup.svelte.ts`, `Popup.svelte`, `Quiz.svelte`, `QuizPopup.svelte`) and the quiz simplification depends on the popup dismiss mechanism that the multi-slot refactor redesigns.

## Problem Statement / Motivation

**Popup concurrency:** The popup system tracks one `current` popup with a global `phase`. Clicking "Show Hint" while a quiz is open silently queues the hint — nothing visibly happens until the quiz is dismissed.

**Quiz complexity:** Quiz has two internal phases (answering → feedback) with auto-collapse timers. The user wants a simpler flow: answer, close, review later if desired.

**Pre-existing bugs:**
- `Quiz.dismiss()` resets `wasCorrect` to `null` *before* reading it in the `onresult` call (line 63), sending `correct: false` even for correct answers
- `QuizPopup` does not wire `Quiz.onresult` to popup dismissal — after auto-collapse, the quiz resets to a blank state inside a still-open popup

## Proposed Solution

### Part A: Multi-slot popup state machine

#### A1. SvelteMap-based state

```typescript
// src/lib/state/popup.svelte.ts
import { SvelteMap } from 'svelte/reactivity';

export interface PopupRequest {
  id: string;
  mode: PopupMode;
}

export const popupState = $state({
  /** All currently active popups, keyed by ID */
  active: new SvelteMap<string, PopupEntry>(),
});

// Imperative only — NOT reactive, do not wrap in $state or read in $derived
const triggeredThisSession = new Set<string>();
```

### Research Insights: SvelteMap

**Critical: Values are NOT deeply reactive.** SvelteMap tracks key presence and value identity, but does NOT deeply proxy stored values. Mutating `entry.phase` in place will NOT trigger re-derivation.

Two options (from framework docs + races review):
- **(a) Replace entire entry on every phase transition:** `popupState.active.set(id, { ...existing, phase: 'active' })`. Triggers SvelteMap's per-key signal. Simple, correct, tiny overhead at 1-5 entries.
- **(b) Wrap entries in `$state()` before inserting:** `const entry = $state({ request, phase: 'entering' }); popupState.active.set(id, entry);` Makes `.phase` deeply reactive.

**Recommendation: Use approach (a)** — immutable replacement. It is simpler to reason about and consistent with the existing queue replacement pattern (`popupState.queue = [...popupState.queue, request]`). At 1-5 entries the object allocation is negligible.

**SSR safety (confirmed):** During Astro's static build, `SvelteMap` aliases to native `Map` via `svelte/reactivity/index-server.js`. No reactive signals are created server-side. The reactive behavior only activates after client hydration. No action needed.

**`$derived(map.get(id))` tracking (confirmed):** SvelteMap maintains per-key reactive signals. `$derived(popupState.active.get(id))` only re-derives when that specific key's entry is set or deleted. Mutations to other keys do not trigger re-evaluation.

**`$derived(map.has(id))` caveat:** For missing keys, `.has()` tracks a global version counter rather than a per-key signal. It re-evaluates on *any* structural map change (any key added/removed). Functionally correct but slightly over-subscribes. Negligible at 1-5 entries.

#### A2. No group queues — simplified concurrent model

**Rationale (from simplicity review):** The original plan included `group?: string` on PopupRequest and a `groupQueues` SvelteMap. This is YAGNI — the scroll dedup system (`triggeredThisSession` + `observeOnce` with 1s grace period) already prevents concurrent quiz triggers. Two scroll-triggered quizzes cannot realistically fire at the same moment. The user scrolls past them sequentially, each fires once, and the session Set prevents re-triggering.

`requestPopup` logic:
- If `triggeredThisSession` has the ID → return false (dedup, unchanged)
- If the ID is already in `active` map → return false (prevents key collision during exit animation)
- Otherwise → add to `active` map with phase `'entering'`, return true

**If scroll-quiz mutual exclusion is genuinely needed later**, add a simple gate: "is any popup with group X already active? If so, skip." No queue, no promotion logic. The skipped popup was already triggered and won't re-trigger (it's in `triggeredThisSession`), so queuing it serves no purpose.

#### A3. ID-targeted lifecycle functions

```typescript
export function requestPopup(id: string, mode: PopupMode): boolean;
export function onEntered(id: string): void;
export function dismiss(id: string): void;       // replaces dismissCurrent()
export function onExited(id: string): void;       // removes from active map
export function dismissAll(): void;               // exits all active popups
```

### Research Insights: Lifecycle function implementation

**Entry replacement pattern** (per A1 research):
```typescript
export function onEntered(id: string): void {
  const entry = popupState.active.get(id);
  if (!entry || entry.phase !== 'entering') return;
  popupState.active.set(id, { ...entry, phase: 'active' });
}

export function dismiss(id: string): void {
  const entry = popupState.active.get(id);
  if (!entry || entry.phase === 'exiting') return;
  popupState.active.set(id, { ...entry, phase: 'exiting' });
}

export function onExited(id: string): void {
  const entry = popupState.active.get(id);
  if (!entry || entry.phase !== 'exiting') return;
  popupState.active.delete(id);
}
```

**`dismissAll()` — kept despite simplification.** Although no consumer exists today, it is 4 lines and provides a clean escape hatch for future features (page navigation, modal open). Worth keeping.

```typescript
export function dismissAll(): void {
  for (const [id, entry] of popupState.active) {
    if (entry.phase !== 'exiting') {
      popupState.active.set(id, { ...entry, phase: 'exiting' });
    }
  }
}
```

**Defensive guard (from architecture review):** Add a `MAX_CONCURRENT = 10` check in `requestPopup`. Log a warning if `active.size` exceeds it. This catches lifecycle bugs (orphaned entries) early without runtime cost in normal operation.

#### A4. Popup.svelte derivation updates

```typescript
// BEFORE
let isActive = $derived(popupState.current?.id === id);
let phase = $derived(isActive ? popupState.phase : 'idle');

// AFTER
let entry = $derived(popupState.active.get(id));
let isActive = $derived(!!entry);
let phase = $derived(entry?.phase ?? 'idle');
```

Popup.svelte's `handleDismiss` function calls `dismiss(id)` instead of `dismissCurrent()`.

### Research Insights: Popup.svelte accessibility fixes

**Add `tabindex="-1"` to inline popups (from a11y review, WCAG 2.1.1):**
The inline popup div has `onkeydown={handleKeydown}` but no `tabindex`. Without it, the Escape key handler only fires if a child element (quiz radio, close button) has focus and the event bubbles. Add `tabindex="-1"` to the inline popup div so it can receive programmatic focus:

```svelte
<div
  class="popup popup--inline"
  ...
  role="region"
  aria-label={ariaLabel ?? `${id} popup`}
  tabindex="-1"
>
```

**Use `aria-expanded` on "Show hint" button instead of hiding it (from a11y review, WCAG 4.1.2):**
Currently the button disappears when the popup is active (`{#if !isActive}`), which confuses screen readers. Instead:

```svelte
{#if trigger === 'manual'}
  <button
    class="popup-trigger-btn"
    onclick={isActive ? handleDismiss : handleManualTrigger}
    aria-expanded={isActive}
    aria-controls="{id}-popup"
  >
    {isActive ? 'Hide hint' : 'Show hint'}
  </button>
{/if}
```

**Differentiate popup landmark labels (from a11y review, WCAG 2.4.6):**
Pass a descriptive `aria-label` through from the parent, or derive from `id`.

### Part B: Simplified quiz flow

#### B1. Three render states (managed by QuizPopup, not Quiz)

- **Unanswered:** Popup scroll-triggers, Quiz shows answering UI (question + radio buttons + Submit)
- **Answered, popup closed:** "Review answer" button shown inline alongside the popup container
- **Reviewing:** Popup open with read-only result display (correct/incorrect highlighted) + "Try again" button

#### B2. Quiz.svelte simplification

Remove: `wasCorrect`, `collapseTimer`, auto-collapse logic, feedback template branch, internal `phase` type, the buggy `dismiss()` function.

Keep: `selectedIndex`, `submitAnswer` (which calls `recordAnswer` and `onresult`).

Add:
- `reviewMode: boolean` prop — when true, render read-only with correct/incorrect highlighting + "Try again" button
- `reviewSelectedIndex?: number` prop — the stored answer index to highlight in review mode (**must be `number | undefined`** for SSR safety — see research insight below)
- `onreset` callback prop — fired when "Try again" is clicked
- `submitting` flag to guard against double-submit on rapid clicks
- Pass `selectedIndex` to `recordAnswer(id, correct, selectedIndex)`

### Research Insights: Quiz.svelte

**`reviewSelectedIndex` SSR safety (from Astro island review):**
`getLastSelectedIndex(id)` returns `undefined` during SSR (no localStorage). Type the prop as `number | undefined` and guard in the template:

```typescript
// In Quiz.svelte props
reviewSelectedIndex?: number;

// In template — bounds-check against answers.length (from security review)
{@const safeReviewIndex = reviewSelectedIndex != null && reviewSelectedIndex < answers.length
  ? reviewSelectedIndex : undefined}
```

This also handles tampered localStorage where `lastSelectedIndex` exceeds `answers.length`.

**Double-submit guard implementation (from pattern recognition review):**
```typescript
let submitting = $state(false);

function submitAnswer() {
  if (selectedIndex === null || submitting) return;
  submitting = true;
  const correct = selectedIndex === correctIndex;
  recordAnswer(id, correct, selectedIndex);
  onresult?.({ questionId: id, correct });
  // submitting is never reset — popup closes after submit
}
```

**"Try again" should only appear after incorrect answers (from SM-2 review):**
Calling `recordAnswer` twice for the same card is SM-2-correct when the first answer was wrong (failure already resets repetitions to 0). But allowing "Try again" after a correct answer would double-count the review. Guard it:

```svelte
{#if reviewMode && safeReviewIndex !== correctIndex}
  <button class="quiz-submit" onclick={onreset}>Try again</button>
{/if}
```

**Review mode answer accessibility (from a11y review, WCAG 1.4.1):**
Current answer icons are `aria-hidden="true"`. Screen reader users cannot tell which answer was correct. Add visually-hidden labels:

```svelte
{#if i === correctIndex}
  <span class="answer-icon" aria-hidden="true">&#10003;</span>
  <span class="sr-only">Correct answer</span>
{:else if i === safeReviewIndex}
  <span class="answer-icon" aria-hidden="true">&#10007;</span>
  <span class="sr-only">Your answer (incorrect)</span>
{/if}
```

#### B3. Selected answer storage

Add `lastSelectedIndex` to `CardData` schema so review mode can show which answer the user picked:

```typescript
// src/lib/types.ts
export const CardDataSchema = z.object({
  // ... existing fields ...
  lastSelectedIndex: z.number().int().min(0).optional(),
});
```

Update `recordAnswer` in `progress.svelte.ts` to accept and store `selectedIndex`. Add `getLastSelectedIndex(id)` helper (pure property lookup, no localStorage access — matches `hasBeenAnswered` pattern).

Make the field `.optional()` so existing localStorage data validates without migration.

#### B4. QuizPopup.svelte — from passthrough to composition controller

```svelte
<script lang="ts">
  import { tick, untrack } from 'svelte';
  import Popup from './Popup.svelte';
  import Quiz from './Quiz.svelte';
  import { hasBeenAnswered, getLastSelectedIndex } from '../lib/state/progress.svelte';
  import { popupState, dismiss, resetTrigger, requestPopup } from '../lib/state/popup.svelte';
  import type { PopupMode } from '../lib/state/popup.svelte';

  let {
    id, question, answers, correctIndex,
    trigger = 'scroll', mode = 'inline',
  }: {
    id: string; question: string; answers: string[];
    correctIndex: number;
    trigger?: 'scroll' | 'manual' | 'component-complete';
    mode?: PopupMode;
  } = $props();

  // Lock at mount — do NOT use $derived (avoids mid-interaction reactivity bug)
  let answered = $state(hasBeenAnswered(id));
  let quizMode = $state<'answering' | 'review'>(answered ? 'review' : 'answering');

  // Hide review button while popup is open
  let isPopupActive = $derived(popupState.active.has(id));

  // Focus management — only after a submit, not on initial mount
  let justSubmitted = $state(false);
  let reviewBtnEl = $state<HTMLButtonElement | null>(null);

  $effect(() => {
    if (justSubmitted && answered && !isPopupActive) {
      tick().then(() => {
        reviewBtnEl?.focus();
        untrack(() => { justSubmitted = false; });
      });
    }
  });

  // Screen reader announcement (lives outside Popup's {#if isActive} block)
  let announcement = $state('');

  function handleResult({ correct }: { questionId: string; correct: boolean }) {
    announcement = correct
      ? 'Correct!'
      : `Incorrect — the answer is ${answers[correctIndex]}.`;
    dismiss(id);
    answered = true;
    quizMode = 'review';
    justSubmitted = true;
  }

  function openReview() {
    resetTrigger(id);
    requestPopup(id, mode);
    quizMode = 'review';
  }

  function handleReset() {
    quizMode = 'answering';  // Swap Quiz mode in-place, popup stays open
  }
</script>

<!-- aria-live OUTSIDE Popup — survives popup close (critical a11y fix) -->
<div aria-live="polite" aria-atomic="true" class="sr-only">
  {#if announcement}{announcement}{/if}
</div>

<!-- Single Popup always mounted — no conditional swapping (preserves exit animation) -->
<Popup {id} trigger={answered ? 'manual' : trigger} {mode}>
  <Quiz {id} {question} {answers} {correctIndex}
    reviewMode={quizMode === 'review'}
    reviewSelectedIndex={getLastSelectedIndex(id)}
    onresult={handleResult}
    onreset={handleReset} />
</Popup>

<!-- Review button alongside Popup, visible when answered and popup closed -->
{#if answered && !isPopupActive}
  <button
    bind:this={reviewBtnEl}
    class="review-btn"
    onclick={openReview}
    aria-label="Review answer: {question}"
  >
    Review answer
  </button>
{/if}
```

### Research Insights: QuizPopup design decisions

**Consolidated imports (from pattern recognition review):** Single import from `popup.svelte` — not two separate statements.

**`aria-live="polite"` not `"assertive"` (from a11y review):** Assertive interrupts current speech and is reserved for time-sensitive errors. A quiz result is a status update. Use `polite` with `aria-atomic="true"`.

**`aria-live` region outside Popup (critical, from a11y review):** The Popup component wraps content in `{#if isActive}`. When the popup exits and `isActive` becomes false, the entire DOM subtree — including any live region inside it — is destroyed *before* the screen reader processes the announcement. The live region must be in QuizPopup's template, outside the Popup slot.

**`justSubmitted` flag with `untrack()` (from races review):** Without this guard, the focus effect fires on initial mount when `answered` is already `true` (returning user), which would scroll the page to the review button. The `justSubmitted` flag restricts focus to post-submit only. `untrack()` prevents the reset from re-triggering the effect.

**`openReview` race protection (from races review):** The "Review answer" button is gated by `answered && !isPopupActive`. During exit animation, `isPopupActive` is still `true` (entry is in the map), so the button cannot render. The button only appears after `onExited` removes the entry. This prevents `openReview` from being called while the popup is still exiting.

**ADR 002 evolution (from architecture + pattern recognition reviews):** QuizPopup grows from thin passthrough to "composition controller." This is a justified evolution — the coordination logic (answered state, quiz mode, focus management) sits between Popup and Quiz and belongs in neither child. Update ADR 002 with a note acknowledging wrappers may contain coordination logic when managing lifecycle between composed children.

#### B5. Accessibility (expanded from agent reviews)

| Fix | WCAG | Priority |
|-----|------|----------|
| `aria-live="polite"` region outside Popup for submit announcement | 4.1.3 | Critical |
| Focus moves to "Review answer" button after popup closes (guarded by `justSubmitted`) | 2.4.3, 2.4.7 | High |
| `aria-expanded` on "Show hint" button instead of hiding it | 4.1.2 | Medium |
| `tabindex="-1"` on inline popup div for Escape key | 2.1.1 | Medium |
| Visually-hidden labels on review mode answer icons (not just color) | 1.4.1 | Medium |
| `aria-label="Review answer: {question}"` to differentiate multiple buttons | 2.4.6 | Low |
| Descriptive `aria-label` on popup regions (not generic "Popup content") | 2.4.6 | Low |

#### B6. "Try again" and SM-2

### Research Insights: SM-2 implications

**"Try again" calling `recordAnswer` twice is SM-2-correct** (from SM-2 domain expert): The first incorrect answer already resets `repetitions` to 0 and `interval` to 1. The retry starts from this reset state — the SM-2 state machine handles it naturally.

**Guard: "Try again" only after incorrect answers.** Allowing retry after a correct answer would double-count the review. The template should conditionally render "Try again" only when `reviewSelectedIndex !== correctIndex`.

**Immediate close without feedback is acceptable.** The "Review answer" button defers (not eliminates) feedback. SM-2 quality=1 (assigned on incorrect) assumes the learner sees the answer — which they will if they click "Review answer." The practical impact of skipping review is marginal: quality=0 vs quality=1 differs by 0.26 on EF, but both reset interval to 1 day.

**`lastSelectedIndex` in CardData is acceptable.** It mixes UI metadata with SM-2 data, but it is `.optional()`, clearly named, and the alternative (separate storage key) adds complexity for one field. Keep it.

**Pre-existing SM-2 bug noted (out of scope):** The EF formula is not applied when quality < 3 in `sm2.ts` line 58. This should be fixed separately.

## Technical Considerations

### SvelteMap reactivity
Per CLAUDE.md: "Never use plain Set/Map inside $state — use SvelteSet/SvelteMap from svelte/reactivity." Use immutable entry replacement (`active.set(id, { ...entry, phase })`) for phase transitions — do NOT mutate `.phase` in place (SvelteMap values are not deeply reactive).

### Animation lifecycle
Each `Popup.svelte` instance already owns its own safety timer. Per-popup phase in the `SvelteMap` replaces the global phase. The `$effect` watching `phase` and firing `onEntered`/`onExited` continues to work — it just derives phase from a map lookup.

### Modal exclusivity (deferred)
No modals exist on the current page. When a modal is added, enforce mutual exclusion with a simple gate in `requestPopup` (check if any active entry has `mode === 'modal'`). Active inline popups behind the modal become naturally inert via `<dialog>` top-layer behavior.

### Late-hydrating islands
Islands using `client:visible` hydrate when entering the viewport. Two islands hydrating simultaneously and both calling `requestPopup` is safe — JavaScript is single-threaded, calls execute sequentially, SvelteMap handles writes correctly. The scroll observer's 1s grace period provides additional temporal spacing.

### Escape key with concurrent popups
Each popup's `onkeydown` handler calls `dismiss(id)` for its own ID. Event bubbling ensures the popup containing the focused element receives the event. Adding `tabindex="-1"` to inline popups ensures they can receive focus for Escape to work reliably.

### Schema backward compatibility
`lastSelectedIndex` is `.optional()` in the Zod schema. Existing localStorage data without this field validates without migration.

## System-Wide Impact

- **Interaction graph**: `requestPopup(id, mode)` → checks dedup + active map → adds entry. `onExited(id)` → removes entry from `active`. Quiz `submitAnswer` → `onresult` → QuizPopup `handleResult` → `dismiss(id)` → popup exits → "Review answer" button appears.
- **Error propagation**: Safety timeouts are per-component instance. `onEntered`/`onExited` called for an ID not in the map → no-op. `MAX_CONCURRENT` guard logs warning if `active.size` exceeds 10.
- **State lifecycle risks**: Orphaned map entries on tab close are cleared on page reload (Astro static output re-initializes module state).
- **API surface parity**: `dismissCurrent()` removed. `Popup.svelte` is the only runtime consumer — small migration surface.
- **Integration test scenarios**:
  1. Quiz active + hint triggered → both visible simultaneously
  2. Submit quiz answer → popup closes immediately, "Review answer" button appears
  3. Click "Review answer" → popup reopens with correct/incorrect highlighting
  4. Click "Try again" (after incorrect) → quiz resets to answering mode within open popup
  5. Previously-answered quiz on page load → shows "Review answer" button, no scroll trigger
  6. `dismissAll()` → all active popups exit
  7. Escape key dismisses the popup containing the focused element
  8. Screen reader hears "Correct!" / "Incorrect" announcement after submit

## Acceptance Criteria

### Multi-slot popups
- [x] Multiple popups display concurrently (quiz + hint visible at same time)
- [x] Clicking "Show Hint" while a quiz is open shows the hint immediately
- [x] `dismiss(id)` closes a specific popup by ID
- [x] `dismissAll()` exits all active popups
- [x] `SvelteMap` used with immutable entry replacement (not in-place mutation)
- [x] Trigger deduplication (`triggeredThisSession`) unchanged
- [x] `MAX_CONCURRENT` guard logs warning if `active.size` exceeds 10
- [x] Reject `requestPopup` for ID already in `active` map

### Simplified quiz flow
- [x] Quiz has no internal feedback phase — just question, radio buttons, Submit
- [x] Popup closes immediately after Submit
- [x] "Review answer" button appears inline after popup closes
- [x] Clicking "Review answer" reopens popup with correct/incorrect answer highlighting
- [x] "Try again" button only appears in review mode after incorrect answers
- [x] `lastSelectedIndex` persisted in `CardData` for cross-session review
- [x] `reviewSelectedIndex` typed as `number | undefined`, bounds-checked against `answers.length`
- [x] Previously-answered quizzes show "Review answer" button on page load (no scroll trigger)
- [x] Double-submit guarded with `submitting` flag

### Accessibility
- [x] `aria-live="polite"` region outside Popup announces result on submit
- [x] Focus moves to "Review answer" button after popup closes (only post-submit, not on mount)
- [x] "Show hint" button uses `aria-expanded` instead of disappearing
- [x] Inline popup has `tabindex="-1"` for Escape key support
- [x] Review mode answer icons have visually-hidden text labels (not just color)
- [x] "Review answer" buttons have descriptive `aria-label` including question text

### Shared
- [x] Animation enter/exit transitions work correctly per-popup
- [x] Existing dev tuning system (Tunable wrapper) unaffected
- [x] `Popup.params.ts` tunable params continue to work
- [x] Build passes with zero dev tooling leakage

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SvelteMap phase mutation not triggering reactivity | High (if done wrong) | High (popups freeze mid-animation) | Use immutable entry replacement via `.set()`, never mutate `.phase` in place |
| `aria-live` region destroyed before announcement processed | High (if placed inside Popup) | High (silent a11y failure) | Place live region in QuizPopup, outside Popup's `{#if isActive}` block |
| `reviewSelectedIndex` undefined during SSR | Medium | Medium (template errors) | Type as `number \| undefined`, bounds-check against `answers.length` |
| QuizPopup complexity increase (25 lines → ~55) | Low | Medium | States map directly to `hasBeenAnswered()` + `isPopupActive` |
| Multiple inline popups cause layout shift | Low | Medium | Quiz+hint case is intentional; scroll dedup prevents mass concurrent expansion |
| Schema migration (existing localStorage) | Low | Low | `lastSelectedIndex` is `.optional()` — old data validates |
| Focus effect fires on mount (returning user) | Low | Low | `justSubmitted` flag guards focus; `untrack()` prevents re-trigger |

## Follow-up items (out of scope)

- **Update ADR 002** with "composition controller" evolution note
- **Fix pre-existing SM-2 bug**: EF formula not applied when quality < 3 (`sm2.ts` line 58)
- **Add group-based gating** if scroll-quiz mutual exclusion is needed in the future (simple gate, not a queue)

## Files to modify

| File | Changes |
|------|---------|
| `src/lib/state/popup.svelte.ts` | Replace single-slot with `SvelteMap`; ID-targeted lifecycle functions with immutable entry replacement; remove `dismissCurrent`; add `MAX_CONCURRENT` guard; comment `triggeredThisSession` as imperative-only |
| `src/components/Popup.svelte` | Update `isActive`/`phase` derivations; call `dismiss(id)`; add `tabindex="-1"` to inline popup; `aria-expanded` on manual trigger button; descriptive `aria-label` on popup regions |
| `src/components/Quiz.svelte` | Remove feedback phase, `wasCorrect`, `collapseTimer`, `dismiss()`; add `reviewMode`, `reviewSelectedIndex?`, `onreset` props; add `submitting` guard; bounds-check `reviewSelectedIndex`; visually-hidden answer labels |
| `src/components/QuizPopup.svelte` | Expand to composition controller; wire `onresult` → `dismiss(id)`; add "Review answer" button with focus management; `aria-live` region outside Popup; `justSubmitted` flag with `untrack()` |
| `src/lib/types.ts` | Add `lastSelectedIndex` to `CardDataSchema` (optional) |
| `src/lib/state/progress.svelte.ts` | Update `recordAnswer` to accept `selectedIndex`; add `getLastSelectedIndex` helper |
| `src/pages/index.astro` | No `group` prop needed (simplified) |

## Sources & References

- Cross-island state sharing ADR: `docs/decisions/001-cross-island-state-sharing.md`
- Island composition wrapper ADR: `docs/decisions/002-island-composition-wrapper-pattern.md`
- Astro slot hydration boundary solution: `docs/solutions/001-astro-slot-hydration-boundary.md`
- SvelteMap source: `node_modules/svelte/src/reactivity/map.js` — confirms per-key signals, non-deep value reactivity
- SvelteMap SSR shim: `node_modules/svelte/src/reactivity/index-server.js` — aliases to native Map
- Svelte issue #11346: Deep reactivity not supported in SvelteMap values
- Svelte issue #14409: Push to array inside SvelteMap not reactive
- Supersedes: `docs/plans/2026-03-12-refactor-quiz-simplify-answer-review-plan.md`
