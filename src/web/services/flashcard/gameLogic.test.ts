import { describe, it, expect } from 'vitest';
import {
  evaluateCoordinateSelection,
  updateMatchMetrics,
  calculateAccuracy,
  summarizeExistingMatches,
  type CoordinateSelectionParams,
  type MatchMetrics,
} from './gameLogic';
import type { ChartCoordinate } from '@breakout-study-tool/shared';

describe('gameLogic', () => {
  describe('evaluateCoordinateSelection', () => {
    it('should return null values when target is missing', () => {
      const params: CoordinateSelectionParams = {
        coordinates: { x: 10, y: 50 },
        target: undefined,
        priceRange: { min: 0, max: 100 },
        timeRange: { min: 0, max: 100 },
      };

      const result = evaluateCoordinateSelection(params);

      expect(result.distance).toBeNull();
      expect(result.score).toBeNull();
      expect(result.isCorrect).toBe(false);
    });

    it('should return null values when priceRange is missing', () => {
      const params: CoordinateSelectionParams = {
        coordinates: { x: 10, y: 50 },
        target: { x: 10, y: 50 },
        priceRange: undefined,
        timeRange: { min: 0, max: 100 },
      };

      const result = evaluateCoordinateSelection(params);

      expect(result.distance).toBeNull();
      expect(result.score).toBeNull();
      expect(result.isCorrect).toBe(false);
    });

    it('should return null values when timeRange is missing', () => {
      const params: CoordinateSelectionParams = {
        coordinates: { x: 10, y: 50 },
        target: { x: 10, y: 50 },
        priceRange: { min: 0, max: 100 },
        timeRange: undefined,
      };

      const result = evaluateCoordinateSelection(params);

      expect(result.distance).toBeNull();
      expect(result.score).toBeNull();
      expect(result.isCorrect).toBe(false);
    });

    it('should calculate distance and score for exact match', () => {
      const coordinates: ChartCoordinate = { x: 50, y: 75 };
      const target: ChartCoordinate = { x: 50, y: 75 };
      const priceRange = { min: 0, max: 100 };
      const timeRange = { min: 0, max: 100 };

      const result = evaluateCoordinateSelection({
        coordinates,
        target,
        priceRange,
        timeRange,
      });

      expect(result.distance).toBe(0);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.isCorrect).toBe(true);
      expect(result.scoreData).toBeDefined();
    });

    it('should mark as incorrect when price accuracy is below threshold', () => {
      const coordinates: ChartCoordinate = { x: 10, y: 10 };
      const target: ChartCoordinate = { x: 90, y: 90 };
      const priceRange = { min: 0, max: 100 };
      const timeRange = { min: 0, max: 100 };

      const result = evaluateCoordinateSelection({
        coordinates,
        target,
        priceRange,
        timeRange,
      });

      expect(result.isCorrect).toBe(false);
      expect(result.scoreData?.priceAccuracy).toBeLessThan(70);
    });

    it('should mark as correct when price accuracy meets threshold', () => {
      const coordinates: ChartCoordinate = { x: 48, y: 75 };
      const target: ChartCoordinate = { x: 50, y: 75 };
      const priceRange = { min: 0, max: 100 };
      const timeRange = { min: 0, max: 100 };

      const result = evaluateCoordinateSelection({
        coordinates,
        target,
        priceRange,
        timeRange,
      });

      // Close coordinates should result in high accuracy
      expect(result.scoreData?.priceAccuracy).toBeGreaterThanOrEqual(70);
      expect(result.isCorrect).toBe(true);
    });
  });

  describe('updateMatchMetrics', () => {
    it('should increment matchCount and correctCount for correct match', () => {
      const initial: MatchMetrics = { matchCount: 5, correctCount: 3 };

      const result = updateMatchMetrics(initial, true);

      expect(result.matchCount).toBe(6);
      expect(result.correctCount).toBe(4);
    });

    it('should increment matchCount but not correctCount for incorrect match', () => {
      const initial: MatchMetrics = { matchCount: 5, correctCount: 3 };

      const result = updateMatchMetrics(initial, false);

      expect(result.matchCount).toBe(6);
      expect(result.correctCount).toBe(3);
    });

    it('should handle zero initial values', () => {
      const initial: MatchMetrics = { matchCount: 0, correctCount: 0 };

      const result = updateMatchMetrics(initial, true);

      expect(result.matchCount).toBe(1);
      expect(result.correctCount).toBe(1);
    });
  });

  describe('calculateAccuracy', () => {
    it('should return 0 when matchCount is 0', () => {
      expect(calculateAccuracy(0, 0)).toBe(0);
      expect(calculateAccuracy(0, 5)).toBe(0);
    });

    it('should return 0 when matchCount is negative', () => {
      expect(calculateAccuracy(-1, 0)).toBe(0);
    });

    it('should calculate 100% accuracy correctly', () => {
      expect(calculateAccuracy(10, 10)).toBe(100);
    });

    it('should calculate 50% accuracy correctly', () => {
      expect(calculateAccuracy(10, 5)).toBe(50);
    });

    it('should calculate 0% accuracy correctly', () => {
      expect(calculateAccuracy(10, 0)).toBe(0);
    });

    it('should round accuracy to nearest integer', () => {
      expect(calculateAccuracy(3, 1)).toBe(33); // 33.33... rounded
      expect(calculateAccuracy(3, 2)).toBe(67); // 66.66... rounded
    });
  });

  describe('summarizeExistingMatches', () => {
    it('should return zero values for empty array', () => {
      const result = summarizeExistingMatches([]);

      expect(result.totalMatches).toBe(0);
      expect(result.correctMatches).toBe(0);
      expect(result.accuracy).toBe(0);
    });

    it('should calculate summary for all correct matches', () => {
      const matches = [
        { correct: true },
        { correct: true },
        { correct: true },
      ];

      const result = summarizeExistingMatches(matches);

      expect(result.totalMatches).toBe(3);
      expect(result.correctMatches).toBe(3);
      expect(result.accuracy).toBe(100);
    });

    it('should calculate summary for all incorrect matches', () => {
      const matches = [
        { correct: false },
        { correct: false },
      ];

      const result = summarizeExistingMatches(matches);

      expect(result.totalMatches).toBe(2);
      expect(result.correctMatches).toBe(0);
      expect(result.accuracy).toBe(0);
    });

    it('should calculate summary for mixed matches', () => {
      const matches = [
        { correct: true },
        { correct: false },
        { correct: true },
        { correct: false },
        { correct: true },
      ];

      const result = summarizeExistingMatches(matches);

      expect(result.totalMatches).toBe(5);
      expect(result.correctMatches).toBe(3);
      expect(result.accuracy).toBe(60);
    });

    it('should round accuracy correctly', () => {
      const matches = [
        { correct: true },
        { correct: false },
      ];

      const result = summarizeExistingMatches(matches);

      expect(result.accuracy).toBe(50);
    });
  });
});

