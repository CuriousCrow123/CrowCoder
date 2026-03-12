---
title: "feat: CCE Plugin Customization for CrowCoder"
type: feat
status: completed
date: 2026-03-11
origin: docs/brainstorms/2026-03-11-cce-plugin-customization-brainstorm.md
---

# CCE Plugin Customization for CrowCoder

## Enhancement Summary

**Deepened on:** 2026-03-11
**Sections enhanced:** 9
**Research agents used:** architecture-strategist, code-simplicity-reviewer, SM-2 web research, a11y web research, Context7 (Svelte 5, Astro, Zod v4)

### Key Improvements
1. Added grounded Svelte 5 runes documentation (from `/websites/svelte_dev`) to races reviewer spec — `$effect` cleanup, `untrack()`, `tick()` semantics with code examples
2. Added complete WCAG 2.2 AA compliance checklist with specific ARIA patterns, contrast ratios, and code examples to a11y reviewer spec
3. Added detailed SM-2 formula with 6 common implementation bugs and localStorage pitfalls
4. Added Zod v4-specific features (composable discriminated unions, Zod Mini) to Zod discipline rules

### Architectural Issues Discovered
1. **Review pipeline serial threshold:** `/cce:review` auto-switches to serial mode at >5 agents (line 82 of `skills/review/SKILL.md`). Plan targets 7 agents — must raise threshold or accept serial execution.
2. **Ruby cleanup scope understated:** Architecture review found 31 files with Ruby/Rails references, not the 7 listed. Plan updated with full audit scope.
3. **Setup skill overwrite window:** Running `/cce:setup` between Batches 1-3 would clobber manually-added agents. Mitigation added.
4. **plugin.json description field:** Hardcoded counts in description string need updating per batch (CLAUDE.md pre-commit requirement).
5. **Cross-reference location correction:** `julik-frontend-races-reviewer` is referenced in `skills/orchestrating-swarms/SKILL.md` (line 358), not `skills/review/SKILL.md`.

### YAGNI Considerations (from simplicity review — evaluated and rejected)
The simplicity reviewer flagged Items 6-10 as premature (no project code exists yet). This was evaluated and rejected: agents and skills are markdown files that cost minutes to create but require a full session context to write well. Building them now while the research (SM-2 formula, WCAG 2.2 rules, Svelte 5 runes semantics) is fresh and synthesized avoids re-doing that research later. They are structurally verifiable immediately and functionally verifiable when project code arrives. The version/CHANGELOG ceremony is mandated by the fork's CLAUDE.md and provides rollback via git history.

### Resolved Context7 Library IDs
- **Svelte 5:** `/websites/svelte_dev` (8203 snippets, benchmark 81.47)
- **Astro:** `/websites/astro_build_en` (2927 snippets, benchmark 83.79)
- **Zod v4:** `/websites/zod_dev_v4` (389 snippets, benchmark 64.96)

---

## Overview

Customize the forked `cce` plugin (17 agents, 35 skills) with project-specific review agents, skills, and modifications that close gaps between the generic compound-engineering tooling and CrowCoder's stack (Astro 5 + Svelte 5 runes + Tailwind v4 + Zod v4) and architecture (island hydration, cross-island shared state, dev-time parameter tuning, SM-2 spaced repetition, popup state machine).

10 customizations across 4 batches, executed in priority order. Each batch is a self-contained release with version bump, CHANGELOG update, plugin reinstall, and new-session verification.

## Problem Statement / Motivation

The `cce` fork was trimmed from 28 agents / 47 skills to 17 / 35 by removing Rails/Ruby/Every-specific components (see brainstorm: `docs/brainstorms/2026-03-11-cce-plugin-customization-brainstorm.md`). What remains is good but generic:

- The **frontend races reviewer** (`julik-frontend-races-reviewer`) gives advice about Stimulus, Hotwire, and React — none of which are in the CrowCoder stack. Its core race-detection philosophy is excellent but wrapped in wrong-framework idioms.
- **No agent understands Astro's island architecture** — hydration directives, SSR boundaries, cross-island state sharing via Vite module deduplication.
- The **plan template** still shows Ruby code examples (`class Test` / `app/services/user_service.rb:42`).
- **Research agents** reference `Gemfile.lock` and `bundle show` instead of `package.json` and `npm ls`.
- No agent enforces **Zod discipline** (`z.infer<>` as single source of truth).
- No tooling for **dev-gate checking** (tuning system leaking to production), **accessibility review**, **SM-2 domain knowledge**, or **param sidecar scaffolding**.

## Proposed Solution

### Prerequisites (Before Batch 1)

**P1. Initialize git repo in fork directory**

```bash
cd ~/claude-plugins/cce-marketplace
git init
git add -A
git commit -m "chore: snapshot before customization (v1.0.0)"
```

This gives diff visibility and rollback capability across all 4 batches. Low cost, high safety.

**P2. Resolve Context7 library IDs**

Use `resolve-library-id` MCP tool to get IDs for Astro 5 and Svelte 5. Embed these in research agent prompts (Batch 2, Item 4) for efficient lookups.

### Batch 1 — High Priority Agents (v1.0.0 -> v1.1.0)

#### Item 1: Svelte 5 Races Reviewer

**Action:** Overwrite `agents/review/julik-frontend-races-reviewer.md` with new content, rename file to `agents/review/svelte5-races-reviewer.md`. Delete the old file. Update all cross-references in other skills/agents that mention `julik-frontend-races-reviewer`.

**Agent structure (keeping the 10-section format):**

| Section | Current (Stimulus/React) | New (Svelte 5 + Astro) |
|---------|-------------------------|----------------------|
| 1. Framework lifecycle | Hotwire/Turbo DOM replacement, `connect()`/`disconnect()` | Svelte 5 component mount/unmount, `$effect` cleanup returns, `onMount`/`onDestroy`, Astro island hydration/dehydration |
| 2. DOM events | `EventListenerManager`, `data-action` attributes | Svelte `on:event` directives, `$effect`-managed listeners (auto-cleanup), cross-island event communication via shared state |
| 3. Promises | Keep as-is (framework-agnostic) | Keep as-is |
| 4. setTimeout/setInterval/rAF | Keep cancellation token pattern | Keep, add note about `$effect` cleanup as preferred cancellation mechanism |
| 5. CSS transitions | Turbo/React remount issues | Astro island hydration boundaries, `transitionend` + `prefers-reduced-motion`, popup state machine (`idle->entering->active->exiting`) |
| 6. Concurrent operations | Keep state machine pattern, Symbol states | Keep, add `$state` enum pattern, discriminated unions for state machines |
| 7. Deferred loading | Keep as-is | Keep as-is |
| 8. Guidelines | Keep as-is | Keep, add Svelte-specific items |
| 9. Review style | Keep Julik persona | Keep as-is |
| 10. Dependencies | Keep as-is | Keep as-is |

**New Svelte 5-specific patterns to add (from SpecFlow Gap 11):**

- `$effect` without cleanup return — leaked subscriptions, timers, event listeners
- `$state` object mutation vs replacement — mutations on proxied objects that don't trigger reactivity
- `$derived` vs `$effect` misuse — using `$effect` to compute derived values instead of `$derived`
- `$state.raw()` for large non-reactive data (SM-2 history arrays)
- `untrack()` to prevent infinite reactive loops
- `onDestroy` vs `$effect` return cleanup distinction
- `tick()` for DOM measurement after reactive updates
- Cross-island race: two Astro islands reading same `.svelte.ts` singleton, hydrating at different times based on `client:load` vs `client:visible`
- `transitionend` never firing if element removed mid-transition
- `$effect` running during SSR (silently no-ops, masks bugs)
- `SvelteSet`/`SvelteMap` requirement in `$state` (native `Set`/`Map` not reactive)

### Research Insights: Svelte 5 Runes (from Context7 `/websites/svelte_dev`)

**`$effect` cleanup — confirmed semantics:**
```svelte
<script>
  let count = $state(0);
  $effect(() => {
    const interval = setInterval(() => { count += 1; }, 1000);
    return () => clearInterval(interval); // fires before re-run AND on unmount
  });
</script>
```
The cleanup function executes (a) before the effect re-runs when dependencies change, and (b) when the component unmounts. `$effect` does NOT run during SSR — this is confirmed in docs. The agent should flag any `$effect` that sets up resources (timers, listeners, subscriptions) without a cleanup return.

**`untrack()` — preventing infinite loops:**
```javascript
$effect(() => {
  const value = someState;
  untrack(() => {
    someState = value + 1; // write without triggering re-run
  });
});
```
The agent should flag `$effect` bodies that both read and write the same `$state` variable without `untrack()` — this creates an infinite loop.

**`tick()` — DOM measurement timing:**
```javascript
import { tick } from 'svelte';
// After state change, wait for DOM update before measuring
await tick();
const height = element.offsetHeight; // now reflects updated DOM
```
The agent should flag DOM measurements (`.offsetHeight`, `.getBoundingClientRect()`, etc.) immediately after `$state` mutations without an intervening `tick()` call.

**Key race condition patterns for the agent prompt:**
1. `$effect` that calls `setTimeout` without storing and clearing the timeout ID in cleanup
2. `$state` array/object mutation via `.push()`/`.splice()` — these DO trigger reactivity in Svelte 5 (proxied), but replacing the entire array does NOT trigger effects that only read individual elements
3. `$derived` that performs side effects (should be `$effect` instead)
4. Multiple `$effect` blocks racing on the same shared `.svelte.ts` singleton state

**Frontmatter:**

```yaml
---
name: svelte5-races-reviewer
description: "Reviews Svelte 5 and Astro code for race conditions, timing issues, and reactive lifecycle problems. Use after implementing or modifying Svelte components, Astro islands, or async UI code."
model: inherit
---
```

**Cross-reference updates needed:**
- `skills/orchestrating-swarms/SKILL.md` (line 358) — confirmed reference to `julik-frontend-races-reviewer`
- `README.md` (line 29) — agent table entry
- Any agent `<examples>` blocks that mention Stimulus controllers

**Files touched:**
- Delete: `agents/review/julik-frontend-races-reviewer.md`
- Create: `agents/review/svelte5-races-reviewer.md`
- Update: any files referencing old agent name

#### Item 2: Astro Island Architecture Reviewer

**Action:** Create new agent file at `agents/review/astro-island-reviewer.md`.

**Review checklist the agent enforces:**

1. **Hydration directive correctness**
   - `client:load` — only for above-the-fold, immediately interactive components
   - `client:visible` — for below-the-fold components (IntersectionObserver trigger)
   - `client:idle` — for non-critical interactivity (requestIdleCallback trigger)
   - `client:only="svelte"` — for components that use browser APIs and cannot SSR at all (e.g., Canvas-based ColorPicker) (from SpecFlow Gap 12)
   - `client:media` — for responsive-only components
   - Flag: wrong directive choice (e.g., `client:load` on a footer component)

2. **SSR safety**
   - No `window`, `document`, `navigator`, `localStorage` access in server-rendered `.astro` file frontmatter or component top-level
   - `$effect` in server context silently no-ops — flag as misleading
   - Browser API access must be inside `onMount` or guarded by `import.meta.env.SSR` / `typeof window !== 'undefined'`

3. **Shared state contract enforcement**
   - `.svelte.ts` module-level `$state` singletons are the ONLY cross-island communication mechanism
   - No custom events, no DOM attributes, no global variables for cross-island state
   - Flag dynamic imports that might break Vite module deduplication
   - Flag separate entry points that could create duplicate module instances

4. **Vite module deduplication assumptions**
   - All islands sharing state MUST import from the same module path (no aliased re-exports)
   - Mixed hydration directives still share the same singleton — this is an ES module guarantee, not an Astro guarantee
   - Flag any code that assumes hydration order (islands may hydrate in any order)

5. **CSP and build output**
   - Inline `<script>` tags generated by Astro island hydration may conflict with strict CSP policies on GitHub Pages
   - Flag if project sets CSP headers — recommend `unsafe-inline` exception or nonce-based approach for island scripts
   - Static build output should not contain unexpected inline scripts beyond Astro's hydration bootstrap

**Frontmatter:**

```yaml
---
name: astro-island-reviewer
description: "Reviews Astro pages and components for hydration directive correctness, SSR safety, cross-island state contract enforcement, and build output issues. Use after creating or modifying .astro files or cross-island shared state."
model: inherit
---
```

### Research Insights: Astro Island Architecture (from Context7 `/websites/astro_build_en`)

**Confirmed hydration directive behavior:**
```astro
<!-- JS loads immediately on page load -->
<InteractiveButton client:load />

<!-- JS loads when component scrolls into viewport (IntersectionObserver) -->
<InteractiveCounter client:visible />

<!-- Component renders ONLY on client, no SSR at all -->
<InteractiveModal client:only="svelte" />
```

**Key insight for the agent:** `client:only="svelte"` is critical for components that use browser APIs at the top level (Canvas, Web Audio, etc.). Without it, the component will attempt SSR and fail silently or throw. The agent should recommend `client:only` when it detects `document`, `window`, `canvas`, or `navigator` usage at component top level.

**Island isolation model:** By default, Astro strips ALL client-side JavaScript. Only components with `client:*` directives get JavaScript sent to the browser. This means the agent should flag any component that expects interactivity but lacks a `client:*` directive — it will render as static HTML.

**Files touched:**
- Create: `agents/review/astro-island-reviewer.md`

#### Batch 1 Completion Steps

1. Update `plugin.json`: bump version to `1.1.0`, update agent count to 18 (added 1, renamed 1), **update description string to match new counts**
2. Update `CHANGELOG.md`: document both changes
3. Update `README.md`: update agent table
4. **Raise review pipeline serial threshold:** In `skills/review/SKILL.md` (line 82), change the auto-serial threshold from 5 to 8 agents. Without this, the pipeline silently switches to serial mode when >5 agents are configured, contradicting the parallel execution assumption.
5. **Update setup skill defaults:** In `skills/setup/SKILL.md`, add `svelte5-races-reviewer` and `astro-island-reviewer` to the TypeScript stack defaults. This prevents `/cce:setup` from overwriting manually-added agents if re-run.
6. Update `cce.local.md` in project root:
   - Add `svelte5-races-reviewer` and `astro-island-reviewer` to `review_agents`
   - New list: `[kieran-typescript-reviewer, code-simplicity-reviewer, performance-oracle, architecture-strategist, svelte5-races-reviewer, astro-island-reviewer]`
5. Also update `plan_review_agents` if Astro island review is valuable during plan review:
   - New list: `[kieran-typescript-reviewer, code-simplicity-reviewer, architecture-strategist, astro-island-reviewer]`
6. Commit in fork git repo: `git add -A && git commit -m "feat: add svelte5-races-reviewer and astro-island-reviewer (v1.1.0)"`
7. Reinstall: `claude plugin uninstall cce@cce-marketplace && claude plugin install cce@cce-marketplace`
8. Verify in new session: confirm both agents appear in agent list, confirm `/cce:review` would invoke them

---

### Batch 2 — Quick Wins (v1.1.0 -> v1.2.0)

#### Item 3: Fix All Ruby/Rails References

**Action:** Audit and replace all Ruby/Rails references across all 17 agents and 35 skills.

**Scan command:**

```bash
cd ~/claude-plugins/cce-marketplace/plugins/cce
grep -rn -i 'ruby\|\.rb\|rails\|gemfile\|bundle show\|bundle exec\|rake\|ActiveRecord\|ActiveStorage\|turbo-rails' --include='*.md' .
```

**Known locations from research:**

| File | Lines | Current | Replacement |
|------|-------|---------|-------------|
| `skills/plan/SKILL.md` | 213-220 | Ruby `class Test` example | TypeScript component example |
| `skills/plan/SKILL.md` | 489-495 | `app/services/user_service.rb:42` | `src/lib/services/userService.ts:42` |
| `skills/plan/SKILL.md` | 124 | `app/services/example_service.rb:42` | `src/components/ExampleComponent.svelte:42` |
| `agents/research/framework-docs-researcher.md` | 11, 17 | Active Storage, turbo-rails examples | Astro 5, Svelte 5 examples |
| `agents/research/framework-docs-researcher.md` | 48, 55, 73-75 | `bundle show`, `Gemfile.lock` | `npm ls`, `package.json`, `node_modules` |
| `agents/research/best-practices-researcher.md` | 10, 17 | Rails project/API examples | Astro/TypeScript examples |
| `skills/work/SKILL.md` | 106-111 | Rails callbacks, middleware, `after_*` hooks | Svelte reactivity chains, `$effect` dependencies, Astro island hydration boundaries |

**Replacement examples for plan template:**

The MINIMAL template Ruby example becomes:

```typescript
// src/lib/services/quizService.ts
import { z } from "zod";

const QuizResponseSchema = z.object({
  questionId: z.string(),
  quality: z.number().int().min(0).max(5),
  timestamp: z.string().datetime(),
});

export type QuizResponse = z.infer<typeof QuizResponseSchema>;
```

The file path example becomes: `src/components/ProseHighlight.svelte:42`

**Also fix the macOS portability issue** (from SpecFlow): `grep -oP` in the sequence number detection uses Perl regex, which may not work on macOS. Replace with `grep -oE` or `sed`.

### Research Insight: Ruby Cleanup Scope (from architecture review)

The architecture review found **31 files** containing Ruby/Rails references — significantly more than the 7 listed above. Additional files include: `skills/orchestrating-swarms/`, `skills/compound-docs/`, `skills/setup/`, `skills/triage/`, `skills/reproduce-bug/`, `skills/file-todos/`, `skills/test-browser/`, `skills/generate_command/`, and agent files like `security-sentinel`, `performance-oracle`, `bug-reproduction-validator`, `repo-research-analyst`, `learnings-researcher`. Run the full grep scan and fix all matches. **Priority:** Fix the 7 listed files first (these produce visible wrong output), then sweep the remaining 24 (mostly inert prose references).

**Files touched:** ~31 files across agents and skills (full audit required)

#### Item 4: Context7 Framework Hints in Research Agents

**Action:** Add Astro 5 and Svelte 5 specific Context7 instructions to both research agents.

**Pre-step:** Resolve library IDs using Context7 MCP:
- `resolve-library-id("astro")` → get library ID
- `resolve-library-id("svelte")` → get library ID

**Append to `framework-docs-researcher.md`:**

```markdown
## CrowCoder Project-Specific Frameworks

When researching for this project, prioritize these frameworks via Context7:
- **Astro 5**: Use `resolve-library-id("astro")` then `query-docs` for island architecture, hydration directives, static site generation, Vite integration
- **Svelte 5**: Use `resolve-library-id("svelte")` then `query-docs` for runes ($state, $derived, $effect), component lifecycle, SvelteKit integration points
- **Zod v4**: Use `resolve-library-id("zod")` then `query-docs` for schema definition, inference, transforms, discriminated unions
- **Tailwind CSS v4**: Use `resolve-library-id("tailwindcss")` then `query-docs` for Vite plugin setup, custom properties, utility classes
```

**Append similar section to `best-practices-researcher.md`.**

**Resolved library IDs to embed:**
- Svelte: `/websites/svelte_dev` (8203 snippets, high reputation)
- Astro: `/websites/astro_build_en` (2927 snippets, high reputation)
- Zod v4: `/websites/zod_dev_v4` (389 snippets, high reputation)
- Note: the global CLAUDE.md already instructs Context7 usage, so these hints add specificity (which library IDs to use) rather than redundant instructions.

**Files touched:**
- `agents/research/framework-docs-researcher.md`
- `agents/research/best-practices-researcher.md`

#### Item 5: Zod Discipline Rules in kieran-typescript-reviewer

**Action:** Append a new section (section 11) to `agents/review/kieran-typescript-reviewer.md`.

**New section content:**

```markdown
## 11. Zod Schema Discipline

This project uses Zod v4 as the single source of truth for runtime types.

**Rules:**
- `z.infer<typeof Schema>` is the ONLY way to derive TypeScript types from schemas. Never maintain a parallel `interface` or `type` alongside a Zod schema.
- Every parse boundary (localStorage read, JSON import, API response, URL params) MUST call `.parse()` or `.safeParse()`. No `as` casts on untrusted data.
- Schema versioning: any schema used for persistence (localStorage, export files) must include a version field. Migration functions must exist for each version bump.
- Discriminated unions: prefer `z.discriminatedUnion()` over `z.union()` when a discriminant field exists — better error messages and type narrowing.
- Branded types: use `.brand()` or `.transform()` for nominal types like `ISODateString` that need runtime validation beyond structural typing.
- Flag: `z.any()`, `z.unknown()` without immediate narrowing, or schemas that duplicate information already in another schema.
- Zod v4 features: `z.discriminatedUnion()` now supports union and pipe discriminators, and discriminated unions compose (can nest inside each other). Prefer composable discriminated unions for hierarchical state types.
- Zod Mini (`zod/mini`): consider for client-side bundles where bundle size matters. Same parse/safeParse API, smaller footprint.
```

### Research Insight: Zod v4 Specifics (from Context7 `/websites/zod_dev_v4`)

Zod v4 significantly upgrades `z.discriminatedUnion()`:

```typescript
// Composable discriminated unions (new in v4)
const BaseError = z.object({ status: z.literal("failed"), message: z.string() });

const MyResult = z.discriminatedUnion("status", [
  z.object({ status: z.literal("success"), data: z.string() }),
  z.discriminatedUnion("code", [  // nested discriminated union!
    BaseError.extend({ code: z.literal(400) }),
    BaseError.extend({ code: z.literal(500) })
  ])
]);
```

This is directly relevant for the popup state machine schema (`idle | entering | active | exiting`) and SM-2 review state schema.

**Files touched:**
- `agents/review/kieran-typescript-reviewer.md`

#### Batch 2 Completion Steps

1. Update `plugin.json`: bump version to `1.2.0`, **update description string** (no agent/skill count change)
2. Update `CHANGELOG.md`
3. Commit: `git add -A && git commit -m "feat: replace Ruby refs, add Context7 hints, add Zod discipline (v1.2.0)"`
4. Reinstall plugin
5. Verify in new session: run `/cce:plan` and confirm TypeScript examples appear

---

### Batch 3 — Medium Priority (v1.2.0 -> v1.3.0)

#### Item 6: Dev-Gate Checker Skill

**Action:** Create new skill at `skills/dev-gate/SKILL.md`.

**Invocation:** `/cce:dev-gate`

**Behavior:**
1. Run `npm run build` (Astro production build)
2. Scan `dist/` directory for forbidden patterns
3. Report any leaks with file path and line

**Forbidden patterns list** (canonical, maintained in the skill):

```
ParamPanel
GlobalParamPanel
ParamInput
ParamDef
Tunable
__tunable
params-writer
__params/write
createParamAccessor
import.meta.env.DEV  (should be tree-shaken, not present in output)
```

**Skill frontmatter:**

```yaml
---
name: dev-gate
description: "Verify production build contains no dev-only tuning system code. Run after building to catch import.meta.env.DEV gate failures."
---
```

**Files touched:**
- Create: `skills/dev-gate/SKILL.md`

#### Item 7: A11y Reviewer Agent

**Action:** Create new agent at `agents/review/a11y-reviewer.md`.

**Review checklist (WCAG 2.2 AA, grounded in research):**

1. **ARIA live regions** — dynamic text containers MUST have `aria-live="polite"` set on a pre-existing DOM element (not added after content changes). Use `aria-atomic="true"` when partial updates would be confusing (e.g., score changes). Never combine `role="alert"` with `aria-live="assertive"` (causes double-speaking on VoiceOver/iOS).
2. **Modal/popup focus management** — `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to visible heading. Focus trap: Tab/Shift+Tab cycle within dialog only. Escape key dismisses. Focus returns to trigger element on close. Use `inert` attribute on background content.
3. **Keyboard navigation** — all interactive elements reachable via Tab, actionable via Enter/Space. Custom widgets (sliders, color pickers) must support arrow keys. Focus indicators must have >= 3:1 contrast (SC 1.4.11).
4. **ARIA roles and labels** — `role`, `aria-label`, `aria-describedby` on non-semantic interactive elements. Interactive SVG elements need `tabindex="0"`, appropriate role, and keyboard handlers.
5. **Color contrast** — normal text: 4.5:1, large text (>=18.66px bold or >=24px): 3:1, UI components/borders: 3:1 (SC 1.4.3 / 1.4.11). Never use color as sole information channel.
6. **Reduced motion** — use `@media (prefers-reduced-motion: reduce)` with `transition-duration: 0.01ms !important` (not `none` — preserves JS `transitionend` listeners). Check `window.matchMedia('(prefers-reduced-motion: reduce)')` for JS animations.
7. **Progress/score announcements** — wrap in `role="status"` with `aria-live="polite"` and `aria-atomic="true"`. Use `role="progressbar"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`.
8. **SC 2.4.11 (new in WCAG 2.2)** — focused elements must not be entirely obscured by sticky headers, footers, or overlays. Use `scroll-padding` in CSS.
9. **Images and media** — `alt` text on informational images, `aria-hidden="true"` on decorative images
10. **Form inputs** — associated `<label>` elements or `aria-label`

**Frontmatter:**

```yaml
---
name: a11y-reviewer
description: "Reviews UI components for accessibility compliance including ARIA patterns, keyboard navigation, focus management, and screen reader compatibility. Use after creating or modifying interactive components."
model: inherit
---
```

**Files touched:**
- Create: `agents/review/a11y-reviewer.md`

#### Item 8: SM-2 Domain Knowledge Agent

**Action:** Create new research agent at `agents/research/sm2-domain-expert.md`.

**Type:** Research agent (consulted during implementation, not during code review).

**Domain knowledge to encode in prompt (grounded in research):**

**SM-2 formula (from Piotr Wozniak, 1987):**
```
EF' = EF + (0.1 - (5 - Q) * (0.08 + (5 - Q) * 0.02))
if EF' < 1.3 then EF' = 1.3
```

EF deltas by quality: Q5=+0.10, Q4=+0.00, Q3=-0.14, Q2=-0.32, Q1=-0.54, Q0=-0.80

**Interval calculation:**
- n=0 (first): interval = 1 day (FIXED, regardless of EF)
- n=1 (second): interval = 6 days (FIXED, regardless of EF)
- n>=2: interval = round_up(previous_interval * EF)

**On failure (Q < 3):** Reset n=0 and interval=1, but DO NOT reset EF (EF continues to be updated by the formula).

**6 common implementation bugs to flag:**
1. Capping EF at 2.5 — SM-2 has NO upper bound on EF (that's SM-0/SM-1)
2. Resetting EF to 2.5 on failure — only n and interval reset, not EF
3. Using EF in the interval calculation for n=0 or n=1 — first two intervals are fixed constants
4. Treating Q=2 as partial credit — Q<3 is a binary fail, always resets to n=0, interval=1
5. Not updating EF when Q<3 — the EF formula runs on EVERY review including failures
6. Not capping maximum interval — should cap at ~365 days to prevent runaway scheduling

**Overdue card handling:**
SM-2 does not account for overdue reviews. Research on 13 years of Anki data shows retention drops from ~87% to ~75% as overdueness increases. Recommended: cap effective interval used in calculation rather than using full elapsed time.

**Modern alternatives (for awareness):**
FSRS (Free Spaced Repetition Scheduler) is now the Anki default, yields ~20-30% fewer reviews for same retention. SM-2 is still adequate for a learning tool — simpler and well-understood.

**Testing strategies:**
- SM-2 core must be a **pure function** of (quality, repetitions, easeFactor, interval) — no side effects, no time dependency
- Use Vitest `vi.useFakeTimers()` + `vi.setSystemTime()` for scheduling tests
- Test categories: pure formula tests, boundary tests (EF=1.3, Q=0/5), sequence tests (10+ reviews), overdue tests, regression tests from reference implementation

**localStorage persistence pitfalls:**
- `JSON.parse(localStorage.getItem('key'))` throws on corrupted data — always try/catch with fallback
- localStorage capped at ~5MB per origin — consider IndexedDB for large card sets
- Safari private browsing: localStorage exists but has 0-byte quota (throws immediately on write)
- No atomicity across multiple `setItem` calls — write entire state as single JSON blob
- Use `0.01ms` transition duration (not `none`) in `prefers-reduced-motion` to preserve `transitionend` events
- Cross-tab: `storage` events fire in other tabs but NOT the tab that made the change
- Always provide defaults when reading fields that may not exist in older persisted data: `card.lastReviewDate ?? null`

**Frontmatter:**

```yaml
---
name: sm2-domain-expert
description: "Provides domain expertise on the SM-2 spaced repetition algorithm including formula details, edge cases, parameter boundaries, and testing strategies. Use when implementing or debugging spaced repetition features."
model: inherit
---
```

**Files touched:**
- Create: `agents/research/sm2-domain-expert.md`

#### Batch 3 Completion Steps

1. Update `plugin.json`: bump to `1.3.0`, update counts: 20 agents (was 18), 36 skills (was 35), **update description string**
2. Update `CHANGELOG.md`
3. Update `README.md`: add new agents and skill to tables
4. Update `skills/setup/SKILL.md`: add `a11y-reviewer` to TypeScript stack defaults
5. Update `cce.local.md`: add `a11y-reviewer` to `review_agents`:
   - New list: `[kieran-typescript-reviewer, code-simplicity-reviewer, performance-oracle, architecture-strategist, svelte5-races-reviewer, astro-island-reviewer, a11y-reviewer]`
   - Note: `sm2-domain-expert` is a research agent, not added to review pipeline
5. Commit: `git add -A && git commit -m "feat: add dev-gate skill, a11y reviewer, SM-2 expert (v1.3.0)"`
6. Reinstall plugin
7. Verify in new session

**Note:** Dev-gate skill is only meaningfully testable after Astro project is scaffolded (Phase 1 of unified plan). SM-2 agent is most useful during Phase 2 (quiz system). Structural verification (agent loads, skill resolves) is sufficient for now.

---

### Batch 4 — Workflow (v1.3.0 -> v1.4.0)

#### Item 9: Param Sidecar Scaffold Skill

**Action:** Create new skill at `skills/param-scaffold/SKILL.md`.

**Invocation:** `/cce:param-scaffold ComponentName`

**Behavior:**
1. Accept component name as argument (e.g., `ProseHighlight`)
2. Look for existing component file at `src/components/{ComponentName}.svelte`
3. Generate `src/components/{ComponentName}.params.ts` with:
   - Import of `ParamDef` type from `src/lib/param-types.ts`
   - Empty params array with correct typing
   - Default export
4. Print instructions for adding `Tunable` wrapper to the component

**Generated template:**

```typescript
// src/components/{ComponentName}.params.ts
import type { ParamDef } from "../lib/param-types";

export const params: ParamDef[] = [
  // Add parameter definitions here. Examples:
  // { type: "range", key: "opacity", label: "Opacity", min: 0, max: 1, step: 0.1, default: 1 },
  // { type: "color", key: "bgColor", label: "Background", default: "#ffffff" },
  // { type: "toggle", key: "animated", label: "Animate", default: true },
];

export default params;
```

**Skill frontmatter:**

```yaml
---
name: param-scaffold
description: "Generate a .params.ts sidecar file for a tunable Svelte component. Use when creating new components that need dev-time parameter tuning."
---
```

**Files touched:**
- Create: `skills/param-scaffold/SKILL.md`

#### Item 10: Work Skill Astro/Svelte Awareness

**Action:** Modify `skills/work/SKILL.md` to add CrowCoder-specific verification steps.

**Changes to Phase 3 (Quality Check):**

Add after the existing test/lint step:

```markdown
### CrowCoder Project Verification

If working in the CrowCoder project (detected by `cce.local.md` presence):

1. **Build check:** Run `npm run build` — verify Astro production build succeeds with zero errors
2. **Dev server check:** If component changes were made, verify `npm run dev` starts without errors (start, wait 5s for ready message, then stop)
3. **Type check:** Run `npx tsc --noEmit` — verify no TypeScript errors
```

**Changes to System-Wide Test Check table:**

Replace Rails-specific language:

| Current | Replacement |
|---------|-------------|
| "callbacks on models" | "reactive dependencies (`$effect`, `$derived`)" |
| "middleware in the request chain" | "Astro island hydration boundaries" |
| "`after_*` hooks" | "`$effect` cleanup functions and `onDestroy` handlers" |
| "orphaned rows" | "orphaned localStorage entries or stale singleton state" |

**Files touched:**
- Modify: `skills/work/SKILL.md`

#### Batch 4 Completion Steps

1. Update `plugin.json`: bump to `1.4.0`, update skill count to 37 (added `param-scaffold`)
2. Update `CHANGELOG.md`
3. Update `README.md`
4. Verify `/cce:setup` skill includes all new agents (should already be updated from Batch 1 step 5 and Batch 3; if `a11y-reviewer` was missed, add it now)
5. Commit: `git add -A && git commit -m "feat: add param-scaffold skill, update work skill for Astro/Svelte (v1.4.0)"`
6. Reinstall plugin
7. Final verification in new session

---

## Technical Considerations

### Architecture Impacts

- **Agent count:** 17 -> 20 (added `svelte5-races-reviewer` replacement, `astro-island-reviewer`, `a11y-reviewer`, `sm2-domain-expert`; removed `julik-frontend-races-reviewer`)
- **Skill count:** 35 -> 37 (added `dev-gate`, `param-scaffold`)
- **Review pipeline width:** 4 agents -> 7 agents per review. This increases review time but each agent is focused and non-overlapping.

### Performance Implications

- More review agents = longer `/cce:review` runs. **Important:** The review skill auto-switches to serial mode when >5 agents are configured (line 82 of `skills/review/SKILL.md`). Batch 1 raises this threshold to 8 to maintain parallel execution with 7 agents.
- The `dev-gate` skill runs `npm run build` which takes ~10-30s for Astro projects. Acceptable for a manual verification step.


## System-Wide Impact

### Interaction Graph

`/cce:review` reads `cce.local.md` -> gets `review_agents` list -> invokes each agent in parallel -> each agent reads changed files -> produces review output. Adding agents to this list is the only integration point. No callbacks, no middleware.

### Error Propagation

If a new agent's markdown has syntax errors in frontmatter, the plugin loader may skip it silently. Verification step (check agent appears in list) catches this. If an agent produces unhelpful output, it does not block other agents (parallel execution).

### Integration Test Scenarios

1. After Batch 1: Run `/cce:review` on a file containing a `$effect` without cleanup return — verify `svelte5-races-reviewer` flags it
2. After Batch 1: Run `/cce:review` on an `.astro` file with `client:load` on a below-the-fold component — verify `astro-island-reviewer` flags it
3. After Batch 2: Run `/cce:plan` — verify TypeScript examples appear, no Ruby code
4. After Batch 3: Run `/cce:dev-gate` after a build that intentionally includes `ParamPanel` in output — verify it catches it
5. After Batch 4: Run `/cce:param-scaffold ProseHighlight` — verify it creates the `.params.ts` file

## Acceptance Criteria

### Functional Requirements

- [x] `svelte5-races-reviewer` agent exists and is invoked during `/cce:review`
- [x] `astro-island-reviewer` agent exists and is invoked during `/cce:review`
- [x] `a11y-reviewer` agent exists and is invoked during `/cce:review`
- [x] `sm2-domain-expert` research agent exists and can be invoked manually
- [x] `/cce:plan` shows TypeScript/Svelte/Astro examples, zero Ruby code
- [x] Research agents reference `package.json`/`npm` instead of `Gemfile`/`bundle`
- [x] `kieran-typescript-reviewer` includes Zod discipline section
- [x] `/cce:dev-gate` skill resolves and runs
- [x] `/cce:param-scaffold` skill resolves and generates correct template
- [x] `/cce:work` includes Astro build verification steps
- [x] `cce.local.md` review_agents list includes all new review agents
- [x] Plugin version is `1.4.0` after all batches
- [x] Fork git repo has 4 batch commits + initial snapshot

### Non-Functional Requirements

- [x] No existing plugin functionality broken (original agents/skills still work)
- [x] Original `compound-engineering` plugin unaffected
- [x] Each batch independently verifiable in a new session

### Quality Gates

- [x] `plugin.json` agent/skill counts match actual files after each batch
- [x] CHANGELOG updated for each version
- [x] Zero stale cross-references to deleted agent names

## Dependencies & Prerequisites

| Dependency | Required By | Status |
|-----------|------------|--------|
| Fork installed and working | All batches | Done (Phase 5) |
| `docs/brainstorms/` exists | This plan | Done (Phase 6a) |
| Git repo in fork directory | Batch 1 | Prerequisite P1 |
| Context7 library IDs | Batch 2, Item 4 | Prerequisite P2 |
| Astro project scaffolded | Batch 3 dev-gate testing | Blocked on unified plan Phase 1 |
| SM-2 implementation started | Batch 3 SM-2 agent testing | Blocked on unified plan Phase 2 |

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| New agent produces unhelpful/wrong advice | Medium | Low | Agents run in parallel; bad output doesn't block others. Iterate on prompt after real usage. |
| Cross-reference update missed after agent rename | Medium | Low | Grep scan before each batch commit. Git diff review. Confirmed locations: `orchestrating-swarms` (line 358), `README.md` (line 29). |
| Plugin reinstall fails or cache corrupts | Low | Medium | Git repo provides rollback. Worst case: re-extract from upstream. |
| Review pipeline serial mode with 7 agents | Low | Medium | **Mitigated:** Batch 1 raises the 5-agent threshold to 8 in `skills/review/SKILL.md`. |
| `/cce:setup` overwrites custom agents | Low | High | **Mitigated:** Batch 1 updates setup skill defaults to include new agents. |
| Ruby cleanup scope larger than expected | Medium | Low | Architecture review found 31 files. Plan updated to require full audit scan. |
| Zod v4 API changes before project starts | Low | Medium | Pin rules to stable Zod v4 API (composable discriminated unions are confirmed stable). |

## Future Considerations

After all 4 batches, potential follow-ups:
- **Test corpus:** Create deliberately buggy code samples to verify each agent catches what it should
- **Agent tuning:** After real usage, refine agent prompts based on false positives/negatives
- **Upstream sync:** Periodically check upstream compound-engineering for useful additions (new agents, skill improvements)
- **Setup skill update:** More comprehensive stack detection for CrowCoder-specific defaults

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-11-cce-plugin-customization-brainstorm.md](docs/brainstorms/2026-03-11-cce-plugin-customization-brainstorm.md) — Key decisions: batch by priority, overwrite+rename Julik agent, augment TS reviewer for Zod (not separate agent), SM-2 as research type

### Internal References

- Plugin source: `~/claude-plugins/cce-marketplace/plugins/cce/`
- Plugin cache: `~/.claude/plugins/cache/cce-marketplace/cce/1.0.0/`
- Project config: `cce.local.md` (review agents + review context)
- Fork setup history: `fork-compound-engineering-prompt-v4.md`
- Project architecture: `docs/plans/2026-03-11-feat-crowcoder-unified-plan.md`
- Plugin dev conventions: `~/claude-plugins/cce-marketplace/plugins/cce/CLAUDE.md`

### Key Files to Modify

| File | Batch | Action |
|------|-------|--------|
| `agents/review/julik-frontend-races-reviewer.md` | 1 | Delete |
| `agents/review/svelte5-races-reviewer.md` | 1 | Create |
| `agents/review/astro-island-reviewer.md` | 1 | Create |
| `agents/review/kieran-typescript-reviewer.md` | 2 | Append section 11 |
| `agents/research/framework-docs-researcher.md` | 2 | Replace Ruby refs, add Context7 hints |
| `agents/research/best-practices-researcher.md` | 2 | Replace Ruby refs, add Context7 hints |
| `skills/plan/SKILL.md` | 2 | Replace Ruby examples |
| `skills/work/SKILL.md` | 2, 4 | Replace Rails terminology; add Astro verification |
| `skills/dev-gate/SKILL.md` | 3 | Create |
| `agents/review/a11y-reviewer.md` | 3 | Create |
| `agents/research/sm2-domain-expert.md` | 3 | Create |
| `skills/param-scaffold/SKILL.md` | 4 | Create |
| `.claude-plugin/plugin.json` | 1-4 | Version bump + counts |
| `CHANGELOG.md` | 1-4 | Update |
| `README.md` | 1-4 | Update tables |
| `cce.local.md` (project root) | 1, 3 | Add new review agents |
