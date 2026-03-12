---
title: "docs: CCE Fork Reference Documentation"
type: docs
status: completed
date: 2026-03-12
---

# docs: CCE Fork Reference Documentation

Rewrite the CCE plugin's README.md into comprehensive reference documentation covering what changed, how to use it, and how to maintain it.

## Acceptance Criteria

- [x] Rewrite `~/claude-plugins/cce-marketplace/plugins/cce/README.md` — full from-scratch rebuild (existing content is deeply stale)
- [x] Document all 20 agents with fork status (new/modified/inherited) and one-line descriptions (from frontmatter)
- [x] Document all 37 skills with invocation syntax and fork status (note 5 deprecated `workflows-*` aliases)
- [x] Document MCP server (Context7): auto-load behavior, tool names (`mcp__plugin_cce_context7__*`), resolved library IDs, API key setup
- [x] Document per-project config (`cce.local.md`): YAML frontmatter schema (`review_agents`, `plan_review_agents`), freeform body as review context, fallback behavior when missing
- [x] Document maintenance workflow with post-edit verification checklist (edit → commit → uninstall → install → new session → verify skill resolves)
- [x] Document coexistence strategy (`cce:` vs `ce:` prefix)
- [x] Document upstream sync procedure and what to watch for
- [x] Document skill resolution mechanics: plugin loader uses `{namespace}:{directory-name}`, NOT frontmatter `name:` field — critical for adding new skills
- [x] List known issues and deliberate decisions (stale report-bug, empty agents/docs/, deprecated aliases, upstream URLs in plugin.json)
- [x] Fix `CLAUDE.md` stale directory structure (line 38: `skills/ce-*/` → actual directory names)
- [x] Fix `plugin.json` missing `CONTEXT7_API_KEY` header in MCP server config (one-line bug fix)
- [x] Update `fork-compound-engineering-prompt-v4.md` to reference the new README as the canonical docs
- [x] README must be self-contained — operational info should not depend on fork-prompt document

## Context

The fork's current README.md is stale from upstream — it reports "20 agents, 22 commands, 22 skills" but actual counts are 20 agents, 37 skills. The execution log (`fork-compound-engineering-prompt-v4.md`) contains all the information but is structured as a phase-by-phase build log, not reference documentation.

**Target audience:** Alan in future sessions, and any AI assistant working in the CrowCoder project who needs to understand the fork's capabilities and maintenance procedures.

**Source material:**
- `fork-compound-engineering-prompt-v4.md` — resolved decisions table, phase results
- Fork files at `~/claude-plugins/cce-marketplace/plugins/cce/` — agents, skills, plugin.json, CHANGELOG.md
- `cce.local.md` — per-project config example

## MVP

### README.md Structure

The rewritten README should follow this structure:

```markdown
# CCE — CrowCoder Compound Engineering Plugin

> Forked from compound-engineering v2.40.0. Customized for Astro 5 + Svelte 5 + Tailwind v4 + Zod v4.

## Quick Start
- Installation status, how to verify it's working
- Key commands: /cce:plan, /cce:work, /cce:review, /cce:brainstorm, /cce:compound

## Coexistence with Original
- cce: prefix vs ce: prefix
- Both plugins can be installed simultaneously
- When to use which

## What Changed from Upstream

### New Agents (4)
- Table: name, version added, purpose

### Modified Agents (2)
- Table: name, what changed

### Deleted Agents (11)
- List with rationale (Ruby/Rails/Python specific, Every-specific)

### New Skills (2)
- Table: name, invocation, purpose

### Deleted Skills (12)
- List with rationale

### Cross-Cutting Changes
- Ruby/Rails → TypeScript/Astro/Svelte reference replacement (~22 files)
- Context7 framework hints with resolved library IDs
- Review pipeline serial threshold raised from 5 to 8

## Available Commands
- Complete table of all /cce: skills with descriptions

## Agents Reference
- Tables by category (review, research, design, workflow)
- Which are in the active review config vs available but not configured

## MCP Server
- Context7 auto-loads as `plugin:cce:context7`
- Tool names: `mcp__plugin_cce_context7__resolve-library-id`, `mcp__plugin_cce_context7__query-docs`
- Resolved library IDs: Astro `/websites/astro_build_en`, Svelte `/websites/svelte_dev`, Zod `/websites/zod_dev_v4`
- API key: `CONTEXT7_API_KEY` env var (document how to set)

## Per-Project Configuration (cce.local.md)
- YAML frontmatter schema:
  - `review_agents`: array of agent names for /cce:review
  - `plan_review_agents`: array of agent names for /cce:plan review step
- Freeform markdown body = review context injected into review agents
- File must live in project root
- If missing, /cce:review invokes /cce:setup to create it
- Example from CrowCoder project (full contents)

## Maintenance

### Editing the Fork
1. Edit files at ~/claude-plugins/cce-marketplace/plugins/cce/
2. Commit in fork git repo
3. Reinstall: `claude plugin uninstall cce@cce-marketplace && claude plugin install cce@cce-marketplace`
4. Start new session
5. Verify: type `/cce:` and confirm autocomplete, check agent list

### Adding a New Skill
- **Critical:** Directory name determines command name (`{namespace}:{directory-name}`)
- Frontmatter `name:` field is NOT used for resolution
- Example: `skills/my-tool/SKILL.md` → `/cce:my-tool`

### Adding a New Agent
- Place in appropriate category directory (review/, research/, design/, workflow/)
- Update plugin.json agent count
- If review agent: add to `cce.local.md` `review_agents` list

### Syncing with Upstream
- Fork diverged from v2.40.0, versions are independent (1.x.0)
- Check upstream for useful additions periodically
- How to diff: clone upstream, compare plugin subtree
- What to watch for: new agents/skills, plugin loader changes

### Plugin Cache Behavior
- Cached at ~/.claude/plugins/cache/cce-marketplace/cce/1.0.0/
- Copied (not symlinked) — edits require reinstall
- `claude plugin update` won't detect same-version changes — must uninstall+install

## Known Issues & Decisions
- `report-bug` skill points to upstream EveryInc repo (deliberate — don't use for fork issues)
- `plugin.json` homepage/repository point to upstream (historical reference, not the fork's location)
- Empty `agents/docs/` directory (ankane-readme-writer deleted, directory remains)
- 5 deprecated `workflows-*` skill aliases (inherited from upstream, recommend removal in future)
- Skill name resolution uses directory name, not frontmatter `name:` field
- `security-sentinel` agent exists but is not in active review config (available on demand)

## Version History
- Link to CHANGELOG.md for full details
- Summary table: v1.0.0 through v1.4.0
```

## Sources

- Fork execution log: `fork-compound-engineering-prompt-v4.md`
- Fork repo: `~/claude-plugins/cce-marketplace/`
- Per-project config: `cce.local.md`
