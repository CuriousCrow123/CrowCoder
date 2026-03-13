---
title: "Convention: Svelte 5 form input bindings"
type: docs
status: brainstorm
date: 2026-03-12
---

# Convention: Svelte 5 form input bindings

## What We're Building

A new CLAUDE.md convention and reviewer check to prevent a class of Svelte 5 runes-mode bugs where form inputs appear interactive but silently fail to update reactive state.

## The Bug

**Symptom:** Quiz radio buttons visually select (native browser `:checked` rendering), but the `selectedIndex` state variable stays `null`. The Submit button remains disabled because `disabled={selectedIndex === null}` never re-evaluates.

**Root cause:** In Svelte 5 runes mode, `checked={expr}` (without `bind:`) creates a **strictly controlled** input. Svelte owns the `checked` property and resets any native user interaction. The `onchange` handler never fires because the browser's state change is overridden.

This is a Svelte 4-to-5 behavioral change. In Svelte 4, `checked={expr}` was a loose one-way binding that allowed native interaction. In Svelte 5 runes mode, it's read-only.

**Current broken pattern (Quiz.svelte:113-119):**

```svelte
<input
  type="radio"
  checked={selectedIndex === i}
  onchange={() => selectedIndex = i}
/>
```

**Fix:** Use Svelte 5's `bind:group` for radio groups (or `bind:checked` / `bind:value` for other input types):

```svelte
<input
  type="radio"
  bind:group={selectedIndex}
  value={i}
/>
```

## Why This Approach

The `bind:` directive is Svelte 5's intended API for interactive form inputs. It handles two-way state synchronization, radio group semantics, and type coercion correctly. The manual `checked` + `onchange` pattern is a React-ism that doesn't translate to Svelte 5's reactivity model.

## Scope of Impact

| File | Pattern | Risk |
|------|---------|------|
| `Quiz.svelte:118` | `checked={expr}` + `onchange` on radio | **Production bug** |
| `ParamInput.svelte:24` | `value={expr}` on range input | Dev-only, may be broken |
| `ParamInput.svelte:32` | `value={expr}` on text input | Dev-only, may be broken |
| `ParamInput.svelte:40` | `checked={expr}` on checkbox | Dev-only, may be broken |

Zero `bind:` directives exist in the codebase today.

## Key Decisions

1. **Convention location:** Add to CLAUDE.md under the existing "State" section (it's about Svelte reactivity patterns) — one bullet, terse
2. **Reviewer check:** Add to the `svelte5-races-reviewer` agent (or `astro-island-reviewer` if more appropriate) — flag bare `checked={expr}` / `value={expr}` on interactive inputs without `bind:`
3. **Fix scope:** Fix `Quiz.svelte` (production). Fix `ParamInput.svelte` opportunistically (dev-only, lower priority)
4. **Context7 coverage:** Likely not covered — this is a migration gotcha, not happy-path API docs

## Convention Text (Draft)

**CLAUDE.md bullet (State section):**

```markdown
- Use `bind:value`, `bind:checked`, or `bind:group` for interactive form inputs — bare `value={expr}` or `checked={expr}` in Svelte 5 runes mode makes inputs read-only (state won't update on user interaction)
```

## Resolved Questions

1. **Convention location:** State section in CLAUDE.md (it's about Svelte reactivity patterns)
2. **ParamInput scope:** Fix in the same PR as Quiz — small change, same root cause
