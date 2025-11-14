import React from "react";
import type { MutableRefObject, RefObject } from "react";
import type { ChartType, ChartClickHandler, ChartDimensions } from "../StockChart.types";

interface ChartSvgProps {
  chartType: ChartType;
  isMobile: boolean;
  tightPadding: boolean;
  backgroundColor: string | null;
  dimensions: ChartDimensions;
  svgRef: RefObject<SVGSVGElement | null>;
  onChartClick: ChartClickHandler | null;
  disabled: boolean;
  handleChartClick: (event: React.MouseEvent<SVGSVGElement>) => void;
  handleMouseDown: (event: React.MouseEvent<SVGSVGElement>) => void;
  handleMouseMove: (event: React.MouseEvent<SVGSVGElement>) => void;
  handleMouseUp: (event: React.MouseEvent<SVGSVGElement>) => void;
  handleTouchStart: (event: React.TouchEvent<SVGSVGElement>) => void;
  handleTouchMove: (event: React.TouchEvent<SVGSVGElement>) => void;
  handleTouchEnd: (event: React.TouchEvent<SVGSVGElement>) => void;
  isDraggingRef: MutableRefObject<boolean>;
  isInSelectableAreaRef: MutableRefObject<boolean>;
  shouldShowDividerAndBackground: boolean;
  dividerLineX: number;
  darkBackgroundWidth: number;
  progressiveMaskWidth: number;
  layers: React.ReactNode;
}

const ChartSvg: React.FC<ChartSvgProps> = ({
  chartType,
  isMobile,
  tightPadding,
  backgroundColor,
  dimensions,
  svgRef,
  onChartClick,
  disabled,
  handleChartClick,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  isDraggingRef,
  isInSelectableAreaRef,
  shouldShowDividerAndBackground,
  dividerLineX,
  darkBackgroundWidth,
  progressiveMaskWidth,
  layers
}) => {
  const viewWidth =
    chartType === "previous"
      ? dimensions.margin.left +
        dimensions.innerWidth * (isMobile ? 1.1 : 1.25) +
        dimensions.margin.right
      : dimensions.width;

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={`0 0 ${viewWidth} ${dimensions.height}`}
      className={`w-full h-full transition-opacity duration-500 ease-in-out ${
        onChartClick && !disabled ? "chart-selectable" : ""
      }`}
      preserveAspectRatio={
        tightPadding
          ? "none"
          : chartType === "hourly"
          ? "xMidYMid slice"
          : chartType === "previous"
          ? "xMinYMid meet"
          : "xMidYMid meet"
      }
      onClick={handleChartClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (svgRef.current) svgRef.current.style.cursor = "default";
        isDraggingRef.current = false;
        isInSelectableAreaRef.current = false;
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        cursor: onChartClick && !disabled ? "crosshair" : "default",
        pointerEvents: "auto",
        touchAction: "pan-y pan-x"
      }}
    >
      <defs>
        <style>
          {`
            @media (max-width: 768px) {
              .stock-chart-container {
                width: 100% !important;
                min-height: 400px;
              }
              .stock-chart-container svg {
                width: 100% !important;
                height: 100% !important;
              }
            }
            
            .chart-selectable {
              cursor: not-allowed;
            }
          `}
        </style>
      </defs>

      {backgroundColor && (
        <rect x={0} y={0} width={dimensions.width} height={dimensions.height} fill={backgroundColor} />
      )}

      {shouldShowDividerAndBackground && !backgroundColor && chartType !== "previous" && (
        <>
          <line
            x1={dividerLineX}
            y1={0}
            x2={dividerLineX}
            y2={dimensions.height}
            stroke="#00FFFF"
            strokeWidth={2.5}
            opacity={1}
          />

          <rect
            x={dividerLineX}
            y={0}
            width={darkBackgroundWidth}
            height={dimensions.height}
            fill="rgba(0, 0, 0, 0.4)"
            opacity={1}
          />

          {progressiveMaskWidth > 0 && (
            <rect
              x={dividerLineX + darkBackgroundWidth - progressiveMaskWidth}
              y={0}
              width={progressiveMaskWidth}
              height={dimensions.height}
              fill={backgroundColor || "rgba(0, 0, 0, 0.5)"}
              opacity={1}
            />
          )}
        </>
      )}

      {layers}
    </svg>
  );
};

export default ChartSvg;

