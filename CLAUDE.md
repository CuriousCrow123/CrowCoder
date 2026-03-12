# CrowCoder — Project Conventions

## Stack

- **Astro 6** (static output) + **Svelte 5** (runes, islands) + **Tailwind CSS v4** (Vite plugin)
- **Zod v4** for runtime validation
- **Vitest** for testing
- **GitHub Pages** deployment via GitHub Actions

## Architecture

Single-page interactive learning site. Astro `.astro` pages mix prose with hydrated Svelte 5 islands.
Cross-island state sharing uses `.svelte.ts` module-level `$state` objects (Vite module deduplication).

See ADR: `docs/decisions/001-cross-island-state-sharing.md`

## Conventions

### State

- All stores use `{domain}State` suffix: `lessonState`, `progressState`, `popupState`
- Export `$state` as **objects** and mutate properties — never export reassignable `$state` primitives
- Island root components import from stores directly; intra-island children receive data as props
- Never use plain `Set`/`Map` inside `$state` — use `SvelteSet`/`SvelteMap` from `svelte/reactivity`

### Types

- Use `z.infer<typeof Schema>` as single source of truth — no dual-maintained TypeScript interfaces
- Discriminated unions over loose object types
- Zod v4 breaking changes: `z.record()` requires two args, `z.literal()` accepts arrays

### Dev Tuning System

- Each tunable component has a colocated `.params.ts` sidecar file
- `<Tunable>` wrapper component for dev-mode gear icon + floating panel
- ALL tuning code MUST be gated behind `import.meta.env.DEV`
- CSS params (tier: 'css') update instantly via reactive overrides
- JS behavioral params (tier: 'js') update via commit-to-disk → Vite HMR cycle
- Production builds must contain zero trace of: `Tunable`, `ParamPanel`, `ParamInput`, `GlobalParamPanel`, `__params`
- `param-types` (runtime accessor) and `design-tokens.params` (build-time import) are allowed in production

### Components

- Component slot content: accept `children` prop (Astro slot mapping) and alias to `slotContent` internally to avoid collision with Tunable's `{#snippet children(overrides)}`
- Dev imports use `tunablePromise` from `lib/dev/lazy.ts` (resolved via `onMount`) — Svelte 5 disallows top-level `await`
- Use `{#if}` branching for small variant counts, not dynamic components
- Hydration directives: `client:load` for above-fold, `client:visible` for below-fold, `client:idle` for low-priority

### Security Rules

- **NEVER** use `{@html}` or `set:html` with data from localStorage, JSON import, or any runtime source
- All untrusted data passes through Zod v4 schema validator before entering stores
- Wrap `JSON.parse()` in try/catch at all call sites
- Pin GitHub Actions to commit SHAs
- CSP meta tag: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'`

### Testing

- Unit tests for pure functions (sm2.ts, persistence.ts)
- Integration test for cross-island state sharing (Phase 1 canary)
- Post-build grep for dev tooling leakage (CI check)
- Major version bumps of `astro`, `@astrojs/svelte`, or `vite` require re-running the integration test

### Commits

- Format: `type(scope): description` (feat, fix, docs, refactor, test)
- Atomic commits: one logical change per commit

## File Structure

```
src/
  layouts/Base.astro
  pages/index.astro
  components/           # Svelte islands + .params.ts sidecars
  lib/
    state/              # .svelte.ts shared state modules
    dev/                # Dev-only tuning system (import.meta.env.DEV gated; param-types.ts also used in production)
      lazy.ts           # Shared async Tunable loader (avoids top-level await)
    types.ts            # Shared types
    sm2.ts              # SM-2 algorithm (Phase 2)
    persistence.ts      # localStorage handling (Phase 2)
    scroll-observer.ts  # Shared IntersectionObserver (Phase 2)
    design-tokens.params.ts  # Site-wide tunable values
  styles/global.css
  integrations/params-writer.ts
```
