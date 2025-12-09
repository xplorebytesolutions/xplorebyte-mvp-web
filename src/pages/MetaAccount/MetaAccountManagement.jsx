// 📄 src/pages/MetaAccount/MetaAccountManagement.jsx

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";
import { useAuth } from "../../app/providers/AuthProvider";
import { ShieldAlert, Trash2, RefreshCw } from "lucide-react";

// --- JWT businessId helper (aligned with ClaimsBusinessDetails) ---
const TOKEN_KEY = "xbyte_token";
const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getBusinessIdFromJwt() {
  try {
    const jwt = localStorage.getItem(TOKEN_KEY);
    if (!jwt) return null;

    const [, payloadB64] = jwt.split(".");
    if (!payloadB64) return null;

    const payload = JSON.parse(
      atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
    );

    const bid = payload?.businessId || payload?.BusinessId || null;

    return typeof bid === "string" && GUID_RE.test(bid) ? bid : null;
  } catch {
    return null;
  }
}

export default function MetaAccountManagement() {
  const { business, hasAllAccess } = useAuth();
  const nav = useNavigate();

  const [loading, setLoading] = useState(false);
  const [connectingEsu, setConnectingEsu] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [status, setStatus] = useState(null);

  // Hard delete modal + state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // New: post-delete success modal
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);

  // New: disconnect confirmation modal
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);

  // After a successful hard-delete in THIS session, we freeze all actions
  const [deletedThisSession, setDeletedThisSession] = useState(false);
  const [disconnectedThisSession, setDisconnectedThisSession] = useState(false);

  const isDev = process.env.NODE_ENV === "development";

  // Prefer AuthProvider if present, otherwise JWT claim
  const authBusinessId =
    business?.id || business?.businessId || business?.BusinessId || null;

  const jwtBusinessId = useMemo(getBusinessIdFromJwt, []);
  const effectiveBusinessId = authBusinessId || jwtBusinessId;
  const hasBusinessContext = !!effectiveBusinessId;

  // ------- Load ESU status (JWT-based) -------
  const loadStatus = async () => {
    try {
      setStatusLoading(true);

      // Backend: GET /api/esu/facebook/status uses JWT to resolve businessId
      const res = await axiosClient.get("esu/facebook/status");
      const payload = res?.data ?? null;
      const data = payload?.data || payload?.Data || payload;

      setStatus(data || null);
    } catch (err) {
      console.error("Failed to load ESU status", err);
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // ------- Normalized status -------
  const hasEsuFlag = status?.hasEsuFlag ?? status?.HasEsuFlag ?? false;

  const tokenExpiresAtRaw =
    status?.tokenExpiresAtUtc ??
    status?.TokenExpiresAtUtc ??
    status?.accessTokenExpiresAtUtc ??
    status?.AccessTokenExpiresAtUtc ??
    null;

  // Raw flags from backend
  const hasValidToken = status?.hasValidToken ?? status?.HasValidToken ?? false;

  const willExpireSoon =
    status?.willExpireSoon ??
    status?.WillExpireSoon ??
    status?.isExpiringSoon ??
    status?.IsExpiringSoon ??
    false;

  const debugMessage = status?.debug ?? status?.Debug ?? null;

  const isConfiguredViaEsu = !!hasEsuFlag;

  // Backend contract:
  //
  // - Healthy:        HasValidToken = true,  WillExpireSoon = false
  // - Expiring soon:  HasValidToken = false, WillExpireSoon = true
  // - Expired/invalid:HasValidToken = false, WillExpireSoon = false (expiry past or no token)

  // Fully healthy = ESU connected AND backend says token is valid
  const isFullyHealthy = isConfiguredViaEsu && hasValidToken;

  // Expiring soon = ESU connected, backend says "not valid" BUT explicitly marks WillExpireSoon
  const isTokenExpiringSoon =
    isConfiguredViaEsu && !hasValidToken && willExpireSoon;

  // Expired/invalid = ESU connected, backend says "not valid", not in 'expiring soon' bucket,
  // and we have some expiry timestamp recorded
  const isTokenExpiredOrInvalid =
    isConfiguredViaEsu &&
    !hasValidToken &&
    !willExpireSoon &&
    !!tokenExpiresAtRaw;

  const formattedExpiry = tokenExpiresAtRaw
    ? new Date(tokenExpiresAtRaw).toLocaleString()
    : null;

  // "Any integration present?" — drives soft disconnect enabling
  const hasAnyIntegrationState =
    isConfiguredViaEsu || hasValidToken || !!tokenExpiresAtRaw;

  // Base capabilities (without the "deletedThisSession" override)
  const canSoftDisconnectBase = hasBusinessContext && hasAnyIntegrationState;
  const canHardDeleteBase = hasBusinessContext;

  // Final capabilities (respect the "I just hard-deleted" state)
  const canSoftDisconnect = canSoftDisconnectBase && !deletedThisSession;
  const canHardDelete = canHardDeleteBase && !deletedThisSession;

  // ------- ESU: Start / Generate / Manage -------
  const startFacebookEsu = async () => {
    if (!hasBusinessContext) {
      toast.error("Workspace context is missing. Please log in again.");
      return;
    }

    if (deletedThisSession) {
      toast.info(
        "WhatsApp onboarding data was deleted in this session. Please refresh the page before starting a new connection."
      );
      return;
    }

    try {
      setConnectingEsu(true);

      const res = await axiosClient.post("esu/facebook/start", {
        returnUrlAfterSuccess: "/app/welcomepage",
      });

      const authUrl =
        res?.data?.data?.authUrl ||
        res?.data?.authUrl ||
        res?.data?.url ||
        res?.data?.Data?.AuthUrl;

      if (!authUrl) {
        toast.error(
          res?.data?.message || "Could not get Meta Embedded Signup URL."
        );
        return;
      }

      window.location.href = authUrl;
    } catch (err) {
      console.error("ESU start failed", err);
      toast.error("Failed to start Meta Embedded Signup.");
    } finally {
      setConnectingEsu(false);
    }
  };

  // ------- Disconnect (soft) – open confirmation modal -------
  const openDisconnectModal = () => {
    if (!hasBusinessContext) {
      toast.error("Workspace context is missing. Please re-login.");
      return;
    }

    if (!canSoftDisconnect) {
      toast.info(
        "No active WhatsApp Business API connection is configured for this account."
      );
      return;
    }

    setShowDisconnectModal(true);
  };

  const closeDisconnectModal = () => {
    if (!disconnectLoading) {
      setShowDisconnectModal(false);
    }
  };

  // ------- Disconnect (soft) – confirm in modal -------
  const confirmDisconnect = async () => {
    if (!hasBusinessContext) {
      toast.error("Workspace context is missing. Please re-login.");
      return;
    }

    if (!hasAnyIntegrationState || deletedThisSession) {
      toast.info(
        "No active WhatsApp Business API connection is configured for this account."
      );
      setShowDisconnectModal(false);
      return;
    }

    try {
      setLoading(true);
      setDisconnectLoading(true);

      const res = await axiosClient.delete("esu/facebook/disconnect");

      if (res?.data?.ok ?? true) {
        toast.success("WhatsApp was disconnected for this account.");
        setDisconnectedThisSession(true);
        setShowDisconnectModal(false);
      } else {
        toast.error(
          res?.data?.message ||
            "Failed to disconnect. Please check logs or contact support."
        );
      }

      await loadStatus();
    } catch (err) {
      console.error("Disconnect failed", err);
      const message =
        err?.response?.data?.message ||
        "Failed to disconnect. Please check logs or contact support.";
      toast.error(message);
    } finally {
      setLoading(false);
      setDisconnectLoading(false);
    }
  };

  // ------- Deauthorize (debug) -------
  const handleDeauthorize = async () => {
    if (!hasBusinessContext) {
      toast.error("Workspace context is missing. Please re-login.");
      return;
    }

    if (deletedThisSession) {
      toast.info("WhatsApp onboarding data has already been deleted.");
      return;
    }

    try {
      setLoading(true);
      await axiosClient.post("esu/facebook/debug/deauthorize");
      toast.success("Local deauthorization complete (debug / internal).");
      await loadStatus();
    } catch (err) {
      console.error("Deauthorize failed", err);
      toast.error("Deauthorize failed or endpoint is disabled.");
    } finally {
      setLoading(false);
    }
  };

  // ------- Hard delete: modal + action -------
  const openDeleteModal = () => {
    if (!hasBusinessContext) {
      toast.error("Business context is missing. Please re-login.");
      return;
    }

    if (deletedThisSession) {
      toast.info(
        "WhatsApp onboarding data for this account has already been deleted in this session."
      );
      return;
    }

    setDeleteConfirmChecked(false);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (!deleteLoading) {
      setShowDeleteModal(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!hasBusinessContext) {
      toast.error("Workspace context is missing. Please re-login.");
      return;
    }
    if (!deleteConfirmChecked) {
      return;
    }

    try {
      setDeleteLoading(true);

      // Use your configured hard-delete endpoint
      const res = await axiosClient.delete(
        "esu/facebook/hard-delete-full-account"
      );

      if (res?.data?.ok) {
        toast.success(
          "Meta WhatsApp onboarding configuration and related data have been deleted for this account."
        );
        setShowDeleteModal(false);

        // From this point in this session, treat as fully wiped
        setDeletedThisSession(true);
        setShowDeleteSuccessModal(true);

        await loadStatus();
      } else {
        toast.error(
          res?.data?.message ||
            "Failed to delete WhatsApp data. Please contact support."
        );
      }
    } catch (err) {
      console.error("Hard delete failed", err);
      const message =
        err?.response?.data?.message ||
        "Failed to delete WhatsApp data. Please contact support.";
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ------- Status Panel -------
  const renderStatusPanel = () => {
    const isConfigured = isConfiguredViaEsu && !deletedThisSession;
    const borderClass = isConfigured
      ? "border-l-emerald-500"
      : "border-l-rose-500";
    const headerBg = isConfigured
      ? "bg-emerald-50 border-b border-emerald-100"
      : "bg-rose-50 border-b border-rose-100";
    const titleColor = isConfigured ? "text-emerald-700" : "text-rose-700";
    const dotColor = isConfigured ? "bg-emerald-500" : "bg-rose-500";

    let primaryLabel = "Connect via Facebook";

    // Connected: manage / generate token
    if (
      !deletedThisSession &&
      isConfigured &&
      (isTokenExpiredOrInvalid || isTokenExpiringSoon)
    ) {
      primaryLabel = "Generate Token";
    } else if (!deletedThisSession && isConfigured) {
      primaryLabel = "Manage Connection";
    }
    // Disconnected in this session but not deleted: show "Reconnect"
    else if (!deletedThisSession && !isConfigured && disconnectedThisSession) {
      primaryLabel = "Reconnect via Facebook";
    }

    return (
      <div
        className={`mb-8 rounded-2xl shadow-sm border-l-8 ${borderClass} bg-gradient-to-br from-white to-slate-50`}
      >
        <div className={`rounded-t-2xl px-5 py-3 ${headerBg}`}>
          <div className="text-xs uppercase tracking-wide font-semibold text-slate-500">
            Connection Status
          </div>
        </div>

        <div className="p-5 flex flex-col gap-2">
          {statusLoading ? (
            <div className="h-4 w-40 bg-slate-100 rounded animate-pulse mt-1" />
          ) : (
            <>
              <div
                className={`inline-flex items-center gap-2 text-base font-semibold ${titleColor}`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                {isConfigured && !deletedThisSession
                  ? "Connected via Meta Embedded Signup"
                  : "Not connected"}
              </div>

              {!isConfigured && (
                <div className="text-sm text-slate-600">
                  WhatsApp Business Account <strong>disconnected</strong>. No
                  active Meta Embedded Signup connection is configured for this
                  business.
                </div>
              )}

              {isConfigured && !deletedThisSession && (
                <>
                  {isFullyHealthy && (
                    <div className="text-sm text-slate-600">
                      WhatsApp API is configured and active for this account.
                    </div>
                  )}

                  {isTokenExpiredOrInvalid && (
                    <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-md mt-1">
                      <span className="font-semibold">Token expired:</span> Your
                      Meta access token is no longer valid. Click{" "}
                      <span className="font-semibold">“Generate Token”</span>{" "}
                      below to create a new long-lived token via Meta.
                    </div>
                  )}

                  {isTokenExpiringSoon && (
                    <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md mt-1">
                      Your Meta access token will expire soon. Use{" "}
                      <span className="font-semibold">“Generate Token”</span> to
                      renew it before expiry.
                    </div>
                  )}

                  {formattedExpiry && (
                    <div className="text-xs text-slate-500">
                      Token expiry: {formattedExpiry}
                    </div>
                  )}
                </>
              )}

              {(isDev || hasAllAccess) &&
                (debugMessage ||
                  typeof hasEsuFlag === "boolean" ||
                  typeof hasValidToken === "boolean") && (
                  <div className="text-[10px] text-slate-500 mt-1">
                    {debugMessage && <div>Debug: {debugMessage}</div>}
                    <div>HasEsuFlag: {String(hasEsuFlag)}</div>
                    <div>HasValidToken: {String(hasValidToken)}</div>
                  </div>
                )}

              {/* Primary action */}
              <div className="mt-3 flex flex-wrap gap-2 flex-col sm:flex-row">
                <button
                  type="button"
                  onClick={startFacebookEsu}
                  disabled={
                    connectingEsu || !hasBusinessContext || deletedThisSession
                  }
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {connectingEsu ? "Opening Embedded Signup…" : primaryLabel}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // ------- Render -------
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-emerald-800 mb-2">
        Meta Account Management
      </h1>
      <p className="text-sm text-slate-600 mb-6">
        Control how this account is connected to Meta&apos;s WhatsApp Business
        Platform. Use these options to connect or disconnect safely, review how
        data deletion is handled, and (for internal admins) trigger local
        deauthorization.
      </p>

      {renderStatusPanel()}

      <div className="space-y-6">
        {/* Soft disconnect */}
        <button
          type="button"
          onClick={openDisconnectModal}
          disabled={loading || !canSoftDisconnect}
          className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition bg-white border-emerald-200 ${
            loading || !canSoftDisconnect
              ? "opacity-60 cursor-not-allowed"
              : "hover:shadow-md"
          }`}
        >
          <div className="p-2 rounded-md bg-emerald-50 text-emerald-700">
            <ShieldAlert size={20} />
          </div>
          <div>
            <div className="font-semibold text-emerald-800">
              Disconnect WhatsApp Business API Account
            </div>
            <div className="text-sm text-slate-600">
              {canSoftDisconnect
                ? "Temporarily disconnects this account from Meta Cloud. You can reconnect later without repeating full onboarding."
                : "No active WhatsApp Business API integration is connected for this account."}
            </div>
          </div>
        </button>

        {/* Debug-only deauthorize */}
        {(isDev || hasAllAccess) && (
          <button
            type="button"
            onClick={handleDeauthorize}
            disabled={loading || !hasBusinessContext || deletedThisSession}
            className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition bg-white border-yellow-200 ${
              loading || !hasBusinessContext || deletedThisSession
                ? "opacity-60 cursor-not-allowed"
                : "hover:shadow-md"
            }`}
          >
            <div className="p-2 rounded-md bg-yellow-50 text-yellow-700">
              <RefreshCw size={20} />
            </div>
            <div>
              <div className="font-semibold text-yellow-800">
                Deauthorize (Local Debug)
              </div>
              <div className="text-sm text-slate-600">
                Clears ESU flags and stored tokens locally for this account.
                Intended for internal debugging only.
              </div>
            </div>
          </button>
        )}

        {/* Hard delete CTA */}
        <button
          type="button"
          onClick={openDeleteModal}
          disabled={!canHardDelete}
          className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition bg-white border-rose-300 ${
            !canHardDelete ? "opacity-60 cursor-not-allowed" : "hover:shadow-md"
          }`}
        >
          <div className="p-2 rounded-md bg-rose-50 text-rose-700">
            <Trash2 size={20} />
          </div>
          <div>
            <div className="font-semibold text-rose-800">
              Delete my account and WhatsApp data
            </div>
            <div className="text-sm text-slate-600">
              {canHardDelete
                ? "Permanently disconnects your Meta WhatsApp integration and deletes related onboarding configuration for this account. This cannot be undone."
                : "No Meta WhatsApp integration or onboarding data exists for this account, or it has already been deleted in this session."}
            </div>
          </div>
        </button>
      </div>

      {/* Disconnect confirmation modal */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              Disconnect WhatsApp Business API?
            </h2>
            <p className="text-sm text-black-700 mb-3">
              Disconnecting will temporarily stop this account from using
              WhatsApp Business Api.
            </p>
            <p className="text-sm text-slate-700 mb-2">This means:</p>
            <ul className="list-disc list-inside text-sm text-slate-700 mb-3">
              <li>
                New messages and campaigns will not be sent via Meta Cloud.
              </li>
              <li>
                Any automations or flows that depend on this connection will
                pause until you reconnect.
              </li>
              <li>
                Your onboarding configuration stays stored, so you can reconnect
                from this page without repeating full signup.
              </li>
            </ul>
            <p className="text-xs text-slate-500 mb-4">
              This action does <span className="font-semibold">not</span> delete
              your WhatsApp data or message history. You can reconnect at any
              time.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDisconnectModal}
                disabled={disconnectLoading}
                className="px-3 py-2 rounded-md text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDisconnect}
                disabled={disconnectLoading}
                className="px-4 py-2 rounded-md text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {disconnectLoading ? "Disconnecting…" : "Disconnect now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-rose-700 mb-2">
              Permanently delete WhatsApp integration?
            </h2>
            <p className="text-sm text-slate-700 mb-3">This will:</p>
            <ul className="list-disc list-inside text-sm text-slate-700 mb-3">
              <li>Disconnect your WhatsApp Business API integration.</li>
              <li>Revoke Meta ESU / access tokens.</li>
              <li>
                Delete stored WhatsApp onboarding settings (WABA, numbers, API
                keys, webhooks etc.) for this account.
              </li>
            </ul>
            <p className="text-xs text-rose-700 font-medium mb-3">
              This action is permanent and cannot be undone.
            </p>

            <label className="flex items-start gap-2 mb-4">
              <input
                type="checkbox"
                className="mt-1"
                checked={deleteConfirmChecked}
                onChange={e => setDeleteConfirmChecked(e.target.checked)}
                disabled={deleteLoading}
              />
              <span className="text-xs text-slate-700">
                I understand that my WhatsApp integration and related onboarding
                data for this account will be deleted permanently and cannot be
                recovered.
              </span>
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleteLoading}
                className="px-3 py-2 rounded-md text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePermanentDelete}
                disabled={!deleteConfirmChecked || deleteLoading}
                className="px-4 py-2 rounded-md text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-delete success modal */}
      {showDeleteSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              WhatsApp data deleted successfully.
            </h2>
            <p className="text-sm text-slate-700 mb-3">
              WhatsApp onboarding configuration and related access tokens for
              this account have been deleted successfully.
            </p>
            <p className="text-xs text-slate-500 mb-4">
              This cleanup is permanent and cannot be undone. If you want to use
              WhatsApp Business API again, you can create a fresh connection
              later.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteSuccessModal(false)}
                className="px-4 py-2 rounded-md text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <button
          type="button"
          onClick={() => nav("/app/settings")}
          className="text-sm text-emerald-700 hover:underline"
        >
          ← Back to Settings
        </button>
      </div>
    </div>
  );
}

// // 📄 src/pages/MetaAccount/MetaAccountManagement.jsx

// import React, { useEffect, useState, useMemo } from "react";
// import { useNavigate } from "react-router-dom";
// import axiosClient from "../../api/axiosClient";
// import { toast } from "react-toastify";
// import { useAuth } from "../../app/providers/AuthProvider";
// import { ShieldAlert, Trash2, RefreshCw } from "lucide-react";

// // --- JWT businessId helper (aligned with ClaimsBusinessDetails) ---
// const TOKEN_KEY = "xbyte_token";
// const GUID_RE =
//   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// function getBusinessIdFromJwt() {
//   try {
//     const jwt = localStorage.getItem(TOKEN_KEY);
//     if (!jwt) return null;

//     const [, payloadB64] = jwt.split(".");
//     if (!payloadB64) return null;

//     const payload = JSON.parse(
//       atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
//     );

//     const bid = payload?.businessId || payload?.BusinessId || null;

//     return typeof bid === "string" && GUID_RE.test(bid) ? bid : null;
//   } catch {
//     return null;
//   }
// }

// export default function MetaAccountManagement() {
//   const { business, hasAllAccess } = useAuth();
//   const nav = useNavigate();

//   const [loading, setLoading] = useState(false);
//   const [connectingEsu, setConnectingEsu] = useState(false);
//   const [statusLoading, setStatusLoading] = useState(true);
//   const [status, setStatus] = useState(null);

//   const [showDeleteModal, setShowDeleteModal] = useState(false);
//   const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
//   const [deleteLoading, setDeleteLoading] = useState(false);

//   // after a successful hard-delete in THIS session, we freeze all actions
//   const [deletedThisSession, setDeletedThisSession] = useState(false);
//   const [disconnectedThisSession, setDisconnectedThisSession] = useState(false);
//   const isDev = process.env.NODE_ENV === "development";

//   // Prefer AuthProvider if present, otherwise JWT claim
//   const authBusinessId =
//     business?.id || business?.businessId || business?.BusinessId || null;

//   const jwtBusinessId = useMemo(getBusinessIdFromJwt, []);
//   const effectiveBusinessId = authBusinessId || jwtBusinessId;
//   const hasBusinessContext = !!effectiveBusinessId;

//   // ------- Load ESU status (JWT-based) -------
//   const loadStatus = async () => {
//     try {
//       setStatusLoading(true);

//       // Backend: GET /api/esu/facebook/status uses JWT to resolve businessId
//       const res = await axiosClient.get("esu/facebook/status");
//       const payload = res?.data ?? null;
//       const data = payload?.data || payload?.Data || payload;

//       setStatus(data || null);
//     } catch (err) {
//       console.error("Failed to load ESU status", err);
//       setStatus(null);
//     } finally {
//       setStatusLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadStatus();
//   }, []);

//   // ------- Normalized status -------
//   const hasEsuFlag = status?.hasEsuFlag ?? status?.HasEsuFlag ?? false;

//   const tokenExpiresAtRaw =
//     status?.tokenExpiresAtUtc ??
//     status?.TokenExpiresAtUtc ??
//     status?.accessTokenExpiresAtUtc ??
//     status?.AccessTokenExpiresAtUtc ??
//     null;

//   // Raw flags from backend
//   const hasValidToken = status?.hasValidToken ?? status?.HasValidToken ?? false;

//   const willExpireSoon =
//     status?.willExpireSoon ??
//     status?.WillExpireSoon ??
//     status?.isExpiringSoon ??
//     status?.IsExpiringSoon ??
//     false;

//   const debugMessage = status?.debug ?? status?.Debug ?? null;

//   const isConfiguredViaEsu = !!hasEsuFlag;

//   // Backend contract:
//   //
//   // - Healthy:        HasValidToken = true,  WillExpireSoon = false
//   // - Expiring soon:  HasValidToken = false, WillExpireSoon = true
//   // - Expired/invalid:HasValidToken = false, WillExpireSoon = false (expiry past or no token)

//   // Fully healthy = ESU connected AND backend says token is valid
//   const isFullyHealthy = isConfiguredViaEsu && hasValidToken;

//   // Expiring soon = ESU connected, backend says "not valid" BUT explicitly marks WillExpireSoon
//   const isTokenExpiringSoon =
//     isConfiguredViaEsu && !hasValidToken && willExpireSoon;

//   // Expired/invalid = ESU connected, backend says "not valid", not in 'expiring soon' bucket,
//   // and we have some expiry timestamp recorded
//   const isTokenExpiredOrInvalid =
//     isConfiguredViaEsu &&
//     !hasValidToken &&
//     !willExpireSoon &&
//     !!tokenExpiresAtRaw;

//   const formattedExpiry = tokenExpiresAtRaw
//     ? new Date(tokenExpiresAtRaw).toLocaleString()
//     : null;

//   // "Any integration present?" — drives soft disconnect enabling
//   const hasAnyIntegrationState =
//     isConfiguredViaEsu || hasValidToken || !!tokenExpiresAtRaw;

//   // Base capabilities (without the "deletedThisSession" override)
//   const canSoftDisconnectBase = hasBusinessContext && hasAnyIntegrationState;
//   const canHardDeleteBase = hasBusinessContext;

//   // Final capabilities (respect the "I just hard-deleted" state)
//   const canSoftDisconnect = canSoftDisconnectBase && !deletedThisSession;
//   const canHardDelete = canHardDeleteBase && !deletedThisSession;

//   // ------- ESU: Start / Generate / Manage -------
//   const startFacebookEsu = async () => {
//     if (!hasBusinessContext) {
//       toast.error("Workspace context missing. Please log in again.");
//       return;
//     }

//     try {
//       setConnectingEsu(true);

//       const res = await axiosClient.post("esu/facebook/start", {
//         returnUrlAfterSuccess: "/app/settings/whatsapp",
//       });

//       const authUrl =
//         res?.data?.data?.authUrl ||
//         res?.data?.authUrl ||
//         res?.data?.url ||
//         res?.data?.Data?.AuthUrl;

//       if (!authUrl) {
//         toast.error(
//           res?.data?.message || "Could not get Meta Embedded Signup URL."
//         );
//         return;
//       }

//       window.location.href = authUrl;
//     } catch (err) {
//       console.error("ESU start failed", err);
//       toast.error("Failed to start Meta Embedded Signup.");
//     } finally {
//       setConnectingEsu(false);
//     }
//   };

//   // ------- Disconnect (soft) -------
//   const handleDisconnect = async () => {
//     if (!hasBusinessContext) {
//       toast.error("Workspace context missing. Please re-login.");
//       return;
//     }

//     // If no integration state, treat as no-op with clear UX
//     if (!hasAnyIntegrationState || deletedThisSession) {
//       toast.info(
//         "No active WhatsApp Business API connection found for this account."
//       );
//       return;
//     }

//     try {
//       setLoading(true);
//       const res = await axiosClient.delete("esu/facebook/disconnect");

//       // if (res?.data?.ok ?? true) {
//       //   toast.success("WhatsApp disconnected successfully for this account.");
//       // } else {
//       //   toast.error(
//       //     res?.data?.message ||
//       //       "Failed to disconnect. Please check logs or contact support."
//       //   );
//       // }

//       // await loadStatus();
//       if (res?.data?.ok ?? true) {
//         toast.success("WhatsApp disconnected successfully for this account.");
//         setDisconnectedThisSession(true); // 👈 remember that we disconnected
//       } else {
//         toast.error(
//           res?.data?.message ||
//             "Failed to disconnect. Please check logs or contact support."
//         );
//       }

//       await loadStatus();
//     } catch (err) {
//       console.error("Disconnect failed", err);
//       const message =
//         err?.response?.data?.message ||
//         "Failed to disconnect. Please check logs or contact support.";
//       toast.error(message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ------- Deauthorize (debug) -------
//   const handleDeauthorize = async () => {
//     if (!hasBusinessContext) {
//       toast.error("Workspace context missing. Please re-login.");
//       return;
//     }

//     if (deletedThisSession) {
//       toast.info("WhatsApp onboarding data has already been deleted.");
//       return;
//     }

//     try {
//       setLoading(true);
//       await axiosClient.post("esu/facebook/debug/deauthorize");
//       toast.success("Local deauthorization complete (debug/internal).");
//       await loadStatus();
//     } catch (err) {
//       console.error("Deauthorize failed", err);
//       toast.error("Deauthorize failed or endpoint disabled.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ------- Hard delete: modal + action -------
//   const openDeleteModal = () => {
//     if (!hasBusinessContext) {
//       toast.error("Business context missing. Please re-login.");
//       return;
//     }

//     if (deletedThisSession) {
//       toast.info(
//         "WhatsApp onboarding data for this account has already been deleted in this session."
//       );
//       return;
//     }

//     setDeleteConfirmChecked(false);
//     setShowDeleteModal(true);
//   };

//   const closeDeleteModal = () => {
//     if (!deleteLoading) {
//       setShowDeleteModal(false);
//     }
//   };

//   const handlePermanentDelete = async () => {
//     if (!hasBusinessContext) {
//       toast.error("Workspace context missing. Please re-login.");
//       return;
//     }
//     if (!deleteConfirmChecked) {
//       return;
//     }

//     try {
//       setDeleteLoading(true);

//       // Use your configured hard-delete endpoint
//       const res = await axiosClient.delete(
//         "esu/facebook/hard-delete-full-account"
//       );

//       if (res?.data?.ok) {
//         toast.success(
//           "Meta WhatsApp onboarding configuration and related data have been deleted for this account."
//         );
//         setShowDeleteModal(false);

//         // From this point in this session, treat as fully wiped
//         setDeletedThisSession(true);

//         await loadStatus();
//       } else {
//         toast.error(
//           res?.data?.message ||
//             "Failed to delete WhatsApp data. Please contact support."
//         );
//       }
//     } catch (err) {
//       console.error("Hard delete failed", err);
//       const message =
//         err?.response?.data?.message ||
//         "Failed to delete WhatsApp data. Please contact support.";
//       toast.error(message);
//     } finally {
//       setDeleteLoading(false);
//     }
//   };

//   // ------- Status Panel -------
//   const renderStatusPanel = () => {
//     const isConfigured = isConfiguredViaEsu && !deletedThisSession;
//     const borderClass = isConfigured
//       ? "border-l-emerald-500"
//       : "border-l-rose-500";
//     const headerBg = isConfigured
//       ? "bg-emerald-50 border-b border-emerald-100"
//       : "bg-rose-50 border-b border-rose-100";
//     const titleColor = isConfigured ? "text-emerald-700" : "text-rose-700";
//     const dotColor = isConfigured ? "bg-emerald-500" : "bg-rose-500";

//     // let primaryLabel = "Connect via Facebook";
//     // if (
//     //   !deletedThisSession &&
//     //   isConfigured &&
//     //   (isTokenExpiredOrInvalid || isTokenExpiringSoon)
//     // ) {
//     //   primaryLabel = "Generate Token";
//     // } else if (!deletedThisSession && isConfigured) {
//     //   primaryLabel = "Manage Connection";
//     // }
//     let primaryLabel = "Connect via Facebook";

//     // Connected: manage / generate token
//     if (
//       !deletedThisSession &&
//       isConfigured &&
//       (isTokenExpiredOrInvalid || isTokenExpiringSoon)
//     ) {
//       primaryLabel = "Generate Token";
//     } else if (!deletedThisSession && isConfigured) {
//       primaryLabel = "Manage Connection";
//     }
//     // Disconnected in this session but not deleted: show "Reconnect"
//     else if (!deletedThisSession && !isConfigured && disconnectedThisSession) {
//       primaryLabel = "Reconnect via Facebook";
//     }

//     return (
//       <div
//         className={`mb-8 rounded-2xl shadow-sm border-l-8 ${borderClass} bg-gradient-to-br from-white to-slate-50`}
//       >
//         <div className={`rounded-t-2xl px-5 py-3 ${headerBg}`}>
//           <div className="text-xs uppercase tracking-wide font-semibold text-slate-500">
//             Connection Status
//           </div>
//         </div>

//         <div className="p-5 flex flex-col gap-2">
//           {statusLoading ? (
//             <div className="h-4 w-40 bg-slate-100 rounded animate-pulse mt-1" />
//           ) : (
//             <>
//               <div
//                 className={`inline-flex items-center gap-2 text-base font-semibold ${titleColor}`}
//               >
//                 <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
//                 {isConfigured && !deletedThisSession
//                   ? "Connected via Meta Embedded Signup"
//                   : "Not connected"}
//               </div>

//               {!isConfigured && (
//                 <div className="text-sm text-slate-600">
//                   WhatsApp Business Account <strong>disconnected</strong>. No
//                   active Meta Embedded Signup connection is configured for this
//                   business.
//                 </div>
//               )}

//               {isConfigured && !deletedThisSession && (
//                 <>
//                   {isFullyHealthy && (
//                     <div className="text-sm text-slate-600">
//                       WhatsApp API is configured and active for this account.
//                     </div>
//                   )}

//                   {isTokenExpiredOrInvalid && (
//                     <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-md mt-1">
//                       <span className="font-semibold">Token expired:</span> Your
//                       Meta access token is no longer valid. Click{" "}
//                       <span className="font-semibold">“Generate Token”</span>{" "}
//                       below to create a new long-lived token via Meta.
//                     </div>
//                   )}

//                   {isTokenExpiringSoon && (
//                     <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md mt-1">
//                       Your Meta access token will expire soon. Use{" "}
//                       <span className="font-semibold">“Generate Token”</span> to
//                       renew it before expiry.
//                     </div>
//                   )}

//                   {formattedExpiry && (
//                     <div className="text-xs text-slate-500">
//                       Token expiry: {formattedExpiry}
//                     </div>
//                   )}
//                 </>
//               )}

//               {(isDev || hasAllAccess) &&
//                 (debugMessage ||
//                   typeof hasEsuFlag === "boolean" ||
//                   typeof hasValidToken === "boolean") && (
//                   <div className="text-[10px] text-slate-500 mt-1">
//                     {debugMessage && <div>Debug: {debugMessage}</div>}
//                     <div>HasEsuFlag: {String(hasEsuFlag)}</div>
//                     <div>HasValidToken: {String(hasValidToken)}</div>
//                   </div>
//                 )}

//               {/* Primary action */}
//               <div className="mt-3 flex flex-wrap gap-2 flex-col sm:flex-row">
//                 <button
//                   type="button"
//                   onClick={startFacebookEsu}
//                   disabled={
//                     connectingEsu || !hasBusinessContext || deletedThisSession
//                   }
//                   className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
//                 >
//                   {connectingEsu ? "Opening Embedded Signup…" : primaryLabel}
//                 </button>
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     );
//   };

//   // ------- Render -------
//   return (
//     <div className="p-6 max-w-3xl mx-auto">
//       <h1 className="text-2xl font-bold text-emerald-800 mb-2">
//         Meta Account Management
//       </h1>
//       <p className="text-sm text-slate-600 mb-6">
//         Control how this account is connected to Meta&apos;s WhatsApp Business
//         Platform. Use these options to connect or disconnect safely, review how
//         data deletion is handled, and (for internal admins) trigger local
//         deauthorization.
//       </p>

//       {renderStatusPanel()}

//       <div className="space-y-6">
//         {/* Soft disconnect */}
//         <button
//           type="button"
//           onClick={handleDisconnect}
//           disabled={loading || !canSoftDisconnect}
//           className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition bg-white border-emerald-200 ${
//             loading || !canSoftDisconnect
//               ? "opacity-60 cursor-not-allowed"
//               : "hover:shadow-md"
//           }`}
//         >
//           <div className="p-2 rounded-md bg-emerald-50 text-emerald-700">
//             <ShieldAlert size={20} />
//           </div>
//           <div>
//             <div className="font-semibold text-emerald-800">
//               Disconnect WhatsApp Business API Account
//             </div>
//             <div className="text-sm text-slate-600">
//               {canSoftDisconnect
//                 ? "Runs the full disconnect pipeline for this account: best-effort revoke at Meta, local token/flag cleanup, and deactivation of WhatsApp sending."
//                 : "No active WhatsApp Business API integration is connected for this account."}
//             </div>
//           </div>
//         </button>

//         {/* Debug-only deauthorize */}
//         {(isDev || hasAllAccess) && (
//           <button
//             type="button"
//             onClick={handleDeauthorize}
//             disabled={loading || !hasBusinessContext || deletedThisSession}
//             className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition bg-white border-yellow-200 ${
//               loading || !hasBusinessContext || deletedThisSession
//                 ? "opacity-60 cursor-not-allowed"
//                 : "hover:shadow-md"
//             }`}
//           >
//             <div className="p-2 rounded-md bg-yellow-50 text-yellow-700">
//               <RefreshCw size={20} />
//             </div>
//             <div>
//               <div className="font-semibold text-yellow-800">
//                 Deauthorize (Local Debug)
//               </div>
//               <div className="text-sm text-slate-600">
//                 Clears ESU flags and stored tokens locally for this account.
//               </div>
//             </div>
//           </button>
//         )}

//         {/* Hard delete CTA */}
//         <button
//           type="button"
//           onClick={openDeleteModal}
//           disabled={!canHardDelete}
//           className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition bg-white border-rose-300 ${
//             !canHardDelete ? "opacity-60 cursor-not-allowed" : "hover:shadow-md"
//           }`}
//         >
//           <div className="p-2 rounded-md bg-rose-50 text-rose-700">
//             <Trash2 size={20} />
//           </div>
//           <div>
//             <div className="font-semibold text-rose-800">
//               Delete my account and WhatsApp data
//             </div>
//             <div className="text-sm text-slate-600">
//               {canHardDelete
//                 ? "Permanently disconnect your Meta WhatsApp integration and delete related onboarding configuration for this account. This cannot be undone."
//                 : "No Meta WhatsApp integration or onboarding data exists for this account, or it has already been deleted in this session."}
//             </div>
//           </div>
//         </button>
//       </div>

//       {/* Delete confirmation modal */}
//       {showDeleteModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
//           <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
//             <h2 className="text-lg font-semibold text-rose-700 mb-2">
//               Permanently delete WhatsApp integration?
//             </h2>
//             <p className="text-sm text-slate-700 mb-3">This will:</p>
//             <ul className="list-disc list-inside text-sm text-slate-700 mb-3">
//               <li>Disconnect your WhatsApp Business API integration.</li>
//               <li>Revoke Meta ESU / access tokens.</li>
//               <li>
//                 Delete stored Meta WhatsApp onboarding settings (WABA, numbers,
//                 API keys, webhooks) for this account.
//               </li>
//             </ul>
//             <p className="text-xs text-rose-700 font-medium mb-3">
//               This action is permanent and cannot be undone.
//             </p>

//             <label className="flex items-start gap-2 mb-4">
//               <input
//                 type="checkbox"
//                 className="mt-1"
//                 checked={deleteConfirmChecked}
//                 onChange={e => setDeleteConfirmChecked(e.target.checked)}
//                 disabled={deleteLoading}
//               />
//               <span className="text-xs text-slate-700">
//                 I understand that my Meta WhatsApp integration and related
//                 onboarding data for this account will be deleted permanently and
//                 cannot be recovered.
//               </span>
//             </label>

//             <div className="flex justify-end gap-2">
//               <button
//                 type="button"
//                 onClick={closeDeleteModal}
//                 disabled={deleteLoading}
//                 className="px-3 py-2 rounded-md text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
//               >
//                 Cancel
//               </button>
//               <button
//                 type="button"
//                 onClick={handlePermanentDelete}
//                 disabled={!deleteConfirmChecked || deleteLoading}
//                 className="px-4 py-2 rounded-md text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
//               >
//                 {deleteLoading ? "Deleting..." : "Delete permanently"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       <div className="mt-8">
//         <button
//           type="button"
//           onClick={() => nav("/app/settings")}
//           className="text-sm text-emerald-700 hover:underline"
//         >
//           ← Back to Settings
//         </button>
//       </div>
//     </div>
//   );
// }

// // // 📄 src/pages/MetaAccount/MetaAccountManagement.jsx

// import React, { useEffect, useState, useMemo } from "react";
// import { useNavigate } from "react-router-dom";
// import axiosClient from "../../api/axiosClient";
// import { toast } from "react-toastify";
// import { useAuth } from "../../app/providers/AuthProvider";
// import { ShieldAlert, Trash2, RefreshCw } from "lucide-react";

// // --- JWT businessId helper (aligned with ClaimsBusinessDetails) ---
// const TOKEN_KEY = "xbyte_token";
// const GUID_RE =
//   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// function getBusinessIdFromJwt() {
//   try {
//     const jwt = localStorage.getItem(TOKEN_KEY);
//     if (!jwt) return null;

//     const [, payloadB64] = jwt.split(".");
//     if (!payloadB64) return null;

//     const payload = JSON.parse(
//       atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
//     );

//     const bid = payload?.businessId || payload?.BusinessId || null;

//     return typeof bid === "string" && GUID_RE.test(bid) ? bid : null;
//   } catch {
//     return null;
//   }
// }

// export default function MetaAccountManagement() {
//   const { business, hasAllAccess } = useAuth();
//   const nav = useNavigate();

//   const [loading, setLoading] = useState(false);
//   const [connectingEsu, setConnectingEsu] = useState(false);
//   const [statusLoading, setStatusLoading] = useState(true);
//   const [status, setStatus] = useState(null);

//   const [showDeleteModal, setShowDeleteModal] = useState(false);
//   const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
//   const [deleteLoading, setDeleteLoading] = useState(false);

//   const isDev = process.env.NODE_ENV === "development";

//   // Prefer AuthProvider if present, otherwise JWT claim
//   const authBusinessId =
//     business?.id || business?.businessId || business?.BusinessId || null;

//   const jwtBusinessId = useMemo(getBusinessIdFromJwt, []);
//   const effectiveBusinessId = authBusinessId || jwtBusinessId;
//   const hasBusinessContext = !!effectiveBusinessId;

//   // ------- Load ESU status (JWT-based) -------
//   const loadStatus = async () => {
//     try {
//       setStatusLoading(true);

//       // Backend: GET /api/esu/facebook/status uses JWT to resolve businessId
//       const res = await axiosClient.get("esu/facebook/status");
//       const payload = res?.data ?? null;
//       const data = payload?.data || payload?.Data || payload;

//       setStatus(data || null);
//     } catch (err) {
//       console.error("Failed to load ESU status", err);
//       setStatus(null);
//     } finally {
//       setStatusLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadStatus();
//   }, []);

//   // ------- Normalized status -------
//   const hasEsuFlag = status?.hasEsuFlag ?? status?.HasEsuFlag ?? false;

//   const tokenExpiresAtRaw =
//     status?.tokenExpiresAtUtc ??
//     status?.TokenExpiresAtUtc ??
//     status?.accessTokenExpiresAtUtc ??
//     status?.AccessTokenExpiresAtUtc ??
//     null;

//   // const hasValidToken =
//   //   status?.hasValidToken ??
//   //   status?.HasValidToken ??
//   //   (tokenExpiresAtRaw ? true : false);

//   // const willExpireSoon =
//   //   status?.willExpireSoon ??
//   //   status?.WillExpireSoon ??
//   //   status?.isExpiringSoon ??
//   //   status?.IsExpiringSoon ??
//   //   false;

//   // const debugMessage = status?.debug ?? status?.Debug ?? null;

//   // const isConfiguredViaEsu = !!hasEsuFlag;
//   // const isTokenExpiredOrInvalid = isConfiguredViaEsu && !hasValidToken;
//   // const isTokenExpiringSoon = !!hasValidToken && willExpireSoon;
//   // const isFullyHealthy = isConfiguredViaEsu && hasValidToken && !willExpireSoon;

//   // Raw flags from backend
//   const hasValidToken = status?.hasValidToken ?? status?.HasValidToken ?? false;

//   const willExpireSoon =
//     status?.willExpireSoon ??
//     status?.WillExpireSoon ??
//     status?.isExpiringSoon ??
//     status?.IsExpiringSoon ??
//     false;

//   const debugMessage = status?.debug ?? status?.Debug ?? null;

//   const isConfiguredViaEsu = !!hasEsuFlag;

//   // Backend contract:
//   //
//   // - Healthy:        HasValidToken = true,  WillExpireSoon = false
//   // - Expiring soon:  HasValidToken = false, WillExpireSoon = true
//   // - Expired/invalid:HasValidToken = false, WillExpireSoon = false (expiry past or no token)

//   // Fully healthy = ESU connected AND backend says token is valid
//   const isFullyHealthy = isConfiguredViaEsu && hasValidToken;

//   // Expiring soon = ESU connected, backend says "not valid" BUT explicitly marks WillExpireSoon
//   const isTokenExpiringSoon =
//     isConfiguredViaEsu && !hasValidToken && willExpireSoon;

//   // Expired/invalid = ESU connected, backend says "not valid", not in 'expiring soon' bucket,
//   // and we have some expiry timestamp recorded
//   const isTokenExpiredOrInvalid =
//     isConfiguredViaEsu &&
//     !hasValidToken &&
//     !willExpireSoon &&
//     !!tokenExpiresAtRaw;

//   const formattedExpiry = tokenExpiresAtRaw
//     ? new Date(tokenExpiresAtRaw).toLocaleString()
//     : null;

//   // "Any integration present?" — drives button enabling
//   const hasAnyIntegrationState =
//     isConfiguredViaEsu || hasValidToken || !!tokenExpiresAtRaw;

//   // const canSoftDisconnect = hasBusinessContext && hasAnyIntegrationState;
//   // const canHardDelete = hasBusinessContext && hasAnyIntegrationState;

//   const canSoftDisconnect = hasBusinessContext && hasAnyIntegrationState;
//   const canHardDelete = hasBusinessContext;

//   // ------- ESU: Start / Generate / Manage -------
//   const startFacebookEsu = async () => {
//     if (!hasBusinessContext) {
//       toast.error("Workspace context missing. Please log in again.");
//       return;
//     }

//     try {
//       setConnectingEsu(true);

//       const res = await axiosClient.post("esu/facebook/start", {
//         returnUrlAfterSuccess: "/app/settings/whatsapp",
//       });

//       const authUrl =
//         res?.data?.data?.authUrl ||
//         res?.data?.authUrl ||
//         res?.data?.url ||
//         res?.data?.Data?.AuthUrl;

//       if (!authUrl) {
//         toast.error(
//           res?.data?.message || "Could not get Meta Embedded Signup URL."
//         );
//         return;
//       }

//       window.location.href = authUrl;
//     } catch (err) {
//       console.error("ESU start failed", err);
//       toast.error("Failed to start Meta Embedded Signup.");
//     } finally {
//       setConnectingEsu(false);
//     }
//   };

//   // ------- Disconnect (soft) -------
//   const handleDisconnect = async () => {
//     if (!hasBusinessContext) {
//       toast.error("Workspace context missing. Please re-login.");
//       return;
//     }

//     // If no integration state, treat as no-op with clear UX
//     if (!hasAnyIntegrationState) {
//       toast.info(
//         "No active WhatsApp Business API connection found for this account."
//       );
//       return;
//     }

//     try {
//       setLoading(true);
//       const res = await axiosClient.delete("esu/facebook/disconnect");

//       if (res?.data?.ok ?? true) {
//         toast.success("WhatsApp disconnected successfully for this account.");
//       } else {
//         toast.error(
//           res?.data?.message ||
//             "Failed to disconnect. Please check logs or contact support."
//         );
//       }

//       await loadStatus();
//     } catch (err) {
//       console.error("Disconnect failed", err);
//       const message =
//         err?.response?.data?.message ||
//         "Failed to disconnect. Please check logs or contact support.";
//       toast.error(message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ------- Deauthorize (debug) -------
//   const handleDeauthorize = async () => {
//     if (!hasBusinessContext) {
//       toast.error("Workspace context missing. Please re-login.");
//       return;
//     }

//     try {
//       setLoading(true);
//       await axiosClient.post("esu/facebook/debug/deauthorize");
//       toast.success("Local deauthorization complete (debug/internal).");
//       await loadStatus();
//     } catch (err) {
//       console.error("Deauthorize failed", err);
//       toast.error("Deauthorize failed or endpoint disabled.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ------- Hard delete: modal + action -------
//   const openDeleteModal = () => {
//     if (!hasBusinessContext) {
//       toast.error("Business context missing. Please re-login.");
//       return;
//     }

//     if (!hasAnyIntegrationState) {
//       toast.info(
//         "No Meta WhatsApp onboarding data is stored for this account."
//       );
//       return;
//     }

//     setDeleteConfirmChecked(false);
//     setShowDeleteModal(true);
//   };

//   const closeDeleteModal = () => {
//     if (!deleteLoading) {
//       setShowDeleteModal(false);
//     }
//   };

//   const handlePermanentDelete = async () => {
//     if (!hasBusinessContext) {
//       toast.error("Workspace context missing. Please re-login.");
//       return;
//     }
//     if (!deleteConfirmChecked) {
//       return;
//     }
//     if (!hasAnyIntegrationState) {
//       toast.info(
//         "No Meta WhatsApp onboarding data is stored for this account."
//       );
//       setShowDeleteModal(false);
//       return;
//     }

//     try {
//       setDeleteLoading(true);

//       // Use your configured hard-delete endpoint
//       const res = await axiosClient.delete(
//         "esu/facebook/hard-delete-full-account"
//       );

//       if (res?.data?.ok) {
//         toast.success(
//           "Meta WhatsApp onboarding configuration and related data have been deleted for this account."
//         );
//         setShowDeleteModal(false);
//         await loadStatus();
//       } else {
//         toast.error(
//           res?.data?.message ||
//             "Failed to delete WhatsApp data. Please contact support."
//         );
//       }
//     } catch (err) {
//       console.error("Hard delete failed", err);
//       const message =
//         err?.response?.data?.message ||
//         "Failed to delete WhatsApp data. Please contact support.";
//       toast.error(message);
//     } finally {
//       setDeleteLoading(false);
//     }
//   };

//   // ------- Status Panel -------
//   const renderStatusPanel = () => {
//     const isConfigured = isConfiguredViaEsu;
//     const borderClass = isConfigured
//       ? "border-l-emerald-500"
//       : "border-l-rose-500";
//     const headerBg = isConfigured
//       ? "bg-emerald-50 border-b border-emerald-100"
//       : "bg-rose-50 border-b border-rose-100";
//     const titleColor = isConfigured ? "text-emerald-700" : "text-rose-700";
//     const dotColor = isConfigured ? "bg-emerald-500" : "bg-rose-500";

//     let primaryLabel = "Connect via Facebook";
//     if (isConfigured && (isTokenExpiredOrInvalid || isTokenExpiringSoon)) {
//       primaryLabel = "Generate Token";
//     } else if (isConfigured) {
//       primaryLabel = "Manage Connection";
//     }

//     return (
//       <div
//         className={`mb-8 rounded-2xl shadow-sm border-l-8 ${borderClass} bg-gradient-to-br from-white to-slate-50`}
//       >
//         <div className={`rounded-t-2xl px-5 py-3 ${headerBg}`}>
//           <div className="text-xs uppercase tracking-wide font-semibold text-slate-500">
//             Connection Status
//           </div>
//         </div>

//         <div className="p-5 flex flex-col gap-2">
//           {statusLoading ? (
//             <div className="h-4 w-40 bg-slate-100 rounded animate-pulse mt-1" />
//           ) : (
//             <>
//               <div
//                 className={`inline-flex items-center gap-2 text-base font-semibold ${titleColor}`}
//               >
//                 <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
//                 {isConfigured
//                   ? "Connected via Meta Embedded Signup"
//                   : "Not connected"}
//               </div>

//               {!isConfigured && (
//                 <div className="text-sm text-slate-600">
//                   WhatsApp Business Account <strong>Disconnected</strong>. No
//                   active Meta Embedded Signup connection detected for this
//                   business.
//                 </div>
//               )}

//               {isConfigured && (
//                 <>
//                   {isFullyHealthy && (
//                     <div className="text-sm text-slate-600">
//                       WhatsApp API is configured and active for this account.
//                     </div>
//                   )}

//                   {isTokenExpiredOrInvalid && (
//                     <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-md mt-1">
//                       <span className="font-semibold">Token expired:</span> Your
//                       Meta access token is no longer valid. Click{" "}
//                       <span className="font-semibold">“Generate Token”</span>{" "}
//                       below to create a new long-lived token via Meta.
//                     </div>
//                   )}

//                   {isTokenExpiringSoon && (
//                     <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md mt-1">
//                       Your Meta access token will expire soon. Use{" "}
//                       <span className="font-semibold">“Generate Token”</span> to
//                       renew it before expiry.
//                     </div>
//                   )}

//                   {formattedExpiry && (
//                     <div className="text-xs text-slate-500">
//                       Token expiry: {formattedExpiry}
//                     </div>
//                   )}
//                 </>
//               )}

//               {(isDev || hasAllAccess) &&
//                 (debugMessage ||
//                   typeof hasEsuFlag === "boolean" ||
//                   typeof hasValidToken === "boolean") && (
//                   <div className="text-[10px] text-slate-500 mt-1">
//                     {debugMessage && <div>Debug: {debugMessage}</div>}
//                     <div>HasEsuFlag: {String(hasEsuFlag)}</div>
//                     <div>HasValidToken: {String(hasValidToken)}</div>
//                   </div>
//                 )}

//               {/* Primary action */}
//               <div className="mt-3 flex flex-wrap gap-2 flex-col sm:flex-row">
//                 <button
//                   type="button"
//                   onClick={startFacebookEsu}
//                   disabled={connectingEsu || !hasBusinessContext}
//                   className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
//                 >
//                   {connectingEsu ? "Opening Embedded Signup…" : primaryLabel}
//                 </button>
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     );
//   };

//   // ------- Render -------
//   return (
//     <div className="p-6 max-w-3xl mx-auto">
//       <h1 className="text-2xl font-bold text-emerald-800 mb-2">
//         Meta Account Management
//       </h1>
//       <p className="text-sm text-slate-600 mb-6">
//         Control how this account is connected to Meta&apos;s WhatsApp Business
//         Platform. Use these options to connect or disconnect safely, review how
//         data deletion is handled, and (for internal admins) trigger local
//         deauthorization.
//       </p>

//       {renderStatusPanel()}

//       <div className="space-y-6">
//         {/* Soft disconnect */}
//         <button
//           type="button"
//           onClick={handleDisconnect}
//           disabled={loading || !canSoftDisconnect}
//           className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition bg-white border-emerald-200 ${
//             loading || !canSoftDisconnect
//               ? "opacity-60 cursor-not-allowed"
//               : "hover:shadow-md"
//           }`}
//         >
//           <div className="p-2 rounded-md bg-emerald-50 text-emerald-700">
//             <ShieldAlert size={20} />
//           </div>
//           <div>
//             <div className="font-semibold text-emerald-800">
//               Disconnect WhatsApp Business API Account
//             </div>
//             <div className="text-sm text-slate-600">
//               {canSoftDisconnect
//                 ? "Runs the full disconnect pipeline for this account: best-effort revoke at Meta, local token/flag cleanup, and deactivation of WhatsApp sending."
//                 : "No active WhatsApp Business API integration is connected for this account."}
//             </div>
//           </div>
//         </button>

//         {/* Debug-only deauthorize */}
//         {(isDev || hasAllAccess) && (
//           <button
//             type="button"
//             onClick={handleDeauthorize}
//             disabled={loading || !hasBusinessContext}
//             className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition bg-white border-yellow-200 ${
//               loading || !hasBusinessContext
//                 ? "opacity-60 cursor-not-allowed"
//                 : "hover:shadow-md"
//             }`}
//           >
//             <div className="p-2 rounded-md bg-yellow-50 text-yellow-700">
//               <RefreshCw size={20} />
//             </div>
//             <div>
//               <div className="font-semibold text-yellow-800">
//                 Deauthorize (Local Debug)
//               </div>
//               <div className="text-sm text-slate-600">
//                 Clears ESU flags and stored tokens locally for this account.
//               </div>
//             </div>
//           </button>
//         )}

//         {/* Hard delete CTA */}
//         <button
//           type="button"
//           onClick={openDeleteModal}
//           disabled={!canHardDelete}
//           className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition bg-white border-rose-300 ${
//             !canHardDelete ? "opacity-60 cursor-not-allowed" : "hover:shadow-md"
//           }`}
//         >
//           <div className="p-2 rounded-md bg-rose-50 text-rose-700">
//             <Trash2 size={20} />
//           </div>
//           <div>
//             <div className="font-semibold text-rose-800">
//               Delete my account and WhatsApp data
//             </div>
//             <div className="text-sm text-slate-600">
//               {canHardDelete
//                 ? "Permanently disconnect your Meta WhatsApp integration and delete related onboarding configuration for this account. This cannot be undone."
//                 : "No Meta WhatsApp integration or onboarding data exists for this account."}
//             </div>
//           </div>
//         </button>
//       </div>

//       {/* Delete confirmation modal */}
//       {showDeleteModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
//           <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
//             <h2 className="text-lg font-semibold text-rose-700 mb-2">
//               Permanently delete WhatsApp integration?
//             </h2>
//             <p className="text-sm text-slate-700 mb-3">This will:</p>
//             <ul className="list-disc list-inside text-sm text-slate-700 mb-3">
//               <li>Disconnect your WhatsApp Business API integration.</li>
//               <li>Revoke Meta ESU / access tokens.</li>
//               <li>
//                 Delete stored Meta WhatsApp onboarding settings (WABA, numbers,
//                 API keys, webhooks) for this account.
//               </li>
//             </ul>
//             <p className="text-xs text-rose-700 font-medium mb-3">
//               This action is permanent and cannot be undone.
//             </p>

//             <label className="flex items-start gap-2 mb-4">
//               <input
//                 type="checkbox"
//                 className="mt-1"
//                 checked={deleteConfirmChecked}
//                 onChange={e => setDeleteConfirmChecked(e.target.checked)}
//                 disabled={deleteLoading}
//               />
//               <span className="text-xs text-slate-700">
//                 I understand that my Meta WhatsApp integration and related
//                 onboarding data for this account will be deleted permanently and
//                 cannot be recovered.
//               </span>
//             </label>

//             <div className="flex justify-end gap-2">
//               <button
//                 type="button"
//                 onClick={closeDeleteModal}
//                 disabled={deleteLoading}
//                 className="px-3 py-2 rounded-md text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
//               >
//                 Cancel
//               </button>
//               <button
//                 type="button"
//                 onClick={handlePermanentDelete}
//                 disabled={!deleteConfirmChecked || deleteLoading}
//                 className="px-4 py-2 rounded-md text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
//               >
//                 {deleteLoading ? "Deleting..." : "Delete permanently"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       <div className="mt-8">
//         <button
//           type="button"
//           onClick={() => nav("/app/settings")}
//           className="text-sm text-emerald-700 hover:underline"
//         >
//           ← Back to Settings
//         </button>
//       </div>
//     </div>
//   );
// }

// 📄 src/pages/MetaAccount/MetaAccountManagement.jsx

// import React, { useEffect, useState, useMemo } from "react";
// import { useNavigate } from "react-router-dom";
// import axiosClient from "../../api/axiosClient";
// import { toast } from "react-toastify";
// import { useAuth } from "../../app/providers/AuthProvider";
// import { ShieldAlert, Trash2, RefreshCw } from "lucide-react";

// // --- JWT businessId helper (aligned with ClaimsBusinessDetails) ---
// const TOKEN_KEY = "xbyte_token";
// const GUID_RE =
//   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// function getBusinessIdFromJwt() {
//   try {
//     const jwt = localStorage.getItem(TOKEN_KEY);
//     if (!jwt) return null;

//     const [, payloadB64] = jwt.split(".");
//     if (!payloadB64) return null;

//     const payload = JSON.parse(
//       atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
//     );

//     const bid = payload?.businessId || payload?.BusinessId || null;

//     return typeof bid === "string" && GUID_RE.test(bid) ? bid : null;
//   } catch {
//     return null;
//   }
// }

// export default function MetaAccountManagement() {
//   const { business, hasAllAccess } = useAuth();
//   const nav = useNavigate();

//   const [loading, setLoading] = useState(false);
//   const [connectingEsu, setConnectingEsu] = useState(false);
//   const [statusLoading, setStatusLoading] = useState(true);
//   const [status, setStatus] = useState(null);

//   const [showDeleteModal, setShowDeleteModal] = useState(false);
//   const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
//   const [deleteLoading, setDeleteLoading] = useState(false);

//   const isDev = process.env.NODE_ENV === "development";

//   // Prefer AuthProvider if present, otherwise JWT claim
//   const authBusinessId =
//     business?.id || business?.businessId || business?.BusinessId || null;

//   const jwtBusinessId = useMemo(getBusinessIdFromJwt, []);
//   const effectiveBusinessId = authBusinessId || jwtBusinessId;
//   const hasBusinessContext = !!effectiveBusinessId;

//   // ------- Load ESU status (JWT-based) -------
//   const loadStatus = async () => {
//     try {
//       setStatusLoading(true);

//       // Backend: GET /api/esu/facebook/status uses JWT to resolve businessId
//       const res = await axiosClient.get("esu/facebook/status");
//       const payload = res?.data ?? null;
//       const data = payload?.data || payload?.Data || payload;

//       setStatus(data || null);
//     } catch (err) {
//       console.error("Failed to load ESU status", err);
//       setStatus(null);
//     } finally {
//       setStatusLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadStatus();
//   }, []);

//   // ------- Normalized status -------
//   const hasEsuFlag = status?.hasEsuFlag ?? status?.HasEsuFlag ?? false;

//   const tokenExpiresAtRaw =
//     status?.tokenExpiresAtUtc ??
//     status?.TokenExpiresAtUtc ??
//     status?.accessTokenExpiresAtUtc ??
//     status?.AccessTokenExpiresAtUtc ??
//     null;

//   // Raw flags from backend
//   const hasValidToken = status?.hasValidToken ?? status?.HasValidToken ?? false;

//   const willExpireSoon =
//     status?.willExpireSoon ??
//     status?.WillExpireSoon ??
//     status?.isExpiringSoon ??
//     status?.IsExpiringSoon ??
//     false;

//   const debugMessage = status?.debug ?? status?.Debug ?? null;

//   const isConnected = status?.connected ?? status?.Connected ?? false;

//   // ESU is "configured" only if the ESU flag is set AND backend reports connection
//   const isConfiguredViaEsu = !!hasEsuFlag && !!isConnected;

//   // Backend contract (conceptual):
//   //
//   // - Healthy:        HasValidToken = true,  WillExpireSoon = false
//   // - Expiring soon:  HasValidToken = false, WillExpireSoon = true
//   // - Expired/invalid:HasValidToken = false, WillExpireSoon = false (expiry past)
//   // - No token yet:   HasValidToken = false, WillExpireSoon = false, no expiry timestamp

//   // Fully healthy = ESU connected AND backend says token is valid
//   const isFullyHealthy = isConfiguredViaEsu && hasValidToken;

//   // Expiring soon = ESU connected, backend says "not valid" BUT explicitly marks WillExpireSoon
//   const isTokenExpiringSoon =
//     isConfiguredViaEsu && !hasValidToken && willExpireSoon;

//   // Expired/invalid = ESU connected, backend says "not valid", not in 'expiring soon' bucket,
//   // and we have some expiry timestamp recorded
//   const isTokenExpiredOrInvalid =
//     isConfiguredViaEsu &&
//     !hasValidToken &&
//     !willExpireSoon &&
//     !!tokenExpiresAtRaw;

//   // ESU connected but we never had a token or it was cleared with no expiry recorded
//   const hasNoTokenYet =
//     isConfiguredViaEsu &&
//     !hasValidToken &&
//     !willExpireSoon &&
//     !tokenExpiresAtRaw;

//   const isNotConnected = !isConfiguredViaEsu;

//   const formattedExpiry = tokenExpiresAtRaw
//     ? new Date(tokenExpiresAtRaw).toLocaleString()
//     : null;

//   // "Any integration present?" — drives button enabling
//   const hasAnyIntegrationState =
//     isConfiguredViaEsu || hasValidToken || !!tokenExpiresAtRaw;

//   const canSoftDisconnect = hasBusinessContext && hasAnyIntegrationState;
//   const canHardDelete = hasBusinessContext;

//   // ------- ESU: Start / Generate / Manage -------
//   const startFacebookEsu = async () => {
//     if (!hasBusinessContext) {
//       toast.error("Workspace context missing. Please log in again.");
//       return;
//     }

//     try {
//       setConnectingEsu(true);

//       const res = await axiosClient.post("esu/facebook/start", {
//         returnUrlAfterSuccess: "/app/settings/whatsapp",
//       });

//       const authUrl =
//         res?.data?.data?.authUrl ||
//         res?.data?.authUrl ||
//         res?.data?.url ||
//         res?.data?.Data?.AuthUrl;

//       if (!authUrl) {
//         toast.error(
//           res?.data?.message || "Could not get Meta Embedded Signup URL."
//         );
//         return;
//       }

//       window.location.href = authUrl;
//     } catch (err) {
//       console.error("ESU start failed", err);
//       toast.error("Failed to start Meta Embedded Signup.");
//     } finally {
//       setConnectingEsu(false);
//     }
//   };

//   // ------- Disconnect (soft) -------
//   const handleDisconnect = async () => {
//     if (!hasBusinessContext) {
//       toast.error("Workspace context missing. Please re-login.");
//       return;
//     }

//     // If no integration state, treat as no-op with clear UX
//     if (!hasAnyIntegrationState) {
//       toast.info(
//         "No active WhatsApp Business API connection found for this account."
//       );
//       return;
//     }

//     try {
//       setLoading(true);
//       const res = await axiosClient.delete("esu/facebook/disconnect");

//       if (res?.data?.ok ?? true) {
//         toast.success("WhatsApp disconnected successfully for this account.");
//       } else {
//         toast.error(
//           res?.data?.message ||
//             "Failed to disconnect. Please check logs or contact support."
//         );
//       }

//       await loadStatus();
//     } catch (err) {
//       console.error("Disconnect failed", err);
//       const message =
//         err?.response?.data?.message ||
//         "Failed to disconnect. Please check logs or contact support.";
//       toast.error(message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ------- Deauthorize (debug) -------
//   const handleDeauthorize = async () => {
//     if (!hasBusinessContext) {
//       toast.error("Workspace context missing. Please re-login.");
//       return;
//     }

//     try {
//       setLoading(true);
//       await axiosClient.post("esu/facebook/debug/deauthorize");
//       toast.success("Local deauthorization complete (debug/internal).");
//       await loadStatus();
//     } catch (err) {
//       console.error("Deauthorize failed", err);
//       toast.error("Deauthorize failed or endpoint disabled.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ------- Hard delete: modal + action -------
//   const openDeleteModal = () => {
//     if (!hasBusinessContext) {
//       toast.error("Business context missing. Please re-login.");
//       return;
//     }

//     if (!hasAnyIntegrationState) {
//       toast.info(
//         "No Meta WhatsApp onboarding data is stored for this account."
//       );
//       return;
//     }

//     setDeleteConfirmChecked(false);
//     setShowDeleteModal(true);
//   };

//   const closeDeleteModal = () => {
//     if (!deleteLoading) {
//       setShowDeleteModal(false);
//     }
//   };

//   const handlePermanentDelete = async () => {
//     if (!hasBusinessContext) {
//       toast.error("Workspace context missing. Please re-login.");
//       return;
//     }
//     if (!deleteConfirmChecked) {
//       return;
//     }
//     if (!hasAnyIntegrationState) {
//       toast.info(
//         "No Meta WhatsApp onboarding data is stored for this account."
//       );
//       setShowDeleteModal(false);
//       return;
//     }

//     try {
//       setDeleteLoading(true);

//       // Use your configured hard-delete endpoint
//       const res = await axiosClient.delete(
//         "esu/facebook/hard-delete-full-account"
//       );

//       if (res?.data?.ok) {
//         toast.success(
//           "Meta WhatsApp onboarding configuration and related data have been deleted for this account."
//         );
//         setShowDeleteModal(false);
//         await loadStatus();
//       } else {
//         toast.error(
//           res?.data?.message ||
//             "Failed to delete WhatsApp data. Please contact support."
//         );
//       }
//     } catch (err) {
//       console.error("Hard delete failed", err);
//       const message =
//         err?.response?.data?.message ||
//         "Failed to delete WhatsApp data. Please contact support.";
//       toast.error(message);
//     } finally {
//       setDeleteLoading(false);
//     }
//   };

//   // ------- Status Panel -------
//   const renderStatusPanel = () => {
//     const isConfigured = isConfiguredViaEsu;
//     const borderClass = isConfigured
//       ? "border-l-emerald-500"
//       : "border-l-rose-500";
//     const headerBg = isConfigured
//       ? "bg-emerald-50 border-b border-emerald-100"
//       : "bg-rose-50 border-b border-rose-100";
//     const titleColor = isConfigured ? "text-emerald-700" : "text-rose-700";
//     const dotColor = isConfigured ? "bg-emerald-500" : "bg-rose-500";

//     let primaryLabel = "Connect via Facebook";
//     if (
//       isConfigured &&
//       (isTokenExpiredOrInvalid || isTokenExpiringSoon || hasNoTokenYet)
//     ) {
//       primaryLabel = "Generate Token";
//     } else if (isConfigured) {
//       primaryLabel = "Manage Connection";
//     }

//     return (
//       <div
//         className={`mb-8 rounded-2xl shadow-sm border-l-8 ${borderClass} bg-gradient-to-br from-white to-slate-50`}
//       >
//         <div className={`rounded-t-2xl px-5 py-3 ${headerBg}`}>
//           <div className="text-xs uppercase tracking-wide font-semibold text-slate-500">
//             Connection Status
//           </div>
//         </div>

//         <div className="p-5 flex flex-col gap-2">
//           {statusLoading ? (
//             <div className="h-4 w-40 bg-slate-100 rounded animate-pulse mt-1" />
//           ) : (
//             <>
//               <div
//                 className={`inline-flex items-center gap-2 text-base font-semibold ${titleColor}`}
//               >
//                 <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
//                 {isConfigured
//                   ? "Connected via Meta Embedded Signup"
//                   : "Not connected"}
//               </div>

//               {isNotConnected && (
//                 <div className="text-sm text-slate-600">
//                   No active Meta Embedded Signup connection is configured for
//                   this workspace. Connect your Meta account to enable WhatsApp
//                   Business messaging.
//                 </div>
//               )}

//               {isConfigured && (
//                 <>
//                   {isFullyHealthy && (
//                     <div className="text-sm text-slate-600">
//                       Your Meta account and WhatsApp Business access token are
//                       active and healthy. WhatsApp messaging and ESU features
//                       are fully available for this workspace.
//                     </div>
//                   )}

//                   {hasNoTokenYet && (
//                     <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md mt-1">
//                       Your Meta account is connected, but there is no active
//                       WhatsApp access token yet. Use{" "}
//                       <span className="font-semibold">“Generate Token”</span> to
//                       create a long-lived token so XploreByte can send WhatsApp
//                       messages.
//                     </div>
//                   )}

//                   {isTokenExpiringSoon && (
//                     <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md mt-1">
//                       Your WhatsApp access token will expire soon. Use{" "}
//                       <span className="font-semibold">“Generate Token”</span> to
//                       renew it before expiry and avoid interruptions.
//                     </div>
//                   )}

//                   {isTokenExpiredOrInvalid && (
//                     <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-md mt-1">
//                       <span className="font-semibold">Token expired:</span> your
//                       WhatsApp access token is no longer valid. Click{" "}
//                       <span className="font-semibold">“Generate Token”</span> to
//                       create a new long-lived token via Meta and restore
//                       messaging.
//                     </div>
//                   )}

//                   {formattedExpiry && (
//                     <div className="text-xs text-slate-500">
//                       Token expiry: {formattedExpiry}
//                     </div>
//                   )}
//                 </>
//               )}

//               {(isDev || hasAllAccess) &&
//                 (debugMessage ||
//                   typeof hasEsuFlag === "boolean" ||
//                   typeof hasValidToken === "boolean" ||
//                   typeof isConnected === "boolean" ||
//                   typeof willExpireSoon === "boolean") && (
//                   <div className="text-[10px] text-slate-500 mt-1">
//                     {debugMessage && <div>Debug: {debugMessage}</div>}
//                     <div>HasEsuFlag: {String(hasEsuFlag)}</div>
//                     <div>Connected: {String(isConnected)}</div>
//                     <div>HasValidToken: {String(hasValidToken)}</div>
//                     <div>WillExpireSoon: {String(willExpireSoon)}</div>
//                   </div>
//                 )}

//               {/* Primary action */}
//               <div className="mt-3 flex flex-wrap gap-2 flex-col sm:flex-row">
//                 <button
//                   type="button"
//                   onClick={startFacebookEsu}
//                   disabled={connectingEsu || !hasBusinessContext}
//                   className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
//                 >
//                   {connectingEsu ? "Opening Embedded Signup…" : primaryLabel}
//                 </button>
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     );
//   };

//   // ------- Render -------
//   return (
//     <div className="p-6 max-w-3xl mx-auto">
//       <h1 className="text-2xl font-bold text-emerald-800 mb-2">
//         Meta Account Management
//       </h1>
//       <p className="text-sm text-slate-600 mb-6">
//         Control how this account is connected to Meta&apos;s WhatsApp Business
//         Platform. Use these options to connect or disconnect safely, review how
//         data deletion is handled, and (for internal admins) trigger local
//         deauthorization.
//       </p>

//       {renderStatusPanel()}

//       <div className="space-y-6">
//         {/* Soft disconnect */}
//         <button
//           type="button"
//           onClick={handleDisconnect}
//           disabled={loading || !canSoftDisconnect}
//           className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition bg-white border-emerald-200 ${
//             loading || !canSoftDisconnect
//               ? "opacity-60 cursor-not-allowed"
//               : "hover:shadow-md"
//           }`}
//         >
//           <div className="p-2 rounded-md bg-emerald-50 text-emerald-700">
//             <ShieldAlert size={20} />
//           </div>
//           <div>
//             <div className="font-semibold text-emerald-800">
//               Disconnect WhatsApp Business API Account
//             </div>
//             <div className="text-sm text-slate-600">
//               {canSoftDisconnect
//                 ? "Runs the full disconnect pipeline for this account: best-effort revoke at Meta, local token/flag cleanup, and deactivation of WhatsApp sending."
//                 : "No active WhatsApp Business API integration is connected for this account."}
//             </div>
//           </div>
//         </button>

//         {/* Debug-only deauthorize */}
//         {(isDev || hasAllAccess) && (
//           <button
//             type="button"
//             onClick={handleDeauthorize}
//             disabled={loading || !hasBusinessContext}
//             className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition bg-white border-yellow-200 ${
//               loading || !hasBusinessContext
//                 ? "opacity-60 cursor-not-allowed"
//                 : "hover:shadow-md"
//             }`}
//           >
//             <div className="p-2 rounded-md bg-yellow-50 text-yellow-700">
//               <RefreshCw size={20} />
//             </div>
//             <div>
//               <div className="font-semibold text-yellow-800">
//                 Deauthorize (Local Debug)
//               </div>
//               <div className="text-sm text-slate-600">
//                 Clears ESU flags and stored tokens locally for this account.
//               </div>
//             </div>
//           </button>
//         )}

//         {/* Hard delete CTA */}
//         <button
//           type="button"
//           onClick={openDeleteModal}
//           disabled={!canHardDelete}
//           className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition bg-white border-rose-300 ${
//             !canHardDelete ? "opacity-60 cursor-not-allowed" : "hover:shadow-md"
//           }`}
//         >
//           <div className="p-2 rounded-md bg-rose-50 text-rose-700">
//             <Trash2 size={20} />
//           </div>
//           <div>
//             <div className="font-semibold text-rose-800">
//               Delete my account and WhatsApp data
//             </div>
//             <div className="text-sm text-slate-600">
//               {canHardDelete
//                 ? "Permanently disconnect your Meta WhatsApp integration and delete related onboarding configuration for this account. This cannot be undone."
//                 : "No Meta WhatsApp integration or onboarding data exists for this account."}
//             </div>
//           </div>
//         </button>
//       </div>

//       {/* Delete confirmation modal */}
//       {showDeleteModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
//           <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
//             <h2 className="text-lg font-semibold text-rose-700 mb-2">
//               Permanently delete WhatsApp integration?
//             </h2>
//             <p className="text-sm text-slate-700 mb-3">This will:</p>
//             <ul className="list-disc list-inside text-sm text-slate-700 mb-3">
//               <li>Disconnect your WhatsApp Business API integration.</li>
//               <li>Revoke Meta ESU / access tokens.</li>
//               <li>
//                 Delete stored Meta WhatsApp onboarding settings (WABA, numbers,
//                 API keys, webhooks) for this account.
//               </li>
//             </ul>
//             <p className="text-xs text-rose-700 font-medium mb-3">
//               This action is permanent and cannot be undone.
//             </p>

//             <label className="flex items-start gap-2 mb-4">
//               <input
//                 type="checkbox"
//                 className="mt-1"
//                 checked={deleteConfirmChecked}
//                 onChange={e => setDeleteConfirmChecked(e.target.checked)}
//                 disabled={deleteLoading}
//               />
//               <span className="text-xs text-slate-700">
//                 I understand that my Meta WhatsApp integration and related
//                 onboarding data for this account will be deleted permanently and
//                 cannot be recovered.
//               </span>
//             </label>

//             <div className="flex justify-end gap-2">
//               <button
//                 type="button"
//                 onClick={closeDeleteModal}
//                 disabled={deleteLoading}
//                 className="px-3 py-2 rounded-md text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
//               >
//                 Cancel
//               </button>
//               <button
//                 type="button"
//                 onClick={handlePermanentDelete}
//                 disabled={!deleteConfirmChecked || deleteLoading}
//                 className="px-4 py-2 rounded-md text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
//               >
//                 {deleteLoading ? "Deleting..." : "Delete permanently"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       <div className="mt-8">
//         <button
//           type="button"
//           onClick={() => nav("/app/settings")}
//           className="text-sm text-emerald-700 hover:underline"
//         >
//           ← Back to Settings
//         </button>
//       </div>
//     </div>
//   );
// }
