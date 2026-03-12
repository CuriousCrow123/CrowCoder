---
title: "docs: Research CLAUDE.md best practices and improve project CLAUDE.md"
type: docs
status: completed
date: 2026-03-12
---

# Research CLAUDE.md Best Practices & Improve Project CLAUDE.md

## Overview

Research and document best practices for writing effective CLAUDE.md files, save findings as a project-agnostic reference, then apply learnings to improve the CrowCoder CLAUDE.md.

## Deliverables

### Deliverable 1: Generic Research Document

**File:** `docs/research/claude-md-best-practices.md`

A project-agnostic reference covering CLAUDE.md authoring best practices. Organized by topic, concise, with sources. Useful as a personal reference and shareable guide for future projects.

**Sections:**
- Structure and section ordering
- Language patterns (imperative, context-driven "why")
- XML tags — when to use vs plain markdown
- Directive styles and priority signaling
- File hierarchy (global, project, rules, local)
- Anti-patterns and the deletion test
- Claude 4.x model-specific considerations
- Community patterns (living document, hooks over rules)

**Key findings to document:**

1. **Target under 200 lines per file.** Split with `.claude/rules/` or `@` imports when growing.
2. **Recommended section order:** Project identity → Stack → Architecture → Commands → Conventions → Gotchas → File structure.
3. **Imperative language with "why" context** is most effective. Claude generalizes from explanations better than bare rules.
4. **Claude 4.x models overtrigger on excessive emphasis.** Use CAPS/MUST sparingly — reserve for genuine invariants (security, data loss). Normal direct language works better now.
5. **The deletion test:** For each line, ask "would removing this cause Claude to make mistakes?" If not, cut it.
6. **Hooks > CLAUDE.md for absolute rules.** Advisory instructions can be ignored; hooks are deterministic.
7. **Don't duplicate linter duties.** If `prettier`/`eslint` handle it, don't waste CLAUDE.md context on it.
8. **XML tags** are effective for grouping behavioral domains (especially in global files) but unnecessary for flat convention lists where markdown headers suffice.
9. **Inline examples** eliminate ambiguity — short `(eg. import { foo } from 'bar')` patterns are highly effective.
10. **Every mistake becomes a rule** — treat CLAUDE.md as a living document. Fix code + add rule in same commit.

**Sources to cite:**
- Anthropic official Claude Code docs (memory, best practices)
- Anthropic prompt engineering guide (Claude 4.x best practices, XML tags)
- Anthropic internal usage PDF
- HumanLayer blog (writing a good CLAUDE.md)
- Builder.io guide
- Sidetool community patterns

### Deliverable 2: Improved Project CLAUDE.md

**File:** `CLAUDE.md`

Apply research findings to the existing 87-line file. Target: ~100-120 lines after improvements (well under 200-line guideline).

#### Changes to make

**Add:**

1. **Project one-liner** at the very top — orients Claude before specifics:
   ```
   Interactive learning site for programming concepts, built with Astro + Svelte islands.
   ```

2. **Commands section** after Stack — derived from `package.json`:
   ```markdown
   ## Commands
   - `npm run dev` — local dev server
   - `npm run build` — production build
   - `npx vitest` — run tests
   - `npx astro check` — type checking
   ```

3. **Quantify "small variant counts"** — change to "3 or fewer variants" in the Components section.

**Improve:**

4. **Split the dense children/slotContent bullet** (line 44) into two clear bullets:
   - One about Astro slot → children prop mapping
   - One about aliasing to slotContent to avoid Tunable collision

5. **Annotate Phase 2 files** in the file structure tree with `# (Phase 2 — not yet created)` to prevent Claude from assuming they exist on disk.

6. **Reduce emphasis levels** per Claude 4.x guidance — audit CAPS usage. Keep `**NEVER**` for the security `{@html}` rule (genuine invariant). Soften others to normal direct language where appropriate.

**Keep as-is:**

7. **Commit format in project CLAUDE.md** — even though it duplicates the global file. Rationale: project CLAUDE.md is team-facing and checked into git. Collaborators cloning the repo need to see commit conventions without depending on a personal global config.

8. **Do NOT extract sections to `.claude/rules/`** — the file is well under 200 lines and the project is young. Premature modularization adds indirection without benefit.

9. **Do NOT add accessibility, import conventions, or phase definitions** — these require design decisions not yet made. Adding aspirational rules that don't reflect actual practice contradicts the deletion test.

**Do NOT change the global `~/.claude/CLAUDE.md`** — it is well-structured with effective XML tag usage. Accept the minor commit-format duplication.

## Acceptance Criteria

- [x] `docs/research/claude-md-best-practices.md` exists as a self-contained, project-agnostic reference with sources
- [x] Project `CLAUDE.md` has a one-liner project description at the top
- [x] Project `CLAUDE.md` has a Commands section with actual project commands
- [x] The children/slotContent bullet is split into two clear bullets
- [x] "Small variant counts" is quantified (3 or fewer)
- [x] Phase 2 files in the tree are annotated as not yet created
- [x] Emphasis levels are audited (CAPS reserved for genuine invariants only)
- [x] Final CLAUDE.md is under 200 lines (99 lines)
- [x] Two atomic commits: one for research doc, one for CLAUDE.md improvement

## Context

### Why now

The project is in early Phase 1 scaffolding. Establishing a well-crafted CLAUDE.md now compounds across every future Claude session. Small improvements in instruction clarity have outsized effects when multiplied across hundreds of sessions.

### Scoping decisions

- **Deferred:** Accessibility conventions, import ordering rules, `.claude/rules/` extraction, phase definitions in CLAUDE.md — all require upstream design decisions
- **Included:** Only factual additions (commands, project description) and clarity improvements (splitting dense bullets, quantifying vague thresholds, annotating nonexistent files)
- **Rationale:** The deletion test applies in reverse too — don't add rules that don't reflect actual practice

### Research sources

- [Best Practices for Claude Code — Official Docs](https://code.claude.com/docs/en/best-practices)
- [Memory and CLAUDE.md Files — Official Docs](https://code.claude.com/docs/en/memory)
- [Claude 4.x Prompt Engineering — Anthropic API Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices)
- [XML Tags in Prompts — Anthropic API Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/use-xml-tags)
- [How Anthropic Teams Use Claude Code (PDF)](https://www-cdn.anthropic.com/58284b19e702b47.pdf)
- [Writing a Good CLAUDE.md — HumanLayer Blog](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
- [How to Write a Good CLAUDE.md — Builder.io](https://www.builder.io/blog/claude-md-guide)
