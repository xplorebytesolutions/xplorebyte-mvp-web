// 📄 src/pages/admin/AccessControl/PermissionFormDrawer.jsx
import React, { useEffect, useState } from "react";
import { X, Shield } from "lucide-react";

export default function PermissionFormDrawer({
  open,
  mode, // "create" | "edit"
  initialValue, // permission dto or null
  onClose,
  onSubmit, // async (values) => Promise<void>
}) {
  const isEdit = mode === "edit";

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // when drawer opens or initialValue changes, seed form
  useEffect(() => {
    if (!open) return;

    if (initialValue) {
      setCode(initialValue.code || "");
      setName(initialValue.name || "");
      setGroup(initialValue.group || "");
      setDescription(initialValue.description || "");
    } else {
      setCode("");
      setName("");
      setGroup("");
      setDescription("");
    }
  }, [open, initialValue]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!onSubmit) return;

    const payload = {
      code: code.trim(),
      name: name.trim(),
      group: group.trim(),
      description: description.trim(),
    };

    if (!payload.code || !payload.name) {
      // frontend-level sanity check
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {isEdit ? "Edit Permission" : "New Permission"}
              </h2>
              <p className="text-xs text-slate-500">
                Canonical feature flag used by plans and workspace guards.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4"
        >
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">
              Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
              placeholder="MESSAGING.SEND.TEXT"
              value={code}
              onChange={e => setCode(e.target.value)}
              disabled={isEdit} // code is immutable once created
            />
            <p className="text-[11px] text-slate-400">
              Stable, uppercase identifier. Used in JWT claims, PlanPermissions
              and feature guards. Avoid changing once in use.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Send Direct Text Messages"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">
              Group / Module
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Messaging, Campaigns, Catalog, Admin…"
              value={group}
              onChange={e => setGroup(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">
              Description
            </label>
            <textarea
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
              rows={3}
              placeholder="Controls access to sending one-to-one free text messages from the Messaging workspace."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={submitting}
          >
            {submitting
              ? isEdit
                ? "Saving…"
                : "Creating…"
              : isEdit
              ? "Save Changes"
              : "Create Permission"}
          </button>
        </div>
      </div>
    </>
  );
}
