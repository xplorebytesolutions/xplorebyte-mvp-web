// 📄 src/pages/AutoReplyBuilder/components/AutoReplyFlowsListModal.jsx
import React, { useEffect, useState } from "react";
import axiosClient from "../../../api/axiosClient";
import { X, RefreshCcw, FlaskConical } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../../app/providers/AuthProvider";

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function AutoReplyFlowsListModal({
  open,
  onClose,
  onFlowSelected,
}) {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 🔐 get business id for test-match
  const { business } = useAuth() || {};
  const businessId = business?.id;

  // 🔬 test-match modal state
  const [testOpen, setTestOpen] = useState(false);
  const [testFlow, setTestFlow] = useState(null);
  const [testText, setTestText] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState(null);

  // load flows when modal opens
  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await axiosClient.get("autoreplyflows");
        setFlows(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load flows list", err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to load flows."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open]);

  // toggle active / inactive status for a single flow
  const handleToggleStatus = async (flow, evt) => {
    // prevent the row click (which opens the flow) from firing
    if (evt) {
      evt.stopPropagation();
      evt.preventDefault();
    }

    const next = !flow.isActive;

    try {
      await axiosClient.patch(`autoreplyflows/${flow.id}/status`, {
        isActive: next,
      });

      // update local state
      setFlows(prev =>
        prev.map(f =>
          f.id === flow.id
            ? {
                ...f,
                isActive: next,
                // bump updatedAt so UI shows something fresh
                updatedAt: new Date().toISOString(),
              }
            : f
        )
      );

      toast.success(
        next ? "Flow activated successfully." : "Flow deactivated successfully."
      );
    } catch (err) {
      console.error("Failed to toggle flow status", err);
      toast.error("Failed to update flow status. Please try again.");
    }
  };

  // 🔬 open test modal for a given flow
  const openTestForFlow = (flow, evt) => {
    if (evt) {
      evt.stopPropagation();
      evt.preventDefault();
    }

    setTestFlow(flow);
    setTestResult(null);
    setTestError(null);

    // prefill example text with first trigger keyword (if any)
    const raw = flow.triggerKeyword || "";
    const firstKeyword =
      raw
        .split(/[,|\n|\r]/)
        .map(x => x.trim())
        .filter(Boolean)[0] || "";
    setTestText(firstKeyword);

    setTestOpen(true);
  };

  const closeTestModal = () => {
    setTestOpen(false);
    setTestFlow(null);
    setTestText("");
    setTestResult(null);
    setTestError(null);
    setTestLoading(false);
  };

  const handleRunTest = async () => {
    if (!testText.trim()) return;

    if (!businessId) {
      setTestError("Missing business id in auth context.");
      return;
    }

    setTestLoading(true);
    setTestError(null);
    setTestResult(null);

    try {
      const payload = {
        businessId,
        incomingText: testText.trim(),
      };

      const res = await axiosClient.post("autoreplyflows/test-match", payload);
      setTestResult(res?.data || null);
    } catch (err) {
      console.error("Test-match error (flows modal)", err);
      setTestError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to test auto-reply match."
      );
    } finally {
      setTestLoading(false);
    }
  };

  if (!open) return null;

  const isThisFlowSelected =
    testResult &&
    testResult.isMatch &&
    testFlow &&
    testResult.flowId === testFlow.id;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50">
          <div>
            <h2 className="text-base font-semibold text-emerald-900">
              Auto-Reply Flows
            </h2>
            <p className="text-xs text-emerald-700">
              Click a row to open the flow on the canvas. Use the toggle to
              activate or deactivate a flow. Use{" "}
              <span className="font-semibold">Test</span> to see which flow
              would trigger for a sample message.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full p-1.5 hover:bg-emerald-100"
          >
            <X className="w-4 h-4 text-emerald-700" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-white">
          {loading && (
            <div className="p-4 text-sm text-zinc-600 flex items-center gap-2">
              <RefreshCcw className="w-4 h-4 animate-spin" />
              Loading flows...
            </div>
          )}

          {error && !loading && (
            <div className="p-4 text-sm text-red-600">{error}</div>
          )}

          {!loading && !error && flows.length === 0 && (
            <div className="p-4 text-sm text-zinc-500">
              No flows found yet. Create your first auto-reply flow from the
              canvas.
            </div>
          )}

          {!loading && !error && flows.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b">
                <tr>
                  <th className="text-left py-2 px-4 font-medium text-xs text-zinc-500">
                    Name
                  </th>
                  <th className="text-left py-2 px-4 font-medium text-xs text-zinc-500">
                    Trigger Keywords
                  </th>
                  <th className="text-left py-2 px-4 font-medium text-xs text-zinc-500">
                    Status
                  </th>
                  <th className="text-left py-2 px-4 font-medium text-xs text-zinc-500">
                    Created
                  </th>
                  <th className="text-left py-2 px-4 font-medium text-xs text-zinc-500">
                    Updated
                  </th>
                  <th className="text-left py-2 px-4 font-medium text-xs text-zinc-500">
                    Test
                  </th>
                  <th className="text-right py-2 px-4 font-medium text-xs text-zinc-500">
                    Toggle
                  </th>
                </tr>
              </thead>
              <tbody>
                {flows.map(flow => {
                  const active = flow.isActive;
                  return (
                    <tr
                      key={flow.id}
                      className="border-b last:border-b-0 hover:bg-zinc-50 cursor-pointer"
                      onClick={() => {
                        if (typeof onFlowSelected === "function") {
                          onFlowSelected(flow.id);
                        }
                        onClose?.();
                      }}
                    >
                      <td className="py-2 px-4">
                        <div className="font-medium text-zinc-800">
                          {flow.name}
                        </div>
                      </td>
                      <td className="py-2 px-4">
                        <div className="text-xs text-zinc-600 truncate max-w-xs">
                          {flow.triggerKeyword || "-"}
                        </div>
                      </td>
                      <td className="py-2 px-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              active ? "bg-emerald-500" : "bg-zinc-400"
                            }`}
                          ></span>
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-xs text-zinc-600">
                        {formatDate(flow.createdAt)}
                      </td>
                      <td className="py-2 px-4 text-xs text-zinc-600">
                        {formatDate(flow.updatedAt)}
                      </td>

                      {/* Test button */}
                      <td className="py-2 px-4">
                        <button
                          type="button"
                          onClick={evt => openTestForFlow(flow, evt)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-emerald-200 text-[11px] text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 transition-colors"
                        >
                          <FlaskConical className="w-3 h-3" />
                          Test
                        </button>
                      </td>

                      {/* Toggle */}
                      <td className="py-2 px-4 text-right">
                        <button
                          type="button"
                          onClick={evt => handleToggleStatus(flow, evt)}
                          className={`relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full border transition-colors duration-200 ${
                            active
                              ? "bg-emerald-500 border-emerald-500"
                              : "bg-zinc-300 border-zinc-300"
                          }`}
                        >
                          <span
                            className={`h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
                              active ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t bg-white flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-sm rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
          >
            Close
          </button>
        </div>
      </div>

      {/* 🔬 Test Auto-Reply Match modal (on top of flows modal) */}
      {testOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-800">
                Test Auto-Reply Match
              </h3>
              <button
                type="button"
                onClick={closeTestModal}
                className="p-1 rounded-full hover:bg-slate-100"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              Flow:{" "}
              <span className="font-semibold">
                {testFlow?.name || testFlow?.id || "-"}
              </span>
            </p>

            <div className="mb-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Sample incoming message
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                placeholder="Type what the customer might send..."
                value={testText}
                onChange={e => setTestText(e.target.value)}
              />
            </div>

            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={handleRunTest}
                disabled={testLoading || !testText.trim()}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white disabled:opacity-50"
              >
                <FlaskConical className="w-4 h-4" />
                {testLoading ? "Testing..." : "Run test"}
              </button>
            </div>

            {testError && (
              <p className="text-xs text-red-600 mb-2">{testError}</p>
            )}

            {testResult && (
              <div className="mt-2 text-xs text-slate-700 space-y-1 border-t border-slate-100 pt-2">
                <p>
                  <span className="font-semibold">Matched:</span>{" "}
                  {testResult.isMatch ? "Yes" : "No"}
                </p>

                {testResult.isMatch && (
                  <>
                    <p>
                      <span className="font-semibold">Matched flow:</span>{" "}
                      {testResult.flowName || testResult.flowId}
                    </p>
                    <p>
                      <span className="font-semibold">Is this flow?</span>{" "}
                      {isThisFlowSelected ? (
                        <span className="text-emerald-700 font-semibold">
                          Yes, this flow will trigger.
                        </span>
                      ) : (
                        <span className="text-amber-700">
                          No, a different flow has higher priority or a better
                          match.
                        </span>
                      )}
                    </p>
                    <p>
                      <span className="font-semibold">Keyword:</span>{" "}
                      {testResult.matchedKeyword || "-"}
                    </p>
                    <p>
                      <span className="font-semibold">Start node:</span>{" "}
                      {testResult.startNodeType || "?"} /{" "}
                      {testResult.startNodeName || "-"}
                    </p>
                  </>
                )}

                {!testResult.isMatch && (
                  <p className="text-amber-700">
                    No auto-reply flow matched this message.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
