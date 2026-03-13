# ADR 003: Phase 2 — Multi-Slot Popups, Quiz Simplification, and Bugfixes

## Status

Accepted (2026-03-12)

## Context

Phase 2 introduced interactive quiz components, hints, progress tracking, and a popup system for revealing content as users scroll. Three plans were executed in sequence, plus two post-plan bugfixes discovered during user testing:

- **Plan 004**: Fix quiz radio buttons (`bind:group`) + discover Astro slot hydration boundary issue
- **Plan 005**: Refactor popup from single-slot to multi-slot concurrent + simplify quiz flow (subsumed the separate quiz-simplify plan)
- **Bugfix**: IntersectionObserver zero-height container
- **Bugfix**: Brave CSP blocking Zod v4's `new Function()`

This ADR records the key decisions, what changed, and the lessons learned.

## Decisions

### 1. QuizPopup composition controller (Plan 004)

**Problem:** Quiz was slotted inside Popup in Astro (`<Popup client:visible><Quiz .../></Popup>`). Astro slots are static HTML — the Quiz rendered as SSR markup with no client-side hydration. Radio buttons appeared but couldn't update state.

**Decision:** Create `QuizPopup.svelte` to wrap Popup + Quiz in a single Svelte component, sharing one hydration boundary. QuizPopup is a "composition controller" — not a thin passthrough, but the owner of answered state, quiz mode, focus management, and screen reader announcements.

**Alternatives considered:**
- Nest Quiz inside Popup in a single `.astro` file with both having `client:*` — doesn't work, Astro slots are static
- Use a custom event bus between separate islands — loses type safety and adds complexity

**See:** `docs/decisions/002-island-composition-wrapper-pattern.md`, `docs/solutions/001-astro-slot-hydration-boundary.md`

### 2. Multi-slot popup state machine (Plan 005)

**Problem:** The popup system tracked one `current` popup with a global phase. Clicking "Show Hint" while a quiz was open silently queued — nothing happened until the quiz was dismissed.

**Decision:** Replace single-slot with `SvelteMap<string, PopupEntry>` keyed by popup ID. Each popup independently manages its own lifecycle (idle → entering → active → exiting → idle). All lifecycle functions take an `id` parameter.

**Key constraint:** SvelteMap values are NOT deeply reactive. Phase transitions use immutable entry replacement (`active.set(id, { ...entry, phase })`), never in-place mutation.

**Rejected YAGNI:** The original plan included group queues (`groupQueues` SvelteMap, `group` field, `MAX_QUEUE_DEPTH`). The code simplicity review identified these as unnecessary — the scroll dedup system (`triggeredThisSession` + `observeOnce` with 1s grace period) already prevents concurrent quiz triggers. Removed ~40% of planned new code.

### 3. Simplified quiz flow (Plan 005)

**Problem:** Quiz had two internal phases (answering → feedback) with auto-collapse timers and a buggy `dismiss()` function that reset state before reading it.

**Decision:** Remove the feedback phase entirely. After submitting, the popup closes immediately. An inline "Review answer" button appears. Clicking it reopens the popup in read-only review mode with correct/incorrect highlighting. "Try again" (only after incorrect) resets to answering mode.

**State ownership:**
- `answered` — locked at mount with `$state(hasBeenAnswered(id))`, NOT `$derived`, to prevent mid-interaction reactivity
- `quizMode` — `'answering' | 'review'`, managed by QuizPopup
- `lastSelectedIndex` — persisted in `CardData` (optional field, backward-compatible)

### 4. `markTriggered(id)` for scroll suppression (Plan 005 bugfix)

**Problem:** QuizPopup initially passed `trigger={answered ? 'manual' : trigger}` to Popup for already-answered quizzes. This caused Popup to render its own "Show hint" button — wrong UX.

**Decision:** Added `markTriggered(id)` to the popup state module. Already-answered quizzes call `markTriggered(id)` on mount to suppress the scroll trigger without changing the trigger prop. Popup receives the original trigger unchanged.

### 5. IntersectionObserver threshold fix (Post-plan bugfix)

**Problem:** Scroll-triggered popups never appeared for users. The `.popup-container` element had 0 height when empty. The scroll observer used `threshold: 0.3` (30% visibility) — a zero-height element can't satisfy that threshold.

**Decision:** Changed threshold from `0.3` to `0` and added `min-height: 1px` to `.popup-container`. The 1-second grace period already prevents premature triggers during fast scrolling, making the threshold redundant.

**Root cause of delayed diagnosis:** Playwright tests with controlled scrolling (scroll to element + wait 3 seconds) masked the issue. Real users scroll continuously, giving the zero-height observer no chance to fire.

**See:** `docs/solutions/002-intersection-observer-zero-height-elements.md`

### 6. CSP `unsafe-eval` for Zod v4 (Post-plan bugfix)

**Problem:** Zod v4 uses `new Function()` for schema compilation. Brave browser enforced the CSP meta tag more strictly than Chrome, blocking Zod and preventing all components that depend on progress state from working.

**Decision:** Added `'unsafe-eval'` to `script-src` in the CSP meta tag. This is a known Zod v4 requirement.

**Trade-off:** `unsafe-eval` weakens CSP protection against code injection. Acceptable because: (1) the site has no user-generated content or external data injection vectors, (2) all runtime data passes through Zod validation anyway, (3) the alternative is replacing Zod with a CSP-safe validation library.

## Files Changed

### New files
| File | Purpose |
|------|---------|
| `src/components/QuizPopup.svelte` | Composition controller for Quiz + Popup |
| `docs/decisions/002-island-composition-wrapper-pattern.md` | ADR for the wrapper pattern |
| `docs/solutions/001-astro-slot-hydration-boundary.md` | Learning: Astro slots lose hydration |
| `docs/solutions/002-intersection-observer-zero-height-elements.md` | Learning: zero-height observer targets |

### Modified files
| File | Summary |
|------|---------|
| `src/lib/state/popup.svelte.ts` | Single-slot → multi-slot SvelteMap; ID-targeted lifecycle; `markTriggered`/`resetTrigger` |
| `src/components/Popup.svelte` | Map-based derivations; `tabindex="-1"`; `aria-expanded`; `min-height: 1px` |
| `src/components/Quiz.svelte` | Removed feedback phase; added `reviewMode`, `reviewSelectedIndex`, `onreset`; `bind:group`; `submitting` guard |
| `src/components/Quiz.params.ts` | Removed `feedbackDuration` |
| `src/lib/types.ts` | Added `lastSelectedIndex` to `CardDataSchema` |
| `src/lib/state/progress.svelte.ts` | `recordAnswer` accepts `selectedIndex`; `getLastSelectedIndex` helper |
| `src/lib/scroll-observer.ts` | `threshold: 0.3` → `0` |
| `src/pages/index.astro` | Quizzes use `QuizPopup`; added `quizIds` for ProgressBar |
| `src/components/ExportImport.svelte` | Added "Reset Progress" button with confirmation |
| `src/components/DevGlobalPanel.astro` | Dynamic import bypass for dev-only component |
| `src/layouts/Base.astro` | Added `'unsafe-eval'` to CSP `script-src` |
| `CLAUDE.md` | Popup System section; SvelteMap, `$state(fn())`, `bind:group`, IntersectionObserver, Astro slot conventions; testing guidance |
| `cce.local.md` | Updated review context for multi-slot popup patterns |

## Consequences

### Positive
- Hints and quizzes can be open simultaneously — no more silent queueing
- Quiz flow is simpler (no auto-collapse timers, no feedback phase)
- "Review answer" + "Try again" gives users control over the learning pace
- Scroll-triggered popups work reliably across browsers including Brave
- Comprehensive CLAUDE.md conventions prevent repeating the same bugs

### Negative
- QuizPopup grew from ~25 lines (thin passthrough) to ~75 lines (composition controller) — justified by the coordination logic it owns
- CSP now includes `'unsafe-eval'` — acceptable trade-off for Zod v4 compatibility
- `lastSelectedIndex` in `CardData` mixes UI metadata with SM-2 data — pragmatic choice over separate storage

### Risks
- `SvelteMap` immutable replacement pattern is easy to forget — enforced via CLAUDE.md convention and `cce.local.md` review guidance
- `'unsafe-eval'` CSP weakening — monitor for a Zod v4 CSP-safe mode or consider alternatives if the site gains user-generated content

## Lessons Learned

1. **Astro slots are static HTML.** Any Svelte component passed as a slot child of a `client:*` island is SSR'd and never hydrated. Wrap parent + child in a single Svelte component for interactivity.

2. **SvelteMap values are not deeply reactive.** Always use `.set(id, { ...entry, newProp })`. Never mutate properties in place.

3. **IntersectionObserver with threshold > 0 fails on zero-height elements.** Use `threshold: 0` when the target might be empty. Add `min-height: 1px` as belt-and-suspenders.

4. **Test with realistic scroll behavior.** Playwright's "scroll to element + wait" masks timing bugs. Include fast-scroll tests (100px every 30ms) that simulate real users.

5. **When the user says it's broken and tests pass, the tests are wrong.** Investigate harder instead of asking the user to refresh.

6. **Don't change trigger props to suppress behavior.** Use dedicated suppression functions (`markTriggered`) instead of prop switching, which can cause unintended side effects in child components.
