// src/pages/auth/hooks/usePlan.js
import { useEffect, useState } from "react";
import axiosClient from "../../../api/axiosClient";
import { useAuth } from "../../../app/providers/AuthProvider";
export function usePlan() {
  const { role } = useAuth();
  const [plan, setPlan] = useState(""); // normalized lowercase tier (from DB name)
  const [planObj, setPlanObj] = useState(null); // full DB object { id, name, code, description, ... }
  const [planId, setPlanId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;

    async function load() {
      setLoading(true);
      setError("");
      setPlan("");
      setPlanObj(null);
      setPlanId(null);

      try {
        const res = await axiosClient.get("/plan/me/permissions");
        const data = res?.data || {};
        const p = data.plan || null;

        if (!cancel) {
          setPlanId(data.planId ?? null);

          if (p) {
            const tier = (p.name || "").trim().toLowerCase(); // ← directly from DB
            setPlan(tier);
            setPlanObj(p); // keep full object from backend
          }
        }
      } catch (e) {
        if (!cancel) {
          const msg =
            e?.response?.data?.message || e?.message || "Failed to load plan";
          setError(msg);
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    }

    load();
    return () => {
      cancel = true;
    };
  }, []);

  return { plan, planObj, planId, loading, error, role };
}
