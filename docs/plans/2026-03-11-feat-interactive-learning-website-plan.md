---
title: "feat: Interactive Learning Website with Prose-Component Reactivity"
type: feat
status: active
date: 2026-03-11
deepened: 2026-03-11
origin: docs/brainstorms/2026-03-11-interactive-learning-site-brainstorm.md
repo: https://github.com/CuriousCrow123/CrowCoder.git
---

# Interactive Learning Website (CrowCoder)

## Overview

Build a single-page interactive learning website on GitHub Pages using Astro 5 + Svelte 5 + Tailwind CSS v4. The page interleaves prose and interactive Svelte components with full bidirectional reactivity — prose reacts to component state and vice versa. A quiz/popup system supports spaced repetition (SM-2 algorithm) with student progress stored in localStorage and optional JSON export/import.

This is a greenfield project. No code, dependencies, or git history exist yet.

## Problem Statement

Traditional static learning content (articles, tutorials) lacks interactivity. Students passively read without engaging with concepts. Existing interactive learning tools (Jupyter notebooks, Observable) are either too code-focused or require server infrastructure. There's a gap for a lightweight, static-site approach that deeply interleaves prose with reactive components — where the text itself responds to what the student does, and spaced repetition reinforces retention.

## Proposed Solution

A static Astro 5 site where each lesson page is authored as an `.astro` file that mixes prose with hydrated Svelte 5 islands. All interactive components share reactive state via Svelte 5 rune-based `.svelte.ts` modules (confirmed to work as singletons across Astro islands via Vite's module deduplication). A flexible popup system handles quizzes, hints, and definitions. SM-2 spaced repetition tracks student answers in localStorage.

### Key architectural decisions (see brainstorm: docs/brainstorms/2026-03-11-interactive-learning-site-brainstorm.md)

1. **Svelte 5 rune stores as shared state hub** — `.svelte.ts` files with `$state` objects shared across Astro islands
2. **Authored in .astro files** — direct layout control over MDX convenience
3. **Multi-mode popup system** — inline, modal, slide-in (all three in v1)
4. **SM-2 spaced repetition** — Anki-style algorithm for review scheduling
5. **LocalStorage + JSON export/import** — no backend needed
6. **Tailwind CSS v4** — via Vite plugin (not PostCSS)
7. **GitHub Pages** — static deployment via GitHub Actions

## Technical Approach

### Architecture

```
src/
  layouts/
    Base.astro                  # HTML shell, imports global.css, CSP meta tag
  pages/
    index.astro                 # Single lesson page (v1)
  components/
    ProseReactive.svelte        # Reactive text that reads from stores
    ProseHighlight.svelte       # Clickable prose that writes to stores
    Popup.svelte                # Popup container (trigger + mode logic)
    Quiz.svelte                 # Pure quiz content (question, answers, feedback)
    Hint.svelte                 # Non-quiz hint/definition content
    ProgressBar.svelte          # Segmented progress map
    ExportImport.svelte         # Export/import controls
  lib/
    state/
      lesson.svelte.ts          # Per-lesson reactive state (typed component values, highlights)
      progress.svelte.ts        # Quiz answers, SM-2 card data
      popup.svelte.ts           # Popup queue, state machine, trigger guards
    sm2.ts                      # Pure SM-2 algorithm (no framework dependency)
    persistence.ts              # localStorage read/write with schema versioning + Zod validation
    scroll-observer.ts          # Single shared IntersectionObserver
    types.ts                    # Shared types (SM2Quality, ISODateString, ComponentValueRegistry)
  styles/
    global.css                  # @import "tailwindcss" + Fontsource font imports + typography scale
public/
  # Static assets
.github/
  workflows/
    deploy.yml                  # GitHub Pages deployment (SHA-pinned actions)
```

The original plan had 6 component subdirectories for ~10 files — premature organization. A flat `components/` directory works fine at this scale. Single-file directories (`interactive/`, `review/`) added navigational overhead without benefit. The generic `Slot.svelte` was removed (YAGNI — build specific interactive components per lesson). `ReviewSession.svelte` was removed in favor of inline review at section breaks (see SM-2 UX section).

### Cross-Island State Sharing (Validated)

Research confirmed that `.svelte.ts` module-level `$state` objects are singletons across Astro islands on the same page. Vite/Rollup extracts shared dependencies into a common chunk, and the ES module system guarantees single evaluation.

**Note:** Astro's official docs recommend **Nano Stores** for cross-island state sharing (framework-agnostic). We deliberately chose `.svelte.ts` rune stores instead because (a) this is a pure Svelte project — no React/Vue islands, so framework-agnostic is unnecessary overhead; (b) `.svelte.ts` runes are more ergonomic than Nano Stores' `$atom`/`subscribe` API; (c) one fewer dependency. The trade-off: we depend on Vite module deduplication (an implementation detail) rather than an explicitly supported Astro pattern. The ADR and integration test mitigate this risk.

**Constraints:**
- Must export `$state` as **objects** and mutate properties (cannot export reassignable `$state` primitives)
- Mixed hydration directives (`client:load`, `client:visible`, `client:idle`) still share the same module singleton — the guarantee comes from the ES module system, not simultaneous hydration timing
- State resets on full page navigation (fine for single-page v1; localStorage persists across pages for future multi-page)
- `$effect` does not run during SSR — safe for a static site
- **This is an implementation detail of Vite/Rollup, not an explicit Astro contract.** Document as an ADR in `docs/decisions/`. Add an integration test asserting two islands see the same state object as an early-warning canary for Astro upgrades.

**Tiered hydration:** The original plan required `client:load` on all islands. Performance review revealed this defeats Astro's partial hydration benefit on long pages. Validated that mixed directives share the same module singleton. Late-hydrating islands read the current store value on mount (pull-based reactivity), so they don't miss earlier writes.

| Component | Directive | Rationale |
|-----------|-----------|-----------|
| ProseReactive (above fold) | `client:load` | Immediate interactivity needed |
| ProseHighlight (above fold) | `client:load` | Must respond to clicks immediately |
| ProgressBar | `client:load` | Visible on load |
| Quiz (throughout page) | `client:visible` | Only hydrate when scrolled to |
| Hint (throughout page) | `client:visible` | Only hydrate when scrolled to |
| Popup (throughout page) | `client:visible` | Hosts quiz/hint content |
| ExportImport | `client:idle` | Low priority, hydrate when browser is idle |

**Phase 1 validation target:** Confirm that a `client:visible` island reading from a store that was already mutated by a `client:load` island picks up the current value correctly.

### Shared State Pattern

The original `Record<string, unknown>` on `componentValues` is a bug factory — any component can write any shape to any key, and every consumer must do unsafe casting.

```typescript
// src/lib/types.ts
export type SM2Quality = 0 | 1 | 2 | 3 | 4 | 5;
export type ISODateString = string & { readonly __brand: 'ISODateString' };

export function toISODateString(date: Date): ISODateString {
  return date.toISOString() as ISODateString;
}

// Component value registry — add new types here as components are built
export interface ComponentValueRegistry {
  slider: { current: number };
  colorPicker: { hue: number; name: string };
  codeEditor: { source: string; hasError: boolean };
}

export type ComponentKey = `${keyof ComponentValueRegistry}:${string}`;
```

```typescript
// src/lib/state/lesson.svelte.ts
import type { ComponentValueRegistry, ComponentKey } from '../types';

export const lessonState = $state({
  activeHighlight: null as string | null,
  componentValues: {} as Partial<Record<ComponentKey, ComponentValueRegistry[keyof ComponentValueRegistry]>>,
});

export function getComponentValue<K extends keyof ComponentValueRegistry>(
  type: K, id: string
): ComponentValueRegistry[K] | undefined {
  return lessonState.componentValues[`${type}:${id}`] as ComponentValueRegistry[K] | undefined;
}

export function setComponentValue<K extends keyof ComponentValueRegistry>(
  type: K, id: string, value: ComponentValueRegistry[K]
): void {
  lessonState.componentValues[`${type}:${id}`] = value;
}

export function setHighlight(id: string | null) {
  lessonState.activeHighlight = id;
}
```

**Naming convention:** All stores use `{domain}State` suffix (not `Store`, which risks confusion with deprecated Svelte 4 writable/readable API): `lessonState`, `progressState`, `popupState`.

**Svelte 5 Set/Map reactivity:** Svelte 5's deep reactivity proxies objects and arrays but does **not** proxy native `Set` or `Map`. Mutations like `.add()`/`.delete()` on a plain `Set` inside `$state` are invisible to Svelte. Use `SvelteSet` (or `SvelteMap`) from `svelte/reactivity` instead — these are reactive drop-in replacements where `.add()`, `.delete()`, `.has()`, `.clear()` all trigger reactivity. Module-level non-reactive Sets (like `triggeredThisSession` in `popup.svelte.ts`) are unaffected since they aren't tracked by Svelte's reactivity system.

```typescript
import { SvelteSet } from 'svelte/reactivity';
let highlighted = new SvelteSet<string>(); // reactive .add()/.delete()
```

**State access convention:** Island root components import from stores directly. Intra-island children receive data as props. This keeps children testable and reusable.

### Prose-Component Interaction Model

Two bidirectional patterns, both flowing through shared Svelte stores:

**Pattern 1: Reactive highlights**
- `<ProseHighlight>` is a Svelte component wrapping clickable text. On click, it writes to `lessonState.activeHighlight`.
- Interactive components read `lessonState.activeHighlight` via `$derived` and respond (e.g., highlighting a region).
- Reverse: component interactions write to `lessonState.activeHighlight`, causing `<ProseHighlight>` to visually activate.

**Pattern 2: Shared state narration**
- `<ProseReactive>` is a Svelte component that reads from stores and renders dynamic text.
- Example: `<ProseReactive>You selected <strong>{getComponentValue('colorPicker', 'main')?.name}</strong> (hue: {getComponentValue('colorPicker', 'main')?.hue}).</ProseReactive>` — reads from the typed component value registry via `lessonState`.
- Uses ARIA live region (`aria-live="polite"`, `aria-atomic="true"`) so screen readers announce updates.
- The live region container must always be in the DOM — only change text content, never conditionally render/destroy it.

**Visual design:** The prose-component connection is the site's most distinctive feature. Invest disproportionate design effort here:

- **Connection affordance:** When a ProseHighlight is active, draw a faint curved SVG line or glowing thread from the highlighted text to the relevant component region. This makes the bidirectional relationship spatially visible.
- **Text transitions:** When ProseReactive text updates, crossfade the old/new value (200-300ms opacity + slight translateY). With `prefers-reduced-motion`, instant swap.
- **Visual affordance for highlights:** Not just a colored underline — use a slightly irregular or hand-drawn SVG path underline. Active state: background highlight with a brief color pulse.
- **Components read specific store keys** (not the entire `componentValues` object) to avoid unnecessary re-renders: `$derived(getComponentValue('colorPicker', 'main'))`.

### Quiz & Popup System

Quiz should be a pure content component. Popup owns trigger and presentation logic. This means Hint and any future popup content types automatically inherit all trigger behaviors without duplication.

**Svelte 5 slot pattern:** Svelte 5 replaces `<slot>` with snippet-based `{@render children()}`. Popup receives its content (Quiz or Hint) via `children` from `$props()`:

```svelte
<!-- Popup.svelte -->
<script lang="ts">
  let { children, trigger, mode = 'inline' } = $props();
</script>

{#if visible}
  <div class="popup popup--{mode}">
    {@render children?.()}
  </div>
{/if}
```

When nesting `<Popup client:visible><Quiz .../></Popup>` in an `.astro` file, Astro renders both Svelte components as a single island — Quiz hydrates with Popup, no separate `client:*` directive needed on Quiz.

**Authoring format:**

```astro
<!-- In index.astro -->
<p>Prose content about color theory...</p>

<Popup client:visible trigger="scroll" mode="inline">
  <Quiz
    id="color-primary"
    question="Which of these is NOT a primary color?"
    answers={["Red", "Green", "Blue"]}
    correctIndex={1}
  />
</Popup>

<ColorPicker client:load />

<Popup client:visible trigger="component-complete" triggerSource="color-picker" mode="inline">
  <Quiz
    id="color-mixing"
    question="What color do you get mixing red and blue?"
    answers={["Green", "Purple", "Orange"]}
    correctIndex={1}
  />
</Popup>

<Popup client:visible trigger="manual" mode="slide-in">
  <Hint title="Color wheel" content="The color wheel arranges hues..." />
</Popup>

<Popup client:visible trigger="scroll" mode="modal">
  <Quiz
    id="color-review"
    question="What are the three primary colors in additive color mixing?"
    answers={["Red, Yellow, Blue", "Red, Green, Blue", "Cyan, Magenta, Yellow"]}
    correctIndex={1}
  />
</Popup>
```

**Quiz component:** Pure content — renders question, answer options, feedback. Reports raw result `{ questionId, selectedAnswer, correct: boolean }`. Does NOT know about SM-2 quality scores — the scoring policy lives in the domain layer (`progress.svelte.ts` translates `correct: boolean` → `SM2Quality`).

**Quiz has two modes depending on context:**

1. **First encounter (new question):** Multiple-choice with radio buttons + submit button. Student selects an answer, submits, sees feedback ("Correct!" / "Not quite — the answer is..."). Result: `correct: true/false`.
2. **Review encounter (previously answered):** Simplified 2-button recall — "Show me again" / "I remember" (softer labels inspired by Duolingo research). The question is shown, the student self-assesses whether they remember the answer. No radio buttons needed — just the two buttons.

Both modes map to SM-2: first-encounter `correct: true` → quality 5, `correct: false` → quality 1. Review "I remember" → quality 5, "Show me again" → quality 1. For v1, avoid the full 0-5 scale — it adds decision fatigue in a prose-based context.

The Quiz component receives a `mode` prop (`"question" | "review"`) from the Popup, which determines which interaction pattern to render. The Popup checks the progress store to decide: if the quiz ID has been answered before and is due for review, use `"review"` mode; otherwise use `"question"` mode.

**Trigger types:**
- `trigger="scroll"` — single shared IntersectionObserver (threshold 0.3, `rootMargin: '0px 0px -50px 0px'`), fires once per page load. 1-second grace period after becoming visible before expanding.
- `trigger="manual"` — renders a button the student clicks
- `trigger="component-complete"` — watches a store value via `$derived`

**Popup modes (all v1):**
- `mode="inline"` — Expands in-place within the page flow. Default mode.
- `mode="modal"` — Uses native `<dialog>` with `showModal()` for free focus trapping, Escape handling, and backdrop. No focus-trap library needed. Good for focused assessments.
- `mode="slide-in"` — Side panel, non-blocking. Good for hints/references the student may want open while reading.

**Popup state machine:** A boolean or two booleans for popup visibility creates transition overlap bugs. Use a 4-state lifecycle:

```typescript
// popup.svelte.ts
type PopupPhase = 'idle' | 'entering' | 'active' | 'exiting';

export const popupState = $state({
  phase: 'idle' as PopupPhase,
  queue: [] as PopupDescriptor[],  // descriptors, not component instances
  current: null as PopupDescriptor | null,
});

// Trigger deduplication — module-level Set, not component state
const triggeredThisSession = new Set<string>();

export function tryTrigger(id: string): boolean {
  if (triggeredThisSession.has(id)) return false;
  triggeredThisSession.add(id);
  return true;
}
```

**Rules:**
- Only advance to the next queue item when phase is `idle`.
- Exit animation completion sets phase to `idle` (use `transitionend` event, not `setTimeout`).
- Only mount the *current* popup in the DOM — queue stores descriptors, not components.
- **`prefers-reduced-motion` bypass:** When active, skip `entering`/`exiting` phases entirely — go directly `idle ↔ active`. Zero-duration transitions may not fire `transitionend` in some browsers.
- **Max queue depth:** Cap at 3-5 to prevent quiz gauntlet on fast scrolling. Add "dismiss all queued" escape.

**Mode-specific behavior:**

| Behavior | `inline` | `modal` | `slide-in` |
|----------|----------|---------|------------|
| DOM position | Expands in-place in page flow | Native `<dialog>` with `showModal()` | Fixed-position side panel (right edge) |
| Focus management | No focus trap needed | Free via `showModal()` (inert background) | Move focus into panel on open, restore on close |
| Backdrop | None | Native `<dialog>::backdrop` (semi-transparent) | Optional dim overlay, not inert (page still interactive) |
| Dismiss | "Close" button or auto-collapse | Escape key (native), close button, backdrop click | Escape key, close button, click outside |
| Animation | Height expand/collapse | Fade + scale (or instant with reduced-motion) | Slide from right edge |
| Scrolling | Page scrolls normally | Page scroll locked (native `showModal()` behavior) | Page scrolls normally |
| Queue interaction | Queued popups wait | Queued popups wait | Can coexist with inline popups (non-blocking) |

**Shared scroll observer:** One observer for all scroll-triggered elements, not one per component:

```typescript
// src/lib/scroll-observer.ts
const callbacks = new Map<Element, () => void>();
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            callbacks.get(entry.target)?.();
            observer!.unobserve(entry.target);
            callbacks.delete(entry.target);
          }
        }
      },
      { threshold: 0.3, rootMargin: '0px 0px -50px 0px' }
    );
  }
  return observer;
}

export function observeOnce(el: Element, callback: () => void): () => void {
  callbacks.set(el, callback);
  getObserver().observe(el);
  return () => { callbacks.delete(el); getObserver().unobserve(el); };
}
```

IntersectionObserver fires its callback immediately on `observe()` if the element is already visible — no special handling needed for page-load-already-scrolled scenario.

**Dismissal policy:** Dismissed (unanswered) quizzes are not tracked by SM-2. They re-trigger on next page load when the student scrolls past the checkpoint again.

### SM-2 Spaced Repetition

**Algorithm:** Vanilla SM-2 (Wozniak 1990). Consider using the `supermemo` npm package or implement manually (~30 lines).

**Type the contract, not the implementation:**

```typescript
// src/lib/sm2.ts
import type { SM2Quality } from './types';

interface SM2Input {
  quality: SM2Quality;
  repetitions: number;
  easeFactor: number;
  interval: number;
}

interface SM2Output {
  repetitions: number;
  easeFactor: number;
  interval: number;
}

export function calculateSM2(input: SM2Input): SM2Output { /* ... */ }
```

If using the `supermemo` package, wrap it behind this interface (adapter pattern) to isolate naming mismatches (`repetition` vs `repetitions`, `efactor` vs `easeFactor`).

**Parameters:** Initial ease factor 2.5, minimum 1.3.

**Card identity:** Each quiz has a stable `id` prop (e.g., `"color-primary"`). SM-2 history is keyed by this ID.

**Review UX:** Research on prose-based learning platforms (Quantum Country, Duolingo, Brilliant) reveals that a **separate review session at the top of the page is the wrong pattern** for this product. Key findings:

- **Inline interleaving** (Andy Matuschak's "mnemonic medium") places review prompts at the same prose location where the concept was taught. This preserves narrative context and improves retention.
- **Duolingo hides the machinery** — users don't know which exercises are reviews vs. new content. This reduces the psychological burden of "reviews to do."
- **Large due counts cause abandonment.** Never show "47 reviews due." Cap at 5-7 reviews per page load, distributed at section breaks.

**Revised review model (replaces `ReviewSession` component):**
- When a quiz appears inline and the student has already answered it, show a **review variation** (re-ask the question) instead of hiding it. The quiz is already positioned in context.
- Due-date filtering applies at the individual quiz level — each `Popup` checks if its quiz ID is due for review.
- Cap at 5-7 reviews per page load, prioritized by overdue severity.
- On return visits, show a brief non-blocking banner: "A few concepts to revisit" (not a count). Optional, skippable.
- Reviews are never mandatory — never block new content.

### localStorage Persistence

**Schema (v1):**

```typescript
import type { SM2Quality, ISODateString } from './types';

interface CardData {
  interval: number;
  repetitions: number;
  easeFactor: number;
  dueDate: ISODateString;
  lastAnswer: SM2Quality;
  lastReviewed: ISODateString;
}

interface ProgressData {
  schemaVersion: 1;
  cards: Record<string, CardData>;
  exportedAt?: ISODateString;
}
```

**Runtime validation at all untrusted boundaries.** Use Zod v4 to validate localStorage reads AND JSON imports through the same validation function. `JSON.parse()` returns `any` — never let that leak into stores.

```typescript
// persistence.ts — single validation function for both boundaries
// NOTE: Use Zod v4 (current stable). Key v4 changes from v3:
//   - z.literal() accepts arrays: z.literal([0,1,2,3,4,5])
//   - z.record() requires TWO args: z.record(keySchema, valueSchema)
//   - Import: import { z } from 'zod' (same as v3)
import { z } from 'zod';

const CardDataSchema = z.object({
  interval: z.number(),
  repetitions: z.number(),
  easeFactor: z.number().min(1.3),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T/),
  lastAnswer: z.literal([0, 1, 2, 3, 4, 5]),  // Zod v4: array form replaces z.union of literals
  lastReviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}T/),
});

const ProgressDataSchema = z.object({
  schemaVersion: z.literal(1),
  cards: z.record(z.string(), CardDataSchema),  // Zod v4: two args required (key + value)
  exportedAt: z.string().optional(),
});
```

**Store initialization order (critical):** Load from localStorage at module top-level in `progress.svelte.ts`, not in an `$effect`. Use `$effect` only for *writing*. This prevents a flash of "no data" before the effect runs. Note that `$effect` cannot run at bare module level in `.svelte.ts` files — it requires a reactive context. Use `$effect.root()` to create one (see auto-save example below).

**Debounced auto-save:**

`$effect` only runs inside a component or an effect root — it cannot run at bare module level in a `.svelte.ts` file. Use `$effect.root()` to create a disposal-safe effect root at module scope:

```typescript
let saveTimeout: ReturnType<typeof setTimeout>;

// $effect.root() creates an effect root at module level and returns a cleanup function
const dispose = $effect.root(() => {
  $effect(() => {
    if (persistenceMeta.importInProgress) return; // skip during import
    const snapshot = JSON.stringify(progressState);
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      localStorage.setItem('crowcoder-progress', snapshot);
    }, 500);
  });
});
// dispose() is available but never called in a single-page app — the effect lives for the page lifetime
```

Only persist `progressState` (SM-2 card data), not `lessonState` (ephemeral component values).

**Import atomicity (prevents race condition):** Route ALL localStorage writes through a single function. During import: suspend the auto-save effect, validate the imported data, write directly to localStorage, update the store, then re-enable the effect.

```typescript
export const persistenceMeta = $state({ importInProgress: false });

export function importProgress(data: ProgressData) {
  persistenceMeta.importInProgress = true;
  clearTimeout(saveTimeout);
  // REPLACE, not merge — clear existing cards, then assign imported ones
  for (const key of Object.keys(progressState.cards)) {
    delete progressState.cards[key];
  }
  Object.assign(progressState.cards, data.cards);
  localStorage.setItem('crowcoder-progress', JSON.stringify(progressState));
  persistenceMeta.importInProgress = false;
}
```

**Graceful degradation:** If localStorage is unavailable (private browsing), progress works in-memory for the session but is not persisted. Show a subtle warning banner.

**Export/Import:**
- Export: serialize to pretty-printed JSON. Filename: `crowcoder-progress-YYYY-MM-DD.json`. Cap imported card count (e.g., 10,000) to prevent memory exhaustion.
- Import: file picker, validate with Zod schema, then **replace** existing progress (no merge in v1). Prompt student to confirm. Snapshot file contents immediately on selection — do not re-read after confirmation.
- Never render imported strings as raw HTML. Reconstruct clean objects from validated fields (no deep-merge utilities — prevents prototype pollution).

### Pre-Hydration Experience

- Prose renders as static HTML immediately (no JS needed). `ProseReactive` and `ProseHighlight` render initial/default text server-side rather than showing skeletons.
- Interactive components show component-shaped CSS skeleton placeholders (not generic gray rectangles). Use the site's accent color in the skeleton pulse.
- `<noscript>` message: "This learning page requires JavaScript for interactive components and quizzes."

### Accessibility

Built into each phase, not deferred to a final audit:

- **Phase 1:** `aria-live="polite"` + `aria-atomic="true"` on `ProseReactive` (container always in DOM, only change text). Keyboard operability + visible focus indicators on `ProseHighlight`.
- **Phase 2:** Quiz answer options as radio buttons with proper `role`/ARIA. Keyboard: Tab through answers, Enter to submit, Escape to dismiss. Native `<dialog>` with `showModal()` for modal mode — gives free focus trapping + inert background. Focus restoration on modal close. Slide-in panel uses `aria-label` and manages focus on open. Persistent `aria-live="polite"` region for quiz feedback ("Correct!" / "Try again") — never conditionally render the container. `prefers-reduced-motion` — bypass popup animation states entirely (go directly `idle ↔ active`).
- **Phase 3:** Final accessibility audit sweep — verify all three popup modes handle focus correctly, ARIA attributes complete, keyboard navigation end-to-end.

### Security Rules

Codify in `CLAUDE.md` before any code is written:

- **NEVER** use `{@html}` or Astro's `set:html` with data from localStorage, JSON import, or any runtime source. Only permitted with build-time constants or author-written string literals.
- **NEVER** use plain `Set`/`Map` inside `$state` for reactive collections — Svelte 5 won't proxy them. Use `SvelteSet`/`SvelteMap` from `svelte/reactivity` instead.
- All untrusted data (localStorage, JSON import) must pass through the shared Zod v4 schema validator before entering Svelte stores.
- Pin GitHub Actions to commit SHAs (not mutable tags like `@v5`).
- Add CSP `<meta>` tag in `Base.astro`: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'`. (Astro injects inline `<script>` tags for island hydration — `'unsafe-inline'` is required for `script-src` unless using Astro's experimental CSP nonce support. Fonts are self-hosted so `font-src 'self'` is sufficient.)
- Wrap `JSON.parse()` in try/catch at all call sites. Show clear error on failure.

### Design Direction

**Aesthetic:** Editorial textbook meets interactive playground. Prose areas feel like a well-typeset book page; interactive components feel like tactile objects placed on top of the page.

**Typography — Concrete Choices:**

Three fonts, each with a distinct role — editorial content feels bookish, interactive chrome feels app-like, technical content feels precise:

| Role | Font | Format | Rationale |
|------|------|--------|-----------|
| Body prose | **Literata** (variable) | Self-hosted WOFF2 via Fontsource | Purpose-built for screen reading (originally for Google Play Books). Has optical size axis (`opsz: 7-72`) that auto-adjusts at 19px. Variable font (200-900 weight) = one file replaces 10+ static files. |
| UI elements | **DM Sans** (variable) | Self-hosted WOFF2 via Fontsource | Geometric sans with slight warmth. Strong visual contrast against Literata's serif strokes. Smaller x-height than Inter creates clear hierarchy. |
| Code / technical | **JetBrains Mono** (400 only) | Self-hosted WOFF2 via Fontsource | Excellent monospace readability, ligatures. Only load 400 weight. |

**Why self-host (not Google Fonts CDN):** Chrome's cache partitioning (since 2020) killed the "everyone uses Google Fonts" cache benefit. Self-hosting eliminates two third-party connections (~200-600ms on first load), gives immutable cache headers, and avoids Google tracking.

**Font loading strategy:**
- `font-display: swap` for Literata (body text must be visible immediately in Georgia fallback)
- `font-display: optional` for DM Sans (system sans-serif is fine if it doesn't load in 100ms)
- `font-display: swap` for JetBrains Mono (code needs monospace)
- Preload only Literata + DM Sans in `<head>` (JetBrains Mono loads lazily)
- CLS mitigation: `size-adjust: 97%` on Georgia fallback to match Literata metrics

**Installation:**
```bash
npm install @fontsource-variable/literata @fontsource-variable/dm-sans @fontsource/jetbrains-mono
```

**Typography scale (Major Third — 1.250 ratio, 19px base):**

| Element | Size | Weight | Line-height | Font |
|---------|------|--------|-------------|------|
| Body text | 19px (1.1875rem) | 400 | 1.65 | Literata |
| Small/meta | 15px (0.9375rem) | 400 | 1.5 | DM Sans |
| H4 / Section label | 19px (1.1875rem) | 600 | 1.4 | Literata |
| H3 / Subsection | 24px (1.5rem) | 600 | 1.35 | Literata |
| H2 / Section | 30px (1.875rem) | 700 | 1.25 | Literata |
| H1 / Page title | 37px (2.3125rem) | 700 | 1.2 | Literata |
| Quiz question | 17px (1.0625rem) | 400 | 1.5 | Literata |
| Quiz answers / buttons | 16px (1rem) | 500 | 1.4 | DM Sans |
| Progress labels | 14px (0.875rem) | 500 | 1.4 | DM Sans |

**Layout:**
- Prose in a narrow readable column (max 680px, ~68 chars/line with Literata at 19px).
- Interactive components "break out" wider (max 960px).
- Consistent vertical rhythm: 1.5rem between paragraphs, 4rem above/below interactive components, 3rem around quizzes, 0.75rem below headings (headings bind to content below, not above).

**Color:** Warm neutral background (not pure white — `#faf8f5` warm ivory or similar). One strong accent color for interactivity. Secondary muted color for mastered states. Design dark mode as a first-class theme.

**Quiz cards:** Visually distinct surface — subtle background texture, different background color, crisp border. "Index card laid on the page" feel.

**ProgressBar:** Segmented (one segment per quiz/card), color-coded by status (unseen / due / mastered). Clicking a segment scrolls to that quiz's location. On narrow viewports, collapse to "4/12 mastered" with tap-to-expand.

## Implementation Phases

### Phase 1: Setup + Core Content System

**Goal:** Scaffold project, validate cross-island state sharing, build the prose-component interaction model.

**Tasks:**
- [ ] Initialize git repository
- [ ] Scaffold Astro 5 project (`npm create astro@latest`)
- [ ] Add Svelte 5 integration (`npx astro add svelte`)
- [ ] Add Tailwind CSS v4 (`npm install tailwindcss @tailwindcss/vite`, configure Vite plugin)
- [ ] Install fonts (`npm install @fontsource-variable/literata @fontsource-variable/dm-sans @fontsource/jetbrains-mono`)
- [ ] Set up typography and base styles in `global.css` (Literata body, DM Sans UI, JetBrains Mono code, Major Third scale, Georgia fallback with `size-adjust`)
- [ ] Create `src/lib/types.ts` (SM2Quality, ISODateString, ComponentValueRegistry)
- [ ] Create shared `lesson.svelte.ts` store with typed component value registry
- [ ] Build `ProseReactive.svelte` (reads stores, renders dynamic text, `aria-live="polite"` + `aria-atomic="true"`)
- [ ] Build `ProseHighlight.svelte` (clickable text, writes to store, visual affordance, keyboard-operable)
- [ ] Wire bidirectional highlighting (prose click → component highlight, component → prose highlight)
- [ ] Build `Base.astro` layout with CSP meta tag, typography, responsive columns
- [ ] Validate cross-island store sharing with mixed `client:load` and `client:visible` directives
- [ ] Create a color theory sample lesson demonstrating both interaction patterns (color picker component + reactive prose about hue/saturation/value, clickable prose highlights linking to color wheel regions)
- [ ] Configure GitHub Pages deployment (`.github/workflows/deploy.yml`, SHA-pinned actions, repo: `CuriousCrow123/CrowCoder`)
- [ ] Push to remote (`git remote add origin https://github.com/CuriousCrow123/CrowCoder.git && git push -u origin main`) — first push creates the branch
- [ ] Configure GitHub Pages (Settings → Pages → Source: GitHub Actions) after first deployment workflow runs
- [ ] Populate `CLAUDE.md` with project conventions and security rules
- [ ] Create ADR documenting the Vite module deduplication dependency (`docs/decisions/`)

**Success criteria:** Two+ Astro islands with mixed hydration directives sharing reactive state. Color theory lesson with color picker where clicking highlighted prose activates a component and vice versa. Self-hosted Literata + DM Sans rendering correctly. Pushed to `CuriousCrow123/CrowCoder` remote.

**Sample lesson content (color theory):**
- Interactive color picker/wheel component (write hue/saturation to `lessonState`)
- `ProseReactive` sections that narrate the selected color ("You selected **blue** (hue: 240). Blue is a cool color...")
- `ProseHighlight` words ("warm", "cool", "complementary") that set the picker to relevant regions on click
- Prose covering: primary/secondary/tertiary colors, warm vs cool, complementary pairs, color in design

**Files:**
- `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`
- `src/lib/types.ts`
- `src/lib/state/lesson.svelte.ts`
- `src/components/ProseReactive.svelte`
- `src/components/ProseHighlight.svelte`
- `src/components/ColorPicker.svelte` (color theory interactive component)
- `src/layouts/Base.astro`
- `src/pages/index.astro`
- `src/styles/global.css`
- `.github/workflows/deploy.yml`
- `CLAUDE.md`
- `docs/decisions/001-cross-island-state-sharing.md`

### Phase 2: Quiz System + SM-2 + Persistence

**Goal:** Build the complete quiz → SM-2 → localStorage pipeline in one phase (quizzes without persistence aren't useful to test).

**Tasks:**
- [ ] Build `Popup.svelte` (trigger logic, all three modes: inline/modal/slide-in, state machine with 4 phases)
- [ ] Build `Quiz.svelte` (pure content: question, radio-button answers, feedback, raw result reporting)
- [ ] Build `Hint.svelte` (non-quiz popup content)
- [ ] Build `scroll-observer.ts` (single shared IntersectionObserver, one-shot, threshold 0.3)
- [ ] Implement scroll trigger in Popup (uses scroll-observer, 1-second grace period)
- [ ] Implement manual trigger in Popup (button click)
- [ ] Implement component-complete trigger in Popup (watches store via $derived)
- [ ] Build popup state machine in `popup.svelte.ts` (`idle → entering → active → exiting`)
- [ ] Add trigger deduplication (module-level Set, not component state)
- [ ] Add max queue depth (3-5) with "dismiss all" escape
- [ ] Implement `mode="inline"` — expand in-place within page flow
- [ ] Implement `mode="modal"` — native `<dialog>` + `showModal()`, `aria-labelledby`, focus restoration on close
- [ ] Implement `mode="slide-in"` — side panel, non-blocking, `aria-label`, focus management on open/close
- [ ] Handle `prefers-reduced-motion` — bypass entering/exiting, go directly idle ↔ active
- [ ] Add keyboard navigation (Tab through answers, Enter to submit, Escape to dismiss modal/slide-in)
- [ ] Implement SM-2 algorithm in `src/lib/sm2.ts` with typed contract
- [ ] Build `progress.svelte.ts` (load from localStorage at module top-level, not in $effect)
- [ ] Build `persistence.ts` (Zod validation, debounced auto-save via $effect, import atomicity)
- [ ] Wire quiz raw results → scoring policy → SM-2 → progressState
- [ ] Handle localStorage unavailability (in-memory fallback + warning banner)
- [ ] Build inline review: due quizzes re-appear at their original prose location, capped at 5-7 per load
- [ ] Build `ProgressBar.svelte` (segmented, color-coded, clickable segments scroll to quiz)
- [ ] Build `ExportImport.svelte` (download JSON / upload + Zod validate + replace, with confirmation)
- [ ] Add quiz and review components to the sample lesson
- [ ] Unit tests for `sm2.ts`

**Success criteria:** Student answers quizzes in all three popup modes (inline, modal, slide-in), SM-2 schedules reviews, due quizzes re-appear inline on next visit, progress persists across page reloads, export/import works, popup state machine handles transitions cleanly across all modes.

**Files:**
- `src/components/Popup.svelte`
- `src/components/Quiz.svelte`
- `src/components/Hint.svelte`
- `src/components/ProgressBar.svelte`
- `src/components/ExportImport.svelte`
- `src/lib/state/popup.svelte.ts`
- `src/lib/state/progress.svelte.ts`
- `src/lib/sm2.ts`
- `src/lib/persistence.ts`
- `src/lib/scroll-observer.ts`
- `src/lib/types.ts` (updated)
- `src/pages/index.astro` (updated)

### Phase 3: Polish, Stretch Goals, Accessibility Audit

**Goal:** Visual polish, final accessibility pass, deploy.

**Tasks:**
- [ ] Add connection-line SVG affordance between ProseHighlight and linked component
- [ ] Add text crossfade transitions on ProseReactive updates
- [ ] Add CSS skeleton placeholders shaped to each component type
- [ ] Add `<noscript>` fallback message
- [ ] Final accessibility audit (focus management, ARIA attributes, keyboard navigation)
- [ ] Add dark mode as a first-class theme
- [ ] Add non-blocking review banner on return visits ("A few concepts to revisit")
- [ ] Create a complete sample lesson demonstrating all features
- [ ] Integration test: two islands sharing state across mixed hydration directives
- [ ] Deploy to GitHub Pages and verify end-to-end

**Success criteria:** Fully functional learning page, accessible, visually polished with connection lines and transitions, dark mode, deployed.

**Files:**
- `src/components/ProseHighlight.svelte` (updated — connection line)
- `src/components/ProseReactive.svelte` (updated — text transitions)
- `src/layouts/Base.astro` (updated — dark mode, noscript)
- `src/pages/index.astro` (final lesson)

## Alternative Approaches Considered

(see brainstorm: docs/brainstorms/2026-03-11-interactive-learning-site-brainstorm.md)

1. **Event Bus Architecture** — Rejected. More decoupled but loses type safety, harder to debug, more boilerplate.
2. **Single Svelte App Island** — Rejected. Simplest reactivity but loses Astro's partial hydration benefits, larger JS bundle.
3. **Nano Stores** — Considered but unnecessary. Pure Svelte project doesn't need the abstraction; `.svelte.ts` runes are simpler and more idiomatic.
4. **MDX authoring** — Rejected in favor of `.astro` files for maximum layout control.
5. **Top-of-page ReviewSession** — Rejected after UX research. Inline review at section breaks (mnemonic medium pattern) is simpler to build, better for retention, and avoids a separate component.

## Acceptance Criteria

### Functional Requirements

- [ ] Single page renders prose and interactive Svelte components
- [ ] Prose updates reactively when component state changes (shared state narration)
- [ ] Clicking highlighted prose activates component state (reactive highlights)
- [ ] Component interaction highlights linked prose text
- [ ] Quiz popups appear via scroll checkpoint, manual button, and component-completion triggers
- [ ] All three popup modes work: inline (expand in-place), modal (native `<dialog>`), slide-in (side panel)
- [ ] Quiz answers are tracked with SM-2 algorithm
- [ ] Due review quizzes re-appear inline at their original prose location
- [ ] Student progress persists in localStorage across page reloads
- [ ] Student can export progress as JSON and import it on another device
- [ ] Site deploys to GitHub Pages via GitHub Actions

### Non-Functional Requirements

- [ ] Page loads with readable prose before JavaScript hydrates
- [ ] All interactive components are keyboard-navigable
- [ ] Reactive prose uses `aria-live` for screen reader announcements
- [ ] Modal popups use native `<dialog>` with `showModal()`
- [ ] `prefers-reduced-motion` respected (bypass animation states)
- [ ] `<noscript>` fallback present
- [ ] localStorage schema is versioned from v1
- [ ] All untrusted data passes through Zod v4 validation
- [ ] No `{@html}` or `set:html` with runtime data
- [ ] Unit tests for SM-2 algorithm
- [ ] Integration test for cross-island state sharing

## Dependencies & Prerequisites

- **Astro 5** — framework
- **Svelte 5** — component framework (runes required)
- **@astrojs/svelte** — Astro integration
- **Tailwind CSS v4** — styling (via `@tailwindcss/vite` plugin)
- **Zod v4** — runtime schema validation at storage boundaries (v4 has breaking changes from v3: `z.record()` requires two args, `z.literal()` accepts arrays)
- **supermemo** (optional) — SM-2 implementation, or implement manually (~30 lines)
- **@fontsource-variable/literata** — body prose font (variable WOFF2, self-hosted)
- **@fontsource-variable/dm-sans** — UI font (variable WOFF2, self-hosted)
- **@fontsource/jetbrains-mono** — code/technical font (400 weight)
- **GitHub Pages** — hosting (free, repo: `https://github.com/CuriousCrow123/CrowCoder.git`)
- **GitHub Actions** — CI/CD (`withastro/action@<sha>`, SHA-pinned)

**Note:** The repo is currently empty (no branches pushed). The first push will create the `main` branch. GitHub Pages can be configured after the first deployment workflow runs.

No backend, database, or external services required.

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Cross-island store sharing doesn't work as expected | Low (validated by research) | Critical | Phase 1 validates with mixed hydration directives + integration test |
| Vite module deduplication changes in future Astro version | Low | High | ADR documenting dependency, integration test as canary |
| Import vs auto-save race condition | Medium | High | Single-writer pattern, suspend effect during import |
| `prefers-reduced-motion` breaks popup state machine | Medium | High | Bypass animation states entirely when active |
| Hydration timing causes flickering on reactive prose | Medium | Low | Tiered hydration + CSS skeleton placeholders |
| localStorage unavailable in private browsing | Medium | Medium | In-memory fallback + warning banner |
| SM-2 parameters don't feel right for the UX | Medium | Low | 2-button model ("Show me again" / "I remember"), easy to tune |
| Content authoring in `.astro` files is cumbersome | Low | Medium | Can add MDX support later; Astro supports both |
| Popup queue overwhelm on fast scrolling | Medium | Low | Max queue depth (3-5) + "dismiss all" escape |

## Testing Strategy

| Level | Target | Phase |
|-------|--------|-------|
| Unit tests | `sm2.ts` — pure function, trivially testable | Phase 2 |
| Unit tests | `persistence.ts` — Zod validation, schema migration | Phase 2 |
| Integration test | Cross-island state sharing (two islands see same $state object) | Phase 1 |
| Manual verification | Popup state machine transitions, keyboard navigation | Phase 2 |
| Manual verification | Export/import roundtrip, localStorage unavailability | Phase 2 |

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-11-interactive-learning-site-brainstorm.md](docs/brainstorms/2026-03-11-interactive-learning-site-brainstorm.md) — Key decisions carried forward: Svelte stores hub architecture, multi-mode popup system, SM-2 spaced repetition, Tailwind CSS, GitHub Pages deployment.

### External References

- [Astro Islands Architecture](https://docs.astro.build/en/concepts/islands/)
- [Astro: Share State Between Islands](https://docs.astro.build/en/recipes/sharing-state-islands/)
- [Astro GitHub Pages Deployment](https://docs.astro.build/en/guides/deploy/github/)
- [Astro Roadmap Discussion #756: Shared State](https://github.com/withastro/roadmap/discussions/756)
- [Svelte 5 .svelte.ts Files](https://svelte.dev/docs/svelte/svelte-js-files)
- [Svelte 5 $state Rune](https://svelte.dev/docs/svelte/$state)
- [Tailwind CSS v4 Astro Installation](https://tailwindcss.com/docs/installation/framework-guides/astro)
- [SM-2 Algorithm (supermemo npm)](https://github.com/VienDinhCom/supermemo)
- [Mnemonic Medium — Andy Matuschak](https://notes.andymatuschak.org/Mnemonic_medium)
- [Quantum Country](https://quantum.country/)
- [Duolingo: Review Exercises](https://blog.duolingo.com/review-exercises-help-measure-learner-recall/)
- [W3C WAI-ARIA APG: Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [MDN: The `<dialog>` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)
- [MDN: ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)
- [trap-focus-svelte (360 bytes)](https://github.com/henrygd/trap-focus-svelte)
