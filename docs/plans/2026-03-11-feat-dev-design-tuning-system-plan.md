---
title: "feat: Dev-Time Design Tuning System"
type: feat
status: active
date: 2026-03-11
deepened: 2026-03-11
origin: docs/brainstorms/2026-03-11-dev-design-tuning-system-brainstorm.md
---

# Dev-Time Design Tuning System

## Enhancement Summary

**Deepened on:** 2026-03-11
**Sections enhanced:** 8
**Research agents used:** Security Sentinel, Architecture Strategist, Performance Oracle, TypeScript Reviewer, Frontend Races Reviewer, Code Simplicity Reviewer, Pattern Recognition Specialist, Best Practices Researcher, Spec Flow Analyzer, Context7 (Astro/Vite/Svelte docs)

### Critical Issues Discovered

1. **Real-time slider updates do not work as designed** — Components import params statically at module scope; the DebugPanel's `structuredClone` breaks the reactive link. Sliders only take effect after a full commit-to-disk HMR cycle, not in real-time. A reactive override store is needed (see Technical Approach > Research Insights).
2. **ParamDef type allows invalid combinations** — `{ type: 'boolean', value: '#ff0000', min: 5 }` compiles without error. Needs discriminated union refactor.
3. **Write-back endpoint has security gaps** — Path traversal bypass (missing trailing separator), unrestricted file type (can write any file in project root), no body size limit, no CSRF protection.

### Key Improvements

1. Added reactive override store (`param-store.svelte.ts`) for instant CSS param feedback
2. Refactored ParamDef to discriminated union for type safety
3. Hardened write-back endpoint (path validation, file type restriction, body size limit, CSRF check, server-side content generation)
4. Simplified type system: removed `category` field (never consumed), merged `duration` into `number`, inlined `ParamFile` type
5. Added commit state machine to prevent double-click races
6. Added ProgressBar.params.ts (was missing from component coverage)
7. Switched glob pattern to `**/*.params.ts` for subdirectory forward-compatibility

## Overview

A dev-time parameter tuning system for CrowCoder's interactive components. Each tunable component gets a colocated `.params.ts` sidecar file defining its parameters with metadata. A generic DebugPanel auto-discovers all param files and renders appropriate controls (sliders, color pickers, toggles). A "commit" button writes tuned values back to the `.params.ts` source files via an Astro dev server endpoint, triggering Vite HMR. The entire system is gated behind `import.meta.env.DEV` and tree-shaken from production builds.

## Problem Statement

CrowCoder's interactive components (ProseHighlight, ProseReactive, Popup, Quiz, ColorPicker, ProgressBar) each have numeric/visual parameters that affect feel — transition durations, underline thickness, color-pulse timing, animation durations, IntersectionObserver thresholds, scroll grace periods, SVG curvature. Hardcoding these across ~7 components makes iterative design tuning tedious: change a value in source, wait for HMR, evaluate, repeat. Browser DevTools can edit CSS custom properties live but can't persist changes or tune JS behavioral params.

## Proposed Solution

(see brainstorm: docs/brainstorms/2026-03-11-dev-design-tuning-system-brainstorm.md)

**Colocated `.params.ts` sidecar files** next to each component, defining tunables with metadata (type, min, max, step, default). A **generic DebugPanel** auto-discovers all param files via `import.meta.glob` and renders controls per param type. CSS-type params flow via **CSS custom properties** on the component's root element. A **reactive override store** (`param-store.svelte.ts`) provides instant visual feedback for CSS params before commit. JS behavioral params are imported directly and update via the HMR cycle. An **Astro dev server endpoint** (`/__params/write`) handles write-back to source, and Vite's HMR auto-reloads changed modules.

### Key decisions carried forward from brainstorm

1. **Colocated `.params.ts` sidecar files** over central config — colocation prioritized over single-source-of-truth simplicity
2. **CSS custom properties on root elements** over Tailwind `@theme` integration — avoids split write-back and Tailwind coupling
3. **Astro integration with `astro:server:setup` hook** for write-back endpoint — inherently dev-only, no production stripping needed
4. **Built in Phase 1** of the main CrowCoder plan — available from the first components onward
5. **`import.meta.env.DEV` gate** — entire system tree-shaken from production via dynamic `import()`

## Technical Approach

### Architecture

```
src/
  components/
    ProseHighlight.svelte
    ProseHighlight.params.ts        # colocated tunables
    ProseReactive.svelte
    ProseReactive.params.ts
    Popup.svelte
    Popup.params.ts
    Quiz.svelte
    Quiz.params.ts
    ColorPicker.svelte
    ColorPicker.params.ts
    ProgressBar.svelte
    ProgressBar.params.ts
  lib/
    dev/
      DebugPanel.svelte             # generic param panel (dev-only island)
      ParamInput.svelte             # per-type input control ({#if} branching)
      param-types.ts                # ParamDef type, serialization helpers
      param-store.svelte.ts         # reactive override store for real-time updates
  integrations/
    params-writer.ts                # Astro integration with astro:server:setup hook
```

### Research Insights: Architecture

**Real-time update architecture (two tiers):**
- **Tier 1 — CSS params (instant):** A shared reactive override store (`param-store.svelte.ts`) lets the DebugPanel write slider values that components read reactively via `$state`. No disk write needed. Svelte 5's fine-grained reactivity updates only the specific `style:` binding that changed. This is the pattern used by tools like Tweakpane, Leva, and Theatre.js — live parameter binding with a separate persist step.
- **Tier 2 — JS behavioral params (commit cycle):** IntersectionObserver thresholds, queue depths, and other imperative values consumed in `$effect`/`onMount` cannot react to store changes without re-initialization. These update through the HMR cycle: commit → disk write → Vite reload → component re-mount. This is acceptable — behavioral params are tuned less frequently.

**Why this matters:** Without the reactive override store, the plan's core promise ("drag slider, see component update") does not work. The component imports are static module-scope values. The DebugPanel's `structuredClone` creates a separate copy with no reactive link to the component. Sliders would only take effect after a full filesystem round-trip via HMR.

**Production safety verification:** After the first `astro build`, run `grep -r "getOverride\|param-store\|DebugPanel\|ParamInput" dist/` to confirm zero leakage. All override store imports are gated behind `import.meta.env.DEV`, so Vite tree-shakes the entire import chain.

### ParamDef type

Use a discriminated union so TypeScript prevents invalid combinations (e.g., `{ type: 'boolean', min: 5 }`). Each variant carries only the fields that make sense for its type.

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

#### Research Insights: Type System

**Why discriminated unions over a flat interface:**
- `min`/`max`/`step` are **required** on number params (where they should be) and **absent** on color and boolean (where they make no sense). The original interface made them optional everywhere — a boolean param could accidentally carry `min: 5`.
- TypeScript narrows `value` automatically when you check `type` in `{#if}` branches — no manual casting needed in ParamInput.
- The `getParamValue()` helper performs a runtime type check, so the `as` cast is justified — the assertion has been validated immediately before use. This replaces the unsafe `p<T>()` helper that cast without checking.

**Simplification decisions:**
- **`duration` merged into `number`:** Both rendered identical range slider controls. The semantic distinction is already conveyed by `unit: 'ms'`. Three types (number, color, boolean) instead of four, three `{#if}` branches instead of four.
- **`category` field removed:** Was defined on every param but never consumed by the DebugPanel for grouping, filtering, or sorting. With 3-6 params per component, there is nothing to group. If needed later, add it then.
- **`ParamFile` type inlined:** Used in exactly one place (DebugPanel). The fields are trivially derived from glob results. No named type needed for a shape with no reuse.

### Reactive override store (dev-only)

```typescript
// src/lib/dev/param-store.svelte.ts
// Reactive map of overrides, keyed by "ComponentName.paramKey"
let overrides: Record<string, number | string | boolean> = $state({});

export function setOverride(component: string, key: string, value: number | string | boolean) {
  overrides[`${component}.${key}`] = value;
}

export function getOverride(component: string, key: string): number | string | boolean | undefined {
  return overrides[`${component}.${key}`];
}

export function clearOverrides(component: string) {
  for (const key of Object.keys(overrides)) {
    if (key.startsWith(`${component}.`)) {
      delete overrides[key];
    }
  }
}
```

### Example sidecar file

```typescript
// src/components/ProseHighlight.params.ts
import type { ParamDef } from '../lib/dev/param-types';

const params: ParamDef[] = [
  { key: 'underlineThickness', label: 'Underline Thickness', type: 'number', value: 2, min: 1, max: 6, step: 0.5, unit: 'px' },
  { key: 'pulseColor', label: 'Pulse Color', type: 'color', value: '#6366f1' },
  { key: 'pulseDuration', label: 'Pulse Duration', type: 'number', value: 300, min: 100, max: 800, step: 50, unit: 'ms' },
];

export default params;
```

### Component consumption pattern

Components import from their sidecar file and apply CSS params as custom properties, JS params directly. In dev mode, they check the reactive override store for real-time updates:

```svelte
<!-- ProseHighlight.svelte -->
<script lang="ts">
  import params from './ProseHighlight.params';
  import { getParamValue } from '../lib/dev/param-types';

  // Dev-only: reactive override for real-time slider feedback
  const getOverride = import.meta.env.DEV
    ? (await import('../lib/dev/param-store.svelte')).getOverride
    : undefined;

  function p(key: string, type: 'number'): number;
  function p(key: string, type: 'color'): string;
  function p(key: string, type: 'boolean'): boolean;
  function p(key: string, type: ParamDef['type']): number | string | boolean {
    if (getOverride) {
      const override = getOverride('ProseHighlight', key);
      if (override !== undefined) return override;
    }
    return getParamValue(params, key, type);
  }

  let { children, id } = $props();
</script>

<span
  class="prose-highlight"
  style:--underline-thickness="{p('underlineThickness', 'number')}px"
  style:--pulse-color={p('pulseColor', 'color')}
  style:--pulse-duration="{p('pulseDuration', 'number')}ms"
>
  {@render children?.()}
</span>

<style>
  .prose-highlight {
    border-bottom: var(--underline-thickness) solid var(--pulse-color);
    transition: background-color var(--pulse-duration) ease;
  }
</style>
```

#### Research Insights: Component Pattern

**Why the `import.meta.env.DEV` gate works for tree-shaking:**
- Vite replaces `import.meta.env.DEV` with `false` at build time. The `await import(...)` becomes dead code — Vite/Rollup eliminates the entire import chain. Confirmed in Vite documentation and validated by the performance review.
- The dynamic `await import()` is necessary (not a static import) because static imports cannot be conditionally eliminated. A static `import { getOverride } from '...'` would bundle the override store into production even if the call site is gated.

**Performance of the reactive override path:**
- `$state` object property access is O(1) per param read.
- Svelte 5's compiler generates fine-grained updates — only the specific `style:` binding that changed re-renders, not the entire component.
- CSS custom property updates via `style:` compile to `element.style.setProperty('--prop', value)` — O(1), no style recalculation cascade, 60fps capable.

### DebugPanel auto-discovery

The DebugPanel uses `import.meta.glob` to auto-discover all param files. Since the DebugPanel is a dev-only island, all matched modules only ship to the dev build.

```svelte
<!-- src/lib/dev/DebugPanel.svelte -->
<script lang="ts">
  import type { ParamDef } from './param-types';
  import ParamInput from './ParamInput.svelte';
  import { setOverride, clearOverrides } from './param-store.svelte';

  // Auto-discover all .params.ts files — Vite resolves at compile time
  // Use **/ glob for forward-compatibility with subdirectories
  const paramModules = import.meta.glob<{ default: ParamDef[] }>(
    '../../components/**/*.params.ts',
    { import: 'default', eager: true }
  );

  // Build structured list from glob results (inline shape, no ParamFile type needed)
  let paramFiles = $state(
    Object.entries(paramModules).map(([path, params]) => ({
      path,
      componentName: path.match(/([^/]+)\.params\.ts$/)?.[1] ?? 'unknown',
      params,  // direct reference — no structuredClone needed for dev-only data
    }))
  );

  // Commit state machine per component to prevent double-click races
  let commitStates = $state<Record<string, 'idle' | 'committing'>>({});

  function handleParamChange(componentName: string, param: ParamDef, value: number | string | boolean) {
    param.value = value;
    // Real-time feedback via override store
    setOverride(componentName, param.key, value);
  }

  async function commitParams(file: typeof paramFiles[number]) {
    if (commitStates[file.componentName] === 'committing') return;
    commitStates[file.componentName] = 'committing';

    try {
      // Send structured param data — server generates the file content
      const srcPath = 'src/components/' + file.path.match(/([^/]+\.params\.ts)$/)?.[1];

      const res = await fetch('/__params/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: srcPath, params: file.params }),
      });

      if (!res.ok) {
        console.error('Write-back failed:', await res.text());
      } else {
        // Clear overrides after successful commit — HMR will pick up the persisted values
        clearOverrides(file.componentName);
      }
    } finally {
      commitStates[file.componentName] = 'idle';
    }
  }
</script>

<aside class="debug-panel">
  <h3>Design Tuning</h3>
  {#each paramFiles as file}
    <section>
      <h4>{file.componentName}</h4>
      {#each file.params as param}
        <ParamInput
          definition={param}
          onchange={(value) => handleParamChange(file.componentName, param, value)}
        />
      {/each}
      <button
        onclick={() => commitParams(file)}
        disabled={commitStates[file.componentName] === 'committing'}
      >
        {commitStates[file.componentName] === 'committing' ? 'Writing...' : 'Commit'}
      </button>
    </section>
  {/each}
</aside>
```

#### Research Insights: DebugPanel

**Simplifications applied:**
- **Removed `structuredClone`:** The clone broke the reactive link and was unnecessary for dev-only mutable data. Direct mutation of the imported param arrays is safe here — they have no other consumers at runtime, and the whole point is to mutate values then write them back.
- **Removed `details`/`summary` collapsible sections:** With 5-7 components at 3-6 params each (15-35 controls total), everything fits on screen without collapsing. The accordion added `expandedComponent` state and an awkward Svelte 5 `bind:open` pattern. Replaced with simple `<section>` + `<h4>` headings. If it feels too long later, add collapsing then.
- **Glob pattern changed to `**/*.params.ts`:** Forward-compatible with subdirectories. Costs nothing today (flat directory), silently works if components are reorganized later.
- **Path construction uses regex match** instead of fragile `file.path.replace('../../', 'src/')`. Extracts the filename from the glob path and prepends the known `src/components/` prefix.

**Commit state machine:** Prevents double-click races. If the user clicks "Commit" while a write is in-flight, the second click is ignored and the button shows "Writing..." in disabled state.

**Real-time feedback via override store:** `handleParamChange` writes to both the local param array (for the commit codegen) and the reactive override store (for instant visual feedback in the component). After a successful commit, overrides are cleared so the component reads from the HMR-reloaded module values.

**HMR behavior with `import.meta.glob`:** When a `.params.ts` file changes on disk, Vite detects the change and triggers an HMR update. The module is re-evaluated, and the glob result is updated. For new `.params.ts` files created while the server is running, Vite will trigger a full page reload (not hot update) since the glob result shape changes. This is expected — document it so developers know to expect a reload when adding a new param file.

### ParamInput component

Uses `{#if}` branching (not dynamic components) since there are only 3 input types:

```svelte
<!-- src/lib/dev/ParamInput.svelte -->
<script lang="ts">
  import type { ParamDef } from './param-types';

  let { definition, onchange }: { definition: ParamDef; onchange: (value: number | string | boolean) => void } = $props();
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

#### Research Insights: ParamInput

**Discriminated union narrows automatically:** When the DebugPanel passes `definition` to ParamInput, TypeScript knows that inside `{#if definition.type === 'number'}`, `definition` is `NumberParamDef` — so `definition.min`, `definition.max`, and `definition.step` are available without optional chaining or casting.

**`onchange` callback type:** Changed from `(value: any) => void` to `(value: number | string | boolean) => void` for type safety at the boundary.

### Astro integration for write-back

Use `astro:server:setup` hook — inherently dev-only, no `apply: 'serve'` needed. The hardened implementation addresses security findings from the review:

```typescript
// src/integrations/params-writer.ts
import type { AstroIntegration } from 'astro';
import { writeFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import type { ParamDef } from '../lib/dev/param-types';

const MAX_BODY = 64 * 1024; // 64KB — generous for a params file

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

          // CSRF check — reject cross-origin requests
          const origin = req.headers['origin'] || req.headers['referer'] || '';
          if (origin && !String(origin).startsWith('http://localhost')) {
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

              // Path traversal prevention — use trailing separator to prevent prefix collisions
              const normalizedRoot = root.endsWith(path.sep) ? root : root + path.sep;
              if (!abs.startsWith(normalizedRoot)) {
                res.statusCode = 403;
                res.end(JSON.stringify({ error: 'Path rejected' }));
                return;
              }

              // Symlink check — resolve real paths to prevent symlink escape
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

#### Research Insights: Write-Back Security

**8 security findings addressed (from Security Sentinel review):**

| # | Finding | Severity | Remediation |
|---|---------|----------|-------------|
| 1 | Path traversal bypass — `startsWith` without trailing separator allows prefix collisions (e.g., `CrowCoderEvil/` matches `CrowCoder`) | HIGH | Normalize with trailing `path.sep` before comparison |
| 2 | Unrestricted file type — endpoint can write `astro.config.mjs`, `.env`, any file in root | HIGH | Restrict to `.params.ts` extension only |
| 3 | No body size limit — unbounded `req.on('data')` accumulation | MEDIUM | 64KB limit with `req.destroy()` on overflow |
| 4 | Content injection — client sends raw file content, server writes verbatim | MEDIUM | Server-side content generation from structured param data |
| 5 | Error message information leakage — `e.message` can expose absolute paths | LOW | Generic "Write failed" response, detailed error logged server-side |
| 6 | No CSRF protection — any website could POST to localhost endpoint | LOW | Origin/referer check for localhost |
| 7 | Race condition on concurrent writes — no serialization | LOW | Commit state machine on client prevents concurrent POSTs |
| 8 | Symlink escape — `path.resolve` doesn't follow symlinks but `writeFile` does | LOW | `realpath` resolution on directory before comparison |

**Key architectural change:** Content generation moved server-side. The DebugPanel sends structured param data (`{ filePath, params: ParamDef[] }`), and the server generates the TypeScript file content. This eliminates arbitrary code injection through the `content` field.

**Explicit field ordering in `generateParamsFileContent`:** `Object.entries` does not guarantee property order, so every write-back could produce a different field ordering, creating noisy git diffs even when nothing changed. The `FIELD_ORDER` array pins output order for deterministic, clean diffs.

**`req.on('error')` handler:** The original plan had no error handler on the request stream. If the connection drops mid-POST, the `end` event never fires, the response is never sent, and the middleware hangs.

### Mounting the DebugPanel (dev-only)

In `Base.astro`, conditionally render the DebugPanel using a conditional dynamic import (not static import) to ensure zero server-side bundling overhead in production:

```astro
<!-- src/layouts/Base.astro -->
---
const DebugPanel = import.meta.env.DEV
  ? (await import('../lib/dev/DebugPanel.svelte')).default
  : null;
---

<html>
  <body>
    <slot />

    {DebugPanel && <DebugPanel client:idle />}
  </body>
</html>
```

#### Research Insights: Production Safety

**Why conditional dynamic import over static import:**
The original plan used a static `import DebugPanel from '../lib/dev/DebugPanel.svelte'` at the top of `Base.astro`. While the JSX conditional would prevent the island from rendering in production, the static import still executes at build time (Astro's `.astro` files run server-side during build), pulling in DebugPanel and its transitive dependencies (ParamInput, param-types, and all glob-matched `.params.ts` files). The conditional dynamic import ensures zero import resolution cost in production builds.

**`client:idle` is correct:** Using `client:idle` so the DebugPanel doesn't compete with lesson content for hydration priority. This is consistent with the parent plan's tiered hydration approach (`ExportImport` also uses `client:idle` for the same rationale).

## Implementation Tasks

Build alongside Phase 1 of the main CrowCoder plan. The param system should be ready before the first visual components (ProseHighlight, ProseReactive, ColorPicker) are built.

### Setup (before first components)
- [ ] Create `src/lib/dev/param-types.ts` with discriminated union `ParamDef` type and `getParamValue` helper
- [ ] Create `src/lib/dev/param-store.svelte.ts` with reactive override store (`setOverride`, `getOverride`, `clearOverrides`)
- [ ] Create `src/integrations/params-writer.ts` (hardened Astro integration with `astro:server:setup` hook, server-side content generation)
- [ ] Register `paramsWriterIntegration()` in `astro.config.mjs`
- [ ] Build `src/lib/dev/ParamInput.svelte` (per-type input: slider, color picker, toggle — 3 branches)
- [ ] Build `src/lib/dev/DebugPanel.svelte` (auto-discovery via `import.meta.glob`, flat layout, commit button with state machine, reactive override integration)
- [ ] Mount DebugPanel in `Base.astro` behind conditional dynamic import with `client:idle`

### Per-component sidecar files (as components are built)
- [ ] Create `ProseHighlight.params.ts` (underline thickness, pulse color, pulse duration)
- [ ] Create `ProseReactive.params.ts` (text transition duration, crossfade opacity, translateY distance)
- [ ] Create `ColorPicker.params.ts` (wheel size, handle radius, selection ring width)
- [ ] Create `Popup.params.ts` (enter duration, exit duration, grace period, max queue depth, IntersectionObserver threshold)
- [ ] Create `Quiz.params.ts` (card border radius, card background, feedback display duration)
- [ ] Create `ProgressBar.params.ts` (segment colors for unseen/due/mastered states, border radius, spacing)
- [ ] Wire each component to import from its sidecar, use `getParamValue` with type-safe lookups, and check reactive override store in dev mode

### Validation
- [ ] Verify sliders update component visuals in real-time (via reactive override store, before commit)
- [ ] Verify "commit" writes back to `.params.ts` and Vite HMR reloads the component
- [ ] Verify production build (`astro build`) has zero trace of DebugPanel, param-types, param-store, or `/__params` endpoint (run `grep -r` against `dist/`)
- [ ] Verify path safety (attempt to write outside project root returns 403)
- [ ] Verify file type restriction (attempt to write non-.params.ts file returns 403)
- [ ] Verify body size limit (POST > 64KB returns 413)

## Alternative Approaches Considered

(see brainstorm: docs/brainstorms/2026-03-11-dev-design-tuning-system-brainstorm.md)

1. **Central design-tokens.ts** — Single file for all tunables. Simpler write-back (one file) but loses colocation. Rejected because the user prioritized seeing a component's params next to its code.
2. **Tailwind v4 `@theme` integration** — CSS tokens via Tailwind's design token system. Rejected because it creates split write-back (CSS for `@theme` + TS for JS params) and couples to Tailwind internals.
3. **Browser DevTools only** — Zero infrastructure. Rejected because DevTools edits are ephemeral, can't tune JS behavioral params, and lack structured overview of what's tunable.
4. **`.params.svelte.ts` with `$state` runes** — Making the sidecar files themselves reactive (Svelte 5 `$state` in the param array). This would give real-time updates without a separate override store, but requires Svelte compiler processing of param files and makes write-back more complex (regenerating rune syntax). The override store approach is simpler and keeps param files as plain TypeScript.

## Acceptance Criteria

- [ ] Each tunable component has a colocated `.params.ts` sidecar file
- [ ] DebugPanel auto-discovers all `.params.ts` files and renders appropriate controls
- [ ] Dragging a slider updates the component's visual CSS params in real-time (via reactive override store)
- [ ] JS behavioral params update after commit via HMR cycle (documented two-tier behavior)
- [ ] Clicking "commit" writes tuned values back to the `.params.ts` source file on disk
- [ ] Vite HMR reloads the component after write-back (no manual page refresh)
- [ ] `astro build` produces zero bytes of debug panel, param types, override store, or write-back endpoint code
- [ ] Write-back endpoint rejects paths outside the project root
- [ ] Write-back endpoint rejects non-`.params.ts` file paths
- [ ] Commit button is disabled while a write is in-flight (prevents double-click)

## Dependencies & Risks

**Dependencies:**
- Astro's `astro:server:setup` hook (stable API, [documented](https://docs.astro.build/en/reference/integrations-reference/))
- Vite's `import.meta.glob` (stable, core Vite feature — [docs](https://vite.dev/guide/features))
- Vite's `import.meta.env.DEV` compile-time replacement (stable)
- Vite's file watcher + HMR for auto-reloading after write-back
- Svelte 5 `$state` reactivity for override store (cross-island singleton via Vite module deduplication — validated in parent plan)

**Risks:**

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `import.meta.glob` ships param modules to production | Low | Medium | Conditional dynamic import in Base.astro; verify with `grep -r` against `dist/` after first build |
| Vite HMR doesn't fire after `.params.ts` write | Low | Low | File watcher should pick up changes automatically; fallback: `server.ws.send({ type: 'full-reload' })` via proactive module graph invalidation |
| Override store leaks to production | Low | Medium | All imports gated behind `import.meta.env.DEV`; Vite tree-shakes dead code; verify with `grep -r` |
| Debug panel overhead slows dev experience | Low | Low | `client:idle` directive + only ~7 param files; negligible (15-35 inputs render in <1ms) |
| New `.params.ts` files not discovered without reload | Expected | Low | `import.meta.glob` resolves at transform time; new files require page reload (document this behavior) |

## Integration with Main Plan

This system is built **during Phase 1** of the main CrowCoder plan ([docs/plans/2026-03-11-feat-interactive-learning-website-plan.md](docs/plans/2026-03-11-feat-interactive-learning-website-plan.md)). The param infrastructure (types, DebugPanel, override store, Astro integration) is set up as part of the initial scaffold, and sidecar files are created alongside each component as it's built. No separate phase needed.

**Consistency with parent plan:**
- File organization follows parent conventions: dev tooling in `src/lib/dev/`, integrations in `src/integrations/`
- Override store uses `$state` pattern consistent with parent's `.svelte.ts` rune stores
- Hydration strategy (`client:idle`) consistent with parent's tiered hydration table
- Flat `src/components/` directory respected (glob uses `**/` for forward-compat only)
- ProgressBar now included (was missing — parent plan lists 6 interactive components)

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-11-dev-design-tuning-system-brainstorm.md](docs/brainstorms/2026-03-11-dev-design-tuning-system-brainstorm.md) — Key decisions: colocated `.params.ts` files, CSS custom properties over Tailwind `@theme`, Vite write-back, built in Phase 1.

### External References

- [Astro Integrations Reference — `astro:server:setup`](https://docs.astro.build/en/reference/integrations-reference/)
- [Vite Plugin API — `configureServer`](https://vite.dev/guide/api-plugin)
- [Vite Features — Glob Import](https://vite.dev/guide/features)
- [Vite HMR API](https://vite.dev/guide/api-hmr)
- [Svelte 5 $state Rune](https://svelte.dev/docs/svelte/$state)
- [Tweakpane — Compact GUI for fine-tuning parameters](https://tweakpane.github.io/docs/)
- [Runes and Global state: do's and don'ts | Mainmatter](https://mainmatter.com/blog/2025/03/11/global-state-in-svelte-5/)

### Deepening Research Sources

- [HMR API | Vite](https://vite.dev/guide/api-hmr)
- [Vite Features — Glob Import](https://vite.dev/guide/features)
- [HMR with dynamic imports discussion — vitejs/vite #7577](https://github.com/vitejs/vite/discussions/7577)
- [Svelte Tweakpane UI](https://kitschpatrol.com/svelte-tweakpane-ui/docs)
- [Theatre.js — Theatric](https://www.theatrejs.com/docs/latest/api/theatric)
