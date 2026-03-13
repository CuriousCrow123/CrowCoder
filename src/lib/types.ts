// Shared types for CrowCoder

import { z } from "zod";

/**
 * Component value registry — add new types here as components are built.
 * Each entry maps a component type to its value shape.
 */
export interface ComponentValueRegistry {
  colorPicker: { hue: number; name: string };
}

/** Composite key for component values: "type:instanceId" */
export type ComponentKey = `${keyof ComponentValueRegistry}:${string}`;

// --- SM-2 Spaced Repetition Types ---

/** SM-2 quality response: 0 (complete blackout) to 5 (perfect recall) */
export type SM2Quality = 0 | 1 | 2 | 3 | 4 | 5;

/** Branded ISO date string for type safety */
export type ISODateString = string & { readonly __brand: "ISODateString" };

export function toISODateString(date: Date): ISODateString {
  return date.toISOString() as ISODateString;
}

export function parseISODateString(value: string): ISODateString | null {
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : (value as ISODateString);
}

// --- Zod Schemas (single source of truth for persistence) ---

export const CardDataSchema = z.object({
  interval: z.number().int().min(0),
  repetitions: z.number().int().min(0),
  easeFactor: z.number().min(1.3),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T/),
  lastAnswer: z.literal([0, 1, 2, 3, 4, 5]),
  lastReviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}T/),
  lastSelectedIndex: z.number().int().min(0).optional(),
});

export type CardData = z.infer<typeof CardDataSchema>;

export const ProgressDataSchema = z.object({
  schemaVersion: z.literal(1),
  cards: z.record(z.string(), CardDataSchema),
  exportedAt: z.string().optional(),
});

export type ProgressData = z.infer<typeof ProgressDataSchema>;
