---
title: "docs: Add conventions for Phase 1 bugfix patterns"
type: docs
status: completed
date: 2026-03-12
---

# docs: Add conventions for Phase 1 bugfix patterns

## Overview

Four bugs found during Phase 1 testing exposed missing conventions. Research confirmed that Context7 does **not** cover any of these gotchas — the Astro/Svelte docs describe happy-path API usage but omit the `<astro-island>` display behavior, dynamic import hydration failures, and component wrapper layout implications. These must be documented in project conventions.

**Strategy: minimal CLAUDE.md + detailed agent.** Keep CLAUDE.md lean (short, actionable bullets). Put enforcement detail in the astro-island-reviewer agent where checklist-style instructions belong. Drop the SVG coordinate math bullet — it's a one-off component bug, not a recurring pattern.

## Research Findings

| Gotcha | Covered by Context7? | Covered by astro-island-reviewer? |
|--------|----------------------|-----------------------------------|
| `<astro-island>` display:block breaking inline prose | No | No (current version) |
| Dynamic `await import()` + hydration directive failure | No (partial — happy path only) | No |
| Tunable wrapper div blocking inline flow | No (project-specific) | N/A (project convention) |
| SVG coordinate math mismatch | No (too specific) | N/A (dropped — not recurring) |

## Changes

### 1. CLAUDE.md — Components section

Add **two** bullets after the existing hydration directives bullet (line 58):

```markdown
- Astro hydrated components require **static imports** — never use dynamic `await import()` for components that need `client:*` directives (Astro's renderer can't resolve them); for conditional rendering, use a thin `.astro` wrapper with a static import + `import.meta.env.DEV` gate
- `<astro-island>` defaults to `display: block` — global CSS includes `p > astro-island { display: inline }` to keep inline islands flowing within prose
```

### 2. CLAUDE.md — Dev Tuning System section

Add one bullet after the existing `<Tunable>` wrapper bullet (after line 45):

```markdown
- `<Tunable>` wrapper uses `display: inline` — components used inline in prose require this; block-level components work without change
```

### 3. cce.local.md — Review Context

Add one new bullet to the review context list:

```markdown
- Astro island layout: `<astro-island>` defaults to `display: block`, breaking inline prose. Hydrated components must use static imports (not dynamic `await import()`) or the renderer fails. Flag dynamic Svelte imports in `.astro` frontmatter paired with `client:*` directives
```

### 4. astro-island-reviewer agent

**File:** `~/claude-plugins/cce-marketplace/plugins/cce/agents/review/astro-island-reviewer.md`

This is where enforcement detail belongs — the agent's checklist format is designed for specific patterns and approved alternatives.

**Add to Section 1 (Hydration Directive Correctness):**

```markdown
### Import Resolution

Astro's renderer resolves Svelte components at build time via static imports. Dynamic `await import()` in `.astro` frontmatter will fail when paired with `client:*` directives.

**Flag these patterns:**
- `const Comp = (await import('./Component.svelte')).default` followed by `<Comp client:load />`
- Any `import()` of a `.svelte` file in `.astro` frontmatter that is later rendered with a hydration directive

**Approved pattern:** Static `import` at the top of frontmatter. For conditional rendering, use a thin `.astro` wrapper with a static import + `import.meta.env.DEV` gate.
```

**Add as new Section 7 (Island Layout in Prose):**

```markdown
## 7. Island Layout in Prose

`<astro-island>` custom elements default to `display: block`. When a Svelte island renders inline content (e.g., `<span>` inside a `<p>`), the block wrapper breaks text flow.

**Flag these patterns:**
- Svelte components that render `<span>` or other inline elements, used inside `<p>` tags with `client:*` directives, without a corresponding `display: inline` rule on `<astro-island>`
- Missing `p > astro-island { display: inline }` or equivalent in global CSS when inline islands exist
- Dev-only wrapper elements (e.g., Tunable's `<div>`) that default to `display: block` inside inline prose contexts
```

### 5. Plugin reinstall

After editing the agent file at `~/claude-plugins/cce-marketplace/`:

```bash
claude plugin uninstall cce@cce-marketplace && claude plugin install cce@cce-marketplace
```

## Acceptance Criteria

- [x] CLAUDE.md Components section has 2 new bullets (static imports, astro-island display)
- [x] CLAUDE.md Dev Tuning System section has 1 new bullet (Tunable wrapper display)
- [x] cce.local.md has 1 new review context bullet
- [x] astro-island-reviewer has Import Resolution sub-section and new Section 7 (Island Layout)
- [x] Plugin reinstalled to refresh cache
- [x] `npm run build` passes (sanity check — `npx astro check` requires interactive dep install)

## What was dropped and why

- **SVG coordinate math bullet** — One-off bug in `ColorPicker.svelte`, not a recurring pattern. If it happens again, promote to a convention then.
- **Context7 meta-instruction** — Tested against all four gotchas; Context7 returned zero relevant results. Adding "check Context7 first" would not have caught any of these. Context7 is valuable for API reference, not for implementation-level CSS/rendering gotchas.
- **Detailed code examples in CLAUDE.md** — Moved to the astro-island-reviewer agent where checklist-style enforcement detail belongs. CLAUDE.md stays terse.
