# Brainstorm: Dev-Time Design Tuning System

**Date:** 2026-03-11
**Status:** Reviewed

## What We're Building

A dev-time parameter tuning system for CrowCoder's interactive components. Each component with tunable visual/behavioral parameters gets a colocated `.params.ts` sidecar file defining its tunables with metadata (type, min, max, step, default, category). A generic debug panel auto-renders sliders/controls for all discovered params. A Vite dev server plugin handles write-back — when you click "commit," the tuned values are written directly back to the `.params.ts` source files. The entire system is gated behind `import.meta.env.DEV` and stripped from production builds.

### Key Characteristics

- **Colocated params:** Each component's tunables live next to it (`ComponentName.params.ts`), not in a central config
- **Generic debug panel:** Auto-discovers all `*.params.ts` files via Vite glob import, renders appropriate controls per param type
- **Write-back to source:** A Vite dev server plugin provides an endpoint; the debug panel POSTs updated values; the plugin rewrites the `.params.ts` file on disk
- **CSS params via custom properties:** Style tunables are applied as CSS custom properties on the component's root element — no Tailwind `@theme` integration needed
- **JS params used directly:** Behavioral tunables (IntersectionObserver thresholds, grace periods, queue depths) are imported and used in JS
- **Dev-only:** `import.meta.env.DEV` gate, tree-shaken from production
- **Built in Phase 1:** Available from the first components onward

## Why This Approach

### Why colocated `.params.ts` sidecar files (not central config)

- Opening `ProseHighlight.svelte` and `ProseHighlight.params.ts` side by side shows everything about that component
- Adding a new tunable is purely local — no editing a shared file
- Write-back targets a simple TS file (object literal), not a Svelte file — trivially parseable
- Trade-off accepted: no single "all params" view in source (but the debug panel provides this at runtime)

### Why not Tailwind v4's `@theme` for CSS tokens

- Tailwind's `@theme` is build-time static — not designed for live runtime overrides and write-back
- Integrating would mean split write-back targets (CSS file for `@theme` + TS files for JS params)
- CSS custom properties on component root elements achieve the same live-editability without coupling to Tailwind's internals
- Tailwind utility classes can still reference component custom properties via `[var(--name)]` syntax if needed

### Why not just DevTools

- DevTools edits are ephemeral — you lose tuned values on page reload
- No structured overview of what's tunable per component
- Can't tune JS behavioral params (IntersectionObserver thresholds, queue depths) from DevTools
- The write-back feature is the key differentiator: tune → commit → done

## Architecture

### File structure

```
src/
  components/
    ProseHighlight.svelte
    ProseHighlight.params.ts      # colocated tunables
    ProseReactive.svelte
    ProseReactive.params.ts
    Popup.svelte
    Popup.params.ts
    Quiz.svelte
    Quiz.params.ts                # quiz card visual treatment
    ColorPicker.svelte
    ColorPicker.params.ts
  lib/
    dev/
      DebugPanel.svelte           # generic param panel (dev-only)
      param-types.ts              # ParamDef type, serialization helpers
      vite-plugin-params.ts       # Vite dev server plugin for write-back
```

### ParamDef shape

```typescript
// src/lib/dev/param-types.ts
export interface ParamDef {
  key: string;           // unique within component, e.g. "underlineThickness"
  label: string;         // human-readable, e.g. "Underline Thickness"
  type: 'number' | 'color' | 'duration' | 'boolean';
  value: number | string | boolean;  // current value
  min?: number;
  max?: number;
  step?: number;
  unit?: string;         // "px", "ms", "%", "deg"
  category?: 'style' | 'behavior' | 'animation';
}
```

### Example sidecar file

```typescript
// src/components/ProseHighlight.params.ts
import type { ParamDef } from '../lib/dev/param-types';

export const params: ParamDef[] = [
  { key: 'underlineThickness', label: 'Underline Thickness', type: 'number', value: 2, min: 1, max: 6, step: 0.5, unit: 'px', category: 'style' },
  { key: 'pulseColor', label: 'Pulse Color', type: 'color', value: '#6366f1', category: 'style' },
  { key: 'pulseDuration', label: 'Pulse Duration', type: 'duration', value: 300, min: 100, max: 800, step: 50, unit: 'ms', category: 'animation' },
];
```

### Component consumption

```svelte
<!-- ProseHighlight.svelte -->
<script lang="ts">
  import { params } from './ProseHighlight.params';

  // Helper to read a param value by key
  function p(key: string) {
    return params.find(d => d.key === key)?.value;
  }
</script>

<span
  class="prose-highlight"
  style:--underline-thickness="{p('underlineThickness')}px"
  style:--pulse-color={p('pulseColor')}
  style:--pulse-duration="{p('pulseDuration')}ms"
>
  <slot />
</span>

<style>
  .prose-highlight {
    border-bottom: var(--underline-thickness) solid var(--pulse-color);
    transition: background-color var(--pulse-duration) ease;
  }
</style>
```

### Debug panel rendering

The DebugPanel uses Vite's glob import to discover all param files:

```typescript
// At dev time only
const paramModules = import.meta.glob('../components/*.params.ts', { eager: true });
```

It groups params by component (derived from filename), renders a collapsible section per component with appropriate controls (slider for numbers, color picker for colors, toggle for booleans).

### Write-back via Vite plugin

The Vite dev server plugin:
1. Registers a dev-only route (e.g., `/__params/write`)
2. Receives `{ file: string, params: ParamDef[] }` via POST
3. Rewrites the `.params.ts` file on disk with updated values
4. Vite's HMR picks up the file change and hot-reloads the component

This means the loop is: drag slider → CSS custom property updates live → click "commit" → `.params.ts` file rewritten → Vite HMR confirms.

## Key Decisions

1. **Colocated `.params.ts` sidecar files** over central config — colocation was prioritized over single-source-of-truth simplicity
2. **CSS custom properties on root elements** over Tailwind `@theme` integration — avoids split write-back and Tailwind coupling
3. **Vite dev server plugin for write-back** — the debug panel POSTs updated values, the plugin rewrites `.params.ts` files, Vite HMR reloads
4. **Built in Phase 1** — available from the first components, tune as you go
5. **`import.meta.env.DEV` gate** — entire system tree-shaken from production
6. **Generic per-type controls** — slider for numbers, color picker for colors, toggle for booleans — no custom UI per component

## Scope

### In scope (v1)
- ParamDef type system
- `.params.ts` sidecar files for ~5-7 components
- Generic DebugPanel with auto-discovery
- Vite plugin for write-back
- CSS custom property flow for style params
- Direct JS import for behavioral params

### Out of scope
- Undo/redo in debug panel
- Param presets/themes
- Multi-page param management
- Non-dev (production) param editing
- Tailwind `@theme` integration

## Open Questions

*None — all resolved during brainstorming.*
