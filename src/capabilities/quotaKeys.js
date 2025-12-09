// 📄 src/capabilities/quotaKeys.js

export const QUOTA_KEYS = Object.freeze({
  MESSAGES_PER_MONTH: "MESSAGES_PER_MONTH",
  CAMPAIGNS_PER_DAY: "CAMPAIGNS_PER_DAY",
  TEMPLATES_TOTAL: "TEMPLATES_TOTAL",
  MESSAGES_PER_DAY: "MESSAGES_PER_DAY",
  // future:
  // AI_TOKENS_PER_MONTH: "AI_TOKENS_PER_MONTH",
});

// Optional: definition list with labels & defaults
export const QUOTA_DEFINITIONS = [
  {
    key: QUOTA_KEYS.MESSAGES_PER_MONTH,
    label: "Messages / month",
    defaultLimit: 10000,
    defaultPeriod: 2,
  },
  {
    key: QUOTA_KEYS.CAMPAIGNS_PER_DAY,
    label: "Campaigns / day",
    defaultLimit: 50,
    defaultPeriod: 1,
  },
  {
    key: QUOTA_KEYS.TEMPLATES_TOTAL,
    label: "Templates total",
    defaultLimit: 100,
    defaultPeriod: 0,
  },
  {
    key: QUOTA_KEYS.MESSAGES_PER_DAY,
    label: "Messages / day",
    defaultLimit: 500,
    defaultPeriod: 1,
  },
];
