// Shared types for CrowCoder

/** SM-2 quality rating (0-5) */
export type SM2Quality = 0 | 1 | 2 | 3 | 4 | 5;

/** Branded type for ISO date strings — ensures type safety at boundaries */
export type ISODateString = string & { readonly __brand: "ISODateString" };

export function toISODateString(date: Date): ISODateString {
  return date.toISOString() as ISODateString;
}

export function parseISODateString(value: string): ISODateString {
  // Validate it's a parseable date
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid ISO date string: "${value}"`);
  }
  return value as ISODateString;
}

/**
 * Component value registry — add new types here as components are built.
 * Each entry maps a component type to its value shape.
 */
export interface ComponentValueRegistry {
  slider: { current: number };
  colorPicker: { hue: number; name: string };
  codeEditor: { source: string; hasError: boolean };
}

/** Composite key for component values: "type:instanceId" */
export type ComponentKey = `${keyof ComponentValueRegistry}:${string}`;
