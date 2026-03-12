<script lang="ts">
  import type { ParamDef } from './param-types';
  import ParamInput from './ParamInput.svelte';
  import designTokens from '../design-tokens.params';

  let collapsed = $state(true);
  let params = $state<ParamDef[]>(structuredClone(designTokens));
  let commitState = $state<'idle' | 'committing' | 'success' | 'error'>('idle');

  function handleChange(key: string, value: number | string | boolean) {
    const param = params.find(p => p.key === key);
    if (param) {
      (param as { value: typeof value }).value = value;
    }

    // Apply immediately to :root via CSS custom properties
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    const unit = param && 'unit' in param ? (param.unit ?? '') : '';
    document.documentElement.style.setProperty(`--${cssKey}`, `${value}${unit}`);
  }

  async function handleCommit() {
    if (commitState === 'committing') return;
    commitState = 'committing';

    try {
      const response = await fetch('/__params/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: 'src/lib/design-tokens.params.ts',
          params,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('[GlobalParamPanel] Commit failed:', data.error);
        commitState = 'error';
      } else {
        commitState = 'success';
      }
    } catch (e) {
      console.error('[GlobalParamPanel] Commit error:', e);
      commitState = 'error';
    }

    setTimeout(() => { commitState = 'idle'; }, 1500);
  }
</script>

<div class="global-panel" class:collapsed>
  <button
    class="global-panel-toggle"
    onclick={() => collapsed = !collapsed}
    aria-label="Toggle global design tokens panel"
    aria-expanded={!collapsed}
  >
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492"/>
    </svg>
    <span>Tokens</span>
  </button>

  {#if !collapsed}
    <div class="global-panel-body">
      {#each params as def (def.key)}
        <ParamInput
          definition={def}
          onchange={(value) => handleChange(def.key, value)}
        />
      {/each}

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
          Commit tokens
        {/if}
      </button>
    </div>
  {/if}
</div>

<style>
  .global-panel {
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 10000;
    font-family: var(--font-ui);
  }

  .global-panel-toggle {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    font-size: 12px;
    font-weight: 600;
    font-family: var(--font-ui);
    background: #1e1b4b;
    color: #e0e7ff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 150ms ease;
  }

  .global-panel-toggle:hover {
    background: #312e81;
  }

  .collapsed .global-panel-toggle {
    border-radius: 6px;
  }

  :not(.collapsed) .global-panel-toggle {
    border-radius: 6px 6px 0 0;
    width: 100%;
  }

  .global-panel-body {
    width: 300px;
    background: white;
    border: 1px solid #e5e7eb;
    border-top: none;
    border-radius: 0 0 8px 8px;
    padding: 0.75rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-height: 400px;
    overflow-y: auto;
  }

  .commit-btn {
    width: 100%;
    margin-top: 0.5rem;
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

  .commit-btn.committing { background: #f3f4f6; color: #6b7280; }
  .commit-btn.success { background: #ecfdf5; border-color: #6ee7b7; color: #065f46; }
  .commit-btn.error { background: #fef2f2; border-color: #fca5a5; color: #991b1b; }
</style>
