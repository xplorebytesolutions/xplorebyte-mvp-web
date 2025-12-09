// 📄 src/pages/FlowExecutionsExplorer.jsx

import React, { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";

const ORIGIN_OPTIONS = [
  { label: "Any origin", value: "" },
  { label: "AutoReply", value: "AutoReply" },
  { label: "Campaign", value: "Campaign" },
  // Add more if FlowExecutionOrigin gets new values
];

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function formatOrigin(origin) {
  if (origin === null || origin === undefined) return "-";

  // If backend ever returns string, just show it
  if (typeof origin === "string") return origin;

  // Numeric enum (default in your DTO)
  switch (origin) {
    case 1:
      return "AutoReply";
    case 2:
      return "Campaign";
    default:
      return String(origin);
  }
}

function Pill({ ok }) {
  const base =
    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold";
  if (ok) {
    return (
      <span
        className={`${base} bg-emerald-50 text-emerald-700 border border-emerald-200`}
      >
        ✓ Success
      </span>
    );
  }
  return (
    <span className={`${base} bg-rose-50 text-rose-700 border border-rose-200`}>
      ⚠ Failed
    </span>
  );
}

export default function FlowExecutionsExplorer() {
  const [businessId, setBusinessId] = useState(
    localStorage.getItem("businessId") || ""
  );
  const [businessOptions, setBusinessOptions] = useState([]);
  const [businessLoading, setBusinessLoading] = useState(false);

  const [origin, setOrigin] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [flowId, setFlowId] = useState("");
  const [limit, setLimit] = useState(50);

  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  // Run timeline
  const [runTimeline, setRunTimeline] = useState([]);
  const [runTimelineLoading, setRunTimelineLoading] = useState(false);

  // -----------------------------
  // Load list of approved businesses (for super admin)
  // -----------------------------
  useEffect(() => {
    const loadBusinesses = async () => {
      setBusinessLoading(true);
      try {
        const resp = await axiosClient.get("/businesses/approved");
        const data = resp.data || [];

        const mapped = data.map(b => ({
          id: b.id,
          name: b.companyName || b.name || b.businessName || "Unknown",
        }));

        setBusinessOptions(mapped);

        // If no businessId yet, default to first one
        if (!businessId && mapped.length > 0) {
          setBusinessId(mapped[0].id);
        }
      } catch (err) {
        // 401/403 is expected for normal tenant admins – in that case,
        // we simply don't show the dropdown and rely on the local businessId.
        if (err?.response?.status !== 401 && err?.response?.status !== 403) {
          console.error("Failed to load businesses", err);
          toast.error("Failed to load business list.");
        }
      } finally {
        setBusinessLoading(false);
      }
    };

    loadBusinesses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  // -----------------------------
  // Load recent executions (single call, controlled)
  // -----------------------------
  const loadExecutions = async () => {
    if (!businessId) {
      toast.warn("BusinessId is required to query executions.");
      return;
    }

    setLoading(true);
    try {
      const params = {
        businessId,
        limit,
      };

      if (origin) params.origin = origin;
      if (contactPhone.trim()) params.contactPhone = contactPhone.trim();
      if (flowId.trim()) params.flowId = flowId.trim();

      const resp = await axiosClient.get("/flow-executions/recent", { params });
      const data = resp.data || [];

      setRows(data);

      // Basic selection logic, no crazy loops
      if (data.length === 0) {
        setSelected(null);
      } else if (!selected) {
        setSelected(data[0]);
      } else {
        const stillExists = data.find(r => r.id === selected.id);
        setSelected(stillExists || data[0]);
      }
    } catch (err) {
      console.error("Failed to load flow executions", err);
      toast.error("Failed to load flow executions.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-load once when businessId becomes available (e.g. from dropdown)
  useEffect(() => {
    if (businessId) {
      loadExecutions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]); // only when businessId changes

  const handleApplyFilters = e => {
    e.preventDefault();
    loadExecutions();
  };

  const handleRowClick = row => {
    setSelected(row);
  };

  // -----------------------------
  // Load full Run timeline when selected row changes
  // -----------------------------
  useEffect(() => {
    const runId = selected?.runId;
    if (!businessId || !runId) {
      setRunTimeline([]);
      return;
    }

    const fetchRunTimeline = async () => {
      setRunTimelineLoading(true);
      try {
        const resp = await axiosClient.get(`/flow-executions/run/${runId}`, {
          params: { businessId },
        });
        setRunTimeline(resp.data || []);
      } catch (err) {
        console.error("Failed to load run timeline", err);
        toast.error("Failed to load run timeline.");
        setRunTimeline([]);
      } finally {
        setRunTimelineLoading(false);
      }
    };

    fetchRunTimeline();
  }, [businessId, selected]);

  // -----------------------------
  // Render helpers
  // -----------------------------
  const renderBusinessSelector = () => {
    if (businessOptions.length > 0) {
      return (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700">
            Business (Super Admin)
          </label>
          <select
            value={businessId}
            onChange={e => setBusinessId(e.target.value)}
            disabled={businessLoading}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {businessOptions.map(b => (
              <option key={b.id} value={b.id}>
                {b.name} ({String(b.id).slice(0, 8)}…)
              </option>
            ))}
          </select>
          <p className="text-[11px] text-gray-500">
            Super Admin can switch tenant to inspect different businesses.
          </p>
        </div>
      );
    }

    // Fallback: plain textbox for normal tenant admin (own business)
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-700">Business Id</label>
        <input
          type="text"
          value={businessId}
          onChange={e => setBusinessId(e.target.value)}
          className="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="Your BusinessId"
        />
        <p className="text-[11px] text-gray-500">
          Defaults to your own tenant. Super Admins see a dropdown instead.
        </p>
      </div>
    );
  };

  const selectedId = selected?.id;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-emerald-700">
            Flow Execution Logs
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Internal explorer for AutoReply + CTA Flow + Campaign runtimes.
            Filter by business, origin, contact, or flow; then inspect each run.
          </p>
        </div>
      </div>

      {/* Filters */}
      <form
        onSubmit={handleApplyFilters}
        className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Business selector / textbox */}
          {renderBusinessSelector()}

          {/* Origin */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">Origin</label>
            <select
              value={origin}
              onChange={e => setOrigin(e.target.value)}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {ORIGIN_OPTIONS.map(o => (
                <option key={o.value || "any"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Contact phone */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">
              Contact phone
            </label>
            <input
              type="text"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
              placeholder="WhatsApp number (e.g. 91897...)"
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* FlowId */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">Flow Id</label>
            <input
              type="text"
              value={flowId}
              onChange={e => setFlowId(e.target.value)}
              placeholder="CTAFlowConfigId or AutoReplyFlowId (Guid)"
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Limit */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">Limit</label>
            <input
              type="number"
              min={1}
              max={500}
              value={limit}
              onChange={e => setLimit(Number(e.target.value) || 50)}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-gray-500">
              Max 500 rows. Default is 50.
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Loading…" : "Apply filters"}
          </button>
        </div>
      </form>

      {/* Main content: table + details */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.5fr)]">
        {/* Table */}
        <div className="rounded-xl border border-emerald-100 bg-white shadow-sm">
          <div className="border-b border-emerald-50 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-800">
              Recent executions
            </h2>
            <p className="text-xs text-gray-500">
              Click a row to see step details and full run timeline.
            </p>
          </div>

          <div className="max-h-[520px] overflow-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-emerald-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-emerald-800">
                    Time
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-emerald-800">
                    Origin
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-emerald-800">
                    Step
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-emerald-800">
                    Template
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-emerald-800">
                    Contact
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-emerald-800">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-4 text-center text-sm text-gray-500"
                    >
                      No executions found. Adjust filters and try again.
                    </td>
                  </tr>
                )}

                {rows.map(row => {
                  const isSelected = row.id === selectedId;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => handleRowClick(row)}
                      className={
                        "cursor-pointer transition-colors hover:bg-emerald-50" +
                        (isSelected ? " bg-emerald-50/70" : "")
                      }
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-700">
                        {formatDate(row.executedAtUtc)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-700">
                        {formatOrigin(row.origin)}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-800">
                        <div className="font-medium">
                          {row.stepName || "(no step name)"}
                        </div>
                        {row.stepId && (
                          <div className="text-[11px] text-gray-500">
                            {String(row.stepId).slice(0, 8)}…
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-800">
                        <div className="font-medium">
                          {row.templateName || "-"}
                        </div>
                        {row.templateType && (
                          <div className="text-[11px] uppercase text-gray-500">
                            {row.templateType}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-800">
                        <div>{row.contactPhone || "-"}</div>
                        {row.triggeredByButton && (
                          <div className="text-[11px] text-emerald-600">
                            Button #{row.buttonIndex ?? "-"}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <Pill ok={row.success} />
                      </td>
                    </tr>
                  );
                })}

                {loading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-4 text-center text-sm text-gray-500"
                    >
                      Loading…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Details + Run timeline */}
        <div className="flex flex-col rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800">Step details</h2>
          {!selected && (
            <p className="mt-2 text-xs text-gray-500">
              Select a row from the table to see details and run timeline.
            </p>
          )}

          {selected && (
            <>
              {/* Run + correlation */}
              <div className="mt-3 grid gap-3 text-xs text-gray-700 sm:grid-cols-2">
                <div>
                  <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Run
                  </h3>
                  <div className="space-y-1">
                    <div>
                      <span className="font-medium">RunId:</span>{" "}
                      <span className="break-all">{selected.runId}</span>
                    </div>
                    <div>
                      <span className="font-medium">FlowId:</span>{" "}
                      <span className="break-all">
                        {selected.flowId || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">AutoReplyFlowId:</span>{" "}
                      <span className="break-all">
                        {selected.autoReplyFlowId || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">CampaignId:</span>{" "}
                      <span className="break-all">
                        {selected.campaignId || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Correlation
                  </h3>
                  <div className="space-y-1">
                    <div>
                      <span className="font-medium">MessageLogId:</span>{" "}
                      <span className="break-all">
                        {selected.messageLogId || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">RequestId:</span>{" "}
                      <span className="break-all">
                        {selected.requestId || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step / contact / result */}
              <div className="mt-4 grid gap-3 text-xs text-gray-700 sm:grid-cols-2">
                <div>
                  <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Step
                  </h3>
                  <div className="space-y-1">
                    <div>
                      <span className="font-medium">Name:</span>{" "}
                      {selected.stepName || "—"}
                    </div>
                    <div>
                      <span className="font-medium">StepId:</span>{" "}
                      <span className="break-all">
                        {selected.stepId || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Template:</span>{" "}
                      {selected.templateName || "—"}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span>{" "}
                      {selected.templateType || "—"}
                    </div>
                    <div>
                      <span className="font-medium">Origin:</span>{" "}
                      {formatOrigin(selected.origin)}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Contact & Result
                  </h3>
                  <div className="space-y-1">
                    <div>
                      <span className="font-medium">Contact:</span>{" "}
                      {selected.contactPhone || "—"}
                    </div>
                    <div>
                      <span className="font-medium">Button:</span>{" "}
                      {selected.triggeredByButton
                        ? `Button #${selected.buttonIndex ?? "?"}`
                        : "—"}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Result:</span>
                      <Pill ok={selected.success} />
                    </div>
                    <div>
                      <span className="font-medium">Executed at:</span>{" "}
                      {formatDate(selected.executedAtUtc)}
                    </div>
                    {selected.errorMessage && (
                      <div className="mt-1 text-rose-600">
                        {selected.errorMessage}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Run timeline */}
              <div className="mt-5 border-t border-gray-100 pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Run timeline
                </h3>
                {runTimelineLoading && (
                  <p className="mt-2 text-xs text-gray-500">Loading…</p>
                )}
                {!runTimelineLoading && runTimeline.length === 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    No additional steps found for this run.
                  </p>
                )}
                {!runTimelineLoading && runTimeline.length > 0 && (
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
                    {runTimeline.map(step => (
                      <li
                        key={step.id}
                        className="flex items-start gap-2 rounded-md px-1 py-1 hover:bg-emerald-50"
                      >
                        <span
                          className={`mt-1 h-2 w-2 rounded-full ${
                            step.success ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        <div>
                          <div className="font-medium text-gray-900">
                            {formatDate(step.executedAtUtc)} –{" "}
                            {step.stepName || "(no name)"}
                          </div>
                          <div className="text-[11px] text-gray-600">
                            {step.templateName && (
                              <span>{step.templateName}</span>
                            )}
                            {step.templateType && (
                              <span className="ml-1 uppercase">
                                ({step.templateType})
                              </span>
                            )}
                            {" · "}
                            {formatOrigin(step.origin)}
                          </div>
                          {!step.success && step.errorMessage && (
                            <div className="mt-0.5 text-[11px] text-rose-600">
                              {step.errorMessage}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Raw response */}
              <div className="mt-5 border-t border-gray-100 pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Raw provider response
                </h3>
                <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-gray-900 p-3 text-xs text-emerald-50">
                  {selected.rawResponse
                    ? selected.rawResponse
                    : "// No RawResponse stored for this step."}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// // 📄 src/pages/FlowExecutionsExplorer.jsx

// import React, { useEffect, useState, useCallback } from "react";
// import axiosClient from "../../api/axiosClient";
// import { toast } from "react-toastify";

// const ORIGIN_OPTIONS = [
//   { label: "Any origin", value: "" },
//   { label: "AutoReply", value: "AutoReply" },
//   { label: "Campaign", value: "Campaign" },
//   // You can add more if FlowExecutionOrigin gets new values
// ];

// function formatDate(value) {
//   if (!value) return "-";
//   try {
//     return new Date(value).toLocaleString();
//   } catch {
//     return String(value);
//   }
// }

// function Pill({ ok }) {
//   const base =
//     "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold";
//   if (ok) {
//     return (
//       <span
//         className={`${base} bg-emerald-50 text-emerald-700 border border-emerald-200`}
//       >
//         ✓ Success
//       </span>
//     );
//   }
//   return (
//     <span className={`${base} bg-rose-50 text-rose-700 border border-rose-200`}>
//       ✕ Failed
//     </span>
//   );
// }

// export default function FlowExecutionExplorer() {
//   const [rows, setRows] = useState([]);
//   const [selected, setSelected] = useState(null);
//   const [loading, setLoading] = useState(false);

//   const [origin, setOrigin] = useState("");
//   const [contactPhone, setContactPhone] = useState("");
//   const [flowId, setFlowId] = useState("");
//   const [limit, setLimit] = useState(50);

//   // 🔹 Business selection
//   // - For normal admins: prefilled from localStorage.
//   // - For Super Admin: they can paste any BusinessId from the Admin → Businesses page.
//   const initialBusinessId =
//     localStorage.getItem("businessId") ||
//     "00000000-0000-0000-0000-000000000000";

//   const [businessId, setBusinessId] = useState(initialBusinessId);

//   const loadData = useCallback(
//     async (opts = {}) => {
//       const effectiveBusinessId =
//         (opts.businessId ?? businessId)?.trim() ||
//         "00000000-0000-0000-0000-000000000000";

//       if (
//         !effectiveBusinessId ||
//         effectiveBusinessId === "00000000-0000-0000-0000-000000000000"
//       ) {
//         toast.info("Please select or enter a valid Business Id.");
//         return;
//       }

//       setLoading(true);
//       try {
//         const params = {
//           businessId: effectiveBusinessId,
//           limit: opts.limit ?? limit ?? 50,
//         };

//         if (opts.origin ?? origin) params.origin = opts.origin ?? origin;
//         const phone = (opts.contactPhone ?? contactPhone).trim();
//         if (phone) params.contactPhone = phone;
//         const flow = (opts.flowId ?? flowId).trim();
//         if (flow) params.flowId = flow;

//         const res = await axiosClient.get("/flow-executions/recent", {
//           params,
//         });

//         const data = Array.isArray(res.data) ? res.data : [];
//         setRows(data);
//         setSelected(data.length > 0 ? data[0] : null);
//       } catch (err) {
//         console.error("Error loading flow executions", err);
//         toast.error("❌ Failed to load flow executions");
//       } finally {
//         setLoading(false);
//       }
//     },
//     [businessId, origin, contactPhone, flowId, limit]
//   );

//   // Auto-load last 50 executions on first mount
//   useEffect(() => {
//     loadData({ limit: 50 });
//   }, [loadData]);

//   const handleSubmit = e => {
//     e.preventDefault();
//     loadData();
//   };

//   return (
//     <div className="p-6 space-y-4">
//       {/* Header */}
//       <div className="flex items-center justify-between gap-4">
//         <div>
//           <h1 className="text-2xl font-bold text-emerald-700">
//             Flow Execution Logs
//           </h1>
//           <p className="text-sm text-gray-600 mt-1 max-w-2xl">
//             Inspect raw flow execution steps across AutoReply and Campaign
//             journeys.{" "}
//           </p>
//           {/* <p className="text-xs text-gray-500 mt-1">
//             For Super Admin: paste the target BusinessId below to inspect that
//             tenant&apos;s flows.
//           </p> */}
//         </div>
//       </div>

//       {/* Filters */}
//       <form
//         onSubmit={handleSubmit}
//         className="bg-white shadow rounded-xl p-4 flex flex-wrap gap-4 items-end"
//       >
//         {/* Business selector / override */}
//         <div className="flex flex-col min-w-[260px]">
//           <label className="text-xs font-medium text-gray-600 mb-1">
//             Business ID
//           </label>
//           <span className="text-[11px] text-gray-500 mt-1">
//             Default is your own business. Super Admin can change this to inspect
//             another tenant.
//           </span>
//           <input
//             type="text"
//             className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
//             placeholder="Current business or target BusinessId (for Super Admin)"
//             value={businessId}
//             onChange={e => setBusinessId(e.target.value)}
//           />
//         </div>

//         <div className="flex flex-col min-w-[180px]">
//           <label className="text-xs font-medium text-gray-600 mb-1">
//             Origin
//           </label>
//           <select
//             className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2focus:ring-emerald-500"
//             value={origin}
//             onChange={e => setOrigin(e.target.value)}
//           >
//             {ORIGIN_OPTIONS.map(opt => (
//               <option key={opt.value || "any"} value={opt.value}>
//                 {opt.label}
//               </option>
//             ))}
//           </select>
//         </div>

//         <div className="flex flex-col min-w-[220px]">
//           <label className="text-xs font-medium text-gray-600 mb-1">
//             Contact phone (WhatsApp)
//           </label>
//           <input
//             type="text"
//             className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
//             placeholder="e.g. 9198xxxxxxx"
//             value={contactPhone}
//             onChange={e => setContactPhone(e.target.value)}
//           />
//         </div>

//         <div className="flex flex-col min-w-[260px]">
//           <label className="text-xs font-medium text-gray-600 mb-1">
//             Flow ID (optional, Guid)
//           </label>
//           <input
//             type="text"
//             className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
//             placeholder="Filter by CTAFlowConfig.Id / AutoReplyFlow.Id"
//             value={flowId}
//             onChange={e => setFlowId(e.target.value)}
//           />
//         </div>

//         <div className="flex flex-col w-24">
//           <label className="text-xs font-medium text-gray-600 mb-1">
//             Limit
//           </label>
//           <input
//             type="number"
//             min={1}
//             max={500}
//             className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
//             value={limit}
//             onChange={e => setLimit(Number(e.target.value) || 50)}
//           />
//         </div>

//         <button
//           type="submit"
//           className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold shadow hover:bg-emerald-700 disabled:opacity-60"
//           disabled={loading}
//         >
//           {loading ? "Loading…" : "Apply Filters"}
//         </button>
//       </form>

//       {/* Main content: table + details */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//         {/* Left: table */}
//         <div className="lg:col-span-2 bg-white shadow rounded-xl overflow-hidden flex flex-col">
//           <div className="border-b px-4 py-2 flex items-center justify-between">
//             <h2 className="text-sm font-semibold text-gray-700">
//               Recent executions ({rows.length})
//             </h2>
//             {loading && (
//               <span className="text-xs text-gray-500">Refreshing…</span>
//             )}
//           </div>

//           <div className="overflow-x-auto overflow-y-auto max-h-[520px]">
//             <table className="min-w-full text-sm">
//               <thead className="bg-gray-50 border-b">
//                 <tr>
//                   <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
//                     Time
//                   </th>
//                   <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
//                     Origin
//                   </th>
//                   <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
//                     Step
//                   </th>
//                   <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
//                     Template
//                   </th>
//                   <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
//                     Contact
//                   </th>
//                   <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
//                     Result
//                   </th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {rows.length === 0 && !loading && (
//                   <tr>
//                     <td
//                       colSpan={6}
//                       className="px-4 py-6 text-center text-sm text-gray-500"
//                     >
//                       No executions found for these filters.
//                     </td>
//                   </tr>
//                 )}
//                 {rows.map(row => {
//                   const isActive = selected && selected.id === row.id;
//                   return (
//                     <tr
//                       key={row.id}
//                       onClick={() => setSelected(row)}
//                       className={`cursor-pointer border-b hover:bg-emerald-50 ${
//                         isActive ? "bg-emerald-50" : "bg-white"
//                       }`}
//                     >
//                       <td className="px-3 py-2 align-top text-xs text-gray-700 whitespace-nowrap">
//                         {formatDate(row.executedAtUtc)}
//                       </td>
//                       <td className="px-3 py-2 align-top text-xs text-gray-600">
//                         {row.origin || "-"}
//                       </td>
//                       <td className="px-3 py-2 align-top text-xs text-gray-800">
//                         <div className="font-semibold truncate max-w-[160px]">
//                           {row.stepName || "-"}
//                         </div>
//                         <div className="text-[11px] text-gray-500">
//                           StepId:{" "}
//                           <span className="font-mono">
//                             {row.stepId?.slice
//                               ? row.stepId.slice(0, 8)
//                               : String(row.stepId)}
//                           </span>
//                         </div>
//                       </td>
//                       <td className="px-3 py-2 align-top text-xs text-gray-700">
//                         <div className="truncate max-w-[180px]">
//                           {row.templateName || "-"}
//                         </div>
//                         <div className="text-[11px] text-gray-500">
//                           {row.templateType || ""}
//                         </div>
//                       </td>
//                       <td className="px-3 py-2 align-top text-xs text-gray-700">
//                         <div className="font-mono text-xs">
//                           {row.contactPhone || "-"}
//                         </div>
//                         {row.triggeredByButton && (
//                           <div className="text-[11px] text-gray-500">
//                             Btn: {row.triggeredByButton}
//                           </div>
//                         )}
//                       </td>
//                       <td className="px-3 py-2 align-top text-xs text-gray-700">
//                         <Pill ok={row.success} />
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         </div>

//         {/* Right: details */}
//         <div className="bg-white shadow rounded-xl p-4">
//           <h2 className="text-sm font-semibold text-gray-700 mb-2">
//             Step details
//           </h2>
//           {!selected ? (
//             <p className="text-sm text-gray-500">
//               Select a row on the left to inspect the full context.
//             </p>
//           ) : (
//             <div className="space-y-3 text-xs text-gray-800">
//               <div>
//                 <p className="font-bold text-gray-600">Run</p>
//                 <p className="font-mono break-all">
//                   RunId: {selected.runId || "-"}
//                 </p>
//                 <p className="font-mono break-all">
//                   FlowId: {selected.flowId || "-"}
//                 </p>
//                 <p className="font-mono break-all">
//                   AutoReplyFlowId: {selected.autoReplyFlowId || "-"}
//                 </p>
//                 <p className="font-mono break-all">
//                   CampaignId: {selected.campaignId || "-"}
//                 </p>
//               </div>

//               <div>
//                 <p className="font-bold text-gray-600">Step</p>
//                 <p>{selected.stepName || "-"}</p>
//                 <p className="font-mono break-all text-gray-600">
//                   StepId: {selected.stepId || "-"}
//                 </p>
//                 <p className="mt-1">
//                   Template:{" "}
//                   <span className="font-mono">
//                     {selected.templateName || "-"}
//                   </span>
//                   {selected.templateType && (
//                     <span className="ml-1 text-gray-500">
//                       ({selected.templateType})
//                     </span>
//                   )}
//                 </p>
//               </div>

//               <div>
//                 <p className="font-bold text-gray-600">Contact</p>
//                 <p className="font-mono break-all">
//                   {selected.contactPhone || "-"}
//                 </p>
//                 {selected.buttonIndex != null && (
//                   <p className="text-gray-600">
//                     Button index: {selected.buttonIndex}{" "}
//                     {selected.triggeredByButton &&
//                       `(${selected.triggeredByButton})`}
//                   </p>
//                 )}
//               </div>

//               <div>
//                 <p className="font-bold text-gray-600">Result</p>
//                 <div className="flex items-center gap-2">
//                   <Pill ok={selected.success} />
//                   <span className="text-gray-500">
//                     at {formatDate(selected.executedAtUtc)}
//                   </span>
//                 </div>
//                 {selected.errorMessage && (
//                   <p className="mt-1 text-rose-600 break-words">
//                     {selected.errorMessage}
//                   </p>
//                 )}
//               </div>

//               <div>
//                 <p className="font-bold text-gray-600 mb-1">
//                   Message / request correlation
//                 </p>
//                 <p className="font-mono break-all text-gray-700">
//                   MessageLogId: {selected.messageLogId || "-"}
//                 </p>
//                 <p className="font-mono break-all text-gray-700">
//                   RequestId: {selected.requestId || "-"}
//                 </p>
//               </div>

//               <div>
//                 <p className="font-bold text-gray-600 mb-1">
//                   Raw response (provider)
//                 </p>
//                 <pre className="bg-gray-900 text-gray-100 text-[11px] rounded-lg p-2 max-h-52 overflow-auto whitespace-pre-wrap">
//                   {selected.rawResponse || "(empty)"}
//                 </pre>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
