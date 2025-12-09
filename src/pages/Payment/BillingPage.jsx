// 📄 src/pages/Payment/BillingPage.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom"; // Added useNavigate
import axiosClient from "../../api/axiosClient";
import { Check } from "lucide-react";

// --- DATA SOURCE (Must match CheckoutPage) ---
const STATIC_PLAN_DATA = {
  "Free Forever": {
    priceMonthly: 0,
    priceYearly: 0,
    currency: "INR",
    description: "Get Started with WhatsApp Ads & WhatsApp API",
    btnText: "Get Started",
    highlight: false,
    charges: {
      marketing: "₹0.88",
      utility: "₹0.125",
      auth: "₹0.125",
      service: "Unlimited Free",
    },
    features: [
      "Free WhatsApp Business API",
      "Free WhatsApp Blue Tick Application",
      "₹50 Free Conversation Credits",
      "Unlimited Free Service Conversations",
      "Click to WhatsApp Ads Manager",
      "Upload & Manage Contacts",
      "Create tags & attributes",
      "Upto 10 Tags",
      "Upto 5 Custom Attributes",
      "Create template messages",
      "Live Chat Dashboard",
    ],
  },
  Starter: {
    priceMonthly: 1350,
    priceYearly: 14580,
    currency: "INR",
    description: "Everything you need to get started with your business.",
    btnText: "Get Started",
    highlight: false,
    charges: {
      marketing: "₹0.88",
      utility: "₹0.125",
      auth: "₹0.125",
      service: "Unlimited Free",
    },
    features: [
      "All Features of Free Forever",
      "1 Owner + 5 FREE Agents included",
      "Smart Audience Segregation",
      "Broadcasting & Retargeting",
      "Template Message APIs",
      "Multi-Agent Live Chat",
      "2400 Messages/min",
      "Dialogflow Chatbot Integration",
      "Shared Team Inbox",
      "Click-to-WhatsApp Ads Manager",
    ],
    extraNote: "5 Chatbot Flows: ₹2500 (charged separately)",
  },
  Pro: {
    priceMonthly: 2880,
    priceYearly: 31104,
    currency: "INR",
    description:
      "Highly recommended plan to make the best use of Retargeting Campaigns",
    btnText: "Get Started",
    highlight: true,
    charges: {
      marketing: "₹0.88",
      utility: "₹0.125",
      auth: "₹0.125",
      service: "Unlimited Free",
    },
    features: [
      "All features in Starter Plan",
      "Upto 100 Tags",
      "Upto 20 Custom Attributes",
      "Campaign Scheduler",
      "Campaign Click Tracking",
      "Campaign Budget Analytics",
      "Carousel Template Click Tracking",
      "CSV Campaign Scheduler",
      "User Access Control",
      "Automatic Failed Message Retry",
    ],
    extraNote: "5 Chatbot Flows: ₹2500 (charged separately)",
  },
  Enterprise: {
    priceMonthly: "Custom",
    priceYearly: "Custom",
    currency: "INR",
    description: "Recommended for 5 Lac+ Messages per month",
    btnText: "Get Connected",
    highlight: false,
    charges: {
      marketing: "Custom",
      utility: "₹0.125",
      auth: "₹0.125",
      service: "Unlimited Free",
    },
    features: [
      "All features in Pro Plan",
      "Recommended for Brands with 5 Lac+ Users",
      "Unlimited Tags",
      "Unlimited Attributes",
      "Downloadable Reports",
      "Dedicated Account Manager",
      "Priority Customer Support",
      "Webhooks",
      "Higher Messaging Speed",
    ],
  },
};

const formatAmount = (amount, currency) => {
  if (amount === "Custom") return "Custom";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

function BillingPage() {
  const location = useLocation();
  const navigate = useNavigate(); // Hook for navigation

  const [loading, setLoading] = useState(true);
  const planKeys = ["Free Forever", "Starter", "Pro", "Enterprise"];
  const [billingCycle, setBillingCycle] = useState("Monthly");

  // --- Logic: Query Params ---
  const queryParams = useMemo(() => {
    const sp = new URLSearchParams(location.search || "");
    const cycleParam = sp.get("billingCycle") || sp.get("cycle") || "";
    const normalizedCycle = ["monthly", "yearly"].includes(
      cycleParam.toLowerCase()
    )
      ? cycleParam.charAt(0).toUpperCase() + cycleParam.slice(1).toLowerCase()
      : "";

    return { billingCycle: normalizedCycle };
  }, [location.search]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Optional: Check auth/subscription status here
        await axiosClient.get("/payment/overview");
        let initialCycle = queryParams.billingCycle || "Monthly";
        setBillingCycle(initialCycle);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [queryParams]);

  // --- HANDLER: Navigate to Checkout ---
  const handlePlanClick = planKey => {
    const planData = STATIC_PLAN_DATA[planKey];

    // Handle Enterprise separately
    if (planData.priceMonthly === "Custom") {
      window.location.href = "mailto:sales@xplorebyte.com";
      return;
    }

    // Navigate to the new Checkout Page with state
    navigate("/app/billing/checkout", {
      state: {
        planKey,
        billingCycle,
      },
    });
  };

  const renderPlanCard = key => {
    const plan = STATIC_PLAN_DATA[key];
    const price =
      billingCycle === "Monthly" ? plan.priceMonthly : plan.priceYearly;

    return (
      <div
        key={key}
        className={`relative flex flex-col p-6 rounded-2xl border bg-white transition-all duration-200
          ${
            plan.highlight
              ? "border-emerald-500 shadow-xl ring-1 ring-emerald-500 transform -translate-y-2 z-10"
              : "border-slate-200 shadow-sm hover:border-emerald-300 hover:shadow-md"
          }
        `}
      >
        {plan.highlight && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
            ☆ Most Popular
          </div>
        )}

        <div className="text-center mb-4 mt-2">
          <h3 className="text-xl font-bold text-slate-800">{key}</h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed min-h-[40px]">
            {plan.description}
          </p>
        </div>

        <div className="text-center mb-6">
          <div className="text-4xl font-bold text-slate-900">
            {formatAmount(price, plan.currency)}
          </div>
          {price !== "Custom" && (
            <div className="text-xs text-slate-500 mt-1">
              {key === "Free Forever"
                ? "Forever"
                : billingCycle === "Monthly"
                ? "month"
                : "year"}
            </div>
          )}
        </div>

        <div className="bg-slate-50 rounded-lg p-3 mb-6 text-xs">
          <div className="font-semibold text-slate-700 mb-2">
            Per Template Message Charges:
          </div>
          <div className="grid grid-cols-2 gap-y-1.5 text-slate-600">
            <span>Marketing:</span>
            <span className="text-right font-medium text-slate-900">
              {plan.charges.marketing}
            </span>
            <span>Utility:</span>
            <span className="text-right font-medium text-slate-900">
              {plan.charges.utility}
            </span>
            <span>Authentication:</span>
            <span className="text-right font-medium text-slate-900">
              {plan.charges.auth}
            </span>
            <span>Service:</span>
            <span className="text-right font-medium text-slate-900">
              {plan.charges.service}
            </span>
          </div>
        </div>

        <div className="flex-1">
          <ul className="space-y-3">
            {plan.features.map((feature, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 text-xs text-slate-600"
              >
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {plan.extraNote && (
          <div className="mt-4 p-2 bg-amber-50 border border-amber-100 rounded text-[10px] text-amber-800 font-medium text-center">
            {plan.extraNote}
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={() => handlePlanClick(key)}
            className={`w-full py-2.5 rounded-md font-semibold text-sm transition-colors
              ${
                plan.highlight
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-100"
                  : "bg-white border border-slate-300 text-slate-700 hover:border-emerald-500 hover:text-emerald-600"
              }
            `}
          >
            {plan.btnText}
          </button>
        </div>
      </div>
    );
  };

  if (loading)
    return (
      <div className="p-10 text-center text-slate-500">Loading pricing...</div>
    );

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">
          Monthly / Yearly Subscription | Unlimited Users Plan
        </h1>
        <div className="flex items-center justify-center gap-4 text-sm font-medium">
          <span
            className={
              billingCycle === "Monthly" ? "text-slate-900" : "text-slate-400"
            }
          >
            Monthly
          </span>
          <button
            onClick={() =>
              setBillingCycle(prev =>
                prev === "Monthly" ? "Yearly" : "Monthly"
              )
            }
            className="w-12 h-6 rounded-full p-1 bg-emerald-500 transition-colors duration-300 flex items-center"
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                billingCycle === "Yearly" ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
          <span
            className={
              billingCycle === "Yearly" ? "text-slate-900" : "text-slate-400"
            }
          >
            Yearly <span className="text-emerald-600 font-bold">(10% Off)</span>
          </span>
        </div>
        <div className="mt-6 flex items-center justify-center gap-3 text-sm text-slate-600">
          <span className="font-bold text-slate-900">India</span>
          <div className="w-8 h-4 bg-slate-200 rounded-full relative cursor-not-allowed opacity-60">
            <div className="absolute left-1 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"></div>
          </div>
          <span className="text-slate-400">Outside India</span>
        </div>
      </div>

      <div className="max-w-full mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        {planKeys.map(key => renderPlanCard(key))}
      </div>
    </div>
  );
}

export default BillingPage;
// // 📄 src/pages/Payment/BillingPage.jsx

// import React, { useEffect, useMemo, useState } from "react";
// import { useLocation } from "react-router-dom";
// import axiosClient from "../../api/axiosClient";
// import { toast } from "react-toastify";
// import { Check } from "lucide-react";

// // --- 1. DATA SOURCE OF TRUTH (Matches your Image Exactly) ---
// const STATIC_PLAN_DATA = {
//   "Free Forever": {
//     priceMonthly: 0,
//     priceYearly: 0,
//     currency: "INR",
//     description: "Get Started with WhatsApp Ads & WhatsApp API",
//     btnText: "Get Started",
//     highlight: false,
//     charges: {
//       marketing: "₹0.88",
//       utility: "₹0.125",
//       auth: "₹0.125",
//       service: "Unlimited Free",
//     },
//     features: [
//       "Free WhatsApp Business API",
//       "Free WhatsApp Blue Tick Application",
//       "₹50 Free Conversation Credits",
//       "Unlimited Free Service Conversations",
//       "Click to WhatsApp Ads Manager",
//       "Upload & Manage Contacts",
//       "Create tags & attributes",
//       "Upto 10 Tags",
//       "Upto 5 Custom Attributes",
//       "Create template messages",
//       "Live Chat Dashboard",
//     ],
//   },
//   Starter: {
//     priceMonthly: 1350,
//     priceYearly: 14580, // Calculated 1350 * 12 * 0.9 (10% off)
//     currency: "INR",
//     description: "Everything you need to get started with your business.",
//     btnText: "Get Started",
//     highlight: false,
//     charges: {
//       marketing: "₹0.88",
//       utility: "₹0.125",
//       auth: "₹0.125",
//       service: "Unlimited Free",
//     },
//     features: [
//       "All Features of Free Forever",
//       "1 Owner + 5 FREE Agents included. Additional Agents at ₹750/ month each",
//       "Smart Audience Segregation",
//       "Broadcasting & Retargeting",
//       "Template Message APIs",
//       "Multi-Agent Live Chat",
//       "2400 Messages/min",
//       "Dialogflow Chatbot Integration",
//       "Shared Team Inbox",
//       "Click-to-WhatsApp Ads Manager",
//     ],
//     extraNote: "5 Chatbot Flows: ₹2500 (charged separately)",
//   },
//   Pro: {
//     priceMonthly: 2880,
//     priceYearly: 31104, // Calculated
//     currency: "INR",
//     description:
//       "Highly recommended plan to make the best use of Retargeting Campaigns",
//     btnText: "Get Started",
//     highlight: true,
//     charges: {
//       marketing: "₹0.88",
//       utility: "₹0.125",
//       auth: "₹0.125",
//       service: "Unlimited Free",
//     },
//     features: [
//       "All features in Starter Plan",
//       "Upto 100 Tags",
//       "Upto 20 Custom Attributes",
//       "Campaign Scheduler",
//       "Campaign Click Tracking",
//       "Campaign Budget Analytics",
//       "Carousel Template Click Tracking",
//       "CSV Campaign Scheduler",
//       "User Access Control",
//       "Automatic Failed Message Retry",
//       "1 Owner + 5 FREE Agents included. Additional Agents at ₹750/ month each",
//     ],
//     extraNote: "5 Chatbot Flows: ₹2500 (charged separately)",
//   },
//   Enterprise: {
//     priceMonthly: "Custom",
//     priceYearly: "Custom",
//     currency: "INR",
//     description: "Recommended for 5 Lac+ Messages per month",
//     btnText: "Get Connected",
//     highlight: false,
//     charges: {
//       marketing: "Custom",
//       utility: "₹0.125",
//       auth: "₹0.125",
//       service: "Unlimited Free",
//     },
//     features: [
//       "All features in Pro Plan",
//       "Recommended for Brands with 5 Lac+ Users",
//       "Unlimited Tags",
//       "Unlimited Attributes",
//       "Downloadable Reports",
//       "Dedicated Account Manager",
//       "Priority Customer Support",
//       "Webhooks",
//       "Higher Messaging Speed",
//     ],
//   },
// };

// // Format currency
// const formatAmount = (amount, currency) => {
//   if (amount === "Custom") return "Custom";
//   return new Intl.NumberFormat("en-IN", {
//     style: "currency",
//     currency: currency || "INR",
//     maximumFractionDigits: 0,
//   }).format(amount || 0);
// };

// function BillingPage() {
//   const location = useLocation();

//   const [loading, setLoading] = useState(true);
//   const planKeys = ["Free Forever", "Starter", "Pro", "Enterprise"];

//   // We keep billingCycle state for the toggle
//   const [billingCycle, setBillingCycle] = useState("Monthly");
//   const [checkoutLoading, setCheckoutLoading] = useState(false);

//   // --- Logic: Query Params ---
//   const queryParams = useMemo(() => {
//     const sp = new URLSearchParams(location.search || "");
//     const cycleParam = sp.get("billingCycle") || sp.get("cycle") || "";
//     const normalizedCycle = ["monthly", "yearly"].includes(
//       cycleParam.toLowerCase()
//     )
//       ? cycleParam.charAt(0).toUpperCase() + cycleParam.slice(1).toLowerCase()
//       : "";

//     return {
//       billingCycle: normalizedCycle,
//     };
//   }, [location.search]);

//   // --- Logic: Data Loading ---
//   useEffect(() => {
//     const load = async () => {
//       try {
//         setLoading(true);
//         // We still load overview just to check session/auth validity if needed,
//         // or you can remove this if you don't need to show current status.
//         await axiosClient.get("/payment/overview");

//         let initialCycle = queryParams.billingCycle || "Monthly";
//         setBillingCycle(initialCycle);
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     load();
//   }, [queryParams]);

//   // --- Handlers ---
//   const handlePlanClick = async planKey => {
//     const planData = STATIC_PLAN_DATA[planKey];

//     // 1. Handle "Custom" / Enterprise
//     if (planData.priceMonthly === "Custom") {
//       window.location.href = "mailto:sales@xplorebyte.com";
//       return;
//     }

//     // 2. Handle Checkout for paid plans
//     try {
//       setCheckoutLoading(true);
//       const payload = {
//         planId: planKey, // Sending the Name as ID (Ensure backend handles this)
//         billingCycle,
//         couponCode: undefined, // Removed coupon logic as section is gone
//       };

//       const res = await axiosClient.post(
//         "/payment/subscribe/checkout",
//         payload
//       );

//       if (res.data?.redirectUrl) {
//         window.location.href = res.data.redirectUrl;
//       } else {
//         toast.error("No redirect URL received.");
//       }
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to initiate checkout.");
//     } finally {
//       setCheckoutLoading(false);
//     }
//   };

//   const renderPlanCard = key => {
//     const plan = STATIC_PLAN_DATA[key];
//     const price =
//       billingCycle === "Monthly" ? plan.priceMonthly : plan.priceYearly;

//     return (
//       <div
//         key={key}
//         className={`relative flex flex-col p-6 rounded-2xl border bg-white transition-all duration-200
//           ${
//             plan.highlight
//               ? "border-emerald-500 shadow-xl ring-1 ring-emerald-500 transform -translate-y-2 z-10"
//               : "border-slate-200 shadow-sm hover:border-emerald-300 hover:shadow-md"
//           }
//         `}
//       >
//         {/* Most Popular Badge */}
//         {plan.highlight && (
//           <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
//             ☆ Most Popular
//           </div>
//         )}

//         {/* Header */}
//         <div className="text-center mb-4 mt-2">
//           <h3 className="text-xl font-bold text-slate-800">{key}</h3>
//           <p className="text-xs text-slate-500 mt-2 leading-relaxed min-h-[40px]">
//             {plan.description}
//           </p>
//         </div>

//         {/* Price */}
//         <div className="text-center mb-6">
//           <div className="text-4xl font-bold text-slate-900">
//             {formatAmount(price, plan.currency)}
//           </div>
//           {price !== "Custom" && (
//             <div className="text-xs text-slate-500 mt-1">
//               {key === "Free Forever"
//                 ? "Forever"
//                 : billingCycle === "Monthly"
//                 ? "month"
//                 : "year"}
//             </div>
//           )}
//         </div>

//         {/* Per Template Charges Block */}
//         <div className="bg-slate-50 rounded-lg p-3 mb-6 text-xs">
//           <div className="font-semibold text-slate-700 mb-2">
//             Per Template Message Charges:
//           </div>
//           <div className="grid grid-cols-2 gap-y-1.5 text-slate-600">
//             <span>Marketing:</span>
//             <span className="text-right font-medium text-slate-900">
//               {plan.charges.marketing}
//             </span>
//             <span>Utility:</span>
//             <span className="text-right font-medium text-slate-900">
//               {plan.charges.utility}
//             </span>
//             <span>Authentication:</span>
//             <span className="text-right font-medium text-slate-900">
//               {plan.charges.auth}
//             </span>
//             <span>Service:</span>
//             <span className="text-right font-medium text-slate-900">
//               {plan.charges.service}
//             </span>
//           </div>
//         </div>

//         {/* Features List */}
//         <div className="flex-1">
//           <ul className="space-y-3">
//             {plan.features.map((feature, idx) => (
//               <li
//                 key={idx}
//                 className="flex items-start gap-3 text-xs text-slate-600"
//               >
//                 <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
//                 <span>{feature}</span>
//               </li>
//             ))}
//           </ul>
//         </div>

//         {/* Extra Note (e.g. Chatbot Flows) */}
//         {plan.extraNote && (
//           <div className="mt-4 p-2 bg-amber-50 border border-amber-100 rounded text-[10px] text-amber-800 font-medium text-center">
//             {plan.extraNote}
//           </div>
//         )}

//         {/* CTA Button */}
//         <div className="mt-6">
//           <button
//             onClick={() => handlePlanClick(key)}
//             disabled={checkoutLoading}
//             className={`w-full py-2.5 rounded-md font-semibold text-sm transition-colors
//               ${
//                 plan.highlight
//                   ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-100"
//                   : "bg-white border border-slate-300 text-slate-700 hover:border-emerald-500 hover:text-emerald-600"
//               }
//               disabled:opacity-70 disabled:cursor-not-allowed
//             `}
//           >
//             {checkoutLoading ? "Processing..." : plan.btnText}
//           </button>
//         </div>
//       </div>
//     );
//   };

//   if (loading) {
//     return (
//       <div className="p-10 text-center text-slate-500">Loading pricing...</div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans">
//       {/* 1. Header & Toggle */}
//       <div className="text-center max-w-2xl mx-auto mb-12">
//         <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">
//           Monthly / Yearly Subscription | Unlimited Users Plan
//         </h1>

//         {/* Toggle Switch */}
//         <div className="flex items-center justify-center gap-4 text-sm font-medium">
//           <span
//             className={`${
//               billingCycle === "Monthly" ? "text-slate-900" : "text-slate-400"
//             }`}
//           >
//             Monthly
//           </span>
//           <button
//             onClick={() =>
//               setBillingCycle(prev =>
//                 prev === "Monthly" ? "Yearly" : "Monthly"
//               )
//             }
//             className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 flex items-center ${
//               billingCycle === "Yearly" ? "bg-emerald-500" : "bg-emerald-500"
//             }`}
//           >
//             <div
//               className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
//                 billingCycle === "Yearly" ? "translate-x-6" : "translate-x-0"
//               }`}
//             />
//           </button>
//           <span
//             className={`${
//               billingCycle === "Yearly" ? "text-slate-900" : "text-slate-400"
//             }`}
//           >
//             Yearly <span className="text-emerald-600 font-bold">(10% Off)</span>
//           </span>
//         </div>

//         {/* Country Toggle (Visual Only) */}
//         <div className="mt-6 flex items-center justify-center gap-3 text-sm text-slate-600">
//           <span className="font-bold text-slate-900">India</span>
//           <div className="w-8 h-4 bg-slate-200 rounded-full relative cursor-not-allowed opacity-60">
//             <div className="absolute left-1 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"></div>
//           </div>
//           <span className="text-slate-400">Outside India</span>
//         </div>
//       </div>

//       {/* 2. Pricing Cards Grid */}
//       <div className="max-w-full mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
//         {planKeys.map(key => renderPlanCard(key))}
//       </div>

//       {/* Checkout Summary Section Removed */}
//     </div>
//   );
// }

// export default BillingPage;

// // 📄 src/pages/Payment/BillingPage.jsx

// import React, { useEffect, useMemo, useState } from "react";
// import { useLocation } from "react-router-dom";
// import axiosClient from "../../api/axiosClient";
// import { toast } from "react-toastify";
// import { getAllPlans, normalizeApiPlans } from "./planCatalog";

// // Format currency (INR style by default)
// const formatAmount = (amount, currency) =>
//   new Intl.NumberFormat("en-IN", {
//     style: "currency",
//     currency: currency || "INR",
//     maximumFractionDigits: 2,
//   }).format(amount || 0);

// // Format dates from UTC
// const formatDate = utc => {
//   if (!utc) return "—";
//   const d = new Date(utc);
//   if (Number.isNaN(d.getTime())) return "—";
//   return d.toLocaleDateString("en-IN", {
//     year: "numeric",
//     month: "short",
//     day: "numeric",
//   });
// };

// function BillingPage() {
//   const location = useLocation();

//   const [loading, setLoading] = useState(true);

//   const [overview, setOverview] = useState(null);
//   const [plans, setPlans] = useState([]);

//   const [selectedPlanId, setSelectedPlanId] = useState("");
//   const [billingCycle, setBillingCycle] = useState("Monthly");

//   const [couponInput, setCouponInput] = useState("");
//   const [couponLoading, setCouponLoading] = useState(false);
//   const [appliedCoupon, setAppliedCoupon] = useState(null);

//   const [checkoutLoading, setCheckoutLoading] = useState(false);

//   // Parse query params (planId, billingCycle, coupon)
//   const queryParams = useMemo(() => {
//     const sp = new URLSearchParams(location.search || "");
//     const qp = {
//       planId: sp.get("planId") || sp.get("plan") || "",
//       billingCycle: sp.get("billingCycle") || sp.get("cycle") || "",
//       coupon: sp.get("coupon") || sp.get("code") || "",
//     };

//     const normalizedCycle =
//       qp.billingCycle &&
//       ["monthly", "yearly"].includes(qp.billingCycle.toLowerCase())
//         ? qp.billingCycle[0].toUpperCase() +
//           qp.billingCycle.slice(1).toLowerCase()
//         : "";

//     return {
//       planId: qp.planId,
//       billingCycle: normalizedCycle, // "" | "Monthly" | "Yearly"
//       coupon: qp.coupon,
//     };
//   }, [location.search]);

//   // Load overview + plans
//   useEffect(() => {
//     const load = async () => {
//       try {
//         setLoading(true);

//         // 1️⃣ Load billing overview from backend
//         const ovRes = await axiosClient.get("/payment/overview");
//         const ov = ovRes.data;
//         setOverview(ov);

//         // 2️⃣ Try to load plans from backend `/plans`
//         let loadedPlans = [];
//         try {
//           const plansRes = await axiosClient.get("/plans", {
//             // suppress global toast if /plans is not ready or 404
//             headers: { "x-suppress-403-toast": "true" },
//           });

//           loadedPlans = normalizeApiPlans(plansRes.data);
//         } catch (e) {
//           if (process.env.NODE_ENV !== "production") {
//             // eslint-disable-next-line no-console
//             console.log(
//               "[Billing] /plans not available or failed, using static catalog"
//             );
//           }
//         }

//         // 3️⃣ Fallback to static catalog (single source in planCatalog.js)
//         if (!loadedPlans || loadedPlans.length === 0) {
//           loadedPlans = getAllPlans();
//         }

//         setPlans(loadedPlans);

//         // 4️⃣ Decide initial billing cycle
//         let initialCycle = "Monthly";
//         if (queryParams.billingCycle) {
//           initialCycle = queryParams.billingCycle;
//         }

//         // 5️⃣ Decide initial selected plan
//         let initialPlanId = "";

//         // From URL
//         if (queryParams.planId) {
//           const match = loadedPlans.find(
//             p => p.id && p.id.toLowerCase() === queryParams.planId.toLowerCase()
//           );
//           if (match) initialPlanId = match.id;
//         }

//         // From current subscription
//         if (!initialPlanId && ov?.currentSubscription?.planId) {
//           const match = loadedPlans.find(
//             p =>
//               p.id &&
//               p.id.toLowerCase() === ov.currentSubscription.planId.toLowerCase()
//           );
//           if (match) initialPlanId = match.id;
//         }

//         // Default: popular plan or first plan
//         if (!initialPlanId && loadedPlans.length > 0) {
//           const popular = loadedPlans.find(p => p.isPopular) || loadedPlans[0];
//           initialPlanId = popular.id;
//         }

//         setSelectedPlanId(initialPlanId);
//         setBillingCycle(initialCycle);

//         // 6️⃣ Pre-fill coupon from URL (actual validation happens on Apply)
//         if (queryParams.coupon && initialPlanId) {
//           setCouponInput(queryParams.coupon.toUpperCase());
//         }
//       } catch (err) {
//         console.error(err);
//         toast.error(
//           err?.response?.data?.message ||
//             "Failed to load billing overview. Please try again."
//         );
//       } finally {
//         setLoading(false);
//       }
//     };

//     load();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [queryParams.planId, queryParams.billingCycle, queryParams.coupon]);

//   // Selected plan object
//   const selectedPlan = useMemo(
//     () => plans.find(p => p.id === selectedPlanId) || null,
//     [plans, selectedPlanId]
//   );

//   const currency = selectedPlan?.currency || "INR";

//   // Base plan price based on billing cycle
//   const basePrice = useMemo(() => {
//     if (!selectedPlan) return 0;
//     return billingCycle === "Monthly"
//       ? selectedPlan.priceMonthly
//       : selectedPlan.priceYearly;
//   }, [selectedPlan, billingCycle]);

//   // Price breakdown with coupon + GST
//   const pricePreview = useMemo(() => {
//     let subtotal = basePrice || 0;
//     let discount = 0;

//     if (
//       appliedCoupon &&
//       appliedCoupon.valid &&
//       appliedCoupon.discountType &&
//       appliedCoupon.discountValue
//     ) {
//       if (appliedCoupon.discountType === "Flat") {
//         discount = appliedCoupon.discountValue;
//       } else if (appliedCoupon.discountType === "Percent") {
//         discount = (subtotal * appliedCoupon.discountValue) / 100;
//       }
//     }

//     if (discount > subtotal) discount = subtotal;
//     const taxable = subtotal - discount;
//     const gst = Math.round(taxable * 0.18 * 100) / 100;
//     const total = Math.max(taxable + gst, 0);

//     return { subtotal, discount, gst, total };
//   }, [basePrice, appliedCoupon]);

//   // Current subscription label
//   const currentStatusLabel = useMemo(() => {
//     const s = overview?.currentSubscription?.status;
//     if (!s) return "No active subscription";
//     switch (s) {
//       case "Trial":
//         return "Trial active";
//       case "Active":
//         return "Subscription active";
//       case "PastDue":
//         return "Payment overdue (Past Due)";
//       case "Suspended":
//         return "Subscription suspended";
//       case "Cancelled":
//       case "Expired":
//         return "No active plan (Cancelled / Expired)";
//       default:
//         return s;
//     }
//   }, [overview]);

//   const currentPlanId = overview?.currentSubscription?.planId || null;

//   // Apply coupon
//   const handleApplyCoupon = async () => {
//     const code = couponInput.trim();
//     if (!selectedPlan) {
//       toast.warn("Select a plan before applying a coupon.");
//       return;
//     }
//     if (!code) {
//       toast.warn("Enter a coupon code.");
//       return;
//     }

//     try {
//       setCouponLoading(true);

//       const res = await axiosClient.get("/payment/coupon/validate", {
//         params: {
//           code,
//           planId: selectedPlan.id,
//           billingCycle,
//         },
//       });

//       const data = res.data;

//       if (!data.ok || !data.valid) {
//         setAppliedCoupon(null);
//         toast.error(data.message || "Invalid or expired coupon.");
//         return;
//       }

//       setAppliedCoupon(data);
//       toast.success(data.message || "Coupon applied successfully.");
//     } catch (err) {
//       console.error(err);
//       setAppliedCoupon(null);
//       toast.error(
//         err?.response?.data?.message ||
//           "Failed to validate coupon. Please try again."
//       );
//     } finally {
//       setCouponLoading(false);
//     }
//   };

//   // Clear coupon
//   const handleClearCoupon = () => {
//     setCouponInput("");
//     setAppliedCoupon(null);
//   };

//   // Start checkout flow
//   const handleProceedToPay = async () => {
//     if (!selectedPlan) {
//       toast.warn("Please select a plan to continue.");
//       return;
//     }

//     try {
//       setCheckoutLoading(true);

//       const payload = {
//         planId: selectedPlan.id,
//         billingCycle,
//         couponCode:
//           appliedCoupon && appliedCoupon.valid && appliedCoupon.code
//             ? appliedCoupon.code
//             : undefined,
//       };

//       const res = await axiosClient.post(
//         "/payment/subscribe/checkout",
//         payload
//       );

//       const data = res.data;

//       if (!data || !data.redirectUrl) {
//         toast.error("Checkout session created, but no redirect URL received.");
//         return;
//       }

//       window.location.href = data.redirectUrl;
//     } catch (err) {
//       console.error(err);
//       toast.error(
//         err?.response?.data?.message ||
//           "Failed to start checkout. Please try again."
//       );
//     } finally {
//       setCheckoutLoading(false);
//     }
//   };

//   // Status badge UI
//   const renderStatusBadge = () => {
//     const status = overview?.currentSubscription?.status;
//     let color = "bg-slate-50 text-slate-700 border-slate-200";

//     if (status === "Active" || status === "Trial") {
//       color = "bg-emerald-50 text-emerald-700 border-emerald-200";
//     } else if (status === "PastDue") {
//       color = "bg-amber-50 text-amber-700 border-amber-200";
//     } else if (
//       status === "Suspended" ||
//       status === "Cancelled" ||
//       status === "Expired"
//     ) {
//       color = "bg-red-50 text-red-700 border-red-200";
//     }

//     return (
//       <span
//         className={
//           "inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-semibold border " +
//           color
//         }
//       >
//         {currentStatusLabel}
//       </span>
//     );
//   };

//   // Single plan card
//   const renderPlanCard = plan => {
//     const isSelected = plan.id === selectedPlanId;
//     const price =
//       billingCycle === "Monthly" ? plan.priceMonthly : plan.priceYearly;
//     const isCurrent =
//       currentPlanId && currentPlanId.toLowerCase() === plan.id.toLowerCase();

//     return (
//       <button
//         key={plan.id}
//         type="button"
//         onClick={() => {
//           setSelectedPlanId(plan.id);
//           setAppliedCoupon(null); // reset coupon when switching plan
//         }}
//         className={
//           "flex flex-col gap-1.5 p-3.5 rounded-lg border text-left transition-all " +
//           "bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] " +
//           (isSelected
//             ? "border-purple-600 ring-2 ring-purple-100"
//             : "border-slate-200 hover:border-slate-300")
//         }
//       >
//         <div className="flex items-center justify-between gap-2">
//           <div className="text-sm font-semibold text-slate-900">
//             {plan.name}
//           </div>
//           <div className="flex items-center gap-1">
//             {isCurrent && (
//               <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[8px] text-emerald-700 border border-emerald-200">
//                 Current plan
//               </span>
//             )}
//             {plan.isPopular && (
//               <span className="px-2 py-0.5 rounded-full bg-slate-900 text-[8px] text-white font-semibold">
//                 Recommended
//               </span>
//             )}
//           </div>
//         </div>
//         {plan.description && (
//           <div className="text-[9px] text-slate-600">{plan.description}</div>
//         )}
//         <div className="mt-1">
//           <div className="text-lg font-semibold text-slate-900 leading-tight">
//             {formatAmount(price, plan.currency)}
//           </div>
//           <div className="text-[8px] text-slate-500">
//             per {billingCycle === "Monthly" ? "month" : "year"}
//           </div>
//         </div>
//         {plan.features && plan.features.length > 0 && (
//           <ul className="mt-2 space-y-0.5 text-[8px] text-slate-600">
//             {plan.features.slice(0, 5).map((f, i) => (
//               <li key={i} className="flex gap-1">
//                 <span className="mt-[1px] text-[8px]">✔</span>
//                 <span>{f}</span>
//               </li>
//             ))}
//           </ul>
//         )}
//       </button>
//     );
//   };

//   if (loading) {
//     return (
//       <div className="px-4 sm:px-6 py-6">
//         <div className="text-sm text-slate-500">Loading billing overview…</div>
//       </div>
//     );
//   }

//   const recentInvoices = overview?.recentInvoices || [];

//   return (
//     <div className="px-4 sm:px-6 py-6 space-y-4">
//       {/* Header */}
//       <div className="flex flex-wrap items-center justify-between gap-3">
//         <div>
//           <h1 className="text-lg font-semibold text-slate-900">
//             Billing &amp; Subscription
//           </h1>
//           <p className="text-[10px] text-slate-500 mt-0.5">
//             Manage your plan, review invoices, and update your subscription
//             securely.
//           </p>
//         </div>
//         <div className="flex flex-col items-end gap-1">
//           {renderStatusBadge()}
//           {overview?.currentSubscription?.currentPeriodEndUtc && (
//             <div className="text-[8px] text-slate-500">
//               Renews / ends on{" "}
//               <span className="font-semibold text-slate-800">
//                 {formatDate(overview.currentSubscription.currentPeriodEndUtc)}
//               </span>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Main layout: Plans + Summary */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
//         {/* Left: Plan selection */}
//         <div className="lg:col-span-2 space-y-3">
//           {/* Billing cycle toggle */}
//           <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1">
//             <button
//               type="button"
//               onClick={() => setBillingCycle("Monthly")}
//               className={
//                 "px-3 py-1 rounded-full text-[9px] font-medium " +
//                 (billingCycle === "Monthly"
//                   ? "bg-white shadow-sm text-slate-900"
//                   : "text-slate-500")
//               }
//             >
//               Monthly
//             </button>
//             <button
//               type="button"
//               onClick={() => setBillingCycle("Yearly")}
//               className={
//                 "px-3 py-1 rounded-full text-[9px] font-medium " +
//                 (billingCycle === "Yearly"
//                   ? "bg-white shadow-sm text-slate-900"
//                   : "text-slate-500")
//               }
//             >
//               Yearly
//               <span className="ml-1 text-[7px] text-emerald-600">
//                 Save with annual
//               </span>
//             </button>
//           </div>

//           {/* Plan cards */}
//           <div className="grid sm:grid-cols-3 gap-3">
//             {plans.map(plan => renderPlanCard(plan))}
//           </div>
//         </div>

//         {/* Right: Order summary + coupon + action */}
//         <div className="lg:col-span-1">
//           <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 space-y-2.5">
//             <div className="flex items-center justify-between gap-2">
//               <div>
//                 <div className="text-xs font-semibold text-slate-900">
//                   Order summary
//                 </div>
//                 <div className="text-[8px] text-slate-500">
//                   Review your selection before proceeding to secure payment.
//                 </div>
//               </div>
//               {selectedPlan && (
//                 <div className="text-right">
//                   <div className="text-[8px] text-slate-500">Selected plan</div>
//                   <div className="text-[10px] font-semibold text-slate-900">
//                     {selectedPlan.name}
//                   </div>
//                   <div className="text-[8px] text-slate-500">
//                     {billingCycle}
//                   </div>
//                 </div>
//               )}
//             </div>

//             <div className="border-t border-slate-100 pt-2 space-y-1.5 text-[9px]">
//               <div className="flex justify-between">
//                 <span className="text-slate-600">Plan subtotal</span>
//                 <span className="font-medium text-slate-900">
//                   {formatAmount(pricePreview.subtotal, currency)}
//                 </span>
//               </div>
//               <div className="flex justify-between">
//                 <span className="text-slate-600">Discount</span>
//                 <span className="font-medium text-emerald-600">
//                   -{formatAmount(pricePreview.discount, currency)}
//                 </span>
//               </div>
//               <div className="flex justify-between">
//                 <span className="text-slate-600">GST (18%)</span>
//                 <span className="font-medium text-slate-900">
//                   {formatAmount(pricePreview.gst, currency)}
//                 </span>
//               </div>
//               <div className="flex justify-between pt-1 border-t border-slate-100">
//                 <span className="text-[9px] font-semibold text-slate-900">
//                   Total payable
//                 </span>
//                 <span className="text-sm font-semibold text-slate-900">
//                   {formatAmount(pricePreview.total, currency)}
//                 </span>
//               </div>
//             </div>

//             {/* Coupon input */}
//             <div className="pt-1 space-y-1.5">
//               <div className="flex items-center gap-1.5">
//                 <input
//                   type="text"
//                   value={couponInput}
//                   onChange={e => setCouponInput(e.target.value.toUpperCase())}
//                   placeholder="Enter coupon code"
//                   className="flex-1 px-2 py-1.5 rounded-md border border-slate-200 text-[9px] focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
//                   disabled={couponLoading || checkoutLoading}
//                 />
//                 {appliedCoupon ? (
//                   <button
//                     type="button"
//                     onClick={handleClearCoupon}
//                     className="px-2 py-1.5 rounded-md border border-slate-200 text-[8px] text-slate-700 hover:bg-slate-50"
//                     disabled={couponLoading || checkoutLoading}
//                   >
//                     Clear
//                   </button>
//                 ) : (
//                   <button
//                     type="button"
//                     onClick={handleApplyCoupon}
//                     className="px-2 py-1.5 rounded-md bg-slate-900 text-white text-[8px] font-semibold hover:bg-black disabled:opacity-60"
//                     disabled={couponLoading || checkoutLoading}
//                   >
//                     {couponLoading ? "Checking…" : "Apply"}
//                   </button>
//                 )}
//               </div>
//               {appliedCoupon && appliedCoupon.valid && (
//                 <div className="text-[8px] text-emerald-700">
//                   {appliedCoupon.message ||
//                     `Coupon ${appliedCoupon.code} applied successfully.`}
//                 </div>
//               )}
//             </div>

//             {/* Proceed button */}
//             <div className="pt-1">
//               <button
//                 type="button"
//                 onClick={handleProceedToPay}
//                 disabled={
//                   checkoutLoading || !selectedPlan || pricePreview.total < 0
//                 }
//                 className={
//                   "w-full px-3 py-2 rounded-md text-[10px] font-semibold " +
//                   "bg-purple-600 text-white hover:bg-purple-700 " +
//                   "disabled:opacity-60 disabled:cursor-not-allowed"
//                 }
//               >
//                 {checkoutLoading
//                   ? "Redirecting to secure payment…"
//                   : "Proceed to secure payment"}
//               </button>
//               <div className="mt-1 text-[7px] text-slate-500">
//                 Payments are processed securely. Your plan will be activated
//                 automatically after confirmation.
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Recent invoices */}
//       <div className="mt-4">
//         <div className="flex items-center justify-between mb-1.5">
//           <h2 className="text-xs font-semibold text-slate-900">
//             Recent invoices
//           </h2>
//           <div className="text-[8px] text-slate-500">
//             Showing latest billing activity for your account.
//           </div>
//         </div>
//         {recentInvoices.length === 0 ? (
//           <div className="text-[9px] text-slate-500 bg-white border border-slate-200 rounded-md px-3 py-2">
//             No invoices found yet. Once you subscribe or renew, your invoices
//             will appear here.
//           </div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="min-w-full bg-white border border-slate-200 rounded-md overflow-hidden">
//               <thead>
//                 <tr className="bg-slate-50 text-[8px] text-slate-500">
//                   <th className="px-3 py-1.5 text-left font-medium">Date</th>
//                   <th className="px-3 py-1.5 text-left font-medium">
//                     Invoice #
//                   </th>
//                   <th className="px-3 py-1.5 text-left font-medium">Plan</th>
//                   <th className="px-3 py-1.5 text-left font-medium">Status</th>
//                   <th className="px-3 py-1.5 text-right font-medium">Amount</th>
//                 </tr>
//               </thead>
//               <tbody className="text-[8px] text-slate-700">
//                 {recentInvoices.map(inv => (
//                   <tr
//                     key={inv.id || inv.number}
//                     className="border-t border-slate-100"
//                   >
//                     <td className="px-3 py-1.5">
//                       {formatDate(inv.createdAtUtc)}
//                     </td>
//                     <td className="px-3 py-1.5">
//                       {inv.number || inv.id || "—"}
//                     </td>
//                     <td className="px-3 py-1.5">
//                       {inv.planName || inv.planId || "—"}
//                     </td>
//                     <td className="px-3 py-1.5">
//                       <span
//                         className={
//                           "px-1.5 py-0.5 rounded-full border text-[7px] " +
//                           (inv.status === "Paid"
//                             ? "bg-emerald-50 text-emerald-700 border-emerald-200"
//                             : inv.status === "Failed"
//                             ? "bg-red-50 text-red-700 border-red-200"
//                             : "bg-slate-50 text-slate-700 border-slate-200")
//                         }
//                       >
//                         {inv.status || "—"}
//                       </span>
//                     </td>
//                     <td className="px-3 py-1.5 text-right">
//                       {formatAmount(inv.total, inv.currency || "INR")}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default BillingPage;
