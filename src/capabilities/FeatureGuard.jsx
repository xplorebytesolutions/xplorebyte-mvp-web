// 📄 src/capabilities/FeatureGuard.jsx
import React from "react";
import { useAuth } from "../app/providers/AuthProvider";
import UpgradeCta from "./UpgradeCta";

const normalizeCode = code =>
  String(code || "")
    .trim()
    .toUpperCase();

export default function FeatureGuard({
  featureKey, // preferred (feature code or FK.*)
  code, // legacy alias (single code)
  codes, // allow array or single permission/feature code
  fallback = <UpgradeCta />,
  children,
}) {
  const { isLoading, entLoading, entitlements, hasAllAccess } = useAuth();

  // ---- normalize required keys ----
  let required = [];

  if (codes) {
    // <FeatureGuard codes={FK.CAMPAIGN_LIST_VIEW}>
    // or <FeatureGuard codes={[FK.C1, FK.C2]}>
    required = Array.isArray(codes) ? codes : [codes];
  } else {
    const single = featureKey ?? code;
    if (single) required = [single];
  }

  const requiredNorm = required.filter(Boolean).map(normalizeCode);

  // No requirement provided → allow by default
  if (!requiredNorm.length) {
    return children;
  }

  // While auth or entitlements are loading, DON'T block yet
  if (isLoading || entLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center py-16">
        <p className="text-sm text-gray-500">Loading workspace…</p>
      </div>
    );
  }

  // ---- read permissions from Entitlements snapshot ----
  let entPermsNorm = [];
  if (entitlements) {
    const raw =
      entitlements.GrantedPermissions ??
      entitlements.grantedPermissions ??
      entitlements.Permissions ??
      entitlements.permissions ??
      [];

    if (Array.isArray(raw)) {
      entPermsNorm = raw
        .map(p => {
          if (typeof p === "string") return normalizeCode(p);
          if (p && typeof p === "object") {
            return normalizeCode(
              p.code || p.Code || p.permissionCode || p.PermissionCode
            );
          }
          return "";
        })
        .filter(Boolean);
    }
  }

  const allowed =
    hasAllAccess || requiredNorm.some(code => entPermsNorm.includes(code));

  // 🔍 Debug to verify on refresh
  console.log("[FeatureGuard DEBUG]", {
    path: window.location.pathname,
    required: requiredNorm,
    entPermsNorm,
    hasAllAccess,
    allowed,
  });

  return allowed ? <>{children}</> : fallback;
}
