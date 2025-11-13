/**
 * @fileoverview Smoke tests ensuring component barrel exports resolve without runtime errors.
 * @module src/web/components/__tests__/components.test.js
 * @dependencies jest
 */
/**
 * Component Import Validation Tests
 * 
 * Simple tests to ensure all components can be imported correctly
 * after the refactoring and reorganization.
 */

describe('Component Imports', () => {
  test('should import core components without errors', async () => {
    const { StockChart, ChartSection, DateFolderBrowser } = await import('../index');
    
    expect(StockChart).toBeDefined();
    expect(ChartSection).toBeDefined();
    expect(DateFolderBrowser).toBeDefined();
  });

  test('should import UI components without errors', async () => {
    const { Popup, BackButton, ActionButtonsRow, TimerDurationSelector } = await import('../index');
    
    expect(Popup).toBeDefined();
    expect(BackButton).toBeDefined();
    expect(ActionButtonsRow).toBeDefined();
    expect(TimerDurationSelector).toBeDefined();
  });

  test('should import layout components without errors', async () => {
    const { Header, LandingPage, FolderSection } = await import('../index');
    
    expect(Header).toBeDefined();
    expect(LandingPage).toBeDefined();
    expect(FolderSection).toBeDefined();
  });

  test('should import feature components without errors', async () => {
    const { RoundHistory } = await import('../index');
    
    expect(RoundHistory).toBeDefined();
  });

  test('should import utility components without errors', async () => {
    const { ErrorBoundary, GoogleAnalytics } = await import('../index');
    
    expect(ErrorBoundary).toBeDefined();
    expect(GoogleAnalytics).toBeDefined();
  });
});

describe('StockChart Utilities', () => {
  test('should import chart technical indicators', async () => {
    const { calculateSMA, processChartData } = await import('@/services/chart/technicalIndicators');
    
    expect(calculateSMA).toBeDefined();
    expect(processChartData).toBeDefined();
  });

  test('processChartData should normalize SMA fields', async () => {
    const { processChartData } = await import('@/services/chart/technicalIndicators');
    
    const input = [
      { Close: 10, SMA10: 5 },
      { Close: 12, SMA10: 6 },
    ];
    
    const result = processChartData(input, 'daily');
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].close).toBe(10);
  });
});