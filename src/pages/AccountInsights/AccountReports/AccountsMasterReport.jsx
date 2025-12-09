// 📄 src/pages/AccountInsights/AccountReports/AccountsMasterReport.jsx

import React, { useEffect, useMemo, useState } from "react";
import axiosClient from "../../../api/axiosClient";
import ReportsLayout from "./ReportsLayout";
import AccountDetailDrawer from "./AccountDetailDrawer";
import ReportPeriodFilter, { isWithinPeriod } from "./ReportPeriodFilter";

export default function AccountsMasterReport() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(null);

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [period, setPeriod] = useState("ALL");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  const [selectedId, setSelectedId] = useState(null);

  // ---- Data load ----
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const res = await axiosClient.get("/admin/account-insights", {
          params: {
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
        console.error("Failed to load AccountsMasterReport", err);
        setRows([]);
        setTotal(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [page, pageSize]);

  // ---- Helpers ----
  const norm = v => (v == null ? "" : String(v).toLowerCase());
  const getPlan = r => r.planName || r.planType || "";
  const getStage = r => r.lifecycleStage || r.stage || "";

  // ---- Filters + sort for current page ----
  const processedRows = useMemo(() => {
    let data = [...rows];

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter(r => {
        return (
          norm(r.businessName).includes(q) ||
          norm(r.businessId).includes(q) ||
          norm(r.domain).includes(q) ||
          norm(r.ownerEmail).includes(q)
        );
      });
    }

    // Stage filter
    if (stageFilter !== "ALL") {
      data = data.filter(
        r => getStage(r).toLowerCase() === stageFilter.toLowerCase()
      );
    }

    // Plan filter
    if (planFilter !== "ALL") {
      data = data.filter(
        r => getPlan(r).toLowerCase() === planFilter.toLowerCase()
      );
    }

    // Period filter on activity (fallback: createdAt)
    data = data.filter(r => {
      const targetDate = r.lastActiveOn || r.createdAt;
      return isWithinPeriod(targetDate, period);
    });

    // Sort
    data.sort((a, b) => compareRows(a, b, sortBy, sortDir));

    return data;
  }, [rows, search, stageFilter, planFilter, period, sortBy, sortDir]);

  // ---- Filter options (from current dataset page) ----
  const stageOptions = useMemo(() => {
    const set = new Set(
      rows
        .map(getStage)
        .filter(Boolean)
        .map(s => s.trim())
    );
    return ["ALL", ...Array.from(set)];
  }, [rows]);

  const planOptions = useMemo(() => {
    const set = new Set(
      rows
        .map(getPlan)
        .filter(Boolean)
        .map(s => s.trim())
    );
    return ["ALL", ...Array.from(set)];
  }, [rows]);

  // ---- Sorting handler ----
  const handleSort = col => {
    setSortBy(prevCol => {
      if (prevCol === col) {
        setSortDir(prevDir => (prevDir === "asc" ? "desc" : "asc"));
        return prevCol;
      }
      setSortDir("asc");
      return col;
    });
  };

  // ---- CSV export (current page, filtered & sorted) ----
  const handleExport = () => {
    if (!processedRows.length) return;

    const headers = [
      "BusinessId",
      "BusinessName",
      "LifecycleStage",
      "Plan",
      "TrialEndsOn",
      "LastActiveOn",
      "Status",
      "CreatedAt",
    ];

    const lines = processedRows.map(r =>
      [
        r.businessId,
        r.businessName,
        getStage(r),
        getPlan(r),
        r.trialEndsOn,
        r.lastActiveOn,
        r.status,
        r.createdAt,
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
    a.download = "accounts-ledger.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Pagination helpers ----
  const hasKnownTotal = typeof total === "number" && total >= 0;
  const lastPage = hasKnownTotal
    ? Math.max(1, Math.ceil(total / pageSize))
    : null;

  const canGoNext = hasKnownTotal ? page < lastPage : rows.length === pageSize; // if unknown total, guess based on page fill

  const from = processedRows.length ? (page - 1) * pageSize + 1 : 0;
  const to = (page - 1) * pageSize + processedRows.length;

  // ---- Render ----
  return (
    <>
      <ReportsLayout
        title="Accounts Ledger"
        description="Comprehensive ledger of all accounts with lifecycle, plan, activity, and status. Use filters to focus on the slice that matters."
      >
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, ID, domain, or owner email"
              className="w-72 px-3 py-2 rounded border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />

            <select
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              className="px-2.5 py-2 rounded border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              {stageOptions.map(s => (
                <option key={s} value={s}>
                  {s === "ALL" ? "All stages" : s}
                </option>
              ))}
            </select>

            <select
              value={planFilter}
              onChange={e => setPlanFilter(e.target.value)}
              className="px-2.5 py-2 rounded border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              {planOptions.map(p => (
                <option key={p} value={p}>
                  {p === "ALL" ? "All plans" : p}
                  {/** else exact plan */}
                </option>
              ))}
            </select>

            <ReportPeriodFilter value={period} onChange={setPeriod} />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              Page {page}
              {" • "}
              Showing {processedRows.length} row
              {processedRows.length === 1 ? "" : "s"}
              {hasKnownTotal && ` • Total ${total}`}
            </span>
            <button
              onClick={handleExport}
              className="px-3 py-2 rounded bg-slate-900 text-white text-xs font-semibold hover:bg-black"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto rounded-lg border border-slate-200 bg-white mt-4">
          <table className="min-w-full border-collapse">
            <thead className="bg-slate-50">
              <tr className="text-[11px] text-slate-500 uppercase tracking-[0.12em]">
                <SortableTh
                  label="Business"
                  col="businessName"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <SortableTh
                  label="Lifecycle Stage"
                  col="lifecycleStage"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <SortableTh
                  label="Plan"
                  col="plan"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <SortableTh
                  label="Trial Ends"
                  col="trialEndsOn"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <SortableTh
                  label="Last Active"
                  col="lastActiveOn"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <SortableTh
                  label="Status"
                  col="status"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              </tr>
            </thead>
            <tbody className="text-sm text-slate-800">
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    Loading accounts…
                  </td>
                </tr>
              )}

              {!loading && processedRows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    No accounts found for current filters.
                  </td>
                </tr>
              )}

              {!loading &&
                processedRows.map(r => (
                  <tr
                    key={r.businessId}
                    className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setSelectedId(r.businessId)}
                  >
                    <Td primary>{r.businessName || r.businessId || "—"}</Td>
                    <Td>{getStage(r) || "—"}</Td>
                    <Td>{getPlan(r) || "—"}</Td>
                    <Td>{r.trialEndsOn || "—"}</Td>
                    <Td>{r.lastActiveOn || "—"}</Td>
                    <Td>{r.status || "—"}</Td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-xs text-slate-600 mt-3">
          <div>
            Showing {from}-{to || 0}
            {hasKnownTotal && ` of ${total}`}
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
              disabled={!canGoNext}
              onClick={() => {
                if (canGoNext) setPage(p => p + 1);
              }}
              className="px-2 py-1 border border-slate-300 rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </ReportsLayout>

      {/* Drilldown */}
      <AccountDetailDrawer
        businessId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}

/* ---- Table helpers ---- */

function SortableTh({ label, col, sortBy, sortDir, onSort }) {
  const active = sortBy === col;
  return (
    <th
      className={
        "px-4 py-2 text-left font-semibold whitespace-nowrap select-none " +
        (active ? "text-slate-900" : "text-slate-600")
      }
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className="inline-flex items-center gap-1"
      >
        <span>{label}</span>
        {active && (
          <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>
        )}
      </button>
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

function compareRows(a, b, sortBy, sortDir) {
  const dir = sortDir === "asc" ? 1 : -1;

  const pick = () => {
    switch (sortBy) {
      case "businessName":
        return [a.businessName || "", b.businessName || ""];
      case "lifecycleStage":
        return [
          a.lifecycleStage || a.stage || "",
          b.lifecycleStage || b.stage || "",
        ];
      case "plan":
        return [a.planName || a.planType || "", b.planName || b.planType || ""];
      case "trialEndsOn":
        return [a.trialEndsOn || "", b.trialEndsOn || ""];
      case "lastActiveOn":
        return [a.lastActiveOn || "", b.lastActiveOn || ""];
      case "status":
        return [a.status || "", b.status || ""];
      case "createdAt":
      default:
        return [a.createdAt || "", b.createdAt || ""];
    }
  };

  const [va, vb] = pick();
  if (va < vb) return -1 * dir;
  if (va > vb) return 1 * dir;
  return 0;
}
