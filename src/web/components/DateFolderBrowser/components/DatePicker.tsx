import React from "react";
import type { DateFilterRange } from "../hooks/useDateFilter";

interface DatePickerProps {
  value: DateFilterRange;
  onChange: (range: DateFilterRange) => void;
}

const OPTIONS: Array<{ label: string; value: DateFilterRange }> = [
  { label: "All time", value: "all" },
  { label: "Last 6 months", value: "6m" },
  { label: "Last year", value: "1y" },
  { label: "Last 3 years", value: "3y" },
  { label: "Last 5 years", value: "5y" }
];

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange }) => (
  <div className="flex items-center gap-3 text-white/80">
    <span className="text-sm font-medium">Show:</span>
    <select
      value={value}
      onChange={event => onChange(event.target.value as DateFilterRange)}
      className="bg-black/80 border border-white/20 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
    >
      {OPTIONS.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

