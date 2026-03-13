<script lang="ts">
  import { progressState, importProgress, canPersist } from '../lib/state/progress.svelte';
  import { exportProgress, validateImport } from '../lib/persistence';

  let fileInput = $state<HTMLInputElement | null>(null);
  let importStatus = $state<{ type: 'success' | 'error'; message: string } | null>(null);
  let confirmImport = $state<{ data: import('../lib/types').ProgressData } | null>(null);

  function handleExport() {
    exportProgress(progressState);
  }

  function handleFileSelect() {
    fileInput?.click();
  }

  async function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    importStatus = null;
    const result = await validateImport(file);

    if ('error' in result) {
      importStatus = { type: 'error', message: result.error };
      return;
    }

    // Ask for confirmation before replacing
    confirmImport = { data: result.data };

    // Reset input so same file can be re-selected
    input.value = '';
  }

  function confirmReplace() {
    if (!confirmImport) return;
    importProgress(confirmImport.data);
    importStatus = { type: 'success', message: 'Progress imported successfully!' };
    confirmImport = null;
  }

  function cancelImport() {
    confirmImport = null;
  }

  let confirmReset = $state(false);

  function handleReset() {
    confirmReset = true;
  }

  function confirmResetProgress() {
    importProgress({ schemaVersion: 1, cards: {} });
    confirmReset = false;
    window.location.reload();
  }

  function cancelReset() {
    confirmReset = false;
  }

  let cardCount = $derived(Object.keys(progressState.cards).length);
</script>

<div class="export-import" role="region" aria-label="Progress management">
  {#if !canPersist}
    <p class="storage-warning" role="alert">
      localStorage is unavailable. Progress will not persist across reloads.
    </p>
  {/if}

  <div class="actions">
    <button class="action-btn" onclick={handleExport} disabled={cardCount === 0}>
      Export Progress
    </button>
    <button class="action-btn" onclick={handleFileSelect}>
      Import Progress
    </button>
    <button class="action-btn action-btn--danger" onclick={handleReset} disabled={cardCount === 0}>
      Reset Progress
    </button>
    <input
      bind:this={fileInput}
      type="file"
      accept=".json"
      onchange={handleFileChange}
      class="sr-only"
      aria-label="Select progress file to import"
    />
  </div>

  <p class="card-count">{cardCount} {cardCount === 1 ? 'card' : 'cards'} tracked</p>

  {#if confirmReset}
    <div class="confirm-dialog" role="alertdialog" aria-label="Confirm reset">
      <p>Clear all progress? This cannot be undone.</p>
      <div class="confirm-actions">
        <button class="action-btn action-btn--danger" onclick={confirmResetProgress}>Reset</button>
        <button class="action-btn" onclick={cancelReset}>Cancel</button>
      </div>
    </div>
  {/if}

  {#if confirmImport}
    <div class="confirm-dialog" role="alertdialog" aria-label="Confirm import">
      <p>Replace current progress with imported data? ({Object.keys(confirmImport.data.cards).length} cards)</p>
      <div class="confirm-actions">
        <button class="action-btn action-btn--danger" onclick={confirmReplace}>Replace</button>
        <button class="action-btn" onclick={cancelImport}>Cancel</button>
      </div>
    </div>
  {/if}

  {#if importStatus}
    <p
      class="import-status"
      class:status-success={importStatus.type === 'success'}
      class:status-error={importStatus.type === 'error'}
      role="status"
    >
      {importStatus.message}
    </p>
  {/if}
</div>

<style>
  .export-import {
    font-family: var(--font-ui);
    font-size: var(--text-sm, 15px);
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .action-btn {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
    border-radius: 6px;
    background: var(--surface-color, white);
    color: var(--text-color, #1a1a1a);
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    font-weight: 500;
    transition: border-color 150ms ease;
  }

  .action-btn:hover:not(:disabled) {
    border-color: var(--accent-color, #6366f1);
  }

  .action-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .action-btn:focus-visible {
    outline: 2px solid var(--accent-color, #6366f1);
    outline-offset: 2px;
  }

  .action-btn--danger {
    border-color: var(--error-color, #dc2626);
    color: var(--error-color, #dc2626);
  }

  .action-btn--danger:hover {
    background: var(--confirm-bg, #fef2f2);
    border-color: var(--error-color, #dc2626) !important;
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

  .card-count {
    color: var(--text-muted, #6b7280);
    margin-top: 0.5rem;
    margin-bottom: 0;
  }

  .confirm-dialog {
    margin-top: 0.75rem;
    padding: 1rem;
    background: var(--confirm-bg, #fef2f2);
    border: 1px solid var(--confirm-border, #fecaca);
    border-radius: 8px;
  }

  .confirm-dialog p {
    margin: 0 0 0.75rem;
    font-weight: 500;
  }

  .confirm-actions {
    display: flex;
    gap: 0.5rem;
  }

  .import-status {
    margin-top: 0.5rem;
    font-weight: 500;
  }

  .status-success { color: var(--success-color, #16a34a); }
  .status-error { color: var(--error-color, #dc2626); }

  .storage-warning {
    padding: 0.75rem 1rem;
    background: var(--warning-bg, #fffbeb);
    border: 1px solid var(--warning-border, #fde68a);
    border-radius: 8px;
    color: var(--warning-text, #92400e);
    margin-bottom: 0.75rem;
    font-weight: 500;
  }

  @media (prefers-reduced-motion: reduce) {
    .action-btn {
      transition-duration: 0.01ms !important;
    }
  }
</style>
