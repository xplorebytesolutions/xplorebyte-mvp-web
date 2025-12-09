// import React, { useEffect, useMemo, useState } from "react";
// import axiosClient from "../../../api/axiosClient";
// import ReportsLayout from "./ReportsLayout";
// import AccountDetailDrawer from "./AccountDetailDrawer";
// import ReportPeriodFilter, { isWithinPeriod } from "./ReportPeriodFilter";

// const STAGES = [
//   { key: "Active", label: "Active" },
//   { key: "AtRisk", label: "At Risk" },
//   { key: "Dormant", label: "Dormant" },
//   { key: "NoUsagePostApproval", label: "No Usage Post-Approval" },
// ];

// export default function LifecycleStageReport() {
//   const [summary, setSummary] = useState(null);

//   const [activeStage, setActiveStage] = useState("Active");
//   const [rows, setRows] = useState([]);
//   const [page, setPage] = useState(1);
//   const [pageSize] = useState(100);
//   const [total, setTotal] = useState(null);
//   const [loading, setLoading] = useState(true);

//   const [search, setSearch] = useState("");
//   const [period, setPeriod] = useState("ALL");
//   const [selectedId, setSelectedId] = useState(null);

//   // Load lifecycle summary once for counts
//   useEffect(() => {
//     const loadSummary = async () => {
//       try {
//         const res = await axiosClient.get("/admin/account-insights/summary");
//         setSummary(res.data || null);
//       } catch (err) {
//         console.error("Failed to load lifecycle summary", err);
//       }
//     };
//     loadSummary();
//   }, []);

//   // Load accounts for current stage / page
//   useEffect(() => {
//     const loadStage = async () => {
//       if (!activeStage) return;
//       try {
//         setLoading(true);

//         const res = await axiosClient.get("/admin/account-insights/by-stage", {
//           params: {
//             stage: activeStage,
//             page,
//             pageSize,
//           },
//         });

//         const data = res.data || {};
//         const items = Array.isArray(data.items)
//           ? data.items
//           : Array.isArray(data.data)
//           ? data.data
//           : Array.isArray(data)
//           ? data
//           : [];

//         setRows(items);

//         const inferredTotal =
//           typeof data.total === "number"
//             ? data.total
//             : typeof data.totalCount === "number"
//             ? data.totalCount
//             : null;

//         setTotal(inferredTotal);
//       } catch (err) {
//         console.error(`Failed to load accounts for stage ${activeStage}`, err);
//         setRows([]);
//         setTotal(null);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadStage();
//   }, [activeStage, page, pageSize]);

//   // Stage counts from summary (defensive)
//   const stageCounts = useMemo(() => {
//     const src = summary?.byLifecycleStage || summary?.ByLifecycleStage || {};
//     const get = k => src[k] ?? src[k.toLowerCase?.()] ?? 0;

//     return {
//       Active: get("Active"),
//       AtRisk: get("AtRisk"),
//       Dormant: get("Dormant"),
//       NoUsagePostApproval: get("NoUsagePostApproval"),
//     };
//   }, [summary]);

//   // Filtered view for current page data
//   const filteredRows = useMemo(() => {
//     let list = [...rows];

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

//     // Filter by recent activity (or createdAt as fallback)
//     list = list.filter(r => {
//       const target = r.lastActiveOn || r.createdAt;
//       return isWithinPeriod(target, period);
//     });

//     return list;
//   }, [rows, search, period]);

//   const hasKnownTotal = typeof total === "number" && total >= 0;
//   const from = filteredRows.length ? (page - 1) * pageSize + 1 : 0;
//   const to = (page - 1) * pageSize + filteredRows.length;

//   const handleExport = () => {
//     if (!filteredRows.length) return;

//     const headers = [
//       "BusinessId",
//       "BusinessName",
//       "LifecycleStage",
//       "Plan",
//       "TrialEndsOn",
//       "LastActiveOn",
//       "Status",
//     ];

//     const lines = filteredRows.map(r =>
//       [
//         r.businessId,
//         r.businessName,
//         r.lifecycleStage || activeStage,
//         r.planName || r.planType || "",
//         r.trialEndsOn || "",
//         r.lastActiveOn || "",
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
//     a.download = `lifecycle-${activeStage.toLowerCase()}-report.csv`;
//     a.click();
//     URL.revokeObjectURL(url);
//   };

//   return (
//     <>
//       <ReportsLayout
//         title="Lifecycle Stage Report"
//         description="Analyze accounts by lifecycle stage and recent activity to understand health, activation quality, and emerging risk."
//       >
//         {/* Stage selector + filters */}
//         <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
//           {/* Stage pills */}
//           <div className="flex flex-wrap gap-2">
//             {STAGES.map(s => (
//               <button
//                 key={s.key}
//                 onClick={() => {
//                   setActiveStage(s.key);
//                   setPage(1);
//                   setSearch("");
//                 }}
//                 className={
//                   "px-3 py-1.5 rounded-full border text-xs transition-colors " +
//                   (activeStage === s.key
//                     ? "border-slate-900 bg-slate-900 text-white"
//                     : "border-slate-300 text-slate-700 hover:bg-slate-50")
//                 }
//               >
//                 {s.label}
//                 <span className="ml-1 text-[10px] text-slate-400">
//                   {stageCounts[s.key] ?? 0}
//                 </span>
//               </button>
//             ))}
//           </div>

//           {/* Search + period + export */}
//           <div className="flex flex-wrap items-center gap-2">
//             <input
//               value={search}
//               onChange={e => setSearch(e.target.value)}
//               placeholder={`Search within ${activeStage} accounts`}
//               className="w-64 px-3 py-2 rounded border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
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

//         {/* Table */}
//         <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
//           <table className="min-w-full border-collapse">
//             <thead className="bg-slate-50">
//               <tr className="text-[11px] text-slate-500 uppercase tracking-[0.14em]">
//                 <Th>Business</Th>
//                 <Th>Lifecycle Stage</Th>
//                 <Th>Plan</Th>
//                 <Th>Trial Ends</Th>
//                 <Th>Last Active</Th>
//                 <Th>Status</Th>
//               </tr>
//             </thead>
//             <tbody className="text-sm text-slate-800">
//               {loading && (
//                 <tr>
//                   <td
//                     colSpan={6}
//                     className="px-4 py-6 text-center text-slate-500"
//                   >
//                     Loading {activeStage} accounts…
//                   </td>
//                 </tr>
//               )}

//               {!loading && filteredRows.length === 0 && (
//                 <tr>
//                   <td
//                     colSpan={6}
//                     className="px-4 py-6 text-center text-slate-500"
//                   >
//                     No accounts found in this stage with current filters.
//                   </td>
//                 </tr>
//               )}

//               {!loading &&
//                 filteredRows.map(r => (
//                   <tr
//                     key={r.businessId}
//                     className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
//                     onClick={() => setSelectedId(r.businessId)}
//                   >
//                     <Td primary>{r.businessName || r.businessId || "—"}</Td>
//                     <Td>{r.lifecycleStage || activeStage}</Td>
//                     <Td>{r.planName || r.planType || "—"}</Td>
//                     <Td>{r.trialEndsOn || "—"}</Td>
//                     <Td>{r.lastActiveOn || "—"}</Td>
//                     <Td>{r.status || "—"}</Td>
//                   </tr>
//                 ))}
//             </tbody>
//           </table>
//         </div>

//         {/* Pagination */}
//         <div className="flex items-center justify-between text-xs text-slate-600 mt-3">
//           <div>
//             Showing {from}-{to || 0}
//             {hasKnownTotal && ` of ${total} in ${activeStage}`}
//           </div>
//           <div className="flex gap-2">
//             <button
//               disabled={page === 1}
//               onClick={() => setPage(p => Math.max(1, p - 1))}
//               className="px-2 py-1 border border-slate-300 rounded disabled:opacity-40"
//             >
//               Prev
//             </button>
//             <button
//               disabled={
//                 hasKnownTotal
//                   ? page * pageSize >= total
//                   : rows.length < pageSize
//               }
//               onClick={() => setPage(p => p + 1)}
//               className="px-2 py-1 border border-slate-300 rounded disabled:opacity-40"
//             >
//               Next
//             </button>
//           </div>
//         </div>
//       </ReportsLayout>

//       {/* Shared drilldown */}
//       <AccountDetailDrawer
//         businessId={selectedId}
//         onClose={() => setSelectedId(null)}
//       />
//     </>
//   );
// }

// /* Table cell helpers */

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

// function csvEscape(v) {
//   const s = v == null ? "" : String(v);
//   return /[\",\\n]/.test(s) ? `"${s.replace(/\"/g, '""')}"` : s;
// }
import React, { useEffect, useMemo, useState } from "react";
import axiosClient from "../../../api/axiosClient";
import ReportsLayout from "./ReportsLayout";
import AccountDetailDrawer from "./AccountDetailDrawer";
import ReportPeriodFilter, { isWithinPeriod } from "./ReportPeriodFilter";

const STAGES = [
  { key: "Active", label: "Active" },
  { key: "AtRisk", label: "At Risk" },
  { key: "Dormant", label: "Dormant" },
  { key: "NoUsagePostApproval", label: "No Usage Post-Approval" },
];

export default function LifecycleStageReport() {
  const [summary, setSummary] = useState(null);

  const [activeStage, setActiveStage] = useState("Active");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(100);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("ALL");
  const [selectedId, setSelectedId] = useState(null);

  // Load lifecycle summary once
  useEffect(() => {
    const loadSummary = async () => {
      try {
        const res = await axiosClient.get("/admin/account-insights/summary");
        setSummary(res.data || null);
      } catch (err) {
        console.error("Failed to load lifecycle summary", err);
      }
    };
    loadSummary();
  }, []);

  // Load accounts for current stage / page
  useEffect(() => {
    const loadStage = async () => {
      if (!activeStage) return;
      try {
        setLoading(true);

        const res = await axiosClient.get("/admin/account-insights/by-stage", {
          params: {
            stage: activeStage,
            page,
            pageSize,
          },
        });

        const data = res.data || {};
        const items = Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];

        setRows(items);

        const inferredTotal =
          typeof data.total === "number"
            ? data.total
            : typeof data.totalCount === "number"
            ? data.totalCount
            : null;

        setTotal(inferredTotal);
      } catch (err) {
        console.error(`Failed to load accounts for stage ${activeStage}`, err);
        setRows([]);
        setTotal(null);
      } finally {
        setLoading(false);
      }
    };

    // whenever we change stage or page, drawer should not stay stuck on old id
    setSelectedId(null);
    loadStage();
  }, [activeStage, page, pageSize]);

  // Stage counts from summary (defensive)
  const stageCounts = useMemo(() => {
    const src = summary?.byLifecycleStage || summary?.ByLifecycleStage || {};
    const get = k => src[k] ?? src[k?.toLowerCase?.()] ?? 0;

    return {
      Active: get("Active"),
      AtRisk: get("AtRisk"),
      Dormant: get("Dormant"),
      NoUsagePostApproval: get("NoUsagePostApproval"),
    };
  }, [summary]);

  // Filtered view for current page data
  const filteredRows = useMemo(() => {
    let list = [...rows];

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

    // Filter by recent activity (or createdAt as fallback)
    list = list.filter(r => {
      const target = r.lastActiveOn || r.createdAt;
      return isWithinPeriod(target, period);
    });

    return list;
  }, [rows, search, period]);

  const hasKnownTotal = typeof total === "number" && total >= 0;
  const from = filteredRows.length ? (page - 1) * pageSize + 1 : 0;
  const to = (page - 1) * pageSize + filteredRows.length;

  const handleExport = () => {
    if (!filteredRows.length) return;

    const headers = [
      "BusinessId",
      "BusinessName",
      "LifecycleStage",
      "Plan",
      "TrialEndsOn",
      "LastActiveOn",
      "Status",
    ];

    const lines = filteredRows.map(r =>
      [
        r.businessId || r.id || "",
        r.businessName || "",
        r.lifecycleStage || activeStage,
        r.planName || r.planType || "",
        r.trialEndsOn || "",
        r.lastActiveOn || "",
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
    a.download = `lifecycle-${activeStage.toLowerCase()}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sync updated data coming from the drawer (e.g., contacted, trial extended)
  const handleUpdatedFromDrawer = updated => {
    if (!updated) return;
    const updatedId = updated.businessId || updated.id;
    if (!updatedId) return;

    setRows(prev =>
      prev.map(x =>
        (x.businessId || x.id) === updatedId ? { ...x, ...updated } : x
      )
    );
  };

  return (
    <>
      <ReportsLayout
        title="Lifecycle Stage Report"
        description="Analyze accounts by lifecycle stage and recent activity to understand health, activation quality, and emerging risk."
      >
        {/* Stage selector + filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          {/* Stage pills */}
          <div className="flex flex-wrap gap-2">
            {STAGES.map(s => (
              <button
                key={s.key}
                onClick={() => {
                  setActiveStage(s.key);
                  setPage(1);
                  setSearch("");
                  setPeriod("ALL");
                  setSelectedId(null);
                }}
                className={
                  "px-3 py-1.5 rounded-full border text-xs transition-colors " +
                  (activeStage === s.key
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50")
                }
              >
                {s.label}
                <span className="ml-1 text-[10px] text-slate-400">
                  {stageCounts[s.key] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Search + period + export */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search within ${activeStage} accounts`}
              className="w-64 px-3 py-2 rounded border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
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

        {/* Table */}
        <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full border-collapse">
            <thead className="bg-slate-50">
              <tr className="text-[11px] text-slate-500 uppercase tracking-[0.14em]">
                <Th>Business</Th>
                <Th>Lifecycle Stage</Th>
                <Th>Plan</Th>
                <Th>Trial Ends</Th>
                <Th>Last Active</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-800">
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    Loading {activeStage} accounts…
                  </td>
                </tr>
              )}

              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    No accounts found in this stage with current filters.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredRows.map(r => {
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
                      <Td>{r.lifecycleStage || activeStage}</Td>
                      <Td>{r.planName || r.planType || "—"}</Td>
                      <Td>{r.trialEndsOn || "—"}</Td>
                      <Td>{r.lastActiveOn || "—"}</Td>
                      <Td>{r.status || "—"}</Td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-xs text-slate-600 mt-3">
          <div>
            Showing {from}-{to || 0}
            {hasKnownTotal && ` of ${total} in ${activeStage}`}
          </div>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-2 py-1 border border-slate-300 rounded disabled:opacity-40"
            >
              Prev
            </button>
            <button
              disabled={
                hasKnownTotal
                  ? page * pageSize >= total
                  : rows.length < pageSize
              }
              onClick={() => setPage(p => p + 1)}
              className="px-2 py-1 border border-slate-300 rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </ReportsLayout>

      {/* Shared drilldown */}
      <AccountDetailDrawer
        businessId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={handleUpdatedFromDrawer}
      />
    </>
  );
}

/* Table cell helpers */

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

function csvEscape(v) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
