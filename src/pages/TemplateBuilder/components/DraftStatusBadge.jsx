import React from "react";

export default function DraftStatusBadge({ status }) {
  if (!status?.status) {
    return (
      <span className="text-xs px-2 py-1 rounded border text-gray-600">
        Draft • Not submitted
      </span>
    );
  }

  const s = String(status.status).toUpperCase();
  const color =
    s === "APPROVED"
      ? "bg-green-100 text-green-700 border-green-200"
      : s === "REJECTED"
      ? "bg-red-100 text-red-700 border-red-200"
      : s === "PAUSED"
      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
      : "bg-blue-100 text-blue-700 border-blue-200";

  return (
    <span className={`text-xs px-2 py-1 rounded border ${color}`}>{s}</span>
  );
}
