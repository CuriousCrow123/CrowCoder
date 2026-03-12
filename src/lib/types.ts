// Shared types for CrowCoder

/**
 * Component value registry — add new types here as components are built.
 * Each entry maps a component type to its value shape.
 */
export interface ComponentValueRegistry {
  colorPicker: { hue: number; name: string };
}

/** Composite key for component values: "type:instanceId" */
export type ComponentKey = `${keyof ComponentValueRegistry}:${string}`;
