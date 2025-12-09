// 📄 src/components/QuotaRibbon.jsx
import React from "react";
import { useAuth } from "../app/providers/AuthProvider";

export default function QuotaRibbon({ code, className = "" }) {
  const { getQuota } = useAuth();
  const q = getQuota(code);
  if (!q || q.limit === 0) return null;

  const pct = Math.min(100, Math.round(((q.used ?? 0) / q.limit) * 100));

  return (
    <div className={`w-full my-2 ${className}`}>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{code}</span>
        <span>
          {q.used ?? 0} / {q.limit}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-purple-600"
          style={{ width: `${pct}%` }}
          title={`${pct}%`}
        />
      </div>
    </div>
  );
}
