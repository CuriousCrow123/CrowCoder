---
title: "refactor: Strip color theory content, reduce to base architecture"
type: refactor
status: completed
date: 2026-03-13
origin: docs/brainstorms/2026-03-13-pivot-to-c-teaching-brainstorm.md
---

# Strip Color Theory Content to Base Architecture

Remove all color-theory lesson content from CrowCoder, leaving a clean domain-agnostic platform ready for C programming lessons.

## Acceptance Criteria

- [x] `ColorPicker.svelte` and `ColorPicker.params.ts` deleted
- [x] `index.astro` replaced with minimal placeholder (Base layout, "CrowCoder — Learn C" heading, no interactive components)
- [x] `ComponentValueRegistry` in `types.ts` emptied (empty interface, pattern preserved)
- [x] Component-value tests in `lesson.svelte.test.ts` deleted (highlight-sharing tests kept)
- N/A `architecture.md` — does not exist on main branch (was on refactor/clean-docs)
- [x] `CLAUDE.md` updated: page description changed to placeholder
- [x] ADR 001 updated: ColorPicker example generalized
- [x] `npm test` passes (27 tests, 3 files), `npm run build` succeeds

## Implementation Steps

### 1. Delete color-theory component

```
rm src/components/ColorPicker.svelte
rm src/components/ColorPicker.params.ts
```

### 2. Empty ComponentValueRegistry

In `src/lib/types.ts`, replace the `colorPicker` entry with an empty interface body:

```typescript
export interface ComponentValueRegistry {
  // Add new component types here as they are built
}
```

`ComponentKey` becomes `` `${never}:${string}` `` — `getComponentValue`/`setComponentValue` remain but are uncallable until a new entry is added. This is intentional.

### 3. Replace index.astro

Replace entire file with minimal placeholder:

```astro
---
import Base from "../layouts/Base.astro";
---

<Base title="CrowCoder — Learn C">
  <main id="main-content" class="prose-column">
    <h1>CrowCoder — Learn C</h1>
    <p>Interactive lessons coming soon.</p>
  </main>
</Base>
```

No interactive components on the placeholder page. ThemeToggle remains via Base layout.

### 4. Update lesson.svelte.test.ts

Delete the `component values` and `cross-island interaction pattern` describe blocks (they use `colorPicker` type which no longer exists in the registry). Keep the `highlight sharing` tests — they use arbitrary string IDs and don't depend on the registry.

### 5. Update docs

**`docs/architecture.md`:**
- Remove ColorPicker row from component inventory table
- Update lesson description: no lessons yet, site is a blank scaffold
- Generalize "ColorPicker" references in state flow descriptions to "interactive components"

**`CLAUDE.md`:**
- Change `pages/index.astro` comment from `# Single lesson page (Color Theory)` to `# Landing page (placeholder)`

**`docs/decisions/001-cross-island-state-sharing.md`:**
- Generalize ColorPicker example to "an interactive island component"

### 6. Verify

```bash
npx astro check && npm test && npm run build
```

## Design Decisions

**Keep ProseHighlight and ProseReactive:** They are generic prose-interaction primitives with no color-theory logic. Unused after the page gut, but available when C lessons need them. (see brainstorm: docs/brainstorms/2026-03-13-pivot-to-c-teaching-brainstorm.md — "keep everything else untouched")

**Delete component-value tests rather than rewrite with placeholder type:** The tests verify a pattern that has no registered types. Rewriting with a fake type adds code that will be rewritten again when the first C component is built. The highlight-sharing tests still exercise cross-island state. When a new component type is added to the registry, new tests should be written for the actual type.

**Leave ADR 002 and solution records as-is:** They are historical records describing decisions made during the color-theory era. Their architectural lessons remain valid regardless of domain content.

**Leave existing localStorage data alone:** Any `crowcoder-progress` data from color-theory visits is harmless — no component reads old quiz IDs. Data will be naturally replaced when C content arrives with new quiz IDs.

**No interactive components on placeholder page:** Truly minimal — just heading and text. Infrastructure components (ProgressBar, ReviewBanner, ExportImport) will return when content exists.

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-13-pivot-to-c-teaching-brainstorm.md](docs/brainstorms/2026-03-13-pivot-to-c-teaching-brainstorm.md) — key decisions: delete ColorPicker, empty registry, minimal placeholder
- State dependency analysis: [docs/decisions/001-cross-island-state-sharing.md](docs/decisions/001-cross-island-state-sharing.md)
- Composition wrapper context: [docs/decisions/002-island-composition-wrapper-pattern.md](docs/decisions/002-island-composition-wrapper-pattern.md)
