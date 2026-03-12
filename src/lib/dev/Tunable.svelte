<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ParamDef } from './param-types';
  import ParamPanel from './ParamPanel.svelte';

  let { children, params, filePath }: {
    children: Snippet<[Record<string, number | string | boolean>]>;
    params: ParamDef[];
    filePath: string;
  } = $props();

  let showPanel = $state(false);
  let overrides = $state<Record<string, number | string | boolean>>({});

  function handleChange(key: string, value: number | string | boolean) {
    overrides[key] = value;
    // Also update the params array so ParamPanel shows current values
    const param = params.find(p => p.key === key);
    if (param) {
      (param as { value: typeof value }).value = value;
    }
  }
</script>

<div class="tunable-wrapper">
  {@render children(overrides)}

  <button
    class="tunable-gear"
    onclick={() => showPanel = !showPanel}
    aria-label="Toggle parameter panel"
    aria-expanded={showPanel}
  >
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0"/>
      <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zM8 10.93a2.929 2.929 0 1 1 0-5.858 2.929 2.929 0 0 1 0 5.858"/>
    </svg>
  </button>

  {#if showPanel}
    <ParamPanel
      {params}
      {filePath}
      onchange={handleChange}
    />
  {/if}
</div>

<style>
  .tunable-wrapper {
    position: relative;
  }

  .tunable-gear {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 50%;
    color: #9ca3af;
    cursor: pointer;
    opacity: 0;
    transition: opacity 150ms ease, color 150ms ease;
    z-index: 9998;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .tunable-wrapper:hover .tunable-gear,
  .tunable-gear:focus-visible {
    opacity: 1;
  }

  .tunable-gear:hover {
    color: #6366f1;
    border-color: #a5b4fc;
  }

  .tunable-gear[aria-expanded="true"] {
    opacity: 1;
    color: #6366f1;
    border-color: #a5b4fc;
    background: #eef2ff;
  }
</style>
