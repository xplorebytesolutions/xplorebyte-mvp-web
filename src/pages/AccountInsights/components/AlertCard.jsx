// import React from "react";
// import { useNavigate } from "react-router-dom";

// function getSeverityStyles(severity) {
//   switch (severity) {
//     case "critical":
//       return {
//         pill: "bg-red-50 text-red-700 border-red-200",
//         dot: "bg-red-500",
//       };
//     case "warning":
//       return {
//         pill: "bg-amber-50 text-amber-700 border-amber-200",
//         dot: "bg-amber-500",
//       };
//     case "success":
//       return {
//         pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
//         dot: "bg-emerald-500",
//       };
//     default:
//       return {
//         pill: "bg-slate-50 text-slate-700 border-slate-200",
//         dot: "bg-slate-400",
//       };
//   }
// }

// export default function AlertCard({
//   id,
//   title,
//   message,
//   severity = "info",
//   businessName,
//   businessId,
//   daysToEvent,
//   createdAtUtc,
// }) {
//   const navigate = useNavigate();
//   const styles = getSeverityStyles(severity);

//   const handleViewAccount = () => {
//     if (!businessId) return;
//     // Adjust to your actual admin business detail route if needed
//     navigate(
//       `/app/admin/approvals?businessId=${encodeURIComponent(businessId)}`
//     );
//   };

//   const handleNudge = () => {
//     if (!businessId) return;
//     navigate(
//       `/app/campaigns/CampaignWizard?targetBusinessId=${encodeURIComponent(
//         businessId
//       )}`
//     );
//   };

//   return (
//     <div className="w-full p-4 rounded-2xl bg-white/95 border border-slate-200 shadow-sm flex flex-col gap-2">
//       {/* Top row */}
//       <div className="flex items-center justify-between gap-2">
//         <div
//           className={`inline-flex items-center gap-2 px-2 py-1 rounded-full border text-[10px] font-semibold ${styles.pill}`}
//         >
//           <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
//           {severity === "critical"
//             ? "Critical"
//             : severity === "warning"
//             ? "Warning"
//             : severity === "success"
//             ? "Positive"
//             : "Info"}
//         </div>
//         {createdAtUtc && (
//           <div className="text-[9px] text-slate-400">
//             Created: {new Date(createdAtUtc).toLocaleString()}
//           </div>
//         )}
//       </div>

//       {/* Title */}
//       <div className="text-sm font-semibold text-slate-900">
//         {title || "Account Alert"}
//       </div>

//       {/* Message */}
//       {message && (
//         <div className="text-xs text-slate-600 leading-snug">{message}</div>
//       )}

//       {/* Meta */}
//       <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 mt-1">
//         {businessName && (
//           <div>
//             Account:{" "}
//             <span className="font-semibold text-slate-800">{businessName}</span>
//           </div>
//         )}
//         {typeof daysToEvent === "number" && (
//           <div>
//             {daysToEvent === 0
//               ? "Event is today"
//               : daysToEvent > 0
//               ? `In ${daysToEvent} day${daysToEvent !== 1 ? "s" : ""}`
//               : `${Math.abs(daysToEvent)} day${
//                   Math.abs(daysToEvent) !== 1 ? "s" : ""
//                 } ago`}
//           </div>
//         )}
//       </div>

//       {/* CTAs */}
//       {businessId && (
//         <div className="flex items-center justify-end mt-2 gap-2">
//           <button
//             onClick={handleViewAccount}
//             className="px-2 py-1 rounded-xl text-[10px] font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors"
//           >
//             View Account
//           </button>
//           <button
//             onClick={handleNudge}
//             className="px-2 py-1 rounded-xl text-[10px] font-semibold bg-white text-purple-700 border border-purple-200 hover:bg-purple-50 transition-colors"
//           >
//             Nudge via Campaign
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }
// 📄 src/pages/AccountInsights/components/AlertCard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const SEVERITY = {
  critical: {
    label: "Critical",
    bar: "bg-red-500",
    pill: "bg-red-50 text-red-700 border-red-200",
  },
  warning: {
    label: "Warning",
    bar: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
  },
  info: {
    label: "Info",
    bar: "bg-slate-500",
    pill: "bg-slate-50 text-slate-700 border-slate-200",
  },
};

export default function AlertCard({
  id,
  title,
  message,
  severity = "info",
  businessName,
  businessId,
  daysToEvent,
  createdAtUtc,
}) {
  const navigate = useNavigate();
  const s = SEVERITY[severity] || SEVERITY.info;

  const goAccount = () => {
    if (!businessId) return;
    navigate(
      `/app/admin/approvals?businessId=${encodeURIComponent(businessId)}`
    );
  };

  const goCampaign = () => {
    if (!businessId) return;
    navigate(
      `/app/campaigns/CampaignWizard?targetBusinessId=${encodeURIComponent(
        businessId
      )}`
    );
  };

  let timing = null;
  if (typeof daysToEvent === "number") {
    if (daysToEvent === 0) timing = "Event is today.";
    else if (daysToEvent > 0)
      timing = `Event in ${daysToEvent} day${daysToEvent === 1 ? "" : "s"}.`;
    else
      timing = `Event was ${Math.abs(daysToEvent)} day${
        Math.abs(daysToEvent) === 1 ? "" : "s"
      } ago.`;
  }

  return (
    <div className="flex gap-3 p-3.5 rounded-lg bg-white border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className={`w-1 rounded-md ${s.bar}`} />

      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full text-[8px] font-semibold border ${s.pill}`}
            >
              {s.label}
            </span>
            {businessName && (
              <span className="text-[9px] text-slate-600">{businessName}</span>
            )}
          </div>
          {createdAtUtc && (
            <span className="text-[8px] text-slate-400">
              {new Date(createdAtUtc).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="text-[11px] font-semibold text-slate-900 leading-snug">
          {title || "Account Alert"}
        </div>

        {message && (
          <div className="text-[10px] text-slate-600 leading-snug">
            {message}
          </div>
        )}

        {timing && <div className="text-[8px] text-slate-500">{timing}</div>}

        {businessId && (
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={goAccount}
              className="px-2.5 py-1 text-[9px] font-semibold rounded border border-slate-300 text-slate-800 hover:bg-slate-50"
            >
              View account
            </button>
            <button
              onClick={goCampaign}
              className="px-2.5 py-1 text-[9px] font-semibold rounded bg-slate-900 text-white hover:bg-black"
            >
              Open in Campaigns
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
