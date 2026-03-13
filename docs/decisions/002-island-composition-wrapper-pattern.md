# ADR 002: Island Composition via Wrapper Components

## Status

Accepted (2026-03-12)

## Context

CrowCoder uses Astro's island architecture with Svelte 5 components. Quiz components need to be rendered inside Popup components, sharing the same reactive context (Popup controls visibility, Quiz manages interactive state like `selectedIndex`).

The natural Astro pattern — nesting a Svelte component inside another hydrated Svelte component's slot — silently breaks interactivity:

```astro
<!-- BROKEN: Quiz is SSR'd as static HTML, never hydrated -->
<Popup client:visible id="color-primary" trigger="scroll" mode="inline">
  <Quiz id="color-primary" question="..." answers={[...]} correctIndex={1} />
</Popup>
```

Astro renders slot children server-side and passes them as static HTML. Without its own `client:*` directive, Quiz has no client-side runtime — event handlers, `$state`, and `bind:group` don't exist on the client. The HTML looks correct (SSR output is visually identical), but nothing is interactive.

Adding `client:visible` to Quiz would make it a separate island, creating a second problem: Quiz and Popup wouldn't share the same Svelte runtime, so Popup's state machine couldn't control Quiz's visibility.

## Decision

Use **wrapper components** that import both parent and child, keeping them in a single Svelte hydration boundary.

```svelte
<!-- QuizPopup.svelte -->
<script lang="ts">
  import Popup from './Popup.svelte';
  import Quiz from './Quiz.svelte';
  // ...props
</script>

<Popup {id} {trigger} {mode}>
  <Quiz {id} {question} {answers} {correctIndex} />
</Popup>
```

```astro
<!-- index.astro — single island, both components hydrated -->
<QuizPopup client:visible id="color-primary" question="..." answers={[...]} correctIndex={1} />
```

### Why

- Both components share one Svelte runtime — Popup's state machine controls Quiz's lifecycle
- Quiz's `$state`, `bind:group`, and event handlers are fully hydrated
- No architectural change to either component — Popup and Quiz remain independently testable/reusable
- Follows Astro docs: "Inside of an Astro file, framework component children can also be hydrated components" — but only when composed within the same framework component tree

### When to use this pattern

When an interactive Svelte component (child) needs to be rendered inside another hydrated Svelte component's (parent) slot AND the child requires client-side interactivity (state, event handlers, bindings).

### When NOT to use this pattern

- Static content in slots (e.g., `<Hint>` with only `<p>` tags) — SSR is sufficient
- Components that don't need to share reactive context — give each its own `client:*` directive

## Consequences

### Positive

- Interactive components work correctly inside Popup slots
- Clear naming convention (`QuizPopup`) signals the composition
- Each wrapper is a thin component (~20 lines) with no logic

### Negative

- One additional file per composition (QuizPopup.svelte, future HintPopup.svelte if Hint becomes interactive)
- Props must be forwarded through the wrapper (mild boilerplate)
- Developers must know when to use `<QuizPopup>` vs `<Popup><Quiz/></Popup>` — the wrong choice silently fails

## Alternatives Considered

- **Add `client:visible` to Quiz inside Popup's slot**: Creates separate islands that can't share Popup's reactive state machine. Quiz wouldn't know when Popup's `isActive` changes.
- **Merge Popup and Quiz into one component**: Loses reusability. Popup is generic (used for hints, future components). Quiz is reusable outside popups.
- **Use Astro's `<slot>` with client-side re-hydration**: Not supported by Astro's architecture. Slots are always static HTML.

## Related

- ADR 001: Cross-Island State Sharing — establishes that `.svelte.ts` singletons work across islands but this ADR addresses the within-island composition problem
- CLAUDE.md Components section: "Astro slots are static HTML" convention
- Astro docs: "Astro components can't provide the client runtime behavior that this pattern requires"
