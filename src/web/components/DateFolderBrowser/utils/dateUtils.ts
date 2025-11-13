const MONTH_MAP: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11
};

export const parseStockKey = (stockKey: string | null) => {
  if (!stockKey) {
    return { ticker: null, breakoutDate: null };
  }

  const parts = stockKey.toLowerCase().split("_");
  if (parts.length < 4) {
    return { ticker: null, breakoutDate: null };
  }

  const ticker = parts[0];
  const month = MONTH_MAP[parts[1]];
  const day = Number(parts[2]);
  const year = Number(parts[3]);

  if (ticker && month !== undefined && !Number.isNaN(day) && !Number.isNaN(year)) {
    return {
      ticker,
      breakoutDate: new Date(year, month, day)
    };
  }

  return { ticker: null, breakoutDate: null };
};

export const parseDirectoryDate = (directoryName: string): Date | null => {
  if (!directoryName) return null;
  const parts = directoryName.toLowerCase().split("_");
  if (parts.length < 4) return null;

  const month = MONTH_MAP[parts[1]];
  const day = Number(parts[2]);
  const year = Number(parts[3]);

  if (month === undefined || Number.isNaN(day) || Number.isNaN(year)) {
    return null;
  }

  return new Date(year, month, day);
};

export const formatRelativeDate = (previous: Date | null, current: Date | null): string => {
  if (!previous) return "";
  if (!current) {
    return formatDisplayDate(previous);
  }

  const diffInMs = current.getTime() - previous.getTime();
  const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "Same day";
  if (diffInDays > 0) {
    const years = Math.floor(diffInDays / 365);
    if (years >= 1) return years === 1 ? "1 year before" : `${years} years before`;

    const months = Math.floor(diffInDays / 30);
    if (months >= 1) return months === 1 ? "1 month before" : `${months} months before`;

    const weeks = Math.floor(diffInDays / 7);
    if (weeks >= 1) return weeks === 1 ? "1 week before" : `${weeks} weeks before`;

    return diffInDays === 1 ? "1 day before" : `${diffInDays} days before`;
  }

  const absDays = Math.abs(diffInDays);
  const years = Math.floor(absDays / 365);
  if (years >= 1) return years === 1 ? "1 year after" : `${years} years after`;

  const months = Math.floor(absDays / 30);
  if (months >= 1) return months === 1 ? "1 month after" : `${months} months after`;

  const weeks = Math.floor(absDays / 7);
  if (weeks >= 1) return weeks === 1 ? "1 week after" : `${weeks} weeks after`;

  return absDays === 1 ? "1 day after" : `${absDays} days after`;
};

export const formatDisplayDate = (date: Date | null): string => {
  if (!date) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

