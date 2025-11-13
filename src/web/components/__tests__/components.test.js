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
  test('should import StockChart utilities without errors', async () => {
    const { getPrice, getVolume, calculateSMA, hasSMAData, getSMAConfig } = await import('../StockChart/utils');
    
    expect(getPrice).toBeDefined();
    expect(getVolume).toBeDefined();
    expect(calculateSMA).toBeDefined();
    expect(hasSMAData).toBeDefined();
    expect(getSMAConfig).toBeDefined();
  });

  test('getPrice should handle various property names', async () => {
    const { getPrice } = await import('../StockChart/utils');
    
    const testData = { close: 100.5, Close: 200.5 };
    const result1 = getPrice(testData, ['close']);
    const result2 = getPrice(testData, ['Close']);
    const result3 = getPrice(testData, ['price', 'close']);
    
    expect(result1).toBe(100.5);
    expect(result2).toBe(200.5);
    expect(result3).toBe(100.5);
  });

  test('getSMAConfig should return correct configuration', async () => {
    const { getSMAConfig } = await import('../StockChart/utils');
    
    const hourlyConfig = getSMAConfig('hourly');
    const monthlyConfig = getSMAConfig('monthly');
    const defaultConfig = getSMAConfig('daily');
    
    expect(hourlyConfig.showSMA50).toBe(false);
    expect(monthlyConfig.showSMA10).toBe(false);
    expect(defaultConfig.showSMA10).toBe(true);
  });
}); 