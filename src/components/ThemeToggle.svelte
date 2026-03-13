<script lang="ts">
  import { onMount } from 'svelte';

  const STORAGE_KEY = 'crowcoder-theme';

  let isDark = $state(false);

  onMount(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark') {
      isDark = true;
    } else if (stored === 'light') {
      isDark = false;
    } else {
      // Default to system preference
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    applyTheme();
  });

  function applyTheme() {
    document.documentElement.classList.toggle('dark', isDark);
  }

  function toggle() {
    isDark = !isDark;
    applyTheme();
    try {
      localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // localStorage unavailable — theme still works in-memory
    }
  }
</script>

<button
  class="theme-toggle"
  onclick={toggle}
  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
  title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
>
  {#if isDark}
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  {:else}
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  {/if}
</button>

<style>
  .theme-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
    border-radius: 8px;
    background: var(--surface-color, white);
    color: var(--text-muted, #6b7280);
    cursor: pointer;
    transition: border-color 150ms ease, color 150ms ease;
  }

  .theme-toggle:hover {
    border-color: var(--accent-color, #6366f1);
    color: var(--accent-color, #6366f1);
  }

  .theme-toggle:focus-visible {
    outline: 2px solid var(--accent-color, #6366f1);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .theme-toggle {
      transition-duration: 0.01ms !important;
    }
  }
</style>
