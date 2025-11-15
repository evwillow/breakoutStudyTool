import { useCallback, useEffect } from "react";
import type {
  MutableRefObject,
  RefObject,
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent
} from "react";
import type {
  ChartClickHandler,
  ChartDimensions,
  ChartScales,
  ChartType,
  ContainerRef,
  DragStartPos,
  ProcessedStockDataPoint
} from "../StockChart.types";

interface UseChartInteractionParams {
  containerRef: RefObject<ContainerRef | null>;
  svgRef: RefObject<SVGSVGElement | null>;
  handleChartClickRef: MutableRefObject<ChartClickHandler | null>;
  isDraggingRef: MutableRefObject<boolean>;
  dragStartPosRef: MutableRefObject<DragStartPos>;
  isInSelectableAreaRef: MutableRefObject<boolean>;
  scales: ChartScales | null;
  dimensions: ChartDimensions | null;
  stockData: ProcessedStockDataPoint[];
  isMobile: boolean;
  onChartClick: ChartClickHandler | null;
  disabled: boolean;
  chartType?: ChartType;
  dividerLineX?: number;
}

interface UseChartInteractionResult {
  handleChartClick: (event: ReactMouseEvent<SVGSVGElement>) => void;
  handleMouseDown: (event: ReactMouseEvent<SVGSVGElement>) => void;
  handleMouseMove: (event: ReactMouseEvent<SVGSVGElement>) => void;
  handleMouseUp: (event: ReactMouseEvent<SVGSVGElement>) => void;
  handleTouchStart: (event: ReactTouchEvent<SVGSVGElement>) => void;
  handleTouchMove: (event: ReactTouchEvent<SVGSVGElement>) => void;
  handleTouchEnd: (event: ReactTouchEvent<SVGSVGElement>) => void;
}

export const useChartInteraction = ({
  containerRef,
  svgRef,
  handleChartClickRef,
  isDraggingRef,
  dragStartPosRef,
  isInSelectableAreaRef,
  scales,
  dimensions,
  stockData,
  isMobile,
  onChartClick,
  disabled,
  chartType = 'default',
  dividerLineX
}: UseChartInteractionParams): UseChartInteractionResult => {
  const handleChartClick = useCallback(
    (event: ReactMouseEvent<SVGSVGElement>): void => {
      if (!onChartClick) {
        console.log("Chart click blocked: onChartClick is not provided");
        return;
      }
      if (disabled) {
        console.log("Chart click blocked: chart is disabled");
        return;
      }
      if (!scales || !dimensions || !svgRef.current || stockData.length === 0) {
        console.log("Chart click blocked: chart not ready", {
          scales: !!scales,
          dimensions: !!dimensions,
          svgRef: !!svgRef.current,
          stockData: stockData.length
        });
        return;
      }

      const point = svgRef.current.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const svgPoint = point.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
      if (!svgPoint) return;

      const chartX = svgPoint.x - (dimensions.margin.left || 0);
      const chartY = svgPoint.y - (dimensions.margin.top || 0);

      const isDChart = chartType === "default" || chartType === "D";
      const lastDataIndex = stockData.length - 1;
      const step = scales.xScale.step();

      console.log('[handleChartClick] Chart type:', chartType, 'isDChart:', isDChart);

      let selectionStartX: number;

      // For D charts, use the divider line position
      if (isDChart) {
        // Calculate divider position from dimensions
        const dividerPositionPercent = isMobile ? 0.70 : 0.75;
        const dividerPositionInChart = dimensions.innerWidth * dividerPositionPercent;
        const borderLineOffsetForCursor = isMobile ? 0.1 : 0.2;
        selectionStartX = dividerPositionInChart + step * borderLineOffsetForCursor;

        console.log('[handleChartClick] D Chart - innerWidth:', dimensions.innerWidth, 'dividerPercent:', dividerPositionPercent, 'dividerPosition:', dividerPositionInChart, 'step:', step, 'selectionStartX:', selectionStartX);
      } else {
        // For non-D charts, use the last data point position
        const lastDataCenterX = scales.xScale(lastDataIndex);
        if (lastDataCenterX === undefined) return;
        selectionStartX = lastDataCenterX + step / 2;
      }

      console.log('[handleChartClick] chartX:', chartX, 'selectionStartX:', selectionStartX, 'isInSelectableArea:', chartX > selectionStartX);

      if (chartX <= selectionStartX) {
        console.log(
          "Selection must be after the last data point. Clicked at:",
          chartX,
          "Selection start at:",
          selectionStartX
        );
        return;
      }

      const stepsBeyond = Math.max(0, Math.round((chartX - selectionStartX) / step));
      const selectedIndex = lastDataIndex + stepsBeyond + 1;
      const price = Math.max(0, scales.priceScale.invert(chartY));

      console.log("Selection made - Index:", selectedIndex, "Price:", price, "Last data index:", lastDataIndex, "Chart coordinates:", { chartX, chartY });

      onChartClick({
        x: selectedIndex,
        y: price,
        chartX,
        chartY
      });
      console.log("Selection coordinates passed to parent handler");
    },
    [onChartClick, disabled, scales, dimensions, stockData, svgRef, chartType, isMobile]
  );

  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as any).handleChartClick = handleChartClick;
    }
    handleChartClickRef.current = handleChartClick as ChartClickHandler;
  }, [containerRef, handleChartClick, handleChartClickRef]);

  const isInSelectableArea = useCallback(
    (chartX: number): boolean => {
      if (!scales || stockData.length === 0 || !dimensions) return false;

      const isDChart = chartType === "default" || chartType === "D";

      // For D charts, use the divider line position
      if (isDChart) {
        // Calculate divider position from dimensions if dividerLineX is not valid
        const dividerPositionPercent = isMobile ? 0.70 : 0.75;
        const dividerPositionInChart = dimensions.innerWidth * dividerPositionPercent;
        // Selectable area starts at the divider line (with a small offset for cursor)
        const borderLineOffsetForCursor = isMobile ? 0.1 : 0.2;
        const step = scales.xScale.step();
        const selectableAreaStart = dividerPositionInChart + step * borderLineOffsetForCursor;

        console.log('[isInSelectableArea] D Chart - chartX:', chartX, 'selectableAreaStart:', selectableAreaStart, 'dividerPositionInChart:', dividerPositionInChart, 'step:', step);

        return chartX > selectableAreaStart;
      }

      // For non-D charts, use the last data point position
      const lastDataIndex = stockData.length - 1;
      const lastDataCenterX = scales.xScale(lastDataIndex);
      if (lastDataCenterX === undefined) return false;
      const step = scales.xScale.step();
      // Reduced offset - selectable area starts just after the last candlestick
      const borderLineOffsetForCursor = isMobile ? 0.1 : 0.2;
      const lastDataRightEdge = lastDataCenterX + step / 2 + step * borderLineOffsetForCursor;

      return chartX > lastDataRightEdge;
    },
    [scales, stockData, isMobile, chartType, dimensions]
  );

  const handleMouseDown = useCallback(
    (event: ReactMouseEvent<SVGSVGElement>): void => {
      if (!onChartClick || disabled || !scales || stockData.length === 0 || !svgRef.current || !dimensions) {
        return;
      }

      try {
        const point = svgRef.current.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        const svgPoint = point.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
        if (!svgPoint) return;
        const chartX = svgPoint.x - (dimensions.margin.left || 0);

        isInSelectableAreaRef.current = isInSelectableArea(chartX);
        isDraggingRef.current = true;
        dragStartPosRef.current = { x: event.clientX, y: event.clientY };

        if (!isInSelectableAreaRef.current) {
          return;
        }
      } catch (err) {
        console.error("Error in handleMouseDown:", err);
      }
    },
    [
      onChartClick,
      disabled,
      scales,
      stockData,
      svgRef,
      dimensions,
      isInSelectableArea,
      isInSelectableAreaRef,
      isDraggingRef,
      dragStartPosRef
    ]
  );

  const handleMouseMove = useCallback(
    (event: ReactMouseEvent<SVGSVGElement>): void => {
      if (!isDraggingRef.current) {
        if (!onChartClick || disabled || !scales || stockData.length === 0 || !svgRef.current || !dimensions) {
          if (svgRef.current) svgRef.current.style.cursor = "default";
          return;
        }

        try {
          const point = svgRef.current.createSVGPoint();
          point.x = event.clientX;
          point.y = event.clientY;
          const svgPoint = point.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
          if (!svgPoint) return;

          const chartX = svgPoint.x - (dimensions.margin.left || 0);
          
          // Use the same logic as isInSelectableArea to determine cursor
          const isDChart = chartType === "default" || chartType === "D";
          let isSelectable = false;
          
          if (isDChart) {
            // Calculate divider position from dimensions
            const dividerPositionPercent = isMobile ? 0.70 : 0.75;
            const dividerPositionInChart = dimensions.innerWidth * dividerPositionPercent;
            const borderLineOffsetForCursor = isMobile ? 0.1 : 0.2;
            const step = scales.xScale.step();
            const selectableAreaStart = dividerPositionInChart + step * borderLineOffsetForCursor;
            isSelectable = chartX > selectableAreaStart;
          } else {
            const lastDataIndex = stockData.length - 1;
            const lastDataCenterX = scales.xScale(lastDataIndex);
            if (lastDataCenterX === undefined) return;
            const step = scales.xScale.step();
            const borderLineOffsetForCursor = isMobile ? 0.1 : 0.2;
            const lastDataRightEdge = lastDataCenterX + step / 2 + step * borderLineOffsetForCursor;
            isSelectable = chartX > lastDataRightEdge;
          }

          if (!isSelectable) {
            svgRef.current.style.cursor = "not-allowed";
          } else {
            svgRef.current.style.cursor = "crosshair";
          }
        } catch (err) {
          if (svgRef.current) svgRef.current.style.cursor = "default";
        }
        return;
      }

      if (!isInSelectableAreaRef.current) {
        return;
      }
    },
    [onChartClick, disabled, scales, stockData, svgRef, dimensions, isMobile, isDraggingRef, isInSelectableAreaRef, chartType]
  );

  const handleMouseUp = useCallback((): void => {
    if (!isDraggingRef.current) return;

    isDraggingRef.current = false;
    isInSelectableAreaRef.current = false;
  }, [isDraggingRef, isInSelectableAreaRef]);

  useEffect(() => {
    const handleGlobalMouseUp = (): void => {
      isDraggingRef.current = false;
      isInSelectableAreaRef.current = false;
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDraggingRef, isInSelectableAreaRef]);

  const handleTouchStart = useCallback(
    (event: ReactTouchEvent<SVGSVGElement>): void => {
      if (!onChartClick || disabled || !scales || stockData.length === 0 || !svgRef.current || !dimensions) {
        return;
      }

      try {
        const touch = event.touches[0];
        if (!touch) return;
        const point = svgRef.current.createSVGPoint();
        point.x = touch.clientX;
        point.y = touch.clientY;
        const svgPoint = point.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
        if (!svgPoint) return;
        const chartX = svgPoint.x - (dimensions.margin.left || 0);

        isInSelectableAreaRef.current = isInSelectableArea(chartX);
        isDraggingRef.current = true;
        dragStartPosRef.current = { x: touch.clientX, y: touch.clientY };

        if (!isInSelectableAreaRef.current) {
          return;
        }
      } catch (err) {
        console.error("Error in handleTouchStart:", err);
      }
    },
    [
      onChartClick,
      disabled,
      scales,
      stockData,
      svgRef,
      dimensions,
      isInSelectableArea,
      isInSelectableAreaRef,
      isDraggingRef,
      dragStartPosRef
    ]
  );

  const handleTouchMove = useCallback(
    (event: ReactTouchEvent<SVGSVGElement>): void => {
      if (!isDraggingRef.current || !isInSelectableAreaRef.current) {
        return;
      }
    },
    [isDraggingRef, isInSelectableAreaRef]
  );

  const handleTouchEnd = useCallback((): void => {
    isDraggingRef.current = false;
    isInSelectableAreaRef.current = false;
  }, [isDraggingRef, isInSelectableAreaRef]);

  return {
    handleChartClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
};

