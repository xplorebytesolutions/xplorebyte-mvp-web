// 📄 src/app/providers/EntitlementsProvider.jsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "./AuthProvider"; // ← correct, same folder

const EntitlementsContext = createContext(null);

export function EntitlementsProvider({ children }) {
  const { business } = useAuth();
  const businessId = business?.id || business?.businessId || null;

  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSnapshot = useCallback(
    async (opts = { silent: false }) => {
      if (!businessId) {
        setSnapshot(null);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        if (!opts.silent) setLoading(true);
        setError(null);

        const res = await axiosClient.get(`/entitlements/${businessId}`, {
          __silent401: true,
          __silent403: true,
          __silent429: true,
        });

        setSnapshot(res.data || null);
      } catch (err) {
        console.error("[Entitlements] fetch error", err);
        setError(err);
      } finally {
        if (!opts.silent) setLoading(false);
      }
    },
    [businessId]
  );

  useEffect(() => {
    if (!businessId) {
      setSnapshot(null);
      setError(null);
      setLoading(false);
      return;
    }
    fetchSnapshot({ silent: false });
  }, [businessId, fetchSnapshot]);

  const { featureSet, featureList, quotaMap } = useMemo(() => {
    const s = snapshot;
    const features = Array.isArray(s?.grantedPermissions)
      ? s.grantedPermissions
      : s?.features?.map(f => f.code) || [];

    const upperCodes = features.map(f => String(f || "").toUpperCase());
    const featureSetLocal = new Set(upperCodes);

    const quotas = Array.isArray(s?.quotas) ? s.quotas : [];
    const quotaMapLocal = new Map();

    for (const q of quotas) {
      const key = (
        q.quotaKey ||
        q.code ||
        q.key ||
        q.QuotaKey ||
        ""
      ).toUpperCase();
      if (!key) continue;
      quotaMapLocal.set(key, q);
    }

    return {
      featureSet: featureSetLocal,
      featureList: upperCodes,
      quotaMap: quotaMapLocal,
    };
  }, [snapshot]);

  const hasFeature = useCallback(
    code => {
      if (!code) return false;
      const key = String(code).toUpperCase();
      return featureSet.has(key);
    },
    [featureSet]
  );

  const getFeature = useCallback(
    code => {
      if (!snapshot || !code) return null;

      if (Array.isArray(snapshot.features)) {
        const key = String(code).toUpperCase();
        return (
          snapshot.features.find(
            f => String(f.code || "").toUpperCase() === key
          ) || null
        );
      }

      const key = String(code).toUpperCase();
      const exists = featureSet.has(key);
      if (!exists) return null;
      return { code: key, allowed: true };
    },
    [snapshot, featureSet]
  );

  const getQuota = useCallback(
    quotaKey => {
      if (!quotaKey) return null;
      const key = String(quotaKey).toUpperCase();
      return quotaMap.get(key) || null;
    },
    [quotaMap]
  );

  const canSpend = useCallback(
    (quotaKey, amount = 1) => {
      if (!quotaKey) return true;
      const key = String(quotaKey).toUpperCase();
      const q = quotaMap.get(key);
      if (!q) return true;

      const remaining =
        typeof q.remaining === "number"
          ? q.remaining
          : typeof q.Remaining === "number"
          ? q.Remaining
          : null;

      if (remaining == null) return true;
      return remaining >= amount;
    },
    [quotaMap]
  );

  const value = useMemo(
    () => ({
      snapshot,
      loading,
      error,
      refresh: () => fetchSnapshot({ silent: false }),
      hasFeature,
      getFeature,
      getQuota,
      canSpend,
      grantedPermissions: featureList,
    }),
    [
      snapshot,
      loading,
      error,
      fetchSnapshot,
      hasFeature,
      getFeature,
      getQuota,
      canSpend,
      featureList,
    ]
  );

  return (
    <EntitlementsContext.Provider value={value}>
      {children}
    </EntitlementsContext.Provider>
  );
}

export function useEntitlements() {
  const ctx = useContext(EntitlementsContext);
  if (!ctx) {
    throw new Error(
      "useEntitlements must be used within an EntitlementsProvider"
    );
  }
  return ctx;
}

// 🔹 Convenience hooks for quota-aware UI

export function useQuota(quotaKey) {
  const { getQuota } = useEntitlements();
  if (!quotaKey) return null;
  return getQuota(quotaKey);
}

export function useCanSpend(quotaKey, amount = 1) {
  const { canSpend } = useEntitlements();
  return canSpend(quotaKey, amount);
}
