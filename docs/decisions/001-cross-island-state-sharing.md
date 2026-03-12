# ADR 001: Cross-Island State Sharing via Svelte 5 Rune Stores

## Status

Accepted (2026-03-12)

## Context

CrowCoder is a single-page interactive learning site built with Astro + Svelte 5. Multiple Svelte "islands" on the same page need to share reactive state — for example, a `ProseHighlight` island writes to `lessonState.activeHighlight`, and a `ColorPicker` island reads it to respond visually.

Astro's official recommendation for cross-island state is **Nano Stores** (framework-agnostic). We evaluated three options:

1. **Nano Stores** — officially recommended, framework-agnostic
2. **Svelte 5 rune stores** (`.svelte.ts` modules with `$state`) — Svelte-native, ergonomic
3. **Custom event bus** — decoupled but loses type safety

## Decision

Use `.svelte.ts` module-level `$state` objects as shared state singletons across Astro islands.

### Why

- This is a **pure Svelte project** — no React/Vue islands, so framework-agnostic stores add unnecessary overhead
- `.svelte.ts` runes are more ergonomic than Nano Stores' `$atom`/`subscribe` API
- One fewer dependency
- Research confirmed that Vite/Rollup extracts shared dependencies into a common chunk, and the ES module system guarantees single module evaluation — so all islands sharing a `.svelte.ts` import get the same `$state` object

### Constraints

- Must export `$state` as **objects** and mutate properties (cannot export reassignable `$state` primitives — Svelte compiler limitation)
- `$effect` does not run during SSR (safe for static site)
- State resets on full page navigation (fine for single-page v1; localStorage persists for multi-page future)
- Mixed hydration directives (`client:load`, `client:visible`, `client:idle`) share the same singleton — late-hydrating islands read current value on mount (pull-based)
- **Late-hydrating islands miss intermediate state changes.** If `activeHighlight` went `null → "red" → "blue"` before the island hydrated, it only sees `"blue"`. Do not use store mutations for one-shot events unless all consumers are guaranteed mounted.

## Consequences

### Positive

- Zero-dependency state sharing with full TypeScript support
- Fine-grained Svelte 5 reactivity (no subscribe/unsubscribe boilerplate)
- Naturally works with Svelte's `$derived` for computed values

### Negative

- **This relies on an implementation detail of Vite/Rollup**, not an explicit Astro contract. A future Astro version could change bundling behavior (e.g., separate bundles per island) and break the singleton guarantee.
- We mitigate this with an integration test (Phase 1) that asserts reactive propagation across `client:load` and `client:visible` islands — serves as an early-warning canary for Astro upgrades.

### Upgrade protocol

Major version bumps of `astro`, `@astrojs/svelte`, or `vite` **must** re-run the cross-island state integration test before merging.

## Alternatives Considered

- **Nano Stores**: Officially supported but adds dependency and less ergonomic API for a pure-Svelte project.
- **Event bus**: Loses TypeScript type safety, harder to debug, requires manual cleanup.
- **Single Svelte app island**: Simplest reactivity but loses Astro's partial hydration benefits.
