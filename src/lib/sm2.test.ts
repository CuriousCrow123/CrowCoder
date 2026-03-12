/**
 * Unit tests for SM-2 spaced repetition algorithm.
 *
 * Tests verify the core SM-2 formulas against known expected values:
 *   EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
 *   I(1) = 1, I(2) = 6, I(n) = I(n-1) * EF
 */
import { describe, it, expect } from "vitest";
import {
  calculateSM2,
  createNewCard,
  INITIAL_EASE_FACTOR,
  MIN_EASE_FACTOR,
} from "./sm2";
import type { SM2Quality } from "./types";

describe("SM-2 algorithm", () => {
  describe("createNewCard", () => {
    it("returns default values for a new card", () => {
      const card = createNewCard();
      expect(card.interval).toBe(0);
      expect(card.repetitions).toBe(0);
      expect(card.easeFactor).toBe(INITIAL_EASE_FACTOR);
    });
  });

  describe("first review (repetitions = 0)", () => {
    it("correct answer sets interval to 1 day", () => {
      const result = calculateSM2({
        quality: 5,
        repetitions: 0,
        easeFactor: 2.5,
        interval: 0,
      });
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(1);
    });

    it("incorrect answer keeps interval at 1 day and resets repetitions", () => {
      const result = calculateSM2({
        quality: 1,
        repetitions: 0,
        easeFactor: 2.5,
        interval: 0,
      });
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(0);
    });
  });

  describe("second review (repetitions = 1)", () => {
    it("correct answer sets interval to 6 days", () => {
      const result = calculateSM2({
        quality: 4,
        repetitions: 1,
        easeFactor: 2.5,
        interval: 1,
      });
      expect(result.interval).toBe(6);
      expect(result.repetitions).toBe(2);
    });
  });

  describe("subsequent reviews (repetitions >= 2)", () => {
    it("multiplies interval by ease factor", () => {
      const result = calculateSM2({
        quality: 5,
        repetitions: 2,
        easeFactor: 2.5,
        interval: 6,
      });
      // 6 * 2.6 = 15.6 → ceil → 16
      // EF' = 2.5 + (0.1 - 0 * (0.08 + 0 * 0.02)) = 2.6
      expect(result.interval).toBe(Math.ceil(6 * 2.6));
      expect(result.repetitions).toBe(3);
    });

    it("rounds up fractional intervals", () => {
      const result = calculateSM2({
        quality: 3,
        repetitions: 2,
        easeFactor: 2.5,
        interval: 6,
      });
      // EF' = 2.5 + (0.1 - 2*(0.08 + 2*0.02)) = 2.5 + (0.1 - 0.24) = 2.36
      // interval = ceil(6 * 2.36) = ceil(14.16) = 15
      expect(result.interval).toBe(15);
    });
  });

  describe("ease factor calculation", () => {
    it("perfect response (q=5) increases EF by 0.1", () => {
      const result = calculateSM2({
        quality: 5,
        repetitions: 2,
        easeFactor: 2.5,
        interval: 6,
      });
      // EF' = 2.5 + (0.1 - 0*(0.08 + 0*0.02)) = 2.6
      expect(result.easeFactor).toBeCloseTo(2.6);
    });

    it("q=4 keeps EF unchanged", () => {
      const result = calculateSM2({
        quality: 4,
        repetitions: 2,
        easeFactor: 2.5,
        interval: 6,
      });
      // EF' = 2.5 + (0.1 - 1*(0.08 + 1*0.02)) = 2.5 + (0.1 - 0.1) = 2.5
      expect(result.easeFactor).toBeCloseTo(2.5);
    });

    it("q=3 decreases EF", () => {
      const result = calculateSM2({
        quality: 3,
        repetitions: 2,
        easeFactor: 2.5,
        interval: 6,
      });
      // EF' = 2.5 + (0.1 - 2*(0.08 + 2*0.02)) = 2.5 + (0.1 - 0.24) = 2.36
      expect(result.easeFactor).toBeCloseTo(2.36);
    });

    it("q=0 decreases EF significantly", () => {
      const result = calculateSM2({
        quality: 0,
        repetitions: 2,
        easeFactor: 2.5,
        interval: 6,
      });
      // EF' = 2.5 + (0.1 - 5*(0.08 + 5*0.02)) = 2.5 + (0.1 - 0.9) = 1.7
      expect(result.easeFactor).toBeCloseTo(1.7);
    });

    it("never drops below MIN_EASE_FACTOR (1.3)", () => {
      const result = calculateSM2({
        quality: 0,
        repetitions: 2,
        easeFactor: 1.3,
        interval: 6,
      });
      // EF' = 1.3 + (0.1 - 0.9) = 0.5 → clamped to 1.3
      expect(result.easeFactor).toBe(MIN_EASE_FACTOR);
    });
  });

  describe("quality < 3 resets schedule", () => {
    it("q=2 resets repetitions to 0 and interval to 1", () => {
      const result = calculateSM2({
        quality: 2,
        repetitions: 5,
        easeFactor: 2.5,
        interval: 30,
      });
      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1);
    });

    it("preserves updated ease factor on reset", () => {
      const result = calculateSM2({
        quality: 2,
        repetitions: 5,
        easeFactor: 2.5,
        interval: 30,
      });
      // EF' = 2.5 + (0.1 - 3*(0.08 + 3*0.02)) = 2.5 + (0.1 - 0.42) = 2.18
      expect(result.easeFactor).toBeCloseTo(2.18);
    });
  });

  describe("full review sequence", () => {
    it("simulates a student consistently scoring q=4", () => {
      let card = createNewCard();
      const quality: SM2Quality = 4;

      // Review 1: interval → 1
      let result = calculateSM2({ quality, ...card });
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(1);
      card = result;

      // Review 2: interval → 6
      result = calculateSM2({ quality, ...card });
      expect(result.interval).toBe(6);
      expect(result.repetitions).toBe(2);
      card = result;

      // Review 3: interval → ceil(6 * 2.5) = 15
      result = calculateSM2({ quality, ...card });
      expect(result.interval).toBe(15);
      expect(result.repetitions).toBe(3);
      card = result;

      // Review 4: interval → ceil(15 * 2.5) = 38
      result = calculateSM2({ quality, ...card });
      expect(result.interval).toBe(38);
      expect(result.repetitions).toBe(4);
    });

    it("simulates failing then recovering", () => {
      let card = createNewCard();

      // Pass twice
      card = calculateSM2({ quality: 5, ...card });
      card = calculateSM2({ quality: 5, ...card });
      expect(card.repetitions).toBe(2);
      expect(card.interval).toBe(6);

      // Fail — resets to beginning
      card = calculateSM2({ quality: 1, ...card });
      expect(card.repetitions).toBe(0);
      expect(card.interval).toBe(1);

      // Recover
      card = calculateSM2({ quality: 5, ...card });
      expect(card.repetitions).toBe(1);
      expect(card.interval).toBe(1);
    });
  });
});
