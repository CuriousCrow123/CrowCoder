/**
 * Integration test: cross-island state sharing via module-level $state singleton.
 *
 * Verifies that lesson.svelte.ts provides a single reactive state object
 * shared across all importers — the foundation for cross-island communication.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  lessonState,
  setHighlight,
  getComponentValue,
  setComponentValue,
} from "./lesson.svelte";

describe("lesson state singleton", () => {
  beforeEach(() => {
    // Reset state between tests
    lessonState.activeHighlight = null;
    lessonState.componentValues = {};
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

  describe("component values", () => {
    it("setComponentValue stores typed values", () => {
      setComponentValue("colorPicker", "main", { hue: 180, name: "Teal" });
      expect(lessonState.componentValues["colorPicker:main"]).toEqual({
        hue: 180,
        name: "Teal",
      });
    });

    it("getComponentValue retrieves typed values", () => {
      setComponentValue("slider", "volume", { current: 75 });
      const value = getComponentValue("slider", "volume");
      expect(value).toEqual({ current: 75 });
    });

    it("getComponentValue returns undefined for missing keys", () => {
      const value = getComponentValue("colorPicker", "nonexistent");
      expect(value).toBeUndefined();
    });

    it("multiple components coexist without interference", () => {
      setComponentValue("colorPicker", "a", { hue: 0, name: "Red" });
      setComponentValue("colorPicker", "b", { hue: 120, name: "Green" });
      setComponentValue("slider", "x", { current: 50 });

      expect(getComponentValue("colorPicker", "a")).toEqual({
        hue: 0,
        name: "Red",
      });
      expect(getComponentValue("colorPicker", "b")).toEqual({
        hue: 120,
        name: "Green",
      });
      expect(getComponentValue("slider", "x")).toEqual({ current: 50 });
    });

    it("overwriting a component value replaces it entirely", () => {
      setComponentValue("colorPicker", "main", { hue: 0, name: "Red" });
      setComponentValue("colorPicker", "main", { hue: 240, name: "Blue" });
      expect(getComponentValue("colorPicker", "main")).toEqual({
        hue: 240,
        name: "Blue",
      });
    });
  });

  describe("cross-island interaction pattern", () => {
    it("simulates ProseHighlight + ColorPicker interaction", () => {
      // ColorPicker sets its value and highlights related prose
      setComponentValue("colorPicker", "main", { hue: 270, name: "Purple" });
      setHighlight("color-main");

      // ProseHighlight reads the shared highlight state
      expect(lessonState.activeHighlight).toBe("color-main");

      // Both components see the same color value
      const color = getComponentValue("colorPicker", "main");
      expect(color?.name).toBe("Purple");

      // User clicks ProseHighlight to deactivate
      setHighlight(null);
      expect(lessonState.activeHighlight).toBeNull();

      // Component value persists after highlight cleared
      expect(getComponentValue("colorPicker", "main")?.hue).toBe(270);
    });
  });
});
