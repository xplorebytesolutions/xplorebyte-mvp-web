// 📄 src/pages/campaigns/TemplateCampaignList.jsx
import React, { useEffect, useMemo, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";
import WhatsAppBubblePreview from "../../components/WhatsAppBubblePreview";
import TemplateCard from "./components/templates/TemplateCard";
import normalizeCampaign from "../../utils/normalizeTemplate";
import { useNavigate } from "react-router-dom";
import {
  FaRocket,
  FaSearch,
  FaSyncAlt,
  FaListUl,
  FaTable,
  FaThLarge,
  FaFilter,
  FaEye,
  FaEdit,
  FaTrash,
  FaUsers,
  FaPaperPlane,
  FaChartBar,
  FaList,
} from "react-icons/fa";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

const TYPE_FILTERS = [
  { id: "all", label: "All", icon: FaListUl },
  { id: "image_header", label: "Image Header", icon: FaEye },
  { id: "text_only", label: "Text Only", icon: FaEdit },
  { id: "with_buttons", label: "With Buttons", icon: FaPaperPlane },
  { id: "no_buttons", label: "No Buttons", icon: FaChartBar },
];

/* ---------- Inspector Modal ---------- */
function InspectorModal({ item, onClose }) {
  if (!item) return null;

  // Normalize fields from different shapes (DB list vs. detail vs. legacy)
  const messageTemplate =
    item.body || item.messageBody || item.templateBody || "";

  // Buttons can be `buttons`, `multiButtons`, or a JSON string
  let buttonsRaw = item.buttons ?? item.multiButtons ?? [];
  if (typeof buttonsRaw === "string") {
    try {
      buttonsRaw = JSON.parse(buttonsRaw);
    } catch {
      buttonsRaw = [];
    }
  }

  const imageUrl =
    item.imageUrl || item.mediaUrl || item.headerImageUrl || undefined;

  const caption = item.caption || item.imageCaption || "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-6 py-4 bg-gradient-to-r from-sapphire-50 to-emerald-50">
          <div>
            <div className="text-xl font-bold text-gray-900">{item.name}</div>
            <div className="text-sm text-gray-600">Template Preview</div>
          </div>
          <button
            className="rounded-xl border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="p-6">
          <WhatsAppBubblePreview
            messageTemplate={messageTemplate}
            multiButtons={buttonsRaw}
            imageUrl={imageUrl}
            caption={caption}
            campaignId={item.id}
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4 bg-gray-50">
          <button
            className="rounded-xl border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Danger Delete Modal ---------- */
function DangerDeleteModal({
  open,
  target, // { id, name }
  usage, // { status, recipients, queuedJobs, sendLogs }
  loading, // loading usage
  deleting, // deleting flag
  onCancel,
  onConfirm,
}) {
  const [confirmed, setConfirmed] = React.useState(false);
  const [typed, setTyped] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setConfirmed(false);
      setTyped("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="border-b px-6 py-5 bg-red-50">
          <h3 className="text-xl font-bold text-gray-900">
            Delete this campaign permanently?
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            <strong>This action can't be undone.</strong> Deleting will
            permanently remove this campaign and everything linked to it— its
            audience and recipients, any scheduled or queued sends, and the full
            history for this campaign (messages and activity).
          </p>
        </div>

        <div className="px-6 py-5">
          {/* Usage section */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
            {loading ? (
              <div className="text-sm text-gray-600">
                Loading campaign details…
              </div>
            ) : usage ? (
              <ul className="text-sm text-gray-800 space-y-2">
                <li className="flex justify-between">
                  <span className="text-gray-500">Name:</span>
                  <strong>{target?.name || "Untitled"}</strong>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <strong>{usage.status}</strong>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500">Recipients:</span>
                  <strong>{usage.recipients}</strong>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500">Scheduled/queued sends:</span>
                  <strong>{usage.queuedJobs}</strong>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500">Messages sent:</span>
                  <strong>{usage.sendLogs}</strong>
                </li>
              </ul>
            ) : (
              <div className="text-sm text-gray-600">No details available.</div>
            )}
          </div>

          {/* Confirmations */}
          <div className="mt-6 space-y-4">
            <label className="flex items-start gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-400"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
              />
              <span>
                I understand this will permanently delete this campaign, its
                audience/recipients, any scheduled sends, and its history.
              </span>
            </label>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Type the campaign name to confirm:
              </label>
              <input
                value={typed}
                onChange={e => setTyped(e.target.value)}
                placeholder={target?.name || "Campaign name"}
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-300 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4 bg-gray-50">
          <button
            className="rounded-xl border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={onCancel}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            className={cx(
              "rounded-xl px-4 py-2 text-white font-medium transition-colors",
              deleting ? "bg-red-400" : "bg-red-600 hover:bg-red-700"
            )}
            onClick={onConfirm}
            disabled={
              deleting ||
              !confirmed ||
              (typed || "").trim() !== (target?.name || "").trim()
            }
          >
            {deleting ? "Deleting…" : "Permanently delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
function TemplateCampaignList() {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null); // for card/table spinner
  const [q, setQ] = useState("");
  const [onlyWithRecipients, setOnlyWithRecipients] = useState(false);
  const [sort, setSort] = useState("recent"); // recent | recipients | name
  const [activeType, setActiveType] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // grid | table
  const [inspector, setInspector] = useState(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [usage, setUsage] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/campaign/get-image-campaign");
      setRaw(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to load template campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleSend = async campaignId => {
    setSendingId(campaignId);
    try {
      await axiosClient.post(`/campaign/send-campaign/${campaignId}`);
      toast.success("🚀 Campaign sent successfully!");
    } catch (err) {
      console.error("❌ Sending failed:", err);
      toast.error("❌ Failed to send campaign");
    } finally {
      setSendingId(null);
    }
  };

  // Open delete modal: fetch usage
  const openDelete = async item => {
    setDeleteTarget(item);
    setUsage(null);
    setUsageLoading(true);
    try {
      const res = await axiosClient.get(`/campaign/${item.id}/usage`);
      setUsage(res.data);
    } catch (err) {
      console.error("Usage fetch failed", err);
      toast.error("❌ Could not load campaign usage");
    } finally {
      setUsageLoading(false);
    }
  };

  // Confirm delete: call DELETE ?force=true
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeletingId(deleteTarget.id);
    try {
      const res = await axiosClient.delete(`/campaign/${deleteTarget.id}`, {
        params: { force: true },
      });
      toast.success(res?.data?.message || "🗑️ Campaign deleted permanently.");
      // Close modal + refresh
      setDeleteTarget(null);
      setUsage(null);
      await loadCampaigns();
    } catch (err) {
      console.error("Delete failed", err);
      const msg =
        err?.response?.data?.message || "❌ Failed to delete campaign.";
      if (err?.response?.status === 409) {
        toast.error(
          msg || "❌ Cannot delete while campaign is sending. Cancel or wait."
        );
      } else if (err?.response?.status === 400) {
        toast.error(
          msg ||
            "❌ Delete failed — only draft campaigns can be deleted without force."
        );
      } else if (err?.response?.status === 404) {
        toast.error("❌ Campaign not found.");
      } else {
        toast.error(msg);
      }
    } finally {
      setDeleting(false);
      setDeletingId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
    setUsage(null);
    setUsageLoading(false);
    setDeleting(false);
  };

  const data = useMemo(() => raw.map(normalizeCampaign), [raw]);

  const view = useMemo(() => {
    let list = data;

    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter(
        c =>
          c.name.toLowerCase().includes(needle) ||
          c.body.toLowerCase().includes(needle)
      );
    }

    if (onlyWithRecipients) list = list.filter(c => c.recipients > 0);

    if (activeType !== "all") {
      list = list.filter(c => {
        if (activeType === "image_header") return c.kind === "image_header";
        if (activeType === "text_only") return c.kind === "text_only";
        if (activeType === "with_buttons") return c.hasButtons;
        if (activeType === "no_buttons") return !c.hasButtons;
        return true;
      });
    }

    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "recipients") return b.recipients - a.recipients;
      const ax = new Date(a.updatedAt || 0).getTime();
      const bx = new Date(b.updatedAt || 0).getTime();
      return bx - ax; // recent
    });

    return list;
  }, [data, q, onlyWithRecipients, activeType, sort]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-sapphire-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <FaRocket className="text-white text-xl" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Template Campaigns
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Manage and send your WhatsApp template campaigns
                  </p>
                </div>
              </div>
              <button
                onClick={loadCampaigns}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                title="Refresh"
              >
                <FaSyncAlt className={cx(loading && "animate-spin")} />
                Refresh
              </button>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative">
                <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search by name or message…"
                  className="w-full lg:w-80 rounded-xl border border-gray-200 pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-sapphire-300 focus:border-sapphire-300 outline-none"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={onlyWithRecipients}
                    onChange={e => setOnlyWithRecipients(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-sapphire-600 focus:ring-sapphire-400"
                  />
                  Only with recipients
                </label>

                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className="rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-sapphire-300 focus:border-sapphire-300 outline-none"
                >
                  <option value="recent">Sort: Recent</option>
                  <option value="recipients">Sort: Recipients</option>
                  <option value="name">Sort: Name</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Segmented filters */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FaFilter className="text-sapphire-500" />
              Filter by type:
            </span>
            {TYPE_FILTERS.map(f => {
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    activeType === f.id
                      ? "bg-sapphire-600 text-white shadow-lg"
                      : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                  )}
                  onClick={() => setActiveType(f.id)}
                >
                  <Icon className="w-4 h-4" />
                  {f.label}
                </button>
              );
            })}

            <div className="ml-auto flex items-center gap-2">
              <button
                className={cx(
                  "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                  viewMode === "grid"
                    ? "bg-sapphire-50 border-sapphire-200 text-sapphire-700"
                    : "text-gray-700 border-gray-200 hover:bg-gray-50"
                )}
                onClick={() => setViewMode("grid")}
                title="Grid view"
              >
                <FaThLarge />
                Grid
              </button>
              <button
                className={cx(
                  "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                  viewMode === "table"
                    ? "bg-sapphire-50 border-sapphire-200 text-sapphire-700"
                    : "text-gray-700 border-gray-200 hover:bg-gray-50"
                )}
                onClick={() => setViewMode("table")}
                title="Table view"
              >
                <FaTable />
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm animate-pulse"
              >
                <div className="h-40 w-full rounded-xl bg-gray-100" />
                <div className="mt-4 h-6 w-2/3 rounded bg-gray-100" />
                <div className="mt-2 h-4 w-1/3 rounded bg-gray-100" />
                <div className="mt-4 h-20 w-full rounded bg-gray-100" />
                <div className="mt-6 flex gap-2">
                  <div className="h-10 w-24 rounded bg-gray-100" />
                  <div className="h-10 w-24 rounded bg-gray-100" />
                  <div className="h-10 w-24 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && view.length === 0 && (
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <div className="rounded-3xl border border-gray-200 p-12 shadow-sm bg-white max-w-lg">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-sapphire-100 to-emerald-100">
                <FaListUl className="text-sapphire-600 text-2xl" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                No template campaigns yet
              </h3>
              <p className="text-gray-600 mb-8">
                Create an image template campaign and assign recipients to start
                sending.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={loadCampaigns}
                  className="rounded-xl border border-gray-200 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GRID VIEW */}
        {!loading && view.length > 0 && viewMode === "grid" && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {view.map(t => {
              const sending = sendingId === t.id;
              const deletingThis = deletingId === t.id;
              return (
                <TemplateCard
                  key={t.id}
                  t={t}
                  sending={sending}
                  deleting={deletingThis}
                  onPreview={() => setInspector(t)}
                  onSend={() => handleSend(t.id)}
                  onAssign={() =>
                    navigate(
                      `/app/campaigns/image-campaigns/assign-contacts/${t.id}`
                    )
                  }
                  onViewRecipients={() =>
                    navigate(
                      `/app/campaigns/image-campaigns/assigned-contacts/${t.id}`
                    )
                  }
                  onDelete={() => openDelete(t)}
                />
              );
            })}
          </div>
        )}

        {/* TABLE VIEW (compact) */}
        {!loading && view.length > 0 && viewMode === "table" && (
          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 z-10 bg-gray-50 text-left text-gray-700 border-b">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Name</th>
                    <th className="px-3 py-2 font-semibold">Type</th>
                    <th className="px-3 py-2 font-semibold">Buttons</th>
                    <th className="px-3 py-2 font-semibold">Recipients</th>
                    <th className="px-3 py-2 font-semibold">Updated</th>
                    <th className="px-3 py-2 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {view.map(t => {
                    const deletingThis = deletingId === t.id;
                    return (
                      <tr
                        key={t.id}
                        className="border-t hover:bg-gray-50/70 transition-colors"
                      >
                        <td className="px-3 py-2 font-medium text-gray-900">
                          {t.name}
                        </td>
                        <td className="px-3 py-2">
                          {t.kind === "image_header"
                            ? "Image Header"
                            : "Text Only"}
                        </td>
                        <td className="px-3 py-2">
                          {t.hasButtons ? t.buttons.length : 0}
                        </td>
                        <td className="px-3 py-2">{t.recipients}</td>
                        <td className="px-3 py-2">
                          {t.updatedAt
                            ? new Date(t.updatedAt).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            <button
                              className="rounded-md border px-2.5 py-1.5 hover:bg-gray-50"
                              onClick={() => setInspector(t)}
                            >
                              Preview
                            </button>

                            <button
                              className="rounded-md bg-yellow-100 px-2.5 py-1.5 text-yellow-800 hover:bg-yellow-200"
                              onClick={() =>
                                navigate(`/app/campaigns/logs/${t.id}`)
                              }
                            >
                              Log
                            </button>

                            <button
                              className="rounded-md bg-purple-100 px-2.5 py-1.5 text-purple-800 hover:bg-purple-200"
                              onClick={() =>
                                navigate(
                                  `/app/campaigns/image-campaigns/assign-contacts/${t.id}`
                                )
                              }
                            >
                              Assign
                            </button>

                            <button
                              className="rounded-md bg-blue-100 px-2.5 py-1.5 text-blue-700 hover:bg-blue-200"
                              onClick={() =>
                                navigate(
                                  `/app/campaigns/image-campaigns/assigned-contacts/${t.id}`
                                )
                              }
                            >
                              Recipients
                            </button>

                            {/* Delete in table row */}
                            <button
                              className="rounded-md border px-2.5 py-1.5 text-red-700 border-red-300 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                              onClick={() => openDelete(t)}
                              disabled={deletingThis}
                              title="Delete campaign"
                            >
                              {deletingThis ? "Deleting…" : "Delete"}
                            </button>

                            <button
                              className="rounded-md bg-emerald-600 px-2.5 py-1.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                              disabled={t.recipients === 0}
                              onClick={() => handleSend(t.id)}
                            >
                              Send
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <InspectorModal item={inspector} onClose={() => setInspector(null)} />

        <DangerDeleteModal
          open={!!deleteTarget}
          target={deleteTarget}
          usage={usage}
          loading={usageLoading}
          deleting={deleting}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />
      </div>
    </div>
  );
}
export default TemplateCampaignList;
