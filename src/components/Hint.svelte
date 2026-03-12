<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children: slotContent, title = 'Hint' }: {
    children: Snippet;
    title?: string;
  } = $props();
</script>

<div class="hint-card" role="note">
  {#if title}
    <p class="hint-title">{title}</p>
  {/if}
  <div class="hint-content">
    {@render slotContent()}
  </div>
</div>

<style>
  .hint-card {
    background: #f0f4ff;
    border: 1px solid rgba(99, 102, 241, 0.15);
    border-radius: 10px;
    padding: 1.25rem;
    border-left: 3px solid var(--accent-color, #6366f1);
  }

  .hint-title {
    font-family: var(--font-ui);
    font-size: var(--text-sm, 15px);
    font-weight: 600;
    color: var(--accent-color, #6366f1);
    margin: 0 0 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .hint-content {
    font-family: var(--font-prose);
    font-size: var(--text-quiz-question, 17px);
    line-height: 1.55;
    color: #1a1a1a;
  }

  .hint-content :global(p) {
    margin: 0;
  }
</style>
