---
title: "Astro slot children are static HTML — interactive components lose client-side behavior"
tags: [astro, svelte, hydration, island-architecture, slots]
date: 2026-03-12
severity: silent-failure
---

# Astro Slot Hydration Boundary

## Symptom

A Svelte component nested inside another hydrated Svelte component's slot in Astro renders correctly (SSR output looks right) but has zero client-side interactivity. State doesn't update, event handlers don't fire, `bind:group`/`bind:value` don't work. No errors in console.

## Root Cause

Astro renders slot children server-side and passes them as static HTML to the parent component. Without their own `client:*` directive, child components are never hydrated — their Svelte runtime doesn't exist on the client.

```astro
<!-- BROKEN: Quiz rendered as static HTML -->
<Popup client:visible>
  <Quiz question="..." answers={[...]} correctIndex={1} />
</Popup>
```

## Fix

Wrap parent + child in a single Svelte component so they share one hydration boundary:

```svelte
<!-- QuizPopup.svelte -->
<script>
  import Popup from './Popup.svelte';
  import Quiz from './Quiz.svelte';
  let { id, question, answers, correctIndex, ...popupProps } = $props();
</script>
<Popup {id} {...popupProps}>
  <Quiz {id} {question} {answers} {correctIndex} />
</Popup>
```

```astro
<!-- Use wrapper instead of nesting -->
<QuizPopup client:visible id="..." question="..." answers={[...]} correctIndex={1} />
```

## Why It's Hard to Catch

- SSR output looks identical to a working page
- No JavaScript errors
- Build, type-check, and unit tests all pass
- Radio buttons even appear to check (native browser behavior on static `<input type="radio">`)

## Prevention

- Query Astro docs (Context7) when planning features that nest interactive components inside `client:*` islands
- CLAUDE.md convention: "Astro slots are static HTML — interactive children need a wrapper component"
- ADR 002 documents the wrapper pattern decision

## Related

- ADR 002: Island Composition via Wrapper Components
- Astro docs: "Astro components can't provide the client runtime behavior that this pattern requires"
