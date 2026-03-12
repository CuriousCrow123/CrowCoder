/**
 * Lazy-loaded dev-only Tunable component.
 * Hoisted to a shared module so the dynamic import resolves once,
 * avoiding per-component top-level await (which Svelte 5 disallows).
 */

export const tunablePromise: Promise<typeof import('./Tunable.svelte').default> | null =
  import.meta.env.DEV
    ? import('./Tunable.svelte').then((m) => m.default).catch(() => null as never)
    : null;
