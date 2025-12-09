// 📄 src/pages/admin/AccessControl/PermissionsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify";
import {
  Shield,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
} from "lucide-react";
import PermissionFormDrawer from "./PermissionFormDrawer";

export default function PermissionsPage() {
  const [items, setItems] = useState([]); // flat list from API
  const [loading, setLoading] = useState(false);

  // drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("create"); // "create" | "edit"
  const [editingItem, setEditingItem] = useState(null);

  // Group by "group" (module/workspace) for nicer UX
  const grouped = useMemo(() => {
    const byGroup = new Map();

    items.forEach(p => {
      const key = p.group || "Ungrouped";
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key).push(p);
    });

    for (const arr of byGroup.values()) {
      arr.sort((a, b) => a.code.localeCompare(b.code));
    }

    return Array.from(byGroup.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get("/permission");
      const data = Array.isArray(res.data) ? res.data : [];
      setItems(data);
    } catch (err) {
      console.error("Failed to load permissions", err);
      toast.error("Failed to load permissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  // open drawer in "create" mode
  const handleCreateClick = () => {
    setDrawerMode("create");
    setEditingItem(null);
    setDrawerOpen(true);
  };

  // open drawer in "edit" mode
  const handleEditClick = item => {
    setDrawerMode("edit");
    setEditingItem(item);
    setDrawerOpen(true);
  };

  // create or update on submit
  const handleDrawerSubmit = async values => {
    try {
      if (drawerMode === "create") {
        await axiosClient.post("/permission", values);
        toast.success("Permission created.");
      } else if (drawerMode === "edit" && editingItem?.id) {
        await axiosClient.put(`/permission/${editingItem.id}`, values);
        toast.success("Permission updated.");
      }

      await loadPermissions();
      setDrawerOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error("Failed to save permission", err);

      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to save permission.";
      toast.error(msg);
      // rethrow so drawer can stop the spinner correctly
      throw err;
    }
  };

  // soft delete (deactivate) permission
  const handleDeactivateClick = async item => {
    const confirmed = window.confirm(
      `Deactivate permission "${item.code}"?\n\nThis will mark it inactive. Plan mappings may still reference it, but feature guards will usually ignore inactive permissions.`
    );
    if (!confirmed) return;

    try {
      await axiosClient.delete(`/permission/${item.id}`);
      toast.success("Permission deactivated.");
      await loadPermissions();
    } catch (err) {
      console.error("Failed to deactivate permission", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to deactivate permission.";
      toast.error(msg);
    }
  };

  return (
    <div className="px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            <span>Permissions</span>
          </h1>
          <p className="text-sm text-slate-500 max-w-3xl">
            Canonical capabilities that plans can grant to businesses. These
            power the Entitlements snapshot and workspace guards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCreateClick}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm"
          >
            <Plus className="w-3 h-3" />
            New Permission
          </button>
        </div>
      </div>

      {/* Content Card */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="w-full py-10 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading permissions…</span>
            </div>
          </div>
        ) : grouped.length === 0 ? (
          <div className="w-full py-10 flex flex-col items-center justify-center gap-2 text-sm text-slate-500">
            <div>No permissions found.</div>
            <div className="text-xs text-slate-400">
              Use “New Permission” to add your first capability.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {grouped.map(([groupName, perms]) => (
              <div key={groupName} className="p-4 space-y-3">
                {/* Group header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {groupName}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {perms.length} item{perms.length !== 1 && "s"}
                  </span>
                </div>

                {/* Table */}
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-left text-[11px] text-slate-500">
                        <th className="px-3 py-2 font-medium">Code</th>
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">Description</th>
                        <th className="px-3 py-2 font-medium w-24">Status</th>
                        <th className="px-3 py-2 font-medium w-24 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {perms.map(p => (
                        <tr
                          key={p.id}
                          className="border-t border-slate-100 hover:bg-slate-50/80"
                        >
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-800">
                            {p.code}
                          </td>
                          <td className="px-3 py-2 text-slate-900">{p.name}</td>
                          <td className="px-3 py-2 text-slate-500">
                            {p.description || (
                              <span className="italic text-slate-400">
                                No description
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {p.isActive ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 text-[10px]">
                                <CheckCircle2 className="w-3 h-3" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-[10px]">
                                <XCircle className="w-3 h-3" />
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditClick(p)}
                                className="p-1 rounded-md hover:bg-slate-100 text-slate-600"
                                title="Edit"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              {p.isActive && (
                                <button
                                  type="button"
                                  onClick={() => handleDeactivateClick(p)}
                                  className="p-1 rounded-md hover:bg-slate-100 text-red-500"
                                  title="Deactivate"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-500">
        Changes here are reflected in the Entitlements snapshot and workspace
        feature guards. Use plan mappings to decide which businesses get which
        permissions.
      </p>

      {/* Drawer for create/edit */}
      <PermissionFormDrawer
        open={drawerOpen}
        mode={drawerMode}
        initialValue={editingItem}
        onClose={() => {
          setDrawerOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleDrawerSubmit}
      />
    </div>
  );
}
