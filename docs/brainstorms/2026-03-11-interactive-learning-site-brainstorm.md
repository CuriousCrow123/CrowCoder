# Brainstorm: Interactive Learning Website (CrowCoder)

**Date:** 2026-03-11
**Status:** Reviewed

## What We're Building

A single-page interactive learning website hosted on GitHub Pages, built with Astro 5 + Svelte 5. The page interleaves prose and interactive components with full bidirectional reactivity — prose reacts to component state and vice versa. Quiz/question popups support spaced repetition, with student progress stored in localStorage (with optional JSON export/import).

### Key Characteristics

- **General-purpose content:** Flexible enough for any subject (programming, math, language, etc.)
- **Single page to start, multi-page later:** Build one continuous learning page now; Astro's file-based routing makes expansion natural
- **Authored in .astro files:** Prose and components mixed directly in Astro components for maximum layout control
- **Static deployment:** GitHub Pages, no backend

## Architecture: Svelte Stores as Shared State Hub

Shared Svelte 5 rune-based state files (`.svelte.ts`) serve as the reactive backbone. Both prose sections and interactive components import from the same stores, enabling bidirectional interaction.

**Why this over alternatives:**
- Svelte 5 runes (`$state`, `$derived`, `$effect`) provide ergonomic reactivity with minimal boilerplate
- Shared stores keep the mental model simple — state lives in one place, components subscribe
- Works naturally with Astro's island architecture via `client:load` / `client:visible` directives
- Type-safe and debuggable (unlike an event bus approach)
- Preserves Astro's partial hydration benefits (unlike a single Svelte app approach)

**Trade-offs acknowledged:**
- All interactive components need hydration directives since they depend on client-side Svelte stores. Purely static prose sections can remain un-hydrated.
- **Core architectural bet:** Multiple Astro islands on the same page must share Svelte store state. This works because `.svelte.ts` modules are singletons within the same JS bundle — but requires that shared-state components use the same `client:` directive (e.g., all `client:load`) so they hydrate from the same module instance. This needs early validation.

## Key Decisions

1. **Astro 5 + Svelte 5** — Framework choice for static-first with reactive islands
2. **Svelte stores hub** — Shared `.svelte.ts` state files for bidirectional prose-component interaction
3. **Authored in .astro files** — Direct control over layout vs. MDX content convenience
4. **Multiple quiz triggers** — Scroll-based checkpoints, manual buttons, and component-completion triggers
5. **LocalStorage + export** — No backend needed; students can export/import progress as JSON
6. **GitHub Pages hosting** — Static deployment, free, simple CI/CD via GitHub Actions
7. **SM-2 spaced repetition** — Anki-style algorithm for optimal review scheduling
8. **Multi-mode popup system** — Modal, inline, and slide-in presentations depending on context
9. **Generic component slots** — Flexible system for v1; specific widgets built per lesson later
10. **Tailwind CSS** — Utility-first styling

## Prose-Component Interaction Model

Two interaction patterns, both flowing through shared Svelte stores:

1. **Reactive highlights:** Clicking prose highlights/activates parts of nearby components, and interacting with components can highlight relevant prose
2. **Shared state narration:** Prose sections dynamically update based on student actions (e.g., "Now that you've set X to 5, notice how...")

**Concrete example:** A lesson about color mixing has a color picker component and prose below it. The prose contains a `<ProseReactive>` Svelte component that reads from `colorStore`. When the student drags the picker to blue, the prose updates: "You've selected **blue** (hue: 240). Blue is a cool color that..." Clicking the word "cool" in the prose sets the picker to highlight the cool-color range. Both directions go through `colorStore`.

## Quiz & Spaced Repetition System

- **Popup quizzes** triggered by scroll position, button clicks, or component task completion
- **Multi-mode popups** — modal overlay (focused assessments), inline expansion (contextual questions), slide-in panel (hints/references). Authors choose the mode per popup. Non-quiz popups (definitions, hints) also supported.
- **Progress tracking** in a dedicated `progressStore` synced to localStorage
- **SM-2 spaced repetition** — track answer history with ease factors and intervals (Anki-style) to surface questions at optimal review times
- **Export/import** — students download/upload a JSON file to transfer progress across devices

## Risks to Validate Early

1. **Cross-island store sharing** — Confirm that multiple Svelte components hydrated as separate Astro islands can actually share reactive state via `.svelte.ts` imports. Build a minimal proof-of-concept before committing to the architecture.
2. **Popup mode complexity** — Three presentation modes (modal, inline, slide-in) is broad for v1. Consider starting with one mode (inline) and making the system extensible for the others.
