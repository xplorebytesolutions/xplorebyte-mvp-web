import React from "react";
import { NavLink, useLocation } from "react-router-dom";

const tabs = [
  {
    key: "overview",
    label: "Overview",
    to: "/app/admin/account-insights",
  },
  {
    key: "funnels",
    label: "Funnels",
    to: "/app/admin/account-insights/funnels",
  },
  {
    key: "alerts",
    label: "Alerts",
    to: "/app/admin/account-insights/alerts",
  },
];

export default function InsightsTabs() {
  const location = useLocation();

  return (
    <div className="flex items-center gap-3 border-b border-slate-200 mb-4">
      {tabs.map(tab => {
        const active = location.pathname === tab.to;
        return (
          <NavLink
            key={tab.key}
            to={tab.to}
            className={`pb-2 text-base font-medium border-b-2 transition-colors ${
              active
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            {tab.label}
          </NavLink>
        );
      })}
    </div>
  );
}
