<script lang="ts">
  import type { ParamDef } from './param-types';

  let { definition, onchange }: {
    definition: ParamDef;
    onchange: (value: number | string | boolean) => void;
  } = $props();
</script>

<label class="param-input">
  <span class="param-label">
    {definition.label}
    {#if definition.tier === 'js'}
      <span class="param-tier-badge" title="Applies after commit + HMR">JS</span>
    {/if}
  </span>

  {#if definition.type === 'number'}
    <input
      type="range"
      min={definition.min}
      max={definition.max}
      step={definition.step}
      value={definition.value}
      oninput={(e) => onchange(+e.currentTarget.value)}
    />
    <span class="param-value">{definition.value}{definition.unit ?? ''}</span>

  {:else if definition.type === 'color'}
    <input
      type="color"
      value={definition.value}
      oninput={(e) => onchange(e.currentTarget.value)}
    />
    <span class="param-value">{definition.value}</span>

  {:else if definition.type === 'boolean'}
    <input
      type="checkbox"
      checked={definition.value}
      onchange={(e) => onchange(e.currentTarget.checked)}
    />
  {/if}
</label>

<style>
  .param-input {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
    font-family: var(--font-ui);
    font-size: 13px;
    color: #374151;
  }

  .param-label {
    min-width: 120px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .param-tier-badge {
    font-size: 10px;
    font-weight: 600;
    background: #fbbf24;
    color: #78350f;
    padding: 0 4px;
    border-radius: 3px;
    line-height: 1.6;
  }

  .param-value {
    min-width: 60px;
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: #6b7280;
  }

  input[type="range"] {
    flex: 1;
    min-width: 80px;
    accent-color: var(--accent-color, #6366f1);
  }

  input[type="color"] {
    width: 32px;
    height: 24px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 1px;
    cursor: pointer;
  }

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: var(--accent-color, #6366f1);
    cursor: pointer;
  }
</style>
