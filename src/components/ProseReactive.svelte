<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import params from './ProseReactive.params';
  import { createParamAccessor } from '../lib/dev/param-types';
  import { tunablePromise, type TunableType } from '../lib/dev/lazy';

  let TunableComponent = $state<TunableType | null>(null);
  $effect(() => {
    let cancelled = false;
    tunablePromise?.then((c) => { if (!cancelled) TunableComponent = c; });
    return () => { cancelled = true; };
  });

  let { children: slotContent }: {
    children: Snippet;
  } = $props();

  const p = createParamAccessor(params);

  // Crossfade: detect text changes via MutationObserver and trigger opacity transition
  let reactiveEl = $state<HTMLElement | null>(null);
  let transitioning = $state(false);

  onMount(() => {
    if (!reactiveEl) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    let lastText = reactiveEl.textContent;
    const observer = new MutationObserver(() => {
      const newText = reactiveEl!.textContent;
      if (newText !== lastText) {
        lastText = newText;
        // Trigger crossfade: briefly fade out then back in
        transitioning = true;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            transitioning = false;
          });
        });
      }
    });

    observer.observe(reactiveEl, { characterData: true, subtree: true, childList: true });
    return () => observer.disconnect();
  });
</script>

{#snippet reactive(overrides?: Record<string, number | string | boolean>)}
  <span
    class="prose-reactive"
    class:crossfade-out={transitioning}
    role="status"
    aria-live="polite"
    aria-atomic="true"
    style:--crossfade-duration="{p('crossfadeDuration', 'number', overrides)}ms"
    style:--translate-y="{p('translateY', 'number', overrides)}px"
    bind:this={reactiveEl}
  >
    {@render slotContent()}
  </span>
{/snippet}

{#if TunableComponent}
  <TunableComponent {params} filePath="./src/components/ProseReactive.params.ts">
    {#snippet children(overrides)}
      {@render reactive(overrides)}
    {/snippet}
  </TunableComponent>
{:else}
  {@render reactive()}
{/if}

<style>
  .prose-reactive {
    display: inline;
    transition:
      opacity var(--crossfade-duration, 250ms) ease,
      transform var(--crossfade-duration, 250ms) ease;
  }

  .prose-reactive.crossfade-out {
    opacity: 0;
    transform: translateY(calc(var(--translate-y, 4px) * -1));
  }

  .prose-reactive :global(strong) {
    color: var(--accent-color, #6366f1);
    font-weight: 600;
  }
</style>
