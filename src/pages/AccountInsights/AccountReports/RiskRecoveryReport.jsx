import React, { useEffect, useMemo, useState } from "react";
import axiosClient from "../../../api/axiosClient";
import ReportsLayout from "./ReportsLayout";
import AccountDetailDrawer from "./AccountDetailDrawer";
import ReportPeriodFilter, { isWithinPeriod } from "./ReportPeriodFilter";

const RISK_TABS = [
  { key: "AtRisk", label: "At Risk" },
  { key: "NoUsagePostApproval", label: "No Usage Post-Approval" },
  { key: "Dormant", label: "Dormant" },
];

const PAGE_SIZE = 100;

export default function RiskRecoveryReport() {
  const [activeTab, setActiveTab] = useState("AtRisk");

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("ALL");
  const [selectedId, setSelectedId] = useState(null);

  // Load cohort for current tab
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const res = await axiosClient.get("/admin/account-insights/by-stage", {
          params: {
            stage: activeTab,
            page,
            pageSize: PAGE_SIZE,
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
        console.error(`Failed to load risk cohort for ${activeTab}`, err);
        setRows([]);
        setTotal(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [activeTab, page]);

  // Filtered rows for current tab
  const filteredRows = useMemo(() => {
    let list = [...rows];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r => {
        const name = (r.businessName || "").toLowerCase();
        const id = (r.businessId || "").toLowerCase();
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

    // Period filter: use lastActiveOn if present, else createdAt
    list = list.filter(r => {
      const target = r.lastActiveOn || r.createdAt;
      return isWithinPeriod(target, period);
    });

    return list;
  }, [rows, search, period]);

  const hasKnownTotal = typeof total === "number" && total >= 0;
  const from = filteredRows.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = (page - 1) * PAGE_SIZE + filteredRows.length;

  const handleExport = () => {
    if (!filteredRows.length) return;

    const headers = [
      "BusinessId",
      "BusinessName",
      "RiskType",
      "LifecycleStage",
      "Plan",
      "LastActiveOn",
      "Status",
      "NoteOrReason",
    ];

    const lines = filteredRows.map(r =>
      [
        r.businessId,
        r.businessName,
        labelForTab(activeTab),
        r.lifecycleStage || activeTab,
        r.planName || r.planType || "",
        r.lastActiveOn || "",
        r.status || "",
        r.note || r.reason || "",
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
    a.download = `risk-${activeTab.toLowerCase()}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <ReportsLayout
        title="Risk & Recovery Report"
        description="Operational view of at-risk, no-usage, and dormant accounts. Use this as a live recovery queue for Customer Success."
      >
        {/* Tabs + controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          {/* Risk tabs */}
          <div className="flex flex-wrap gap-2">
            {RISK_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => {
                  setActiveTab(t.key);
                  setPage(1);
                  setSearch("");
                }}
                className={
                  "px-3 py-1.5 rounded-full border text-xs transition-colors " +
                  (activeTab === t.key
                    ? "border-rose-600 bg-rose-600 text-white"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50")
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search + period + export */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search within ${labelForTab(activeTab)} accounts`}
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

        {/* Table */}
        <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full border-collapse">
            <thead className="bg-slate-50">
              <tr className="text-[11px] text-slate-500 uppercase tracking-[0.14em]">
                <Th>Business</Th>
                <Th>Risk Type</Th>
                <Th>Lifecycle Stage</Th>
                <Th>Plan</Th>
                <Th>Last Active</Th>
                <Th>Status</Th>
                <Th>Note / Reason</Th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-800">
              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    Loading {labelForTab(activeTab)} accounts…
                  </td>
                </tr>
              )}

              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    No accounts found in this cohort with current filters.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredRows.map(r => (
                  <tr
                    key={r.businessId}
                    className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setSelectedId(r.businessId)}
                  >
                    <Td primary>{r.businessName || r.businessId || "—"}</Td>
                    <Td>{labelForTab(activeTab)}</Td>
                    <Td>{r.lifecycleStage || activeTab}</Td>
                    <Td>{r.planName || r.planType || "—"}</Td>
                    <Td>{r.lastActiveOn || "—"}</Td>
                    <Td>{r.status || "—"}</Td>
                    <Td className="max-w-xs truncate">
                      {r.note || r.reason || "—"}
                    </Td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-xs text-slate-600 mt-3">
          <div>
            Showing {from}-{to || 0}
            {hasKnownTotal && ` of ${total}`} in {labelForTab(activeTab)}
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
                  ? page * PAGE_SIZE >= total
                  : rows.length < PAGE_SIZE
              }
              onClick={() => setPage(p => p + 1)}
              className="px-2 py-1 border border-slate-300 rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 mt-3">
          Prioritize outreach starting with At Risk, then No Usage
          Post-Approval, then long-term Dormant. Each row is a candidate for
          targeted playbooks.
        </div>
      </ReportsLayout>

      {/* Shared drawer (non-blocking, updates on row change) */}
      <AccountDetailDrawer
        businessId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}

/* Helpers */

function Th({ children }) {
  return (
    <th className="px-4 py-2 text-left font-semibold whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children, primary, className = "" }) {
  return (
    <td
      className={
        "px-4 py-2 whitespace-nowrap " +
        (primary ? "font-semibold text-slate-900" : "text-slate-800") +
        " " +
        className
      }
    >
      {children}
    </td>
  );
}

function labelForTab(key) {
  switch (key) {
    case "AtRisk":
      return "At Risk";
    case "NoUsagePostApproval":
      return "No Usage Post-Approval";
    case "Dormant":
      return "Dormant";
    default:
      return key;
  }
}

function csvEscape(v) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
