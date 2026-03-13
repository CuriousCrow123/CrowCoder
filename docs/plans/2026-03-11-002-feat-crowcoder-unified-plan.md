---
title: "feat: CrowCoder Unified Plan — Interactive Learning Website + Dev-Time Design Tuning"
type: feat
status: active
date: 2026-03-11
origin: docs/brainstorms/2026-03-11-plan-integration-brainstorm.md
supersedes:
  - docs/plans/2026-03-11-feat-interactive-learning-website-plan.md
  - docs/plans/2026-03-11-feat-dev-design-tuning-system-plan.md
repo: https://github.com/CuriousCrow123/CrowCoder.git
---

# CrowCoder Unified Plan

## Overview

Build a single-page interactive learning website on GitHub Pages using Astro 6 + Svelte 5 + Tailwind CSS v4. The page interleaves prose and interactive Svelte components with full bidirectional reactivity — prose reacts to component state and vice versa. A quiz/popup system supports spaced repetition (SM-2 algorithm) with student progress stored in localStorage and optional JSON export/import.

Integrated from day one: a dev-time parameter tuning system where each component gets a colocated `.params.ts` sidecar file defining its tunable parameters. Per-component floating debug panels (gear icon toggle) render sliders, color pickers, and toggles for real-time design iteration. A "commit" button writes tuned values back to source via a hardened Astro dev server endpoint, triggering Vite HMR. Global design tokens (column widths, colors, spacing) are tuned from a separate fixed-corner panel and flow via CSS custom properties. The entire tuning system is gated behind `import.meta.env.DEV` and tree-shaken from production builds.

This is a greenfield project. No code, dependencies, or git history exist yet.

## Enhancement Summary

**Deepened on:** 2026-03-11
**Sections enhanced:** 9
**Review agents used:** Code Simplicity Reviewer, Pattern Recognition Specialist, Security Sentinel, Architecture Strategist, Performance Oracle, TypeScript Reviewer, Frontend Races Reviewer, Framework Docs Researcher

### Critical Fixes (must address before implementation)

1. **~~BUG — Snippet `children` name collision~~ RESOLVED**: Fixed by aliasing `children` to `slotContent` in component props: `let { children: slotContent } = $props()`. See brainstorm "Implementation Discoveries" section.
2. **Import clobbers auto-save** (HIGH): The import flow does not `clearTimeout(saveTimeout)` before setting `importInProgress`, so a pending 500ms debounced write can overwrite imported data with stale pre-import state.
3. **`transitionend` can strand popup state machine** (HIGH): If the CSS transition is skipped (element hidden, `prefers-reduced-motion`, parent `display:none`), `transitionend` never fires and the state machine is stuck in `entering`/`exiting` forever. Add a safety `setTimeout` fallback at `duration + 100ms`.
4. **~~CSRF allows missing Origin header~~ RESOLVED**: Endpoint now denies requests with absent Origin header. Zod-validated request body also added.
5. **Eager serialization in auto-save `$effect`** (PERF): `JSON.stringify(progressState)` runs on every reactive mutation, not just when the debounce fires. Move serialization inside the `setTimeout` callback.
6. **Font loading strategy conflict** (PERF): `font-display: optional` on DM Sans + `<link rel="preload">` is contradictory — on slow connections, DM Sans may never render for the entire session. Change to `swap`.

### Key Improvements Discovered

7. **~~Extract `createParamAccessor` factory~~ RESOLVED** — Extracted to `param-types.ts` with type-safe overloads.
8. **~~Zod schemas and TypeScript interfaces are dual-maintained~~ RESOLVED** — Added compile-time type assertions in `params-writer.ts` ensuring Zod schema stays in sync with `ParamDef`.
9. **~~`ISODateString` brand has no parse path~~ RESOLVED** — Added `parseISODateString()` to `types.ts`.
10. **~~Design tokens have no production path~~ RESOLVED** — `Base.astro` renders `:root` CSS declarations from `design-tokens.params.ts` at build time via `set:html`.
11. **~~Integration test belongs in Phase 1, not Phase 3~~ RESOLVED** — Moved to Phase 1 checklist.
12. **~~Add `object-src 'none'; base-uri 'self'; form-action 'self'` to CSP~~ RESOLVED** — Added to `Base.astro` CSP meta tag.
13. **~~IntersectionObserver grace period not implemented~~ RESOLVED** — Implemented in `scroll-observer.ts` with a 1-second grace period timer that delays callback execution after intersection.
14. **~~Define composite `PopupState` type~~ RESOLVED** — `popup.svelte.ts` now uses `PopupEntry` interface with `request` and `phase` fields, stored in `SvelteMap<string, PopupEntry>` for multi-slot concurrent popups.
15. **~~Quiz wiring layer undefined~~ RESOLVED** — `QuizPopup.svelte` is the composition wrapper that connects Quiz to the progress store and manages popup lifecycle. Astro slots are static HTML, so Quiz and Popup must share a single hydration boundary.
16. **~~Below-fold ProseHighlight/ProseReactive should use `client:visible`~~ REVISED** — All interactive `ProseHighlight` instances now use `client:load` to avoid non-functional buttons before hydration (review finding P3 #12).

### New Considerations

17. **~~TOCTOU in path validation~~ RESOLVED** — `realpath` now runs first, then `startsWith` check against resolved root.
18. **~~Top-level `await import()` blocks component render~~ RESOLVED** — Created `src/lib/dev/lazy.ts` with shared promise pattern resolved via `onMount`. Svelte 5 actually *forbids* top-level `await` (compiler error, not just perf issue).
19. **~~`beforeunload` flush~~ RESOLVED** — Implemented in `persistence.ts`. Flushes pending debounced writes on `beforeunload`.
20. **~~Add `tier` indicator to ParamDef~~ RESOLVED** — Added `tier?: 'css' | 'js'` to `ParamBase`. `ParamInput` renders JS tier badge.
21. **HMR resets panel state** — After committing JS params, the gear panel closes and overrides reset. Consider `sessionStorage` persistence keyed by component ID.
22. **~~Zod validation on write-back request body~~ RESOLVED** — Added `RequestSchema` with Zod validation in `params-writer.ts`.
23. **`file.size` check before JSON import** — Cap at 5MB before `FileReader` to prevent tab crash on malformed files.
24. **Dark mode interaction with design tokens** — Inline styles from `setProperty()` override media-query dark mode rules. Phase 3 must use class-based toggle.
25. **CSP `unsafe-eval` required for Zod v4** — Zod v4 uses `new Function()` internally which Brave blocks without `unsafe-eval` in CSP. Trade-off documented in `docs/solutions/003-csp-blocks-zod-new-function-brave.md`.
26. **Astro slots are static HTML** — Svelte components passed as slot children of a `client:*` island are SSR'd and never hydrated. QuizPopup solves this by wrapping Quiz + Popup in a single hydration boundary. See `docs/decisions/002-island-composition-wrapper-pattern.md`.

## Problem Statement

Traditional static learning content lacks interactivity. Students passively read without engaging with concepts. Existing interactive tools (Jupyter, Observable) are code-focused or require server infrastructure. There's a gap for a lightweight, static-site approach that deeply interleaves prose with reactive components — where the text itself responds to what the student does, and spaced repetition reinforces retention.

Separately, interactive components have numeric/visual parameters that affect feel — transition durations, underline thickness, color-pulse timing, animation durations, IntersectionObserver thresholds. Hardcoding these makes iterative design tuning tedious: change a value in source, wait for HMR, evaluate, repeat. A dev-time tuning system solves this by allowing real-time parameter adjustment with one-click persistence.

## Proposed Solution

A static Astro 6 site where each lesson page is an `.astro` file mixing prose with hydrated Svelte 5 islands. All interactive components share reactive state via Svelte 5 rune-based `.svelte.ts` modules (confirmed to work as singletons across Astro islands via Vite's module deduplication). A flexible popup system handles quizzes, hints, and definitions. SM-2 spaced repetition tracks student answers in localStorage.

Every interactive component with tunable visual/behavioral parameters gets a colocated `.params.ts` sidecar file. A reusable `<Tunable>` wrapper component renders a gear icon in dev mode; clicking it opens a persistent floating panel with type-appropriate controls. Changes to CSS params take effect instantly via local reactive state; JS behavioral params update via the HMR commit cycle.

### Key architectural decisions

(see brainstorm: docs/brainstorms/2026-03-11-plan-integration-brainstorm.md)

1. **Svelte 5 rune stores as shared state hub** — `.svelte.ts` files with `$state` objects shared across Astro islands
2. **Authored in .astro files** — direct layout control over MDX convenience
3. **Multi-mode popup system** — inline, modal, slide-in (all three in v1)
4. **SM-2 spaced repetition** — Anki-style algorithm for review scheduling
5. **LocalStorage + JSON export/import** — no backend needed
6. **Tailwind CSS v4** — via Vite plugin (not PostCSS)
7. **GitHub Pages** — static deployment via GitHub Actions
8. **Per-component debug panels** — floating gear icon, persistent panel, per-component commit (replaces central sidebar)
9. **Global design tokens via CSS custom properties** — `GlobalParamPanel` in fixed bottom-right corner, flows via `:root` cascade
10. **Minimal-ceremony tuning DX** — `<Tunable>` wrapper component, opt-in, invisible in production

## Technical Approach

### Architecture

```
src/
  layouts/
    Base.astro                      # HTML shell, CSP meta, global.css, GlobalParamPanel (dev-only)
  pages/
    index.astro                     # Single lesson page (v1)
  components/
    ProseReactive.svelte            # Reactive text that reads from stores
    ProseReactive.params.ts         # Crossfade duration, translateY, opacity
    ProseHighlight.svelte           # Clickable prose that writes to stores
    ProseHighlight.params.ts        # Underline thickness, pulse color/duration
    ColorPicker.svelte              # Color theory interactive component
    ColorPicker.params.ts           # Wheel size, handle radius, ring width
    Popup.svelte                    # Popup container (trigger + mode logic)
    Popup.params.ts                 # Enter/exit duration, grace period, backdrop opacity
    Quiz.svelte                     # Pure answering/review component (question, radio answers, correct/incorrect display)
    Quiz.params.ts                  # Card border radius, background, feedback duration
    QuizPopup.svelte                # Composition wrapper managing Quiz + Popup lifecycle (single hydration boundary)
    Hint.svelte                     # Non-quiz hint/definition content
    ProgressBar.svelte              # Segmented progress map
    ProgressBar.params.ts           # Segment colors, border radius, spacing
    ExportImport.svelte             # Export/import controls (no .params.ts — purely functional)
  lib/
    state/
      lesson.svelte.ts             # Per-lesson reactive state (typed component values, highlights)
      progress.svelte.ts           # Quiz answers, SM-2 card data
      popup.svelte.ts              # Popup queue, state machine, trigger guards
    dev/
      Tunable.svelte               # Wrapper: gear icon + floating ParamPanel (dev-only)
      ParamPanel.svelte            # Floating panel with controls + commit button
      ParamInput.svelte            # Per-type input control ({#if} branching)
      param-types.ts               # ParamDef discriminated union, getParamValue helper (also used in production)
      lazy.ts                      # Shared async Tunable loader (avoids top-level await)
      GlobalParamPanel.svelte      # Fixed bottom-right panel for design tokens
    sm2.ts                         # Pure SM-2 algorithm (no framework dependency)
    persistence.ts                 # localStorage read/write with schema versioning + Zod validation
    scroll-observer.ts             # Single shared IntersectionObserver
    types.ts                       # Shared types (SM2Quality, ISODateString, ComponentValueRegistry)
    design-tokens.params.ts        # Site-wide tunable values (column widths, colors, spacing)
  styles/
    global.css                     # @import "tailwindcss" + Fontsource imports + typography scale
  integrations/
    params-writer.ts               # Astro integration with astro:server:setup hook
public/
  # Static assets
.github/
  workflows/
    deploy.yml                     # GitHub Pages deployment (SHA-pinned actions)
```

### Cross-Island State Sharing (Validated)

Research confirmed that `.svelte.ts` module-level `$state` objects are singletons across Astro islands on the same page. Vite/Rollup extracts shared dependencies into a common chunk, and the ES module system guarantees single evaluation.

**Note:** Astro's official docs recommend **Nano Stores** for cross-island state sharing (framework-agnostic). We deliberately chose `.svelte.ts` rune stores instead because (a) this is a pure Svelte project — no React/Vue islands, so framework-agnostic is unnecessary overhead; (b) `.svelte.ts` runes are more ergonomic than Nano Stores' `$atom`/`subscribe` API; (c) one fewer dependency. The trade-off: we depend on Vite module deduplication (an implementation detail) rather than an explicitly supported Astro pattern. The ADR and integration test mitigate this risk.

**Constraints:**
- Must export `$state` as **objects** and mutate properties (cannot export reassignable `$state` primitives)
- Mixed hydration directives (`client:load`, `client:visible`, `client:idle`) still share the same module singleton — the guarantee comes from the ES module system, not simultaneous hydration timing
- State resets on full page navigation (fine for single-page v1; localStorage persists across pages for future multi-page)
- `$effect` does not run during SSR — safe for a static site
- **This is an implementation detail of Vite/Rollup, not an explicit Astro contract.** Document as an ADR in `docs/decisions/`. Add an integration test asserting two islands see the same state object as an early-warning canary for Astro upgrades.

**Tiered hydration:** Mixed directives share the same module singleton. Late-hydrating islands read the current store value on mount (pull-based reactivity), so they don't miss earlier writes.

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

**Svelte 5 Set/Map reactivity:** Svelte 5's deep reactivity proxies objects and arrays but does **not** proxy native `Set` or `Map`. Use `SvelteSet` (or `SvelteMap`) from `svelte/reactivity` for reactive collections. Module-level non-reactive Sets (like `triggeredThisSession` in `popup.svelte.ts`) are unaffected.

### Shared State Pattern

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

**Naming convention:** All stores use `{domain}State` suffix (not `Store`, which risks confusion with deprecated Svelte 4 API): `lessonState`, `progressState`, `popupState`.

**State access convention:** Island root components import from stores directly. Intra-island children receive data as props. This keeps children testable and reusable.

### Prose-Component Interaction Model

Two bidirectional patterns, both flowing through shared Svelte stores:

**Pattern 1: Reactive highlights**
- `<ProseHighlight>` wraps clickable text. On click, writes to `lessonState.activeHighlight`.
- Interactive components read `lessonState.activeHighlight` via `$derived` and respond (e.g., highlighting a region).
- Reverse: component interactions write to `lessonState.activeHighlight`, causing `<ProseHighlight>` to visually activate.

**Pattern 2: Shared state narration**
- `<ProseReactive>` reads from stores and renders dynamic text.
- Example: `<ProseReactive>You selected <strong>{getComponentValue('colorPicker', 'main')?.name}</strong></ProseReactive>`
- Uses ARIA live region (`aria-live="polite"`, `aria-atomic="true"`) so screen readers announce updates.
- The live region container must always be in the DOM — only change text content, never conditionally render/destroy it.

**Visual design — the site's most distinctive feature:**
- **Connection affordance:** When a ProseHighlight is active, draw a faint curved SVG line or glowing thread from the highlighted text to the relevant component region.
- **Text transitions:** When ProseReactive text updates, crossfade the old/new value (200-300ms opacity + slight translateY). With `prefers-reduced-motion`, instant swap.
- **Visual affordance for highlights:** Slightly irregular or hand-drawn SVG path underline. Active state: background highlight with brief color pulse.
- **Components read specific store keys** (not the entire `componentValues` object) to avoid unnecessary re-renders.

### Design Tuning System

(see brainstorm: docs/brainstorms/2026-03-11-plan-integration-brainstorm.md — Conflicts 1, 6, 10, 11, 12)

#### ParamDef Type (Discriminated Union)

Three variants so TypeScript prevents invalid combinations (e.g., `{ type: 'boolean', min: 5 }`):

```typescript
// src/lib/dev/param-types.ts

interface ParamBase {
  key: string;           // unique within component, e.g. "underlineThickness"
  label: string;         // human-readable, e.g. "Underline Thickness"
}

export interface NumberParamDef extends ParamBase {
  type: 'number';
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;         // "px", "ms", "%", "deg"
}

export interface ColorParamDef extends ParamBase {
  type: 'color';
  value: string;         // hex string, e.g. "#6366f1"
}

export interface BooleanParamDef extends ParamBase {
  type: 'boolean';
  value: boolean;
}

export type ParamDef = NumberParamDef | ColorParamDef | BooleanParamDef;

// Type-safe value extraction
type ParamValueMap = {
  number: number;
  color: string;
  boolean: boolean;
};

export function getParamValue<K extends ParamDef['type']>(
  params: ParamDef[],
  key: string,
  expectedType: K,
): ParamValueMap[K] {
  const param = params.find(d => d.key === key);
  if (!param) throw new Error(`[dev-params] Missing param: "${key}"`);
  if (param.type !== expectedType) {
    throw new Error(`[dev-params] Param "${key}" is type "${param.type}", expected "${expectedType}"`);
  }
  return param.value as ParamValueMap[K];
}
```

**Why discriminated unions:** `min`/`max`/`step` are required on number params and absent on color/boolean. TypeScript narrows `value` automatically in `{#if}` branches — no casting needed in ParamInput. The `getParamValue()` helper validates at runtime before its `as` cast.

**Simplification decisions:** `duration` merged into `number` (semantic distinction via `unit: 'ms'`). `category` field removed (never consumed). `ParamFile` type inlined (no reuse).

#### Tunable Wrapper Component (Minimal-Ceremony DX)

(see brainstorm: Conflict 10 — Developer Experience)

The `<Tunable>` wrapper is the single integration point for the tuning system. Developers create a `.params.ts` file and wrap their component — everything else is automatic:

```svelte
<!-- src/lib/dev/Tunable.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ParamDef } from './param-types';
  import ParamPanel from './ParamPanel.svelte';

  let { children, params, filePath }: {
    children: Snippet<[Record<string, number | string | boolean>]>;
    params: ParamDef[];
    filePath: string;
  } = $props();

  // Note: Tunable itself is only loaded in dev mode (via lazy.ts),
  // so ParamPanel can be a static import here — it's tree-shaken
  // along with Tunable in production builds.

  let showPanel = $state(false);
  // Local overrides — no global store needed
  let overrides = $state<Record<string, number | string | boolean>>({});

  function handleChange(key: string, value: number | string | boolean) {
    overrides[key] = value;
  }
</script>

<div class="tunable-wrapper" style="position: relative;">
  {@render children(overrides)}

  {#if ParamPanel}
    <button
      class="tunable-gear"
      onclick={() => showPanel = !showPanel}
      aria-label="Toggle parameter panel"
    >
      <!-- gear icon SVG -->
    </button>

    {#if showPanel}
      <ParamPanel
        {params}
        {filePath}
        onchange={handleChange}
      />
    {/if}
  {/if}
</div>
```

**Component usage pattern — minimal ceremony:**

```svelte
<!-- ProseHighlight.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import params from './ProseHighlight.params';
  import { createParamAccessor } from '../lib/dev/param-types';
  import { tunablePromise } from '../lib/dev/lazy';

  // Lazy-load Tunable in dev mode (Svelte 5 disallows top-level await)
  let TunableComponent = $state<any>(null);
  onMount(() => {
    tunablePromise?.then((c) => { TunableComponent = c; });
  });

  // "slotContent" not "children" — avoids collision with Tunable's {#snippet children(overrides)}
  let { children: slotContent, id }: {
    children: Snippet;
    id: string;
  } = $props();

  const p = createParamAccessor(params);
</script>

<!-- In dev mode: wrap in Tunable for gear icon + panel -->
<!-- In production: TunableComponent is null, just render the span directly -->
{#if TunableComponent}
  <TunableComponent {params} filePath="./src/components/ProseHighlight.params.ts">
    {#snippet children(overrides)}
      <span
        class="prose-highlight"
        style:--underline-thickness="{p('underlineThickness', 'number', overrides)}px"
        style:--pulse-color={p('pulseColor', 'color', overrides)}
        style:--pulse-duration="{p('pulseDuration', 'number', overrides)}ms"
      >
        {@render slotContent()}
      </span>
    {/snippet}
  </TunableComponent>
{:else}
  <span
    class="prose-highlight"
    style:--underline-thickness="{p('underlineThickness', 'number')}px"
    style:--pulse-color={p('pulseColor', 'color')}
    style:--pulse-duration="{p('pulseDuration', 'number')}ms"
  >
    {@render slotContent()}
  </span>
{/if}
```

**Astro-Svelte slot interop:** In `.astro` files, content between component tags maps to the `children` snippet in Svelte 5 automatically. Svelte `{#snippet}` syntax is **not valid** in `.astro` templates. Components that accept slot content AND use `<Tunable>` must alias `children` to `slotContent` to avoid the name collision with Tunable's `{#snippet children(overrides)}`.

**Two-tier update model:**
- **Tier 1 — CSS params (instant):** The `<Tunable>` wrapper passes overrides via snippet parameter. Components apply them to `style:` bindings. Svelte 5's fine-grained reactivity updates only the specific binding that changed. 60fps capable.
- **Tier 2 — JS behavioral params (commit cycle):** IntersectionObserver thresholds, queue depths, and other imperative values consumed in `$effect`/`onMount` update through HMR: commit → disk write → Vite reload → component re-mount.

#### ParamInput Component

Uses `{#if}` branching (not dynamic components) since there are only 3 input types:

```svelte
<!-- src/lib/dev/ParamInput.svelte -->
<script lang="ts">
  import type { ParamDef } from './param-types';

  let { definition, onchange }: {
    definition: ParamDef;
    onchange: (value: number | string | boolean) => void;
  } = $props();
</script>

<label class="param-input">
  <span class="param-label">{definition.label}</span>

  {#if definition.type === 'number'}
    <input
      type="range"
      min={definition.min}
      max={definition.max}
      step={definition.step}
      value={definition.value}
      oninput={(e) => onchange(+e.currentTarget.value)}
    />
    <span class="param-value">{definition.value}{definition.unit ?? ''}</span>

  {:else if definition.type === 'color'}
    <input
      type="color"
      value={definition.value}
      oninput={(e) => onchange(e.currentTarget.value)}
    />
    <span class="param-value">{definition.value}</span>

  {:else if definition.type === 'boolean'}
    <input
      type="checkbox"
      checked={definition.value}
      onchange={(e) => onchange(e.currentTarget.checked)}
    />
  {/if}
</label>
```

#### Global Design Tokens

(see brainstorm: Conflicts 3, 11)

Site-wide tunable values live in `src/lib/design-tokens.params.ts`:

```typescript
// src/lib/design-tokens.params.ts
import type { ParamDef } from './dev/param-types';

const params: ParamDef[] = [
  { key: 'proseMaxWidth', label: 'Prose Column Width', type: 'number', value: 680, min: 500, max: 900, step: 10, unit: 'px' },
  { key: 'componentBreakoutWidth', label: 'Component Breakout Width', type: 'number', value: 960, min: 700, max: 1200, step: 10, unit: 'px' },
  { key: 'paragraphSpacing', label: 'Paragraph Spacing', type: 'number', value: 1.5, min: 0.5, max: 3, step: 0.25, unit: 'rem' },
  { key: 'componentSpacing', label: 'Component Vertical Spacing', type: 'number', value: 4, min: 1, max: 8, step: 0.5, unit: 'rem' },
  { key: 'accentColor', label: 'Accent Color', type: 'color', value: '#6366f1' },
  { key: 'backgroundColor', label: 'Background Color', type: 'color', value: '#faf8f5' },
];

export default params;
```

The `GlobalParamPanel` is mounted in `Base.astro` (dev-only, fixed bottom-right corner, collapsible). It sets CSS custom properties on `:root` via `document.documentElement.style.setProperty()`. All components consume them via `var()` — changes propagate instantly via the cascade with zero per-component boilerplate.

#### Write-Back Endpoint (Hardened)

Uses `astro:server:setup` hook — inherently dev-only:

```typescript
// src/integrations/params-writer.ts
import type { AstroIntegration } from 'astro';
import { writeFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import type { ParamDef } from '../lib/dev/param-types';

const MAX_BODY = 64 * 1024; // 64KB

// Explicit field ordering for deterministic output and clean git diffs
const FIELD_ORDER: readonly string[] = [
  'key', 'label', 'type', 'value', 'min', 'max', 'step', 'unit',
];

function generateParamsFileContent(params: ParamDef[]): string {
  const lines = params.map(p => {
    const fields = FIELD_ORDER
      .filter(field => (p as Record<string, unknown>)[field] !== undefined)
      .map(field => `${field}: ${JSON.stringify((p as Record<string, unknown>)[field])}`)
      .join(', ');
    return `  { ${fields} },`;
  });

  return [
    `import type { ParamDef } from '../lib/dev/param-types';`,
    ``,
    `const params: ParamDef[] = [`,
    ...lines,
    `];`,
    ``,
    `export default params;`,
    ``,
  ].join('\n');
}

export function paramsWriterIntegration(): AstroIntegration {
  return {
    name: 'crowcoder-params-writer',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use('/__params/write', async (req, res, next) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
          }

          // CSRF check — deny by default when Origin/Referer absent (corrected per deepening review)
          const origin = req.headers['origin'] || req.headers['referer'] || '';
          if (!origin) {
            res.statusCode = 403;
            res.end(JSON.stringify({ error: 'Missing origin' }));
            return;
          }
          try {
            const { hostname } = new URL(String(origin));
            if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }
          } catch {
            res.statusCode = 403;
            res.end(JSON.stringify({ error: 'Forbidden' }));
            return;
          }

          // Body size limit
          let body = '';
          let bodySize = 0;
          req.on('data', (chunk: Buffer) => {
            bodySize += chunk.length;
            if (bodySize > MAX_BODY) {
              res.statusCode = 413;
              res.end(JSON.stringify({ error: 'Payload too large' }));
              req.destroy();
              return;
            }
            body += chunk.toString();
          });
          req.on('error', (err) => {
            console.error('[params-writer] Request stream error:', err);
            if (!res.headersSent) {
              res.writeHead(500);
              res.end('Stream error');
            }
          });
          req.on('end', async () => {
            try {
              const { filePath, params } = JSON.parse(body);
              const root = server.config.root;
              const abs = path.resolve(root, filePath);

              // Restrict to .params.ts files only
              if (!filePath.endsWith('.params.ts')) {
                res.statusCode = 403;
                res.end(JSON.stringify({ error: 'Only .params.ts files allowed' }));
                return;
              }

              // Path traversal prevention
              const normalizedRoot = root.endsWith(path.sep) ? root : root + path.sep;
              if (!abs.startsWith(normalizedRoot)) {
                res.statusCode = 403;
                res.end(JSON.stringify({ error: 'Path rejected' }));
                return;
              }

              // Symlink escape check
              try {
                const realDir = await realpath(path.dirname(abs));
                const realRoot = await realpath(root);
                const normalizedRealRoot = realRoot.endsWith(path.sep)
                  ? realRoot : realRoot + path.sep;
                if (!realDir.startsWith(normalizedRealRoot)) {
                  res.statusCode = 403;
                  res.end(JSON.stringify({ error: 'Path rejected' }));
                  return;
                }
              } catch {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid path' }));
                return;
              }

              // Server-side content generation from validated params
              const content = generateParamsFileContent(params);
              await writeFile(abs, content, 'utf-8');

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: true, path: filePath }));
            } catch (e: any) {
              console.error('[params-writer]', e);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Write failed' }));
            }
          });
        });
      },
    },
  };
}
```

**Security hardening (8 findings addressed):**

| # | Finding | Severity | Remediation |
|---|---------|----------|-------------|
| 1 | Path traversal bypass | HIGH | Normalize with trailing `path.sep` before comparison |
| 2 | Unrestricted file type | HIGH | Restrict to `.params.ts` extension only |
| 3 | No body size limit | MEDIUM | 64KB limit with `req.destroy()` on overflow |
| 4 | Content injection | MEDIUM | Server-side content generation from structured param data |
| 5 | Error message leakage | LOW | Generic response, detailed error logged server-side |
| 6 | No CSRF protection | LOW | Origin/referer hostname parsing (not `startsWith` — prevents `localhost.evil.com` bypass) |
| 7 | Concurrent write race | LOW | Per-panel commit button with local `idle`/`committing` state |
| 8 | Symlink escape | LOW | `realpath` resolution before comparison |

#### Production Safety

All dev-tool imports are gated behind `import.meta.env.DEV`. Vite replaces this with `false` at build time, and tree-shaking eliminates the entire import chain.

**`DevGlobalPanel.astro` dev-only mount:**

The original approach (`await import()` in frontmatter + `client:idle`) was replaced because Astro's renderer cannot resolve dynamic imports for `client:*` directives. The new approach bypasses Astro hydration entirely — a `<script>` tag with `import.meta.env.DEV` guard mounts the component directly via Svelte's `mount()` API:

```astro
---
// Dev-only wrapper: mounts GlobalParamPanel via Svelte's mount() API.
// Bypasses Astro's hydration directives (which can't resolve dynamic imports)
---
<div id="dev-global-panel"></div>
<script>
  if (import.meta.env.DEV) {
    const { default: GlobalParamPanel } = await import('../lib/dev/GlobalParamPanel.svelte');
    const { mount } = await import('svelte');
    const target = document.getElementById('dev-global-panel');
    if (target) { mount(GlobalParamPanel, { target }); }
  }
</script>
```

**Post-build verification:** After the first `astro build`, run `grep -r "Tunable\|ParamPanel\|ParamInput\|GlobalParamPanel\|__params" dist/` to confirm zero leakage. Add this as a CI check. **Note:** `param-types` and `design-tokens.params` are intentionally present in production — `createParamAccessor` provides runtime default values, and design tokens are imported at build time by `Base.astro`.

### Quiz & Popup System

**Quiz** is a pure answering/review component — renders question, radio-button answer options, and correct/incorrect feedback in review mode. Reports raw result `{ questionId, selectedAnswer, correct: boolean }`. Does NOT know about SM-2 quality scores — the scoring policy lives in the domain layer (`progress.svelte.ts` translates `correct: boolean` → `SM2Quality`).

**Quiz has two visual states** (controlled by the `mode` prop from QuizPopup):
1. **`'answer'` mode:** Multiple-choice with radio buttons (using `bind:group`) + submit button.
2. **`'review'` mode:** Shows correct/incorrect answer highlighting + "Try again" button.

**QuizPopup** is a composition wrapper (`src/components/QuizPopup.svelte`) that manages the Quiz + Popup lifecycle within a single hydration boundary. This is necessary because **Astro slots are static HTML** — Svelte components passed as slot children of a `client:*` island are SSR'd and never hydrated. QuizPopup wraps both Popup and Quiz so they share one hydration boundary and can interact reactively. See `docs/decisions/002-island-composition-wrapper-pattern.md`.

**Quiz interaction sequence (screen by screen):**

*Answering:*
1. Popup appears (via scroll trigger or manual). Quiz shows question with radio-button answers.
2. Student selects answer, clicks "Submit".
3. QuizPopup records the answer in the progress store, dismisses the popup.
4. A "Review answer" button appears at the quiz location.

*Reviewing:*
1. Student clicks "Review answer". QuizPopup reopens popup in review mode.
2. Quiz shows the question with correct answer highlighted green, incorrect selection (if any) in red.
3. A "Try again" button is available to re-attempt.

*Dismissed without answering:*
1. If student dismisses the popup without submitting, a "Try quiz" button appears.
2. Clicking it reopens the popup in answer mode.

**Inline quiz dismiss affordance:** All popup modes (including inline) render a small "x" close button in the top-right corner. Dismissed quizzes are not tracked by SM-2 and re-trigger on next page load.

**Popup** owns trigger and presentation logic. QuizPopup (or Hint) composes Popup internally — content is NOT passed via Astro slots.

**Authoring format:**
```astro
<!-- In index.astro -->
<QuizPopup client:visible id="color-primary"
  question="Which of these is NOT a primary color?"
  answers={["Red", "Green", "Blue", "Yellow"]}
  correctIndex={1} />
```

**Why QuizPopup instead of `<Popup><Quiz/></Popup>`:** Astro slots are static HTML — Svelte components passed as slot children of a `client:*` island are SSR'd and never hydrated. If a child component needs interactivity (Quiz does), parent + child must be wrapped in a single Svelte component so they share one hydration boundary.

**Trigger types:**
- `trigger="scroll"` — single shared IntersectionObserver (threshold `0` for zero-height container compatibility, `rootMargin: '0px 0px -50px 0px'`), fires once per page load. 1-second grace period.
- `trigger="manual"` — renders a button the student clicks
- `trigger="component-complete"` — watches a store value via `$derived`

**Popup modes (all v1):**

| Behavior | `inline` | `modal` | `slide-in` |
|----------|----------|---------|------------|
| DOM position | Expands in-place | Native `<dialog>` with `showModal()` | Fixed-position side panel |
| Focus management | No focus trap | Free via `showModal()` | Move focus into panel on open |
| Dismiss | Close button | Escape, close button, backdrop click | Escape, close button, click outside |
| Animation | Height expand/collapse | Fade + scale | Slide from right edge |
| Scrolling | Page scrolls normally | Page scroll locked | Page scrolls normally |

**Popup state machine (4 phases):**
```typescript
type PopupPhase = 'idle' | 'entering' | 'active' | 'exiting';
```

Rules: exit animation uses `transitionend` (not `setTimeout`); `prefers-reduced-motion` bypasses `entering`/`exiting` entirely. Dismissed (unanswered) quizzes re-trigger on next page load.

**Multi-slot concurrent architecture:** State lives in `popupState.active` (`SvelteMap<string, PopupEntry>`) — each popup has an independent lifecycle with its own phase. Multiple popups can be active concurrently (e.g. quiz + hint open simultaneously). `MAX_CONCURRENT = 10`. All lifecycle functions take an `id` parameter: `requestPopup(id, mode)`, `onEntered(id)`, `dismiss(id)`, `onExited(id)`. Trigger deduplication uses a `triggeredThisSession` Set; use `markTriggered(id)` to suppress without opening, `resetTrigger(id)` to re-enable.

**Shared scroll observer:**
```typescript
// src/lib/scroll-observer.ts
const callbacks = new Map<Element, () => void>();
const timers = new Map<Element, ReturnType<typeof setTimeout>>();
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cb = callbacks.get(entry.target);
            if (cb) {
              // 1-second grace period: delay callback to avoid instant popup
              // when element is already visible at hydration time
              const timer = setTimeout(() => {
                timers.delete(entry.target);
                cb();
              }, 1000);
              timers.set(entry.target, timer);
            }
            observer!.unobserve(entry.target);
            callbacks.delete(entry.target);
          }
        }
      },
      { threshold: 0, rootMargin: '0px 0px -50px 0px' }
    );
  }
  return observer;
}

export function observeOnce(el: Element, callback: () => void): () => void {
  callbacks.set(el, callback);
  getObserver().observe(el);
  return () => {
    callbacks.delete(el);
    const timer = timers.get(el);
    if (timer) { clearTimeout(timer); timers.delete(el); }
    getObserver().unobserve(el);
  };
}
```

### SM-2 Spaced Repetition

Vanilla SM-2 (Wozniak 1990). Consider using the `supermemo` npm package or implement manually (~30 lines). If using the package, wrap it behind a typed interface (adapter pattern).

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

**Review UX (inline, not separate session):** Due quizzes re-appear at their original prose location. Cap at 5-7 reviews per page load, prioritized by overdue severity. On return visits, show a brief non-blocking banner: "A few concepts to revisit" (not a count). Reviews are never mandatory.

### localStorage Persistence

**Schema (v1):**
```typescript
interface CardData {
  interval: number;
  repetitions: number;
  easeFactor: number;
  dueDate: ISODateString;
  lastAnswer: SM2Quality;
  lastReviewed: ISODateString;
  lastSelectedIndex?: number;  // tracks student's most recent answer choice for review display
}

interface ProgressData {
  schemaVersion: 1;
  cards: Record<string, CardData>;
  exportedAt?: ISODateString;
}
```

**Runtime validation:** Use Zod v4 for both localStorage reads AND JSON imports through the same validation function.

```typescript
// NOTE: Zod v4 changes from v3:
//   - z.literal() accepts arrays: z.literal([0,1,2,3,4,5])
//   - z.record() requires TWO args: z.record(keySchema, valueSchema)
import { z } from 'zod';

const CardDataSchema = z.object({
  interval: z.number(),
  repetitions: z.number(),
  easeFactor: z.number().min(1.3),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T/),
  lastAnswer: z.literal([0, 1, 2, 3, 4, 5]),
  lastReviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}T/),
  lastSelectedIndex: z.number().int().min(0).optional(),
});

const ProgressDataSchema = z.object({
  schemaVersion: z.literal(1),
  cards: z.record(z.string(), CardDataSchema),
  exportedAt: z.string().optional(),
});
```

**Store initialization:** Load from localStorage at module top-level in `progress.svelte.ts`, not in an `$effect`. Prevents flash of "no data".

**Debounced auto-save:** Use `$effect.root()` for module-scope effect. `saveTimeout` must be module-scoped (outside both `$effect.root` and `$effect`). Serialization happens inside the `setTimeout` callback to avoid running `JSON.stringify` on every reactive mutation *(corrected per deepening review)*:
```typescript
let saveTimeout: ReturnType<typeof setTimeout>;  // module-scoped

const dispose = $effect.root(() => {
  $effect(() => {
    if (persistenceMeta.importInProgress) return;
    void progressState.cards;  // cheap subscription trigger
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      const snapshot = JSON.stringify(progressState);
      localStorage.setItem('crowcoder-progress', snapshot);
    }, 500);
  });
});

// Flush on tab close to prevent losing the last write (corrected per deepening review)
window.addEventListener('beforeunload', () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    localStorage.setItem('crowcoder-progress', JSON.stringify(progressState));
  }
});
```

**Import atomicity:** `clearTimeout(saveTimeout)` first to kill any pending stale write *(corrected per deepening review)*, then suspend auto-save, validate, write to localStorage, update store, re-enable effect. Replace, not merge (v1).

**Schema migration strategy:** When `schemaVersion` advances to v2, the validator must handle both versions. Pattern: check `schemaVersion` first, apply a migration function (`migrateV1toV2`) that transforms the data shape, then validate against the v2 schema. Never reject v1 exports — always migrate forward. Store the migrated data back to localStorage so the migration only runs once.

**Timezone handling:** Due dates are stored as UTC ISO strings. Compare against `new Date().toISOString()` (also UTC) — never against local time. This ensures consistent behavior regardless of the student's timezone.

**Graceful degradation:** If localStorage is unavailable, progress works in-memory with a subtle warning banner.

**Export:** Pretty-printed JSON, filename `crowcoder-progress-YYYY-MM-DD.json`. Cap imported card count (10,000).

**Import:** File picker, Zod validate, replace with confirmation. Snapshot file on selection. Never render imported strings as raw HTML.

### Pre-Hydration Experience

- Prose renders as static HTML immediately. `ProseReactive` and `ProseHighlight` render default text server-side.
- Interactive components show component-shaped CSS skeleton placeholders (site accent color).
- `<noscript>` message: "This learning page requires JavaScript for interactive components and quizzes."

### Accessibility

Built into each phase, not deferred:

- **Phase 1:** `aria-live="polite"` + `aria-atomic="true"` on ProseReactive. Keyboard operability + visible focus indicators on ProseHighlight.
- **Phase 2:** Quiz answers as radio buttons with proper ARIA. Keyboard: Tab through answers, Enter to submit, Escape to dismiss. Native `<dialog>` for modal mode. Focus restoration on close. `prefers-reduced-motion` bypasses animation states. Persistent `aria-live` region for quiz feedback.
- **Phase 3:** Final accessibility audit. Verify focus management across all popup modes.

### Security Rules

Codify in `CLAUDE.md` before any code is written:

- **NEVER** use `{@html}` or `set:html` with data from localStorage, JSON import, or any runtime source.
- **NEVER** use plain `Set`/`Map` inside `$state` — use `SvelteSet`/`SvelteMap` from `svelte/reactivity`.
- All untrusted data passes through Zod v4 schema validator before entering stores.
- Pin GitHub Actions to commit SHAs.
- CSP `<meta>` tag: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self'`. (`unsafe-eval` required for Zod v4 `new Function()` usage in Brave — see `docs/solutions/003-csp-blocks-zod-new-function-brave.md`)
- Wrap `JSON.parse()` in try/catch at all call sites.
- Write-back endpoint: path validation, file type restriction, body size limit, CSRF check, server-side content generation.

### Design Direction

**Aesthetic:** Editorial textbook meets interactive playground.

**Typography — Three fonts:**

| Role | Font | Rationale |
|------|------|-----------|
| Body prose | **Literata** (variable) | Purpose-built for screen reading, optical size axis |
| UI elements | **DM Sans** (variable) | Geometric sans, strong contrast against Literata |
| Code / technical | **JetBrains Mono** (400) | Excellent monospace readability |

Self-hosted WOFF2 via Fontsource. `font-display: swap` for all three fonts *(corrected per deepening review — `optional` on DM Sans caused it to silently disappear on slow connections)*. Preload Literata only (body font, dominates the page). CLS mitigation: `size-adjust` fallback descriptors (Georgia ~97% for Literata, Arial ~100% for DM Sans, Courier New ~110% for JetBrains Mono). Investigate Fontsource Latin-only subsets (can cut 40-60% per file).

**Typography scale (Major Third — 1.250 ratio, 19px base):**

| Element | Size | Weight | Line-height | Font |
|---------|------|--------|-------------|------|
| Body text | 19px | 400 | 1.65 | Literata |
| Small/meta | 15px | 400 | 1.5 | DM Sans |
| H4 | 19px | 600 | 1.4 | Literata |
| H3 | 24px | 600 | 1.35 | Literata |
| H2 | 30px | 700 | 1.25 | Literata |
| H1 | 37px | 700 | 1.2 | Literata |
| Quiz question | 17px | 400 | 1.5 | Literata |
| Quiz answers | 16px | 500 | 1.4 | DM Sans |
| Progress labels | 14px | 500 | 1.4 | DM Sans |

**Layout:**
- Prose: narrow readable column (max 680px, ~68 chars/line). Tunable via `--prose-max-width`.
- Interactive components: break out wider (max 960px). Tunable via `--component-breakout-width`.
- Vertical rhythm: 1.5rem paragraphs, 4rem around interactive components, 3rem around quizzes, 0.75rem below headings. All tunable via design tokens.

**Color:** Warm neutral background (`#faf8f5`). One strong accent color for interactivity. Dark mode as a first-class theme.

**Quiz cards:** Subtle background texture, different background color, crisp border. "Index card laid on the page" feel.

**ProgressBar:** Segmented, color-coded by status. Clicking a segment scrolls to that quiz. Narrow viewports: collapse to "4/12 mastered" with tap-to-expand.

**ProgressBar state mapping from SM-2 card data:**

| Visual State | Condition | Color |
|---|---|---|
| Unseen | No CardData entry for this quiz ID | Neutral/gray |
| Due | CardData exists AND `dueDate <= now` | Accent color (attention) |
| Answered (not yet due) | CardData exists AND `dueDate > now` AND `repetitions < 3` | Muted accent |
| Mastered | CardData exists AND `repetitions >= 3` AND `dueDate > now` | Success/green |

## Implementation Phases

### Phase 1: Setup + Core Content System + Tuning Infrastructure

**Goal:** Scaffold project, validate cross-island state sharing, build prose-component interaction model, establish tuning infrastructure so every component benefits from day one.

**Tasks:**
- [x] Initialize git repository
- [x] Scaffold Astro 5 project (`npm create astro@latest`) *(Note: Astro 6 is latest stable — used instead of Astro 5)*
- [x] Add Svelte 5 integration (`npx astro add svelte`)
- [x] Add Tailwind CSS v4 (`npm install tailwindcss @tailwindcss/vite`, configure Vite plugin)
- [x] Install fonts (`npm install @fontsource-variable/literata @fontsource-variable/dm-sans @fontsource/jetbrains-mono`)
- [x] Set up typography and base styles in `global.css`
- [x] Create `src/lib/types.ts` (SM2Quality, ISODateString, ComponentValueRegistry)
- [x] Create shared `lesson.svelte.ts` store with typed component value registry
- [x] **Create `src/lib/dev/param-types.ts`** — ParamDef discriminated union + getParamValue helper + `createParamAccessor` factory
- [x] **Create `src/integrations/params-writer.ts`** — hardened Astro integration
- [x] **Register `paramsWriterIntegration()` in `astro.config.mjs`**
- [x] **Build `src/lib/dev/ParamInput.svelte`** — per-type input (slider, color picker, toggle)
- [x] **Build `src/lib/dev/ParamPanel.svelte`** — floating panel with controls + commit button + local state
- [x] **Build `src/lib/dev/Tunable.svelte`** — wrapper component (gear icon, dev-mode gate)
- [x] **Create `src/lib/design-tokens.params.ts`** — site-wide tunable values
- [x] **Build `src/lib/dev/GlobalParamPanel.svelte`** — fixed bottom-right corner, reads/writes `:root` custom properties
- [x] Build `ProseReactive.svelte` + `ProseReactive.params.ts` (reads stores, dynamic text, aria-live)
- [x] Build `ProseHighlight.svelte` + `ProseHighlight.params.ts` (clickable text, writes to store)
- [x] Wire bidirectional highlighting
- [x] Build `ColorPicker.svelte` + `ColorPicker.params.ts` (color theory interactive component)
- [x] Build `Base.astro` layout with CSP meta tag, typography, responsive columns, GlobalParamPanel (dev-only)
- [x] Validate cross-island store sharing with mixed `client:load` and `client:visible` directives
- [x] **Validate tuning system:** sliders update component visuals in real-time, commit writes back to `.params.ts`, Vite HMR reloads
- [x] Create color theory sample lesson demonstrating both interaction patterns
- [x] Configure GitHub Pages deployment (`.github/workflows/deploy.yml`, SHA-pinned actions)
- [x] Push to remote (`git remote add origin https://github.com/CuriousCrow123/CrowCoder.git && git push -u origin main`)
- [x] Configure GitHub Pages (Settings → Pages → Source: GitHub Actions)
- [x] Populate `CLAUDE.md` with project conventions and security rules
- [x] Create ADR: `docs/decisions/001-cross-island-state-sharing.md`
- [x] **Verify production build** has zero trace of dev tooling (`grep -r` against `dist/`) — CI must fail on match
- [x] **Integration test: cross-island state sharing** — verify reactive propagation (not just object identity) across `client:load` and `client:visible` islands
- [x] **Code review fixes (P1/P2/P3)** — 16 findings addressed: leaked promises fixed with `$effect`+cancellation, Tunable prop mutation fixed via `structuredClone`, `site`/`base` config added, rAF throttle on drag, `setTimeout` cleanup, type safety (`TunableType` replaces `any`), keyboard a11y (Home/End/PageUp/PageDown), focus ring fix, Zod/TS sync assertion, snippet extraction (DRY), `client:load` for interactive elements, `aria-hidden` on decorative SVGs, `0.01ms` reduced-motion pattern, YAGNI types removed

**Success criteria:** Two+ Astro islands sharing reactive state across mixed hydration directives. Color theory lesson with bidirectional prose-component interaction. Per-component tuning panels working (real-time CSS feedback + commit to disk). Global design tokens panel functional. Self-hosted fonts rendering. Deployed to GitHub Pages. Zero dev tooling in production build.

**Files:**
- `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`
- `src/lib/types.ts`
- `src/lib/state/lesson.svelte.ts`
- `src/lib/dev/param-types.ts`, `lazy.ts`, `ParamInput.svelte`, `ParamPanel.svelte`, `Tunable.svelte`, `GlobalParamPanel.svelte`
- `src/lib/design-tokens.params.ts`
- `src/integrations/params-writer.ts`
- `src/components/ProseReactive.svelte`, `ProseReactive.params.ts`
- `src/components/ProseHighlight.svelte`, `ProseHighlight.params.ts`
- `src/components/ColorPicker.svelte`, `ColorPicker.params.ts`
- `src/layouts/Base.astro`
- `src/pages/index.astro`
- `src/styles/global.css`
- `.github/workflows/deploy.yml`
- `CLAUDE.md`
- `docs/decisions/001-cross-island-state-sharing.md`

### Phase 2: Quiz System + SM-2 + Persistence

**Goal:** Build the complete quiz → SM-2 → localStorage pipeline in one phase.

**Tasks:**
- [x] Build `Popup.svelte` + `Popup.params.ts` (trigger logic, all three modes, state machine)
- [x] Build `Quiz.svelte` + `Quiz.params.ts` (pure content: question, answers, feedback)
- [x] Build `Hint.svelte` (non-quiz popup content; evaluate if it needs `.params.ts`) — No `.params.ts` needed; purely structural
- [x] Build `scroll-observer.ts` (single shared IntersectionObserver, one-shot)
- [x] Implement scroll trigger in Popup (uses scroll-observer, 1-second grace period)
- [x] Implement manual trigger in Popup (button click)
- [x] Implement component-complete trigger in Popup (watches store via $derived)
- [x] Build popup state machine in `popup.svelte.ts`
- [x] Add trigger deduplication (module-level Set)
- [x] Add multi-slot concurrent popup support (`SvelteMap<string, PopupEntry>`, `MAX_CONCURRENT = 10`)
- [x] Implement `mode="inline"` — expand in-place
- [x] Implement `mode="modal"` — native `<dialog>` + `showModal()`
- [x] Implement `mode="slide-in"` — side panel, non-blocking
- [x] Handle `prefers-reduced-motion` — bypass animation states
- [x] Add keyboard navigation (Tab, Enter, Escape)
- [x] Implement SM-2 algorithm in `src/lib/sm2.ts`
- [x] Build `progress.svelte.ts` (load from localStorage at module top-level)
- [x] Build `persistence.ts` (Zod validation, debounced auto-save, import atomicity)
- [x] Add `beforeunload` flush handler for pending auto-save writes
- [x] Ensure import clears pending `saveTimeout` before setting `importInProgress`
- [x] Wire quiz results → scoring policy → SM-2 → progressState
- [x] Handle localStorage unavailability (in-memory fallback + warning)
- [x] Build inline review: due quizzes re-appear at original location, capped at 5-7
- [x] Build `ProgressBar.svelte` + `ProgressBar.params.ts` (segmented, color-coded, clickable)
- [x] Build `ExportImport.svelte` (download JSON / upload + validate + replace)
- [x] Add quiz and review components to the sample lesson
- [x] Unit tests for `sm2.ts`
- [x] Unit tests for `persistence.ts` (Zod validation, schema migration)

**Success criteria:** Student answers quizzes in all three popup modes, SM-2 schedules reviews, due quizzes re-appear inline on next visit, progress persists across reloads, export/import works, popup state machine handles transitions cleanly.

**Files:**
- `src/components/Popup.svelte`, `Popup.params.ts`
- `src/components/Quiz.svelte`, `Quiz.params.ts`
- `src/components/QuizPopup.svelte`
- `src/components/Hint.svelte`
- `src/components/ProgressBar.svelte`, `ProgressBar.params.ts`
- `src/components/ExportImport.svelte`
- `src/lib/state/popup.svelte.ts`
- `src/lib/state/progress.svelte.ts`
- `src/lib/sm2.ts`
- `src/lib/persistence.ts`
- `src/lib/scroll-observer.ts`
- `src/lib/types.ts` (updated)
- `src/pages/index.astro` (updated)

### Phase 3: Polish, Dark Mode, Accessibility Audit

**Goal:** Visual polish, final accessibility pass, deploy.

**Tasks:**
- [ ] Add connection-line SVG affordance between ProseHighlight and linked component
- [ ] Add text crossfade transitions on ProseReactive updates
- [ ] Add CSS skeleton placeholders shaped to each component type
- [ ] Add `<noscript>` fallback message
- [ ] Final accessibility audit (focus management, ARIA, keyboard navigation across all popup modes)
- [ ] Add dark mode as first-class theme
- [ ] Add non-blocking review banner on return visits
- [ ] Create complete sample lesson demonstrating all features
- [ ] ~~Integration test: two islands sharing state across mixed hydration directives~~ *(moved to Phase 1)*
- [ ] Deploy to GitHub Pages and verify end-to-end
- [ ] Post-build production safety verification in CI

**Success criteria:** Fully functional learning page, accessible, visually polished, dark mode, deployed.

**Files:**
- `src/components/ProseHighlight.svelte` (updated — connection line)
- `src/components/ProseReactive.svelte` (updated — text transitions)
- `src/layouts/Base.astro` (updated — dark mode, noscript)
- `src/pages/index.astro` (final lesson)

## Alternative Approaches Considered

1. **Central DebugPanel sidebar** — One panel listing all components. Rejected in favor of per-component floating panels (simpler, more contextual, no global state). (see brainstorm: Conflict 1)
2. **Central reactive override store** — Namespaced keys like `"ProseHighlight.underlineThickness"`. Rejected — per-component local state is simpler. (see brainstorm: Conflict 6)
3. **`import.meta.glob` auto-discovery** — Elegant but unnecessary when each component imports its own sidecar. (see brainstorm: Conflict 1)
4. **Event Bus Architecture** — More decoupled but loses type safety, harder to debug.
5. **Single Svelte App Island** — Simplest reactivity but loses Astro's partial hydration benefits.
6. **Nano Stores** — Unnecessary for a pure Svelte project.
7. **MDX authoring** — Rejected in favor of `.astro` files for maximum layout control.
8. **Top-of-page ReviewSession** — Rejected. Inline review at section breaks is simpler and better for retention.
9. **Tailwind v4 `@theme` for design tokens** — Creates split write-back and Tailwind coupling. CSS custom properties on `:root` are simpler. (see brainstorm: Conflict 11)
10. **Central design-tokens.ts** — Single file for all tunables. Loses colocation for component params.
11. **Svelte action (`use:tunable`)** — Actions can't render child components (gear icon, panel) without portals. Wrapper component is simpler. (see brainstorm: Open Question 2)

## Acceptance Criteria

### Functional Requirements

- [ ] Single page renders prose and interactive Svelte components
- [ ] Prose updates reactively when component state changes
- [ ] Clicking highlighted prose activates component state
- [ ] Component interaction highlights linked prose text
- [ ] Quiz popups appear via scroll, manual, and component-completion triggers
- [ ] All three popup modes work: inline, modal, slide-in
- [ ] Quiz answers tracked with SM-2 algorithm
- [ ] Due review quizzes re-appear inline at original location
- [ ] Progress persists in localStorage across page reloads
- [ ] Export/import progress as JSON
- [ ] Site deploys to GitHub Pages via GitHub Actions

### Tuning System Requirements

- [ ] Each tunable component has a colocated `.params.ts` sidecar file
- [ ] Per-component gear icon appears in dev mode, opens persistent floating panel
- [ ] Dragging a slider updates CSS params in real-time (before commit)
- [ ] JS behavioral params update after commit via HMR cycle
- [ ] Clicking "commit" writes tuned values back to `.params.ts` on disk
- [ ] Vite HMR reloads the component after write-back
- [ ] GlobalParamPanel tunes site-wide design tokens via CSS custom properties
- [ ] `astro build` produces zero bytes of tuning system code
- [ ] Write-back endpoint rejects paths outside project root and non-`.params.ts` files
- [ ] Commit button disabled while write is in-flight

### Non-Functional Requirements

- [ ] Page loads with readable prose before JavaScript hydrates
- [ ] All interactive components are keyboard-navigable
- [ ] Reactive prose uses `aria-live` for screen reader announcements
- [ ] Modal popups use native `<dialog>` with `showModal()`
- [ ] `prefers-reduced-motion` respected
- [ ] `<noscript>` fallback present
- [ ] localStorage schema versioned from v1
- [ ] All untrusted data passes through Zod v4 validation
- [ ] No `{@html}` or `set:html` with runtime data
- [ ] Unit tests for SM-2 algorithm and persistence
- [x] Integration test for cross-island state sharing

## Dependencies & Prerequisites

- **Astro 6** — framework
- **Svelte 5** — component framework (runes required)
- **@astrojs/svelte** — Astro integration
- **Tailwind CSS v4** — styling (via `@tailwindcss/vite`)
- **Zod v4** — runtime schema validation (v4 breaking changes: `z.record()` requires two args, `z.literal()` accepts arrays)
- **supermemo** (optional) — SM-2 implementation, or implement manually
- **@fontsource-variable/literata** — body prose font
- **@fontsource-variable/dm-sans** — UI font
- **@fontsource/jetbrains-mono** — code font (400 weight)
- **GitHub Pages** — hosting
- **GitHub Actions** — CI/CD (`withastro/action@<sha>`, SHA-pinned)

No backend, database, or external services required.

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Cross-island store sharing breaks | Low (validated) | Critical | Phase 1 validates + integration test + ADR |
| Vite module dedup changes in future Astro | Low | High | ADR, integration test as canary |
| Import vs auto-save race condition | Medium | High | Single-writer pattern, suspend effect during import |
| `prefers-reduced-motion` breaks popup state machine | Medium | High | Bypass animation states entirely |
| Dev tooling leaks to production | Low | Medium | `import.meta.env.DEV` gate + post-build grep verification |
| Hydration timing causes flickering | Medium | Low | Tiered hydration + CSS skeleton placeholders |
| localStorage unavailable | Medium | Medium | In-memory fallback + warning banner |
| SM-2 parameters don't feel right | Medium | Low | 2-button model, easy to tune |
| Popup overwhelm on fast scroll | Medium | Low | `MAX_CONCURRENT = 10` + trigger deduplication |
| New `.params.ts` not discovered without reload | Expected | Low | Vite limitation; document behavior |
| Write-back endpoint path traversal | Low | High | 8-point security hardening (see table above) |

## Testing Strategy

| Level | Target | Phase |
|-------|--------|-------|
| Unit tests | `sm2.ts` — pure function | Phase 2 |
| Unit tests | `persistence.ts` — Zod validation, schema handling | Phase 2 |
| Integration test | Cross-island state sharing (two islands see same `$state` object) | Phase 1 |
| Integration test | Tuning system write-back + HMR cycle | Phase 1 |
| CI check | Post-build grep for dev tooling leakage | Phase 1 |
| Manual verification | Popup state machine transitions, keyboard navigation | Phase 2 |
| Manual verification | Export/import roundtrip, localStorage unavailability | Phase 2 |
| Manual verification | Per-component tuning panels, global token panel | Phase 1 |

## Research Insights

Findings from 8 parallel review/research agents, organized by plan section. Each finding includes severity, the originating agent, and a concrete recommendation.

### Cross-Island State Sharing

**Move integration test to Phase 1** (Architecture Strategist)
The integration test asserting two islands share the same `$state` object is currently in Phase 3 (line 1029) but should be Phase 1 — it validates the project's most critical assumption. The test should verify *reactive propagation* (a mutation in a `client:load` island is visible to a later `client:visible` island), not just object identity (`===`).

**Document transient state limitation in ADR** (Frontend Races Reviewer)
Late-hydrating `client:visible` islands see the *current* store value but miss intermediate state changes. If `activeHighlight` went `null → "red" → "blue"` before the island hydrated, it only sees `"blue"`. This is fine for v1's current-value semantics, but the ADR should state: "Do not use store mutations for one-shot events unless all consumers are guaranteed to be mounted."

**Version-bump protocol** (Architecture Strategist)
The ADR should specify that major version bumps of `astro`, `@astrojs/svelte`, or `vite` require re-running the integration test before merging. Add to `CLAUDE.md` as a project convention.

**Svelte 5 constraint: cannot export reassigned `$state`** (Framework Docs Researcher)
`.svelte.ts` files must export `$state` as objects and mutate properties — you cannot export a reassignable `$state` primitive. The plan already states this (line 109), confirmed by framework docs. The class-based alternative (`class LessonState { step = $state(0); }`) is available if needed.

**Below-fold instances should use `client:visible`** (Performance Oracle)
The hydration tier table specifies `client:load` for ProseHighlight/ProseReactive but qualifies it as "above fold." Explicitly add: below-fold instances of these components use `client:visible`. For a long lesson with 20+ ProseHighlight islands, hydrating all on load wastes resources.

### Design Tuning System

**Extract `createParamAccessor` factory** (Pattern Recognition, Architecture Strategist, TypeScript Reviewer)
The `p()` helper function (~8 lines with overloads) is duplicated in every tunable component. Extract to `param-types.ts`:

```typescript
// src/lib/dev/param-types.ts
export function createParamAccessor(params: ParamDef[]) {
  function p(key: string, type: 'number', overrides?: Record<string, number | string | boolean>): number;
  function p(key: string, type: 'color', overrides?: Record<string, number | string | boolean>): string;
  function p(key: string, type: 'boolean', overrides?: Record<string, number | string | boolean>): boolean;
  function p(key: string, type: ParamDef['type'], overrides?: Record<string, number | string | boolean>) {
    if (overrides?.[key] !== undefined) return overrides[key];
    return getParamValue(params, key, type);
  }
  return p;
}
```

Components then: `const p = createParamAccessor(params);` — one line instead of eight.

**~~BUG: Snippet `children` name collision~~ RESOLVED** (TypeScript Reviewer, Architecture Strategist)
Fixed by aliasing the `children` prop to `slotContent`: `let { children: slotContent, id } = $props()`. Inside the Tunable snippet, render `{@render slotContent()}`. The `content` name suggested in the original review was not used — `slotContent` better communicates the Astro slot origin.

**Additional discovery:** Svelte snippet syntax (`{#snippet}`) is not valid in `.astro` files at all. Astro's slot mechanism (content between component tags) automatically maps to the `children` snippet in Svelte 5.

**~~Top-level `await import()` blocks component render~~ RESOLVED** (Frontend Races Reviewer, Pattern Recognition)
This is actually a **compiler error** in Svelte 5, not just a performance issue. Svelte 5 forbids top-level `await` without `experimental.async`. Fixed by creating `src/lib/dev/lazy.ts` — a shared module holding the dynamic import promise, resolved via `onMount` in each component:

```typescript
// src/lib/dev/lazy.ts
export const tunablePromise = import.meta.env.DEV
  ? import('./Tunable.svelte').then((m) => m.default).catch(() => null as never)
  : null;
```

```svelte
<!-- In each component -->
let TunableComponent = $state<any>(null);
onMount(() => { tunablePromise?.then((c) => { TunableComponent = c; }); });
```

**Add `tier` indicator to ParamDef** (Architecture Strategist)
CSS params update instantly; JS behavioral params require commit + HMR. The panel should visually distinguish these. Add `tier?: 'css' | 'js'` to `ParamBase` (default `'css'`). `ParamInput` renders a "applies after commit" label for `tier: 'js'` params.

**Z-index strategy for multiple panels** (Architecture Strategist)
Multiple floating panels open simultaneously will overlap. Define: last-opened panel gets highest z-index (bring-to-front on click), managed by a lightweight dev-only counter.

**HMR resets panel state** (Architecture Strategist)
After committing a JS param, HMR re-mounts the component, closing the gear panel and resetting overrides. Consider persisting "panel open" state in `sessionStorage` keyed by component ID and restoring after `import.meta.hot.on('vite:afterUpdate', ...)`.

### ParamDef Type

**`ParamValueMap` is redundant** (TypeScript Reviewer)
The separate `ParamValueMap` type duplicates knowledge from the union. Derive it instead:

```typescript
type ExtractParamValue<T extends ParamDef['type']> =
  Extract<ParamDef, { type: T }>['value'];
```

Adding a new param type then only requires updating the union, not two places.

**`generateParamsFileContent` silently drops unknown fields** (TypeScript Reviewer)
If a field is added to `ParamBase` but not to `FIELD_ORDER`, it disappears from the written file. Consider building `FIELD_ORDER` from the type, or adding a runtime check that all defined fields are in the list.

### Write-Back Endpoint

**CSRF: deny when Origin is absent** (Security Sentinel — MEDIUM)
The `if (origin)` guard allows requests through when both `origin` and `referer` headers are missing. Cross-origin attackers can sometimes craft requests that omit both. Invert the logic:

```typescript
if (!origin) {
  res.statusCode = 403;
  res.end(JSON.stringify({ error: 'Missing origin' }));
  return;
}
```

**TOCTOU between path traversal and symlink check** (Security Sentinel — MEDIUM)
`path.resolve()` runs before `realpath()`. A symlink swap between the two checks can escape the project root. Fix: run `realpath` first on the fully resolved path, then do `startsWith` against the real root. Decide whether the endpoint only overwrites existing files or also creates new ones (affects `realpath` behavior on non-existent paths).

**Add Zod validation on request body** (Security Sentinel — LOW-MEDIUM)

```typescript
const RequestSchema = z.object({
  filePath: z.string().endsWith('.params.ts'),
  params: z.array(ParamDefSchema).max(100),
});
```

This also subsumes the separate `.params.ts` extension check.

**Body size limit races with `end` event** (Frontend Races Reviewer)
When `bodySize > MAX_BODY`, the handler calls `res.end()` and `req.destroy()`, but the `end` event handler may still fire with a partial body. Add `if (res.writableEnded) return;` at the top of the `end` handler.

**`catch (e: any)` → `catch (e: unknown)`** (TypeScript Reviewer)
Use `unknown` and narrow: `const message = e instanceof Error ? e.message : String(e);`

**Inconsistent `Content-Type` headers on error responses** (TypeScript Reviewer)
The 403, 405, and 413 error paths return JSON without setting `Content-Type: application/json`. The success path sets it. Make consistent.

### Global Design Tokens

**Production path is missing** (Architecture Strategist — architectural gap)
`GlobalParamPanel` is dev-only. In production, committed values in `design-tokens.params.ts` never reach `:root`. Fix: `Base.astro` imports `design-tokens.params.ts` at build time and renders an inline `<style>:root { ... }</style>` block:

```astro
---
import tokens from '../lib/design-tokens.params';
const cssVars = tokens.map(t => `--${t.key}: ${t.value}${t.unit ?? ''}`).join('; ');
---
<style set:html={`:root { ${cssVars} }`}></style>
```

This is the cleanest approach since `.astro` files execute at build time and can import TS.

**Dark mode interaction** (Architecture Strategist)
Inline styles from `setProperty()` override media-query dark mode rules. Phase 3's dark mode must use class-based toggle (`@variant dark (&:where(.dark, .dark *))` in Tailwind v4) rather than `prefers-color-scheme`, or the GlobalParamPanel must set tokens on a theme-specific selector.

### CSP Policy

**Harden CSP** (Security Sentinel — MEDIUM)
Add missing directives. Updated recommendation:

```
default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'
```

`script-src 'unsafe-inline'` is required by Astro/Svelte hydration. `'unsafe-eval'` is required because Zod v4 uses `new Function()` internally, which Brave blocks without it (see `docs/solutions/003-csp-blocks-zod-new-function-brave.md`). The `{@html}` prohibition is the primary XSS defense; CSP is defense-in-depth.

### Quiz & Popup System

**~~Define composite `PopupState` type~~ RESOLVED** (Architecture Strategist)

Implemented as multi-slot concurrent architecture using `SvelteMap<string, PopupEntry>`:

```typescript
interface PopupEntry {
  request: PopupRequest;
  phase: PopupPhase;
}
// popupState.active: SvelteMap<string, PopupEntry>
// Each popup has independent lifecycle; MAX_CONCURRENT = 10
```

Queue-based single-popup model was replaced with concurrent map. Each popup identified by `id` parameter.

**`transitionend` safety timeout** (Frontend Races Reviewer — HIGH, Architecture Strategist)
Three failure modes: (1) transition never starts (element hidden), (2) `prefers-reduced-motion` partially applied, (3) multiple `transitionend` events from multi-property transitions. Fixes:
- Add `setTimeout(forceAdvance, duration + 100)` as a fallback.
- Filter `event.propertyName` to act on one specific property (e.g., `opacity`).
- For `prefers-reduced-motion`, skip directly `idle → active → idle` synchronously — do not apply transition classes at all.

**~~IntersectionObserver grace period not in code~~ RESOLVED** (Frontend Races Reviewer — MEDIUM)
Implemented in `scroll-observer.ts` with a 1-second grace period timer. The observer stores timers in a `Map<Element, ReturnType<typeof setTimeout>>` and the cleanup function cancels pending timers. Threshold changed from `0.3` to `0` for zero-height container compatibility (see `docs/solutions/002-intersection-observer-zero-height-elements.md`).

**~~Quiz wiring layer~~ RESOLVED** (Architecture Strategist)
`QuizPopup.svelte` is the composition controller that wires Quiz's `onresult` callback to `progress.svelte.ts`. This is neither at the page level nor inside Popup — QuizPopup manages answered state, quiz mode (`'answer'`/`'review'`), focus management, and screen reader announcements. Quiz remains pure (no store imports); Popup remains uninvolved in scoring.

### Persistence & Auto-Save

**Import must clear pending auto-save timeout** (Frontend Races Reviewer — HIGH)
If a debounced write is pending when import starts, it fires 500ms later with stale pre-import data, silently clobbering the import. Fix:

```typescript
function beginImport() {
  clearTimeout(saveTimeout); // kill pending stale write
  persistenceMeta.importInProgress = true;
}
```

**Move `JSON.stringify` inside `setTimeout`** (Performance Oracle — CRITICAL)
The `$effect` runs `JSON.stringify(progressState)` on every reactive mutation (because `JSON.stringify` traverses the full object, subscribing to all properties). The serialization should only happen when the debounce fires:

```typescript
$effect(() => {
  if (persistenceMeta.importInProgress) return;
  void progressState.cards; // cheap subscription
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const snapshot = JSON.stringify(progressState);
    localStorage.setItem('crowcoder-progress', snapshot);
  }, 500);
});
```

**~~`beforeunload` flush~~ RESOLVED** (Frontend Races Reviewer)
Implemented in `persistence.ts`. If the user closes the tab during the 500ms debounce, the flush handler saves immediately:

```typescript
window.addEventListener('beforeunload', () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    localStorage.setItem('crowcoder-progress', JSON.stringify(progressState));
  }
});
```

**`saveTimeout` must be module-scoped** (Frontend Races Reviewer)
Clarify: `let saveTimeout: ReturnType<typeof setTimeout>` at module scope, outside both `$effect.root` and `$effect`. If declared inside the `$effect`, each invocation creates a new variable and previous timeouts are never cleared.

**Use `z.infer` for single source of truth** (TypeScript Reviewer — HIGH)
`CardData` and `ProgressData` are defined as both TypeScript interfaces and Zod schemas. These will drift. Use:

```typescript
const CardDataSchema = z.object({ /* ... */ });
type CardData = z.infer<typeof CardDataSchema>;
```

Delete the manually written interfaces.

**`ISODateString` needs a parse path** (TypeScript Reviewer — HIGH)
After Zod validation, raw strings are `string`, not `ISODateString`. Either add `parseISODateString(raw: string): ISODateString` or use `.transform()` in the Zod schema so validated output is already branded:

```typescript
const ISODateStringSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}T/)
  .transform((s) => s as ISODateString);
```

**`exportedAt` missing format validation** (TypeScript Reviewer)
The field is `z.string().optional()` but should validate the ISO format (add the regex) and ideally transform to the branded type.

**`file.size` check before JSON import** (Security Sentinel)
Cap at 5MB before calling `FileReader` to prevent tab crash on malformed files:

```typescript
if (file.size > 5 * 1024 * 1024) {
  showError('File too large (max 5MB)');
  return;
}
```

### Font Loading & Performance

**Font loading strategy conflict** (Performance Oracle — CRITICAL)
`font-display: optional` on DM Sans + `<link rel="preload">` is contradictory. `optional` gives ~100ms to load; if it misses, the font never renders for the session (no full navigations in a SPA). On slow connections, DM Sans silently disappears.

Revised strategy:
1. Change DM Sans to `font-display: swap`
2. Only preload Literata (body font, dominates the page)
3. Add `size-adjust` fallback descriptors for all three fonts (Georgia ~97% for Literata, Arial ~100% for DM Sans, Courier New ~110% for JetBrains Mono)
4. Investigate Fontsource Latin-only subsets (can cut 40-60% per file)

**Estimated bundle** (Performance Oracle):
| Dependency | Gzipped |
|---|---|
| Svelte 5 runtime | ~22KB |
| Zod v4 | ~10KB |
| Application code | ~15-25KB |
| Tailwind v4 (used classes) | ~5-10KB |
| **Total JS** | **~53-68KB** |
| Fonts (3 WOFF2) | **~200-270KB** |

Fonts dominate transfer size, reinforcing the subsetting recommendation.

### Framework Version Constraints

**Zod v4 breaking changes** (Framework Docs Researcher):
- `z.record()` requires two args: `z.record(z.string(), valueSchema)`
- Enum records are exhaustive by default (use `z.partialRecord()` for optional)
- `z.literal([0,1,2,3,4,5])` array form confirmed in v4
- Consider `z.mini` for smaller client-side bundle

**Tailwind v4** (Framework Docs Researcher):
- No `tailwind.config.js` — all config in CSS via `@theme` directive
- Class-based dark mode: `@variant dark (&:where(.dark, .dark *));`
- Theme values exposed as CSS custom properties natively

**Svelte 5** (Framework Docs Researcher):
- `SvelteSet`/`SvelteMap` values are NOT deeply reactive — only add/delete/clear
- `$effect.root()` does NOT auto-cleanup — returns a `destroy` function
- Hydration order: `client:load` islands hydrate in DOM order

**Astro 6** (Framework Docs Researcher):
- CSP is experimental; GitHub Pages only supports `<meta>` tag CSP
- `import.meta.env.BASE_URL` for base path at runtime (required if repo name differs from username.github.io)
- `astro:server:setup` only runs in dev mode, not during build or preview

### Production Safety

**Post-build grep must be a blocking CI gate** (Security Sentinel)
The plan mentions the grep check but does not specify failure behavior. The GitHub Actions workflow must `exit 1` on match, not just warn. Add to acceptance criteria.

**Pin ALL GitHub Actions to full SHAs** (Security Sentinel)
Not just `withastro/action` — also `actions/checkout`, `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`. Add version tag comments for readability.

## Sources & References

### Origin

- **Integration brainstorm:** [docs/brainstorms/2026-03-11-plan-integration-brainstorm.md](docs/brainstorms/2026-03-11-plan-integration-brainstorm.md) — Key decisions: per-component debug panels, global design tokens via CSS custom properties, minimal-ceremony DX, central override store eliminated, Phase 1 combined.
- **Interactive learning website brainstorm:** [docs/brainstorms/2026-03-11-interactive-learning-site-brainstorm.md](docs/brainstorms/2026-03-11-interactive-learning-site-brainstorm.md)
- **Design tuning system brainstorm:** [docs/brainstorms/2026-03-11-dev-design-tuning-system-brainstorm.md](docs/brainstorms/2026-03-11-dev-design-tuning-system-brainstorm.md)

### Superseded Plans

This plan supersedes:
- [docs/plans/2026-03-11-feat-interactive-learning-website-plan.md](docs/plans/2026-03-11-feat-interactive-learning-website-plan.md)
- [docs/plans/2026-03-11-feat-dev-design-tuning-system-plan.md](docs/plans/2026-03-11-feat-dev-design-tuning-system-plan.md)

### External References

- [Astro Islands Architecture](https://docs.astro.build/en/concepts/islands/)
- [Astro: Share State Between Islands](https://docs.astro.build/en/recipes/sharing-state-islands/)
- [Astro GitHub Pages Deployment](https://docs.astro.build/en/guides/deploy/github/)
- [Astro Integrations Reference — `astro:server:setup`](https://docs.astro.build/en/reference/integrations-reference/)
- [Vite Plugin API — `configureServer`](https://vite.dev/guide/api-plugin)
- [Vite Features — Glob Import](https://vite.dev/guide/features)
- [Vite HMR API](https://vite.dev/guide/api-hmr)
- [Svelte 5 $state Rune](https://svelte.dev/docs/svelte/$state)
- [Svelte 5 .svelte.ts Files](https://svelte.dev/docs/svelte/svelte-js-files)
- [Tailwind CSS v4 Astro Installation](https://tailwindcss.com/docs/installation/framework-guides/astro)
- [SM-2 Algorithm (supermemo npm)](https://github.com/VienDinhCom/supermemo)
- [Mnemonic Medium — Andy Matuschak](https://notes.andymatuschak.org/Mnemonic_medium)
- [W3C WAI-ARIA APG: Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [MDN: The `<dialog>` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)
- [MDN: ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)
- [Tweakpane — Compact GUI for fine-tuning parameters](https://tweakpane.github.io/docs/)
