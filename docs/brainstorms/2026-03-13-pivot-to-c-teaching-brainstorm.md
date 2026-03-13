# Brainstorm: Pivot from Color Theory to C Programming

**Date:** 2026-03-13
**Status:** Accepted

## What We're Building

Strip CrowCoder of all color-theory lesson content and reduce to base architecture, preparing the platform to teach C programming instead.

## Why This Approach

The existing architecture (Astro + Svelte islands, quiz/popup system, SM-2 spaced repetition, progress persistence, dev tuning) is fully domain-agnostic. Only 3 files need deletion and 4 need surgical edits. A clean strip-down preserves all infrastructure investment while clearing the content slate.

## Key Decisions

1. **Delete color-theory-specific files:**
   - `src/components/ColorPicker.svelte`
   - `src/components/ColorPicker.params.ts`

2. **Replace `index.astro` with minimal placeholder:**
   - Base layout import, "CrowCoder — Learn C" title, brief placeholder content
   - No lesson structure yet — that comes during content planning

3. **Empty the `ComponentValueRegistry` in `types.ts`:**
   - Remove the `colorPicker` entry entirely
   - Leave the registry pattern intact but empty — new entries added when we build C-teaching components

4. **Update references in supporting files:**
   - `lesson.svelte.test.ts` — swap color-specific test data for generic placeholders
   - `architecture.md` — remove ColorPicker from component inventory, update domain examples
   - `CLAUDE.md` — remove color theory references

5. **Keep everything else untouched:**
   - Layout, styles, popup system, quiz engine, progress/SM-2, persistence
   - Dev tuning system, dark mode, scroll observer, all ADRs and solution docs
   - Build config, CI/CD, test infrastructure

## Open Questions

None — scope is well-defined. Strip content, preserve architecture, begin C lesson planning next.
