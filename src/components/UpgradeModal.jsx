// 📄 src/components/UpgradeModal.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, X, Gauge } from "lucide-react";
import { subscribeUpgrade } from "../utils/upgradeBus";

export default function UpgradeModal() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    // Listen to upgrade requests from upgradeBus
    return subscribeUpgrade(payload => {
      setDetail(payload);
      setOpen(true);
    });
  }, []);

  if (!open) return null;

  const isQuota = detail?.reason === "quota";
  const title = isQuota ? "Quota limit reached" : "Upgrade required";
  const subtitle = isQuota
    ? "You’ve reached the usage limit for this feature on your current plan."
    : "This feature isn’t available on your current plan yet.";

  const badgeText = isQuota ? "Plan limit" : "Locked feature";

  // 👇 NEW: prefer friendly feature title, then featureName, then code
  const displayFeature =
    detail?.title || detail?.featureName || detail?.code || null;

  const handleClose = () => {
    setOpen(false);
    setDetail(null);
  };

  const handleViewPlans = () => {
    setOpen(false);
    nav("/app/settings/billing");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-6">
      {/* Dimmed, blurred backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal card */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-emerald-100 p-6 md:p-8 overflow-hidden">
        {/* soft background glows */}
        <div className="pointer-events-none absolute -top-20 -right-10 h-40 w-40 rounded-full bg-emerald-100 opacity-40" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-44 w-44 rounded-full bg-cyan-100 opacity-40" />

        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/80 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-sm"
          aria-label="Close upgrade dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative flex items-start gap-4">
          {/* Icon */}
          <div className="shrink-0 rounded-xl bg-emerald-50 p-3">
            {isQuota ? (
              <Gauge className="h-7 w-7 text-emerald-700" />
            ) : (
              <Sparkles className="h-7 w-7 text-emerald-700" />
            )}
          </div>

          <div className="flex-1">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 mb-3 border border-amber-200">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                {badgeText}
              </span>
            </div>

            {/* Title & copy */}
            <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-1">
              {title}
            </h2>
            <p className="text-sm text-slate-600 mb-2">{subtitle}</p>

            {displayFeature && (
              <p className="text-xs font-mono text-slate-500 mb-4">
                {isQuota ? "Feature / Quota:" : "Feature:"}{" "}
                <span className="font-semibold text-emerald-700">
                  {displayFeature}
                </span>
              </p>
            )}

            <p className="text-xs text-slate-500 mb-6">
              Upgrading your plan will unlock this feature immediately for your
              workspace, along with higher limits and additional tools designed
              for growing teams.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={handleViewPlans}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                View plans
                <ArrowRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// // 📄 src/components/UpgradeModal.jsx
// import React, { useEffect, useState } from "react";
// import { subscribeUpgrade } from "../utils/upgradeBus";
// import { useNavigate } from "react-router-dom";

// export default function UpgradeModal() {
//   const [open, setOpen] = useState(false);
//   const [detail, setDetail] = useState(null);
//   const nav = useNavigate();

//   useEffect(() => {
//     return subscribeUpgrade(d => {
//       setDetail(d);
//       setOpen(true);
//     });
//   }, []);

//   if (!open) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center">
//       <div
//         className="absolute inset-0 bg-black/30"
//         onClick={() => setOpen(false)}
//       />
//       <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
//         <h3 className="text-lg font-semibold">Upgrade required</h3>
//         <p className="mt-2 text-sm text-gray-600">
//           {detail?.reason === "quota"
//             ? "You’ve reached your quota for this feature."
//             : "This feature isn’t available on your current plan."}
//         </p>
//         {detail?.code && (
//           <p className="mt-1 text-xs text-gray-500">
//             Feature/Quota: {detail.code}
//           </p>
//         )}
//         <div className="mt-4 flex gap-2 justify-end">
//           <button
//             className="px-3 py-2 rounded-lg border"
//             onClick={() => setOpen(false)}
//           >
//             Not now
//           </button>
//           <button
//             className="px-3 py-2 rounded-lg bg-purple-600 text-white"
//             onClick={() => {
//               setOpen(false);
//               nav("/app/settings/billing");
//             }}
//           >
//             View plans
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
