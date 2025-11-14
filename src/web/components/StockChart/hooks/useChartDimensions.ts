import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { ChartDimensions, LastDimensions, ContainerRef } from "../StockChart.types";

interface UseChartDimensionsParams {
  containerRef: RefObject<ContainerRef | null>;
  tightPadding: boolean;
}

interface UseChartDimensionsResult {
  dimensions: ChartDimensions | null;
  isMobile: boolean;
}

export const useChartDimensions = ({
  containerRef,
  tightPadding
}: UseChartDimensionsParams): UseChartDimensionsResult => {
  const [dimensions, setDimensions] = useState<ChartDimensions | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const lastDimensionsRef = useRef<LastDimensions>({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = (): void => {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.clientWidth;
      const isMobileView = window.innerWidth < 1024 || "ontouchstart" in window;

      let containerHeight = containerRef.current.clientHeight;

      if (!containerHeight || containerHeight < 400) {
        const parent = containerRef.current.parentElement;
        containerHeight = parent?.clientHeight || parent?.offsetHeight || 0;

        if ((!containerHeight || containerHeight < 400) && parent) {
          const computedStyle = window.getComputedStyle(parent);
          const parentHeight = computedStyle.height;
          if (parentHeight && parentHeight !== "auto" && parentHeight !== "none") {
            const parsed = parseFloat(parentHeight);
            if (!isNaN(parsed) && parsed > 0) {
              containerHeight = parsed;
            }
          }
        }

        if (!containerHeight || containerHeight < 400) {
          if (isMobileView) {
            containerHeight = containerWidth * 1.25;

            if (parent) {
              const computedStyle = window.getComputedStyle(parent);
              const parentMaxHeight = computedStyle.maxHeight;
              if (parentMaxHeight && parentMaxHeight !== "none" && parentMaxHeight !== "auto") {
                const parsed = parseFloat(parentMaxHeight);
                if (!isNaN(parsed)) {
                  containerHeight = Math.min(containerHeight, parsed);
                }
              }
            }
          } else {
            containerHeight = containerWidth;
          }
        }
      }

      containerHeight = Math.max(containerHeight, 500);
      setIsMobile(isMobileView);

      const margin = tightPadding
        ? { top: 0, right: 0, bottom: 0, left: 0 }
        : {
            top: 0,
            right: isMobileView ? 10 : 15,
            bottom: 0,
            left: 0  // No left margin so first candle and SMAs touch left edge
          };

      const innerWidth = Math.max(containerWidth - margin.left - margin.right, 0);
      const innerHeight = Math.max(containerHeight - margin.top - margin.bottom, 0);

      const newDims: ChartDimensions = {
        width: containerWidth,
        height: containerHeight,
        margin,
        innerWidth,
        innerHeight
      };

      const hasChanged =
        Math.abs(lastDimensionsRef.current.width - containerWidth) > 1 ||
        Math.abs(lastDimensionsRef.current.height - containerHeight) > 1;

      if (hasChanged) {
        lastDimensionsRef.current = { width: containerWidth, height: containerHeight };
        setDimensions(newDims);
      }
    };

    let timeoutId: NodeJS.Timeout;
    const debouncedResize = (): void => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateDimensions, 150);
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (
          Math.abs(lastDimensionsRef.current.width - width) > 1 ||
          Math.abs(lastDimensionsRef.current.height - height) > 1
        ) {
          debouncedResize();
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", debouncedResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", debouncedResize);
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, [containerRef, tightPadding]);

  return { dimensions, isMobile };
};

