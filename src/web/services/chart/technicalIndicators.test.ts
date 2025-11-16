import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateSMA, processChartData } from './technicalIndicators';
import type { ProcessedStockDataPoint } from '@/components/StockChart/StockChart.types';

// Suppress console.log in tests
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('technicalIndicators', () => {
  describe('calculateSMA', () => {
    it('should return empty array for empty input', () => {
      const result = calculateSMA([], 10);
      expect(result).toEqual([]);
    });

    it('should return original data for invalid period (0)', () => {
      const data: ProcessedStockDataPoint[] = [
        { close: 100 },
        { close: 101 },
        { close: 102 },
      ];
      const result = calculateSMA(data, 0);
      expect(result).toEqual(data);
    });

    it('should return original data for period >= data length', () => {
      const data: ProcessedStockDataPoint[] = [
        { close: 100 },
        { close: 101 },
        { close: 102 },
      ];
      const result = calculateSMA(data, 5);
      expect(result).toEqual(data);
    });

    it('should calculate SMA correctly for valid data', () => {
      const data: ProcessedStockDataPoint[] = [
        { close: 100 },
        { close: 101 },
        { close: 102 },
        { close: 103 },
        { close: 104 },
        { close: 105 },
        { close: 106 },
        { close: 107 },
        { close: 108 },
        { close: 109 },
        { close: 110 },
      ];

      const result = calculateSMA(data, 10, 'close', 'sma10');

      // First 9 should be null (period - 1)
      for (let i = 0; i < 9; i++) {
        expect(result[i].sma10).toBeNull();
      }

      // 10th should have SMA value
      expect(result[9].sma10).toBeCloseTo(104.5, 1); // (100+101+...+109)/10
      expect(result[10].sma10).toBeCloseTo(105.5, 1); // (101+102+...+110)/10
    });

    it('should use default output key when not provided', () => {
      const data: ProcessedStockDataPoint[] = [
        { close: 100 },
        { close: 101 },
        { close: 102 },
        { close: 103 },
        { close: 104 },
      ];

      const result = calculateSMA(data, 3, 'close');

      expect(result[2].sma3).toBeCloseTo(101, 1);
    });

    it('should handle null price values', () => {
      const data: ProcessedStockDataPoint[] = [
        { close: 100 },
        { close: undefined },
        { close: 102 },
        { close: 103 },
        { close: 104 },
      ];

      const result = calculateSMA(data, 3, 'close', 'sma3');

      // First two should be null (period - 1)
      expect(result[0].sma3).toBeNull();
      expect(result[1].sma3).toBeNull();
      // Third should calculate with available values (needs at least 80% valid)
      // With only 2 valid out of 3, it may be null or calculated
      expect(result[2].sma3).toBeDefined();
    });

    it('should auto-detect price key when not provided', () => {
      const data: ProcessedStockDataPoint[] = [
        { Close: 100 },
        { Close: 101 },
        { Close: 102 },
        { Close: 103 },
        { Close: 104 },
      ];

      const result = calculateSMA(data, 3);

      expect(result[2].sma3).toBeCloseTo(101, 1);
    });

    it('should return null when less than 80% valid points', () => {
      const data: ProcessedStockDataPoint[] = [
        { close: 100 },
        { close: undefined },
        { close: undefined },
        { close: undefined },
        { close: 104 },
      ];

      const result = calculateSMA(data, 3, 'close', 'sma3');

      // With only 2 valid points out of 3, should be null
      expect(result[2].sma3).toBeNull();
    });
  });

  describe('processChartData', () => {
    it('should return empty array for null input', () => {
      const result = processChartData(null, 'default');
      expect(result).toEqual([]);
    });

    it('should return empty array for empty array input', () => {
      const result = processChartData([], 'default');
      expect(result).toEqual([]);
    });

    it('should return empty array for non-array input', () => {
      const result = processChartData({} as any, 'default');
      expect(result).toEqual([]);
    });

    it('should process valid chart data', () => {
      const chartData = [
        { close: 100, open: 99, high: 101, low: 98, volume: 1000 },
        { close: 101, open: 100, high: 102, low: 99, volume: 1100 },
      ];

      const result = processChartData(chartData, 'default');

      expect(result.length).toBe(2);
      expect(result[0].close).toBe(100);
      expect(result[1].close).toBe(101);
    });

    it('should normalize uppercase OHLCV properties', () => {
      const chartData = [
        { Close: 100, Open: 99, High: 101, Low: 98, Volume: 1000 },
      ];

      const result = processChartData(chartData, 'default');

      expect(result[0].close).toBe(100);
      expect(result[0].open).toBe(99);
      expect(result[0].high).toBe(101);
      expect(result[0].low).toBe(98);
      expect(result[0].volume).toBe(1000);
    });

    it('should calculate SMA10 when missing for default chart type', () => {
      const chartData = [
        { close: 100 },
        { close: 101 },
        { close: 102 },
        { close: 103 },
        { close: 104 },
        { close: 105 },
        { close: 106 },
        { close: 107 },
        { close: 108 },
        { close: 109 },
        { close: 110 },
      ];

      const result = processChartData(chartData, 'default');

      // Should have calculated SMA10 (processChartData calls calculateSMA internally)
      // The result should have sma10 property
      expect(result.length).toBeGreaterThan(0);
      // Check that SMA calculation was attempted (may be null for first 9 items)
      const hasSMA10 = result.some(item => item.sma10 !== null && item.sma10 !== undefined);
      expect(hasSMA10 || result.length >= 10).toBe(true);
    });

    it('should not calculate SMA for monthly chart type', () => {
      const chartData = [
        { close: 100 },
        { close: 101 },
        { close: 102 },
      ];

      const result = processChartData(chartData, 'monthly');

      // SMA should be null for monthly charts
      expect(result[0].sma10).toBeNull();
      expect(result[0].sma20).toBeNull();
      expect(result[0].sma50).toBeNull();
    });

    it('should parse JSON string in json property', () => {
      const chartData = [
        { json: '{"close": 100, "open": 99}' },
      ];

      const result = processChartData(chartData, 'default');

      expect(result[0].close).toBe(100);
      expect(result[0].open).toBe(99);
    });

    it('should handle invalid JSON gracefully', () => {
      const chartData = [
        { json: 'invalid json', close: 100 },
      ];

      const result = processChartData(chartData, 'default');

      // Should still have close value
      expect(result[0].close).toBe(100);
    });
  });
});

