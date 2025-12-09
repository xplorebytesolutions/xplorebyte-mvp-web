// 📄 src/pages/AutoReplyBuilder/components/AutoReplyLogsPanel.jsx
import React, { useEffect, useState, useCallback } from "react";
import axiosClient from "../../../api/axiosClient";

export default function AutoReplyLogsPanel({ businessId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // backend will infer BusinessId from JWT claims
      const res = await axiosClient.get("autoreplylogs/recent", {
        params: { take: 20 },
      });
      setLogs(res?.data || []);
    } catch (err) {
      console.error("Failed to load auto-reply logs", err);
      const status = err?.response?.status;
      if (status === 404) {
        setError(
          "Logs endpoint not available yet (404). Backend wiring still pending."
        );
      } else {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load auto-reply logs."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // only attempt if we have a business context
    if (businessId) {
      fetchLogs();
    }
  }, [businessId, fetchLogs]);

  return (
    <div className="mt-4 p-4 bg-white rounded-xl shadow-sm border border-slate-200 mx-4 mb-8">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-800">
          Recent Auto-Reply Logs
        </h3>
        <button
          type="button"
          onClick={fetchLogs}
          disabled={loading}
          className="text-xs px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 mb-2 whitespace-pre-line">{error}</p>
      )}

      {!error && !loading && logs.length === 0 && (
        <p className="text-xs text-slate-500">
          No auto-reply logs yet. Try sending a test message that triggers a
          flow.
        </p>
      )}

      {!error && logs.length > 0 && (
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-slate-500 border-b">
              <tr>
                <th className="py-1 pr-2">Time</th>
                <th className="py-1 pr-2">Flow</th>
                <th className="py-1 pr-2">Keyword</th>
                <th className="py-1 pr-2">Reply Preview</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b last:border-b-0">
                  <td className="py-1 pr-2 align-top text-slate-600">
                    {log.triggeredAt
                      ? new Date(log.triggeredAt).toLocaleString()
                      : "-"}
                  </td>
                  <td className="py-1 pr-2 align-top font-medium text-slate-800">
                    {log.flowName || "—"}
                  </td>
                  <td className="py-1 pr-2 align-top text-slate-700">
                    {log.triggerKeyword || "—"}
                  </td>
                  <td className="py-1 pr-2 align-top text-slate-600">
                    {log.replyContent
                      ? log.replyContent.length > 60
                        ? log.replyContent.slice(0, 60) + "…"
                        : log.replyContent
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
