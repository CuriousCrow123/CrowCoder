---
review_agents: [kieran-typescript-reviewer, code-simplicity-reviewer, performance-oracle, architecture-strategist, svelte5-races-reviewer, astro-island-reviewer, a11y-reviewer]
plan_review_agents: [kieran-typescript-reviewer, code-simplicity-reviewer, architecture-strategist, astro-island-reviewer]
---

# Review Context

- Astro 6 + Svelte 5 (runes) + Tailwind CSS v4 + Zod v4 single-page interactive learning site, deployed statically to GitHub Pages
- Core architectural bet: cross-island shared state via `.svelte.ts` module-level `$state` singletons (relies on Vite module deduplication, not an explicit Astro contract). Review for anything that could break this assumption — separate bundles, dynamic imports creating duplicate modules, SSR `$effect` usage
- Two-tier dev-time parameter tuning system: CSS params update instantly via reactive overrides, JS behavioral params go through commit-to-disk → Vite HMR cycle. ALL tuning code MUST be gated behind `import.meta.env.DEV` and tree-shaken from production. Flag any `Tunable`, `ParamPanel`, `GlobalParamPanel`, or `params-writer` reference that could leak into production builds
- Popup state machine (idle → entering → active → exiting) with `transitionend` listener — review for race conditions: stranded states from skipped transitions (`prefers-reduced-motion`, hidden elements), concurrent trigger/dismiss, queue overflow. Never use `Set`/`Map` in `$state` — must use `SvelteSet`/`SvelteMap`
- localStorage persistence with debounced auto-save, JSON import/export, and SM-2 spaced repetition. Review for: import clobbering pending auto-save, eager serialization in `$effect`, `beforeunload` flush, Zod validation at all parse boundaries, schema migration path for future versions
- Astro island layout: `<astro-island>` defaults to `display: block`, breaking inline prose. Hydrated components must use static imports (not dynamic `await import()`) or the renderer fails. Flag dynamic Svelte imports in `.astro` frontmatter paired with `client:*` directives
- Greenfield project with no legacy code. Prioritize clean patterns and correct TypeScript types from the start. Use `z.infer<>` as single source of truth (no dual-maintained interfaces). Discriminated unions over loose object types.
