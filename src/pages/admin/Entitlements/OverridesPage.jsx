// 📄 src/pages/Admin/Entitlements/OverridesPage.jsx
import React, { useEffect, useState } from "react";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify";

function TabBtn({ active, onClick, children }) {
  return (
    <button
      className={`px-3 py-2 rounded-lg ${
        active ? "bg-purple-600 text-white" : "bg-gray-100"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function OverridesPage() {
  const [active, setActive] = useState("features");
  const [loading, setLoading] = useState(false);

  const [featureRows, setFeatureRows] = useState([]);
  const [quotaRows, setQuotaRows] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [fRes, qRes] = await Promise.all([
          axiosClient.get("/admin/entitlements/overrides/features"),
          axiosClient.get("/admin/entitlements/overrides/quotas"),
        ]);
        setFeatureRows(fRes.data || []);
        setQuotaRows(qRes.data || []);
      } catch (e) {
        toast.error("Failed to load overrides.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleFeature = async row => {
    try {
      await axiosClient.post("/admin/entitlements/overrides/features/upsert", {
        businessId: row.businessId,
        code: row.code,
        allowed: !row.allowed,
      });
      toast.success("Feature override updated.");
      // refresh
      const { data } = await axiosClient.get(
        "/admin/entitlements/overrides/features"
      );
      setFeatureRows(data || []);
    } catch {
      toast.error("Failed to update feature override.");
    }
  };

  const updateQuota = async (row, newLimit) => {
    try {
      await axiosClient.post("/admin/entitlements/overrides/quotas/upsert", {
        businessId: row.businessId,
        code: row.code,
        limit: Number(newLimit),
      });
      toast.success("Quota override updated.");
      const { data } = await axiosClient.get(
        "/admin/entitlements/overrides/quotas"
      );
      setQuotaRows(data || []);
    } catch {
      toast.error("Failed to update quota override.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Entitlement Overrides</h1>

      <div className="flex gap-2 mb-4">
        <TabBtn
          active={active === "features"}
          onClick={() => setActive("features")}
        >
          Features
        </TabBtn>
        <TabBtn
          active={active === "quotas"}
          onClick={() => setActive("quotas")}
        >
          Quotas
        </TabBtn>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : active === "features" ? (
        <div className="bg-white rounded-xl shadow p-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">Business</th>
                <th className="p-2">Code</th>
                <th className="p-2">Allowed</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {featureRows.map(r => (
                <tr key={`${r.businessId}-${r.code}`} className="border-t">
                  <td className="p-2">{r.businessName || r.businessId}</td>
                  <td className="p-2">{r.code}</td>
                  <td className="p-2">{String(r.allowed)}</td>
                  <td className="p-2">
                    <button
                      className="px-2 py-1 rounded bg-gray-100"
                      onClick={() => toggleFeature(r)}
                    >
                      Toggle
                    </button>
                  </td>
                </tr>
              ))}
              {!featureRows.length && (
                <tr>
                  <td className="p-2 text-gray-500" colSpan={4}>
                    No overrides
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow p-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">Business</th>
                <th className="p-2">Code</th>
                <th className="p-2">Limit</th>
                <th className="p-2">Used</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotaRows.map(r => (
                <tr key={`${r.businessId}-${r.code}`} className="border-t">
                  <td className="p-2">{r.businessName || r.businessId}</td>
                  <td className="p-2">{r.code}</td>
                  <td className="p-2">{r.limit}</td>
                  <td className="p-2">{r.used ?? 0}</td>
                  <td className="p-2">
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        const newLimit = e.currentTarget.elements.limit.value;
                        updateQuota(r, newLimit);
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        name="limit"
                        type="number"
                        min="0"
                        defaultValue={r.limit}
                        className="w-24 border rounded-lg px-2 py-1"
                      />
                      <button
                        className="px-2 py-1 rounded bg-purple-600 text-white"
                        type="submit"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {!quotaRows.length && (
                <tr>
                  <td className="p-2 text-gray-500" colSpan={5}>
                    No overrides
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
