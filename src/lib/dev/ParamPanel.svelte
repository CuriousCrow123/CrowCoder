<script lang="ts">
  import type { ParamDef } from './param-types';
  import ParamInput from './ParamInput.svelte';

  let { params, filePath, onchange }: {
    params: ParamDef[];
    filePath: string;
    onchange: (key: string, value: number | string | boolean) => void;
  } = $props();

  let commitState = $state<'idle' | 'committing' | 'success' | 'error'>('idle');

  async function handleCommit() {
    if (commitState === 'committing') return;
    commitState = 'committing';

    try {
      const response = await fetch('/__params/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, params }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('[ParamPanel] Commit failed:', data.error);
        commitState = 'error';
      } else {
        commitState = 'success';
      }
    } catch (e) {
      console.error('[ParamPanel] Commit error:', e);
      commitState = 'error';
    }

    // Reset after feedback
    setTimeout(() => { commitState = 'idle'; }, 1500);
  }
</script>

<div class="param-panel" role="region" aria-label="Parameter tuning panel">
  <div class="param-panel-header">
    <span class="param-panel-title">{filePath.split('/').pop()}</span>
  </div>

  <div class="param-panel-body">
    {#each params as def (def.key)}
      <ParamInput
        definition={def}
        onchange={(value) => onchange(def.key, value)}
      />
    {/each}
  </div>

  <div class="param-panel-footer">
    <button
      class="commit-btn"
      class:committing={commitState === 'committing'}
      class:success={commitState === 'success'}
      class:error={commitState === 'error'}
      disabled={commitState === 'committing'}
      onclick={handleCommit}
    >
      {#if commitState === 'committing'}
        Writing…
      {:else if commitState === 'success'}
        Saved
      {:else if commitState === 'error'}
        Failed
      {:else}
        Commit to disk
      {/if}
    </button>
  </div>
</div>

<style>
  .param-panel {
    position: absolute;
    top: 0;
    right: -320px;
    width: 300px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    font-family: var(--font-ui);
  }

  .param-panel-header {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid #f3f4f6;
    background: #f9fafb;
    border-radius: 8px 8px 0 0;
  }

  .param-panel-title {
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    font-family: var(--font-mono);
  }

  .param-panel-body {
    padding: 0.5rem 0.75rem;
    max-height: 300px;
    overflow-y: auto;
  }

  .param-panel-footer {
    padding: 0.5rem 0.75rem;
    border-top: 1px solid #f3f4f6;
  }

  .commit-btn {
    width: 100%;
    padding: 0.375rem 0.75rem;
    font-size: 12px;
    font-weight: 600;
    font-family: var(--font-ui);
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
    color: #374151;
    cursor: pointer;
    transition: all 150ms ease;
  }

  .commit-btn:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .commit-btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .commit-btn.committing {
    background: #f3f4f6;
    color: #6b7280;
  }

  .commit-btn.success {
    background: #ecfdf5;
    border-color: #6ee7b7;
    color: #065f46;
  }

  .commit-btn.error {
    background: #fef2f2;
    border-color: #fca5a5;
    color: #991b1b;
  }
</style>
