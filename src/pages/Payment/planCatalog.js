// 📄 src/pages/Payment/planCatalog.js

// ✅ Stable identifiers for internal usage
export const PLAN_IDS = {
  BASIC: "basic",
  SMART: "smart",
  ADVANCED: "advanced",
};

// ✅ Static fallback / default catalog
// This is the single place to define plan metadata in the frontend.
// Backend /api/plans will later override values but keep the same IDs & codes.
const STATIC_PLANS = [
  {
    id: PLAN_IDS.BASIC,
    code: "XBASIC",
    name: "Basic",
    description: "Ideal for getting started and trying the platform.",
    isPopular: false,
    currency: "INR",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      "Send WhatsApp messages",
      "Manage contacts & tags",
      "Basic CRM access",
    ],
  },
  {
    id: PLAN_IDS.SMART,
    code: "XSMART",
    name: "Smart",
    description: "For growing teams running campaigns & catalogs.",
    isPopular: true, // highlighted tier
    currency: "INR",
    priceMonthly: 399,
    priceYearly: 3999,
    features: [
      "Campaign management",
      "Product catalog sharing",
      "Catalog analytics",
      "Reminder automation",
    ],
  },
  {
    id: PLAN_IDS.ADVANCED,
    code: "XADVANCED",
    name: "Advanced",
    description: "For advanced CRM insights and power users.",
    isPopular: false,
    currency: "INR",
    priceMonthly: 899,
    priceYearly: 8999,
    features: [
      "CRM insights & reports",
      "Advanced analytics",
      "Team collaboration tools",
      "Priority support",
    ],
  },
];

// 👉 Public helpers

// Get all plans (already normalized); used by BillingPage, selectors, etc.
export function getAllPlans() {
  return [...STATIC_PLANS];
}

// Get a plan by internal id (basic/smart/advanced)
export function getPlanById(id) {
  if (!id) return null;
  const key = String(id).toLowerCase();
  return STATIC_PLANS.find(p => p.id.toLowerCase() === key) || null;
}

// Get a plan by stable code (XBASIC / XSMART / XADVANCED)
export function getPlanByCode(code) {
  if (!code) return null;
  const key = String(code).toLowerCase();
  return STATIC_PLANS.find(p => (p.code || "").toLowerCase() === key) || null;
}

// Normalize backend /api/plans into this shape.
// If backend not ready or returns unexpected shape, caller can safely fall back.
export function normalizeApiPlans(raw) {
  if (!raw) return [];

  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.plans)
    ? raw.plans
    : [];

  return list
    .filter(p => p && p.id && p.name)
    .map(p => ({
      id: String(p.id),
      code: p.code || String(p.id).toUpperCase(),
      name: p.name,
      description: p.description || "",
      isPopular: Boolean(p.isPopular),
      currency: p.currency || "INR",
      priceMonthly: typeof p.priceMonthly === "number" ? p.priceMonthly : 0,
      priceYearly: typeof p.priceYearly === "number" ? p.priceYearly : 0,
      features: Array.isArray(p.features) ? p.features : [],
    }));
}

// Build a comparison matrix for UI components.
// Output:
// [
//   { key, label, values: { basic: '1 user', smart: '5 users', advanced: '20 users' } },
//   ...
// ]
export function buildFeatureMatrix() {
  const plans = getAllPlans();

  const featureDefs = [
    { key: "users", label: "Team members" },
    { key: "contacts", label: "Contacts" },
    { key: "catalog", label: "Catalog & campaigns" },
    { key: "automation", label: "Automation workflows" },
    { key: "analytics", label: "Advanced analytics" },
    { key: "support", label: "Priority support" },
  ];

  return featureDefs.map(def => {
    const values = {};
    for (const plan of plans) {
      switch (def.key) {
        case "users":
          values[plan.id] =
            plan.id === PLAN_IDS.BASIC
              ? "1"
              : plan.id === PLAN_IDS.SMART
              ? "Up to 5"
              : "Up to 20";
          break;
        case "contacts":
          values[plan.id] =
            plan.id === PLAN_IDS.BASIC
              ? "2,000"
              : plan.id === PLAN_IDS.SMART
              ? "10,000"
              : "50,000";
          break;
        case "catalog":
          values[plan.id] =
            plan.id === PLAN_IDS.BASIC
              ? "Basic tools"
              : plan.id === PLAN_IDS.SMART
              ? "Catalog + campaigns"
              : "Full catalog + bulk campaigns";
          break;
        case "automation":
          values[plan.id] =
            plan.id === PLAN_IDS.BASIC
              ? "—"
              : plan.id === PLAN_IDS.SMART
              ? "Basic journeys"
              : "Advanced journeys";
          break;
        case "analytics":
          values[plan.id] =
            plan.id === PLAN_IDS.BASIC
              ? "Basic"
              : plan.id === PLAN_IDS.SMART
              ? "Advanced"
              : "Pro-level insights";
          break;
        case "support":
          values[plan.id] =
            plan.id === PLAN_IDS.BASIC
              ? "Standard"
              : plan.id === PLAN_IDS.SMART
              ? "Priority"
              : "Priority+";
          break;
        default:
          values[plan.id] = "—";
      }
    }
    return {
      key: def.key,
      label: def.label,
      values,
    };
  });
}
