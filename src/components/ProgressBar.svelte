<script lang="ts">
  import params from './ProgressBar.params';
  import { createParamAccessor } from '../lib/dev/param-types';
  import { tunablePromise, type TunableType } from '../lib/dev/lazy';
  import { progressState } from '../lib/state/progress.svelte';

  let TunableComponent = $state<TunableType | null>(null);
  $effect(() => {
    let cancelled = false;
    tunablePromise?.then((c) => { if (!cancelled) TunableComponent = c; });
    return () => { cancelled = true; };
  });

  let { quizIds }: { quizIds: string[] } = $props();

  const p = createParamAccessor(params);

  type SegmentStatus = 'unseen' | 'due' | 'answered' | 'mastered';

  function getStatus(quizId: string): SegmentStatus {
    const card = progressState.cards[quizId];
    if (!card) return 'unseen';
    const now = new Date().toISOString();
    if (card.dueDate <= now) return 'due';
    if (card.repetitions >= 3) return 'mastered';
    return 'answered';
  }

  let segments = $derived(quizIds.map(id => ({ id, status: getStatus(id) })));
  let masteredCount = $derived(segments.filter(s => s.status === 'mastered').length);
  let isCollapsed = $state(false);

  function scrollToQuiz(quizId: string) {
    const el = document.getElementById(`quiz-${quizId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
</script>

{#snippet bar(overrides?: Record<string, number | string | boolean>)}
  {@const radius = p('segmentRadius', 'number', overrides)}
  {@const gap = p('segmentGap', 'number', overrides)}
  {@const height = p('segmentHeight', 'number', overrides)}
  {@const unseenColor = overrides?.['unseenColor'] != null ? String(overrides['unseenColor']) : undefined}
  {@const dueColor = overrides?.['dueColor'] != null ? String(overrides['dueColor']) : undefined}
  {@const answeredColor = overrides?.['answeredColor'] != null ? String(overrides['answeredColor']) : undefined}
  {@const masteredColor = overrides?.['masteredColor'] != null ? String(overrides['masteredColor']) : undefined}

  <div
    class="progress-bar"
    style:--seg-radius="{radius}px"
    style:--seg-gap="{gap}px"
    style:--seg-height="{height}px"
    style:--color-unseen={unseenColor}
    style:--color-due={dueColor}
    style:--color-answered={answeredColor}
    style:--color-mastered={masteredColor}
    role="group"
    aria-label="Quiz progress: {masteredCount} of {quizIds.length} mastered"
  >
    <!-- Collapsed view for narrow viewports -->
    <button
      class="progress-summary"
      onclick={() => isCollapsed = !isCollapsed}
      aria-expanded={!isCollapsed}
    >
      <span class="progress-count">{masteredCount}/{quizIds.length} mastered</span>
      <span class="progress-toggle" aria-hidden="true">{isCollapsed ? '▸' : '▾'}</span>
    </button>

    {#if !isCollapsed}
      <div class="progress-segments">
        {#each segments as segment}
          <button
            class="progress-segment segment--{segment.status}"
            onclick={() => scrollToQuiz(segment.id)}
            title="{segment.id}: {segment.status}"
            aria-label="Quiz {segment.id}: {segment.status}"
          ></button>
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

{#if TunableComponent}
  <TunableComponent {params} filePath="./src/components/ProgressBar.params.ts">
    {#snippet children(overrides)}
      {@render bar(overrides)}
    {/snippet}
  </TunableComponent>
{:else}
  {@render bar()}
{/if}

<style>
  .progress-bar {
    font-family: var(--font-ui);
    font-size: var(--text-progress, 14px);
  }

  .progress-summary {
    display: none;
    align-items: center;
    gap: 0.375rem;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    font-weight: 500;
    color: var(--text-muted, #6b7280);
    padding: 0.25rem 0;
  }

  .progress-summary:focus-visible {
    outline: 2px solid var(--accent-color, #6366f1);
    outline-offset: 2px;
  }

  .progress-toggle {
    font-size: 0.75em;
  }

  .progress-segments {
    display: flex;
    gap: var(--seg-gap, 3px);
  }

  .progress-segment {
    flex: 1;
    height: var(--seg-height, 8px);
    border-radius: var(--seg-radius, 4px);
    border: none;
    cursor: pointer;
    padding: 0;
    transition: transform 150ms ease, filter 150ms ease;
  }

  .progress-segment:hover {
    transform: scaleY(1.5);
    filter: brightness(0.9);
  }

  .progress-segment:focus-visible {
    outline: 2px solid var(--accent-color, #6366f1);
    outline-offset: 2px;
  }

  .segment--unseen { background: var(--color-unseen, var(--progress-unseen, #d1d5db)); }
  .segment--due { background: var(--color-due, var(--progress-due, #6366f1)); }
  .segment--answered { background: var(--color-answered, var(--progress-answered, #a5b4fc)); }
  .segment--mastered { background: var(--color-mastered, var(--progress-mastered, #16a34a)); }

  /* Collapse on narrow viewports */
  @media (max-width: 480px) {
    .progress-summary {
      display: flex;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .progress-segment {
      transition-duration: 0.01ms !important;
    }
  }
</style>
