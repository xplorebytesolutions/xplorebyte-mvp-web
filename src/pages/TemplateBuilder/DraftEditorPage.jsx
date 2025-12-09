import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  useParams,
  useSearchParams,
  useNavigate,
  Link,
} from "react-router-dom";
import { toast } from "react-toastify";
import {
  Eye,
  Send,
  ShieldCheck,
  Save,
  ChevronLeft,
  Upload,
  Loader2,
} from "lucide-react";

import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../app/providers/AuthProvider";
import { FK } from "../../capabilities/featureKeys";
import { Card } from "../../components/ui/card";
import DraftStatusBadge from "./components/DraftStatusBadge";
import HeaderMediaUploader from "./components/HeaderMediaUploader";

// Default one-language flow per your backend decision
const DEFAULT_LANG = "en_US";

export default function DraftEditorPage() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const { isLoading, can, hasAllAccess, businessId } = useAuth();
  const [params, setParams] = useSearchParams();

  const language = params.get("language") || DEFAULT_LANG;

  // RBAC: edit/submit drafts require CAMPAIGN_CREATE
  const canEdit = hasAllAccess || can(FK.CAMPAIGN_CREATE);

  // Variant form state (simple MVP)
  const [name, setName] = useState(""); // final template name (slug-like)
  const [category, setCategory] = useState("UTILITY"); // MARKETING | UTILITY | AUTHENTICATION
  const [headerType, setHeaderType] = useState("NONE"); // NONE | TEXT | IMAGE | VIDEO | DOCUMENT
  const [headerText, setHeaderText] = useState(""); // when headerType = TEXT
  const [headerMediaHandle, setHeaderMediaHandle] = useState(""); // when media header
  const [bodyText, setBodyText] = useState(""); // may include {{1}}, {{2}} …
  const [footerText, setFooterText] = useState("");
  const [buttons, setButtons] = useState([]); // max 3
  const [examples, setExamples] = useState([""]); // example body values

  // Auxiliary state
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState(null); // { human, components }
  const [status, setStatus] = useState(null); // { name, language, status, reason }

  const onLanguageChange = next => {
    setParams(p => {
      const clone = new URLSearchParams(p);
      clone.set("language", next);
      return clone;
    });
  };

  // --- Load current status + preview as source of truth (no direct GET variant API) ---
  const loadStatus = useCallback(async () => {
    try {
      const { data } = await axiosClient.get(
        `/api/template-builder/drafts/${draftId}/status`
      );
      setStatus(data || null);
      // If backend echoes name/lang, seed name
      if (data?.name) setName(prev => prev || data.name);
    } catch (err) {
      // Non-fatal; drafts might not be approved yet
    }
  }, [draftId]);

  const loadPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const { data } = await axiosClient.get(
        `/api/template-builder/drafts/${draftId}/preview`,
        { params: { language } }
      );
      setPreview(data || null);

      // Seed editor state from preview payload if available
      if (data?.components) {
        // components is the exact Meta payload your preview service returns
        const header = (data.components || []).find(c => c.type === "HEADER");
        const body = (data.components || []).find(c => c.type === "BODY");
        const footer = (data.components || []).find(c => c.type === "FOOTER");
        const btns = (data.components || []).find(c => c.type === "BUTTONS");

        if (header) {
          const kind =
            header.format || header.text ? header.format || "TEXT" : "NONE";
          setHeaderType(kind); // IMAGE/VIDEO/DOCUMENT/TEXT/NONE
          if (kind === "TEXT") setHeaderText(header.text || "");
          if (["IMAGE", "VIDEO", "DOCUMENT"].includes(kind)) {
            // header example may include a "handle" hint in preview’s struct; keep empty otherwise
          }
        } else {
          setHeaderType("NONE");
          setHeaderText("");
        }

        if (body) setBodyText(body.text || "");
        if (footer) setFooterText(footer.text || "");
        if (btns?.buttons) setButtons(btns.buttons.slice(0, 3));
      }

      // Try to seed category if preview includes it
      if (data?.category) setCategory(data.category);
    } catch (err) {
      // Will be empty on first load; user will edit and save
    } finally {
      setPreviewLoading(false);
    }
  }, [draftId, language]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  // --- Save variant (PUT /drafts/{id}/variant/{language}) ---
  const handleSave = async () => {
    if (!canEdit) return;
    if (!name?.trim()) {
      toast.warn("Template name is required.");
      return;
    }
    if (headerType === "TEXT" && !headerText?.trim()) {
      toast.warn("Header text is required when header type is TEXT.");
      return;
    }
    if (
      ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType) &&
      !headerMediaHandle
    ) {
      toast.warn("Upload/attach header media first.");
      return;
    }

    const variant = {
      name,
      language,
      category,
      headerType,
      headerText: headerType === "TEXT" ? headerText : "",
      headerMediaHandle: ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType)
        ? headerMediaHandle
        : "",
      bodyText,
      footerText,
      buttons: (buttons || []).slice(0, 3),
      examples, // array of example values to render {{n}}
    };

    setSaving(true);
    try {
      await axiosClient.put(
        `/api/template-builder/drafts/${draftId}/variant/${language}`,
        variant
      );
      toast.success("Draft saved.");
      await loadPreview();
    } catch (err) {
      toast.error("Failed to save draft.");
    } finally {
      setSaving(false);
    }
  };

  // --- Name check ---
  const handleNameCheck = async () => {
    setChecking(true);
    try {
      const { data } = await axiosClient.get(
        `/api/template-builder/drafts/${draftId}/name-check`,
        { params: { language } }
      );
      if (data?.available) {
        toast.success("Name is available in this language.");
      } else {
        toast.warn(data?.message || "Name not available.");
      }
    } catch (err) {
      toast.error("Name check failed.");
    } finally {
      setChecking(false);
    }
  };

  // --- Preview (fresh) ---
  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const { data } = await axiosClient.get(
        `/api/template-builder/drafts/${draftId}/preview`,
        { params: { language } }
      );
      setPreview(data || null);
    } catch (err) {
      toast.error("Failed to load preview.");
    } finally {
      setPreviewLoading(false);
    }
  };

  // --- Submit to Meta ---
  const handleSubmit = async () => {
    if (!canEdit) return;
    setSubmitting(true);
    try {
      const { data } = await axiosClient.post(
        `/api/template-builder/drafts/${draftId}/submit`
      );
      toast.success("Submitted to Meta. Status will update after review.");
      await loadStatus();
      // Optional: navigate to Library or stay here
    } catch (err) {
      toast.error("Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">Loading profile…</div>
    );
  }

  if (!canEdit) {
    return (
      <div className="p-8">
        <Link
          to="/app/template-builder/library"
          className="text-purple-600 hover:underline flex items-center gap-2 mb-4"
        >
          <ChevronLeft size={18} /> Back to Library
        </Link>
        <Card className="p-6">
          <div className="text-lg font-semibold text-purple-800 mb-2">
            Insufficient permissions
          </div>
          <p className="text-gray-600">
            You don’t have access to edit/submit templates. Contact your admin.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Link
        to="/app/template-builder/library"
        className="text-purple-600 hover:underline flex items-center gap-2 mb-4"
      >
        <ChevronLeft size={18} /> Back to Library
      </Link>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold text-purple-800">Draft Editor</h2>
        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={e => onLanguageChange(e.target.value)}
            className="rounded border-gray-300 text-sm"
          >
            <option value="en_US">English (en_US)</option>
          </select>
          <DraftStatusBadge status={status} />
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Edit your draft variant, preview with examples, check name collision,
        and submit to Meta.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Editor */}
        <Card className="p-5">
          <div className="grid grid-cols-1 gap-4">
            {/* Name + Category */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-sm text-gray-600">Template Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., order_update_v2"
                  className="mt-1 w-full rounded border-gray-300"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="mt-1 w-full rounded border-gray-300"
                >
                  <option value="UTILITY">Utility</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="AUTHENTICATION">Authentication</option>
                </select>
              </div>
            </div>

            {/* Header */}
            <div>
              <label className="text-sm text-gray-600">Header</label>
              <div className="mt-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={headerType}
                  onChange={e => setHeaderType(e.target.value)}
                  className="rounded border-gray-300"
                >
                  <option value="NONE">None</option>
                  <option value="TEXT">Text</option>
                  <option value="IMAGE">Image</option>
                  <option value="VIDEO">Video</option>
                  <option value="DOCUMENT">Document</option>
                </select>

                {headerType === "TEXT" && (
                  <input
                    value={headerText}
                    onChange={e => setHeaderText(e.target.value)}
                    placeholder="Header text"
                    className="md:col-span-2 rounded border-gray-300"
                  />
                )}

                {["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType) && (
                  <div className="md:col-span-2">
                    <HeaderMediaUploader
                      mediaType={headerType}
                      handle={headerMediaHandle}
                      onUploaded={h => setHeaderMediaHandle(h)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Body */}
            <div>
              <label className="text-sm text-gray-600">Body</label>
              <textarea
                value={bodyText}
                onChange={e => setBodyText(e.target.value)}
                rows={6}
                placeholder="Hello {{1}}, your order {{2}} is confirmed."
                className="mt-1 w-full rounded border-gray-300"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use placeholders like <code>{"{{1}}"}</code>,{" "}
                <code>{"{{2}}"}</code>. Max 1024 chars.
              </p>
            </div>

            {/* Footer */}
            <div>
              <label className="text-sm text-gray-600">Footer (optional)</label>
              <input
                value={footerText}
                onChange={e => setFooterText(e.target.value)}
                placeholder="For queries, reply HELP"
                className="mt-1 w-full rounded border-gray-300"
              />
            </div>

            {/* Buttons (≤3) */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600">Buttons (max 3)</label>
                <button
                  type="button"
                  onClick={() =>
                    setButtons(prev =>
                      prev.length < 3
                        ? [...prev, { type: "URL", text: "", url: "" }]
                        : prev
                    )
                  }
                  className="text-purple-600 text-sm flex items-center gap-1"
                >
                  <Save size={16} /> Add Button
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {buttons.map((b, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-1 md:grid-cols-3 gap-2"
                  >
                    <select
                      value={b.type}
                      onChange={e =>
                        setButtons(btns => {
                          const c = [...btns];
                          c[i] = { ...c[i], type: e.target.value };
                          return c;
                        })
                      }
                      className="rounded border-gray-300"
                    >
                      <option value="URL">URL</option>
                      <option value="PHONE_NUMBER">Phone</option>
                      <option value="QUICK_REPLY">Quick Reply</option>
                    </select>
                    <input
                      value={b.text || ""}
                      onChange={e =>
                        setButtons(btns => {
                          const c = [...btns];
                          c[i] = { ...c[i], text: e.target.value };
                          return c;
                        })
                      }
                      placeholder="Button text"
                      className="rounded border-gray-300"
                    />
                    <input
                      value={b.url || b.phone_number || ""}
                      onChange={e =>
                        setButtons(btns => {
                          const c = [...btns];
                          const key =
                            c[i].type === "PHONE_NUMBER"
                              ? "phone_number"
                              : "url";
                          c[i] = { ...c[i], [key]: e.target.value };
                          return c;
                        })
                      }
                      placeholder={
                        b.type === "PHONE_NUMBER" ? "+91..." : "https://…"
                      }
                      className="rounded border-gray-300"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Examples */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600">
                  Example values (for preview)
                </label>
                <button
                  type="button"
                  onClick={() => setExamples(prev => [...prev, ""])}
                  className="text-purple-600 text-sm"
                >
                  + Add example
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {examples.map((ex, i) => (
                  <input
                    key={i}
                    value={ex}
                    onChange={e =>
                      setExamples(arr => {
                        const copy = [...arr];
                        copy[i] = e.target.value;
                        return copy;
                      })
                    }
                    placeholder={`Example ${i + 1}`}
                    className="w-full rounded border-gray-300"
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                Save
              </button>

              <button
                onClick={handlePreview}
                disabled={previewLoading}
                className="inline-flex items-center gap-2 rounded border px-4 py-2 hover:bg-gray-50 disabled:opacity-60"
              >
                {previewLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Eye size={18} />
                )}
                Preview
              </button>

              <button
                onClick={handleNameCheck}
                disabled={checking}
                className="inline-flex items-center gap-2 rounded border px-4 py-2 hover:bg-gray-50 disabled:opacity-60"
              >
                {checking ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <ShieldCheck size={18} />
                )}
                Name Check
              </button>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="ml-auto inline-flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Send size={18} />
                )}
                Submit to Meta
              </button>
            </div>
          </div>
        </Card>

        {/* Right: Live Preview */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-purple-700 font-semibold">Preview</div>
            {previewLoading && (
              <Loader2 className="animate-spin text-gray-400" size={18} />
            )}
          </div>
          {!preview ? (
            <div className="text-gray-500 text-sm">
              No preview yet. Click <b>Preview</b> to render.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Human preview (simple) */}
              <div className="rounded border p-3 bg-gray-50">
                <div className="text-xs uppercase text-gray-500 mb-1">
                  Human Preview
                </div>
                <pre className="whitespace-pre-wrap text-sm text-gray-800">
                  {preview.human || "—"}
                </pre>
              </div>

              {/* Meta components (payload) */}
              <div className="rounded border p-3">
                <div className="text-xs uppercase text-gray-500 mb-1">
                  Meta Components
                </div>
                <pre className="overflow-auto text-xs">
                  {JSON.stringify(preview.components || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
