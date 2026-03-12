<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import params from './Popup.params';
  import { createParamAccessor } from '../lib/dev/param-types';
  import { tunablePromise, type TunableType } from '../lib/dev/lazy';
  import { observeOnce } from '../lib/scroll-observer';
  import {
    popupState,
    requestPopup,
    onEntered,
    dismissCurrent,
    onExited,
    resetTrigger,
    wasTriggered,
    type PopupMode,
  } from '../lib/state/popup.svelte';

  let TunableComponent = $state<TunableType | null>(null);
  $effect(() => {
    let cancelled = false;
    tunablePromise?.then((c) => { if (!cancelled) TunableComponent = c; });
    return () => { cancelled = true; };
  });

  let {
    children: slotContent,
    id,
    trigger = 'scroll',
    mode = 'inline',
    watchStore,
  }: {
    children: Snippet;
    id: string;
    trigger?: 'scroll' | 'manual' | 'component-complete';
    mode?: PopupMode;
    watchStore?: () => boolean;
  } = $props();

  const p = createParamAccessor(params);

  let containerEl = $state<HTMLElement | null>(null);
  let dialogEl = $state<HTMLDialogElement | null>(null);
  let dismissed = $state(false);

  // Is this popup currently displayed?
  let isActive = $derived(popupState.current?.id === id);
  let phase = $derived(isActive ? popupState.phase : 'idle');

  // Reduced motion preference
  let prefersReducedMotion = $state(false);
  onMount(() => {
    prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // --- Trigger logic ---

  // Scroll trigger
  onMount(() => {
    if (trigger !== 'scroll' || !containerEl) return;
    return observeOnce(containerEl, () => {
      requestPopup(id, mode);
    });
  });

  // Component-complete trigger
  $effect(() => {
    if (trigger !== 'component-complete' || !watchStore) return;
    if (watchStore() && !wasTriggered(id)) {
      requestPopup(id, mode);
    }
  });

  // Manual trigger handler
  function handleManualTrigger() {
    if (!wasTriggered(id)) {
      requestPopup(id, mode);
    }
  }

  // --- Animation lifecycle ---

  // Safety timeout for transitionend (handles prefers-reduced-motion, display:none)
  let safetyTimer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    if (!isActive) return;

    if (phase === 'entering') {
      if (prefersReducedMotion) {
        onEntered();
      } else {
        clearTimeout(safetyTimer);
        safetyTimer = setTimeout(onEntered, p('enterDuration', 'number') + 100);
      }
    }

    if (phase === 'exiting') {
      if (prefersReducedMotion) {
        onExited();
      } else {
        clearTimeout(safetyTimer);
        safetyTimer = setTimeout(onExited, p('exitDuration', 'number') + 100);
      }
    }

    return () => clearTimeout(safetyTimer);
  });

  // Modal dialog management
  $effect(() => {
    if (mode !== 'modal' || !dialogEl) return;
    if (isActive && (phase === 'entering' || phase === 'active')) {
      if (!dialogEl.open) dialogEl.showModal();
    }
    if (!isActive || phase === 'idle') {
      if (dialogEl.open) dialogEl.close();
    }
  });

  function handleTransitionEnd() {
    clearTimeout(safetyTimer);
    if (phase === 'entering') onEntered();
    if (phase === 'exiting') onExited();
  }

  function handleDismiss() {
    dismissed = true;
    dismissCurrent();
    // Allow re-triggering dismissed quizzes (plan: "Dismissed quizzes re-trigger on next page load")
    resetTrigger(id);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleDismiss();
    }
  }

  // Handle backdrop click for modal
  function handleBackdropClick(e: MouseEvent) {
    if (e.target === dialogEl) {
      handleDismiss();
    }
  }
</script>

{#snippet popupContent(overrides?: Record<string, number | string | boolean>)}
  {@const enterDur = p('enterDuration', 'number', overrides)}
  {@const exitDur = p('exitDuration', 'number', overrides)}
  {@const backdropOp = p('backdropOpacity', 'number', overrides)}
  {@const slideW = p('slideWidth', 'number', overrides)}

  <div
    class="popup-container"
    bind:this={containerEl}
    style:--enter-duration="{enterDur}ms"
    style:--exit-duration="{exitDur}ms"
    style:--backdrop-opacity={backdropOp}
    style:--slide-width="{slideW}px"
  >
    {#if trigger === 'manual' && !isActive}
      <button class="popup-trigger-btn" onclick={handleManualTrigger}>
        Show hint
      </button>
    {/if}

    {#if isActive}
      {#if mode === 'inline'}
        <div
          class="popup popup--inline"
          class:entering={phase === 'entering'}
          class:active={phase === 'active'}
          class:exiting={phase === 'exiting'}
          ontransitionend={handleTransitionEnd}
          onkeydown={handleKeydown}
          role="region"
          aria-label="Popup content"
        >
          <button class="popup-close" onclick={handleDismiss} aria-label="Close">
            <span aria-hidden="true">×</span>
          </button>
          {@render slotContent()}
        </div>

      {:else if mode === 'modal'}
        <dialog
          bind:this={dialogEl}
          class="popup popup--modal"
          class:entering={phase === 'entering'}
          class:active={phase === 'active'}
          class:exiting={phase === 'exiting'}
          ontransitionend={handleTransitionEnd}
          onkeydown={handleKeydown}
          onclick={handleBackdropClick}
        >
          <div class="popup-modal-content">
            <button class="popup-close" onclick={handleDismiss} aria-label="Close">
              <span aria-hidden="true">×</span>
            </button>
            {@render slotContent()}
          </div>
        </dialog>

      {:else if mode === 'slide-in'}
        <div
          class="popup popup--slide-in"
          class:entering={phase === 'entering'}
          class:active={phase === 'active'}
          class:exiting={phase === 'exiting'}
          ontransitionend={handleTransitionEnd}
          onkeydown={handleKeydown}
          role="complementary"
          aria-label="Side panel"
          tabindex="-1"
        >
          <button class="popup-close" onclick={handleDismiss} aria-label="Close">
            <span aria-hidden="true">×</span>
          </button>
          {@render slotContent()}
        </div>
      {/if}
    {/if}
  </div>
{/snippet}

{#if TunableComponent}
  <TunableComponent {params} filePath="./src/components/Popup.params.ts">
    {#snippet children(overrides)}
      {@render popupContent(overrides)}
    {/snippet}
  </TunableComponent>
{:else}
  {@render popupContent()}
{/if}

<style>
  .popup-container {
    position: relative;
  }

  /* --- Close button (shared) --- */
  .popup-close {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: rgba(0, 0, 0, 0.06);
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
    color: #6b7280;
    transition: background-color 150ms ease;
    z-index: 1;
  }

  .popup-close:hover {
    background: rgba(0, 0, 0, 0.12);
    color: #1a1a1a;
  }

  .popup-close:focus-visible {
    outline: 2px solid var(--accent-color, #6366f1);
    outline-offset: 2px;
  }

  .popup-trigger-btn {
    font-family: var(--font-ui);
    font-size: var(--text-sm, 15px);
    color: var(--accent-color, #6366f1);
    background: none;
    border: 1px solid var(--accent-color, #6366f1);
    border-radius: 6px;
    padding: 0.375rem 0.75rem;
    cursor: pointer;
    transition: background-color 150ms ease;
  }

  .popup-trigger-btn:hover {
    background: rgba(99, 102, 241, 0.06);
  }

  /* --- Inline mode --- */
  .popup--inline {
    position: relative;
    overflow: hidden;
    max-height: 0;
    opacity: 0;
    transition:
      max-height var(--enter-duration, 250ms) ease-out,
      opacity var(--enter-duration, 250ms) ease-out;
    margin-block: 0.5rem;
  }

  .popup--inline.entering,
  .popup--inline.active {
    max-height: 600px;
    opacity: 1;
  }

  .popup--inline.exiting {
    max-height: 0;
    opacity: 0;
    transition:
      max-height var(--exit-duration, 200ms) ease-in,
      opacity var(--exit-duration, 200ms) ease-in;
  }

  /* --- Modal mode --- */
  .popup--modal {
    border: none;
    border-radius: 12px;
    padding: 0;
    max-width: min(90vw, 520px);
    width: 100%;
    background: transparent;
    overflow: visible;
  }

  .popup--modal::backdrop {
    background: rgba(0, 0, 0, var(--backdrop-opacity, 0.4));
    transition: opacity var(--enter-duration, 250ms) ease;
  }

  .popup--modal.entering {
    opacity: 0;
    transform: scale(0.95);
  }

  .popup--modal.active {
    opacity: 1;
    transform: scale(1);
    transition:
      opacity var(--enter-duration, 250ms) ease-out,
      transform var(--enter-duration, 250ms) ease-out;
  }

  .popup--modal.exiting {
    opacity: 0;
    transform: scale(0.95);
    transition:
      opacity var(--exit-duration, 200ms) ease-in,
      transform var(--exit-duration, 200ms) ease-in;
  }

  .popup-modal-content {
    position: relative;
    background: var(--background-color, #faf8f5);
    border-radius: 12px;
    padding: 1.5rem;
  }

  /* --- Slide-in mode --- */
  .popup--slide-in {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: var(--slide-width, 380px);
    max-width: 90vw;
    background: var(--background-color, #faf8f5);
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
    padding: 2rem 1.5rem;
    overflow-y: auto;
    z-index: 1000;
    transform: translateX(100%);
    transition: transform var(--enter-duration, 250ms) ease-out;
  }

  .popup--slide-in.entering {
    transform: translateX(100%);
  }

  .popup--slide-in.active {
    transform: translateX(0);
  }

  .popup--slide-in.exiting {
    transform: translateX(100%);
    transition: transform var(--exit-duration, 200ms) ease-in;
  }

  @media (prefers-reduced-motion: reduce) {
    .popup--inline,
    .popup--modal,
    .popup--slide-in,
    .popup-close,
    .popup-trigger-btn {
      transition-duration: 0.01ms !important;
    }

    .popup--modal::backdrop {
      transition-duration: 0.01ms !important;
    }
  }
</style>
