# CrowCoder — Project Conventions

Interactive learning site for programming concepts, built with Astro + Svelte islands.

## Stack

- **Astro 6** (static output) + **Svelte 5** (runes, islands) + **Tailwind CSS v4** (Vite plugin)
- **Zod v4** for runtime validation
- **Vitest** for testing
- **GitHub Pages** deployment via GitHub Actions

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build (Astro static output)
- `npm test` — run tests (Vitest)
- `npm run preview` — preview production build locally
- `npx astro check` — type checking

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
- **SvelteMap values are NOT deeply reactive** — use immutable entry replacement via `.set(id, { ...entry, phase })`, never mutate properties in-place
- When checking localStorage-dependent state at mount (e.g. `hasBeenAnswered`), use `$state(fn())` to lock the value — do NOT use `$derived` which would re-evaluate mid-interaction
- Use `bind:group` for radio/checkbox groups, `bind:checked` for lone checkboxes, `bind:value` for text/number/range inputs — bare `checked={expr}` or `value={expr}` without `bind:` can make inputs read-only in Svelte 5 runes mode

### Types

- Use `z.infer<typeof Schema>` as single source of truth — no dual-maintained TypeScript interfaces
- Discriminated unions over loose object types
- Zod v4 breaking changes: `z.record()` requires two args, `z.literal()` accepts arrays

### Dev Tuning System

- Each tunable component has a colocated `.params.ts` sidecar file
- `<Tunable>` wrapper component for dev-mode gear icon + floating panel
- `<Tunable>` wrapper uses `display: inline` — components used inline in prose require this; block-level components work without change
- All tuning code must be gated behind `import.meta.env.DEV`
- CSS params (tier: 'css') update instantly via reactive overrides
- JS behavioral params (tier: 'js') update via commit-to-disk → Vite HMR cycle
- Production builds must contain zero trace of: `Tunable`, `ParamPanel`, `ParamInput`, `GlobalParamPanel`, `__params`
- `param-types` (runtime accessor) and `design-tokens.params` (build-time import) are allowed in production

### Components

- Astro maps slot content to a `children` prop — accept it in Svelte component props
- Alias `children` to `slotContent` internally to avoid collision with Tunable's `{#snippet children(overrides)}`
- Dev imports use `tunablePromise` from `lib/dev/lazy.ts` (resolved via `onMount`) — Svelte 5 disallows top-level `await`
- Use `{#if}` branching for 3 or fewer variants, not dynamic components
- Hydration directives: `client:load` for above-fold, `client:visible` for below-fold, `client:idle` for low-priority
- **`client:visible` + IntersectionObserver double-hop:** components using `client:visible` hydrate asynchronously after entering the viewport. Any post-hydration IntersectionObserver (e.g. scroll triggers) starts late — the target element may have zero height before content is injected. Always use `threshold: 0` and ensure observed elements have `min-height: 1px` (see `docs/solutions/002-intersection-observer-zero-height-elements.md`)
- Astro hydrated components require **static imports** — never use dynamic `await import()` for components that need `client:*` directives (Astro's renderer can't resolve them); for conditional rendering, use a thin `.astro` wrapper with a static import + `import.meta.env.DEV` gate
- **Exception for dev-only components that leak into production via static import:** bypass Astro hydration entirely — use a `<script>` with dynamic `import()` inside an `import.meta.env.DEV` guard and mount via Svelte's `mount()` API (see `DevGlobalPanel.astro`)
- **Astro slots are static HTML** — Svelte components passed as slot children of a `client:*` island are SSR'd and never hydrated. If a child component needs interactivity, wrap parent + child in a single Svelte component so they share one hydration boundary (see `QuizPopup.svelte`)
- `<astro-island>` defaults to `display: block` — global CSS includes `p > astro-island { display: inline }` to keep inline islands flowing within prose

### Popup System

- Multi-slot: multiple popups can be active concurrently (e.g. quiz + hint open simultaneously)
- State lives in `popupState.active` (`SvelteMap<string, PopupEntry>`) — each popup has independent lifecycle
- All lifecycle functions take an `id` parameter: `requestPopup(id, mode)`, `onEntered(id)`, `dismiss(id)`, `onExited(id)`
- Trigger deduplication: `triggeredThisSession` Set prevents re-triggering per page load; use `markTriggered(id)` to suppress without opening, `resetTrigger(id)` to re-enable
- Popup.svelte renders a "Show hint" button when `trigger='manual'` — composition wrappers (e.g. QuizPopup) should NOT switch trigger to 'manual' to suppress scroll; instead use `markTriggered(id)` to suppress the scroll trigger while keeping the original trigger mode
- `aria-live` regions must live OUTSIDE Popup's `{#if isActive}` block — otherwise the region is destroyed before screen readers process announcements
- QuizPopup is a composition controller, not a thin passthrough — it manages answered state, quiz mode, focus management, and screen reader announcements

### Dark Mode

- Class-based toggle: `.dark` class on `<html>` (not `prefers-color-scheme` media query)
- Inline FOUC-prevention script in `Base.astro` `<head>` applies class before first paint
- Theme preference persisted in localStorage (`crowcoder-theme`: `'light'` | `'dark'`)
- All colors use CSS custom properties from `:root` / `:root.dark` — never hardcode colors in components
- Semantic variables: `--text-color`, `--text-muted`, `--border-color`, `--surface-color`, `--quiz-card-bg`, etc.
- Design token inline styles (from GlobalParamPanel `setProperty()`) override dark mode vars — acceptable trade-off for dev-only tuning
- WCAG AA contrast: light mode accent `#4f46e5` (5.2:1), muted `#4b5563` (6.8:1); dark mode contrast naturally higher

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
- **Always kill stale dev servers before testing** — `pkill -f "astro dev"` then `npm run dev`. Multiple servers on different ports cause confusion when the browser points at stale code
- When making changes to shared state modules (`.svelte.ts`), verify with a headless browser test that the full hydration + interaction cycle works, not just unit tests

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
    sm2.ts              # SM-2 algorithm (Phase 2 — not yet created)
    persistence.ts      # localStorage handling (Phase 2 — not yet created)
    scroll-observer.ts  # Shared IntersectionObserver (Phase 2 — not yet created)
    design-tokens.params.ts  # Site-wide tunable values
  styles/global.css
  integrations/params-writer.ts
```
