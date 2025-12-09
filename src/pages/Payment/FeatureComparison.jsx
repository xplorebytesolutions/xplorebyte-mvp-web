// 📄 src/pages/Payment/FeatureComparison.jsx

import React from "react";
import { getAllPlans, buildFeatureMatrix } from "./planCatalog";

export default function FeatureComparison() {
  const plans = getAllPlans();
  const matrix = buildFeatureMatrix();

  if (!plans.length) return null;

  return (
    <div className="mt-6 bg-white border border-slate-200 rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xs font-semibold text-slate-900">
            Compare plans
          </h2>
          <p className="text-[9px] text-slate-500">
            See what you get with each xByteChat plan before upgrading.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-[8px] text-slate-700">
          <thead>
            <tr>
              <th className="text-left px-2 py-1.5 text-slate-500 font-medium">
                Features
              </th>
              {plans.map(plan => (
                <th
                  key={plan.id}
                  className="px-2 py-1.5 text-center text-slate-500 font-medium"
                >
                  <div className="text-[9px] font-semibold text-slate-900">
                    {plan.name}
                  </div>
                  {plan.isPopular && (
                    <div className="mt-0.5 inline-flex px-1.5 py-0.5 rounded-full bg-slate-900 text-white text-[7px]">
                      Recommended
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map(row => (
              <tr key={row.key} className="border-t border-slate-100">
                <td className="px-2 py-1.5 font-medium text-slate-800">
                  {row.label}
                </td>
                {plans.map(plan => (
                  <td
                    key={plan.id}
                    className="px-2 py-1.5 text-center text-slate-700"
                  >
                    {row.values[plan.id] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[7px] text-slate-400">
        Limits and features are indicative for MVP. Final production values are
        managed from the billing configuration and payment provider.
      </p>
    </div>
  );
}
