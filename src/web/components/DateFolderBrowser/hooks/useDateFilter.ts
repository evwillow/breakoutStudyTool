import { useMemo, useState } from "react";
import type { PreviousSetupFile } from "../DateFolderBrowser.types";

export type DateFilterRange = "6m" | "1y" | "3y" | "5y";

const RANGE_TO_DAYS: Record<DateFilterRange, number> = {
  "6m": 183,
  "1y": 365,
  "3y": 365 * 3,
  "5y": 365 * 5
};

interface UseDateFilterParams {
  files: PreviousSetupFile[];
  currentBreakoutDate: Date | null;
}

export const useDateFilter = ({
  files,
  currentBreakoutDate
}: UseDateFilterParams) => {
  const [range, setRange] = useState<DateFilterRange>("1y");

  const filteredFiles = useMemo(() => {
    if (!currentBreakoutDate) return files;

    const threshold = new Date(currentBreakoutDate);
    threshold.setDate(threshold.getDate() - RANGE_TO_DAYS[range]);

    return files.filter(file => file.breakoutDate >= threshold);
  }, [files, range, currentBreakoutDate]);

  return {
    range,
    setRange,
    filteredFiles
  };
};

