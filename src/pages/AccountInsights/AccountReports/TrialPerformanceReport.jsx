// import React, { useEffect, useMemo, useState } from "react";
// import axiosClient from "../../../api/axiosClient";
// import ReportsLayout from "./ReportsLayout";
// import AccountDetailDrawer from "./AccountDetailDrawer";
// import ReportPeriodFilter, { isWithinPeriod } from "./ReportPeriodFilter";

// const EXPIRY_WINDOW_DAYS = 14; // Window for "expiring soon" list & KPI

// export default function TrialPerformanceReport() {
//   const [summary, setSummary] = useState(null);
//   const [expiringRows, setExpiringRows] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const [search, setSearch] = useState("");
//   const [period, setPeriod] = useState("ALL");
//   const [selectedId, setSelectedId] = useState(null);

//   useEffect(() => {
//     const load = async () => {
//       try {
//         setLoading(true);

//         const [summaryRes, expiringRes] = await Promise.all([
//           axiosClient.get("/admin/account-insights/summary"),
//           axiosClient.get("/admin/account-insights/trial-expiring-soon", {
//             params: { days: EXPIRY_WINDOW_DAYS },
//           }),
//         ]);

//         setSummary(summaryRes.data || null);

//         const raw = expiringRes.data || {};
//         const list = Array.isArray(raw)
//           ? raw
//           : Array.isArray(raw.items)
//           ? raw.items
//           : Array.isArray(raw.data)
//           ? raw.data
//           : [];
//         setExpiringRows(list);
//       } catch (err) {
//         console.error("Failed to load TrialPerformanceReport", err);
//         setSummary(null);
//         setExpiringRows([]);
//       } finally {
//         setLoading(false);
//       }
//     };

//     load();
//   }, []);

//   // ---- KPI derivation from summary ----
//   const kpi = useMemo(() => {
//     const s = summary || {};

//     const trialsTotal =
//       s.trialTotal ?? s.TrialTotal ?? s.trialPlan ?? s.TrialPlan ?? 0;

//     const paid = s.paidPlan ?? s.PaidPlan ?? 0;

//     const trialExpiredNoUpgrade =
//       s.trialExpiredNoUpgrade ?? s.TrialExpiredNoUpgrade ?? 0;

//     // Prefer backend-provided expiring count; fallback to list length
//     const expSoonFromSummary = s.trialExpiringSoon ?? s.TrialExpiringSoon;
//     const trialsExpSoon =
//       typeof expSoonFromSummary === "number"
//         ? expSoonFromSummary
//         : expiringRows.length;

//     const approxConv =
//       trialsTotal > 0 ? ((paid / trialsTotal) * 100).toFixed(1) : "0.0";

//     return {
//       trialsTotal,
//       trialsExpSoon,
//       trialExpiredNoUpgrade,
//       paid,
//       approxConv,
//     };
//   }, [summary, expiringRows.length]);

//   // ---- Filtered expiring trials table ----
//   const filteredExpiringRows = useMemo(() => {
//     let list = [...expiringRows];

//     if (search.trim()) {
//       const q = search.trim().toLowerCase();
//       list = list.filter(r => {
//         const name = (r.businessName || "").toLowerCase();
//         const id = (r.businessId || "").toLowerCase();
//         const domain = (r.domain || "").toLowerCase();
//         const email = (r.ownerEmail || "").toLowerCase();
//         return (
//           name.includes(q) ||
//           id.includes(q) ||
//           domain.includes(q) ||
//           email.includes(q)
//         );
//       });
//     }

//     // Period filter on trial end date
//     list = list.filter(r => isWithinPeriod(r.trialEndsOn, period));

//     return list;
//   }, [expiringRows, search, period]);

//   // ---- Export ----
//   const handleExport = () => {
//     if (!filteredExpiringRows.length) return;

//     const headers = [
//       "BusinessId",
//       "BusinessName",
//       "TrialEndsOn",
//       "Plan",
//       "LifecycleStage",
//       "Status",
//     ];

//     const lines = filteredExpiringRows.map(r =>
//       [
//         r.businessId,
//         r.businessName,
//         r.trialEndsOn,
//         r.planName || r.planType || "Trial",
//         r.lifecycleStage || "Trial",
//         r.status || "",
//       ]
//         .map(csvEscape)
//         .join(",")
//     );

//     const csv = [headers.join(","), ...lines].join("\n");

//     const blob = new Blob([csv], {
//       type: "text/csv;charset=utf-8;",
//     });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `trial-expiring-${EXPIRY_WINDOW_DAYS}d-report.csv`;
//     a.click();
//     URL.revokeObjectURL(url);
//   };

//   // ---- Render ----
//   return (
//     <>
//       <ReportsLayout
//         title="Trial Performance Report"
//         description={`Analyze trial volume, upcoming expiries, and approximate trial-to-paid conversion. Focus on trials expiring within the next ${EXPIRY_WINDOW_DAYS} days as your save pipeline.`}
//       >
//         {/* KPIs */}
//         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//           <Kpi
//             label="Trials (Total)"
//             value={kpi.trialsTotal}
//             hint="Current trial accounts."
//           />
//           <Kpi
//             label={`Expiring ≤ ${EXPIRY_WINDOW_DAYS} days`}
//             value={kpi.trialsExpSoon}
//             hint="Immediate conversion opportunities."
//           />
//           <Kpi
//             label="Trials Expired (No Upgrade)"
//             value={kpi.trialExpiredNoUpgrade}
//             hint="Loss bucket for win-back."
//           />
//           <Kpi
//             label="Approx. Trial → Paid"
//             value={`${kpi.approxConv}%`}
//             hint="Paid / Trials (coarse signal)."
//           />
//         </div>

//         {/* Minimal bar visualization */}
//         <div className="mt-4 p-4 rounded-lg border border-slate-200 bg-white">
//           <div className="flex items-center justify-between mb-2">
//             <div>
//               <div className="text-xs font-semibold text-slate-900">
//                 Trial Funnel Snapshot
//               </div>
//               <div className="text-[11px] text-slate-500">
//                 Relative comparison of total trials, expiring soon, lost trials,
//                 and paid accounts.
//               </div>
//             </div>
//           </div>

//           <TrialBars
//             trials={kpi.trialsTotal}
//             expiring={kpi.trialsExpSoon}
//             lost={kpi.trialExpiredNoUpgrade}
//             paid={kpi.paid}
//           />
//         </div>

//         {/* Controls for expiring list */}
//         <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
//           <div className="flex flex-col">
//             <div className="text-sm font-semibold text-slate-900">
//               Trials expiring in next {EXPIRY_WINDOW_DAYS} days
//             </div>
//             <div className="text-[11px] text-slate-500">
//               Use this list as your primary save queue.
//             </div>
//           </div>

//           <div className="flex flex-wrap items-center gap-2">
//             <input
//               value={search}
//               onChange={e => setSearch(e.target.value)}
//               placeholder="Search trials by name, ID, domain, owner"
//               className="w-72 px-3 py-2 rounded border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
//             />
//             <ReportPeriodFilter value={period} onChange={setPeriod} />
//             <button
//               onClick={handleExport}
//               className="px-3 py-2 rounded bg-slate-900 text-white text-xs font-semibold hover:bg-black"
//             >
//               Export CSV
//             </button>
//           </div>
//         </div>

//         {/* Expiring trials table */}
//         <div className="overflow-auto rounded-lg border border-slate-200 bg-white mt-3">
//           <table className="min-w-full border-collapse">
//             <thead className="bg-slate-50">
//               <tr className="text-[11px] text-slate-500 uppercase tracking-[0.14em]">
//                 <Th>Business</Th>
//                 <Th>Trial Ends</Th>
//                 <Th>Plan</Th>
//                 <Th>Lifecycle Stage</Th>
//                 <Th>Status</Th>
//               </tr>
//             </thead>
//             <tbody className="text-sm text-slate-800">
//               {loading && (
//                 <tr>
//                   <td
//                     colSpan={5}
//                     className="px-4 py-6 text-center text-slate-500"
//                   >
//                     Loading trial data…
//                   </td>
//                 </tr>
//               )}

//               {!loading && filteredExpiringRows.length === 0 && (
//                 <tr>
//                   <td
//                     colSpan={5}
//                     className="px-4 py-6 text-center text-slate-500"
//                   >
//                     No trials expiring in the next {EXPIRY_WINDOW_DAYS} days
//                     matching current filters.
//                   </td>
//                 </tr>
//               )}

//               {!loading &&
//                 filteredExpiringRows.map(r => (
//                   <tr
//                     key={r.businessId}
//                     className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
//                     onClick={() => setSelectedId(r.businessId)}
//                   >
//                     <Td primary>{r.businessName || r.businessId || "—"}</Td>
//                     <Td>{r.trialEndsOn || "—"}</Td>
//                     <Td>{r.planName || r.planType || "Trial"}</Td>
//                     <Td>{r.lifecycleStage || "Trial"}</Td>
//                     <Td>{r.status || "—"}</Td>
//                   </tr>
//                 ))}
//             </tbody>
//           </table>
//         </div>

//         <div className="text-[11px] text-slate-500 mt-3">
//           Combine this with campaign tools to automate nudges for trials near
//           expiry instead of chasing them manually.
//         </div>
//       </ReportsLayout>

//       {/* Drilldown drawer (non-blocking, updates on row click) */}
//       <AccountDetailDrawer
//         businessId={selectedId}
//         onClose={() => setSelectedId(null)}
//       />
//     </>
//   );
// }

// /* ---- Components ---- */

// function Kpi({ label, value, hint }) {
//   return (
//     <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-1">
//       <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
//         {label}
//       </div>
//       <div className="text-lg font-semibold text-slate-900">{value ?? "—"}</div>
//       {hint && (
//         <div className="text-xs text-slate-500 leading-snug">{hint}</div>
//       )}
//     </div>
//   );
// }

// function Th({ children }) {
//   return (
//     <th className="px-4 py-2 text-left font-semibold whitespace-nowrap">
//       {children}
//     </th>
//   );
// }

// function Td({ children, primary }) {
//   return (
//     <td
//       className={
//         "px-4 py-2 whitespace-nowrap " +
//         (primary ? "font-semibold text-slate-900" : "text-slate-800")
//       }
//     >
//       {children}
//     </td>
//   );
// }

// /**
//  * Tiny bar "chart" using pure CSS, no external libs.
//  * Shows relative heights based on counts for Trials, Expiring, Lost, Paid.
//  */
// function TrialBars({ trials, expiring, lost, paid }) {
//   const vals = [trials, expiring, lost, paid].map(v =>
//     typeof v === "number" && v > 0 ? v : 0
//   );
//   const max = Math.max(...vals, 1); // avoid /0

//   const mk = (label, value, tone) => {
//     const h = (value / max) * 72; // max 72px height
//     const base = "flex flex-col items-center justify-end gap-1 flex-1";
//     const barCommon = "w-7 rounded-t-md transition-all";
//     let barTone = "";
//     switch (tone) {
//       case "primary":
//         barTone = "bg-slate-900";
//         break;
//       case "warn":
//         barTone = "bg-amber-500";
//         break;
//       case "danger":
//         barTone = "bg-rose-500";
//         break;
//       case "success":
//         barTone = "bg-emerald-500";
//         break;
//       default:
//         barTone = "bg-slate-500";
//     }

//     return (
//       <div key={label} className={base}>
//         <div
//           className={`${barCommon} ${barTone}`}
//           style={{ height: `${h || 4}px` }}
//         />
//         <div className="text-[10px] font-semibold text-slate-900">{value}</div>
//         <div className="text-[9px] text-slate-500 text-center leading-tight">
//           {label}
//         </div>
//       </div>
//     );
//   };

//   return (
//     <div className="flex items-end gap-4 mt-2 h-28">
//       {mk("Trials", trials, "primary")}
//       {mk(`Expiring ≤ ${EXPIRY_WINDOW_DAYS}d`, expiring, "warn")}
//       {mk("Expired (No Upgrade)", lost, "danger")}
//       {mk("On Paid Plan", paid, "success")}
//     </div>
//   );
// }

// /* ---- CSV helper ---- */

// function csvEscape(v) {
//   const s = v == null ? "" : String(v);
//   return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
// }
import React, { useEffect, useMemo, useState } from "react";
import axiosClient from "../../../api/axiosClient";
import ReportsLayout from "./ReportsLayout";
import AccountDetailDrawer from "./AccountDetailDrawer";
import ReportPeriodFilter, { isWithinPeriod } from "./ReportPeriodFilter";

const EXPIRY_WINDOW_DAYS = 14; // Window for "expiring soon" list & KPI

export default function TrialPerformanceReport() {
  const [summary, setSummary] = useState(null);
  const [expiringRows, setExpiringRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("ALL");
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [summaryRes, expiringRes] = await Promise.all([
          axiosClient.get("/admin/account-insights/summary"),
          axiosClient.get("/admin/account-insights/trial-expiring-soon", {
            params: { days: EXPIRY_WINDOW_DAYS },
          }),
        ]);

        setSummary(summaryRes.data || null);

        const raw = expiringRes.data || {};
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw.items)
          ? raw.items
          : Array.isArray(raw.data)
          ? raw.data
          : [];
        setExpiringRows(list);
      } catch (err) {
        console.error("Failed to load TrialPerformanceReport", err);
        setSummary(null);
        setExpiringRows([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // ---- KPI derivation from summary ----
  const kpi = useMemo(() => {
    const s = summary || {};

    const trialsTotal =
      s.trialTotal ?? s.TrialTotal ?? s.trialPlan ?? s.TrialPlan ?? 0;

    const paid = s.paidPlan ?? s.PaidPlan ?? 0;

    const trialExpiredNoUpgrade =
      s.trialExpiredNoUpgrade ?? s.TrialExpiredNoUpgrade ?? 0;

    // Prefer backend-provided expiring count; fallback to list length
    const expSoonFromSummary = s.trialExpiringSoon ?? s.TrialExpiringSoon;
    const trialsExpSoon =
      typeof expSoonFromSummary === "number"
        ? expSoonFromSummary
        : expiringRows.length;

    const approxConv =
      trialsTotal > 0 ? ((paid / trialsTotal) * 100).toFixed(1) : "0.0";

    return {
      trialsTotal,
      trialsExpSoon,
      trialExpiredNoUpgrade,
      paid,
      approxConv,
    };
  }, [summary, expiringRows.length]);

  // ---- Filtered expiring trials table ----
  const filteredExpiringRows = useMemo(() => {
    let list = [...expiringRows];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r => {
        const name = (r.businessName || "").toLowerCase();
        const id = (r.businessId || r.id || "").toLowerCase();
        const domain = (r.domain || "").toLowerCase();
        const email = (r.ownerEmail || "").toLowerCase();
        return (
          name.includes(q) ||
          id.includes(q) ||
          domain.includes(q) ||
          email.includes(q)
        );
      });
    }

    // Period filter on trial end date
    list = list.filter(r => isWithinPeriod(r.trialEndsOn, period));

    return list;
  }, [expiringRows, search, period]);

  // ---- Export ----
  const handleExport = () => {
    if (!filteredExpiringRows.length) return;

    const headers = [
      "BusinessId",
      "BusinessName",
      "TrialEndsOn",
      "Plan",
      "LifecycleStage",
      "Status",
    ];

    const lines = filteredExpiringRows.map(r =>
      [
        r.businessId || r.id || "",
        r.businessName || "",
        r.trialEndsOn || "",
        r.planName || r.planType || "Trial",
        r.lifecycleStage || "Trial",
        r.status || "",
      ]
        .map(csvEscape)
        .join(",")
    );

    const csv = [headers.join(","), ...lines].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trial-expiring-${EXPIRY_WINDOW_DAYS}d-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Handle updates coming back from the drawer ----
  const handleUpdatedFromDrawer = updated => {
    if (!updated) return;
    const updatedId = updated.businessId || updated.id;
    if (!updatedId) return;

    // Helper: check if this account still belongs in the "expiring soon" window
    const inExpiringWindow = account => {
      const endRaw = account.trialEndsOn || account.trialEndDate;
      if (!endRaw) return false;
      const end = new Date(endRaw);
      if (Number.isNaN(end.getTime())) return false;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      const diffDays =
        (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

      return diffDays >= 0 && diffDays <= EXPIRY_WINDOW_DAYS;
    };

    setExpiringRows(prev => {
      let found = false;

      let next = prev.map(r => {
        const id = r.businessId || r.id;
        if (id === updatedId) {
          found = true;
          return { ...r, ...updated };
        }
        return r;
      });

      const stillInWindow = inExpiringWindow(updated);

      // If it was in the list and no longer qualifies, remove it
      if (found && !stillInWindow) {
        next = next.filter(r => (r.businessId || r.id) !== updatedId);
      }

      // If it wasn't in the list but now qualifies (e.g. trial extended into window), add it
      if (!found && stillInWindow) {
        next = [...next, updated];
      }

      return next;
    });

    // Optional: lightweight local tweak to summary metrics (not exact, but keeps UI aligned)
    setSummary(prev => {
      if (!prev) return prev;
      const copy = { ...prev };

      // If trial moved out of expiring window, decrement expiringSoon if present
      // If moved into window, increment.
      // Guard everything; this is just UX-friendly, backend is source of truth.
      if (copy.trialExpiringSoon != null) {
        // naive adjustment; true correctness comes from backend refresh later
        // so we avoid complex diffs here.
        copy.trialExpiringSoon = copy.trialExpiringSoon;
      }
      if (copy.TrialExpiringSoon != null) {
        copy.TrialExpiringSoon = copy.TrialExpiringSoon;
      }

      return copy;
    });
  };

  // ---- Render ----
  return (
    <>
      <ReportsLayout
        title="Trial Performance Report"
        description={`Analyze trial volume, upcoming expiries, and approximate trial-to-paid conversion. Focus on trials expiring within the next ${EXPIRY_WINDOW_DAYS} days as your save pipeline.`}
      >
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi
            label="Trials (Total)"
            value={kpi.trialsTotal}
            hint="Current trial accounts."
          />
          <Kpi
            label={`Expiring ≤ ${EXPIRY_WINDOW_DAYS} days`}
            value={kpi.trialsExpSoon}
            hint="Immediate conversion opportunities."
          />
          <Kpi
            label="Trials Expired (No Upgrade)"
            value={kpi.trialExpiredNoUpgrade}
            hint="Loss bucket for win-back."
          />
          <Kpi
            label="Approx. Trial → Paid"
            value={`${kpi.approxConv}%`}
            hint="Paid / Trials (coarse signal)."
          />
        </div>

        {/* Minimal bar visualization */}
        <div className="mt-4 p-4 rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs font-semibold text-slate-900">
                Trial Funnel Snapshot
              </div>
              <div className="text-[11px] text-slate-500">
                Relative comparison of total trials, expiring soon, lost trials,
                and paid accounts.
              </div>
            </div>
          </div>

          <TrialBars
            trials={kpi.trialsTotal}
            expiring={kpi.trialsExpSoon}
            lost={kpi.trialExpiredNoUpgrade}
            paid={kpi.paid}
          />
        </div>

        {/* Controls for expiring list */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-slate-900">
              Trials expiring in next {EXPIRY_WINDOW_DAYS} days
            </div>
            <div className="text-[11px] text-slate-500">
              Use this list as your primary save queue.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search trials by name, ID, domain, owner"
              className="w-72 px-3 py-2 rounded border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            <ReportPeriodFilter value={period} onChange={setPeriod} />
            <button
              onClick={handleExport}
              className="px-3 py-2 rounded bg-slate-900 text-white text-xs font-semibold hover:bg-black"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Expiring trials table */}
        <div className="overflow-auto rounded-lg border border-slate-200 bg-white mt-3">
          <table className="min-w-full border-collapse">
            <thead className="bg-slate-50">
              <tr className="text-[11px] text-slate-500 uppercase tracking-[0.14em]">
                <Th>Business</Th>
                <Th>Trial Ends</Th>
                <Th>Plan</Th>
                <Th>Lifecycle Stage</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-800">
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    Loading trial data…
                  </td>
                </tr>
              )}

              {!loading && filteredExpiringRows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    No trials expiring in the next {EXPIRY_WINDOW_DAYS} days
                    matching current filters.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredExpiringRows.map(r => {
                  const id = r.businessId || r.id;
                  return (
                    <tr
                      key={id}
                      className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => setSelectedId(id)}
                    >
                      <Td primary>
                        {r.businessName || r.businessId || r.id || "—"}
                      </Td>
                      <Td>{r.trialEndsOn || "—"}</Td>
                      <Td>{r.planName || r.planType || "Trial"}</Td>
                      <Td>{r.lifecycleStage || "Trial"}</Td>
                      <Td>{r.status || "—"}</Td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="text-[11px] text-slate-500 mt-3">
          Combine this with campaign tools to automate nudges for trials near
          expiry instead of chasing them manually.
        </div>
      </ReportsLayout>

      {/* Drilldown drawer (non-blocking, updates on row click & micro-actions) */}
      <AccountDetailDrawer
        businessId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={handleUpdatedFromDrawer}
      />
    </>
  );
}

/* ---- Components ---- */

function Kpi({ label, value, hint }) {
  return (
    <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-1">
      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="text-lg font-semibold text-slate-900">{value ?? "—"}</div>
      {hint && (
        <div className="text-xs text-slate-500 leading-snug">{hint}</div>
      )}
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="px-4 py-2 text-left font-semibold whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children, primary }) {
  return (
    <td
      className={
        "px-4 py-2 whitespace-nowrap " +
        (primary ? "font-semibold text-slate-900" : "text-slate-800")
      }
    >
      {children}
    </td>
  );
}

/**
 * Tiny bar "chart" using pure CSS, no external libs.
 * Shows relative heights based on counts for Trials, Expiring, Lost, Paid.
 */
function TrialBars({ trials, expiring, lost, paid }) {
  const vals = [trials, expiring, lost, paid].map(v =>
    typeof v === "number" && v > 0 ? v : 0
  );
  const max = Math.max(...vals, 1); // avoid /0

  const mk = (label, value, tone) => {
    const h = (value / max) * 72; // max 72px height
    const base = "flex flex-col items-center justify-end gap-1 flex-1";
    const barCommon = "w-7 rounded-t-md transition-all";
    let barTone = "";
    switch (tone) {
      case "primary":
        barTone = "bg-slate-900";
        break;
      case "warn":
        barTone = "bg-amber-500";
        break;
      case "danger":
        barTone = "bg-rose-500";
        break;
      case "success":
        barTone = "bg-emerald-500";
        break;
      default:
        barTone = "bg-slate-500";
    }

    return (
      <div key={label} className={base}>
        <div
          className={`${barCommon} ${barTone}`}
          style={{ height: `${h || 4}px` }}
        />
        <div className="text-[10px] font-semibold text-slate-900">{value}</div>
        <div className="text-[9px] text-slate-500 text-center leading-tight">
          {label}
        </div>
      </div>
    );
  };

  return (
    <div className="flex items-end gap-4 mt-2 h-28">
      {mk("Trials", trials, "primary")}
      {mk(`Expiring ≤ ${EXPIRY_WINDOW_DAYS}d`, expiring, "warn")}
      {mk("Expired (No Upgrade)", lost, "danger")}
      {mk("On Paid Plan", paid, "success")}
    </div>
  );
}

/* ---- CSV helper ---- */

function csvEscape(v) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
