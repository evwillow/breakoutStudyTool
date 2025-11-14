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
  disabled
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

      const lastDataIndex = stockData.length - 1;
      const lastDataCenterX = scales.xScale(lastDataIndex);
      if (lastDataCenterX === undefined) return;
      const step = scales.xScale.step();
      const lastDataRightEdge = lastDataCenterX + step / 2;

      if (chartX <= lastDataRightEdge) {
        console.log(
          "Selection must be after the last data point. Clicked at:",
          chartX,
          "Last data right edge at:",
          lastDataRightEdge
        );
        return;
      }

      const stepsBeyond = Math.max(0, Math.round((chartX - lastDataRightEdge) / step));
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
    [onChartClick, disabled, scales, dimensions, stockData, svgRef]
  );

  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as any).handleChartClick = handleChartClick;
    }
    handleChartClickRef.current = handleChartClick as ChartClickHandler;
  }, [containerRef, handleChartClick, handleChartClickRef]);

  const isInSelectableArea = useCallback(
    (chartX: number): boolean => {
      if (!scales || stockData.length === 0) return false;

      const lastDataIndex = stockData.length - 1;
      const lastDataCenterX = scales.xScale(lastDataIndex);
      if (lastDataCenterX === undefined) return false;
      const step = scales.xScale.step();
      // Reduced offset - selectable area starts just after the last candlestick
      const borderLineOffsetForCursor = isMobile ? 0.1 : 0.2;
      const lastDataRightEdge = lastDataCenterX + step / 2 + step * borderLineOffsetForCursor;

      return chartX > lastDataRightEdge;
    },
    [scales, stockData, isMobile]
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
          const lastDataIndex = stockData.length - 1;
          const lastDataCenterX = scales.xScale(lastDataIndex);
          if (lastDataCenterX === undefined) return;
          const step = scales.xScale.step();
          // Reduced offset - selectable area starts just after the last candlestick
          const borderLineOffsetForCursor = isMobile ? 0.1 : 0.2;
          const lastDataRightEdge = lastDataCenterX + step / 2 + step * borderLineOffsetForCursor;

          if (chartX <= lastDataRightEdge) {
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
    [onChartClick, disabled, scales, stockData, svgRef, dimensions, isMobile, isDraggingRef, isInSelectableAreaRef]
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

