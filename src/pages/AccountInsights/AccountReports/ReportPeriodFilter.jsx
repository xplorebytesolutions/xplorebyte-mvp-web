import React from "react";

export const PERIODS = [
  { key: "ALL", label: "All time" },
  { key: "7D", label: "Last 7 days" },
  { key: "30D", label: "Last 30 days" },
  { key: "90D", label: "Last 90 days" },
];

export default function ReportPeriodFilter({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 bg-slate-50 rounded-full px-1.5 py-1">
      {PERIODS.map(p => (
        <button
          key={p.key}
          type="button"
          onClick={() => onChange(p.key)}
          className={
            "px-2.5 py-0.5 rounded-full text-xs border transition-colors " +
            (value === p.key
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100")
          }
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Given an ISO date string and a period key, returns true if the date is within range.
 * If date is invalid or missing, we treat it as within range for ALL, otherwise excluded.
 */
export function isWithinPeriod(dateStr, periodKey) {
  if (periodKey === "ALL") return true;
  if (!dateStr) return false;

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;

  const now = new Date();
  const diffDays = (now - d) / (1000 * 60 * 60 * 24);

  switch (periodKey) {
    case "7D":
      return diffDays <= 7;
    case "30D":
      return diffDays <= 30;
    case "90D":
      return diffDays <= 90;
    default:
      return true;
  }
}
