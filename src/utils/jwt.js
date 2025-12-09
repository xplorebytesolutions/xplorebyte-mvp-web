// utils/jwt.js (or wherever this lives)
import { jwtDecode } from "jwt-decode";
import { TOKEN_KEY } from "../api/axiosClient";

export function readToken() {
  const t = localStorage.getItem(TOKEN_KEY);
  if (!t) return null;
  try {
    // claims we care about:
    // role, plan_id, businessId, name, permissions (CSV), features (CSV), hasAllAccess ("true"/"false"), exp
    return jwtDecode(t);
  } catch {
    return null;
  }
}
export function getAuthFromToken() {
  const payload = readToken();
  if (!payload) return { isAuth: false };

  // --- helpers ---
  const toBool = v =>
    typeof v === "boolean"
      ? v
      : (typeof v === "string" ? v.toLowerCase() : "").trim() === "true";

  const csvToArray = v =>
    Array.isArray(v)
      ? v
      : String(v || "")
          .split(",")
          .map(s => s.trim())
          .filter(Boolean);

  // ---- role (support multiple claim names) ----
  const role = (
    payload.role ||
    payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
    "business"
  ).toLowerCase();

  // ---- ids / name ----
  const planId = payload["plan_id"] || null;
  const businessId = payload.businessId || payload.biz || null;
  const name = payload.name || payload.fullName || payload.email || "User";

  // ---- permissions / features (CSV or array) ----
  const permissionsCsv = String(payload.permissions ?? "").trim();
  const featuresCsv = String(payload.features ?? "").trim();
  const permissions = csvToArray(payload.permissions);
  const features = csvToArray(payload.features);

  // ---- superadmin / wildcard ----
  const hasAllAccess =
    role === "superadmin" ||
    payload.hasAllAccess === true ||
    toBool(payload.hasAllAccess);

  // ---- status (read from several possible claim keys; fallback to approved/pending based on isApproved) ----
  const rawStatus = (
    payload.status ||
    payload.business_status ||
    payload["business.status"] ||
    payload.biz_status ||
    payload["http://xbytechat.io/claims/status"] ||
    ""
  )
    .toString()
    .toLowerCase();

  let status = rawStatus;
  if (!status) {
    // derive from approval flags if present
    if (payload.isApproved === false || toBool(payload.isApproved) === false) {
      status = "pending";
    } else if (
      payload.isApproved === true ||
      toBool(payload.isApproved) === true
    ) {
      status = "approved";
    } else {
      // permissive default so legacy tokens don't get blocked
      status = "approved";
    }
  }

  // ---- profile completion flags (support multiple claim names) ----
  const profileFlag =
    payload.profileComplete ??
    payload.profile_completed ??
    payload["profile.completed"] ??
    payload.pcomplete ??
    null;

  // If claim absent, leave as undefined so guard can decide; if present, normalize to boolean
  const isProfileComplete =
    typeof profileFlag === "boolean"
      ? profileFlag
      : profileFlag == null
      ? undefined
      : toBool(profileFlag);

  const needsProfileCompletion =
    status === "approved" && isProfileComplete === false;

  // ---- token expiry check (client-side hint only; server remains authoritative) ----
  if (payload.exp && Date.now() / 1000 > payload.exp) {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
    return { isAuth: false };
  }

  return {
    isAuth: true,
    role,
    planId,
    businessId,
    name,

    // raw CSVs (kept for backward compatibility)
    permissionsCsv,
    featuresCsv,

    // parsed arrays (use these going forward)
    permissions,
    features,

    hasAllAccess,

    // NEW: onboarding/status fields used by ProtectedRoute
    status, // "pending" | "approved" | "rejected" | "hold" | ...
    isProfileComplete, // boolean | undefined (undefined if claim not present)
    needsProfileCompletion, // boolean (true if approved AND explicitly incomplete)
  };
}
