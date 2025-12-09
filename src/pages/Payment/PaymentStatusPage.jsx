// 📄 src/pages/Payment/PaymentStatusPage.jsx

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";

const formatDate = utc => {
  if (!utc) return "—";
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const isSubscriptionActiveLike = sub => {
  if (!sub || !sub.status) return false;
  const s = String(sub.status);
  return (
    s === "Active" ||
    s === "Trial" ||
    s === "Grace" ||
    (s === "Cancelled" &&
      sub.cancelAtPeriodEnd &&
      sub.currentPeriodEndUtc &&
      new Date(sub.currentPeriodEndUtc) > new Date())
  );
};

function PaymentStatusPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const [statusView, setStatusView] = useState({
    state: "checking", // checking | success | pending | failed
    title: "Confirming your payment…",
    message:
      "We’re syncing your payment with our billing system. This usually takes a moment.",
    subscription: null,
    lastInvoice: null,
  });

  const searchParams = new URLSearchParams(location.search || "");
  const source = searchParams.get("source") || "razorpay";
  const orderId = searchParams.get("orderId") || null;
  const sessionId = searchParams.get("sessionId") || null;

  useEffect(() => {
    let isCancelled = false;
    let timer = null;

    const checkOverview = async isInitial => {
      try {
        // suppress generic error toast here; we handle UX locally
        const res = await axiosClient.get("/payment/overview", {
          headers: { "x-suppress-403-toast": true },
        });
        if (isCancelled) return true;

        const data = res.data || {};
        const sub = data.currentSubscription || null;
        const invoices = data.recentInvoices || [];
        const lastInvoice = invoices[0] || null;

        // Active/trial/grace → success
        if (isSubscriptionActiveLike(sub)) {
          setStatusView({
            state: "success",
            title: "Payment successful",
            message:
              "Your subscription is active. You can now use all available features.",
            subscription: sub,
            lastInvoice,
          });
          setLoading(false);
          if (!isInitial) {
            toast.success("Subscription updated successfully.");
          }
          return true;
        }

        // Explicit failure on latest invoice
        if (
          lastInvoice &&
          (lastInvoice.status === "Failed" ||
            lastInvoice.status === "Cancelled")
        ) {
          setStatusView({
            state: "failed",
            title: "Payment failed or cancelled",
            message:
              "We couldn’t confirm a successful payment for this attempt. You can retry from your Billing page.",
            subscription: sub,
            lastInvoice,
          });
          setLoading(false);
          return true;
        }

        // No confirmation yet → keep polling / maybe pending
        return false;
      } catch (err) {
        if (isCancelled) return true;
        console.error(err);
        // Don’t delegate to global interceptor UX here; show local pending.
        setStatusView(prev => ({
          ...prev,
          state: "pending",
          title: "Unable to confirm yet",
          message:
            "We’re having trouble confirming your payment. If this persists, please open your Billing page or contact support.",
        }));
        setLoading(false);
        return true;
      }
    };

    const start = async () => {
      const initialDone = await checkOverview(true);
      if (initialDone) {
        setLoading(false);
        return;
      }

      // Poll up to 5 times (e.g. 10s total) for webhook delay
      let tries = 0;
      timer = setInterval(async () => {
        tries += 1;
        setAttempts(tries);

        const done = await checkOverview(false);
        if (done || tries >= 5) {
          clearInterval(timer);
          setLoading(false);

          if (!done) {
            setStatusView(prev => ({
              ...prev,
              state: "pending",
              title: "Payment status is pending",
              message:
                "We haven’t received a success confirmation yet. Please refresh in a bit or check your Billing page.",
            }));
          }
        }
      }, 2000);
    };

    start();

    return () => {
      isCancelled = true;
      if (timer) clearInterval(timer);
    };
  }, []);

  const goToBilling = () => navigate("/app/settings/billing");
  const goToDashboard = () => navigate("/app/dashboard");
  const goBack = () => navigate(-1);

  const { state, title, message, subscription, lastInvoice } = statusView;

  const badgeColor =
    state === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : state === "failed"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <div className="min-h-screen bg-slate-50 px-4 sm:px-6 py-10 flex items-start justify-center">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-slate-900">
                {title}
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-600 mt-1">
                {message}
              </p>
            </div>
            <div
              className={
                "px-2.5 py-1 rounded-full border text-[8px] font-medium " +
                badgeColor
              }
            >
              {state === "checking" && "Checking status"}
              {state === "pending" && "Pending confirmation"}
              {state === "success" && "Subscription active"}
              {state === "failed" && "Payment not confirmed"}
            </div>
          </div>

          {(source || orderId || sessionId) && (
            <div className="text-[8px] text-slate-500 space-y-0.5">
              {source && (
                <div>
                  Source: <span className="font-semibold">{source}</span>
                </div>
              )}
              {orderId && (
                <div>
                  Order:{" "}
                  <span className="font-mono font-semibold">{orderId}</span>
                </div>
              )}
              {sessionId && (
                <div>
                  Session:{" "}
                  <span className="font-mono font-semibold">{sessionId}</span>
                </div>
              )}
            </div>
          )}

          {subscription && (
            <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="text-[9px] text-slate-500 mb-1">
                Current subscription
              </div>
              <div className="flex items-center justify-between text-[9px]">
                <div>
                  <div className="font-semibold text-slate-900">
                    {subscription.planName || subscription.planId || "—"}
                  </div>
                  <div className="text-slate-500">
                    Status:{" "}
                    <span className="font-medium">{subscription.status}</span>
                  </div>
                </div>
                {subscription.currentPeriodEndUtc && (
                  <div className="text-right text-slate-500">
                    <div>Period ends</div>
                    <div className="font-medium text-slate-900">
                      {formatDate(subscription.currentPeriodEndUtc)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {lastInvoice && (
            <div className="mt-1 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between text-[9px]">
                <div>
                  <div className="text-slate-500">Latest invoice</div>
                  <div className="font-semibold text-slate-900">
                    {lastInvoice.number || lastInvoice.id?.slice(0, 8) || "—"}
                  </div>
                  <div className="text-slate-500">
                    Status:{" "}
                    <span className="font-medium">{lastInvoice.status}</span>
                  </div>
                </div>
                <div className="text-right text-slate-500">
                  <div>Created</div>
                  <div className="font-medium">
                    {formatDate(lastInvoice.createdAtUtc)}
                  </div>
                  {lastInvoice.total != null && (
                    <div className="mt-1 text-slate-900">
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: lastInvoice.currency || "INR",
                        maximumFractionDigits: 2,
                      }).format(lastInvoice.total || 0)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {state === "success" && (
              <>
                <button
                  onClick={goToDashboard}
                  className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-[10px] font-semibold hover:bg-black"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={goToBilling}
                  className="px-3 py-1.5 rounded-md border border-slate-300 text-[10px] text-slate-800 hover:bg-slate-50"
                >
                  View Billing &amp; Invoices
                </button>
              </>
            )}

            {state === "pending" && (
              <>
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-[10px] font-semibold hover:bg-black"
                >
                  Refresh Status
                </button>
                <button
                  onClick={goToBilling}
                  className="px-3 py-1.5 rounded-md border border-slate-300 text-[10px] text-slate-800 hover:bg-slate-50"
                >
                  Open Billing Page
                </button>
              </>
            )}

            {state === "failed" && (
              <>
                <button
                  onClick={goToBilling}
                  className="px-3 py-1.5 rounded-md bg-red-600 text-white text-[10px] font-semibold hover:bg-red-700"
                >
                  Retry from Billing
                </button>
                <button
                  onClick={goBack}
                  className="px-3 py-1.5 rounded-md border border-slate-300 text-[10px] text-slate-800 hover:bg-slate-50"
                >
                  Go Back
                </button>
              </>
            )}

            {state === "checking" && (
              <div className="flex items-center gap-2 text-[9px] text-slate-500">
                <span className="h-3 w-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                Checking latest subscription status…
              </div>
            )}
          </div>

          {attempts > 0 && (
            <div className="text-[7px] text-slate-400 mt-2">
              Checked status {attempts + 1} time(s).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentStatusPage;
