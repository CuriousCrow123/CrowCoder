<script lang="ts">
  import type { Snippet } from 'svelte';
  import params from './ProseHighlight.params';
  import { createParamAccessor } from '../lib/dev/param-types';
  import { lessonState, setHighlight } from '../lib/state/lesson.svelte';
  import { tunablePromise, type TunableType } from '../lib/dev/lazy';

  let TunableComponent = $state<TunableType | null>(null);
  $effect(() => {
    let cancelled = false;
    tunablePromise?.then((c) => { if (!cancelled) TunableComponent = c; });
    return () => { cancelled = true; };
  });

  let { children: slotContent, id }: {
    children: Snippet;
    id: string;
  } = $props();

  const p = createParamAccessor(params);

  let isActive = $derived(lessonState.activeHighlight === id);

  function handleClick() {
    // Toggle: if already active, deactivate; otherwise activate
    setHighlight(isActive ? null : id);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }
</script>

{#snippet highlight(overrides?: Record<string, number | string | boolean>)}
  <span
    class="prose-highlight"
    class:active={isActive}
    role="button"
    tabindex="0"
    aria-pressed={isActive}
    onclick={handleClick}
    onkeydown={handleKeydown}
    style:--underline-thickness="{p('underlineThickness', 'number', overrides)}px"
    style:--pulse-color={p('pulseColor', 'color', overrides)}
    style:--pulse-duration="{p('pulseDuration', 'number', overrides)}ms"
    style:--active-bg={p('activeBackground', 'color', overrides)}
  >
    {@render slotContent()}
  </span>
{/snippet}

{#if TunableComponent}
  <TunableComponent {params} filePath="./src/components/ProseHighlight.params.ts">
    {#snippet children(overrides)}
      {@render highlight(overrides)}
    {/snippet}
  </TunableComponent>
{:else}
  {@render highlight()}
{/if}

<style>
  .prose-highlight {
    cursor: pointer;
    text-decoration: underline;
    text-decoration-thickness: var(--underline-thickness, 2px);
    text-decoration-color: var(--pulse-color, #6366f1);
    text-underline-offset: 3px;
    padding: 0.05em 0.15em;
    border-radius: 3px;
    transition:
      background-color var(--pulse-duration, 600ms) ease,
      text-decoration-color 200ms ease;
  }

  .prose-highlight:hover {
    background-color: color-mix(in srgb, var(--pulse-color, #6366f1) 8%, transparent);
  }

  .prose-highlight:focus-visible {
    outline: 2px solid var(--pulse-color, #6366f1);
    outline-offset: 2px;
  }

  .prose-highlight.active {
    background-color: var(--active-bg, color-mix(in srgb, var(--accent-color) 12%, transparent));
    text-decoration-color: var(--pulse-color, #6366f1);
    animation: pulse var(--pulse-duration, 600ms) ease-out;
  }

  @keyframes pulse {
    0% { background-color: color-mix(in srgb, var(--pulse-color, #6366f1) 25%, transparent); }
    100% { background-color: var(--active-bg, color-mix(in srgb, var(--accent-color) 12%, transparent)); }
  }

  @media (prefers-reduced-motion: reduce) {
    .prose-highlight {
      transition-duration: 0.01ms !important;
    }
    .prose-highlight.active {
      animation-duration: 0.01ms !important;
    }
  }
</style>
