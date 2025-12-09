import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ShieldCheck, UserCog } from "lucide-react";

import { getPlanPermissions } from "../../../api/plans";
import { getGroupedPermissions } from "../../../api/permissions";
import {
  getUserPermissionOverrides,
  upsertUserPermissionOverride,
  deleteUserPermissionOverride,
} from "../../../api/userPermissions";
import { getBusinessUsers } from "../../../api/users";
import { useAuth } from "../../../app/providers/AuthProvider";

/**
 * User Permission Overrides (Admin)
 *
 * Flow:
 * - Business owner opens Settings → "User Access & Permissions".
 * - We detect the current businessId from auth and load all users for that business.
 * - Admin selects a user from a dropdown.
 * - We show plan defaults + per-user overrides (Allow / Deny / Inherit).
 */
export default function UserPermissionOverrides() {
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  const authLoading = auth?.isLoading;

  // --- Auth / context -------------------------------------------------------

  const qsUserId = searchParams.get("userId");
  const qsPlanId = searchParams.get("planId");

  const authUser = auth?.user || auth?.session || auth || {};

  const authUserId = authUser.userId || authUser.id || authUser.sub || null;

  const authBusinessId =
    authUser.businessId || authUser.business_id || auth?.businessId || null;

  const authPlanId =
    authUser.planId || authUser.plan_id || auth?.planId || null;

  const planId = qsPlanId || authPlanId || null;

  // --- Local state ----------------------------------------------------------

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [planPermissions, setPlanPermissions] = useState([]);
  const [groupedPermissions, setGroupedPermissions] = useState([]);
  const [userOverrides, setUserOverrides] = useState([]);

  // Selected user object from list
  const selectedUser = useMemo(
    () => users.find(u => u.id === selectedUserId),
    [users, selectedUserId]
  );

  const userContext = {
    displayName:
      selectedUser?.fullName ||
      selectedUser?.name ||
      selectedUser?.email ||
      "No user selected",
    email: selectedUser?.email || "",
    planName:
      authUser.planName ||
      authUser.plan_name ||
      (planId ? "Current Plan" : "Not linked yet"),
  };

  // Map for plan permissions
  const planPermissionMap = useMemo(() => {
    const map = {};
    for (const pp of planPermissions || []) {
      const permissionId =
        pp.permissionId || pp.permissionID || pp.permission?.id;
      if (!permissionId) continue;
      map[permissionId] = pp;
    }
    return map;
  }, [planPermissions]);

  // Map for overrides
  const overrideMap = useMemo(() => {
    const map = {};
    for (const ov of userOverrides || []) {
      if (!ov.permissionId) continue;
      map[ov.permissionId] = ov;
    }
    return map;
  }, [userOverrides]);

  // --- Effect 1: load users for current business ----------------------------

  useEffect(() => {
    if (authLoading) return;
    if (!authBusinessId) {
      console.warn(
        "UserPermissionOverrides: no businessId from auth. Cannot load users."
      );
      return;
    }

    const loadUsers = async () => {
      setUsersLoading(true);
      try {
        const list = await getBusinessUsers(authBusinessId);
        const usersArray = Array.isArray(list)
          ? list
          : Array.isArray(list?.data)
          ? list.data
          : [];

        setUsers(usersArray);

        if (usersArray.length === 0) {
          setSelectedUserId(null);
          return;
        }

        // Priority for default selected user:
        // 1) userId from query string (if present in list)
        // 2) logged-in user (if present in list)
        // 3) first user in list
        const qsMatch = qsUserId && usersArray.find(u => u.id === qsUserId)?.id;

        const authMatch =
          authUserId && usersArray.find(u => u.id === authUserId)?.id;

        const fallback = usersArray[0].id;

        setSelectedUserId(qsMatch || authMatch || fallback);
      } catch (err) {
        console.error("Failed to load business users:", err);
        toast.error("Failed to load users for this account.");
        setUsers([]);
        setSelectedUserId(null);
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsers();
  }, [authLoading, authBusinessId, qsUserId, authUserId]);

  // --- Effect 2: load permissions + overrides for selected user -------------

  useEffect(() => {
    if (authLoading) return;
    if (!selectedUserId) {
      // no user selected → nothing to load yet
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        // Always load grouped permissions + overrides
        const promises = [
          getGroupedPermissions(),
          getUserPermissionOverrides(selectedUserId),
        ];

        if (planId) {
          promises.push(getPlanPermissions(planId));
        }

        const [groupedRes, overridesRes, planPermRes] = await Promise.all(
          promises
        );

        // Normalise groups
        let groups = [];
        if (Array.isArray(groupedRes)) {
          groups = groupedRes;
        } else if (Array.isArray(groupedRes?.groups)) {
          groups = groupedRes.groups;
        } else if (Array.isArray(groupedRes?.data)) {
          groups = groupedRes.data;
        }
        setGroupedPermissions(groups || []);

        setUserOverrides(overridesRes || []);

        if (planPermRes) {
          const list = Array.isArray(planPermRes)
            ? planPermRes
            : Array.isArray(planPermRes?.items)
            ? planPermRes.items
            : planPermRes.data || [];
          setPlanPermissions(list || []);
        } else {
          setPlanPermissions([]);
        }
      } catch (err) {
        console.error("Failed to load permission data:", err);
        toast.error("Failed to load permission data.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedUserId, planId, authLoading]);

  // --- Helpers --------------------------------------------------------------

  function getPermissionState(permissionId) {
    const ov = overrideMap[permissionId];
    if (ov && ov.isRevoked !== true) {
      return ov.isGranted ? "allow" : "deny";
    }
    return "inherit";
  }

  async function handleSetOverride(permissionId, targetState) {
    if (!selectedUserId) {
      toast.warn("Select a user first before changing overrides.");
      return;
    }

    try {
      if (targetState === "inherit") {
        await deleteUserPermissionOverride(selectedUserId, permissionId);
        setUserOverrides(prev =>
          prev.filter(ov => ov.permissionId !== permissionId)
        );
        toast.success("Override cleared. Using plan default.");
      } else {
        const isGranted = targetState === "allow";
        const updated = await upsertUserPermissionOverride(selectedUserId, {
          permissionId,
          isGranted,
        });

        setUserOverrides(prev => {
          const idx = prev.findIndex(ov => ov.permissionId === permissionId);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = updated;
            return copy;
          }
          return [...prev, updated];
        });

        toast.success(
          isGranted
            ? "Permission explicitly allowed for this user."
            : "Permission explicitly denied for this user."
        );
      }
    } catch (err) {
      console.error("Failed to update override:", err);
      toast.error("Failed to update user permission override.");
    }
  }

  // If we truly have no businessId, explain to the developer
  if (!authLoading && !authBusinessId) {
    return (
      <div className="p-6">
        <div className="max-w-xl bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">
            User Permission Overrides
          </h1>
          <p className="text-sm text-slate-600">
            This page could not determine the current business from the auth
            context.
          </p>
          <p className="text-sm text-slate-600 mt-2">
            As a developer, please ensure <code>useAuth()</code> exposes a{" "}
            <code>businessId</code> or <code>user.businessId</code> field.
          </p>
        </div>
      </div>
    );
  }

  // --- UI -------------------------------------------------------------------

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            User Permission Overrides
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Create users for your account, then fine-tune access for each user
            by allowing, denying, or inheriting from the plan.
          </p>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User context */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm h-full">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <UserCog className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-slate-900">
                  User Context
                </h2>
                <p className="text-sm text-slate-900">
                  {userContext.displayName}
                </p>
                {userContext.email && (
                  <p className="text-xs text-slate-500">{userContext.email}</p>
                )}
                <p className="text-xs text-slate-600 mt-2">
                  Plan:{" "}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px]">
                    {userContext.planName}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Inherited: follow the plan-level setting.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Allow: explicitly grant this permission.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Deny: explicitly block this permission.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Permissions + user selector */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Permission overrides
              </h2>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">User:</span>
                {usersLoading ? (
                  <span className="text-xs text-slate-500 animate-pulse">
                    Loading users…
                  </span>
                ) : users.length === 0 ? (
                  <span className="text-xs text-slate-500">
                    No users yet. Create a user first.
                  </span>
                ) : (
                  <select
                    value={selectedUserId || ""}
                    onChange={e => setSelectedUserId(e.target.value || null)}
                    className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-white text-slate-900"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.fullName || u.name || u.email}{" "}
                        {u.role ? `(${u.role})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* If no users at all → empty state, don't show matrix */}
            {users.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                This account doesn’t have any team users yet.
                <br />
                Create at least one user, then return here to adjust their
                access.
              </div>
            ) : groupedPermissions.length === 0 ? (
              <p className="text-sm text-slate-500">
                No permissions found. Please check the permissions catalog
                configuration.
              </p>
            ) : (
              <div className="space-y-4 max-h-[620px] overflow-auto pr-2">
                {groupedPermissions.map(group => (
                  <div
                    key={group.key || group.code || group.name}
                    className="border border-slate-200 rounded-xl bg-slate-50/60"
                  >
                    <div className="px-4 py-2 border-b border-slate-200 bg-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">
                          {group.label || group.name || "Permission Group"}
                        </p>
                        {group.description && (
                          <p className="text-[11px] text-slate-600">
                            {group.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="divide-y divide-slate-200">
                      {(group.permissions || group.items || []).map(perm => {
                        const permissionId =
                          perm.id || perm.permissionId || perm.permissionID;
                        const code = perm.code || perm.key;
                        const name = perm.name || perm.displayName || code;

                        if (!permissionId) return null;

                        const state = getPermissionState(permissionId);
                        const planRow = planPermissionMap[permissionId];

                        const planKnown = !!planRow;
                        const planAllowed =
                          planRow?.isActive === true ||
                          planRow?.isEnabled === true;

                        return (
                          <div
                            key={permissionId}
                            className="px-4 py-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm text-slate-900">{name}</p>
                              <p className="text-xs text-slate-500 truncate">
                                {code}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-1">
                                Plan default:{" "}
                                {!planId || !planKnown ? (
                                  <span className="text-slate-500">
                                    Unknown
                                  </span>
                                ) : planAllowed ? (
                                  <span className="text-emerald-600">
                                    Allowed
                                  </span>
                                ) : (
                                  <span className="text-rose-600">
                                    Disabled
                                  </span>
                                )}
                                {" · "}
                                Effective:{" "}
                                {state === "inherit"
                                  ? !planId || !planKnown
                                    ? "Inherit (plan not loaded)"
                                    : planAllowed
                                    ? "Allowed (from plan)"
                                    : "Disabled (from plan)"
                                  : state === "allow"
                                  ? "Explicitly allowed"
                                  : "Explicitly denied"}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <StateButton
                                label="Inherit"
                                size="sm"
                                active={state === "inherit"}
                                onClick={() =>
                                  handleSetOverride(permissionId, "inherit")
                                }
                              />
                              <StateButton
                                label="Allow"
                                size="sm"
                                intent="success"
                                active={state === "allow"}
                                onClick={() =>
                                  handleSetOverride(permissionId, "allow")
                                }
                              />
                              <StateButton
                                label="Deny"
                                size="sm"
                                intent="danger"
                                active={state === "deny"}
                                onClick={() =>
                                  handleSetOverride(permissionId, "deny")
                                }
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StateButton({
  label,
  active,
  intent = "neutral",
  size = "md",
  onClick,
}) {
  const base =
    "inline-flex items-center justify-center rounded-full border text-xs font-medium transition focus:outline-none focus:ring-1 focus:ring-offset-0 focus:ring-emerald-500";

  const sizeClass = size === "sm" ? "px-3 py-1" : "px-4 py-1.5";

  let colorInactive =
    "border-slate-300 text-slate-600 bg-white hover:bg-slate-100";
  let colorActive = "border-slate-900 text-slate-50 bg-slate-900";

  if (intent === "success") {
    colorActive =
      "border-emerald-500 text-white bg-emerald-500 hover:bg-emerald-600";
  } else if (intent === "danger") {
    colorActive = "border-rose-500 text-white bg-rose-500 hover:bg-rose-600";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${sizeClass} ${active ? colorActive : colorInactive}`}
    >
      {label}
    </button>
  );
}
