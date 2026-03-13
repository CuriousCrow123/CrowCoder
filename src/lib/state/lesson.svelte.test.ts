/**
 * Integration test: cross-island state sharing via module-level $state singleton.
 *
 * Verifies that lesson.svelte.ts provides a single reactive state object
 * shared across all importers — the foundation for cross-island communication.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { lessonState, setHighlight } from "./lesson.svelte";

describe("lesson state singleton", () => {
  beforeEach(() => {
    // Reset state between tests
    lessonState.activeHighlight = null;
  });

  describe("highlight sharing", () => {
    it("starts with no active highlight", () => {
      expect(lessonState.activeHighlight).toBeNull();
    });

    it("setHighlight updates the shared state", () => {
      setHighlight("color-main");
      expect(lessonState.activeHighlight).toBe("color-main");
    });

    it("setHighlight(null) clears the highlight", () => {
      setHighlight("color-main");
      setHighlight(null);
      expect(lessonState.activeHighlight).toBeNull();
    });

    it("multiple importers see the same state object", async () => {
      // Simulate two islands importing the same module
      const moduleA = await import("./lesson.svelte");
      const moduleB = await import("./lesson.svelte");

      // Same reference — Vite module deduplication
      expect(moduleA.lessonState).toBe(moduleB.lessonState);

      // Mutation from A visible to B
      moduleA.setHighlight("test-id");
      expect(moduleB.lessonState.activeHighlight).toBe("test-id");
    });
  });

});
