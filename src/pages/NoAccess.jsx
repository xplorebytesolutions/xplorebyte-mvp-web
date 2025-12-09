// 📄 src/pages/auth/NoAccess.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldOff, AlertCircle, ArrowLeft } from "lucide-react";

function NoAccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-10 bg-slate-50">
      <div className="relative max-w-xl w-full bg-white rounded-2xl shadow-lg border border-rose-100 p-8 overflow-hidden">
        {/* subtle background shapes */}
        <div className="pointer-events-none absolute -top-16 -right-10 h-36 w-36 rounded-full bg-rose-100 opacity-30" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-purple-100 opacity-25" />

        <div className="relative flex items-start gap-4">
          <div className="shrink-0 rounded-xl bg-rose-50 p-3">
            <ShieldOff className="h-8 w-8 text-rose-600" />
          </div>

          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 mb-3 border border-rose-200">
              <AlertCircle className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wide">
                Access restricted
              </span>
            </div>

            <h1 className="text-xl font-bold text-slate-900 mb-2">
              You don&apos;t have permission to view this page
            </h1>

            <p className="text-sm text-slate-600 mb-3">
              Your current role or plan doesn&apos;t include access to this
              workspace or feature. If you believe this is a mistake, please
              contact your admin or support team.
            </p>

            <ul className="list-disc list-inside text-sm text-slate-600 mb-4 space-y-1">
              <li>The workspace may not be included in your plan.</li>
              <li>Your permissions might have been changed by an admin.</li>
              <li>
                You can continue using the modules available from Dashboard.
              </li>
            </ul>

            <p className="text-xs text-slate-500 mb-6">
              Access is controlled by your account&apos;s entitlements and
              permissions to keep sensitive modules limited to authorised users.
            </p>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate("/app/dashboard")}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
              </button>

              <span className="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 px-3 py-1 rounded-full">
                Access managed by your admin 🔐
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NoAccess;
