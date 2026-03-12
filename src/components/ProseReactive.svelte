<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import params from './ProseReactive.params';
  import { createParamAccessor } from '../lib/dev/param-types';
  import { tunablePromise } from '../lib/dev/lazy';

  let TunableComponent = $state<any>(null);
  onMount(() => {
    tunablePromise?.then((c) => { TunableComponent = c; });
  });

  let { children: slotContent }: {
    children: Snippet;
  } = $props();

  const p = createParamAccessor(params);
</script>

{#if TunableComponent}
  <TunableComponent {params} filePath="./src/components/ProseReactive.params.ts">
    {#snippet children(overrides)}
      <span
        class="prose-reactive"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style:--crossfade-duration="{p('crossfadeDuration', 'number', overrides)}ms"
        style:--translate-y="{p('translateY', 'number', overrides)}px"
      >
        {@render slotContent()}
      </span>
    {/snippet}
  </TunableComponent>
{:else}
  <span
    class="prose-reactive"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    style:--crossfade-duration="{p('crossfadeDuration', 'number')}ms"
    style:--translate-y="{p('translateY', 'number')}px"
  >
    {@render slotContent()}
  </span>
{/if}

<style>
  .prose-reactive {
    display: inline;
    transition:
      opacity var(--crossfade-duration, 250ms) ease,
      transform var(--crossfade-duration, 250ms) ease;
  }

  .prose-reactive :global(strong) {
    color: var(--accent-color, #6366f1);
    font-weight: 600;
  }
</style>
