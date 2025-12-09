// import React from "react";

// /**
//  * FunnelChart
//  *
//  * Props:
//  * - title: string
//  * - steps: [{ label: string, value: number }]
//  */
// export default function FunnelChart({ title, steps = [] }) {
//   if (!steps.length) {
//     return (
//       <div className="w-full p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-sm">
//         <div className="text-sm font-semibold text-slate-700 mb-2">{title}</div>
//         <div className="text-xs text-slate-400">
//           No data available for this funnel.
//         </div>
//       </div>
//     );
//   }

//   const max = steps[0]?.value || 0;
//   const safeMax = max === 0 ? 1 : max;

//   return (
//     <div className="w-full p-4 rounded-2xl bg-white/95 border border-slate-200 shadow-sm flex flex-col gap-3">
//       <div className="flex items-baseline justify-between gap-2">
//         <div className="text-sm font-semibold text-slate-800">{title}</div>
//         <div className="text-[10px] text-slate-500">
//           Showing step-wise conversion &amp; drop-offs
//         </div>
//       </div>

//       {/* Horizontal funnel bar */}
//       <div className="flex items-stretch gap-1 w-full">
//         {steps.map((step, idx) => {
//           const widthPct =
//             step.value <= 0 ? 0 : Math.max(5, (step.value / safeMax) * 100);

//           const base =
//             idx === 0
//               ? "bg-purple-500"
//               : idx === 1
//               ? "bg-purple-400"
//               : idx === 2
//               ? "bg-purple-300"
//               : "bg-purple-200";

//           return (
//             <div
//               key={idx}
//               className={`relative rounded-xl flex items-center justify-center ${base}`}
//               style={{ width: `${widthPct}%` }}
//             >
//               <div className="flex flex-col items-center px-1 py-2">
//                 <div className="text-[9px] font-semibold text-white/95 truncate max-w-[90px]">
//                   {step.label}
//                 </div>
//                 <div className="text-[9px] text-white/85">
//                   {step.value ?? 0}
//                 </div>
//               </div>
//             </div>
//           );
//         })}
//       </div>

//       {/* Per-step details */}
//       <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px] text-slate-600">
//         {steps.map((step, idx) => {
//           const baseVal = steps[0]?.value || 0;
//           const prevVal = idx === 0 ? null : steps[idx - 1].value || 0;
//           const fromStartPct =
//             baseVal > 0 ? ((step.value || 0) / baseVal) * 100 : 0;
//           const fromPrevPct =
//             prevVal > 0 ? ((step.value || 0) / prevVal) * 100 : 0;

//           return (
//             <div
//               key={idx}
//               className="flex flex-col p-2 rounded-xl bg-slate-50 border border-slate-100"
//             >
//               <div className="text-[10px] font-semibold text-slate-700 mb-1">
//                 {step.label}
//               </div>
//               <div>
//                 Count: <span className="font-semibold">{step.value ?? 0}</span>
//               </div>
//               {idx > 0 && (
//                 <>
//                   <div>
//                     From previous:{" "}
//                     <span className="font-semibold">
//                       {fromPrevPct.toFixed(1)}%
//                     </span>
//                   </div>
//                   <div>
//                     From start:{" "}
//                     <span className="font-semibold">
//                       {fromStartPct.toFixed(1)}%
//                     </span>
//                   </div>
//                 </>
//               )}
//               {idx === 0 && (
//                 <div className="text-[9px] text-slate-500">
//                   Funnel entry point
//                 </div>
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }
// 📄 src/pages/AccountInsights/components/FunnelChart.jsx
import React from "react";

export default function FunnelChart({ title, steps = [] }) {
  if (!steps.length) {
    return (
      <div className="p-4 rounded-lg bg-white border border-slate-200">
        <div className="text-xs font-semibold text-slate-900 mb-1">{title}</div>
        <div className="text-[10px] text-slate-500">
          No data available for this funnel.
        </div>
      </div>
    );
  }

  const max = steps[0]?.value || 0;
  const base = max || 1;

  return (
    <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-xs font-semibold text-slate-900">{title}</div>
        <div className="text-[9px] text-slate-500">
          Left → right; width shows relative retention.
        </div>
      </div>

      <div className="flex items-stretch gap-1 w-full">
        {steps.map((step, idx) => {
          const pct = Math.max(6, (step.value || 0 / base) * 100);
          return (
            <div
              key={idx}
              className="relative rounded-md bg-slate-900/90 flex items-center justify-center"
              style={{ width: `${pct}%` }}
            >
              <div className="px-2 py-1 flex flex-col items-center">
                <div className="text-[8px] font-medium text-slate-50 truncate max-w-[120px]">
                  {step.label}
                </div>
                <div className="text-[8px] text-slate-100">
                  {step.value ?? 0}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[9px] text-slate-600">
        {steps.map((step, idx) => {
          const fromStart =
            base > 0 ? (((step.value || 0) / base) * 100).toFixed(1) : "0.0";
          const prev = steps[idx - 1]?.value || 0;
          const fromPrev =
            idx === 0 || prev === 0
              ? null
              : (((step.value || 0) / prev) * 100).toFixed(1);

          return (
            <div
              key={idx}
              className="p-2 rounded-md bg-slate-50 border border-slate-200"
            >
              <div className="text-[9px] font-semibold text-slate-800 mb-0.5">
                {step.label}
              </div>
              <div>
                Count:{" "}
                <span className="font-semibold text-slate-900">
                  {step.value ?? 0}
                </span>
              </div>
              {idx === 0 ? (
                <div className="text-[8px] text-slate-500">Entry cohort</div>
              ) : (
                <>
                  <div>
                    From previous:{" "}
                    <span className="font-semibold">{fromPrev ?? "–"}%</span>
                  </div>
                  <div>
                    From start:{" "}
                    <span className="font-semibold">{fromStart}%</span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
