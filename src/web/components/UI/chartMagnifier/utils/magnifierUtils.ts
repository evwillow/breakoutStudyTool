/**
 * @fileoverview Utility functions for chart magnifier coordinate calculations and bounds.
 * @module src/web/components/UI/chartMagnifier/utils/magnifierUtils.ts
 * @dependencies none
 */

/**
 * Selection area bounds structure
 */
export interface SelectionBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * Position coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Calculate selection area bounds (price chart area, excluding volume)
 */
export function getSelectionAreaBounds(chartElement: HTMLElement | null): SelectionBounds | null {
  if (!chartElement) return null;
  
  const rect = chartElement.getBoundingClientRect();
  // Volume is typically 25% of chart height on mobile, so selection area is top 75%
  const volumePercentage = 0.25;
  const selectionAreaHeight = rect.height * (1 - volumePercentage);
  
  return {
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.top + selectionAreaHeight,
    width: rect.width,
    height: selectionAreaHeight,
  };
}

/**
 * Calculate separator line position (divider between main and after data)
 */
export function getSeparatorX(chartElement: HTMLElement | null, mainDataLength: number): number | null {
  if (!chartElement || !mainDataLength) return null;
  
  const svgElement = chartElement.querySelector('svg');
  if (!svgElement) return null;
  
  const chartRect = chartElement.getBoundingClientRect();
  const svgRect = svgElement.getBoundingClientRect();
  
  // First, try to find the separator line
  const lines = svgElement.querySelectorAll('line');
  let separatorLine: Element | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const x1 = parseFloat(line.getAttribute('x1') || '0');
    const x2 = parseFloat(line.getAttribute('x2') || '0');
    if (x1 === x2 && x1 > svgRect.width * 0.7) {
      separatorLine = line;
      break;
    }
  }
  
  if (separatorLine) {
    const x1 = parseFloat(separatorLine.getAttribute('x1') || '0');
    return chartRect.left + x1;
  }
  
  // If no separator line, find the last D.json data point
  const dataElements = Array.from(svgElement.querySelectorAll('circle, rect, line'));
  let rightmostX = 0;
  
  for (const element of dataElements) {
    let x = 0;
    if (element.tagName === 'circle') {
      x = parseFloat(element.getAttribute('cx') || '0');
    } else if (element.tagName === 'rect') {
      x = parseFloat(element.getAttribute('x') || '0');
    } else if (element.tagName === 'line') {
      const x1 = parseFloat(element.getAttribute('x1') || '0');
      const x2 = parseFloat(element.getAttribute('x2') || '0');
      x = Math.max(x1, x2);
    }
    
    if (x > rightmostX && x < svgRect.width * 0.95) {
      rightmostX = x;
    }
  }
  
  if (rightmostX > 0) {
    return chartRect.left + rightmostX;
  }
  
  // Final fallback: Estimate based on data
  const totalWidth = svgRect.width;
  const leftPadding = 60;
  const rightPadding = 20;
  const availableWidth = totalWidth - leftPadding - rightPadding;
  const estimatedSeparatorX = leftPadding + availableWidth * 0.85;
  
  return chartRect.left + estimatedSeparatorX;
}

/**
 * Check if a touch position is in the selectable area (after the separator)
 */
export function isInSelectableArea(
  clientX: number,
  chartElement: HTMLElement | null,
  mainDataLength: number
): boolean {
  const separatorX = getSeparatorX(chartElement, mainDataLength);
  if (!separatorX) {
    // If we can't find separator, assume it's selectable (fallback to old behavior)
    return true;
  }
  // Selectable area is to the right of the separator
  return clientX > separatorX;
}

/**
 * Constrain a position within valid bounds
 */
export function constrainPosition(
  x: number,
  y: number,
  selectionBounds: SelectionBounds | null,
  chartElement: HTMLElement | null,
  mainDataLength: number
): Position {
  if (!selectionBounds) return { x: 0, y: 0 };
  
  const separatorX = getSeparatorX(chartElement, mainDataLength);
  let minX = 0;
  let maxX = selectionBounds.width;
  
  if (separatorX) {
    const separatorXInSelection = separatorX - selectionBounds.left;
    minX = separatorXInSelection; // Can only go from separator onwards (prediction area)
    maxX = selectionBounds.width; // Can reach the right edge of the selection area
  }
  
  const minY = 0;
  const maxY = selectionBounds.height;
  
  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y)),
  };
}

/**
 * Convert client coordinates to selection-area-relative coordinates
 */
export function clientToSelectionCoords(
  clientX: number,
  clientY: number,
  selectionBounds: SelectionBounds | null
): Position {
  if (!selectionBounds) return { x: 0, y: 0 };
  return {
    x: clientX - selectionBounds.left,
    y: clientY - selectionBounds.top,
  };
}

/**
 * Convert selection-area-relative coordinates to client coordinates
 */
export function selectionToClientCoords(
  x: number,
  y: number,
  selectionBounds: SelectionBounds | null
): Position {
  if (!selectionBounds) return { x: 0, y: 0 };
  return {
    x: selectionBounds.left + x,
    y: selectionBounds.top + y,
  };
}

/**
 * Calculate where the magnifier should be rendered (can move freely)
 */
export function getMagnifierRenderPosition(
  targetPos: Position,
  selectionBounds: SelectionBounds | null,
  magnifierSize: number
): Position {
  if (!selectionBounds) return { x: 0, y: 0 };
  
  // targetPos is the center point, constrained to be within selection area
  // Calculate render position (top-left corner) from center: center - size/2
  let renderX = targetPos.x - magnifierSize / 2;
  let renderY = targetPos.y - magnifierSize / 2;
  
  return { x: renderX, y: renderY };
}

