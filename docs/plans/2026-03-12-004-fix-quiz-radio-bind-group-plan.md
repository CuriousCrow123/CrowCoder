---
title: "fix: Quiz radio buttons don't update state in Svelte 5"
type: fix
status: active
date: 2026-03-12
origin: docs/brainstorms/2026-03-12-svelte5-form-binding-convention-brainstorm.md
---

# fix: Quiz radio buttons don't update state in Svelte 5

## Overview

Quiz radio buttons visually select (native browser `:checked` rendering) but `selectedIndex` stays `null`, keeping the Submit button permanently disabled. Root cause: `checked={expr}` + `onchange` on radio groups doesn't sync state in Svelte 5 runes mode. Fix: switch to `bind:group`, Svelte 5's idiomatic pattern for radio inputs.

(See brainstorm: `docs/brainstorms/2026-03-12-svelte5-form-binding-convention-brainstorm.md`)

## Problem Statement

In `src/components/Quiz.svelte:113-120`, radio inputs use a controlled pattern:

```svelte
<input
  type="radio"
  name="quiz-{id}"
  value={i}
  checked={selectedIndex === i}
  onchange={() => selectedIndex = i}
/>
```

In Svelte 5 runes mode, `checked={expr}` without `bind:` makes the radio's checked state framework-controlled. The browser momentarily checks the radio (visible to the user), but Svelte resets it before the `onchange` handler can propagate. Result: `selectedIndex` stays `null`, `disabled={selectedIndex === null}` stays `true`.

The Svelte 5 docs exclusively use `bind:group` for radio inputs — the `checked={expr}` + `onchange` pattern is undocumented for radio groups.

## Changes

### 1. Quiz.svelte — Switch radio inputs to `bind:group`

**File:** `src/components/Quiz.svelte`, lines 113-120

Replace the controlled radio pattern:

```svelte
<!-- BEFORE -->
<input
  type="radio"
  name="quiz-{id}"
  value={i}
  checked={selectedIndex === i}
  onchange={() => selectedIndex = i}
/>
```

```svelte
<!-- AFTER -->
<input
  type="radio"
  name="quiz-{id}"
  bind:group={selectedIndex}
  value={i}
/>
```

**Notes:**
- Keep `name="quiz-{id}"` for accessibility and DOM-level radio group isolation across multiple Quiz instances
- Svelte's `bind:group` uses internal `__value` to preserve JavaScript types, so `value={i}` (number) should keep `selectedIndex` as a number, not coerce to string
- Remove the `class:selected={selectedIndex === i}` from the parent `<label>` only if `bind:group` auto-applies a different mechanism — otherwise keep it (it's driven by `selectedIndex` reactivity, which will now work)

### 2. CLAUDE.md — Add convention bullet to State section

Add one bullet after the existing "Never use plain `Set`/`Map` inside `$state`" bullet:

```markdown
- Use `bind:group` for radio/checkbox groups, `bind:checked` for lone checkboxes, `bind:value` for text/number/range inputs — bare `checked={expr}` or `value={expr}` without `bind:` can make inputs read-only in Svelte 5 runes mode
```

### 3. Verification steps (not code changes)

During implementation, manually verify:

- [ ] **Type preservation:** After selecting an answer, confirm `selectedIndex` is a number (not string) — `selectedIndex === correctIndex` must use strict equality
- [ ] **Dev mode (Tunable wrapper):** Radio selection works when Quiz content renders inside the `TunableComponent` snippet chain
- [ ] **Production build:** Radio selection works in `npm run build && npm run preview`
- [ ] **Null reset on dismiss:** After `dismiss()` sets `selectedIndex = null`, all radios deselect cleanly
- [ ] **Multiple quizzes:** Selecting an answer in one quiz doesn't affect radios in other quizzes on the page

## What's NOT in scope

- **ParamInput.svelte:** Uses `value={expr}` + `oninput`/`onchange` with `e.currentTarget` — this is a different pattern (reads DOM values directly, doesn't rely on `checked` reactivity). Not confirmed broken; keep separate.
- **dismiss() double-fire bug:** `dismiss()` sets `wasCorrect = null` then reads it on the next line. Pre-existing, unrelated to radio binding. Track separately.
- **Component-level tests:** The project's testing strategy covers pure functions, not DOM interactions. Adding a component test for radio binding would be new territory — out of scope for this bugfix.

## Acceptance Criteria

- [x] Radio buttons update `selectedIndex` on click → Submit button enables
- [x] Correct/incorrect evaluation works (type-safe comparison)
- [x] `npm run build` passes
- [x] CLAUDE.md State section has new convention bullet
- [x] Verified in dev server (production preview pending)

**Post-investigation update:** The original `bind:group` fix was correct but insufficient. The deeper root cause was an **Astro hydration boundary issue** — Quiz was slotted inside Popup in Astro, rendering Quiz as static SSR HTML without client-side hydration. Fix: created `QuizPopup.svelte` to combine Popup + Quiz in a single Svelte island. Added CLAUDE.md convention about Astro slot hydration boundaries.

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-12-svelte5-form-binding-convention-brainstorm.md](docs/brainstorms/2026-03-12-svelte5-form-binding-convention-brainstorm.md) — key decision: convention goes in State section; ParamInput was initially in scope but narrowed out after SpecFlow analysis
- **Svelte 5 docs (Context7):** `bind:group` is the only documented pattern for radio inputs; `checked={expr}` without `bind:` is undocumented for interactive radios
- **Prior convention plan:** [docs/plans/2026-03-12-003-docs-session-bugfix-conventions-plan.md](docs/plans/2026-03-12-003-docs-session-bugfix-conventions-plan.md) — same "bugfix → convention" pattern
