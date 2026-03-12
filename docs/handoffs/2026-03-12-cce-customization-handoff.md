---
title: CCE Plugin Customization — Handoff for /cce:work
date: 2026-03-12
---

# Handoff: CCE Plugin Customization

## What to do

Run `/cce:work docs/plans/2026-03-11-001-feat-cce-plugin-customization-plan.md` to execute the 4-batch customization plan.

## Current state

### Fork repo (`~/claude-plugins/cce-marketplace`)

Git-initialized with one commit (`chore: snapshot before customization (v1.0.0)`).

**Partial Batch 1 work in progress (uncommitted):**
- Created: `plugins/cce/agents/review/svelte5-races-reviewer.md`
- Deleted: `plugins/cce/agents/review/julik-frontend-races-reviewer.md`
- Updated cross-refs: `README.md` and `skills/orchestrating-swarms/SKILL.md` (julik → svelte5-races-reviewer)
- NOT yet done from Batch 1: Astro island reviewer, plugin.json version bump, CHANGELOG, serial threshold fix, setup skill defaults, cce.local.md update, commit, reinstall

### Plugin installation

- `cce@cce-marketplace` v1.0.0 installed and cached at `~/.claude/plugins/cache/cce-marketplace/cce/1.0.0/`
- Cache is STALE — does not reflect the uncommitted Batch 1 changes above
- After completing each batch: `claude plugin uninstall cce@cce-marketplace && claude plugin install cce@cce-marketplace` to refresh cache

### Project config (`cce.local.md` in project root)

Current review_agents: `[kieran-typescript-reviewer, code-simplicity-reviewer, performance-oracle, architecture-strategist]`
Plan calls for adding: `svelte5-races-reviewer`, `astro-island-reviewer` (Batch 1), `a11y-reviewer` (Batch 3)

## Key context for /cce:work

- **Fork location:** `~/claude-plugins/cce-marketplace/plugins/cce/`
- **Plan file:** `docs/plans/2026-03-11-001-feat-cce-plugin-customization-plan.md`
- **Skill name resolution:** Plugin loader uses `{namespace}:{directory-name}`, NOT frontmatter `name:` field
- **Cache update method:** `uninstall` + `install` (not `update` — same version won't trigger refresh)
- **Context7 library IDs** (already resolved in plan): Svelte=`/websites/svelte_dev`, Astro=`/websites/astro_build_en`, Zod v4=`/websites/zod_dev_v4`
- **Serial threshold:** Review pipeline auto-switches to serial at >5 agents. Plan targets 7 agents. Batch 1 must raise threshold to 8 in `skills/review/SKILL.md`.

## Batches remaining

1. **Batch 1** (partially started) — Svelte5 races reviewer (done), Astro island reviewer (not done), completion steps (not done)
2. **Batch 2** — Fix all Ruby/Rails refs (~31 files), Context7 hints in research agents, Zod discipline in kieran-typescript-reviewer
3. **Batch 3** — Dev-gate skill, a11y reviewer agent, SM-2 domain expert agent
4. **Batch 4** — Param scaffold skill, work skill Astro/Svelte awareness updates
