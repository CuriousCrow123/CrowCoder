<script lang="ts">
  import { tick, untrack } from 'svelte';
  import Popup from './Popup.svelte';
  import Quiz from './Quiz.svelte';
  import { hasBeenAnswered, getLastSelectedIndex } from '../lib/state/progress.svelte';
  import {
    popupState,
    dismiss,
    resetTrigger,
    requestPopup,
    markTriggered,
    type PopupMode,
  } from '../lib/state/popup.svelte';

  let {
    id,
    question,
    answers,
    correctIndex,
    trigger = 'scroll',
    mode = 'inline',
  }: {
    id: string;
    question: string;
    answers: string[];
    correctIndex: number;
    trigger?: 'scroll' | 'manual' | 'component-complete';
    mode?: PopupMode;
  } = $props();

  // Lock at mount — do NOT use $derived (avoids mid-interaction reactivity bug)
  let answered = $state(hasBeenAnswered(id));
  let quizMode = $state<'answering' | 'review'>(answered ? 'review' : 'answering');

  // Suppress scroll trigger for already-answered quizzes without switching to 'manual'
  // (switching trigger to 'manual' causes Popup to render its own "Show hint" button)
  if (answered) markTriggered(id);

  // Hide action buttons while popup is open
  let isPopupActive = $derived(popupState.active.has(id));

  // Track dismissal without answering — enables "Try quiz" reopen button
  let dismissedUnanswered = $state(false);

  // Focus management — only after a submit, not on initial mount
  let justSubmitted = $state(false);
  let actionBtnEl = $state<HTMLButtonElement | null>(null);

  // Focus the action button when popup closes after submit or unanswered dismiss
  $effect(() => {
    if (!isPopupActive && (justSubmitted || dismissedUnanswered)) {
      tick().then(() => {
        actionBtnEl?.focus();
        untrack(() => { justSubmitted = false; });
      });
    }
  });

  // Detect when popup closes without answering (dismissed via close button / Escape)
  let wasPreviouslyActive = false;
  $effect(() => {
    if (isPopupActive) {
      wasPreviouslyActive = true;
    } else if (wasPreviouslyActive && !answered) {
      dismissedUnanswered = true;
      wasPreviouslyActive = false;
    }
  });

  // Screen reader announcement (lives outside Popup's {#if isActive} block)
  let announcement = $state('');

  function handleResult({ correct }: { questionId: string; correct: boolean }) {
    announcement = correct
      ? 'Correct!'
      : `Incorrect — the answer is ${answers[correctIndex]}.`;
    dismiss(id);
    answered = true;
    quizMode = 'review';
    justSubmitted = true;
  }

  function openReview() {
    resetTrigger(id);
    requestPopup(id, mode);
    quizMode = 'review';
  }

  function reopenQuiz() {
    dismissedUnanswered = false;
    resetTrigger(id);
    requestPopup(id, mode);
    quizMode = 'answering';
  }

  function handleReset() {
    quizMode = 'answering';
  }
</script>

<!-- aria-live OUTSIDE Popup — survives popup close (critical a11y fix) -->
<div aria-live="polite" aria-atomic="true" class="sr-only">
  {#if announcement}{announcement}{/if}
</div>

<!-- Single Popup always mounted — no conditional swapping (preserves exit animation) -->
<Popup {id} {trigger} {mode}>
  <Quiz {id} {question} {answers} {correctIndex}
    reviewMode={quizMode === 'review'}
    reviewSelectedIndex={getLastSelectedIndex(id)}
    onresult={handleResult}
    onreset={handleReset} />
</Popup>

<!-- Action button alongside Popup, visible when popup is closed -->
{#if !isPopupActive}
  {#if answered}
    <button
      bind:this={actionBtnEl}
      class="action-btn"
      onclick={openReview}
      aria-label="Review answer: {question}"
    >
      Review answer
    </button>
  {:else if dismissedUnanswered}
    <button
      bind:this={actionBtnEl}
      class="action-btn"
      onclick={reopenQuiz}
      aria-label="Try quiz: {question}"
    >
      Try quiz
    </button>
  {/if}
{/if}

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }

  .action-btn {
    font-family: var(--font-ui);
    font-size: var(--text-sm, 15px);
    color: var(--accent-color, #6366f1);
    background: none;
    border: 1px solid var(--accent-color, #6366f1);
    border-radius: 6px;
    padding: 0.375rem 0.75rem;
    cursor: pointer;
    transition: background-color 150ms ease;
    margin-top: 0.5rem;
  }

  .action-btn:hover {
    background: color-mix(in srgb, var(--accent-color) 6%, transparent);
  }

  .action-btn:focus-visible {
    outline: 2px solid var(--accent-color, #6366f1);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .action-btn {
      transition-duration: 0.01ms !important;
    }
  }
</style>
