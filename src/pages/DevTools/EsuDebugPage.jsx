// 📄 src/pages/Debug/EsuDebugPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../app/providers/AuthProvider";
import { ShieldCheck, Trash2, RefreshCcw, ArrowLeft } from "lucide-react";

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function EsuDebugPage() {
  const navigate = useNavigate();
  const { role, hasAllAccess } = useAuth();

  const userRole = String(role || "").toLowerCase();
  const isSuperAdmin = hasAllAccess || userRole === "superadmin";

  const [businessId, setBusinessId] = useState("");
  const [loadingToken, setLoadingToken] = useState(false);
  const [loadingFlags, setLoadingFlags] = useState(false);
  const [deauthing, setDeauthing] = useState(false);

  const [tokenInfo, setTokenInfo] = useState(null);
  const [flagsInfo, setFlagsInfo] = useState(null);

  // Modal state for deauthorize confirmation
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBiz, setConfirmBiz] = useState("");

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate("/app/admin")}
          className="inline-flex items-center gap-2 text-sm text-purple-600 mb-4"
        >
          <ArrowLeft size={16} />
          Back to Admin
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          <div className="font-semibold mb-1">Restricted</div>
          <div className="text-sm">
            Meta ESU debug tools are only available to superadmin users.
          </div>
        </div>
      </div>
    );
  }

  const ensureBiz = () => {
    const trimmed = businessId.trim();
    if (!GUID_RE.test(trimmed)) {
      toast.error("Enter a valid BusinessId (GUID) to continue.");
      return null;
    }
    return trimmed;
  };

  // Load token info (optionally for a specific BusinessId)
  const handleLoadToken = async explicitBiz => {
    const biz = explicitBiz || ensureBiz();
    if (!biz) return;

    try {
      setLoadingToken(true);
      setTokenInfo(null);

      const res = await axiosClient.get(`/esu/facebook/debug/token`, {
        params: { businessId: biz },
      });

      setTokenInfo(res?.data || null);
      if (res?.data?.ok) {
        toast.success("Token info loaded.");
      } else {
        toast.info(res?.data?.message || "No valid token found.");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to load token info for this account."
      );
    } finally {
      setLoadingToken(false);
    }
  };

  // Load ESU flags (optionally for a specific BusinessId)
  const handleLoadFlags = async explicitBiz => {
    const biz = explicitBiz || ensureBiz();
    if (!biz) return;

    try {
      setLoadingFlags(true);
      setFlagsInfo(null);

      const res = await axiosClient.get(`/esu/facebook/debug/flags`, {
        params: { businessId: biz },
      });

      setFlagsInfo(res?.data || null);
      toast.success("Flags loaded.");
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to load ESU flags for this account."
      );
    } finally {
      setLoadingFlags(false);
    }
  };

  // Open confirmation modal
  const handleDeauthorizeClick = () => {
    const biz = ensureBiz();
    if (!biz) return;
    setConfirmBiz(biz);
    setConfirmOpen(true);
  };

  // Perform local-only deauthorize after confirmation
  const performDeauthorize = async () => {
    if (!confirmBiz) {
      setConfirmOpen(false);
      return;
    }

    try {
      setDeauthing(true);

      const res = await axiosClient.post(
        `/esu/facebook/debug/deauthorize`,
        null,
        { params: { businessId: confirmBiz } }
      );

      if (res?.data?.ok) {
        toast.success(
          `Local ESU flags/tokens cleared for account ${confirmBiz}.`
        );
      } else {
        toast.info(res?.data?.message || "Deauthorize completed.");
      }

      // Refresh debug info for the same account
      await Promise.all([
        handleLoadToken(confirmBiz),
        handleLoadFlags(confirmBiz),
      ]);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to deauthorize ESU locally for this account."
      );
    } finally {
      setDeauthing(false);
      setConfirmOpen(false);
      setConfirmBiz("");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate("/app/admin")}
        className="inline-flex items-center gap-2 text-sm text-purple-600 mb-4"
      >
        <ArrowLeft size={16} />
        Back to Admin
      </button>

      <div className="flex items-center gap-3 mb-3">
        <div className="bg-amber-50 border border-amber-200 rounded-full p-2">
          <ShieldCheck className="text-amber-500" size={22} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Meta ESU Debug Tools
          </h1>
          <p className="text-sm text-slate-600">
            Superadmin-only utilities to inspect ESU tokens/flags and run{" "}
            <strong>local-only deauthorize</strong> for a specific account.
          </p>
        </div>
      </div>

      <div className="mt-4 mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
        <ul className="list-disc list-inside space-y-1">
          <li>
            Uses existing <code>/api/esu/facebook/debug/*</code> endpoints.
          </li>
          <li>
            <strong>Deauthorize</strong> clears ESU flags &amp; tokens in our DB
            only. It does <em>not</em> call Meta&apos;s{" "}
            <code>/me/permissions</code>.
          </li>
          <li>
            Use for local/staging debugging or targeted cleanup by
            superadmins/ops.
          </li>
        </ul>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm">
        <label className="block text-xs text-slate-600 mb-1">
          Target Account BusinessId (GUID)
        </label>
        <input
          type="text"
          value={businessId}
          onChange={e => setBusinessId(e.target.value)}
          placeholder="e.g. 12345678-90ab-cdef-1234-567890abcdef"
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-mono"
        />
        <p className="text-[10px] text-slate-500 mt-1">
          This should be the same BusinessId used in ESU / WhatsApp settings.
        </p>

        <div className="flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            onClick={() => handleLoadToken()}
            disabled={loadingToken}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-sky-600 text-white text-xs font-semibold disabled:opacity-60"
          >
            <RefreshCcw size={14} />
            {loadingToken ? "Loading token…" : "Load Token Preview"}
          </button>

          <button
            type="button"
            onClick={() => handleLoadFlags()}
            disabled={loadingFlags}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-semibold disabled:opacity-60"
          >
            <RefreshCcw size={14} />
            {loadingFlags ? "Loading flags…" : "Load ESU Flags"}
          </button>

          <button
            type="button"
            onClick={handleDeauthorizeClick}
            disabled={deauthing}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-700 text-white text-xs font-semibold disabled:opacity-60"
          >
            <Trash2 size={14} />
            {deauthing ? "Deauthorizing…" : "Deauthorize (Local Only)"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
          <div className="font-semibold text-slate-700 mb-1">Token Info</div>
          <pre className="whitespace-pre-wrap break-all text-[10px] text-slate-700">
            {tokenInfo ? JSON.stringify(tokenInfo, null, 2) : "No data loaded."}
          </pre>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
          <div className="font-semibold text-slate-700 mb-1">ESU Flags</div>
          <pre className="whitespace-pre-wrap break-all text-[10px] text-slate-700">
            {flagsInfo ? JSON.stringify(flagsInfo, null, 2) : "No data loaded."}
          </pre>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-5 border border-amber-200">
            <h2 className="text-sm font-semibold text-slate-900 mb-2">
              Deauthorize ESU locally for this account?
            </h2>
            <p className="text-xs text-slate-700 mb-2">
              <span className="font-semibold">BusinessId:</span>{" "}
              <span className="font-mono break-all">{confirmBiz}</span>
            </p>
            <p className="text-[11px] text-amber-800 mb-3">
              This will clear ESU flags and stored tokens in{" "}
              <span className="font-semibold">our DB only</span> for this
              account. It will <span className="font-semibold">not</span> call
              Meta&apos;s <code className="text-[10px]">/me/permissions</code>{" "}
              or revoke anything remotely. Use for local/staging debugging or
              targeted cleanup by superadmins/ops.
            </p>
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => {
                  if (!deauthing) {
                    setConfirmOpen(false);
                    setConfirmBiz("");
                  }
                }}
                className="px-3 py-1.5 rounded-md text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                disabled={deauthing}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={performDeauthorize}
                disabled={deauthing}
                className="px-3 py-1.5 rounded-md text-xs bg-amber-700 text-white font-semibold hover:bg-amber-800 disabled:opacity-60"
              >
                {deauthing ? "Deauthorizing…" : "Yes, Deauthorize Locally"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
