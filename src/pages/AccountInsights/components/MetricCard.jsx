// import React from "react";

// export default function MetricCard({
//   label,
//   value,
//   subtitle,
//   highlight = false,
// }) {
//   return (
//     <div
//       className={`flex flex-col gap-1 p-4 rounded-2xl shadow-sm border
//       bg-white/90 backdrop-blur-sm
//       ${highlight ? "border-purple-500/70" : "border-slate-200"}`}
//     >
//       <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
//         {label}
//       </div>

//       <div className="text-2xl font-semibold text-slate-900">
//         {value ?? "--"}
//       </div>

//       {subtitle && (
//         <div className="text-xs text-slate-500 leading-snug">{subtitle}</div>
//       )}
//     </div>
//   );
// }
// 📄 src/pages/AccountInsights/components/MetricCard.jsx
import React from "react";

export default function MetricCard({
  label,
  value,
  subtitle,
  tone = "default", // "default" | "positive" | "negative" | "accent"
}) {
  const toneClasses =
    tone === "accent"
      ? "border-slate-900"
      : tone === "positive"
      ? "border-emerald-400"
      : tone === "negative"
      ? "border-red-400"
      : "border-slate-200";

  return (
    <div
      className={`
        flex flex-col gap-1.5 p-3.5 rounded-lg bg-white
        border ${toneClasses}
        shadow-[0_1px_2px_rgba(15,23,42,0.04)]
      `}
    >
      <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="text-xl font-semibold text-slate-900 leading-tight">
        {value ?? "—"}
      </div>
      {subtitle && (
        <div className="text-[10px] text-slate-500 leading-snug">
          {subtitle}
        </div>
      )}
    </div>
  );
}
