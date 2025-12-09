import React from "react";
import { NavLink } from "react-router-dom";

// const reportTabs = [
//   {
//     key: "accounts",
//     label: "Accounts",
//     to: "/app/admin/account-insights/account-reports",
//     exact: true,
//   },
//   {
//     key: "lifecycle",
//     label: "Lifecycle",
//     to: "/app/admin/account-insights/account-reports/lifecycle",
//   },
//   {
//     key: "trials",
//     label: "Trials",
//     to: "/app/admin/account-insights/account-reports/trials",
//   },
//   {
//     key: "risk",
//     label: "Risk & Recovery",
//     to: "/app/admin/account-insights/account-reports/risk",
//   },
// ];
const reportTabs = [
  {
    key: "overview",
    label: "Overview",
    to: "/app/admin/account-insights/account-reports",
    exact: true,
  },
  {
    key: "lifecycle",
    label: "Lifecycle",
    to: "/app/admin/account-insights/account-reports/lifecycle",
  },
  {
    key: "trials",
    label: "Trials",
    to: "/app/admin/account-insights/account-reports/trials",
  },
  {
    key: "risk",
    label: "Risk & Recovery",
    to: "/app/admin/account-insights/account-reports/risk",
  },
];

export default function ReportsLayout({ title, description, children }) {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-xs text-slate-600 max-w-3xl">{description}</p>
          )}
        </header>

        <div className="flex items-center gap-4 border-b border-slate-200">
          {reportTabs.map(tab => (
            <NavLink
              key={tab.key}
              to={tab.to}
              end={tab.exact}
              className={({ isActive }) =>
                `pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] border-b-2 ${
                  isActive
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>

        <section className="space-y-4">{children}</section>
      </div>
    </div>
  );
}
