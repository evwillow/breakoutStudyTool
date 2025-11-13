import React from "react";
import type { ChartScales, ChartDimensions, ChartType } from "../StockChart.types";

interface ChartAxisProps {
  chartType: ChartType;
  scales: ChartScales | null;
  dimensions: ChartDimensions | null;
}

const ChartAxis: React.FC<ChartAxisProps> = () => null;

export default ChartAxis;

