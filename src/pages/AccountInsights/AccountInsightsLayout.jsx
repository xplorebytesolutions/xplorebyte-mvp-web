// 📄 src/pages/AccountInsights/AccountInsightsLayout.jsx
import React from "react";
import InsightsTabs from "./components/InsightsTabs";

export default function AccountInsightsLayout({
  title,
  description,
  meta,
  children,
}) {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-xs text-slate-600 max-w-2xl">{description}</p>
            )}
          </div>
          {meta && (
            <div className="flex flex-col items-end gap-1 text-[9px] text-slate-500">
              {meta}
            </div>
          )}
        </div>

        <InsightsTabs />

        {/* Page content */}
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}
