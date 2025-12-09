// 📄 File: src/pages/admin/FeatureAccess/UserPermissionOverrides.jsx

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
import { useAuth } from "../../../app/providers/AuthProvider";

/**
 * User Permission Overrides (Admin)
 *
 * UX rules:
 * - Business owner clicks Settings → "User Access & Permissions".
 * - We auto-use the current logged-in user from useAuth().
 * - Devs can still pass ?userId=...&planId=... manually for debugging,
 *   but normal users never see that complexity.
 */
export default function UserPermissionOverrides() {
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  const authLoading = auth?.isLoading;

  // Query-string override (for debugging / inspecting another user)
  const qsUserId = searchParams.get("userId");
  const qsPlanId = searchParams.get("planId");

  // What does AuthProvider actually expose?
  const userFromAuth = auth?.user || auth?.session || auth || {};
  const userIdFromAuth =
    userFromAuth.userId || userFromAuth.id || userFromAuth.sub || null;

  const planIdFromAuth =
    userFromAuth.planId || userFromAuth.plan_id || auth?.planId || null;

  const userId = qsUserId || userIdFromAuth;
  const planId = qsPlanId || planIdFromAuth || null; // optional

  const [loading, setLoading] = useState(false);
  const [planPermissions, setPlanPermissions] = useState([]);
  const [groupedPermissions, setGroupedPermissions] = useState([]);
  const [userOverrides, setUserOverrides] = useState([]);

  const userContext = {
    displayName:
      userFromAuth.fullName ||
      userFromAuth.name ||
      userFromAuth.email ||
      "Current User",
    email: userFromAuth.email || "unknown@example.com",
    planName:
      userFromAuth.planName ||
      userFromAuth.plan_name ||
      (planId ? "Current Plan" : "Not linked yet"),
  };

  // For fast lookup
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

  const overrideMap = useMemo(() => {
    const map = {};
    for (const ov of userOverrides || []) {
      if (!ov.permissionId) continue;
      map[ov.permissionId] = ov;
    }
    return map;
  }, [userOverrides]);

  // Load permissions + overrides
  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      console.warn(
        "UserPermissionOverrides: no userId resolved from auth or query string."
      );
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        // Always load permissions catalog + user overrides
        const promises = [
          getGroupedPermissions(),
          getUserPermissionOverrides(userId),
        ];

        if (planId) {
          promises.push(getPlanPermissions(planId));
        }

        const [groupedRes, overridesRes, planPermRes] = await Promise.all(
          promises
        );

        // Handle different shapes of groupedRes:
        //  - array
        //  - { groups: [...] }
        //  - { data: [...] }
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
        console.error("Failed to load user permission overrides:", err);
        toast.error("Failed to load permission data.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId, planId, authLoading]);

  // "allow" | "deny" | "inherit"
  function getPermissionState(permissionId) {
    const ov = overrideMap[permissionId];
    if (ov && ov.isRevoked !== true) {
      return ov.isGranted ? "allow" : "deny";
    }
    return "inherit";
  }

  async function handleSetOverride(permissionId, targetState) {
    if (!userId) {
      toast.warn("Cannot update overrides: missing userId.");
      return;
    }

    try {
      if (targetState === "inherit") {
        await deleteUserPermissionOverride(userId, permissionId);
        setUserOverrides(prev =>
          prev.filter(ov => ov.permissionId !== permissionId)
        );
        toast.success("Override cleared. Using plan default.");
      } else {
        const isGranted = targetState === "allow";
        const updated = await upsertUserPermissionOverride(userId, {
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

  // Only show a blocking message if there is genuinely no user
  if (!authLoading && !userId) {
    return (
      <div className="p-6">
        <div className="max-w-xl bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">
            User Permission Overrides
          </h1>
          <p className="text-sm text-slate-600">
            This page could not determine the current user from the auth
            context.
          </p>
          <p className="text-sm text-slate-600 mt-2">
            As a developer, please ensure <code>useAuth()</code> exposes a{" "}
            <code>userId</code> or <code>user.id</code> field.
          </p>
        </div>
      </div>
    );
  }

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
            Fine-tune access for this user by allowing, denying, or inheriting
            from the plan.
          </p>
        </div>
      </div>

      {/* Main layout: left context card, right matrix */}
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
                <p className="text-xs text-slate-500">{userContext.email}</p>
                <p className="text-xs text-slate-600 mt-2">
                  Plan:{" "}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px]">
                    {userContext.planName}
                  </span>
                </p>
                {!planId && (
                  <p className="text-[11px] text-slate-500 mt-2">
                    Plan details are not loaded yet. Overrides still work, but
                    plan defaults will be shown as “Unknown”.
                  </p>
                )}
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

        {/* Permissions matrix */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Permission overrides
              </h2>
              {loading && (
                <span className="text-xs text-slate-500 animate-pulse">
                  Loading…
                </span>
              )}
            </div>

            {groupedPermissions.length === 0 ? (
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

                            {/* 3-state control */}
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

/**
 * Segmented button used for Inherit / Allow / Deny states.
 */
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
