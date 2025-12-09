// 📄 src/capabilities/UpgradeModal.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X, ArrowRight, AlertCircle } from "lucide-react";
// ⚠️ IMPORTANT: keep using whatever subscription you already have
// If your file currently imports something like `subscribeUpgrade` or `onUpgradeRequested`,
// reuse that import here instead of this placeholder.
import { subscribeUpgrade } from "../utils/upgradeBus";

const initialState = {
  open: false,
  reason: null, // "feature" | "quota" | "workspace" | etc.
  code: null, // FK code if provided
  quotaKey: null, // e.g. "MESSAGES_PER_MONTH"
  source: null, // where it came from (tile, action button...)
};

export default function UpgradeModal() {
  const [state, setState] = useState(initialState);
  const navigate = useNavigate();

  // 🔔 Subscribe to global upgrade requests
  useEffect(() => {
    // Adapt this to your real API:
    // e.g. const unsub = onUpgradeRequested(payload => { ... });
    const unsubscribe = subscribeUpgrade(payload => {
      setState({
        open: true,
        reason: payload?.reason ?? null,
        code: payload?.code ?? null,
        quotaKey: payload?.quotaKey ?? null,
        source: payload?.source ?? null,
      });
    });

    return () => unsubscribe && unsubscribe();
  }, []);

  const close = () => setState(initialState);

  if (!state.open) return null;

  const { reason, quotaKey, code } = state;

  // 🧠 Small helper text based on reason
  let badgeLabel = "Upgrade suggestion";
  let title = "Unlock more with a higher plan";
  let subtitle =
    "This area is available on higher plans. Upgrading will unlock more tools, automation, and analytics.";

  if (reason === "feature") {
    badgeLabel = "Feature locked";
    title = "This feature is not in your current plan";
    subtitle =
      "To use this feature, switch to a plan that includes it. You’ll keep all your existing data and configuration.";
  } else if (reason === "quota") {
    badgeLabel = "Quota reached";
    title = "You’re close to your current limit";
    subtitle =
      "You’ve reached the safe limit of this quota. A higher plan gives you more room for growth and experiments.";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
      <div className="relative max-w-lg w-full bg-white rounded-2xl shadow-2xl border border-purple-100 p-7 overflow-hidden">
        {/* Soft background blobs */}
        <div className="pointer-events-none absolute -top-16 -right-10 h-32 w-32 rounded-full bg-purple-100 opacity-40" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-emerald-100 opacity-30" />

        {/* Close button */}
        <button
          type="button"
          onClick={close}
          className="absolute top-3 right-3 rounded-full p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative flex items-start gap-4">
          <div className="shrink-0 rounded-xl bg-purple-50 p-3">
            <Sparkles className="h-7 w-7 text-purple-700" />
          </div>

          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 mb-3 border border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">
                {badgeLabel}
              </span>
            </div>

            <h2 className="text-lg font-bold text-slate-900 mb-1">{title}</h2>

            <p className="text-sm text-slate-600 mb-3">{subtitle}</p>

            <ul className="list-disc list-inside text-sm text-slate-600 mb-4 space-y-1">
              {reason === "quota" && quotaKey && (
                <li>
                  Current limit for{" "}
                  <span className="font-semibold">
                    {String(quotaKey).replace(/_/g, " ").toLowerCase()}
                  </span>{" "}
                  is managed by your plan.
                </li>
              )}
              {reason === "feature" && code && (
                <li>
                  Feature key:{" "}
                  <span className="font-mono text-[11px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                    {String(code)}
                  </span>
                </li>
              )}
              <li>Upgrading keeps all your existing conversations and data.</li>
              <li>You can change your plan later from Billing.</li>
            </ul>

            <p className="text-[11px] text-slate-500 mb-6">
              This app uses a granular entitlements system – features and quotas
              are unlocked based on your current plan so you only pay for what
              you actually use.
            </p>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={close}
                className="text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Not now
              </button>

              <button
                type="button"
                onClick={() => {
                  close();
                  navigate("/app/billing"); // adjust if your billing route differs
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-700"
              >
                View plans & pricing
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
