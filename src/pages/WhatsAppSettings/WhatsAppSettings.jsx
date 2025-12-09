// 📄 src/pages/Settings/WhatsAppSettings.jsx
import React, { useState, useEffect, useMemo } from "react";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";

// === Canonical providers (MUST match backend exactly) ===
const PROVIDERS = [
  { value: "PINNACLE", label: "PINNACLE" },
  { value: "META_CLOUD", label: "META_CLOUD" },
];

// --- BusinessId helper (used only as a sanity check / legacy headers) ---
const TOKEN_KEY = "xbyte_token";
const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getBusinessId() {
  try {
    const saved = localStorage.getItem("business_id");
    if (saved && GUID_RE.test(saved)) return saved;

    const jwt = localStorage.getItem(TOKEN_KEY);
    if (!jwt) return null;

    const [, payloadB64] = jwt.split(".");
    if (!payloadB64) return null;

    const payload = JSON.parse(
      atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
    );

    const bid =
      payload?.BusinessId ||
      payload?.businessId ||
      payload?.biz ||
      payload?.bid ||
      null;

    return typeof bid === "string" && GUID_RE.test(bid) ? bid : null;
  } catch {
    return null;
  }
}

// Normalize provider names
const normalizeProvider = p => {
  const raw = (p ?? "").toString().trim();
  if (!raw) return "PINNACLE";
  const up = raw.toUpperCase();
  if (up === "PINNACLE") return "PINNACLE";
  if (
    up === "META_CLOUD" ||
    up === "META" ||
    up === "METACLOUD" ||
    up === "META-CLOUD"
  ) {
    return "META_CLOUD";
  }
  return "PINNACLE";
};

// UI label per provider (still binds to apiKey field)
const secretLabelFor = provider =>
  normalizeProvider(provider) === "PINNACLE" ? "API Key" : "Token";

// Initial blank global settings
const blank = {
  provider: "PINNACLE",
  apiUrl: "",
  apiKey: "",
  wabaId: "",
  senderDisplayName: "",
  webhookSecret: "",
  webhookVerifyToken: "",
  webhookCallbackUrl: "",
  isActive: true,
};

export default function WhatsAppSettings() {
  const [formData, setFormData] = useState(blank);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [senders, setSenders] = useState([]);
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [hasSavedOnce, setHasSavedOnce] = useState(false);
  const [savedProvider, setSavedProvider] = useState(null);

  // ESU status (normalized)
  const [esuStatus, setEsuStatus] = useState({
    loading: true,
    hasEsuFlag: false,
    hasValidToken: false,
    willExpireSoon: false,
    tokenExpiresAtUtc: null,
    isConfiguredViaEsu: false,
    isTokenExpiredOrInvalid: false,
    isTokenExpiringSoon: false,
    isFullyHealthy: false,
    phoneCount: 0,
    hasWaba: false,
    debug: null,
  });

  const [connectingEsu, setConnectingEsu] = useState(false);

  const businessId = useMemo(getBusinessId, []);
  const hasBusinessContext = !!businessId;

  const withBiz = (cfg = {}) =>
    businessId
      ? {
          ...cfg,
          headers: { ...(cfg.headers || {}), "X-Business-Id": businessId },
        }
      : cfg;

  // ===== Numbers API helpers =====
  const listNumbers = async provider => {
    const p = normalizeProvider(provider);
    const { data } = await axiosClient.get(
      `/whatsappsettings/${p}/numbers`,
      withBiz()
    );
    return Array.isArray(data) ? data : [];
  };

  const upsertNumber = async (provider, row) => {
    const p = normalizeProvider(provider);
    const payload = {
      phoneNumberId: (row.phoneNumberId || "").trim(),
      whatsAppBusinessNumber: (row.whatsAppBusinessNumber || "").trim(),
      senderDisplayName: (row.label || row.senderDisplayName || "").trim(),
      isActive: row.isActive ?? true,
      isDefault: !!row.isDefault,
    };
    const { data } = await axiosClient.post(
      `/whatsappsettings/${p}/numbers`,
      payload,
      withBiz()
    );
    return data;
  };

  const deleteNumber = async (provider, id) => {
    const p = normalizeProvider(provider);
    await axiosClient.delete(`/whatsappsettings/${p}/numbers/${id}`, withBiz());
  };

  const setDefaultNumber = async (provider, id) => {
    const p = normalizeProvider(provider);
    await axiosClient.patch(
      `/whatsappsettings/${p}/numbers/${id}/default`,
      null,
      withBiz()
    );
  };

  const fetchNumbers = async provider => {
    try {
      const items = await listNumbers(provider);
      setSenders(
        items.map(n => ({
          id: n.id,
          label: n.senderDisplayName || "",
          phoneNumberId: n.phoneNumberId || "",
          whatsAppBusinessNumber: n.whatsAppBusinessNumber || "",
          isDefault: !!n.isDefault,
          isActive: n.isActive ?? true,
        }))
      );
    } catch {
      setSenders([]);
    }
  };

  // ===== Derived UI =====
  const providerLabel = useMemo(
    () => secretLabelFor(formData.provider),
    [formData.provider]
  );
  const selectedProvider = useMemo(
    () => normalizeProvider(formData.provider),
    [formData.provider]
  );
  const showFetchButton = hasSavedOnce;

  // ===== ESU: load connection status (JWT-based) =====
  useEffect(() => {
    const loadStatus = async () => {
      try {
        setEsuStatus(s => ({ ...s, loading: true }));

        // Backend: GET /api/esu/facebook/status (uses JWT for businessId)
        const res = await axiosClient.get("esu/facebook/status");
        const payload = res?.data ?? {};
        const dto = payload?.data || payload?.Data || payload || {};

        const hasEsuFlag =
          dto.hasEsuFlag ?? dto.HasEsuFlag ?? dto.facebookEsuCompleted ?? false;

        const tokenExpiresAtUtc =
          dto.tokenExpiresAtUtc ?? dto.TokenExpiresAtUtc ?? null;

        const hasValidToken =
          dto.hasValidToken ??
          dto.HasValidToken ??
          (tokenExpiresAtUtc ? true : false);

        const willExpireSoon =
          dto.willExpireSoon ??
          dto.WillExpireSoon ??
          dto.isExpiringSoon ??
          dto.IsExpiringSoon ??
          false;

        const isConfiguredViaEsu = !!hasEsuFlag;
        const isTokenExpiredOrInvalid = isConfiguredViaEsu && !hasValidToken;
        const isTokenExpiringSoon = !!hasValidToken && willExpireSoon;
        const isFullyHealthy =
          isConfiguredViaEsu && hasValidToken && !willExpireSoon;

        const phoneCount = dto.phoneCount || dto.numbersCount || 0;
        const hasWaba = !!(dto.wabaId || dto.WabaId);
        const debug = dto.debug ?? dto.Debug ?? null;

        setEsuStatus({
          loading: false,
          hasEsuFlag,
          hasValidToken,
          willExpireSoon,
          tokenExpiresAtUtc,
          isConfiguredViaEsu,
          isTokenExpiredOrInvalid,
          isTokenExpiringSoon,
          isFullyHealthy,
          phoneCount,
          hasWaba,
          debug,
        });
      } catch (err) {
        console.error("Unable to load Meta ESU status", err);
        setEsuStatus({
          loading: false,
          hasEsuFlag: false,
          hasValidToken: false,
          willExpireSoon: false,
          tokenExpiresAtUtc: null,
          isConfiguredViaEsu: false,
          isTokenExpiredOrInvalid: false,
          isTokenExpiringSoon: false,
          isFullyHealthy: false,
          phoneCount: 0,
          hasWaba: false,
          debug: "status-error",
        });
      }
    };

    loadStatus();
  }, []);
  // ===== Initial load of saved settings + numbers =====
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);

        const res = await axiosClient.get("/whatsappsettings/me", withBiz());
        if (!mounted) return;

        const body = res?.data || {};

        // Support both:
        // 1) New shape: { ok, hasSettings, data }
        // 2) Legacy shape: settings object directly
        const hasSettingsFlag =
          typeof body.hasSettings === "boolean" ? body.hasSettings : undefined;

        const settings =
          hasSettingsFlag === false
            ? null
            : body.data !== undefined
            ? body.data
            : body;

        // No settings configured yet (expected state)
        if (!settings || Object.keys(settings).length === 0) {
          // UX hint (safe even if removed later; logic below still holds)
          toast.info("ℹ️ No WhatsApp settings found. You can create them now.");
          setHasSavedOnce(false);
          setSavedProvider(null);
          setSenders([]);
          return;
        }

        const provider = normalizeProvider(settings.provider);
        const secret = settings.apiKey || settings.apiToken || "";

        setFormData(prev => ({
          ...prev,
          provider,
          apiUrl: settings.apiUrl || "",
          apiKey: secret,
          wabaId: settings.wabaId || "",
          senderDisplayName: settings.senderDisplayName || "",
          webhookSecret: settings.webhookSecret || "",
          webhookVerifyToken: settings.webhookVerifyToken || "",
          webhookCallbackUrl: settings.webhookCallbackUrl || "",
          isActive: settings.isActive ?? true,
        }));

        setSavedProvider(provider);

        const existed =
          !!settings.provider ||
          !!settings.apiKey ||
          !!settings.apiToken ||
          !!settings.wabaId;
        setHasSavedOnce(!!existed);

        await fetchNumbers(provider);
      } catch (err) {
        // Real errors (network, 500, etc.) will already be surfaced
        // by the global axiosClient interceptor.
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.error("Failed to load WhatsApp settings", err);
        }
        setHasSavedOnce(false);
        setSavedProvider(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // // ===== Initial load of saved settings + numbers =====
  // useEffect(() => {
  //   let mounted = true;
  //   (async () => {
  //     try {
  //       setLoading(true);
  //       const res = await axiosClient.get("/whatsappsettings/me", withBiz());
  //       if (!mounted) return;
  //       const data = res?.data ?? {};

  //       const provider = normalizeProvider(data?.provider);
  //       const secret = data?.apiKey || data?.apiToken || "";

  //       setFormData(prev => ({
  //         ...prev,
  //         provider,
  //         apiUrl: data?.apiUrl || "",
  //         apiKey: secret,
  //         wabaId: data?.wabaId || "",
  //         senderDisplayName: data?.senderDisplayName || "",
  //         webhookSecret: data?.webhookSecret || "",
  //         webhookVerifyToken: data?.webhookVerifyToken || "",
  //         webhookCallbackUrl: data?.webhookCallbackUrl || "",
  //         isActive: data?.isActive ?? true,
  //       }));

  //       setSavedProvider(provider);

  //       const existed =
  //         !!data?.provider ||
  //         !!data?.apiKey ||
  //         !!data?.apiToken ||
  //         !!data?.wabaId;
  //       setHasSavedOnce(!!existed);

  //       await fetchNumbers(provider);
  //     } catch {
  //       toast.info("ℹ️ No WhatsApp settings found. You can create them now.");
  //       setHasSavedOnce(false);
  //       setSavedProvider(null);
  //     } finally {
  //       mounted && setLoading(false);
  //     }
  //   })();

  //   return () => {
  //     mounted = false;
  //   };
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  // Refresh numbers when dropdown provider changes
  useEffect(() => {
    fetchNumbers(formData.provider);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.provider]);

  // Auto-fetch numbers when redirected with ?connected=1 after ESU flow
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "1") {
      (async () => {
        try {
          await handleFetchFromMeta();
          toast.success("Meta connection completed. Numbers synced.");
        } finally {
          const url = new URL(window.location.href);
          url.searchParams.delete("connected");
          window.history.replaceState({}, "", url.toString());
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Local sender mutations =====
  const addSender = () =>
    setSenders(s => [
      ...s,
      {
        label: "",
        phoneNumberId: "",
        whatsAppBusinessNumber: "",
        isDefault: s.length === 0,
        isActive: true,
      },
    ]);

  const removeSender = idx => setSenders(s => s.filter((_, i) => i !== idx));

  const updateSender = (idx, key, value) =>
    setSenders(s =>
      s.map((row, i) => (i === idx ? { ...row, [key]: value } : row))
    );

  const setDefaultSenderLocal = idx =>
    setSenders(s => s.map((row, i) => ({ ...row, isDefault: i === idx })));

  // ===== Global form handlers =====
  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
  };

  const handleToggle = e => {
    const { name, checked } = e.target;
    setFormData(p => ({ ...p, [name]: checked }));
  };

  const handleProviderChange = e => {
    const provider = normalizeProvider(e.target.value);
    setFormData(p => ({ ...p, provider }));
  };

  // ===== Save global settings =====
  const validateBeforeSave = () => {
    if (!formData.apiKey.trim()) {
      toast.error("API Key / Token is required.");
      return false;
    }
    return true;
  };

  const handleSaveGlobal = async () => {
    if (!validateBeforeSave()) return;
    try {
      setSaving(true);
      const payload = {
        provider: normalizeProvider(formData.provider),
        apiUrl: (formData.apiUrl || "").trim(),
        apiKey: (formData.apiKey || "").trim(),
        wabaId: (formData.wabaId || "").trim() || null,
        senderDisplayName: (formData.senderDisplayName || "").trim() || null,
        webhookSecret: (formData.webhookSecret || "").trim() || null,
        webhookVerifyToken: (formData.webhookVerifyToken || "").trim() || null,
        webhookCallbackUrl: (formData.webhookCallbackUrl || "").trim() || null,
        isActive: !!formData.isActive,
      };

      await axiosClient.put("/whatsappsettings/update", payload, withBiz());

      setHasSavedOnce(true);
      setSavedProvider(payload.provider);

      toast.success("Settings saved.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  // ===== Test connection using backend "current" settings =====
  const handleTest = async () => {
    setTesting(true);
    setTestResult("");
    try {
      const res = await axiosClient.post(
        "/whatsappsettings/test-connection/current",
        {},
        withBiz()
      );
      setTestResult(JSON.stringify(res?.data ?? {}, null, 2));
      toast.success(res?.data?.message || "Connection test complete.");
    } catch (err) {
      setTestResult(
        JSON.stringify(err?.response?.data ?? { error: String(err) }, null, 2)
      );
      toast.error(err?.response?.data?.message || "Connection test failed.");
    } finally {
      setTesting(false);
    }
  };

  // ===== ESU: start Embedded Signup / Refresh Token from Settings page =====
  const startFacebookEsu = async () => {
    if (!hasBusinessContext) {
      toast.error("Business context missing. Please re-login.");
      return;
    }

    try {
      setConnectingEsu(true);

      const returnUrlAfterSuccess = "/app/settings/whatsapp";

      // JWT-based; no X-Business-Id here
      const res = await axiosClient.post("esu/facebook/start", {
        returnUrlAfterSuccess,
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
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to start Meta Embedded Signup."
      );
    } finally {
      setConnectingEsu(false);
    }
  };

  // ===== Fetch numbers via backend sync =====
  const handleFetchFromMeta = async () => {
    if (!formData.apiKey?.trim() || !formData.wabaId?.trim()) {
      toast.warn(
        "Please provide API Key/Token and WABA ID, then Save Settings."
      );
      return;
    }
    try {
      setFetchingMeta(true);
      const res = await axiosClient.post(
        "/whatsappsettings/fetch-numbers",
        {},
        withBiz()
      );

      const serverBucket = normalizeProvider(res?.data?.provider);
      const fallbackBucket = savedProvider || selectedProvider;
      const bucket = serverBucket || fallbackBucket;

      await fetchNumbers(bucket);

      if (bucket && bucket !== selectedProvider) {
        setFormData(p => ({ ...p, provider: bucket }));
      }

      const { added = 0, updated = 0, total = 0 } = res?.data || {};
      toast.success(
        `Synced — added ${added}, updated ${updated}, total ${total} (${bucket}).`
      );
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Fetch failed.";
      toast.error(msg);
    } finally {
      setFetchingMeta(false);
    }
  };

  // ===== Connection Status card UI (ESU-aware) =====
  const renderConnectionStatus = () => {
    const {
      loading,
      isConfiguredViaEsu,
      isTokenExpiredOrInvalid,
      isTokenExpiringSoon,
      isFullyHealthy,
      phoneCount,
      hasWaba,
      tokenExpiresAtUtc,
      debug,
    } = esuStatus;

    const formattedExpiry = tokenExpiresAtUtc
      ? new Date(tokenExpiresAtUtc).toLocaleString()
      : null;

    if (loading) {
      return (
        <div className="mb-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
          Checking Meta connection status…
        </div>
      );
    }

    // Not configured via ESU at all
    if (!isConfiguredViaEsu) {
      return (
        <div className="mb-5 rounded-2xl border border-red-100 bg-red-50/70 shadow-sm overflow-hidden">
          <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">
              Connection Status
            </span>
          </div>
          <div className="px-4 py-3 flex items-start gap-3">
            <span className="mt-1 w-3 h-3 inline-block rounded-full bg-red-500" />
            <div>
              <div className="font-semibold text-red-600 mb-0.5">
                Not connected
              </div>
              <p className="text-xs text-slate-600 mb-2">
                WhatsApp Business Account <strong>Disconnected</strong>. Connect
                your WhatsApp Business Account via Facebook.
              </p>
              <button
                type="button"
                onClick={startFacebookEsu}
                disabled={connectingEsu || !hasBusinessContext}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-60"
              >
                {connectingEsu
                  ? "Opening Embedded Signup…"
                  : "Connect via Facebook"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Configured via ESU → green base; token health as secondary
    return (
      <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 shadow-sm overflow-hidden">
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wide text-slate-500">
            Connection Status
          </span>
          <span className="text-[10px] text-emerald-700">
            Via Meta Embedded Signup
          </span>
        </div>
        <div className="px-4 py-3 flex items-start gap-3">
          <span className="mt-1 w-3 h-3 inline-block rounded-full bg-emerald-500" />
          <div>
            <div className="font-semibold text-emerald-700 mb-0.5">
              Connected via Meta Embedded Signup
            </div>

            {isFullyHealthy && (
              <p className="text-xs text-slate-700">
                WhatsApp API is configured and active for this workspace
                {phoneCount
                  ? ` · ${phoneCount} phone${phoneCount > 1 ? "s" : ""} synced`
                  : ""}
                {hasWaba ? " · WABA configured" : ""}.
              </p>
            )}

            {isTokenExpiredOrInvalid && (
              <div className="mt-1 text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-md">
                <span className="font-semibold">Token expired:</span> Your Meta
                access token is no longer valid. Use{" "}
                <span className="font-semibold">“Refresh Token”</span> below to
                securely generate a new long-lived token.
              </div>
            )}

            {isTokenExpiringSoon && (
              <div className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md">
                Your Meta access token will expire soon. Use{" "}
                <span className="font-semibold">“Refresh Token”</span> to renew
                it and avoid interruptions.
              </div>
            )}

            {formattedExpiry && (
              <div className="mt-1 text-[10px] text-slate-500">
                Token expiry: {formattedExpiry}
              </div>
            )}

            {(debug || process.env.NODE_ENV === "development") && debug && (
              <div className="mt-1 text-[9px] text-slate-500">
                Debug: {debug}
              </div>
            )}

            <div className="mt-2 flex flex-col gap-1">
              <button
                type="button"
                onClick={startFacebookEsu}
                disabled={connectingEsu || !hasBusinessContext}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-600 text-white border border-emerald-600 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60"
              >
                {connectingEsu
                  ? "Opening Embedded Signup…"
                  : isTokenExpiredOrInvalid || isTokenExpiringSoon
                  ? "Refresh Token"
                  : "Manage Connection"}
              </button>

              {(isTokenExpiredOrInvalid || isTokenExpiringSoon) && (
                <div className="text-[10px] text-slate-600">
                  Clicking <strong>“Refresh Token”</strong> will reopen Meta
                  Embedded Signup and update your WhatsApp access token without
                  extra manual configuration.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===== Render =====
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold text-slate-900">
          WhatsApp Settings
        </h1>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSaveGlobal}
            disabled={saving}
            className={`px-4 py-2 rounded-md text-sm ${
              saving
                ? "bg-gray-300 text-gray-600"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className={`px-4 py-2 rounded-md text-sm ${
              testing
                ? "bg-gray-200 text-gray-500"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {testing ? "Testing…" : "Test Connection"}
          </button>
        </div>
      </div>

      {renderConnectionStatus()}

      {loading && (
        <div className="text-xs text-gray-500 mb-4">Loading settings…</div>
      )}

      {/* GLOBAL provider-level settings */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4">
          <label className="text-xs text-gray-600 block mb-1">Provider</label>
          <select
            name="provider"
            value={normalizeProvider(formData.provider)}
            onChange={handleProviderChange}
            className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
          >
            {PROVIDERS.map(p => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4">
          <label className="text-xs text-gray-600 block mb-1">
            API URL (optional)
          </label>
          <input
            type="text"
            name="apiUrl"
            value={formData.apiUrl}
            onChange={handleChange}
            placeholder="https://graph.facebook.com/v20.0 or provider URL"
            className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
          />
        </div>

        <div className="md:col-span-4">
          <label className="text-xs text-gray-600 block mb-1">
            {providerLabel}
          </label>
          <input
            type="text"
            name="apiKey"
            value={formData.apiKey}
            onChange={handleChange}
            placeholder={providerLabel}
            className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
          />
        </div>

        <div className="md:col-span-4">
          <label className="text-xs text-gray-600 block mb-1">
            WABA ID (Meta only)
          </label>
          <input
            type="text"
            name="wabaId"
            value={formData.wabaId}
            onChange={handleChange}
            placeholder="e.g. 123456789012345"
            className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
          />
        </div>

        <div className="md:col-span-4">
          <label className="text-xs text-gray-600 block mb-1">
            Sender Display Name (optional)
          </label>
          <input
            type="text"
            name="senderDisplayName"
            value={formData.senderDisplayName}
            onChange={handleChange}
            placeholder="e.g. Acme Support"
            className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
          />
        </div>

        <div className="md:col-span-4">
          <label className="text-xs text-gray-600 block mb-1">
            Webhook Verify Token
          </label>
          <input
            type="text"
            name="webhookVerifyToken"
            value={formData.webhookVerifyToken}
            onChange={handleChange}
            placeholder="verify-token"
            className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
          />
        </div>

        <div className="md:col-span-4">
          <label className="text-xs text-gray-600 block mb-1">
            Webhook Secret
          </label>
          <input
            type="text"
            name="webhookSecret"
            value={formData.webhookSecret}
            onChange={handleChange}
            placeholder="secret"
            className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
          />
        </div>

        <div className="md:col-span-8">
          <label className="text-xs text-gray-600 block mb-1">
            Webhook Callback URL
          </label>
          <input
            type="text"
            name="webhookCallbackUrl"
            value={formData.webhookCallbackUrl}
            onChange={handleChange}
            placeholder="https://example.com/api/webhooks/whatsapp"
            className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
          />
        </div>

        <div className="md:col-span-4 flex items-end">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="isActive"
              checked={!!formData.isActive}
              onChange={handleToggle}
              className="h-4 w-4"
            />
            Active
          </label>
        </div>
      </div>

      {/* SENDERS */}
      <div className="mt-8 border-t pt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Senders (phone numbers)
          </h3>

          <div className="flex gap-2">
            {showFetchButton && (
              <button
                type="button"
                onClick={handleFetchFromMeta}
                disabled={fetchingMeta}
                className={`px-3 py-1.5 rounded-md text-sm ${
                  fetchingMeta
                    ? "bg-gray-200 text-gray-500"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {fetchingMeta ? "Fetching…" : "Fetch from Meta"}
              </button>
            )}
            <button
              type="button"
              onClick={addSender}
              className="px-3 py-1.5 rounded-md text-sm bg-gray-100 hover:bg-gray-200"
            >
              + Add number
            </button>
          </div>
        </div>

        {senders.length === 0 && (
          <div className="text-xs text-gray-500 mb-2">
            No senders yet. Use <b>Fetch from Meta</b> after connecting, or{" "}
            <b>+ Add number</b> to configure manually.
          </div>
        )}

        <div className="space-y-3">
          {senders.map((row, idx) => (
            <div
              key={idx}
              className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-gray-50 p-3 rounded"
            >
              <div className="md:col-span-3">
                <label className="text-xs text-gray-600 block mb-1">
                  Label (optional)
                </label>
                <input
                  type="text"
                  value={row.label || ""}
                  onChange={e => updateSender(idx, "label", e.target.value)}
                  placeholder="e.g. Sales India"
                  className="w-full px-3 py-1.5 border rounded-md text-sm border-gray-300"
                />
              </div>

              <div className="md:col-span-4">
                <label className="text-xs text-gray-600 block mb-1">
                  WhatsApp Business Number
                </label>
                <input
                  type="text"
                  value={row.whatsAppBusinessNumber || ""}
                  onChange={e =>
                    updateSender(idx, "whatsAppBusinessNumber", e.target.value)
                  }
                  placeholder="+14150000001"
                  className="w-full px-3 py-1.5 border rounded-md text-sm border-gray-300"
                />
              </div>

              <div className="md:col-span-4">
                <label className="text-xs text-gray-600 block mb-1">
                  Phone Number ID
                </label>
                <input
                  type="text"
                  value={row.phoneNumberId || ""}
                  onChange={e =>
                    updateSender(idx, "phoneNumberId", e.target.value)
                  }
                  placeholder="1234567890"
                  className="w-full px-3 py-1.5 border rounded-md text-sm border-gray-300"
                />
              </div>

              <div className="md:col-span-1 flex items-end gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const saved = await upsertNumber(formData.provider, row);
                      setSenders(s =>
                        s.map((r, i) =>
                          i === idx ? { ...r, id: saved?.id || r.id } : r
                        )
                      );
                      toast.success("Sender saved.");
                    } catch {
                      toast.error("Save failed.");
                    }
                  }}
                  className="px-2 py-1 rounded text-xs bg-blue-600 text-white"
                >
                  Save
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (!row.id) {
                        removeSender(idx);
                        return;
                      }
                      await deleteNumber(formData.provider, row.id);
                      removeSender(idx);
                      toast.success("Sender deleted.");
                    } catch {
                      toast.error("Delete failed.");
                    }
                  }}
                  className="px-2 py-1 rounded text-xs bg-red-50 text-red-700"
                >
                  ✕
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (!row.id) {
                        const saved = await upsertNumber(
                          formData.provider,
                          row
                        );
                        await setDefaultNumber(formData.provider, saved?.id);
                      } else {
                        await setDefaultNumber(formData.provider, row.id);
                      }
                      setDefaultSenderLocal(idx);
                      toast.success("Default sender set.");
                    } catch {
                      toast.error("Failed to set default.");
                    }
                  }}
                  className={`px-2 py-1 rounded text-xs ${
                    row.isDefault
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {row.isDefault ? "Default" : "Make default"}
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-gray-500 mt-2">
          The <b>Default</b> sender will be used when no phone is chosen
          explicitly while sending.
        </p>
      </div>

      {testResult && (
        <div className="mt-6">
          <label className="text-xs text-gray-600 block mb-1">
            Test Result
          </label>
          <pre className="text-xs bg-gray-50 border border-gray-200 p-3 rounded overflow-auto">
            {testResult}
          </pre>
        </div>
      )}
    </div>
  );
}

// // 📄 src/pages/Settings/WhatsAppSettings.jsx
// import React, { useState, useEffect, useMemo } from "react";
// import axiosClient from "../../api/axiosClient";
// import { toast } from "react-toastify";

// // === Canonical providers (MUST match backend exactly) ===
// const PROVIDERS = [
//   { value: "PINNACLE", label: "PINNACLE" },
//   { value: "META_CLOUD", label: "META_CLOUD" },
// ];

// // --- BusinessId helper ---
// const TOKEN_KEY = "xbyte_token";
// const GUID_RE =
//   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// function getBusinessId() {
//   try {
//     const saved = localStorage.getItem("business_id");
//     if (saved && GUID_RE.test(saved)) return saved;

//     const jwt = localStorage.getItem(TOKEN_KEY);
//     if (!jwt) return null;

//     const [, payloadB64] = jwt.split(".");
//     if (!payloadB64) return null;

//     const payload = JSON.parse(
//       atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
//     );

//     const bid =
//       payload?.BusinessId ||
//       payload?.businessId ||
//       payload?.biz ||
//       payload?.bid ||
//       null;

//     return typeof bid === "string" && GUID_RE.test(bid) ? bid : null;
//   } catch {
//     return null;
//   }
// }

// // Normalize provider names
// const normalizeProvider = p => {
//   const raw = (p ?? "").toString().trim();
//   if (!raw) return "PINNACLE";
//   const up = raw.toUpperCase();
//   if (up === "PINNACLE") return "PINNACLE";
//   if (
//     up === "META_CLOUD" ||
//     up === "META" ||
//     up === "METACLOUD" ||
//     up === "META-CLOUD"
//   ) {
//     return "META_CLOUD";
//   }
//   return "PINNACLE";
// };

// // UI label per provider (still binds to apiKey field)
// const secretLabelFor = provider =>
//   normalizeProvider(provider) === "PINNACLE" ? "API Key" : "Token";

// // Initial blank global settings
// const blank = {
//   provider: "PINNACLE",
//   apiUrl: "",
//   apiKey: "",
//   wabaId: "",
//   senderDisplayName: "",
//   webhookSecret: "",
//   webhookVerifyToken: "",
//   webhookCallbackUrl: "",
//   isActive: true,
// };

// export default function WhatsAppSettings() {
//   const [formData, setFormData] = useState(blank);
//   const [loading, setLoading] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [testing, setTesting] = useState(false);
//   const [testResult, setTestResult] = useState("");
//   const [senders, setSenders] = useState([]);
//   const [fetchingMeta, setFetchingMeta] = useState(false);
//   const [hasSavedOnce, setHasSavedOnce] = useState(false);
//   const [savedProvider, setSavedProvider] = useState(null);

//   // ESU status
//   const [esuStatus, setEsuStatus] = useState({
//     loading: true,
//     connected: false,
//     hasToken: false,
//     hasWaba: false,
//     phoneCount: 0,
//     message: "",
//   });
//   const [connectingEsu, setConnectingEsu] = useState(false);

//   const businessId = useMemo(getBusinessId, []);
//   const withBiz = (cfg = {}) =>
//     businessId
//       ? {
//           ...cfg,
//           headers: { ...(cfg.headers || {}), "X-Business-Id": businessId },
//         }
//       : cfg;

//   // ===== Numbers API helpers =====
//   const listNumbers = async provider => {
//     const p = normalizeProvider(provider);
//     const { data } = await axiosClient.get(
//       `/whatsappsettings/${p}/numbers`,
//       withBiz()
//     );
//     return Array.isArray(data) ? data : [];
//   };

//   const upsertNumber = async (provider, row) => {
//     const p = normalizeProvider(provider);
//     const payload = {
//       phoneNumberId: (row.phoneNumberId || "").trim(),
//       whatsAppBusinessNumber: (row.whatsAppBusinessNumber || "").trim(),
//       senderDisplayName: (row.label || row.senderDisplayName || "").trim(),
//       isActive: row.isActive ?? true,
//       isDefault: !!row.isDefault,
//     };
//     const { data } = await axiosClient.post(
//       `/whatsappsettings/${p}/numbers`,
//       payload,
//       withBiz()
//     );
//     return data;
//   };

//   const deleteNumber = async (provider, id) => {
//     const p = normalizeProvider(provider);
//     await axiosClient.delete(`/whatsappsettings/${p}/numbers/${id}`, withBiz());
//   };

//   const setDefaultNumber = async (provider, id) => {
//     const p = normalizeProvider(provider);
//     await axiosClient.patch(
//       `/whatsappsettings/${p}/numbers/${id}/default`,
//       null,
//       withBiz()
//     );
//   };

//   const fetchNumbers = async provider => {
//     try {
//       const items = await listNumbers(provider);
//       setSenders(
//         items.map(n => ({
//           id: n.id,
//           label: n.senderDisplayName || "",
//           phoneNumberId: n.phoneNumberId || "",
//           whatsAppBusinessNumber: n.whatsAppBusinessNumber || "",
//           isDefault: !!n.isDefault,
//           isActive: n.isActive ?? true,
//         }))
//       );
//     } catch {
//       setSenders([]);
//     }
//   };

//   // ===== Derived UI =====
//   const providerLabel = useMemo(
//     () => secretLabelFor(formData.provider),
//     [formData.provider]
//   );
//   const selectedProvider = useMemo(
//     () => normalizeProvider(formData.provider),
//     [formData.provider]
//   );
//   const showFetchButton = hasSavedOnce;

//   // ===== ESU: load connection status =====
//   useEffect(() => {
//     const loadStatus = async () => {
//       if (!businessId) {
//         setEsuStatus(s => ({
//           ...s,
//           loading: false,
//           connected: false,
//           message: "Business context missing.",
//         }));
//         return;
//       }
//       try {
//         setEsuStatus(s => ({ ...s, loading: true }));
//         const res = await axiosClient.get(`/esu/facebook/status`, {
//           params: { businessId },
//         });
//         const dto = res?.data || {};
//         const connected =
//           !!dto.hasActiveMeta ||
//           !!dto.hasValidToken ||
//           (!!dto.hasToken && !!dto.wabaId);

//         setEsuStatus({
//           loading: false,
//           connected,
//           hasToken: !!dto.hasToken || !!dto.hasValidToken,
//           hasWaba: !!dto.wabaId,
//           phoneCount: dto.phoneCount || dto.numbersCount || 0,
//           message: dto.message || "",
//         });
//       } catch {
//         setEsuStatus({
//           loading: false,
//           connected: false,
//           hasToken: false,
//           hasWaba: false,
//           phoneCount: 0,
//           message: "Unable to load Meta connection status.",
//         });
//       }
//     };

//     loadStatus();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [businessId]);

//   // ===== Initial load of saved settings + numbers =====
//   useEffect(() => {
//     let mounted = true;
//     (async () => {
//       try {
//         setLoading(true);
//         const res = await axiosClient.get("/whatsappsettings/me", withBiz());
//         if (!mounted) return;
//         const data = res?.data ?? {};

//         const provider = normalizeProvider(data?.provider);
//         const secret = data?.apiKey || data?.apiToken || "";

//         setFormData(prev => ({
//           ...prev,
//           provider,
//           apiUrl: data?.apiUrl || "",
//           apiKey: secret,
//           wabaId: data?.wabaId || "",
//           senderDisplayName: data?.senderDisplayName || "",
//           webhookSecret: data?.webhookSecret || "",
//           webhookVerifyToken: data?.webhookVerifyToken || "",
//           webhookCallbackUrl: data?.webhookCallbackUrl || "",
//           isActive: data?.isActive ?? true,
//         }));

//         setSavedProvider(provider);

//         const existed =
//           !!data?.provider ||
//           !!data?.apiKey ||
//           !!data?.apiToken ||
//           !!data?.wabaId;
//         setHasSavedOnce(!!existed);

//         await fetchNumbers(provider);
//       } catch {
//         toast.info("ℹ️ No WhatsApp settings found. You can create them now.");
//         setHasSavedOnce(false);
//         setSavedProvider(null);
//       } finally {
//         mounted && setLoading(false);
//       }
//     })();

//     return () => {
//       mounted = false;
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // Refresh numbers when dropdown provider changes
//   useEffect(() => {
//     fetchNumbers(formData.provider);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [formData.provider]);

//   // Auto-fetch numbers when ESU redirect adds ?connected=1
//   useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     if (params.get("connected") === "1") {
//       (async () => {
//         try {
//           await handleFetchFromMeta();
//           toast.success("Meta connection completed. Numbers synced.");
//         } finally {
//           const url = new URL(window.location.href);
//           url.searchParams.delete("connected");
//           window.history.replaceState({}, "", url.toString());
//         }
//       })();
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // ===== Local sender mutations =====
//   const addSender = () =>
//     setSenders(s => [
//       ...s,
//       {
//         label: "",
//         phoneNumberId: "",
//         whatsAppBusinessNumber: "",
//         isDefault: s.length === 0,
//         isActive: true,
//       },
//     ]);

//   const removeSender = idx => setSenders(s => s.filter((_, i) => i !== idx));

//   const updateSender = (idx, key, value) =>
//     setSenders(s =>
//       s.map((row, i) => (i === idx ? { ...row, [key]: value } : row))
//     );

//   const setDefaultSenderLocal = idx =>
//     setSenders(s => s.map((row, i) => ({ ...row, isDefault: i === idx })));

//   // ===== Global form handlers =====
//   const handleChange = e => {
//     const { name, value } = e.target;
//     setFormData(p => ({ ...p, [name]: value }));
//   };

//   const handleToggle = e => {
//     const { name, checked } = e.target;
//     setFormData(p => ({ ...p, [name]: checked }));
//   };

//   const handleProviderChange = e => {
//     const provider = normalizeProvider(e.target.value);
//     setFormData(p => ({ ...p, provider }));
//   };

//   // ===== Save global settings =====
//   const validateBeforeSave = () => {
//     if (!formData.apiKey.trim()) {
//       toast.error("API Key / Token is required.");
//       return false;
//     }
//     return true;
//   };

//   const handleSaveGlobal = async () => {
//     if (!validateBeforeSave()) return;
//     try {
//       setSaving(true);
//       const payload = {
//         provider: normalizeProvider(formData.provider),
//         apiUrl: (formData.apiUrl || "").trim(),
//         apiKey: (formData.apiKey || "").trim(),
//         wabaId: (formData.wabaId || "").trim() || null,
//         senderDisplayName: (formData.senderDisplayName || "").trim() || null,
//         webhookSecret: (formData.webhookSecret || "").trim() || null,
//         webhookVerifyToken: (formData.webhookVerifyToken || "").trim() || null,
//         webhookCallbackUrl: (formData.webhookCallbackUrl || "").trim() || null,
//         isActive: !!formData.isActive,
//       };

//       await axiosClient.put("/whatsappsettings/update", payload, withBiz());

//       setHasSavedOnce(true);
//       setSavedProvider(payload.provider);

//       toast.success("Settings saved.");
//     } catch (err) {
//       toast.error(err?.response?.data?.message || "Failed to save settings.");
//     } finally {
//       setSaving(false);
//     }
//   };

//   // ===== Test connection using backend "current" settings =====
//   const handleTest = async () => {
//     setTesting(true);
//     setTestResult("");
//     try {
//       const res = await axiosClient.post(
//         "/whatsappsettings/test-connection/current",
//         {},
//         withBiz()
//       );
//       setTestResult(JSON.stringify(res?.data ?? {}, null, 2));
//       toast.success(res?.data?.message || "Connection test complete.");
//     } catch (err) {
//       setTestResult(
//         JSON.stringify(err?.response?.data ?? { error: String(err) }, null, 2)
//       );
//       toast.error(err?.response?.data?.message || "Connection test failed.");
//     } finally {
//       setTesting(false);
//     }
//   };

//   // ===== ESU: start Embedded Signup from Settings page =====
//   const startFacebookEsu = async () => {
//     try {
//       setConnectingEsu(true);

//       if (!businessId) {
//         toast.error("Business context missing. Please re-login.");
//         return;
//       }

//       const returnUrlAfterSuccess = "/app/settings/whatsapp";

//       const res = await axiosClient.post(
//         "/esu/facebook/start",
//         { returnUrlAfterSuccess },
//         {
//           headers: {
//             "X-Business-Id": businessId,
//           },
//         }
//       );

//       const authUrl =
//         res?.data?.data?.authUrl || res?.data?.authUrl || res?.data?.url;

//       if (!authUrl) {
//         toast.error(
//           res?.data?.message || "Could not get Meta Embedded Signup URL."
//         );
//         return;
//       }

//       window.location.href = authUrl;
//     } catch (err) {
//       toast.error(
//         err?.response?.data?.message ||
//           err?.message ||
//           "Failed to start Meta Embedded Signup."
//       );
//     } finally {
//       setConnectingEsu(false);
//     }
//   };

//   // ===== Fetch numbers via backend sync =====
//   const handleFetchFromMeta = async () => {
//     if (!formData.apiKey?.trim() || !formData.wabaId?.trim()) {
//       toast.warn(
//         "Please provide API Key/Token and WABA ID, then Save Settings."
//       );
//       return;
//     }
//     try {
//       setFetchingMeta(true);
//       const res = await axiosClient.post(
//         "/whatsappsettings/fetch-numbers",
//         {},
//         withBiz()
//       );

//       const serverBucket = normalizeProvider(res?.data?.provider);
//       const fallbackBucket = savedProvider || selectedProvider;
//       const bucket = serverBucket || fallbackBucket;

//       await fetchNumbers(bucket);

//       if (bucket && bucket !== selectedProvider) {
//         setFormData(p => ({ ...p, provider: bucket }));
//       }

//       const { added = 0, updated = 0, total = 0 } = res?.data || {};
//       toast.success(
//         `Synced — added ${added}, updated ${updated}, total ${total} (${bucket}).`
//       );
//     } catch (err) {
//       const msg =
//         err?.response?.data?.message || err?.message || "Fetch failed.";
//       toast.error(msg);
//     } finally {
//       setFetchingMeta(false);
//     }
//   };

//   // ===== Connection Status card UI =====
//   const renderConnectionStatus = () => {
//     if (esuStatus.loading) {
//       return (
//         <div className="mb-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
//           Checking Meta connection status…
//         </div>
//       );
//     }

//     if (!esuStatus.connected) {
//       return (
//         <div className="mb-5 rounded-2xl border border-red-100 bg-red-50/70 shadow-sm overflow-hidden">
//           <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2">
//             <span className="text-[10px] uppercase tracking-wide text-slate-500">
//               Connection Status
//             </span>
//           </div>
//           <div className="px-4 py-3 flex items-start gap-3">
//             <div className="mt-1">
//               <span className="w-3 h-3 inline-block rounded-full bg-red-500 mr-2" />
//             </div>
//             <div>
//               <div className="font-semibold text-red-600 mb-0.5">
//                 Not connected
//               </div>
//               <p className="text-xs text-slate-600 mb-2">
//                 No active Meta token detected. Use Embedded Signup to connect
//                 your WhatsApp Business Account.
//               </p>
//               <button
//                 type="button"
//                 onClick={startFacebookEsu}
//                 disabled={connectingEsu}
//                 className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-60"
//               >
//                 {connectingEsu
//                   ? "Opening Embedded Signup…"
//                   : "Connect via Facebook (Embedded Signup)"}
//               </button>
//             </div>
//           </div>
//         </div>
//       );
//     }

//     return (
//       <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 shadow-sm overflow-hidden">
//         <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
//           <span className="text-[10px] uppercase tracking-wide text-slate-500">
//             Connection Status
//           </span>
//           <span className="text-[10px] text-emerald-700">
//             Via Meta Embedded Signup
//           </span>
//         </div>
//         <div className="px-4 py-3 flex items-start gap-3">
//           <div className="mt-1">
//             <span className="w-3 h-3 inline-block rounded-full bg-emerald-500 mr-2" />
//           </div>
//           <div>
//             <div className="font-semibold text-emerald-700 mb-0.5">
//               Connected
//             </div>
//             <p className="text-xs text-slate-700">
//               Valid Meta token detected
//               {esuStatus.phoneCount
//                 ? ` · ${esuStatus.phoneCount} phone${
//                     esuStatus.phoneCount > 1 ? "s" : ""
//                   } synced`
//                 : ""}
//               {esuStatus.hasWaba ? " · WABA configured" : ""}.
//             </p>
//             <div className="mt-2 flex flex-wrap gap-2">
//               <button
//                 type="button"
//                 onClick={startFacebookEsu}
//                 disabled={connectingEsu}
//                 className="px-3 py-1.5 rounded-md bg-white text-emerald-700 border border-emerald-300 text-xs font-semibold hover:bg-emerald-50 disabled:opacity-60"
//               >
//                 {connectingEsu
//                   ? "Opening Embedded Signup…"
//                   : "Manage connection (Embedded Signup)"}
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   // ===== Render =====
//   return (
//     <div className="max-w-5xl mx-auto px-4 py-6">
//       <div className="flex items-center justify-between mb-3">
//         <h1 className="text-xl font-semibold text-slate-900">
//           WhatsApp Settings
//         </h1>

//         <div className="flex gap-2">
//           <button
//             type="button"
//             onClick={handleSaveGlobal}
//             disabled={saving}
//             className={`px-4 py-2 rounded-md text-sm ${
//               saving
//                 ? "bg-gray-300 text-gray-600"
//                 : "bg-emerald-600 hover:bg-emerald-700 text-white"
//             }`}
//           >
//             {saving ? "Saving…" : "Save Settings"}
//           </button>

//           <button
//             type="button"
//             onClick={handleTest}
//             disabled={testing}
//             className={`px-4 py-2 rounded-md text-sm ${
//               testing
//                 ? "bg-gray-200 text-gray-500"
//                 : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
//             }`}
//           >
//             {testing ? "Testing…" : "Test Connection"}
//           </button>
//         </div>
//       </div>

//       {renderConnectionStatus()}

//       {loading && (
//         <div className="text-xs text-gray-500 mb-4">Loading settings…</div>
//       )}

//       {/* GLOBAL provider-level settings */}
//       <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
//         <div className="md:col-span-4">
//           <label className="text-xs text-gray-600 block mb-1">Provider</label>
//           <select
//             name="provider"
//             value={normalizeProvider(formData.provider)}
//             onChange={handleProviderChange}
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           >
//             {PROVIDERS.map(p => (
//               <option key={p.value} value={p.value}>
//                 {p.label}
//               </option>
//             ))}
//           </select>
//         </div>

//         <div className="md:col-span-4">
//           <label className="text-xs text-gray-600 block mb-1">
//             API URL (optional)
//           </label>
//           <input
//             type="text"
//             name="apiUrl"
//             value={formData.apiUrl}
//             onChange={handleChange}
//             placeholder="https://graph.facebook.com/v20.0 or provider URL"
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           />
//         </div>

//         <div className="md:col-span-4">
//           <label className="text-xs text-gray-600 block mb-1">
//             {providerLabel}
//           </label>
//           <input
//             type="text"
//             name="apiKey"
//             value={formData.apiKey}
//             onChange={handleChange}
//             placeholder={providerLabel}
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           />
//         </div>

//         <div className="md:col-span-4">
//           <label className="text-xs text-gray-600 block mb-1">
//             WABA ID (Meta only)
//           </label>
//           <input
//             type="text"
//             name="wabaId"
//             value={formData.wabaId}
//             onChange={handleChange}
//             placeholder="e.g. 123456789012345"
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           />
//         </div>

//         <div className="md:col-span-4">
//           <label className="text-xs text-gray-600 block mb-1">
//             Sender Display Name (optional)
//           </label>
//           <input
//             type="text"
//             name="senderDisplayName"
//             value={formData.senderDisplayName}
//             onChange={handleChange}
//             placeholder="e.g. Acme Support"
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           />
//         </div>

//         <div className="md:col-span-4">
//           <label className="text-xs text-gray-600 block mb-1">
//             Webhook Verify Token
//           </label>
//           <input
//             type="text"
//             name="webhookVerifyToken"
//             value={formData.webhookVerifyToken}
//             onChange={handleChange}
//             placeholder="verify-token"
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           />
//         </div>

//         <div className="md:col-span-4">
//           <label className="text-xs text-gray-600 block mb-1">
//             Webhook Secret
//           </label>
//           <input
//             type="text"
//             name="webhookSecret"
//             value={formData.webhookSecret}
//             onChange={handleChange}
//             placeholder="secret"
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           />
//         </div>

//         <div className="md:col-span-8">
//           <label className="text-xs text-gray-600 block mb-1">
//             Webhook Callback URL
//           </label>
//           <input
//             type="text"
//             name="webhookCallbackUrl"
//             value={formData.webhookCallbackUrl}
//             onChange={handleChange}
//             placeholder="https://example.com/api/webhooks/whatsapp"
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           />
//         </div>

//         <div className="md:col-span-4 flex items-end">
//           <label className="inline-flex items-center gap-2 text-sm text-gray-700">
//             <input
//               type="checkbox"
//               name="isActive"
//               checked={!!formData.isActive}
//               onChange={handleToggle}
//               className="h-4 w-4"
//             />
//             Active
//           </label>
//         </div>
//       </div>

//       {/* SENDERS */}
//       <div className="mt-8 border-t pt-6">
//         <div className="flex items-center justify-between mb-3">
//           <h3 className="text-sm font-semibold text-gray-700">
//             Senders (phone numbers)
//           </h3>

//           <div className="flex gap-2">
//             {showFetchButton && (
//               <button
//                 type="button"
//                 onClick={handleFetchFromMeta}
//                 disabled={fetchingMeta}
//                 className={`px-3 py-1.5 rounded-md text-sm ${
//                   fetchingMeta
//                     ? "bg-gray-200 text-gray-500"
//                     : "bg-emerald-600 text-white hover:bg-emerald-700"
//                 }`}
//               >
//                 {fetchingMeta ? "Fetching…" : "Fetch from Meta"}
//               </button>
//             )}
//             <button
//               type="button"
//               onClick={addSender}
//               className="px-3 py-1.5 rounded-md text-sm bg-gray-100 hover:bg-gray-200"
//             >
//               + Add number
//             </button>
//           </div>
//         </div>

//         {senders.length === 0 && (
//           <div className="text-xs text-gray-500 mb-2">
//             No senders yet. Use <b>Fetch from Meta</b> after connecting, or{" "}
//             <b>+ Add number</b> to configure manually.
//           </div>
//         )}

//         <div className="space-y-3">
//           {senders.map((row, idx) => (
//             <div
//               key={idx}
//               className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-gray-50 p-3 rounded"
//             >
//               <div className="md:col-span-3">
//                 <label className="text-xs text-gray-600 block mb-1">
//                   Label (optional)
//                 </label>
//                 <input
//                   type="text"
//                   value={row.label || ""}
//                   onChange={e => updateSender(idx, "label", e.target.value)}
//                   placeholder="e.g. Sales India"
//                   className="w-full px-3 py-1.5 border rounded-md text-sm border-gray-300"
//                 />
//               </div>

//               <div className="md:col-span-4">
//                 <label className="text-xs text-gray-600 block mb-1">
//                   WhatsApp Business Number
//                 </label>
//                 <input
//                   type="text"
//                   value={row.whatsAppBusinessNumber || ""}
//                   onChange={e =>
//                     updateSender(idx, "whatsAppBusinessNumber", e.target.value)
//                   }
//                   placeholder="+14150000001"
//                   className="w-full px-3 py-1.5 border rounded-md text-sm border-gray-300"
//                 />
//               </div>

//               <div className="md:col-span-4">
//                 <label className="text-xs text-gray-600 block mb-1">
//                   Phone Number ID
//                 </label>
//                 <input
//                   type="text"
//                   value={row.phoneNumberId || ""}
//                   onChange={e =>
//                     updateSender(idx, "phoneNumberId", e.target.value)
//                   }
//                   placeholder="1234567890"
//                   className="w-full px-3 py-1.5 border rounded-md text-sm border-gray-300"
//                 />
//               </div>

//               <div className="md:col-span-1 flex items-end gap-2 flex-wrap">
//                 <button
//                   type="button"
//                   onClick={async () => {
//                     try {
//                       const saved = await upsertNumber(formData.provider, row);
//                       setSenders(s =>
//                         s.map((r, i) =>
//                           i === idx ? { ...r, id: saved?.id || r.id } : r
//                         )
//                       );
//                       toast.success("Sender saved.");
//                     } catch {
//                       toast.error("Save failed.");
//                     }
//                   }}
//                   className="px-2 py-1 rounded text-xs bg-blue-600 text-white"
//                 >
//                   Save
//                 </button>

//                 <button
//                   type="button"
//                   onClick={async () => {
//                     try {
//                       if (!row.id) {
//                         removeSender(idx);
//                         return;
//                       }
//                       await deleteNumber(formData.provider, row.id);
//                       removeSender(idx);
//                       toast.success("Sender deleted.");
//                     } catch {
//                       toast.error("Delete failed.");
//                     }
//                   }}
//                   className="px-2 py-1 rounded text-xs bg-red-50 text-red-700"
//                 >
//                   ✕
//                 </button>

//                 <button
//                   type="button"
//                   onClick={async () => {
//                     try {
//                       if (!row.id) {
//                         const saved = await upsertNumber(
//                           formData.provider,
//                           row
//                         );
//                         await setDefaultNumber(formData.provider, saved?.id);
//                       } else {
//                         await setDefaultNumber(formData.provider, row.id);
//                       }
//                       setDefaultSenderLocal(idx);
//                       toast.success("Default sender set.");
//                     } catch {
//                       toast.error("Failed to set default.");
//                     }
//                   }}
//                   className={`px-2 py-1 rounded text-xs ${
//                     row.isDefault
//                       ? "bg-emerald-600 text-white"
//                       : "bg-gray-200 text-gray-800"
//                   }`}
//                 >
//                   {row.isDefault ? "Default" : "Make default"}
//                 </button>
//               </div>
//             </div>
//           ))}
//         </div>

//         <p className="text-[11px] text-gray-500 mt-2">
//           The <b>Default</b> sender will be used when no phone is chosen
//           explicitly while sending.
//         </p>
//       </div>

//       {testResult && (
//         <div className="mt-6">
//           <label className="text-xs text-gray-600 block mb-1">
//             Test Result
//           </label>
//           <pre className="text-xs bg-gray-50 border border-gray-200 p-3 rounded overflow-auto">
//             {testResult}
//           </pre>
//         </div>
//       )}
//     </div>
//   );
// }

// // 📄 src/pages/Settings/WhatsAppSettings.jsx
// import React, { useState, useEffect, useMemo } from "react";
// import axiosClient from "../../api/axiosClient";
// import { toast } from "react-toastify";

// // === Canonical providers (MUST match backend exactly) ===
// const PROVIDERS = [
//   { value: "PINNACLE", label: "PINNACLE" },
//   { value: "META_CLOUD", label: "META_CLOUD" },
// ];

// // --- BusinessId helper (unchanged) ---
// const TOKEN_KEY = "xbyte_token";
// const GUID_RE =
//   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// function getBusinessId() {
//   try {
//     const saved = localStorage.getItem("business_id");
//     if (saved && GUID_RE.test(saved)) return saved;

//     const jwt = localStorage.getItem(TOKEN_KEY);
//     if (!jwt) return null;

//     const [, payloadB64] = jwt.split(".");
//     if (!payloadB64) return null;

//     const payload = JSON.parse(
//       atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
//     );

//     const bid =
//       payload?.BusinessId ||
//       payload?.businessId ||
//       payload?.biz ||
//       payload?.bid ||
//       null;

//     return typeof bid === "string" && GUID_RE.test(bid) ? bid : null;
//   } catch {
//     return null;
//   }
// }

// // Map any input to UPPERCASE canonical values
// const normalizeProvider = p => {
//   const raw = (p ?? "").toString().trim();
//   if (!raw) return "PINNACLE";
//   const up = raw.toUpperCase();
//   if (up === "PINNACLE") return "PINNACLE";
//   if (
//     up === "META_CLOUD" ||
//     up === "META" ||
//     up === "METACLOUD" ||
//     up === "META-CLOUD"
//   )
//     return "META_CLOUD";
//   return "PINNACLE";
// };

// // UI label per provider (still binds to apiKey)
// const secretLabelFor = provider =>
//   normalizeProvider(provider) === "PINNACLE" ? "API Key" : "Token";

// // Initial blank form (GLOBAL SETTINGS ONLY)
// const blank = {
//   provider: "PINNACLE",
//   apiUrl: "",
//   apiKey: "",
//   wabaId: "",
//   senderDisplayName: "",
//   webhookSecret: "",
//   webhookVerifyToken: "",
//   webhookCallbackUrl: "",
//   isActive: true,
// };

// export default function WhatsAppSettings() {
//   const [formData, setFormData] = useState(blank);
//   const [loading, setLoading] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [testing, setTesting] = useState(false);
//   const [testResult, setTestResult] = useState("");
//   const [senders, setSenders] = useState([]);
//   const [fetchingMeta, setFetchingMeta] = useState(false);
//   const [hasSavedOnce, setHasSavedOnce] = useState(false);
//   const [savedProvider, setSavedProvider] = useState(null);

//   // ESU status + launch
//   const [esuStatusLoading, setEsuStatusLoading] = useState(false);
//   const [esuConnected, setEsuConnected] = useState(false);
//   const [esuExpiresAt, setEsuExpiresAt] = useState(null);
//   const [esuWillExpireSoon, setEsuWillExpireSoon] = useState(false);
//   const [startingEsu, setStartingEsu] = useState(false);

//   const businessId = useMemo(getBusinessId, []);
//   const withBiz = (cfg = {}) =>
//     businessId
//       ? {
//           ...cfg,
//           headers: { ...(cfg.headers || {}), "X-Business-Id": businessId },
//         }
//       : cfg;

//   // ===== Numbers API helpers (DB-backed) =====
//   const listNumbers = async provider => {
//     const p = normalizeProvider(provider);
//     const { data } = await axiosClient.get(
//       `/whatsappsettings/${p}/numbers`,
//       withBiz()
//     );
//     return Array.isArray(data) ? data : [];
//   };

//   const upsertNumber = async (provider, row) => {
//     const p = normalizeProvider(provider);
//     const payload = {
//       phoneNumberId: (row.phoneNumberId || "").trim(),
//       whatsAppBusinessNumber: (row.whatsAppBusinessNumber || "").trim(),
//       senderDisplayName: (row.label || row.senderDisplayName || "").trim(),
//       isActive: row.isActive ?? true,
//       isDefault: !!row.isDefault,
//     };
//     const { data } = await axiosClient.post(
//       `/whatsappsettings/${p}/numbers`,
//       payload,
//       withBiz()
//     );
//     return data;
//   };

//   const deleteNumber = async (provider, id) => {
//     const p = normalizeProvider(provider);
//     await axiosClient.delete(`/whatsappsettings/${p}/numbers/${id}`, withBiz());
//   };

//   const setDefaultNumber = async (provider, id) => {
//     const p = normalizeProvider(provider);
//     await axiosClient.patch(
//       `/whatsappsettings/${p}/numbers/${id}/default`,
//       null,
//       withBiz()
//     );
//   };

//   const fetchNumbers = async provider => {
//     try {
//       const items = await listNumbers(provider);
//       setSenders(
//         items.map(n => ({
//           id: n.id,
//           label: n.senderDisplayName || "",
//           phoneNumberId: n.phoneNumberId || "",
//           whatsAppBusinessNumber: n.whatsAppBusinessNumber || "",
//           isDefault: !!n.isDefault,
//           isActive: n.isActive ?? true,
//         }))
//       );
//     } catch {
//       // ignore; empty list is fine
//     }
//   };

//   // ===== Derived UI =====
//   const providerLabel = useMemo(
//     () => secretLabelFor(formData.provider),
//     [formData.provider]
//   );
//   const selectedProvider = useMemo(
//     () => normalizeProvider(formData.provider),
//     [formData.provider]
//   );

//   const showFetchButton = hasSavedOnce;

//   // ===== Initial load of saved settings + initial numbers =====
//   useEffect(() => {
//     let mounted = true;

//     (async () => {
//       try {
//         setLoading(true);
//         const res = await axiosClient.get("/whatsappsettings/me", withBiz());
//         if (!mounted) return;

//         const data = res?.data ?? {};
//         const provider = normalizeProvider(data?.provider);
//         const secret = data?.apiKey || data?.apiToken || "";

//         setFormData(prev => ({
//           ...prev,
//           provider,
//           apiUrl: data?.apiUrl || "",
//           apiKey: secret,
//           wabaId: data?.wabaId || "",
//           senderDisplayName: data?.senderDisplayName || "",
//           webhookSecret: data?.webhookSecret || "",
//           webhookVerifyToken: data?.webhookVerifyToken || "",
//           webhookCallbackUrl: data?.webhookCallbackUrl || "",
//           isActive: data?.isActive ?? true,
//         }));

//         setSavedProvider(provider);

//         const existed =
//           !!data?.provider ||
//           !!data?.apiKey ||
//           !!data?.apiToken ||
//           !!data?.wabaId;
//         setHasSavedOnce(!!existed);

//         await fetchNumbers(provider);
//       } catch {
//         toast.info("No WhatsApp settings found. You can configure them now.");
//         setHasSavedOnce(false);
//         setSavedProvider(null);
//       } finally {
//         mounted && setLoading(false);
//       }
//     })();

//     return () => {
//       mounted = false;
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // ===== ESU connection status (debug endpoint) =====
//   useEffect(() => {
//     if (!businessId) return;
//     let cancelled = false;

//     (async () => {
//       try {
//         setEsuStatusLoading(true);
//         const res = await axiosClient.get("esu/facebook/debug/status", {
//           params: { businessId },
//           ...withBiz(),
//         });

//         if (cancelled) return;
//         const dto = res?.data ?? {};

//         const connected =
//           dto.Connected ?? dto.connected ?? dto.connected === true;
//         setEsuConnected(!!connected);

//         const expires =
//           dto.TokenExpiresAtUtc ||
//           dto.tokenExpiresAtUtc ||
//           dto.expiresAtUtc ||
//           null;
//         setEsuExpiresAt(expires || null);

//         const soon = dto.WillExpireSoon ?? dto.willExpireSoon ?? false;
//         setEsuWillExpireSoon(!!soon);
//       } catch {
//         if (!cancelled) {
//           // Silent: we just show "Not connected"
//           setEsuConnected(false);
//           setEsuExpiresAt(null);
//           setEsuWillExpireSoon(false);
//         }
//       } finally {
//         !cancelled && setEsuStatusLoading(false);
//       }
//     })();

//     return () => {
//       cancelled = true;
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [businessId]);

//   // Refresh numbers when provider dropdown changes
//   useEffect(() => {
//     fetchNumbers(formData.provider);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [formData.provider]);

//   // Auto-sync after ESU redirect (?connected=1)
//   useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     if (params.get("connected") === "1") {
//       (async () => {
//         try {
//           await handleFetchFromMeta();
//           toast.success("Meta Embedded Signup completed. Numbers synced.");
//         } finally {
//           const url = new URL(window.location.href);
//           url.searchParams.delete("connected");
//           window.history.replaceState({}, "", url.toString());
//         }
//       })();
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // ===== Local sender mutations =====
//   const addSender = () =>
//     setSenders(s => [
//       ...s,
//       {
//         label: "",
//         phoneNumberId: "",
//         whatsAppBusinessNumber: "",
//         isDefault: s.length === 0,
//         isActive: true,
//       },
//     ]);

//   const removeSender = idx => setSenders(s => s.filter((_, i) => i !== idx));

//   const updateSender = (idx, key, value) =>
//     setSenders(s =>
//       s.map((row, i) => (i === idx ? { ...row, [key]: value } : row))
//     );

//   const setDefaultSender = idx =>
//     setSenders(s => s.map((row, i) => ({ ...row, isDefault: i === idx })));

//   // ===== Global form handlers =====
//   const handleChange = e => {
//     const { name, value } = e.target;
//     setFormData(p => ({ ...p, [name]: value }));
//   };

//   const handleToggle = e => {
//     const { name, checked } = e.target;
//     setFormData(p => ({ ...p, [name]: checked }));
//   };

//   const handleProviderChange = e => {
//     const provider = normalizeProvider(e.target.value);
//     setFormData(p => ({ ...p, provider }));
//   };

//   // ===== Save global settings ONLY =====
//   const validateBeforeSave = () => {
//     if (!formData.apiKey.trim()) {
//       toast.error("API Key / Token is required.");
//       return false;
//     }
//     return true;
//   };

//   const handleSaveGlobal = async () => {
//     if (!validateBeforeSave()) return;

//     try {
//       setSaving(true);

//       const payload = {
//         provider: normalizeProvider(formData.provider),
//         apiUrl: (formData.apiUrl || "").trim(),
//         apiKey: (formData.apiKey || "").trim(),
//         wabaId: (formData.wabaId || "").trim() || null,
//         senderDisplayName: (formData.senderDisplayName || "").trim() || null,
//         webhookSecret: (formData.webhookSecret || "").trim() || null,
//         webhookVerifyToken: (formData.webhookVerifyToken || "").trim() || null,
//         webhookCallbackUrl: (formData.webhookCallbackUrl || "").trim() || null,
//         isActive: !!formData.isActive,
//       };

//       await axiosClient.put("/whatsappsettings/update", payload, withBiz());

//       setHasSavedOnce(true);
//       setSavedProvider(payload.provider);

//       toast.success("Settings saved.");
//     } catch {
//       toast.error("Failed to save settings.");
//     } finally {
//       setSaving(false);
//     }
//   };

//   // ===== Test connection against SAVED settings =====
//   const handleTest = async () => {
//     setTesting(true);
//     setTestResult("");
//     try {
//       const res = await axiosClient.post(
//         "/whatsappsettings/test-connection/current",
//         {},
//         withBiz()
//       );
//       setTestResult(JSON.stringify(res?.data ?? {}, null, 2));
//       toast.success(res?.data?.message || "Connection test complete.");
//     } catch (err) {
//       setTestResult(
//         JSON.stringify(err?.response?.data ?? { error: String(err) }, null, 2)
//       );
//       toast.error(err?.response?.data?.message || "Connection test failed.");
//     } finally {
//       setTesting(false);
//     }
//   };

//   // ===== Fetch numbers using SAVED provider (Meta sync) =====
//   const handleFetchFromMeta = async () => {
//     if (!formData.apiKey?.trim() || !formData.wabaId?.trim()) {
//       toast.warn(
//         "Please provide API Key/Token and WABA ID, then Save Settings."
//       );
//       return;
//     }

//     try {
//       setFetchingMeta(true);

//       const res = await axiosClient.post(
//         "/whatsappsettings/fetch-numbers",
//         {},
//         withBiz()
//       );

//       const serverBucket = normalizeProvider(res?.data?.provider);
//       const fallbackBucket = savedProvider || selectedProvider;
//       const bucket = serverBucket || fallbackBucket;

//       await fetchNumbers(bucket);

//       if (bucket && bucket !== selectedProvider) {
//         setFormData(p => ({ ...p, provider: bucket }));
//       }

//       const { added = 0, updated = 0, total = 0 } = res?.data || {};
//       toast.success(
//         `Synced — added ${added}, updated ${updated}, total ${total} (${bucket}).`
//       );
//     } catch (err) {
//       const msg =
//         err?.response?.data?.message || err?.message || "Fetch failed.";
//       toast.error(msg);
//     } finally {
//       setFetchingMeta(false);
//     }
//   };

//   // ===== Start Meta Embedded Signup (ESU) =====
//   const startEmbeddedSignup = async () => {
//     try {
//       if (!businessId) {
//         toast.error("Business context missing. Please re-login.");
//         return;
//       }

//       setStartingEsu(true);

//       const res = await axiosClient.post(
//         "esu/facebook/start",
//         { returnUrlAfterSuccess: "/app/settings/whatsapp" },
//         withBiz()
//       );

//       const authUrl =
//         res?.data?.data?.authUrl || res?.data?.authUrl || res?.data?.url;

//       if (!authUrl) {
//         toast.error(
//           res?.data?.message || "Could not get Meta Embedded Signup URL."
//         );
//         return;
//       }

//       window.location.href = authUrl;
//     } catch (err) {
//       const msg =
//         err?.response?.data?.message ||
//         err?.message ||
//         "Failed to start Meta Embedded Signup.";
//       toast.error(msg);
//     } finally {
//       setStartingEsu(false);
//     }
//   };

//   // ===== RENDER =====
//   return (
//     <div className="max-w-5xl mx-auto px-4 py-6">
//       <div className="flex items-center justify-between mb-4">
//         <h1 className="text-xl font-semibold">WhatsApp Settings</h1>

//         <div className="flex gap-2">
//           <button
//             type="button"
//             onClick={handleSaveGlobal}
//             disabled={saving}
//             className={`px-4 py-2 rounded-md text-sm ${
//               saving
//                 ? "bg-gray-300 text-gray-600"
//                 : "bg-blue-600 hover:bg-blue-700 text-white"
//             }`}
//             title="Save global settings"
//           >
//             {saving ? "Saving…" : "Save Settings"}
//           </button>

//           <button
//             type="button"
//             onClick={handleTest}
//             disabled={testing}
//             className={`px-4 py-2 rounded-md text-sm ${
//               testing
//                 ? "bg-gray-200 text-gray-500"
//                 : "bg-gray-100 hover:bg-gray-200 text-gray-800"
//             }`}
//             title="Test connection using saved settings"
//           >
//             {testing ? "Testing…" : "Test Connection"}
//           </button>
//         </div>
//       </div>

//       {/* ESU Connection Status */}
//       <div className="mb-6">
//         <div
//           className={`relative rounded-2xl border-2 shadow-sm overflow-hidden ${
//             esuConnected
//               ? "border-emerald-500 bg-emerald-50"
//               : "border-red-400 bg-red-50/40"
//           }`}
//         >
//           <div
//             className={`absolute left-0 top-0 bottom-0 w-2 ${
//               esuConnected ? "bg-emerald-500" : "bg-red-500"
//             }`}
//           />
//           <div className="px-5 pt-3 pb-4 ml-3">
//             <div className="flex items-center justify-between gap-4">
//               <div>
//                 <div className="text-xs font-semibold tracking-wide text-slate-500">
//                   CONNECTION STATUS
//                 </div>

//                 {esuStatusLoading ? (
//                   <div className="mt-1 text-sm text-slate-600">
//                     Checking Meta connection…
//                   </div>
//                 ) : esuConnected ? (
//                   <>
//                     <div className="mt-1 flex items-center gap-2 text-emerald-700 font-semibold">
//                       <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
//                       Connected via Meta Embedded Signup
//                     </div>
//                     {esuExpiresAt && (
//                       <div className="text-[11px] text-slate-600 mt-1">
//                         Token valid until{" "}
//                         <span className="font-medium">
//                           {new Date(esuExpiresAt).toLocaleString()}
//                         </span>
//                         {esuWillExpireSoon ? " (will expire soon)" : ""}.
//                       </div>
//                     )}
//                   </>
//                 ) : (
//                   <>
//                     <div className="mt-1 flex items-center gap-2 text-red-600 font-semibold">
//                       <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
//                       Not connected to Meta
//                     </div>
//                     <div className="text-[11px] text-slate-600 mt-1">
//                       No active Meta ESU token detected for this workspace. Use
//                       Embedded Signup to connect your WhatsApp Business Account
//                       and auto-sync WABA and phone numbers.
//                     </div>
//                   </>
//                 )}
//               </div>

//               <div className="flex flex-col items-end gap-1">
//                 <button
//                   type="button"
//                   onClick={startEmbeddedSignup}
//                   disabled={startingEsu}
//                   className={`px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm disabled:opacity-60 ${
//                     esuConnected
//                       ? "bg-emerald-600 hover:bg-emerald-700 text-white"
//                       : "bg-red-500 hover:bg-red-600 text-white"
//                   }`}
//                 >
//                   {startingEsu
//                     ? "Opening Meta…"
//                     : esuConnected
//                     ? "Reconnect via Embedded Signup"
//                     : "Connect via Embedded Signup"}
//                 </button>

//                 {!esuConnected && (
//                   <span className="text-[10px] text-slate-500">
//                     Uses Meta’s official flow in a new window.
//                   </span>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {loading && (
//         <div className="text-sm text-gray-500 mb-4">Loading settings…</div>
//       )}

//       {/* GLOBAL provider-level settings */}
//       <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
//         <div className="md:col-span-4">
//           <label className="text-xs text-gray-600 block mb-1">Provider</label>
//           <select
//             name="provider"
//             value={normalizeProvider(formData.provider)}
//             onChange={handleProviderChange}
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           >
//             {PROVIDERS.map(p => (
//               <option key={p.value} value={p.value}>
//                 {p.label}
//               </option>
//             ))}
//           </select>
//         </div>

//         <div className="md:col-span-4">
//           <label className="text-xs text-gray-600 block mb-1">
//             API URL (optional)
//           </label>
//           <input
//             type="text"
//             name="apiUrl"
//             value={formData.apiUrl}
//             onChange={handleChange}
//             placeholder="https://graph.facebook.com/v20.0 or provider URL"
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           />
//         </div>

//         <div className="md:col-span-4">
//           <label className="text-xs text-gray-600 block mb-1">
//             {providerLabel}
//           </label>
//           <input
//             type="text"
//             name="apiKey"
//             value={formData.apiKey}
//             onChange={handleChange}
//             placeholder={providerLabel}
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           />
//         </div>

//         <div className="md:col-span-4">
//           <label className="text-xs text-gray-600 block mb-1">
//             WABA ID (Meta only)
//           </label>
//           <input
//             type="text"
//             name="wabaId"
//             value={formData.wabaId}
//             onChange={handleChange}
//             placeholder="e.g. 123456789012345"
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           />
//         </div>

//         <div className="md:col-span-4">
//           <label className="text-xs text-gray-600 block mb-1">
//             Sender Display Name (optional)
//           </label>
//           <input
//             type="text"
//             name="senderDisplayName"
//             value={formData.senderDisplayName}
//             onChange={handleChange}
//             placeholder="e.g. Acme Support"
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           />
//         </div>

//         <div className="md:col-span-4">
//           <label className="text-xs text-gray-600 block mb-1">
//             Webhook Verify Token
//           </label>
//           <input
//             type="text"
//             name="webhookVerifyToken"
//             value={formData.webhookVerifyToken}
//             onChange={handleChange}
//             placeholder="verify-token"
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           />
//         </div>

//         <div className="md:col-span-4">
//           <label className="text-xs text-gray-600 block mb-1">
//             Webhook Secret
//           </label>
//           <input
//             type="text"
//             name="webhookSecret"
//             value={formData.webhookSecret}
//             onChange={handleChange}
//             placeholder="secret"
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           />
//         </div>

//         <div className="md:col-span-8">
//           <label className="text-xs text-gray-600 block mb-1">
//             Webhook Callback URL
//           </label>
//           <input
//             type="text"
//             name="webhookCallbackUrl"
//             value={formData.webhookCallbackUrl}
//             onChange={handleChange}
//             placeholder="https://example.com/api/webhooks/whatsapp"
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           />
//         </div>

//         <div className="md:col-span-4 flex items-end">
//           <label className="inline-flex items-center gap-2 text-sm text-gray-700">
//             <input
//               type="checkbox"
//               name="isActive"
//               checked={!!formData.isActive}
//               onChange={handleToggle}
//               className="h-4 w-4"
//             />
//             Active
//           </label>
//         </div>
//       </div>

//       {/* SENDERS (phone numbers) */}
//       <div className="mt-8 border-t pt-6">
//         <div className="flex items-center justify-between mb-3">
//           <h3 className="text-sm font-semibold text-gray-700">
//             Senders (multiple numbers)
//           </h3>

//           <div className="flex gap-2">
//             {showFetchButton && (
//               <button
//                 type="button"
//                 onClick={handleFetchFromMeta}
//                 disabled={fetchingMeta}
//                 className={`px-3 py-1.5 rounded-md text-sm ${
//                   fetchingMeta
//                     ? "bg-gray-200 text-gray-500"
//                     : "bg-green-600 text-white hover:bg-green-700"
//                 }`}
//                 title="Fetch phone numbers from Meta / provider"
//               >
//                 {fetchingMeta ? "Fetching…" : "Fetch from Meta"}
//               </button>
//             )}
//             <button
//               type="button"
//               onClick={addSender}
//               className="px-3 py-1.5 rounded-md text-sm bg-gray-100 hover:bg-gray-200"
//             >
//               + Add number
//             </button>
//           </div>
//         </div>

//         {senders.length === 0 && (
//           <div className="text-xs text-gray-500 mb-2">
//             No senders yet. Use <b>Connect via Embedded Signup</b> to auto-sync
//             numbers, or click <b>+ Add number</b> to configure manually.
//           </div>
//         )}

//         <div className="space-y-3">
//           {senders.map((row, idx) => (
//             <div
//               key={idx}
//               className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-gray-50 p-3 rounded"
//             >
//               <div className="md:col-span-3">
//                 <label className="text-xs text-gray-600 block mb-1">
//                   Label (optional)
//                 </label>
//                 <input
//                   type="text"
//                   value={row.label || ""}
//                   onChange={e => updateSender(idx, "label", e.target.value)}
//                   placeholder="e.g. Sales India"
//                   className="w-full px-3 py-1.5 border rounded-md text-sm border-gray-300"
//                 />
//               </div>

//               <div className="md:col-span-4">
//                 <label className="text-xs text-gray-600 block mb-1">
//                   WhatsApp Business Number
//                 </label>
//                 <input
//                   type="text"
//                   value={row.whatsAppBusinessNumber || ""}
//                   onChange={e =>
//                     updateSender(idx, "whatsAppBusinessNumber", e.target.value)
//                   }
//                   placeholder="+14150000001"
//                   className="w-full px-3 py-1.5 border rounded-md text-sm border-gray-300"
//                 />
//               </div>

//               <div className="md:col-span-4">
//                 <label className="text-xs text-gray-600 block mb-1">
//                   Phone Number ID
//                 </label>
//                 <input
//                   type="text"
//                   value={row.phoneNumberId || ""}
//                   onChange={e =>
//                     updateSender(idx, "phoneNumberId", e.target.value)
//                   }
//                   placeholder="1234567890"
//                   className="w-full px-3 py-1.5 border rounded-md text-sm border-gray-300"
//                 />
//               </div>

//               <div className="md:col-span-1 flex items-end gap-2 flex-wrap">
//                 <button
//                   type="button"
//                   onClick={async () => {
//                     try {
//                       const saved = await upsertNumber(formData.provider, row);
//                       setSenders(s =>
//                         s.map((r, i) =>
//                           i === idx ? { ...r, id: saved?.id || r.id } : r
//                         )
//                       );
//                       toast.success("Saved.");
//                     } catch {
//                       toast.error("Save failed.");
//                     }
//                   }}
//                   className="px-2 py-1 rounded text-xs bg-blue-600 text-white"
//                   title="Save this sender"
//                 >
//                   Save
//                 </button>

//                 <button
//                   type="button"
//                   onClick={async () => {
//                     try {
//                       if (!row.id) {
//                         removeSender(idx);
//                         return;
//                       }
//                       await deleteNumber(formData.provider, row.id);
//                       removeSender(idx);
//                       toast.success("Deleted.");
//                     } catch {
//                       toast.error("Delete failed.");
//                     }
//                   }}
//                   className="px-2 py-1 rounded text-xs bg-red-50 text-red-700"
//                   title="Remove"
//                 >
//                   ✕
//                 </button>

//                 <button
//                   type="button"
//                   onClick={async () => {
//                     try {
//                       if (!row.id) {
//                         const saved = await upsertNumber(
//                           formData.provider,
//                           row
//                         );
//                         await setDefaultNumber(formData.provider, saved?.id);
//                       } else {
//                         await setDefaultNumber(formData.provider, row.id);
//                       }
//                       setDefaultSender(idx);
//                       toast.success("Default set.");
//                     } catch {
//                       toast.error("Failed to set default.");
//                     }
//                   }}
//                   className={`px-2 py-1 rounded text-xs ${
//                     row.isDefault ? "bg-green-600 text-white" : "bg-gray-200"
//                   }`}
//                   title="Set as default sender"
//                 >
//                   {row.isDefault ? "Default" : "Make default"}
//                 </button>
//               </div>
//             </div>
//           ))}
//         </div>

//         <p className="text-[11px] text-gray-500 mt-2">
//           The <b>Default</b> sender will be used when no phone is chosen
//           explicitly while sending.
//         </p>
//       </div>

//       {testResult && (
//         <div className="mt-6">
//           <label className="text-xs text-gray-600 block mb-1">
//             Test Result
//           </label>
//           <pre className="text-xs bg-gray-50 border border-gray-200 p-3 rounded overflow-auto">
//             {testResult}
//           </pre>
//         </div>
//       )}
//     </div>
//   );
// }

// // 📄 src/pages/Settings/WhatsAppSettings.jsx
// import React, { useState, useEffect, useMemo } from "react";
// import axiosClient from "../../api/axiosClient";
// import { toast } from "react-toastify";

// // === Canonical providers (MUST match backend exactly) ===
// const PROVIDERS = [
//   { value: "PINNACLE", label: "PINNACLE" },
//   { value: "META_CLOUD", label: "META_CLOUD" },
// ];

// // --- BusinessId helper (unchanged) ---
// const TOKEN_KEY = "xbyte_token";
// const GUID_RE =
//   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// function getBusinessId() {
//   try {
//     const saved = localStorage.getItem("business_id");
//     if (saved && GUID_RE.test(saved)) return saved;

//     const jwt = localStorage.getItem(TOKEN_KEY);
//     if (!jwt) return null;
//     const [, payloadB64] = jwt.split(".");
//     if (!payloadB64) return null;
//     const payload = JSON.parse(
//       atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
//     );
//     const bid =
//       payload?.BusinessId ||
//       payload?.businessId ||
//       payload?.biz ||
//       payload?.bid ||
//       null;
//     return typeof bid === "string" && GUID_RE.test(bid) ? bid : null;
//   } catch {
//     return null;
//   }
// }

// // Map any input to UPPERCASE canonical values
// const normalizeProvider = p => {
//   const raw = (p ?? "").toString().trim();
//   if (!raw) return "PINNACLE";
//   const up = raw.toUpperCase();
//   if (up === "PINNACLE") return "PINNACLE";
//   if (
//     up === "META_CLOUD" ||
//     up === "META" ||
//     up === "METACLOUD" ||
//     up === "META-CLOUD"
//   )
//     return "META_CLOUD";
//   return "PINNACLE";
// };

// // UI label per provider (still binds to apiKey)
// const secretLabelFor = provider =>
//   normalizeProvider(provider) === "PINNACLE" ? "API Key" : "Token";

// // Initial blank form (GLOBAL SETTINGS ONLY — no legacy number fields up here)
// const blank = {
//   provider: "PINNACLE",
//   apiUrl: "", // keep string (ApiUrl is NOT NULL on BE)
//   apiKey: "",
//   wabaId: "",
//   senderDisplayName: "",
//   webhookSecret: "",
//   webhookVerifyToken: "",
//   webhookCallbackUrl: "",
//   isActive: true,
// };

// export default function WhatsAppSettings() {
//   const [formData, setFormData] = useState(blank);
//   const [loading, setLoading] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [testing, setTesting] = useState(false);
//   const [testResult, setTestResult] = useState("");
//   const [senders, setSenders] = useState([]);
//   const [fetchingMeta, setFetchingMeta] = useState(false);
//   const [hasSavedOnce, setHasSavedOnce] = useState(false);
//   const [savedProvider, setSavedProvider] = useState(null); // ⬅️ NEW: track provider persisted in DB

//   const businessId = useMemo(getBusinessId, []);
//   const withBiz = (cfg = {}) =>
//     businessId
//       ? {
//           ...cfg,
//           headers: { ...(cfg.headers || {}), "X-Business-Id": businessId },
//         }
//       : cfg;

//   // ===== Numbers API helpers (DB-backed) =====
//   const listNumbers = async provider => {
//     const p = normalizeProvider(provider);
//     const { data } = await axiosClient.get(
//       `/whatsappsettings/${p}/numbers`,
//       withBiz()
//     );
//     return Array.isArray(data) ? data : [];
//   };

//   const upsertNumber = async (provider, row) => {
//     const p = normalizeProvider(provider);
//     const payload = {
//       phoneNumberId: (row.phoneNumberId || "").trim(),
//       whatsAppBusinessNumber: (row.whatsAppBusinessNumber || "").trim(),
//       senderDisplayName: (row.label || row.senderDisplayName || "").trim(),
//       isActive: row.isActive ?? true,
//       isDefault: !!row.isDefault,
//     };
//     const { data } = await axiosClient.post(
//       `/whatsappsettings/${p}/numbers`,
//       payload,
//       withBiz()
//     );
//     return data; // returns the saved row with id
//   };

//   const deleteNumber = async (provider, id) => {
//     const p = normalizeProvider(provider);
//     await axiosClient.delete(`/whatsappsettings/${p}/numbers/${id}`, withBiz());
//   };

//   const setDefaultNumber = async (provider, id) => {
//     const p = normalizeProvider(provider);
//     await axiosClient.patch(
//       `/whatsappsettings/${p}/numbers/${id}/default`,
//       null,
//       withBiz()
//     );
//   };

//   const fetchNumbers = async provider => {
//     try {
//       const items = await listNumbers(provider);
//       setSenders(
//         items.map(n => ({
//           id: n.id,
//           label: n.senderDisplayName || "",
//           phoneNumberId: n.phoneNumberId || "",
//           whatsAppBusinessNumber: n.whatsAppBusinessNumber || "",
//           isDefault: !!n.isDefault,
//           isActive: n.isActive ?? true,
//         }))
//       );
//     } catch {
//       // ignore; empty list is fine
//     }
//   };

//   // ===== Derived UI =====
//   const providerLabel = useMemo(
//     () => secretLabelFor(formData.provider),
//     [formData.provider]
//   );
//   const selectedProvider = useMemo(
//     () => normalizeProvider(formData.provider),
//     [formData.provider]
//   );

//   // Show "Fetch from Meta" once global settings exist (saved at least once)
//   const showFetchButton = hasSavedOnce;

//   // ===== Initial load of saved GLOBAL settings + initial numbers =====
//   useEffect(() => {
//     let mounted = true;
//     (async () => {
//       try {
//         setLoading(true);
//         const res = await axiosClient.get("/whatsappsettings/me", withBiz());
//         if (!mounted) return;
//         const data = res?.data ?? {};

//         const provider = normalizeProvider(data?.provider);
//         const secret = data?.apiKey || data?.apiToken || "";

//         setFormData(prev => ({
//           ...prev,
//           provider,
//           apiUrl: data?.apiUrl || "",
//           apiKey: secret,
//           wabaId: data?.wabaId || "",
//           senderDisplayName: data?.senderDisplayName || "",
//           webhookSecret: data?.webhookSecret || "",
//           webhookVerifyToken: data?.webhookVerifyToken || "",
//           webhookCallbackUrl: data?.webhookCallbackUrl || "",
//           isActive: data?.isActive ?? true,
//         }));

//         setSavedProvider(provider); // ⬅️ track what’s persisted

//         const existed =
//           !!data?.provider ||
//           !!data?.apiKey ||
//           !!data?.apiToken ||
//           !!data?.wabaId;
//         setHasSavedOnce(!!existed);

//         await fetchNumbers(provider);
//       } catch {
//         toast.info("ℹ️ No WhatsApp settings found. You can create them now.");
//         setHasSavedOnce(false);
//         setSavedProvider(null);
//       } finally {
//         mounted && setLoading(false);
//       }
//     })();
//     return () => {
//       mounted = false;
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // Refresh numbers when provider changes
//   useEffect(() => {
//     fetchNumbers(formData.provider);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [formData.provider]);

//   useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     if (params.get("connected") === "1") {
//       (async () => {
//         try {
//           await handleFetchFromMeta(); // pulls & stores numbers
//           toast.success("Facebook connected. Numbers synced.");
//         } finally {
//           // drop the query param so refreshes don’t keep re-syncing
//           const url = new URL(window.location.href);
//           url.searchParams.delete("connected");
//           window.history.replaceState({}, "", url.toString());
//         }
//       })();
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // ===== Local mutations for sender rows =====
//   const addSender = () =>
//     setSenders(s => [
//       ...s,
//       {
//         label: "",
//         phoneNumberId: "",
//         whatsAppBusinessNumber: "",
//         isDefault: s.length === 0,
//         isActive: true,
//       },
//     ]);
//   const removeSender = idx => setSenders(s => s.filter((_, i) => i !== idx));
//   const updateSender = (idx, key, value) =>
//     setSenders(s =>
//       s.map((row, i) => (i === idx ? { ...row, [key]: value } : row))
//     );
//   const setDefaultSender = idx =>
//     setSenders(s => s.map((row, i) => ({ ...row, isDefault: i === idx })));

//   // ===== Global form handlers =====
//   const handleChange = e => {
//     const { name, value } = e.target;
//     setFormData(p => ({ ...p, [name]: value }));
//   };
//   const handleToggle = e => {
//     const { name, checked } = e.target;
//     setFormData(p => ({ ...p, [name]: checked }));
//   };
//   const handleProviderChange = e => {
//     const provider = normalizeProvider(e.target.value);
//     setFormData(p => ({ ...p, provider }));
//   };

//   // ===== Save global settings ONLY =====
//   const validateBeforeSave = () => {
//     if (!formData.apiKey.trim()) {
//       toast.error("API Key / Token is required.");
//       return false;
//     }
//     return true;
//   };

//   const handleSaveGlobal = async () => {
//     if (!validateBeforeSave()) return;
//     try {
//       setSaving(true);
//       const payload = {
//         provider: normalizeProvider(formData.provider),
//         apiUrl: (formData.apiUrl || "").trim(),
//         apiKey: (formData.apiKey || "").trim(),
//         wabaId: (formData.wabaId || "").trim() || null,
//         senderDisplayName: (formData.senderDisplayName || "").trim() || null,
//         webhookSecret: (formData.webhookSecret || "").trim() || null,
//         webhookVerifyToken: (formData.webhookVerifyToken || "").trim() || null,
//         webhookCallbackUrl: (formData.webhookCallbackUrl || "").trim() || null,
//         isActive: !!formData.isActive,
//       };
//       await axiosClient.put("/whatsappsettings/update", payload, withBiz());

//       setHasSavedOnce(true); // settings now exist
//       setSavedProvider(payload.provider); // ⬅️ keep in sync with DB

//       toast.success("Settings saved.");
//     } catch {
//       toast.error("Failed to save settings.");
//     } finally {
//       setSaving(false);
//     }
//   };

//   // ===== Test connection against SAVED settings (your /current endpoint) =====
//   const handleTest = async () => {
//     setTesting(true);
//     setTestResult("");
//     try {
//       const res = await axiosClient.post(
//         "/whatsappsettings/test-connection/current",
//         {},
//         withBiz()
//       );
//       setTestResult(JSON.stringify(res?.data ?? {}, null, 2));
//       toast.success(res?.data?.message || "Connection test complete.");
//     } catch (err) {
//       setTestResult(
//         JSON.stringify(err?.response?.data ?? { error: String(err) }, null, 2)
//       );
//       toast.error(err?.response?.data?.message || "Connection test failed.");
//     } finally {
//       setTesting(false);
//     }
//   };

//   // ===== Fetch numbers via saved provider → backend sync → refresh table =====
//   const handleFetchFromMeta = async () => {
//     // guardrails: most gateways need API key; WABA is needed for Meta and commonly for gateways
//     if (!formData.apiKey?.trim() || !formData.wabaId?.trim()) {
//       toast.warn(
//         "Please provide API Key/Token and WABA ID, then Save Settings."
//       );
//       return;
//     }
//     try {
//       setFetchingMeta(true);
//       const res = await axiosClient.post(
//         "/whatsappsettings/fetch-numbers",
//         {}, // server uses SAVED provider to choose the auth flow
//         withBiz()
//       );

//       // Use the provider bucket the SERVER actually wrote to
//       const serverBucket = normalizeProvider(res?.data?.provider);
//       const fallbackBucket = savedProvider || selectedProvider;
//       const bucket = serverBucket || fallbackBucket;

//       // Refresh that bucket
//       await fetchNumbers(bucket);

//       // Align dropdown so UI reflects the persisted bucket (prevents empty table confusion)
//       if (bucket && bucket !== selectedProvider) {
//         setFormData(p => ({ ...p, provider: bucket }));
//       }

//       const { added = 0, updated = 0, total = 0 } = res?.data || {};
//       toast.success(
//         `Synced — added ${added}, updated ${updated}, total ${total} (${bucket}).`
//       );
//     } catch (err) {
//       const msg =
//         err?.response?.data?.message || err?.message || "Fetch failed.";
//       toast.error(msg);
//     } finally {
//       setFetchingMeta(false);
//     }
//   };

//   return (
//     <div className="max-w-5xl mx-auto px-4 py-6">
//       <div className="flex items-center justify-between mb-4">
//         <h1 className="text-xl font-semibold">WhatsApp Settings</h1>

//         <div className="flex gap-2">
//           <button
//             type="button"
//             onClick={handleSaveGlobal}
//             disabled={saving}
//             className={`px-4 py-2 rounded-md text-sm ${
//               saving
//                 ? "bg-gray-300"
//                 : "bg-blue-600 hover:bg-blue-700 text-white"
//             }`}
//             title="Save global settings only"
//           >
//             {saving ? "Saving…" : "Save Settings"}
//           </button>

//           <button
//             type="button"
//             onClick={handleTest}
//             disabled={testing}
//             className={`px-4 py-2 rounded-md text-sm ${
//               testing ? "bg-gray-300" : "bg-gray-100 hover:bg-gray-200"
//             }`}
//             title="Test connection using saved settings"
//           >
//             {testing ? "Testing…" : "Test Connection"}
//           </button>
//         </div>
//       </div>

//       {loading && (
//         <div className="text-sm text-gray-500 mb-4">Loading settings…</div>
//       )}

//       {/* GLOBAL provider-level settings ONLY */}
//       <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
//         <div className="md:col-span-4">
//           <label className="text-xs text-gray-600 block mb-1">Provider</label>
//           <select
//             name="provider"
//             value={normalizeProvider(formData.provider)}
//             onChange={handleProviderChange}
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           >
//             {PROVIDERS.map(p => (
//               <option key={p.value} value={p.value}>
//                 {p.label}
//               </option>
//             ))}
//           </select>
//         </div>

//         <div className="md:col-span-4">
//           <label className="text-xs text-gray-600 block mb-1">
//             API URL (optional)
//           </label>
//           <input
//             type="text"
//             name="apiUrl"
//             value={formData.apiUrl}
//             onChange={handleChange}
//             placeholder="https://graph.facebook.com/v22.0 or provider URL"
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           />
//         </div>

//         <div className="md:col-span-4">
//           <label className="text-xs text-gray-600 block mb-1">
//             {providerLabel}
//           </label>
//           <input
//             type="text"
//             name="apiKey"
//             value={formData.apiKey}
//             onChange={handleChange}
//             placeholder={providerLabel}
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           />
//         </div>

//         <div className="md:col-span-4">
//           <label className="text-xs text-gray-600 block mb-1">
//             WABA ID (Meta only)
//           </label>
//           <input
//             type="text"
//             name="wabaId"
//             value={formData.wabaId}
//             onChange={handleChange}
//             placeholder="e.g. 123456789012345"
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           />
//         </div>

//         <div className="md:col-span-4">
//           <label className="text-xs text-gray-600 block mb-1">
//             Sender Display Name (optional)
//           </label>
//           <input
//             type="text"
//             name="senderDisplayName"
//             value={formData.senderDisplayName}
//             onChange={handleChange}
//             placeholder="e.g. Acme Support"
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           />
//         </div>

//         <div className="md:col-span-4">
//           <label className="text-xs text-gray-600 block mb-1">
//             Webhook Verify Token
//           </label>
//           <input
//             type="text"
//             name="webhookVerifyToken"
//             value={formData.webhookVerifyToken}
//             onChange={handleChange}
//             placeholder="verify-token"
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           />
//         </div>

//         <div className="md:col-span-4">
//           <label className="text-xs text-gray-600 block mb-1">
//             Webhook Secret
//           </label>
//           <input
//             type="text"
//             name="webhookSecret"
//             value={formData.webhookSecret}
//             onChange={handleChange}
//             placeholder="secret"
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           />
//         </div>

//         <div className="md:col-span-8">
//           <label className="text-xs text-gray-600 block mb-1">
//             Webhook Callback URL
//           </label>
//           <input
//             type="text"
//             name="webhookCallbackUrl"
//             value={formData.webhookCallbackUrl}
//             onChange={handleChange}
//             placeholder="https://example.com/api/webhooks/whatsapp"
//             className="w-full px-3 py-2 border rounded-md text-sm border-gray-300"
//           />
//         </div>

//         <div className="md:col-span-4 flex items-end">
//           <label className="inline-flex items-center gap-2 text-sm text-gray-700">
//             <input
//               type="checkbox"
//               name="isActive"
//               checked={!!formData.isActive}
//               onChange={handleToggle}
//               className="h-4 w-4"
//             />
//             Active
//           </label>
//         </div>
//       </div>

//       {/* SENDERS (all phone numbers live here) */}
//       <div className="mt-8 border-t pt-6">
//         <div className="flex items-center justify-between mb-3">
//           <h3 className="text-sm font-semibold text-gray-700">
//             Senders (multiple numbers)
//           </h3>

//           <div className="flex gap-2">
//             {showFetchButton && (
//               <button
//                 type="button"
//                 onClick={handleFetchFromMeta}
//                 disabled={fetchingMeta}
//                 className={`px-3 py-1.5 rounded-md text-sm ${
//                   fetchingMeta
//                     ? "bg-gray-200 text-gray-500"
//                     : "bg-green-600 text-white hover:bg-green-700"
//                 }`}
//                 title="Fetch linked phone numbers"
//               >
//                 {fetchingMeta ? "Fetching…" : "Fetch from Meta"}
//               </button>
//             )}
//             <button
//               type="button"
//               onClick={addSender}
//               className="px-3 py-1.5 rounded-md text-sm bg-gray-100 hover:bg-gray-200"
//             >
//               + Add number
//             </button>
//           </div>
//         </div>

//         {senders.length === 0 && (
//           <div className="text-xs text-gray-500 mb-2">
//             No senders yet. Click <b>Fetch from Meta</b> or <b>+ Add number</b>{" "}
//             to add your first phone.
//           </div>
//         )}

//         <div className="space-y-3">
//           {senders.map((row, idx) => (
//             <div
//               key={idx}
//               className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-gray-50 p-3 rounded"
//             >
//               <div className="md:col-span-3">
//                 <label className="text-xs text-gray-600 block mb-1">
//                   Label (optional)
//                 </label>
//                 <input
//                   type="text"
//                   value={row.label || ""}
//                   onChange={e => updateSender(idx, "label", e.target.value)}
//                   placeholder="e.g. Sales India"
//                   className="w-full px-3 py-1.5 border rounded-md text-sm border-gray-300"
//                 />
//               </div>

//               <div className="md:col-span-4">
//                 <label className="text-xs text-gray-600 block mb-1">
//                   WhatsApp Business Number
//                 </label>
//                 <input
//                   type="text"
//                   value={row.whatsAppBusinessNumber || ""}
//                   onChange={e =>
//                     updateSender(idx, "whatsAppBusinessNumber", e.target.value)
//                   }
//                   placeholder="+14150000001"
//                   className="w-full px-3 py-1.5 border rounded-md text-sm border-gray-300"
//                 />
//               </div>

//               <div className="md:col-span-4">
//                 <label className="text-xs text-gray-600 block mb-1">
//                   Phone Number ID
//                 </label>
//                 <input
//                   type="text"
//                   value={row.phoneNumberId || ""}
//                   onChange={e =>
//                     updateSender(idx, "phoneNumberId", e.target.value)
//                   }
//                   placeholder="1234567890"
//                   className="w-full px-3 py-1.5 border rounded-md text-sm border-gray-300"
//                 />
//               </div>

//               <div className="md:col-span-1 flex items-end gap-2 flex-wrap">
//                 <button
//                   type="button"
//                   onClick={async () => {
//                     try {
//                       const saved = await upsertNumber(formData.provider, row);
//                       setSenders(s =>
//                         s.map((r, i) =>
//                           i === idx ? { ...r, id: saved?.id || r.id } : r
//                         )
//                       );
//                       toast.success("Saved.");
//                     } catch {
//                       toast.error("Save failed.");
//                     }
//                   }}
//                   className="px-2 py-1 rounded text-xs bg-blue-600 text-white"
//                   title="Save this sender"
//                 >
//                   Save
//                 </button>

//                 <button
//                   type="button"
//                   onClick={async () => {
//                     try {
//                       if (!row.id) {
//                         removeSender(idx);
//                         return;
//                       }
//                       await deleteNumber(formData.provider, row.id);
//                       removeSender(idx);
//                       toast.success("Deleted.");
//                     } catch {
//                       toast.error("Delete failed.");
//                     }
//                   }}
//                   className="px-2 py-1 rounded text-xs bg-red-50 text-red-700"
//                   title="Remove"
//                 >
//                   ✕
//                 </button>

//                 <button
//                   type="button"
//                   onClick={async () => {
//                     try {
//                       if (!row.id) {
//                         const saved = await upsertNumber(
//                           formData.provider,
//                           row
//                         );
//                         await setDefaultNumber(formData.provider, saved?.id);
//                       } else {
//                         await setDefaultNumber(formData.provider, row.id);
//                       }
//                       setDefaultSender(idx);
//                       toast.success("Default set.");
//                     } catch {
//                       toast.error("Failed to set default.");
//                     }
//                   }}
//                   className={`px-2 py-1 rounded text-xs ${
//                     row.isDefault ? "bg-green-600 text-white" : "bg-gray-200"
//                   }`}
//                   title="Set as default sender"
//                 >
//                   {row.isDefault ? "Default" : "Make default"}
//                 </button>
//               </div>
//             </div>
//           ))}
//         </div>

//         <p className="text-[11px] text-gray-500 mt-2">
//           The <b>Default</b> sender will be used when no phone is chosen
//           explicitly while sending.
//         </p>
//       </div>

//       {testResult && (
//         <div className="mt-6">
//           <label className="text-xs text-gray-600 block mb-1">
//             Test Result
//           </label>
//           <pre className="text-xs bg-gray-50 border border-gray-200 p-3 rounded overflow-auto">
//             {testResult}
//           </pre>
//         </div>
//       )}
//     </div>
//   );
// }
