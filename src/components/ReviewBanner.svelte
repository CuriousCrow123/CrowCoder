<script lang="ts">
  import { getDueQuestions } from '../lib/state/progress.svelte';

  let dueCount = $state(0);
  let dismissed = $state(false);

  // Check on mount — getDueQuestions reads from progressState loaded at module top-level
  $effect(() => {
    dueCount = getDueQuestions().length;
  });

  let visible = $derived(dueCount > 0 && !dismissed);
</script>

{#if visible}
  <div class="review-banner" role="status" aria-live="polite">
    <span class="review-banner-text">
      A few concepts to revisit — scroll down to find highlighted quizzes.
    </span>
    <button
      class="review-banner-dismiss"
      onclick={() => dismissed = true}
      aria-label="Dismiss review reminder"
    >
      <span aria-hidden="true">×</span>
    </button>
  </div>
{/if}

<style>
  .review-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.625rem 1rem;
    background: color-mix(in srgb, var(--accent-color) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent-color) 20%, transparent);
    border-radius: 8px;
    margin-bottom: 1.5rem;
    font-family: var(--font-ui);
    font-size: var(--text-sm, 15px);
  }

  .review-banner-text {
    color: var(--text-color, #1a1a1a);
    font-weight: 500;
  }

  .review-banner-dismiss {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    border-radius: 50%;
    cursor: pointer;
    color: var(--text-muted, #6b7280);
    font-size: 14px;
    transition: color 150ms ease;
  }

  .review-banner-dismiss:hover {
    color: var(--text-color, #1a1a1a);
  }

  .review-banner-dismiss:focus-visible {
    outline: 2px solid var(--accent-color, #6366f1);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .review-banner-dismiss {
      transition-duration: 0.01ms !important;
    }
  }
</style>
