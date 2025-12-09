import { useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { toast } from "react-toastify";

export default function FeatureGuard({ featureKey, children }) {
  const { isLoading, can, hasAllAccess } = useAuth();
  const location = useLocation();
  const notifiedRef = useRef(false);

  // While auth/permissions are loading, render a stable placeholder
  if (isLoading) {
    return (
      <div
        data-test-id="featureguard-loading"
        aria-busy="true"
        style={{ display: "none" }}
      />
    );
  }

  if (!featureKey) {
    if (!notifiedRef.current) {
      toast.error("Feature access check failed: featureKey not provided");
      notifiedRef.current = true;
    }
    return (
      <Navigate
        to="/no-access"
        replace
        state={{ reason: "missing-featureKey", from: location.pathname }}
      />
    );
  }

  // Admin wildcard from context
  if (hasAllAccess) return children;

  const allowed = can(featureKey);
  if (!allowed) {
    if (!notifiedRef.current) {
      toast.error(`🚫 You don't have access to "${featureKey}"`);
      notifiedRef.current = true;
    }
    return (
      <Navigate
        to="/no-access"
        replace
        state={{
          reason: "feature-denied",
          featureKey,
          from: location.pathname,
        }}
      />
    );
  }

  return children;
}
