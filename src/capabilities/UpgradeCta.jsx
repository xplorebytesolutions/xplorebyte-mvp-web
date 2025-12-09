// 📄 src/capabilities/UpgradeCta.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function UpgradeCta({
  message = "This feature is not available on your current plan.",
}) {
  const nav = useNavigate();
  return (
    <div className="rounded-xl border p-4 flex items-center justify-between gap-4">
      <div className="text-sm">
        <div className="font-semibold mb-1">Upgrade required</div>
        <div className="opacity-80">{message}</div>
      </div>
      <button
        onClick={() => nav("/billing")}
        className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:opacity-90"
      >
        View plans
      </button>
    </div>
  );
}
