// 📄 src/pages/campaigns/CampaignBuilderPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";
import PhoneWhatsAppPreview from "../../components/PhoneWhatsAppPreview";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
// === Your axios baseURL already ends with /api. Keep all calls RELATIVE (no leading slash).
const SYNC_ENDPOINT = bid => `templates/sync/${bid}`; // POST

const isGuid = v =>
  !!v &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );

// Header kind helpers (frontend-only)
const HK = Object.freeze({
  None: "none",
  Text: "text",
  Image: "image",
  Video: "video",
  Document: "document",
});
const isMediaHeader = hk =>
  hk === HK.Image || hk === HK.Video || hk === HK.Document;
const mediaLabel = hk =>
  hk === HK.Image
    ? "Image URL"
    : hk === HK.Video
    ? "Video URL"
    : "Document URL";

function CampaignBuilderPage() {
  const { businessId: ctxBusinessId } = useAuth();

  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateParams, setTemplateParams] = useState([]);
  const [buttonParams, setButtonParams] = useState([]);

  // Unified header media url (for Image/Video/Document)
  const [headerMediaUrl, setHeaderMediaUrl] = useState("");

  const [campaignName, setCampaignName] = useState("");
  const [nameError, setNameError] = useState(""); // inline name check
  const [checkingName, setCheckingName] = useState(false);

  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Optional Flow
  const [useFlow, setUseFlow] = useState(false);
  const [flows, setFlows] = useState([]);
  const [loadingFlows, setLoadingFlows] = useState(false);
  const [selectedFlowId, setSelectedFlowId] = useState("");

  // Sender selection (from WhatsAppPhoneNumbers)
  const [senders, setSenders] = useState([]); // [{id, provider, phoneNumberId, whatsAppNumber}]
  const [selectedSenderId, setSelectedSenderId] = useState("");

  // CSV controls all dynamic personalization (default ON)
  const [useCsvPersonalization, setUseCsvPersonalization] = useState(true);

  const businessId = useMemo(
    () => ctxBusinessId || localStorage.getItem("businessId") || null,
    [ctxBusinessId]
  );
  const hasValidBusiness = isGuid(businessId);

  const createdBy = localStorage.getItem("userId");
  const businessName = localStorage.getItem("businessName") || "Your Business";
  const navigate = useNavigate();

  // ---------- Helpers ----------
  const checkNameAvailability = async name => {
    setNameError("");
    if (!name?.trim() || !hasValidBusiness) return;
    try {
      setCheckingName(true);
      // ✅ relative path (no leading slash)
      const { data } = await axiosClient.get(`campaign/check-name`, {
        params: { name },
      });
      if (data?.available === false) {
        setNameError("Name already exists. Please choose another.");
      } else {
        setNameError("");
      }
    } catch {
      setNameError("");
    } finally {
      setCheckingName(false);
    }
  };

  const normalizeHeaderKind = t => {
    const raw = (t.headerKind || t.HeaderKind || "").toString().toLowerCase();
    if (
      raw === HK.Image ||
      raw === HK.Video ||
      raw === HK.Document ||
      raw === HK.Text ||
      raw === HK.None
    ) {
      return raw;
    }
    return t.hasImageHeader || t.HasImageHeader ? HK.Image : HK.None;
  };

  const toArray = maybe => (Array.isArray(maybe) ? maybe : []);

  // ---------- Effects ----------
  // Load approved templates
  useEffect(() => {
    const load = async () => {
      if (!hasValidBusiness) return;
      setLoadingTemplates(true);
      try {
        // ✅ relative path
        const res = await axiosClient.get(
          `templates/${businessId}?status=APPROVED`
        );
        // this endpoint already returns a flat array usable for the list
        if (res.data?.success) setTemplates(res.data.templates || []);
        else toast.error("❌ Failed to load templates.");
      } catch {
        toast.error("❌ Error loading templates.");
      } finally {
        setLoadingTemplates(false);
      }
    };
    load();
  }, [businessId, hasValidBusiness]);

  // Load flows when "Attach Flow" is toggled
  useEffect(() => {
    if (!useFlow || !hasValidBusiness) return;

    const loadFlows = async () => {
      setLoadingFlows(true);
      try {
        const r = await axiosClient.get(
          `campaign/list/${businessId}?onlyPublished=true`
        );

        const items = Array.isArray(r.data?.items) ? r.data.items : [];
        const mapped = items
          .map(f => ({
            id: f.id ?? f.Id,
            name: f.flowName ?? f.FlowName,
            isPublished: f.isPublished ?? f.IsPublished ?? true,
          }))
          .filter(x => x.id && x.name);

        setFlows(mapped);
        if (!mapped.length) {
          toast.info(
            "ℹ️ No published flows found. You can still create a campaign without a flow."
          );
        }
      } catch {
        toast.error("❌ Error loading flows.");
        setFlows([]);
      } finally {
        setLoadingFlows(false);
      }
    };

    loadFlows();
  }, [useFlow, hasValidBusiness, businessId]);

  // Load available senders (WhatsAppPhoneNumbers)
  useEffect(() => {
    if (!hasValidBusiness) return;
    (async () => {
      try {
        const r = await axiosClient.get(
          `WhatsAppSettings/senders/${businessId}`
        );

        const raw = Array.isArray(r.data) ? r.data : r.data?.items || [];
        const normalized = raw.map(x => {
          const provider = String(x.provider || x.Provider || "").toUpperCase(); // "PINNACLE" | "META_CLOUD"
          const phoneNumberId = x.phoneNumberId ?? x.PhoneNumberId;
          const whatsAppNumber =
            x.whatsAppBusinessNumber ??
            x.whatsappBusinessNumber ??
            x.displayNumber ??
            x.phoneNumber ??
            x.WhatsAppBusinessNumber ??
            x.PhoneNumber ??
            x.phoneNumberId ??
            x.PhoneNumberId;

          const id = x.id ?? x.Id ?? `${provider}|${phoneNumberId}`;
          return { id, provider, phoneNumberId, whatsAppNumber };
        });

        setSenders(normalized);
        if (normalized.length === 1) setSelectedSenderId(normalized[0].id);
      } catch {
        toast.error("❌ Failed to load WhatsApp senders.");
        setSenders([]);
        setSelectedSenderId("");
      }
    })();
  }, [hasValidBusiness, businessId]);

  // ---------- Actions ----------
  // Sync Templates
  const handleSyncTemplates = async () => {
    if (!hasValidBusiness) {
      toast.warn("⚠️ Business context missing. Please re-login.");
      return;
    }
    setSyncing(true);
    try {
      const res = await axiosClient.post(SYNC_ENDPOINT(businessId));
      const ok =
        res?.data?.success === true ||
        res?.status === 200 ||
        res?.status === 204;
      if (ok) {
        toast.success("✅ Templates synced. Refreshing list…");
        setLoadingTemplates(true);
        try {
          const r2 = await axiosClient.get(
            `templates/${businessId}?status=APPROVED`
          );
          if (r2.data?.success) setTemplates(r2.data.templates || []);
        } finally {
          setLoadingTemplates(false);
        }
      } else {
        toast.error("❌ Sync failed.");
      }
    } catch {
      toast.error("❌ Error syncing templates.");
    } finally {
      setSyncing(false);
    }
  };

  const handleTemplateSelect = async name => {
    if (!name) {
      setSelectedTemplate(null);
      setTemplateParams([]);
      setButtonParams([]);
      setHeaderMediaUrl("");
      return;
    }
    try {
      if (!hasValidBusiness) {
        toast.error("Invalid or missing Business ID. Please re-login.");
        return;
      }
      // ✅ relative path
      const res = await axiosClient.get(
        `templates/${businessId}/${encodeURIComponent(name)}`
      );

      // 🔧 FIX: details API returns { success, template }
      const rawTemplate = res?.data?.template || res?.data || null;
      if (!rawTemplate?.name && !rawTemplate?.Name) {
        toast.error("❌ Could not load template details.");
        return;
      }

      // Accept multiple shapes: stringified or already-array
      const rawButtons =
        rawTemplate.buttonsJson ??
        rawTemplate.ButtonsJson ??
        rawTemplate.buttonParams ??
        rawTemplate.ButtonParams ??
        rawTemplate.buttons ??
        rawTemplate.urlButtonsJson ?? // (won’t contain quick replies, but keep for safety)
        rawTemplate.urlButtons ??
        null;

      let parsedButtons = [];
      if (Array.isArray(rawButtons)) {
        parsedButtons = rawButtons;
      } else if (
        typeof rawButtons === "string" &&
        rawButtons.trim().startsWith("[")
      ) {
        try {
          parsedButtons = JSON.parse(rawButtons);
        } catch {
          parsedButtons = [];
        }
      }

      const hk = normalizeHeaderKind(rawTemplate);
      const requiresHeaderMediaUrl =
        rawTemplate.requiresHeaderMediaUrl === true ||
        rawTemplate.RequiresMediaHeader === true ||
        isMediaHeader(hk);

      const normalized = {
        name: rawTemplate.name ?? rawTemplate.Name,
        language: rawTemplate.language ?? rawTemplate.Language ?? "en_US",
        body: rawTemplate.body ?? rawTemplate.Body ?? "",
        headerKind: hk,
        requiresHeaderMediaUrl,
        hasImageHeader:
          rawTemplate.hasImageHeader ?? rawTemplate.HasImageHeader ?? false,
        parametersCount:
          rawTemplate.parametersCount ??
          rawTemplate.PlaceholderCount ??
          rawTemplate.placeholderCount ??
          0,
        buttonParams: toArray(parsedButtons),
      };

      setSelectedTemplate(normalized);
      setTemplateParams(Array(normalized.parametersCount).fill(""));

      // Build client-side slots for dynamic buttons (preview/input)
      const dynSlots =
        normalized.buttonParams?.map(btn => {
          const originalUrl = btn?.ParameterValue || btn?.parameterValue || "";
          const subtype = (btn?.SubType || btn?.subType || "").toLowerCase();
          const isDynamic =
            ["url", "copy_code", "flow"].includes(subtype) ||
            originalUrl.includes("{{1}}");
          return isDynamic ? "" : null;
        }) || [];
      setButtonParams(dynSlots);
      setHeaderMediaUrl("");
    } catch {
      toast.error("❌ Error loading template details.");
    }
  };

  // Create Campaign
  const handleCreateCampaign = async () => {
    if (!hasValidBusiness) {
      toast.error("Invalid or missing Business ID. Please re-login.");
      return;
    }
    if (!campaignName || !selectedTemplate) {
      toast.warn("⚠️ Please fill campaign name and choose a template.");
      return;
    }

    if (checkingName) {
      toast.info("Checking campaign name…");
      return;
    }
    if (nameError) {
      toast.warn("Please fix the campaign name.");
      return;
    }

    // Only require body params when NOT using CSV
    if (!useCsvPersonalization && templateParams.some(p => p === "")) {
      toast.warn("⚠️ Please fill all template parameters or enable CSV.");
      return;
    }
    if (useFlow && !selectedFlowId) {
      toast.warn("⚠️ Please select a flow or uncheck “Attach Flow”.");
      return;
    }

    // Resolve selected sender (required)
    const selectedSender = senders.find(s => s.id === selectedSenderId);
    if (!selectedSender || !selectedSender.phoneNumberId) {
      toast.warn("⚠️ Please choose a Sender (number).");
      return;
    }

    // Header media rules (campaign-level)
    const hk = selectedTemplate?.headerKind || HK.None;
    if (isMediaHeader(hk) && !headerMediaUrl) {
      toast.warn(`⚠️ Please provide a ${mediaLabel(hk)}.`);
      return;
    }

    setSubmitting(true);

    // Keep static button values; leave dynamic button values empty (CSV will provide later)
    const buttonPayload =
      selectedTemplate.buttonParams?.map((btn, idx) => {
        const originalUrl = btn?.ParameterValue || btn?.parameterValue || "";
        const subtype = (btn?.SubType || btn?.subType || "").toLowerCase();
        const isDynamic =
          ["url", "copy_code", "flow"].includes(subtype) ||
          originalUrl.includes("{{1}}");

        return {
          text: btn?.Text || btn?.text || "Button",
          type: btn?.Type || btn?.type || "",
          value: isDynamic
            ? useCsvPersonalization
              ? ""
              : buttonParams[idx] || ""
            : originalUrl,
          position: idx + 1,
        };
      }) || [];

    // Media mapping
    const campaignType =
      hk === HK.Image ? "image" : hk === HK.Video ? "video" : "text";

    const payload = {
      name: campaignName,
      messageTemplate: (selectedTemplate.body || "").trim(),
      templateId: selectedTemplate.name,
      templateLanguage: selectedTemplate.language || undefined,
      buttonParams: buttonPayload,

      campaignType,
      imageUrl: hk === HK.Image ? headerMediaUrl : null,
      videoUrl: hk === HK.Video ? headerMediaUrl : null,
      documentUrl: hk === HK.Document ? headerMediaUrl : null,

      headerMediaUrl: isMediaHeader(hk) ? headerMediaUrl : null,
      headerKind: hk,

      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      createdBy,
      businessId,

      templateParameters: useCsvPersonalization ? [] : templateParams,
      useCsvPersonalization,

      ctaFlowConfigId: useFlow ? selectedFlowId : null,

      provider: String(selectedSender.provider || "").toUpperCase(),
      phoneNumberId: selectedSender.phoneNumberId,
    };

    try {
      await checkNameAvailability(campaignName);
      if (nameError) {
        toast.warn("Please choose a different campaign name.");
        setSubmitting(false);
        return;
      }

      const res = await axiosClient.post(
        `campaign/create-text-campaign`,
        payload
      );
      if (res.data?.success && res.data?.campaignId) {
        toast.success("✅ Campaign created successfully.");
        navigate(
          `/app/campaigns/image-campaigns/assign-contacts/${res.data.campaignId}`
        );
      } else {
        toast.error("❌ Failed to create campaign.");
      }
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message || "❌ Error creating campaign.";
      if (
        typeof errorMsg === "string" &&
        errorMsg.toLowerCase().includes("campaign") &&
        errorMsg.toLowerCase().includes("name") &&
        errorMsg.toLowerCase().includes("exists")
      ) {
        setNameError("Name already exists. Please choose another.");
      }
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const templateOptions = useMemo(
    () =>
      templates.map(tpl => ({
        key: `${tpl.name || tpl.Name}-${
          tpl.language || tpl.Language || "en_US"
        }`,
        label: `${tpl.name || tpl.Name} (${
          tpl.language || tpl.Language || "en_US"
        }) — ${
          tpl.placeholderCount ??
          tpl.ParametersCount ??
          tpl.PlaceholderCount ??
          0
        } params`,
        value: tpl.name || tpl.Name,
      })),
    [templates]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Create WhatsApp Campaign
              </h1>
              <p className="text-gray-600 text-lg">
                Build engaging campaigns with approved templates
              </p>
            </div>

            {/* Sync Templates */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSyncTemplates}
                disabled={!hasValidBusiness || syncing}
                className={`rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 ${
                  !hasValidBusiness || syncing
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-sapphire-600 to-cyan-600 hover:from-sapphire-700 hover:to-cyan-700 hover:shadow-xl transform hover:scale-105"
                }`}
                title={
                  !hasValidBusiness
                    ? "Login required to sync templates"
                    : undefined
                }
              >
                {syncing ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Syncing…</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span>Sync Templates</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Business guard */}
        {!hasValidBusiness && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-amber-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-900 mb-2">
                  Loading Business Context
                </h3>
                <p className="text-amber-800 mb-4">
                  We're setting up your business environment. If this doesn't
                  resolve in a moment, please re-login so we can attach your
                  Business ID to requests.
                </p>
                <button
                  onClick={() => navigate("/login")}
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  type="button"
                >
                  Go to Login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Left column – unified form */}
          <div>
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 p-6">
              <form className="space-y-6">
                {/* Campaign Details Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center">
                      <span className="text-emerald-600 font-bold text-xs">
                        1
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Campaign Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Campaign Name *
                      </label>
                      <input
                        type="text"
                        className={`w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                          nameError
                            ? "border-red-400 bg-red-50"
                            : "border-gray-300 focus:bg-white"
                        }`}
                        placeholder="e.g. Diwali Blast – Returning Customers"
                        value={campaignName}
                        onChange={e => {
                          setCampaignName(e.target.value);
                          setNameError("");
                        }}
                        onBlur={() => checkNameAvailability(campaignName)}
                        disabled={!hasValidBusiness}
                      />
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          Must be unique within your workspace
                        </p>
                        {checkingName && (
                          <div className="flex items-center gap-1 text-xs text-emerald-600">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-600"></div>
                            <span>checking…</span>
                          </div>
                        )}
                      </div>
                      {nameError && (
                        <p className="mt-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                          {nameError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Template *
                        <span className="text-emerald-600 font-medium ml-1">
                          (approved)
                        </span>
                      </label>
                      <select
                        disabled={loadingTemplates || !hasValidBusiness}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        onChange={e => handleTemplateSelect(e.target.value)}
                        value={selectedTemplate?.name || ""}
                      >
                        <option value="" disabled>
                          {loadingTemplates
                            ? "Loading templates…"
                            : "-- Select Template --"}
                        </option>
                        {templateOptions.map(o => (
                          <option key={o.key} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Only{" "}
                        <span className="font-semibold text-emerald-600">
                          APPROVED
                        </span>{" "}
                        templates are listed
                      </p>
                    </div>
                  </div>
                </div>

                {/* Flow Integration Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <div className="w-7 h-7 bg-cyan-100 rounded-full flex items-center justify-center">
                      <span className="text-cyan-600 font-bold text-xs">2</span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Flow Integration
                    </h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      Optional
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-200">
                      <input
                        id="useFlow"
                        type="checkbox"
                        checked={useFlow}
                        onChange={e => {
                          setUseFlow(e.target.checked);
                          if (!e.target.checked) setSelectedFlowId("");
                        }}
                        disabled={!hasValidBusiness}
                        className="w-4 h-4 text-cyan-600 bg-gray-100 border-gray-300 rounded focus:ring-cyan-500 focus:ring-2"
                      />
                      <label
                        htmlFor="useFlow"
                        className="text-sm font-medium text-gray-700 cursor-pointer"
                      >
                        Attach a Visual Flow to this campaign
                      </label>
                    </div>

                    {useFlow && (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-700">
                          Select Flow
                        </label>
                        <select
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                          disabled={loadingFlows || !hasValidBusiness}
                          value={selectedFlowId}
                          onChange={e => setSelectedFlowId(e.target.value)}
                        >
                          <option value="">
                            {loadingFlows
                              ? "Loading flows…"
                              : "-- Select Flow --"}
                          </option>
                          {flows.map(f => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                          <p className="text-xs text-blue-800">
                            <strong>Note:</strong> If attached, the campaign
                            will <strong>start</strong> from the flow's entry
                            step. The backend will align the starting template
                            automatically.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Personalization Section */}
                {selectedTemplate && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                      <div className="w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-bold text-xs">
                          3
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">
                        Personalization
                      </h3>
                    </div>

                    {/* CSV toggle */}
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-cyan-50 rounded-lg border border-emerald-200">
                      <input
                        id="useCsv"
                        type="checkbox"
                        checked={useCsvPersonalization}
                        onChange={e =>
                          setUseCsvPersonalization(e.target.checked)
                        }
                        className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                      />
                      <label
                        htmlFor="useCsv"
                        className="text-sm font-medium text-gray-700 cursor-pointer"
                      >
                        I'll upload a CSV later for personalization (recommended
                        for bulk campaigns)
                      </label>
                    </div>

                    {/* Body params — show only if NOT using CSV */}
                    {!useCsvPersonalization && templateParams.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          Template Parameters
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {templateParams.map((val, idx) => (
                            <div key={`tp-${idx}`} className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">
                                Parameter {idx + 1} {`{{${idx + 1}}}`}
                              </label>
                              <input
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder={`Value for {{${idx + 1}}}`}
                                value={val}
                                onChange={e => {
                                  const next = [...templateParams];
                                  next[idx] = e.target.value;
                                  setTemplateParams(next);
                                }}
                                disabled={!hasValidBusiness}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Button params — show only if NOT using CSV */}
                    {!useCsvPersonalization &&
                      (selectedTemplate?.buttonParams?.length ?? 0) > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                            <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                            Button Parameters
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedTemplate.buttonParams.map((btn, idx) => {
                              const originalUrl =
                                btn?.ParameterValue ||
                                btn?.parameterValue ||
                                "";
                              const subtype = (
                                btn?.SubType ||
                                btn?.subType ||
                                ""
                              ).toLowerCase();
                              const dynamic =
                                ["url", "copy_code", "flow"].includes(
                                  subtype
                                ) || originalUrl.includes("{{1}}");
                              const placeholders = {
                                url: "Enter Redirect URL",
                                copy_code: "Enter Coupon Code",
                                flow: "Enter Flow ID",
                              };
                              const title =
                                btn?.Text || btn?.text || `Button ${idx + 1}`;
                              return (
                                <div key={`bp-${idx}`} className="space-y-1">
                                  <label className="text-xs font-medium text-gray-600">
                                    {title} ·{" "}
                                    <span className="text-cyan-600 font-semibold">
                                      {subtype
                                        ? subtype.toUpperCase()
                                        : "STATIC"}
                                    </span>
                                  </label>
                                  {dynamic ? (
                                    <input
                                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                      placeholder={
                                        placeholders[subtype] || "Enter value"
                                      }
                                      value={buttonParams[idx] || ""}
                                      onChange={e => {
                                        const next = [...buttonParams];
                                        next[idx] = e.target.value;
                                        setButtonParams(next);
                                      }}
                                      disabled={
                                        !hasValidBusiness ||
                                        useCsvPersonalization
                                      }
                                    />
                                  ) : (
                                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2">
                                      <p className="text-xs text-gray-600">
                                        {subtype === "quick_reply"
                                          ? "Quick reply (no value required)"
                                          : `Static value: ${
                                              originalUrl || "N/A"
                                            }`}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Delivery Settings Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 font-bold text-xs">
                        4
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Delivery Settings
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sender selection */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Sender (WhatsApp Number) *
                      </label>
                      <select
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={!hasValidBusiness || !senders.length}
                        value={selectedSenderId}
                        onChange={e => setSelectedSenderId(e.target.value)}
                      >
                        <option value="" disabled>
                          {senders.length
                            ? "-- Select Sender --"
                            : "No active senders found"}
                        </option>
                        {senders.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.whatsAppNumber}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        We'll save the sender's phoneNumberId and provider
                      </p>
                    </div>

                    {/* Schedule */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Schedule
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        value={scheduledAt}
                        onChange={e => setScheduledAt(e.target.value)}
                        disabled={!hasValidBusiness}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Leave empty to send immediately after assignment
                      </p>
                    </div>
                  </div>

                  {/* Header Media URL */}
                  {selectedTemplate?.requiresHeaderMediaUrl && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        {mediaLabel(selectedTemplate.headerKind)} *
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="https://…"
                        value={headerMediaUrl}
                        onChange={e => setHeaderMediaUrl(e.target.value)}
                        disabled={!hasValidBusiness}
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        Must be a public HTTPS link (set once per campaign)
                      </p>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCreateCampaign}
                    disabled={
                      submitting ||
                      !hasValidBusiness ||
                      checkingName ||
                      !!nameError
                    }
                    className={`w-full rounded-xl px-6 py-3 text-base font-bold text-white shadow-lg transition-all duration-200 ${
                      submitting ||
                      !hasValidBusiness ||
                      checkingName ||
                      !!nameError
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-emerald-600 to-sapphire-600 hover:from-emerald-700 hover:to-sapphire-700 hover:shadow-xl transform hover:scale-105"
                    }`}
                    title={
                      !hasValidBusiness
                        ? "Login required to create a campaign"
                        : nameError
                        ? "Fix campaign name"
                        : undefined
                    }
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Creating Campaign...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                        <span>Create Campaign</span>
                      </div>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right column – sticky preview */}
          <aside className="lg:sticky lg:top-8">
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Template Preview
                  </h3>
                  <p className="text-xs text-gray-500">
                    See how your campaign will look
                  </p>
                </div>
              </div>

              {hasValidBusiness ? (
                selectedTemplate ? (
                  <div className="flex justify-center">
                    <div className="relative">
                      <PhoneWhatsAppPreview
                        businessName={businessName}
                        templateBody={selectedTemplate.body}
                        parameters={useCsvPersonalization ? [] : templateParams}
                        // For now, only image preview is supported; others will come later.
                        imageUrl={
                          selectedTemplate.headerKind === HK.Image
                            ? headerMediaUrl
                            : ""
                        }
                        buttonParams={(selectedTemplate.buttonParams || []).map(
                          btn => {
                            const originalUrl =
                              btn?.ParameterValue || btn?.parameterValue || "";
                            const subtype = (
                              btn?.SubType ||
                              btn?.subType ||
                              ""
                            ).toLowerCase();
                            const isDynamic =
                              ["url", "copy_code", "flow"].includes(subtype) ||
                              originalUrl.includes("{{1}}");
                            return {
                              text: btn?.Text || btn?.text || "Button",
                              subType: btn?.SubType || btn?.subType || "",
                              type: btn?.Type || btn?.type || "",
                              value: isDynamic ? "" : originalUrl, // quick_reply will show with empty value just fine
                            };
                          }
                        )}
                        width="clamp(330px, 42vw, 410px)"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-[460px] items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-emerald-50">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                          className="w-8 h-8 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500 font-medium">
                        Select a template to preview
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Your campaign preview will appear here
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex h-[460px] items-center justify-center rounded-2xl border-2 border-dashed border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-amber-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-amber-800 font-medium">
                      Waiting for Business ID
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Please wait while we load your business context
                    </p>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default CampaignBuilderPage;
