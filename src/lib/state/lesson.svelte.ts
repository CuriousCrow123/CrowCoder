/**
 * Per-lesson reactive state — shared across Astro islands via Vite module deduplication.
 * See ADR: docs/decisions/001-cross-island-state-sharing.md
 *
 * Convention: island root components import directly; children receive data as props.
 */
import type {
  ComponentValueRegistry,
  ComponentKey,
} from "../types";

export const lessonState = $state({
  /** Currently active prose highlight ID, or null */
  activeHighlight: null as string | null,

  /** Component values keyed by "type:instanceId" */
  componentValues: {} as Partial<
    Record<ComponentKey, ComponentValueRegistry[keyof ComponentValueRegistry]>
  >,
});

/** Read a typed component value by type and instance ID */
export function getComponentValue<K extends keyof ComponentValueRegistry>(
  type: K,
  id: string,
): ComponentValueRegistry[K] | undefined {
  return lessonState.componentValues[`${type}:${id}`] as
    | ComponentValueRegistry[K]
    | undefined;
}

/** Write a typed component value */
export function setComponentValue<K extends keyof ComponentValueRegistry>(
  type: K,
  id: string,
  value: ComponentValueRegistry[K],
): void {
  lessonState.componentValues[`${type}:${id}`] = value;
}

/** Set or clear the active highlight */
export function setHighlight(id: string | null): void {
  lessonState.activeHighlight = id;
}
