// 📄 src/pages/Payment/PlanSelectWidget.jsx

import React from "react";
import { getAllPlans } from "./planCatalog";

function PlanSelectWidget({
  value,
  onChange,
  billingCycle = "Monthly",
  compact = false,
  disabled = false,
}) {
  const plans = getAllPlans();

  if (!plans.length) return null;

  const handleSelect = id => {
    if (!disabled && onChange) onChange(id);
  };

  if (compact) {
    // Compact <select> version for forms
    return (
      <div className="flex flex-col gap-1">
        <label className="text-[8px] text-slate-600">Choose a plan</label>
        <select
          value={value || ""}
          onChange={e => handleSelect(e.target.value)}
          disabled={disabled}
          className="px-2 py-1.5 rounded-md border border-slate-200 text-[9px] focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="" disabled>
            Select a plan
          </option>
          {plans.map(plan => (
            <option key={plan.id} value={plan.id}>
              {plan.name}{" "}
              {billingCycle === "Yearly"
                ? `(${plan.priceYearly || 0} / yr)`
                : `(${plan.priceMonthly || 0} / mo)`}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Card-style selector (for upgrade modals, etc.)
  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {plans.map(plan => {
        const isSelected = plan.id === value;
        const price =
          billingCycle === "Yearly" ? plan.priceYearly : plan.priceMonthly;

        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => handleSelect(plan.id)}
            disabled={disabled}
            className={
              "flex flex-col gap-1.5 p-3 rounded-lg border text-left transition-all bg-white " +
              "shadow-[0_1px_2px_rgba(15,23,42,0.04)] " +
              (isSelected
                ? "border-purple-600 ring-2 ring-purple-100"
                : "border-slate-200 hover:border-slate-300") +
              (disabled ? " opacity-60 cursor-not-allowed" : "")
            }
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] font-semibold text-slate-900">
                {plan.name}
              </div>
              {plan.isPopular && (
                <span className="px-2 py-0.5 rounded-full bg-slate-900 text-[7px] text-white font-semibold">
                  Recommended
                </span>
              )}
            </div>
            <div className="text-[8px] text-slate-600">{plan.description}</div>
            <div className="mt-1">
              <div className="text-[11px] font-semibold text-slate-900">
                ₹{price || 0}
              </div>
              <div className="text-[7px] text-slate-500">
                per {billingCycle === "Yearly" ? "year" : "month"}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default PlanSelectWidget;
