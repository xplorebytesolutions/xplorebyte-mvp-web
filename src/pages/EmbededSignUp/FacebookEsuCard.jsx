import React, { useCallback, useEffect, useState } from "react";

const BIZ_ID = "9841bcab-ca71-439f-8691-d85ada887b01";
const API = p =>
  `${process.env.REACT_APP_API_BASE ?? "https://localhost:7113"}${p}`;

export default function FacebookEsuCard() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    setError("");
    try {
      const r = await fetch(
        API(`/api/esu/facebook/debug/status?businessId=${BIZ_ID}`)
      );
      const j = await r.json();
      setStatus(j);
    } catch (e) {
      setError("Failed to load status");
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleConnect = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(API("/api/esu/facebook/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: BIZ_ID,
          returnUrlAfterSuccess: window.location.href,
        }),
      });
      if (!r.ok) throw new Error("start failed");
      const j = await r.json();
      window.location.href = j.launchUrl; // redirect to FB dialog
    } catch (e) {
      setError("Failed to start Facebook ESU.");
      setLoading(false);
    }
  };

  const handleDeauth = async () => {
    setLoading(true);
    setError("");
    try {
      await fetch(
        API(`/api/esu/facebook/debug/deauthorize?businessId=${BIZ_ID}`),
        { method: "POST" }
      );
      await loadStatus();
    } catch (e) {
      setError("Failed to deauthorize");
    } finally {
      setLoading(false);
    }
  };

  const expiry = status?.tokenExpiresAtUtc
    ? new Date(status.tokenExpiresAtUtc).toLocaleString()
    : "N/A";
  const connected = !!status?.connected;

  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Facebook Embedded Signup</h3>
        <span
          className={`text-sm ${
            connected ? "text-green-600" : "text-gray-500"
          }`}
        >
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>

      <div className="mt-2 text-sm text-gray-600">
        <div>
          Token expiry: <b>{expiry}</b>
        </div>
        {status?.willExpireSoon && (
          <div className="text-amber-600">Token will expire soon</div>
        )}
      </div>

      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}

      <div className="mt-4 flex gap-2">
        {!connected && (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="rounded-xl px-4 py-2 bg-blue-600 text-white disabled:opacity-50"
          >
            {loading ? "Starting…" : "Connect Facebook"}
          </button>
        )}
        {connected && (
          <button
            onClick={handleDeauth}
            disabled={loading}
            className="rounded-xl px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
          >
            {loading ? "Working…" : "Disconnect"}
          </button>
        )}
        <button onClick={loadStatus} className="rounded-xl px-4 py-2 border">
          Refresh
        </button>
      </div>
    </div>
  );
}
