/**
 * Lazy-loaded dev-only Tunable component.
 * Hoisted to a shared module so the dynamic import resolves once,
 * avoiding per-component top-level await (which Svelte 5 disallows).
 */

export type TunableType = typeof import('./Tunable.svelte').default;

export const tunablePromise: Promise<TunableType | null> | null =
  import.meta.env.DEV
    ? import('./Tunable.svelte').then((m) => m.default).catch((e) => {
        console.warn('[dev] Failed to load Tunable component:', e);
        return null;
      })
    : null;
