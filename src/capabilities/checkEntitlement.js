// 📄 src/capabilities/checkEntitlement.js
import axiosClient from "../api/axiosClient";
import { toast } from "react-toastify";

export async function checkEntitlementOrPrompt(businessId, key) {
  try {
    const res = await axiosClient.post(
      `/api/entitlements/${businessId}/check`,
      { key }
    );
    const ok = res?.data?.ok ?? false;
    if (!ok) {
      toast.warn("Action not allowed by your plan. Visit Billing to upgrade.");
      return false;
    }
    return true;
  } catch (e) {
    // 429 is already handled centrally; keep UX calm for other errors
    if (!e?.response) toast.error("Network error while checking entitlements.");
    return false;
  }
}
