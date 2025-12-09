// 📄 src/pages/AccountInsights/AccountReports/ReportsIndex.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../../api/axiosClient";
import ReportsLayout from "./ReportsLayout";

export default function ReportsIndex() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosClient.get("/admin/account-insights/summary");
        setSummary(res.data || null);
      } catch (err) {
        console.error("Failed to load reports overview summary", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const s = summary || {};

  const total = s.totalBusinesses ?? s.TotalBusinesses ?? 0;
  const active = s.activeBusinesses ?? s.ActiveBusinesses ?? 0;
  const atRisk = s.atRiskBusinesses ?? s.AtRiskBusinesses ?? 0;
  const dormant = s.dormantBusinesses ?? s.DormantBusinesses ?? 0;
  const noUsage = s.noUsagePostApproval ?? s.NoUsagePostApproval ?? 0;
  const trials =
    s.trialTotal ?? s.TrialTotal ?? s.trialPlan ?? s.TrialPlan ?? 0;
  const trialExpSoon = s.trialExpiringSoon ?? s.TrialExpiringSoon ?? 0;
  const trialExpiredNoUpgrade =
    s.trialExpiredNoUpgrade ?? s.TrialExpiredNoUpgrade ?? 0;
  const paid = s.paidPlan ?? s.PaidPlan ?? 0;

  const approxTrialConv =
    trials > 0 ? ((paid / trials) * 100).toFixed(1) : "0.0";

  return (
    <ReportsLayout
      title="Account Reports Overview"
      description="Central hub for detailed account reports: ledger, lifecycle, trial performance, and risk cohorts."
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label="Total Accounts"
          value={total}
          hint="All tracked businesses."
        />
        <Kpi
          label="Active Accounts"
          value={active}
          hint="Recently engaged or live."
        />
        <Kpi
          label="At Risk + Dormant"
          value={atRisk + dormant}
          hint="Needs intervention."
          highlight
        />
        <Kpi label="On Paid Plan" value={paid} hint="Converted customers." />
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <ReportCard
          title="Accounts Ledger"
          description="Full row-level, exportable ledger of all accounts with lifecycle, plan, and activity."
          primaryMetricLabel="Total accounts"
          primaryMetricValue={total}
          onClick={() =>
            navigate(
              "/app/admin/account-insights/account-reports/accounts-master"
            )
          }
        />

        <ReportCard
          title="Lifecycle Cohorts"
          description="Accounts grouped by lifecycle stage to understand health across Active, At Risk, and Dormant."
          primaryMetricLabel="Active / At Risk / Dormant"
          primaryMetricValue={`${active} / ${atRisk} / ${dormant}`}
          onClick={() =>
            navigate("/app/admin/account-insights/account-reports/lifecycle")
          }
        />

        <ReportCard
          title="Trial Performance"
          description="Track trial volume, upcoming expiries, and approximate trial-to-paid conversion."
          primaryMetricLabel="Trials • Expiring • Lost"
          primaryMetricValue={`${trials} • ${trialExpSoon} • ${trialExpiredNoUpgrade}`}
          secondary={`${approxTrialConv}% approx. trial → paid`}
          onClick={() =>
            navigate("/app/admin/account-insights/account-reports/trials")
          }
        />

        <ReportCard
          title="Risk & Recovery"
          description="At-risk, no-usage, and dormant accounts as a focused queue for recovery and outreach."
          primaryMetricLabel="No-usage / At Risk / Dormant"
          primaryMetricValue={`${noUsage} / ${atRisk} / ${dormant}`}
          highlight
          onClick={() =>
            navigate("/app/admin/account-insights/account-reports/risk")
          }
        />
      </div>

      {/* Error hint if summary failed */}
      {!loading && !summary && (
        <div className="text-sm text-red-500 mt-3">
          Unable to load summary. Reports are still accessible via the cards.
        </div>
      )}

      <div className="text-xs text-slate-500 mt-4">
        All reports use the existing Account Insights APIs and are designed for
        readable, exportable, operational analysis.
      </div>
    </ReportsLayout>
  );
}

function Kpi({ label, value, hint, highlight }) {
  return (
    <div
      className={
        "p-4 rounded-lg border bg-white space-y-1 " +
        (highlight ? "border-rose-300" : "border-slate-200")
      }
    >
      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="text-lg font-semibold text-slate-900">{value ?? "—"}</div>
      {hint && (
        <div className="text-xs text-slate-500 leading-snug">{hint}</div>
      )}
    </div>
  );
}

function ReportCard({
  title,
  description,
  primaryMetricLabel,
  primaryMetricValue,
  secondary,
  onClick,
  highlight,
}) {
  return (
    <div
      onClick={onClick}
      className={
        "group cursor-pointer p-4 rounded-lg border bg-white flex flex-col justify-between gap-3 transition hover:-translate-y-0.5 hover:shadow-md " +
        (highlight ? "border-rose-200" : "border-slate-200")
      }
    >
      <div className="space-y-1">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-xs text-slate-600 leading-snug">{description}</div>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[10px] text-slate-500 uppercase tracking-[0.16em]">
            {primaryMetricLabel}
          </div>
          <div className="text-base font-semibold text-slate-900">
            {primaryMetricValue ?? "—"}
          </div>
          {secondary && (
            <div className="text-xs text-slate-500">{secondary}</div>
          )}
        </div>
        <div className="text-xs text-slate-600 group-hover:text-slate-900">
          View report →
        </div>
      </div>
    </div>
  );
}
