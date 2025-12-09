// 📄 src/components/FeatureGuard.jsx
import React from "react";
import { useAuth } from "../app/providers/AuthProvider";
import { requestUpgrade } from "../../utils/upgradeBus";
export default function FeatureGuard({ code, fallback = null, children }) {
  const { hasFeature, entLoading, entError } = useAuth();

  if (entLoading) return null; // or a small shimmer if you prefer
  if (entError) return fallback ?? null;

  const allowed = hasFeature(code);
  if (allowed) return children;

  // Default: render nothing but trigger a soft upgrade CTA if fallback is not provided
  if (fallback) return fallback;

  return (
    <button
      type="button"
      onClick={() => requestUpgrade({ reason: "feature", code })}
      className="text-sm underline text-gray-500 hover:text-gray-700"
    >
      Upgrade required
    </button>
  );
}
