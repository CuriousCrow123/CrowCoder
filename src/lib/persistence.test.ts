/**
 * Unit tests for persistence module.
 * Tests Zod validation, import validation, and storage operations.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadProgress, saveProgress, isStorageAvailable } from "./persistence";
import type { ProgressData } from "./types";

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
};

vi.stubGlobal("localStorage", localStorageMock);

beforeEach(() => {
  Object.keys(store).forEach((key) => delete store[key]);
  vi.clearAllMocks();
});

describe("loadProgress", () => {
  it("returns null when nothing is stored", () => {
    expect(loadProgress()).toBeNull();
  });

  it("returns validated data for valid stored progress", () => {
    const data: ProgressData = {
      schemaVersion: 1,
      cards: {
        "q1": {
          interval: 1,
          repetitions: 1,
          easeFactor: 2.5,
          dueDate: "2026-03-13T00:00:00.000Z",
          lastAnswer: 5,
          lastReviewed: "2026-03-12T00:00:00.000Z",
        },
      },
    };
    store["crowcoder-progress"] = JSON.stringify(data);
    const result = loadProgress();
    expect(result).toEqual(data);
  });

  it("returns null for invalid JSON", () => {
    store["crowcoder-progress"] = "not json";
    expect(loadProgress()).toBeNull();
  });

  it("returns null for data failing Zod validation", () => {
    store["crowcoder-progress"] = JSON.stringify({
      schemaVersion: 99,
      cards: {},
    });
    expect(loadProgress()).toBeNull();
  });

  it("rejects cards with invalid ease factor", () => {
    store["crowcoder-progress"] = JSON.stringify({
      schemaVersion: 1,
      cards: {
        "q1": {
          interval: 1,
          repetitions: 1,
          easeFactor: 0.5, // below 1.3 minimum
          dueDate: "2026-03-13T00:00:00.000Z",
          lastAnswer: 5,
          lastReviewed: "2026-03-12T00:00:00.000Z",
        },
      },
    });
    expect(loadProgress()).toBeNull();
  });

  it("rejects cards with invalid lastAnswer quality", () => {
    store["crowcoder-progress"] = JSON.stringify({
      schemaVersion: 1,
      cards: {
        "q1": {
          interval: 1,
          repetitions: 1,
          easeFactor: 2.5,
          dueDate: "2026-03-13T00:00:00.000Z",
          lastAnswer: 7, // invalid quality
          lastReviewed: "2026-03-12T00:00:00.000Z",
        },
      },
    });
    expect(loadProgress()).toBeNull();
  });
});

describe("saveProgress", () => {
  it("saves valid data to localStorage", () => {
    const data: ProgressData = {
      schemaVersion: 1,
      cards: {},
    };
    const result = saveProgress(data);
    expect(result).toBe(true);
    expect(store["crowcoder-progress"]).toBe(JSON.stringify(data));
  });
});

describe("isStorageAvailable", () => {
  it("returns true when localStorage works", () => {
    expect(isStorageAvailable()).toBe(true);
  });
});
