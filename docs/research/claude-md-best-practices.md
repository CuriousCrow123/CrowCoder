# CLAUDE.md Best Practices

A project-agnostic reference for writing effective CLAUDE.md files for Claude Code.

## Structure and Section Ordering

Target **under 200 lines** per CLAUDE.md file. If growing beyond that, split with `.claude/rules/` directory (auto-loaded) or `@path/to/file` imports (up to 5 hops).

**Recommended section order:**

1. **Project identity** — one-liner describing what the project is (orients Claude before specifics)
2. **Stack** — technologies, versions, key constraints
3. **Architecture** — directory layout, data flow, key patterns
4. **Commands** — build, test, lint, deploy (exact copy-pasteable commands)
5. **Conventions** — code style rules that differ from defaults, naming patterns
6. **Gotchas / Warnings** — non-obvious behaviors, things that break subtly
7. **File structure** — only if the layout is unusual or critical

**Include:** bash commands Claude can't guess, style rules that differ from defaults, testing instructions, repo etiquette, architectural decisions, dev environment quirks, common gotchas.

**Exclude:** anything Claude can figure out by reading code, standard language conventions, detailed API docs (link instead), frequently-changing info, long tutorials, file-by-file descriptions, self-evident practices ("write clean code").

## Language Patterns

### Imperative over suggestive

State requirements as directives, not suggestions. Claude responds better to clear mandates than to options.

- Effective: "Use named exports, not default exports"
- Less effective: "Consider using named exports"

### Provide context for "why"

Claude generalizes from explanations. A rule with a reason is followed more reliably than a bare prohibition.

- Less effective: `NEVER use ellipses`
- More effective: `Never use ellipses — the text-to-speech engine cannot pronounce them`

### Concrete over abstract

Write instructions that are concrete enough to verify.

- "Use 2-space indentation" not "Format code properly"
- "API handlers live in `src/api/handlers/`" not "Keep files organized"

## XML Tags

XML tags are **not required** in CLAUDE.md — official examples use plain markdown. They are effective when you need to:

1. **Separate behavioral domains** — grouping conceptually distinct instruction sets (e.g., `<tools>`, `<preferences>`, `<workflow>` in a global CLAUDE.md)
2. **Create named behavioral blocks** — Anthropic's own prompts use patterns like `<default_to_action>`, `<investigate_before_answering>`. These act as semantic containers that Claude treats as coherent instruction units.
3. **Distinguish instructions from data** — when embedding code examples or reference material alongside directives

**When NOT to use:** for simple, flat lists of conventions, plain markdown headers and bullets are sufficient and more readable. XML adds overhead without benefit when structure is already clear.

**Effective pattern:** descriptive-kebab-case tag name that summarizes the behavioral directive inside:

```xml
<investigate_before_answering>
Never speculate about code you have not opened. If the user references
a specific file, you MUST read the file before answering.
</investigate_before_answering>
```

## Directive Styles and Priority Signaling

### Effectiveness tiers

1. **Highest compliance — positive directives with context:** "Use ES modules (import/export), not CommonJS (require)" — clear, verifiable, states both what to do and avoid
2. **High compliance — conditional rules:** "When X, do Y" — works well for context-dependent behavior
3. **Moderate compliance — bare prohibitions:** "NEVER use X" — followed but Claude can't generalize to related cases without a reason
4. **Lowest compliance — vague preferences:** "Keep code clean" — too abstract to verify or follow

### Priority signaling

- **Structural position** — rules higher in the file get more attention. Put the most important conventions first.
- **Section naming** — a dedicated "Security Rules" section signals importance through naming.
- **Bold emphasis** — `**NEVER** use {@html} with runtime data` — moderate, effective emphasis.
- **CAPS sparingly** — reserve for genuine invariants (security, data loss). Normal direct language works better for standard conventions.
- **Hooks for absolutes** — if a rule must be followed with zero exceptions, convert it from a CLAUDE.md instruction to a hook. Hooks are deterministic; instructions are advisory.

## File Hierarchy

Files load in this order, all merged into context:

| Level | Location | Content | Shared? |
|-------|----------|---------|---------|
| Managed policy | `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS) | Organization-wide standards | All users |
| User global | `~/.claude/CLAUDE.md` | Personal workflow, tool preferences, cross-project defaults | No (personal) |
| Project root | `./CLAUDE.md` | Stack, architecture, conventions, build commands | Yes (git) |
| Parent dirs | `./parent/CLAUDE.md` | Useful in monorepos | Yes (git) |
| Child dirs | `./child/CLAUDE.md` | Loaded on-demand when Claude works in that directory | Yes (git) |
| Rules dir | `.claude/rules/*.md` | Modular deep-dives; auto-load with same priority as root | Yes (git) |
| Local override | `CLAUDE.md.local` | Personal overrides that conflict with team settings | No (gitignored) |

More specific locations take precedence. Child directory CLAUDE.md files load on-demand, not at launch.

Path-scoped rules in `.claude/rules/` support YAML frontmatter for glob-based scoping:

```markdown
---
paths:
  - "src/api/**/*.ts"
---
# API Development Rules
- All API endpoints must include input validation
```

## Anti-Patterns and the Deletion Test

### The deletion test

For each line, ask: "Would removing this cause Claude to make mistakes?" If not, cut it.

### Common anti-patterns

1. **Over-specified files** — if CLAUDE.md is too long, important rules get lost in the noise. If Claude keeps doing something wrong despite having a rule, the file is probably too long.
2. **Duplicating linter duties** — LLMs are expensive and slow compared to formatters. Let `prettier`/`eslint` handle formatting; save CLAUDE.md for what they can't enforce.
3. **Auto-generated without editing** — `/init` output includes filler that dilutes important instructions. Manually craft and prune every line.
4. **Stale code snippets** — use `@` file references rather than inline code that becomes outdated.
5. **Contradictory rules** — if two rules contradict, Claude picks one arbitrarily. Review periodically.
6. **Documenting every scenario** — CLAUDE.md should cover patterns, not exhaustive cases. Use `.claude/skills/` for domain knowledge that's only sometimes relevant.

### The instruction budget

Research suggests ~150-200 effective instructions before adherence degrades. Since Claude Code's system prompt contains ~50 internal instructions, the effective budget is roughly 100-150 instructions in CLAUDE.md.

## Claude 4.x Model-Specific Considerations

Claude Opus 4.5/4.6 and Sonnet 4.6 are **more responsive to the system prompt** than previous models. If prompts were designed to reduce undertriggering, these models may now overtrigger.

- Where you used `CRITICAL: You MUST use this tool when...`, use `Use this tool when...`
- Normal, direct language is preferred over emphatic language
- Reserve CAPS/MUST/CRITICAL for genuine invariants where violation causes real harm
- If everything is "CRITICAL," nothing is

## Community Patterns

### Living document culture

Every time Claude makes a mistake: fix the code, add or refine a rule in CLAUDE.md, commit both together. The longer a team works this way, the smarter the agent gets.

### Hooks over CLAUDE.md for absolute rules

If a rule must be followed with zero exceptions (run linter after edit, block writes to certain files), convert it from a CLAUDE.md instruction to a hook. Advisory instructions can be ignored; hooks are deterministic.

### Skills over CLAUDE.md for situational knowledge

For knowledge that only applies sometimes (specific API patterns, migration workflows, deployment procedures), use `.claude/skills/` — they load on-demand rather than consuming context every session.

### Compaction instructions

Include instructions for how Claude should behave during auto-compaction:

```markdown
# Compact instructions
When compacting, always preserve the full list of modified files and any test commands.
```

## Sources

- [Best Practices for Claude Code — Official Docs](https://code.claude.com/docs/en/best-practices)
- [Memory and CLAUDE.md Files — Official Docs](https://code.claude.com/docs/en/memory)
- [Claude 4.x Prompt Engineering — Anthropic API Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices)
- [XML Tags in Prompts — Anthropic API Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/use-xml-tags)
- [How Anthropic Teams Use Claude Code (PDF)](https://www-cdn.anthropic.com/58284b19e702b47.pdf)
- [Writing a Good CLAUDE.md — HumanLayer Blog](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
- [How to Write a Good CLAUDE.md — Builder.io](https://www.builder.io/blog/claude-md-guide)
- [Claude Code Best Practices — Sidetool](https://www.sidetool.co/post/claude-code-best-practices-tips-power-users-2025)
