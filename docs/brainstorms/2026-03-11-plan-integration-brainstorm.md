# Brainstorm: Integrating the Two CrowCoder Plans

**Date:** 2026-03-11

**Input documents:**
- [Interactive Learning Website Plan](../plans/2026-03-11-feat-interactive-learning-website-plan.md) (main plan)
- [Dev-Time Design Tuning System Plan](../plans/2026-03-11-feat-dev-design-tuning-system-plan.md) (tuning plan)

## What We're Building

A single unified implementation plan for CrowCoder that merges the interactive learning website with the dev-time design tuning system. The two plans were written independently and need conflict resolution before execution.

## Conflicts Identified

### 1. DebugPanel Architecture: Central Sidebar vs Per-Component Panels

**Tuning plan says:** One central `DebugPanel.svelte` sidebar that auto-discovers all `.params.ts` files via `import.meta.glob` and lists every component's controls in a single panel.

**Decision:** Per-component mini debug panels rendered near each component instance, plus a separate global panel for site-wide design tokens. Each component renders its own controls and has its own commit button.

**Impact on tuning plan:**
- `import.meta.glob` auto-discovery is no longer needed — each component imports its own `.params.ts` directly
- The central `DebugPanel.svelte` is replaced by a smaller, reusable `ParamPanel.svelte` that any component can mount
- The commit state machine moves from a central map (`Record<string, 'idle' | 'committing'>`) to per-panel local state (simpler)
- `Base.astro`'s conditional DebugPanel mount changes — instead of one global panel, each component conditionally renders its own ParamPanel in dev mode
- A separate `GlobalParamPanel` handles site-wide design tokens (column widths, vertical rhythm, accent colors)

**Architectural simplification:** Per-component panels eliminate the need for the reactive override store's component-namespaced keys (`"ComponentName.paramKey"`). Each panel only manages its own component's overrides. The store can be simpler or even replaced by component-local `$state`.

### 2. Component Inventory Mismatch

**Main plan lists:** ProseReactive, ProseHighlight, Popup, Quiz, Hint, ProgressBar, ExportImport, ColorPicker (8 components)

**Tuning plan lists `.params.ts` for:** ProseHighlight, ProseReactive, Popup, Quiz, ColorPicker, ProgressBar (6 components, missing Hint and ExportImport)

**Reconciled inventory — every interactive component gets a `.params.ts` if it has visual/behavioral parameters worth tuning:**

| Component | Gets `.params.ts`? | Example params |
|-----------|-------------------|----------------|
| ProseHighlight | Yes | underline thickness, pulse color, pulse duration, hand-drawn path roughness |
| ProseReactive | Yes | crossfade duration, translateY distance, opacity transition |
| ColorPicker | Yes | wheel size, handle radius, selection ring width |
| Popup | Yes | enter/exit duration, grace period (scroll trigger), max queue depth, backdrop opacity |
| Quiz | Yes | card border radius, card background, feedback display duration |
| ProgressBar | Yes | segment colors (unseen/due/mastered), border radius, spacing |
| Hint | Maybe | If it has distinct styling beyond what Popup provides. Likely just inherits Popup's params. Flag during implementation. |
| ExportImport | No | Purely functional UI (file picker, buttons). No tunable visual parameters. |

**ColorPicker.params.ts was missing from the tuning plan** — added above (wheel size, handle radius, selection ring width).

### 3. Global Design Tokens

**Neither plan addressed this.** The main plan hardcodes design values throughout:
- Prose column max-width: 680px
- Component breakout width: 960px
- Vertical rhythm: 1.5rem paragraphs, 4rem around interactive components, 3rem around quizzes, 0.75rem below headings
- Accent color (not yet specified)
- Background color: `#faf8f5` warm ivory
- Quiz card styling (border, background texture)

**Decision:** Create a `design-tokens.params.ts` in `src/lib/` for site-wide values. A `GlobalParamPanel` component renders these controls, mounted once in `Base.astro` (dev-only).

### 4. Base.astro Conflict

**Main plan:** `Base.astro` handles HTML shell, CSP meta tag, global.css import, responsive columns, noscript fallback.

**Tuning plan:** `Base.astro` conditionally mounts a single `DebugPanel` via dynamic import with `client:idle`.

**Resolution:** `Base.astro` conditionally mounts only the `GlobalParamPanel` (for site-wide tokens). Per-component panels are mounted by each component internally, not by the layout. This keeps `Base.astro` clean — it doesn't need to know about individual components' tuning needs.

### 5. astro.config.mjs — No Conflict

No conflict. Add `paramsWriterIntegration()` to the integrations array alongside Svelte and Tailwind. The `astro:server:setup` hook is inherently dev-only.

### 6. Reactive Override Store Simplification

**Tuning plan:** Central `param-store.svelte.ts` with component-namespaced keys (`"ProseHighlight.underlineThickness"`). Every component must know its own name to query the store.

**With per-component panels:** Each component can use local `$state` for overrides since the panel and component are co-located. The central store becomes unnecessary.

**However:** The write-back endpoint still needs to work. The `ParamPanel` needs to POST to `/__params/write` with the file path and updated params. This is unchanged — the endpoint doesn't care about the override store architecture.

**Decision:** Replace the central override store with a simpler pattern:
- `ParamPanel.svelte` receives the component's params array and manages a local `$state` copy
- It exposes current values via a callback prop (`onchange`) that the parent component reads
- On commit, it POSTs to the write-back endpoint
- No global override store needed

### 7. Phase Structure

**Main plan phases:**
1. Setup + Core Content System (scaffold, fonts, stores, ProseHighlight, ProseReactive, ColorPicker, GitHub Pages)
2. Quiz System + SM-2 + Persistence (Popup, Quiz, Hint, ProgressBar, ExportImport, SM-2, localStorage)
3. Polish (connection lines, transitions, dark mode, accessibility audit)

**Tuning plan:** "Built during Phase 1" — infrastructure first, sidecar files alongside each component.

**Decision:** Keep combined. The tuning infra is ~4 files (param-types, ParamPanel, ParamInput, params-writer integration) — small enough to absorb. The tuning system is most valuable *while building* components, so every component benefits from day one.

### 8. File Organization

Both plans agree on:
- Dev tooling in `src/lib/dev/`
- Integrations in `src/integrations/`
- Components flat in `src/components/`

**Addition:** `src/lib/design-tokens.params.ts` for site-wide tunable values. The `GlobalParamPanel` lives in `src/lib/dev/`.

### 9. ParamDef Type — Coverage for All Components

The tuning plan defines 3 types: `number`, `color`, `boolean`. These cover the identified params across all components:

- Number: thicknesses, durations, distances, sizes, queue depths, thresholds
- Color: accent colors, segment colors, backgrounds
- Boolean: (none identified yet, but available for toggles like "show connection lines")

No additional types needed.

### 10. Developer Experience: Minimal-Ceremony Integration

**Question:** When a developer adds a new component, how much do they need to know about the tuning system?

**Decision:** Minimal ceremony. The developer's workflow is:
1. Create `MyComponent.params.ts` with a params array
2. Use a single integration point (wrapper component or Svelte action) in `MyComponent.svelte`
3. The integration point automatically handles: dev-mode gating, gear icon, floating panel, reactive overrides, commit button

Developers never directly touch `ParamPanel`, `ParamInput`, or the write-back endpoint. The tuning system is opt-in (no `.params.ts` = no gear icon) and invisible in production.

### 11. Global Design Token Flow

**Decision:** CSS custom properties on `:root`. The GlobalParamPanel sets `--prose-max-width`, `--accent-color`, etc. via `document.documentElement.style.setProperty()`. Components consume them via `var(--prose-max-width)` in CSS. Changes propagate instantly to all components via the cascade with zero per-component boilerplate.

If a JS-only global token is ever needed (unlikely — all identified globals are CSS values), add a direct import path for that specific case.

### 12. Write-Back Endpoint — No Changes Needed

Endpoint unchanged. Per-component panels simplify the client side (local `idle`/`committing` state replaces central state machine), but the server receives the same `{ filePath, params }` payload. All security hardening carries forward.

## What Gets Dropped from the Tuning Plan

These tuning plan artifacts are **superseded** by the per-component architecture and should not carry forward into the merged plan:

- **`DebugPanel.svelte`** (central sidebar) — replaced by per-component `ParamPanel.svelte` + `GlobalParamPanel`
- **`param-store.svelte.ts`** (central override store with namespaced keys) — replaced by component-local `$state`
- **`import.meta.glob` auto-discovery** — each component imports its own `.params.ts` directly
- **Central commit state machine** (`Record<string, 'idle' | 'committing'>`) — replaced by per-panel local state
- **`structuredClone` discussion** — irrelevant without the central panel pattern
- **Component consumption pattern** (tuning plan's `getOverride('ProseHighlight', key)`) — replaced by the minimal-ceremony integration point

**Retained from tuning plan:** ParamDef discriminated union type, ParamInput component, `paramsWriterIntegration()` endpoint (with all security hardening), `import.meta.env.DEV` gating strategy, two-tier update model (CSS instant / JS via HMR), `.params.ts` sidecar convention.

## Key Decisions

1. **Per-component debug panels** — floating gear icon, persistent panel, per-component commit. Replaces central sidebar.
2. **Global design tokens** — `design-tokens.params.ts` in `src/lib/`, rendered by `GlobalParamPanel` in fixed bottom-right corner, flowing via CSS custom properties on `:root`.
3. **Minimal-ceremony DX** — one integration point per component (wrapper or action), tuning is opt-in and invisible in production.
4. **Central override store eliminated** — per-component panels use local state + callback props.
5. **Phase 1 keeps tuning infrastructure** — ~4 core files, every component benefits from day one.
6. **Component inventory reconciled** — all components get `.params.ts` except ExportImport; ColorPicker added; Hint deferred.
7. **Output: one merged plan** replacing both existing plans.

## Open Questions

1. **Hint.params.ts:** Does Hint have distinct tunable styling, or does it purely inherit from Popup's presentation? Decide during implementation.
2. **Integration point API shape:** Wrapper component (`<Tunable>`) vs Svelte action (`use:tunable`). Wrapper is cleaner for rendering the gear icon; action avoids extra DOM. Decide during planning.

## Implementation Discoveries (2026-03-12)

During Phase 1 implementation, three Astro-Svelte integration issues were discovered that the original brainstorm and plan didn't anticipate. All three are now resolved and documented here for future reference.

### Discovery 1: Svelte snippet syntax is not valid in `.astro` files

**Problem:** The plan's code samples showed Svelte 5 `{#snippet}` syntax used directly in `.astro` templates (e.g., passing a snippet prop from `index.astro` to a Svelte component). Astro's template parser doesn't understand Svelte syntax — it only knows HTML + Astro expressions.

**Fix:** Use Astro's native slot mechanism instead. Content placed between component tags in `.astro` files automatically maps to the `children` snippet prop in Svelte 5 components. No explicit `{#snippet}` needed on the Astro side.

```astro
<!-- ✅ Correct — Astro slot syntax -->
<ProseHighlight client:load id="color-main">
  selecting a color on the wheel below
</ProseHighlight>

<!-- ❌ Wrong — Svelte snippet syntax in .astro file -->
<ProseHighlight client:load id="color-main">
  {#snippet content()}selecting a color{/snippet}
</ProseHighlight>
```

**Impact on brainstorm:** Conflict #10 (Developer Experience) described the `<Tunable>` wrapper pattern but didn't address how Astro passes content to Svelte components. The slot-to-children mapping is the bridge between the two frameworks.

### Discovery 2: `children` snippet name collision with Tunable

**Problem:** When Astro passes slot content to a Svelte 5 component, it arrives as a `children` prop. But inside the component, `<Tunable>` expects its own content via `{#snippet children(overrides)}`. The inner snippet declaration shadows the outer `children` prop, causing either infinite recursion or silent failure.

**Fix:** Alias the component's `children` prop to `slotContent` in the destructuring:

```svelte
let { children: slotContent, id } = $props();
<!-- Inside Tunable's snippet: -->
{@render slotContent()}
```

The plan's Enhancement Summary (item 1) identified this bug but recommended renaming to `content`. The actual fix uses `slotContent` because `content` could conflict with other common prop names, and `slotContent` clearly communicates the Astro origin.

**Impact on brainstorm:** This pattern should be documented as a convention — every Svelte component that accepts Astro slot content AND uses `<Tunable>` must use the `slotContent` alias.

### Discovery 3: Svelte 5 disallows top-level `await` in components

**Problem:** The plan's code samples showed `const Tunable = import.meta.env.DEV ? (await import(...)).default : null` at the top level of each component's `<script>`. Svelte 5 forbids top-level `await` unless the `experimental.async` compiler option is enabled (which we don't want).

**Fix:** Created `src/lib/dev/lazy.ts` — a shared module that holds the dynamic import promise. Each component resolves it via `onMount`:

```typescript
// src/lib/dev/lazy.ts
export const tunablePromise = import.meta.env.DEV
  ? import('./Tunable.svelte').then((m) => m.default)
  : null;
```

```svelte
<!-- In each component -->
<script lang="ts">
  import { tunablePromise } from '../lib/dev/lazy';
  let TunableComponent = $state<any>(null);
  onMount(() => {
    tunablePromise?.then((c) => { TunableComponent = c; });
  });
</script>
```

This pattern: (a) resolves the import once across all components, (b) avoids top-level `await`, (c) is fully tree-shaken in production since `tunablePromise` is `null` when `import.meta.env.DEV` is false.

**Impact on brainstorm:** The plan's Enhancement Summary (item 18) identified this as a performance concern but not a build-breaking issue. In practice, it's a hard compiler error, not just a perf problem.

### Discovery 4: `param-types` and `design-tokens.params` are legitimate in production

**Problem:** The CI post-build grep check (`deploy.yml`) originally flagged any occurrence of `param-types` or `design-tokens.params` in the production build output. But `createParamAccessor` from `param-types.ts` is used at runtime by content components to read default parameter values, and `design-tokens.params.ts` is imported by `Base.astro` at build time to render `:root` CSS declarations.

**Fix:** Updated the grep pattern in `deploy.yml` to exclude `param-types` and `design-tokens.params`. Updated CLAUDE.md to document that these modules are allowed in production. The forbidden list is now: `Tunable`, `ParamPanel`, `ParamInput`, `GlobalParamPanel`, `__params`.

**Impact on brainstorm:** The dev-gate boundary is more nuanced than originally specified. Not everything in `src/lib/dev/` is dev-only — `param-types.ts` contains runtime code used by both dev and production paths.

## Next Steps

Feed this brainstorm into `/ce:plan` to produce a single merged implementation plan that supersedes both existing plans.
