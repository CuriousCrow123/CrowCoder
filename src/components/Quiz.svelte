<script lang="ts">
  import params from './Quiz.params';
  import { createParamAccessor } from '../lib/dev/param-types';
  import { tunablePromise, type TunableType } from '../lib/dev/lazy';
  import { hasBeenAnswered, recordAnswer } from '../lib/state/progress.svelte';

  let TunableComponent = $state<TunableType | null>(null);
  $effect(() => {
    let cancelled = false;
    tunablePromise?.then((c) => { if (!cancelled) TunableComponent = c; });
    return () => { cancelled = true; };
  });

  let {
    id,
    question,
    answers,
    correctIndex,
    onresult,
  }: {
    id: string;
    question: string;
    answers: string[];
    correctIndex: number;
    onresult?: (result: { questionId: string; correct: boolean }) => void;
  } = $props();

  const p = createParamAccessor(params);

  type QuizMode = 'first-encounter' | 'review';
  type QuizPhase = 'answering' | 'feedback';

  let isReview = $derived(hasBeenAnswered(id));
  let mode: QuizMode = $derived(isReview ? 'review' : 'first-encounter');

  let selectedIndex = $state<number | null>(null);
  let phase = $state<QuizPhase>('answering');
  let wasCorrect = $state<boolean | null>(null);

  // Auto-collapse timer for correct answers
  let collapseTimer: ReturnType<typeof setTimeout> | undefined;

  function submitAnswer() {
    if (selectedIndex === null) return;
    const correct = selectedIndex === correctIndex;
    wasCorrect = correct;
    phase = 'feedback';

    recordAnswer(id, correct);
    onresult?.({ questionId: id, correct });

    // Auto-collapse on correct after feedbackDuration
    if (correct) {
      clearTimeout(collapseTimer);
      collapseTimer = setTimeout(() => {
        dismiss();
      }, p('feedbackDuration', 'number'));
    }
  }

  function handleReview(remembered: boolean) {
    wasCorrect = remembered;
    phase = 'feedback';

    recordAnswer(id, remembered);
    onresult?.({ questionId: id, correct: remembered });

    if (remembered) {
      clearTimeout(collapseTimer);
      collapseTimer = setTimeout(() => {
        dismiss();
      }, p('feedbackDuration', 'number'));
    }
  }

  function dismiss() {
    clearTimeout(collapseTimer);
    phase = 'answering';
    selectedIndex = null;
    wasCorrect = null;
    // Signal parent popup to close
    onresult?.({ questionId: id, correct: wasCorrect ?? false });
  }

  // Cleanup timer on destroy
  $effect(() => {
    return () => clearTimeout(collapseTimer);
  });
</script>

{#snippet quizContent(overrides?: Record<string, number | string | boolean>)}
  {@const borderRadius = p('borderRadius', 'number', overrides)}
  {@const cardBg = p('cardBg', 'color', overrides)}
  {@const correctColor = p('correctColor', 'color', overrides)}
  {@const incorrectColor = p('incorrectColor', 'color', overrides)}

  <div
    class="quiz-card"
    style:--quiz-radius="{borderRadius}px"
    style:--quiz-bg={cardBg}
    style:--quiz-correct={correctColor}
    style:--quiz-incorrect={incorrectColor}
    role="region"
    aria-label="Quiz: {question}"
  >
    <p class="quiz-question">{question}</p>

    {#if mode === 'first-encounter'}
      {#if phase === 'answering'}
        <fieldset class="quiz-answers">
          <legend class="sr-only">Select your answer</legend>
          {#each answers as answer, i}
            <label class="quiz-answer" class:selected={selectedIndex === i}>
              <input
                type="radio"
                name="quiz-{id}"
                value={i}
                checked={selectedIndex === i}
                onchange={() => selectedIndex = i}
              />
              <span class="quiz-answer-text">{answer}</span>
            </label>
          {/each}
        </fieldset>
        <button
          class="quiz-submit"
          disabled={selectedIndex === null}
          onclick={submitAnswer}
        >
          Submit
        </button>
      {:else}
        <!-- Feedback phase -->
        <div class="quiz-feedback" aria-live="polite">
          {#if wasCorrect}
            <p class="feedback-text feedback-correct">Correct!</p>
          {:else}
            <p class="feedback-text feedback-incorrect">
              Not quite — the answer is <strong>{answers[correctIndex]}</strong>.
            </p>
          {/if}
          <div class="quiz-answers-review">
            {#each answers as answer, i}
              <div
                class="quiz-answer-result"
                class:correct-answer={i === correctIndex}
                class:wrong-answer={i === selectedIndex && i !== correctIndex}
              >
                <span class="quiz-answer-text">{answer}</span>
                {#if i === correctIndex}
                  <span class="answer-icon" aria-hidden="true">✓</span>
                {:else if i === selectedIndex}
                  <span class="answer-icon" aria-hidden="true">✗</span>
                {/if}
              </div>
            {/each}
          </div>
          {#if !wasCorrect}
            <button class="quiz-submit" onclick={dismiss}>Got it</button>
          {:else}
            <button class="quiz-submit quiz-submit--subtle" onclick={dismiss}>Continue</button>
          {/if}
        </div>
      {/if}

    {:else}
      <!-- Review mode -->
      {#if phase === 'answering'}
        <p class="review-prompt">Do you remember the answer?</p>
        <div class="review-buttons">
          <button class="review-btn review-btn--again" onclick={() => handleReview(false)}>
            Show me again
          </button>
          <button class="review-btn review-btn--remember" onclick={() => handleReview(true)}>
            I remember
          </button>
        </div>
      {:else}
        <div class="quiz-feedback" aria-live="polite">
          {#if wasCorrect}
            <p class="feedback-text feedback-correct">Nice!</p>
          {:else}
            <p class="feedback-text feedback-incorrect">
              The answer is <strong>{answers[correctIndex]}</strong>.
            </p>
            <button class="quiz-submit" onclick={dismiss}>Got it</button>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
{/snippet}

{#if TunableComponent}
  <TunableComponent {params} filePath="./src/components/Quiz.params.ts">
    {#snippet children(overrides)}
      {@render quizContent(overrides)}
    {/snippet}
  </TunableComponent>
{:else}
  {@render quizContent()}
{/if}

<style>
  .quiz-card {
    background: var(--quiz-bg, #fffbf0);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: var(--quiz-radius, 12px);
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  .quiz-question {
    font-family: var(--font-prose);
    font-size: var(--text-quiz-question, 17px);
    font-weight: 500;
    margin: 0 0 1rem;
    line-height: 1.5;
  }

  .quiz-answers {
    border: none;
    padding: 0;
    margin: 0 0 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

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

  .quiz-answer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 0.75rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    cursor: pointer;
    font-family: var(--font-ui);
    font-size: var(--text-quiz-answer, 16px);
    font-weight: 500;
    transition: border-color 150ms ease, background-color 150ms ease;
  }

  .quiz-answer:hover {
    border-color: var(--accent-color, #6366f1);
    background-color: rgba(99, 102, 241, 0.04);
  }

  .quiz-answer.selected {
    border-color: var(--accent-color, #6366f1);
    background-color: rgba(99, 102, 241, 0.08);
  }

  .quiz-answer input[type="radio"] {
    accent-color: var(--accent-color, #6366f1);
  }

  .quiz-submit {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 1.25rem;
    background: var(--accent-color, #6366f1);
    color: white;
    border: none;
    border-radius: 6px;
    font-family: var(--font-ui);
    font-size: var(--text-quiz-answer, 16px);
    font-weight: 600;
    cursor: pointer;
    transition: opacity 150ms ease;
  }

  .quiz-submit:hover:not(:disabled) {
    opacity: 0.9;
  }

  .quiz-submit:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .quiz-submit:focus-visible {
    outline: 2px solid var(--accent-color, #6366f1);
    outline-offset: 2px;
  }

  .quiz-submit--subtle {
    background: transparent;
    color: var(--accent-color, #6366f1);
    border: 1px solid var(--accent-color, #6366f1);
  }

  .feedback-text {
    font-family: var(--font-ui);
    font-size: var(--text-quiz-answer, 16px);
    font-weight: 600;
    margin: 0 0 0.75rem;
  }

  .feedback-correct { color: var(--quiz-correct, #16a34a); }
  .feedback-incorrect { color: var(--quiz-incorrect, #dc2626); }

  .quiz-answers-review {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    margin-bottom: 1rem;
  }

  .quiz-answer-result {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    font-family: var(--font-ui);
    font-size: var(--text-quiz-answer, 16px);
    background: transparent;
  }

  .correct-answer {
    background: color-mix(in srgb, var(--quiz-correct, #16a34a) 10%, transparent);
    color: var(--quiz-correct, #16a34a);
    font-weight: 600;
  }

  .wrong-answer {
    background: color-mix(in srgb, var(--quiz-incorrect, #dc2626) 10%, transparent);
    color: var(--quiz-incorrect, #dc2626);
    text-decoration: line-through;
  }

  .answer-icon {
    font-weight: 700;
    font-size: 1.1em;
  }

  .review-prompt {
    font-family: var(--font-ui);
    font-size: var(--text-quiz-answer, 16px);
    color: #6b7280;
    margin: 0 0 1rem;
  }

  .review-buttons {
    display: flex;
    gap: 0.75rem;
  }

  .review-btn {
    flex: 1;
    padding: 0.625rem 1rem;
    border-radius: 6px;
    font-family: var(--font-ui);
    font-size: var(--text-quiz-answer, 16px);
    font-weight: 600;
    cursor: pointer;
    transition: opacity 150ms ease;
  }

  .review-btn:hover { opacity: 0.9; }

  .review-btn:focus-visible {
    outline: 2px solid var(--accent-color, #6366f1);
    outline-offset: 2px;
  }

  .review-btn--again {
    background: transparent;
    border: 1px solid var(--quiz-incorrect, #dc2626);
    color: var(--quiz-incorrect, #dc2626);
  }

  .review-btn--remember {
    background: var(--quiz-correct, #16a34a);
    border: 1px solid var(--quiz-correct, #16a34a);
    color: white;
  }

  @media (prefers-reduced-motion: reduce) {
    .quiz-answer, .quiz-submit, .review-btn {
      transition-duration: 0.01ms !important;
    }
  }
</style>
