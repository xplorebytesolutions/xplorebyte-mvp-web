// 📄 src/pages/auth/services/authService.js
import axiosClient, { TOKEN_KEY } from "../../../api/axiosClient";
import { getAuthFromToken } from "../../../utils/jwt";

// tiny helper
const toArray = csv =>
  String(csv || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

/**
 * login(email, password)
 * - POST /auth/login
 * - stores Bearer token
 * - tries /auth/context for canonical data
 * - returns a compact summary for routing
 */
export const login = async (email, password) => {
  // 1) Login
  const { data } = await axiosClient.post("/auth/login", { email, password });

  // Accept a few possible token field names
  const token =
    data?.token || data?.jwt || data?.accessToken || data?.access_token;

  if (!token) {
    throw new Error(data?.message || "❌ Login failed.");
  }

  // 2) Persist token first (so the next call carries Authorization)
  localStorage.setItem(TOKEN_KEY, token);

  // 3) Prefer server-authoritative context right away
  let role = "business";
  let status = "active";
  let hasAllAccess = false;
  let planId = null;
  let businessId = null;

  try {
    // Avoid noisy toasts during bootstrap
    const res = await axiosClient.get("/auth/context", {
      __silent401: true,
      __silent403: true,
      __silent429: true,
      headers: {
        "x-suppress-401-toast": "1",
        "x-suppress-403-toast": "1",
        "x-suppress-429-toast": "1",
      },
    });

    const ctx = res?.data || {};
    // Expected: { isAuthenticated, user, business, role, status, hasAllAccess, permissions, features, planId? }

    role = (ctx.role || role)?.toString().toLowerCase();
    status = (ctx.status || status)?.toString().toLowerCase();
    hasAllAccess = !!ctx.hasAllAccess;
    planId = ctx.planId ?? ctx?.business?.planId ?? null;
    businessId = ctx?.business?.id ?? ctx?.businessId ?? null;

    // Canonical blob for the rest of the app
    localStorage.setItem(
      "xbytechat-auth-data",
      JSON.stringify({
        token,
        ...ctx, // keep full server shape for consumers
      })
    );
  } catch {
    // 4) Fallback to JWT decode if /auth/context not available
    const auth = getAuthFromToken(); // { isAuth, role, name, planId, businessId, hasAllAccess, permissionsCsv, featuresCsv, status }

    role = (auth?.role ?? role)?.toString().toLowerCase();
    status = (auth?.status ?? status)?.toString().toLowerCase();
    hasAllAccess = !!auth?.hasAllAccess;
    planId = auth?.planId ?? null;
    businessId = auth?.businessId ?? null;

    localStorage.setItem(
      "xbytechat-auth-data",
      JSON.stringify({
        token,
        role,
        name: auth?.name ?? "",
        planId,
        businessId,
        hasAllAccess,
        permissions: toArray(auth?.permissionsCsv),
        features: toArray(auth?.featuresCsv),
        status,
      })
    );
  }

  return {
    success: true,
    token,
    role,
    status,
    hasAllAccess,
    planId,
    businessId,
  };
};

export const logout = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("role");
    localStorage.removeItem("xbytechat-auth-data");
    sessionStorage.removeItem("last_quota_denial");
  } catch {}
};
