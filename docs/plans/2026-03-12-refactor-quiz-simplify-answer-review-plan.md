---
title: "Simplify Quiz: Remove Feedback Phase, Add Answer Review & Reset"
type: refactor
status: active
date: 2026-03-12
---

# Simplify Quiz: Remove Feedback Phase, Add Answer Review & Reset

## Overview

Remove the internal feedback phase from Quiz. After submitting, the popup closes immediately and a "Review answer" button appears inline. Clicking it reopens the popup showing the result. A "Try again" button lets the user re-answer.

## Problem Statement / Motivation

The current Quiz has two internal phases (answering → feedback) that add complexity. The user wants a simpler flow: answer, close, review later if desired.

## Proposed Solution

**New flow:**

1. Scroll triggers popup → Quiz shows question + radio buttons + Submit
2. User submits → `recordAnswer()` fires, popup closes immediately
3. Inline "Review answer" button appears where the popup was
4. Clicking it reopens popup with Quiz in read-only review mode (correct/incorrect highlighted)
5. "Try again" button in review mode resets to answering mode

**Three render states** (managed by QuizPopup, not Quiz):

- **Unanswered:** Popup scroll-triggers, Quiz shows answering UI
- **Answered, popup closed:** "Review answer" button shown inline
- **Reviewing:** Popup open with read-only result display + "Try again" button

## Technical Considerations

### Selected answer storage

`CardData` currently stores `lastAnswer` as SM-2 quality (0-5), not the answer index. Add `lastSelectedIndex: number` to `CardData` schema so review mode can show which answer the user picked. This survives page reloads.

**Files:** `src/lib/types.ts` (schema), `src/lib/state/progress.svelte.ts` (recordAnswer signature)

### Quiz → Popup close mechanism

Quiz cannot currently close its parent Popup. Wire the existing `onresult` callback through QuizPopup:

```svelte
<!-- QuizPopup.svelte -->
<Quiz {id} {question} {answers} {correctIndex} onresult={handleResult} />
```

`handleResult` calls `dismissCurrent()` from `popup.svelte.ts`. Quiz stays ignorant of popup internals.

### Popup and QuizPopup lifecycle

Keep a single Popup mounted at all times — do not conditionally swap component trees with `{#if}`, which would destroy Popup mid-animation and prevent exit transitions.

QuizPopup holds two pieces of local state:
- `quizMode: 'answering' | 'review'` — passed as a prop to Quiz
- `answered` — locked at mount via `$state(hasBeenAnswered(id))`, not `$derived`, to avoid the same mid-interaction reactivity bug we already fixed

The "Review answer" button renders **alongside** the Popup container (not instead of it). When clicked, it calls `resetTrigger(id)` then `requestPopup(id, mode)` and sets `quizMode = 'review'`.

After submit or "Try again" closes the popup, QuizPopup updates `answered` and `quizMode` in the `onresult`/`onreset` handlers — but only after the popup has fully exited (not during the animation).

### "Try again" and SM-2

"Try again" resets Quiz to answering mode within the already-open popup by setting `quizMode = 'answering'` — no component destruction, just a prop change. A new submission calls `recordAnswer()` again — SM-2 handles repeated reviews by design. The popup closes and the "Review answer" button reflects the new result.

### Accessibility

The current flow announces feedback via `aria-live`. Since the popup now closes immediately, add a visually-hidden `aria-live="assertive"` region in QuizPopup that announces "Correct!" or "Incorrect — the answer was X" when the popup exits after a submission.

### Double-submit guard

Add a `submitting` flag to prevent `submitAnswer()` from firing twice on rapid clicks.

## Acceptance Criteria

- [ ] Quiz has no internal feedback phase — just question, radio buttons, Submit
- [ ] Popup closes immediately after Submit
- [ ] "Review answer" button appears inline after popup closes
- [ ] Clicking "Review answer" reopens popup showing correct/incorrect answer highlighting
- [ ] "Try again" button in review mode resets to answering UI
- [ ] `lastSelectedIndex` persisted in `CardData` for cross-session review
- [ ] Previously-answered quizzes show "Review answer" button on page load (no scroll-trigger)
- [ ] Screen reader announcement on submit (aria-live region)
- [ ] Double-submit guarded
- [ ] Build passes with zero dev tooling leakage

## Dependencies & Risks

- **Schema change:** Adding `lastSelectedIndex` to `CardData` / `CardDataSchema`. Existing localStorage data won't have this field — make it optional in the Zod schema (`.optional()`) so old data validates.
- **QuizPopup complexity increase:** QuizPopup goes from a 25-line passthrough to managing three states. Keep it simple — the render states map directly to `hasBeenAnswered()` + `isActive`.
- **Focus management:** After popup closes, focus should move to the "Review answer" button for keyboard users.

## MVP File Changes

### `src/lib/types.ts`

Add `lastSelectedIndex` to `CardDataSchema`:

```ts
export const CardDataSchema = z.object({
  // ... existing fields ...
  lastSelectedIndex: z.number().int().min(0).optional(),
});
```

### `src/lib/state/progress.svelte.ts`

Update `recordAnswer` to accept and store `selectedIndex`:

```ts
export function recordAnswer(questionId: string, correct: boolean, selectedIndex: number): void {
  // ... existing SM-2 logic ...
  progressState.cards[questionId] = {
    // ... existing fields ...
    lastSelectedIndex: selectedIndex,
  };
}
```

Add helper to retrieve the stored answer:

```ts
export function getLastSelectedIndex(questionId: string): number | null {
  return progressState.cards[questionId]?.lastSelectedIndex ?? null;
}
```

### `src/components/Quiz.svelte`

- Remove: `wasCorrect`, `collapseTimer`, auto-collapse logic, feedback template branch, `phase` type
- Keep: `selectedIndex`, `submitAnswer`
- Add: `reviewMode` prop (boolean) — when true, render read-only with correct/incorrect highlighting + "Try again" button
- Add: `reviewSelectedIndex` prop (number) — the answer to highlight in review mode (from stored `lastSelectedIndex`)
- Add: `onreset` callback prop — fired when "Try again" is clicked
- `submitAnswer` passes `selectedIndex` to `recordAnswer(id, correct, selectedIndex)`

### `src/components/QuizPopup.svelte`

Expand from passthrough to state manager. Single Popup stays mounted; Quiz mode controlled via props:

```svelte
<script lang="ts">
  import Popup from './Popup.svelte';
  import Quiz from './Quiz.svelte';
  import { hasBeenAnswered, getLastSelectedIndex } from '../lib/state/progress.svelte';
  import { dismissCurrent, resetTrigger, requestPopup } from '../lib/state/popup.svelte';

  // ... props ...

  // Lock at mount — do NOT use $derived (same reactivity bug we already fixed)
  let answered = $state(hasBeenAnswered(id));
  let quizMode = $state<'answering' | 'review'>(answered ? 'review' : 'answering');

  function handleResult() {
    dismissCurrent();
    answered = true;
    quizMode = 'review';
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

<!-- Single Popup always mounted — no conditional swapping -->
<Popup {id} trigger={answered ? 'manual' : 'scroll'} {mode}>
  <Quiz {id} {question} {answers} {correctIndex}
    reviewMode={quizMode === 'review'}
    reviewSelectedIndex={getLastSelectedIndex(id)}
    onresult={handleResult}
    onreset={handleReset} />
</Popup>

<!-- Review button renders alongside Popup, visible when answered and popup is closed -->
{#if answered}
  <button class="review-btn" onclick={openReview}>Review answer</button>
{/if}
```

**Key:** `handleResult` updates `answered` and `quizMode` synchronously after `dismissCurrent()`. The Popup animates out normally because it's not being destroyed — only Quiz's props change after the exit completes.

**Open question:** The "Review answer" button visibility should be tied to the popup *not* being active (hide the button while the popup is open). This can use `popupState.current?.id !== id` or a local flag.

## Sources

- Learnings: [001-astro-slot-hydration-boundary](docs/solutions/001-astro-slot-hydration-boundary.md) — QuizPopup wrapper is load-bearing, must not be broken apart
- ADR: [001-cross-island-state-sharing](docs/decisions/001-cross-island-state-sharing.md)
- ADR: [002-island-composition-wrapper-pattern](docs/decisions/002-island-composition-wrapper-pattern.md)
