// 📄 src/pages/admin/FeatureAccess/PlanManagement.jsx

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { QUOTA_DEFINITIONS } from "../../../capabilities/quotaKeys";
// Icons
import {
  ShieldCheck,
  Settings2,
  Loader2,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  Filter,
  AlertTriangle,
  Clock4,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

// API helpers
import {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getPlanPermissions,
  updatePlanPermissions,
  getPlanQuotas,
  updatePlanQuotas,
} from "../../../api/plans";

import { getGroupedPermissions } from "../../../api/permissions";

// Small helpers
const STATUS_COLORS = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  inactive: "bg-rose-100 text-rose-700 border-rose-200",
};

const QUOTA_PERIOD_LABELS = {
  0: "Lifetime",
  1: "Daily",
  2: "Monthly",
};

const KNOWN_QUOTA_LABELS = QUOTA_DEFINITIONS.reduce((acc, def) => {
  acc[def.key] = def.label;
  return acc;
}, {});

// Quick quota presets (pure frontend)
const QUOTA_PRESETS = {
  MESSAGES_PER_MONTH: {
    quotaKey: "MESSAGES_PER_MONTH",
    label: "Messages / month",
    defaultLimit: 10000,
    defaultPeriod: 2, // Monthly
  },
  CAMPAIGNS_PER_DAY: {
    quotaKey: "CAMPAIGNS_PER_DAY",
    label: "Campaigns / day",
    defaultLimit: 50,
    defaultPeriod: 1, // Daily
  },
  TEMPLATES_TOTAL: {
    quotaKey: "TEMPLATES_TOTAL",
    label: "Templates total",
    defaultLimit: 100,
    defaultPeriod: 0, // Lifetime
  },
};

function formatCompactNumber(value) {
  if (value === -1) return "∞";
  if (value >= 1_000_000)
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value);
}

function StatusPill({ isActive }) {
  const label = isActive ? "Active" : "Inactive";
  const color = isActive ? STATUS_COLORS.active : STATUS_COLORS.inactive;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? "bg-emerald-500" : "bg-rose-500"
        }`}
      />
      {label}
    </span>
  );
}

// Kept for future reuse if needed (not used right now)
function PlanListItem({
  plan,
  isSelected,
  onSelect,
  onEditClick,
  onDelete,
  quotaSummary,
}) {
  const msgQuota = quotaSummary?.messagesPerMonth;
  const campQuota = quotaSummary?.campaignsPerDay;

  return (
    <button
      type="button"
      onClick={() => onSelect(plan)}
      className={`w-full text-left group rounded-xl border transition-all flex items-start gap-3 px-3 py-3 ${
        isSelected
          ? "border-indigo-500 bg-indigo-50/70"
          : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
      }`}
    >
      <div className="mt-1">
        <ShieldCheck
          className={`h-5 w-5 ${
            isSelected
              ? "text-indigo-600"
              : "text-slate-400 group-hover:text-indigo-500"
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-semibold text-slate-900 truncate">{plan.name}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wide">
              {plan.code}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <StatusPill isActive={plan.isActive} />
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onEditClick(plan);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onDelete(plan);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        {plan.description && (
          <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
            {plan.description}
          </p>
        )}

        {(msgQuota || campQuota) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
            {msgQuota && typeof msgQuota.limit === "number" && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                {formatCompactNumber(msgQuota.limit)} msgs/mo
              </span>
            )}
            {campQuota && typeof campQuota.limit === "number" && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                {formatCompactNumber(campQuota.limit)} campaigns/day
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

function PermissionToggleRow({ permission, checked, onChange }) {
  const id = permission.id ?? permission.Id;

  return (
    <label className="flex items-start gap-3 py-1.5">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        checked={checked}
        onChange={e => onChange(id, e.target.checked)}
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-800">
            {permission.name}
          </span>
          {permission.code && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wide">
              {permission.code}
            </span>
          )}
        </div>
        {permission.description && (
          <p className="text-xs text-slate-500">{permission.description}</p>
        )}
      </div>
    </label>
  );
}

function TabButton({ id, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`relative px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-indigo-500 text-slate-900"
          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

export default function PlanManagementPage() {
  const navigate = useNavigate();

  // Plans
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Active tab: plan | features | quotas

  const [activeTab, setActiveTab] = useState("plan");
  // Plan form (create/update)
  const [isEditing, setIsEditing] = useState(false);
  const [planForm, setPlanForm] = useState({
    id: null,
    name: "",
    code: "",
    description: "",
    isActive: true,
  });
  const [savingPlan, setSavingPlan] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);

  // Permissions
  const [groupedPermissions, setGroupedPermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState(new Set());
  const [permissionFilter, setPermissionFilter] = useState("");
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  // Quotas
  const [quotaRows, setQuotaRows] = useState([]);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [savingQuotas, setSavingQuotas] = useState(false);

  // Per-plan quota summary (for Plan tab)
  const [planQuotaSummaries, setPlanQuotaSummaries] = useState({});

  // --- helpers for quota summaries ---
  const buildQuotaSummary = useCallback(list => {
    const normalizeKey = key => (key ?? "").toString().trim().toUpperCase();
    const findRow = quotaKey => {
      const row = list.find(
        q => normalizeKey(q.quotaKey ?? q.QuotaKey) === quotaKey
      );
      if (!row) return null;
      const limit =
        typeof row.limit === "number"
          ? row.limit
          : typeof row.Limit === "number"
          ? row.Limit
          : undefined;
      const period =
        typeof row.period === "number"
          ? row.period
          : typeof row.Period === "number"
          ? row.Period
          : undefined;
      if (limit === undefined) return null;
      return { limit, period };
    };

    return {
      messagesPerMonth: findRow("MESSAGES_PER_MONTH"),
      campaignsPerDay: findRow("CAMPAIGNS_PER_DAY"),
    };
  }, []);

  const prefetchPlanQuotaSummaries = useCallback(
    async plansArray => {
      try {
        const entries = await Promise.all(
          plansArray.map(async p => {
            try {
              const data = await getPlanQuotas(p.id);
              const list = Array.isArray(data) ? data : data?.data ?? [];
              return [p.id, buildQuotaSummary(list)];
            } catch (err) {
              console.error("Failed to prefetch quotas for plan", p.id, err);
              return [p.id, null];
            }
          })
        );

        setPlanQuotaSummaries(prev => {
          const next = { ...prev };
          for (const [id, summary] of entries) {
            if (summary) next[id] = summary;
          }
          return next;
        });
      } catch (err) {
        console.error("Prefetch quota summaries failed", err);
      }
    },
    [buildQuotaSummary]
  );

  // Effects – initial load
  useEffect(() => {
    loadPlans();
    loadPermissions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const res = await getPlans();
      const data = Array.isArray(res?.data ?? res) ? res.data ?? res : res;
      const safe = data || [];
      setPlans(safe);

      if ((!selectedPlan || !selectedPlan.id) && safe.length > 0) {
        setSelectedPlan(safe[0]);
      }

      if (Array.isArray(safe) && safe.length > 0) {
        prefetchPlanQuotaSummaries(safe);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load plans");
    } finally {
      setLoadingPlans(false);
    }
  }, [selectedPlan, prefetchPlanQuotaSummaries]);

  const loadPermissions = useCallback(async () => {
    try {
      const res = await getGroupedPermissions();
      const payload = res?.data?.data ?? res?.data ?? res;
      const groups = payload?.groups ?? payload ?? [];
      setGroupedPermissions(groups);

      const allGroups = new Set(groups.map(g => g.group ?? g.Group ?? "Other"));
      setExpandedGroups(allGroups);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load permissions catalog");
    }
  }, []);

  const loadPlanPermissions = useCallback(async planId => {
    if (!planId) {
      setSelectedPermissionIds(new Set());
      return;
    }
    setLoadingPermissions(true);
    try {
      const res = await getPlanPermissions(planId);
      const payload = res?.data ?? res;
      const ids = new Set(payload.map(p => p.id ?? p.Id));
      setSelectedPermissionIds(ids);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load permissions for this plan");
    } finally {
      setLoadingPermissions(false);
    }
  }, []);

  const loadPlanQuotas = useCallback(
    async planId => {
      if (!planId) {
        setQuotaRows([]);
        return;
      }
      setQuotaLoading(true);
      try {
        const data = await getPlanQuotas(planId);
        const list = Array.isArray(data) ? data : data?.data ?? [];

        const normalized = list.map(q => ({
          id: q.id ?? q.Id,
          planId: q.planId ?? q.PlanId,
          quotaKey: (q.quotaKey ?? q.QuotaKey ?? "").toUpperCase(),
          limit:
            typeof q.limit === "number"
              ? q.limit
              : typeof q.Limit === "number"
              ? q.Limit
              : 0,
          period:
            typeof q.period === "number"
              ? q.period
              : typeof q.Period === "number"
              ? q.Period
              : 2,
          denialMessage: q.denialMessage ?? q.DenialMessage ?? "",
        }));

        setQuotaRows(normalized);

        setPlanQuotaSummaries(prev => ({
          ...prev,
          [planId]: buildQuotaSummary(normalized),
        }));
      } catch (err) {
        console.error(err);
        toast.error("Failed to load plan quotas");
        setQuotaRows([]);
      } finally {
        setQuotaLoading(false);
      }
    },
    [buildQuotaSummary]
  );

  useEffect(() => {
    if (selectedPlan?.id) {
      loadPlanPermissions(selectedPlan.id);
      loadPlanQuotas(selectedPlan.id);
    } else {
      setSelectedPermissionIds(new Set());
      setQuotaRows([]);
    }
  }, [selectedPlan, loadPlanPermissions, loadPlanQuotas]);

  // ---- Plan selection + modal handlers ----
  const handlePlanSelectChange = e => {
    const id = e.target.value;
    const found = plans.find(p => String(p.id) === String(id));
    if (found) {
      setSelectedPlan(found);
    } else {
      setSelectedPlan(null);
    }
  };

  const openCreatePlan = () => {
    setIsEditing(false);
    setPlanForm({
      id: null,
      name: "",
      code: "",
      description: "",
      isActive: true,
    });
    setPlanModalOpen(true);
  };

  const openEditPlan = plan => {
    setIsEditing(true);
    setPlanForm({
      id: plan.id,
      name: plan.name,
      code: plan.code,
      description: plan.description ?? "",
      isActive: plan.isActive,
    });
    setPlanModalOpen(true);
  };

  const closePlanModal = () => {
    setPlanModalOpen(false);
  };

  const handlePlanFormChange = (field, value) => {
    setPlanForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSavePlan = async e => {
    e.preventDefault();
    if (!planForm.name?.trim() || !planForm.code?.trim()) {
      toast.warn("Code and Name are required");
      return;
    }

    setSavingPlan(true);
    try {
      if (isEditing && planForm.id) {
        await updatePlan(planForm.id, {
          name: planForm.name.trim(),
          code: planForm.code.trim(),
          description: planForm.description?.trim() ?? "",
          isActive: planForm.isActive,
        });
        toast.success("Plan updated");
      } else {
        const res = await createPlan({
          name: planForm.name.trim(),
          code: planForm.code.trim(),
          description: planForm.description?.trim() ?? "",
          isActive: planForm.isActive,
        });

        const newId = res?.data?.id ?? res?.id;
        toast.success("Plan created");

        if (newId) {
          const newPlan = {
            id: newId,
            name: planForm.name.trim(),
            code: planForm.code.trim(),
            description: planForm.description?.trim() ?? "",
            isActive: planForm.isActive,
          };
          setSelectedPlan(newPlan);
        }
      }

      await loadPlans();
      setPlanModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save plan");
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = async plan => {
    if (
      !window.confirm(
        `Are you sure you want to delete plan "${plan.name}"? This will not delete businesses, only the plan definition.`
      )
    ) {
      return;
    }

    try {
      await deletePlan(plan.id);
      toast.success("Plan deleted");
      await loadPlans();
      if (selectedPlan?.id === plan.id) {
        setSelectedPlan(null);
        setSelectedPermissionIds(new Set());
        setQuotaRows([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete plan");
    }
  };

  // ---- Permission mapping handlers ----
  const togglePermissionForPlan = (permissionId, checked) => {
    if (!permissionId) return;
    setSelectedPermissionIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(permissionId);
      else next.delete(permissionId);
      return next;
    });
  };

  const toggleGroupPermissions = (features, enable) => {
    const ids = features
      .map(f => f.id ?? f.Id)
      .filter(id => id !== undefined && id !== null);

    setSelectedPermissionIds(prev => {
      const next = new Set(prev);
      if (enable) {
        ids.forEach(id => next.add(id));
      } else {
        ids.forEach(id => next.delete(id));
      }
      return next;
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedPlan?.id) {
      toast.warn("Select a plan first");
      return;
    }

    const enabledPermissionIds = Array.from(selectedPermissionIds);

    setSavingPermissions(true);
    try {
      await updatePlanPermissions(selectedPlan.id, {
        enabledPermissionIds,
        replaceAll: true,
      });

      toast.success("Permissions updated for plan");
      await loadPlanPermissions(selectedPlan.id);
    } catch (err) {
      console.error("Failed to update plan permissions", err);
      toast.error("Failed to update plan permissions");
    } finally {
      setSavingPermissions(false);
    }
  };

  const toggleGroupExpanded = groupName => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  const filteredGroups = groupedPermissions.map(group => {
    const name = group.group ?? group.Group ?? "Other";
    const features = group.features ?? group.Features ?? [];
    if (!permissionFilter.trim()) return { name, features };

    const needle = permissionFilter.trim().toLowerCase();
    const filtered = features.filter(p => {
      const label = `${p.name ?? ""} ${p.code ?? ""} ${
        p.description ?? ""
      }`.toLowerCase();
      return label.includes(needle);
    });
    return { name, features: filtered };
  });

  // ---- Quotas handlers ----
  const handleQuotaFieldChange = (index, field, value) => {
    setQuotaRows(prev => {
      const next = [...prev];
      const row = { ...next[index] };

      if (field === "quotaKey") {
        row.quotaKey = value.toUpperCase();
      } else if (field === "limit") {
        const parsed = Number(value);
        row.limit = Number.isNaN(parsed) ? 0 : parsed;
      } else if (field === "period") {
        row.period = Number(value);
      } else if (field === "denialMessage") {
        row.denialMessage = value;
      }

      next[index] = row;
      return next;
    });
  };

  const handleAddQuotaRow = () => {
    if (!selectedPlan?.id) {
      toast.warn("Select a plan first");
      return;
    }
    setQuotaRows(prev => [
      ...prev,
      {
        id: null,
        planId: selectedPlan.id,
        quotaKey: "",
        limit: 0,
        period: 2,
        denialMessage: "",
      },
    ]);
  };

  // ✅ NEW: remove quota row (for mistakes)
  const handleRemoveQuotaRow = index => {
    setQuotaRows(prev => prev.filter((_, i) => i !== index));
    toast.success("Quota rule removed. Click “Save quotas” to apply changes.");
  };

  const applyQuotaPreset = presetKey => {
    if (!selectedPlan?.id) {
      toast.warn("Select a plan first");
      return;
    }

    const preset = QUOTA_PRESETS[presetKey];
    if (!preset) return;

    setQuotaRows(prev => {
      const existingIndex = prev.findIndex(
        q => (q.quotaKey ?? "").toUpperCase() === preset.quotaKey
      );

      if (existingIndex >= 0) {
        const next = [...prev];
        const row = { ...next[existingIndex] };
        row.quotaKey = preset.quotaKey;
        row.period = row.period ?? preset.defaultPeriod;
        if (!row.limit || row.limit === 0) {
          row.limit = preset.defaultLimit;
        }
        next[existingIndex] = row;
        return next;
      }

      return [
        ...prev,
        {
          id: null,
          planId: selectedPlan.id,
          quotaKey: preset.quotaKey,
          limit: preset.defaultLimit,
          period: preset.defaultPeriod,
          denialMessage: "",
        },
      ];
    });
  };

  const handleSaveQuotas = async () => {
    if (!selectedPlan?.id) {
      toast.warn("Select a plan first");
      return;
    }

    const cleaned = quotaRows
      .filter(q => (q.quotaKey ?? "").trim() !== "")
      .map(q => {
        const dto = {
          planId: selectedPlan.id,
          quotaKey: q.quotaKey.trim().toUpperCase(),
          limit: q.limit,
          period: q.period,
          denialMessage: q.denialMessage?.trim() || null,
        };

        // ✅ Only send id if we actually have one
        if (q.id) {
          dto.id = q.id;
        }

        return dto;
      });

    if (cleaned.length === 0) {
      const confirmed = window.confirm(
        "This will remove all quota rules for this plan. Continue?"
      );
      if (!confirmed) return;
    }

    setSavingQuotas(true);
    try {
      await updatePlanQuotas(selectedPlan.id, cleaned);
      toast.success("Quotas saved for this plan");
      await loadPlanQuotas(selectedPlan.id);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save plan quotas");
    } finally {
      setSavingQuotas(false);
    }
  };

  // ---- Render helpers for tabs ----
  const renderPlanSummaryTab = () => {
    if (!selectedPlan) {
      return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-10">
          <p className="text-xs text-slate-400">
            Select a plan from the header above to view its summary.
          </p>
        </div>
      );
    }

    const quotaSummary = planQuotaSummaries[selectedPlan.id];
    const hasQuotaRows = quotaRows && quotaRows.length > 0;

    // Permissions coverage (X of Y enabled)
    let totalPermissions = 0;
    let enabledPermissions = 0;
    groupedPermissions.forEach(group => {
      const features = group.features ?? group.Features ?? [];
      features.forEach(f => {
        const id = f.id ?? f.Id;
        if (id == null) return;
        totalPermissions++;
        if (selectedPermissionIds.has(id)) enabledPermissions++;
      });
    });
    const coveragePercent =
      totalPermissions > 0
        ? Math.round((enabledPermissions / totalPermissions) * 100)
        : 0;

    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-4">
        {/* Top: identity */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {selectedPlan.name}
              </p>
              <p className="text-[11px] text-slate-500">
                Code:{" "}
                <span className="uppercase tracking-wide bg-slate-100 px-1.5 py-0.5 rounded">
                  {selectedPlan.code}
                </span>
              </p>
            </div>
          </div>
          <StatusPill isActive={selectedPlan.isActive} />
        </div>

        {selectedPlan.description && (
          <p className="text-xs text-slate-600 mt-1">
            {selectedPlan.description}
          </p>
        )}

        {/* Three-column snapshot */}
        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Identity & lifecycle */}
          <div className="border border-slate-100 rounded-xl p-3 bg-gradient-to-br from-slate-50 to-slate-100/80 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
            <p className="text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
              Plan identity
            </p>
            <ul className="space-y-1 text-[11px] text-slate-600">
              <li className="flex justify-between gap-3">
                <span className="font-medium text-slate-500">Name</span>
                <span className="font-medium text-slate-800">
                  {selectedPlan.name}
                </span>
              </li>
              <li className="flex justify-between gap-3 items-center">
                <span className="font-medium text-slate-500">Code</span>
                <span className="uppercase bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px] tracking-wide">
                  {selectedPlan.code}
                </span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="font-medium text-slate-500">Status</span>
                <span className="font-medium text-slate-800">
                  {selectedPlan.isActive ? "Active" : "Inactive"}
                </span>
              </li>
            </ul>
          </div>

          {/* Usage limits snapshot */}
          <div className="border border-slate-100 rounded-xl p-3 bg-gradient-to-br from-indigo-50/70 to-slate-50 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
            <p className="text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
              Usage limits
            </p>
            {quotaSummary ? (
              <div className="flex flex-col gap-1.5 text-[11px]">
                {quotaSummary.messagesPerMonth && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">Messages / month</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-100 text-[11px] font-semibold">
                      {formatCompactNumber(quotaSummary.messagesPerMonth.limit)}
                    </span>
                  </div>
                )}
                {quotaSummary.campaignsPerDay && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">Campaigns / day</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-amber-700 border border-amber-100 text-[11px] font-semibold">
                      {formatCompactNumber(quotaSummary.campaignsPerDay.limit)}
                    </span>
                  </div>
                )}
                {!quotaSummary.messagesPerMonth &&
                  !quotaSummary.campaignsPerDay && (
                    <span className="text-[11px] text-slate-500">
                      No key quotas configured yet. Set them on the{" "}
                      <span className="font-semibold">Quotas &amp; usage</span>{" "}
                      tab.
                    </span>
                  )}
                {hasQuotaRows && (
                  <span className="text-[10px] text-slate-400 mt-1">
                    Total quota rules:{" "}
                    <span className="font-semibold">{quotaRows.length}</span>
                  </span>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                No quota summary yet. Configure quotas on the{" "}
                <span className="font-semibold">Quotas &amp; usage</span> tab.
              </p>
            )}
          </div>

          {/* Permissions coverage */}
          <div className="border border-slate-100 rounded-xl p-3 bg-gradient-to-br from-emerald-50/70 to-slate-50 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
            <p className="text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
              Feature coverage
            </p>
            {totalPermissions === 0 ? (
              <p className="text-[11px] text-slate-500">
                Permissions catalogue not loaded yet.
              </p>
            ) : (
              <>
                <p className="text-[11px] text-slate-600 mb-1">
                  <span className="font-semibold">{enabledPermissions}</span> of{" "}
                  <span className="font-semibold">{totalPermissions}</span>{" "}
                  permissions enabled ({coveragePercent}%)
                </p>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Number.isNaN(coveragePercent) ? 0 : coveragePercent
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-500">
                  Adjust feature access on the{" "}
                  <span className="font-semibold">Feature mapping</span> tab.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Detailed quota breakdown */}
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-[11px] font-semibold text-slate-700 mb-2 uppercase tracking-wide">
            Quota breakdown for this plan
          </p>
          {hasQuotaRows ? (
            <ul className="mt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {quotaRows.map((q, idx) => {
                const key = q.quotaKey ?? "";
                const friendly =
                  KNOWN_QUOTA_LABELS[key] ??
                  key
                    .toLowerCase()
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, c => c.toUpperCase());
                const limitDisplay =
                  q.limit === -1 ? "Unlimited" : formatCompactNumber(q.limit);
                const periodLabel = QUOTA_PERIOD_LABELS[q.period] ?? "Custom";

                return (
                  <li
                    key={q.id ?? key ?? idx}
                    className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 flex items-start justify-between gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-800">
                        {friendly}
                      </p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                        {key}
                      </p>
                      {q.denialMessage && (
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                          {q.denialMessage}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full border border-slate-200 bg-white text-[11px] font-semibold text-slate-800">
                        {limitDisplay}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {periodLabel}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[11px] text-slate-500">
              No quotas defined yet. Use the{" "}
              <span className="font-semibold">Quotas &amp; usage</span> tab to
              configure limits for this plan.
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderFeatureMappingTab = () => {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[220px]">
        <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
              Feature mapping
            </p>
            <p className="text-xs text-slate-500">
              Toggle which capabilities are available for the selected plan.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Filter className="h-3.5 w-3.5 text-slate-400 absolute left-2 top-1.5" />
              <input
                type="text"
                placeholder="Filter permissions…"
                className="w-40 pl-7 pr-2 py-1.5 rounded-md border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                value={permissionFilter}
                onChange={e => setPermissionFilter(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={handleSavePermissions}
              disabled={savingPermissions || !selectedPlan}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-400 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {savingPermissions ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Save mapping
            </button>
          </div>
        </div>

        {!selectedPlan ? (
          <div className="flex-1 flex items-center justify-center px-4 py-6">
            <p className="text-xs text-slate-400">
              Select a plan in the header above to manage its permissions.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-2 border-b border-sky-100 bg-[#EBFFFF] flex items-center justify-between rounded-t-lg">
              <div className="flex items-center gap-2 text-xs text-indigo-900">
                <span className="font-semibold text-slate-900">
                  {selectedPlan.name}
                </span>
                <span className="text-indigo-400">•</span>
                <span className="uppercase tracking-wide text-[10px] px-1.5 py-0.5 rounded bg-white/80 border border-indigo-100 text-indigo-700">
                  {selectedPlan.code}
                </span>
                <span className="text-indigo-400">•</span>
                <span className="text-indigo-800">Permissions</span>
              </div>

              {loadingPermissions && (
                <span className="inline-flex items-center gap-1 text-[11px] text-indigo-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading permissions
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {filteredGroups.map(({ name, features }) => {
                if (!features || features.length === 0) return null;

                const isOpen = expandedGroups.has(name);
                const ids = features
                  .map(f => f.id ?? f.Id)
                  .filter(id => id !== undefined && id !== null);
                const enabledCount = ids.filter(id =>
                  selectedPermissionIds.has(id)
                ).length;
                const totalCount = ids.length;

                return (
                  <div
                    key={name}
                    className="border border-slate-100 rounded-md overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleGroupExpanded(name)}
                      className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-50 hover:bg-slate-100"
                    >
                      <div className="flex items-center gap-2">
                        {isOpen ? (
                          <ChevronDown className="h-3 w-3 text-slate-500" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-slate-500" />
                        )}
                        <span className="text-xs font-semibold text-slate-700">
                          {name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {enabledCount}/{totalCount} enabled
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px]">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            toggleGroupPermissions(features, true);
                          }}
                          className="px-1.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        >
                          Enable all
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            toggleGroupPermissions(features, false);
                          }}
                          className="px-1.5 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        >
                          Disable all
                        </button>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-3 py-1.5">
                        {features.map(perm => {
                          const id = perm.id ?? perm.Id;
                          const checked = selectedPermissionIds.has(id);
                          return (
                            <PermissionToggleRow
                              key={id}
                              permission={perm}
                              checked={checked}
                              onChange={togglePermissionForPlan}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderQuotasTab = () => {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[200px]">
        <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
              Quotas & usage rules
            </p>
            <p className="text-xs text-slate-500">
              Configure how much this plan is allowed to consume (messages,
              campaigns, templates). These rules drive quota checks in the
              message engine.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {quotaLoading && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading
              </span>
            )}
            <button
              type="button"
              onClick={handleAddQuotaRow}
              disabled={!selectedPlan}
              className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" />
              Add quota
            </button>
            <button
              type="button"
              onClick={handleSaveQuotas}
              disabled={savingQuotas || !selectedPlan}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {savingQuotas ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Save quotas
            </button>
          </div>
        </div>

        <div className="px-4 py-2 border-b border-slate-50 flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-slate-400">Quick presets:</span>
          {Object.values(QUOTA_PRESETS).map(preset => (
            <button
              key={preset.quotaKey}
              type="button"
              disabled={!selectedPlan}
              onClick={() => applyQuotaPreset(preset.quotaKey)}
              className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {!selectedPlan ? (
          <div className="flex-1 flex items-center justify-center px-4 py-6">
            <p className="text-xs text-slate-400">
              Select a plan in the header above to view and edit its default
              quotas.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto px-4 py-3">
            {quotaRows.length === 0 && !quotaLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span>
                  No quotas defined yet for this plan. Add at least{" "}
                  <span className="font-semibold">MESSAGES_PER_MONTH</span> to
                  control message volume.
                </span>
              </div>
            ) : (
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] text-slate-500">
                    <th className="py-1.5 pr-3 text-left font-medium">
                      Quota key
                    </th>
                    <th className="py-1.5 px-3 text-left font-medium">
                      Friendly label
                    </th>
                    <th className="py-1.5 px-3 text-left font-medium">
                      Period
                    </th>
                    <th className="py-1.5 px-3 text-left font-medium">Limit</th>
                    <th className="py-1.5 px-3 text-left font-medium">
                      Denial message (optional)
                    </th>
                    <th className="py-1.5 pl-3 pr-0 text-left font-medium w-10">
                      {/* actions */}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {quotaRows.map((row, idx) => {
                    const key = row.quotaKey ?? "";
                    const friendly =
                      KNOWN_QUOTA_LABELS[key] ??
                      key
                        .toLowerCase()
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, c => c.toUpperCase());

                    return (
                      <tr
                        key={row.id ?? key ?? idx}
                        className="border-b border-slate-50 hover:bg-slate-50/60"
                      >
                        {/* Quota key dropdown */}
                        <td className="py-1.5 pr-3 align-top">
                          <select
                            className="w-full rounded-md border border-slate-200 px-2 py-1 text-[11px] uppercase tracking-wide focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            value={row.quotaKey}
                            onChange={e =>
                              handleQuotaFieldChange(
                                idx,
                                "quotaKey",
                                e.target.value
                              )
                            }
                          >
                            <option value="">Select quota…</option>

                            {[...QUOTA_DEFINITIONS]
                              .sort((a, b) => a.label.localeCompare(b.label))
                              .map(def => (
                                <option key={def.key} value={def.key}>
                                  {def.label} ({def.key})
                                </option>
                              ))}

                            {/* Safety: show unknown existing keys */}
                            {!QUOTA_DEFINITIONS.some(
                              d => d.key === row.quotaKey
                            ) &&
                              row.quotaKey && (
                                <option value={row.quotaKey}>
                                  {row.quotaKey}
                                </option>
                              )}
                          </select>
                        </td>

                        {/* Friendly label */}
                        <td className="py-1.5 px-3 align-top text-slate-600">
                          {key ? (
                            <span>{friendly}</span>
                          ) : (
                            <span className="text-slate-400">
                              Will be auto-derived from key
                            </span>
                          )}
                        </td>

                        {/* Period (Lifetime / Daily / Monthly) */}
                        <td className="py-1.5 px-3 align-top">
                          <select
                            className="w-full rounded-md border border-slate-200 px-2 py-1 text-[11px] uppercase tracking-wide focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            value={row.period}
                            onChange={e =>
                              handleQuotaFieldChange(
                                idx,
                                "period",
                                e.target.value
                              )
                            }
                          >
                            <option value={0}>Lifetime</option>
                            <option value={1}>Daily</option>
                            <option value={2}>Monthly</option>
                          </select>
                        </td>

                        {/* Limit */}
                        <td className="py-1.5 px-3 align-top">
                          <input
                            type="number"
                            className="w-28 rounded-md border border-slate-200 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            value={row.limit}
                            onChange={e =>
                              handleQuotaFieldChange(
                                idx,
                                "limit",
                                e.target.value
                              )
                            }
                          />
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            Use <span className="font-semibold">-1</span> for
                            unlimited
                          </p>
                        </td>

                        {/* Denial message */}
                        <td className="py-1.5 px-3 align-top">
                          <input
                            type="text"
                            className="w-full rounded-md border border-slate-200 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Message shown when quota is exceeded"
                            value={row.denialMessage ?? ""}
                            onChange={e =>
                              handleQuotaFieldChange(
                                idx,
                                "denialMessage",
                                e.target.value
                              )
                            }
                          />
                        </td>

                        {/* Remove row */}
                        <td className="py-1.5 pl-3 pr-0 align-top">
                          <button
                            type="button"
                            onClick={() => handleRemoveQuotaRow(idx)}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50"
                            title="Remove quota row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <p className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
              <Clock4 className="h-3 w-3" />
              Quotas are evaluated by the Entitlements engine and consumed by
              the Message Engine / Campaign Engine. Changing values here impacts
              how much each business on this plan can send.
            </p>
          </div>
        )}
      </div>
    );
  };

  // ---- Render ----
  return (
    <div className="flex flex-col gap-4 h-full px-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-indigo-600" />
            <h1 className="text-lg font-semibold text-slate-900">
              Plan Management
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Define subscription plans, map permissions, and configure quotas
            that drive billing and usage control.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* redirect to permissions list page */}
          <button
            type="button"
            onClick={() => navigate("/app/admin/permissions")}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <ShieldCheck className="h-4 w-4" />
            Manage permissions
          </button>
          <button
            type="button"
            onClick={openCreatePlan}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-400 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-cyan-600"
          >
            <Plus className="h-4 w-4" />
            Plan
          </button>
        </div>
      </div>

      {/* Plan selector bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-indigo-500" />
          <span className="text-xs text-slate-500">Plan</span>
          <select
            className="min-w-[180px] rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            value={selectedPlan?.id ?? ""}
            onChange={handlePlanSelectChange}
          >
            <option value="" disabled>
              {loadingPlans ? "Loading plans…" : "Select plan"}
            </option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
          {selectedPlan && <StatusPill isActive={selectedPlan.isActive} />}
        </div>

        <div className="flex items-center gap-2">
          {selectedPlan && (
            <>
              <button
                type="button"
                onClick={() => openEditPlan(selectedPlan)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDeletePlan(selectedPlan)}
                className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs header */}
      <div className="flex items-center gap-4 border-b border-slate-200 pl-1">
        <TabButton
          id="plan"
          label="Plan details"
          active={activeTab === "plan"}
          onClick={setActiveTab}
        />
        <TabButton
          id="features"
          label="Feature mapping"
          active={activeTab === "features"}
          onClick={setActiveTab}
        />
        <TabButton
          id="quotas"
          label="Quotas & usage"
          active={activeTab === "quotas"}
          onClick={setActiveTab}
        />
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 pt-3 flex flex-col gap-3 pl-4 pr-2">
        {activeTab === "plan" && renderPlanSummaryTab()}
        {activeTab === "features" && renderFeatureMappingTab()}
        {activeTab === "quotas" && renderQuotasTab()}
      </div>

      {/* Plan create/edit modal */}
      {planModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200">
            <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                  {isEditing ? "Edit plan" : "New plan"}
                </p>
                <p className="text-xs text-slate-500">
                  Define the basic properties of the subscription plan.
                </p>
              </div>
              <button
                type="button"
                onClick={closePlanModal}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleSavePlan}
              className="px-4 py-3 flex flex-col gap-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600">
                    Name
                  </label>
                  <input
                    type="text"
                    className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    value={planForm.name}
                    onChange={e => handlePlanFormChange("name", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600">
                    Code
                  </label>
                  <input
                    type="text"
                    className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs uppercase tracking-wide focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    value={planForm.code}
                    onChange={e =>
                      handlePlanFormChange("code", e.target.value.toUpperCase())
                    }
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600">
                  Description
                </label>
                <textarea
                  rows={2}
                  className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  value={planForm.description}
                  onChange={e =>
                    handlePlanFormChange("description", e.target.value)
                  }
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={planForm.isActive}
                  onChange={e =>
                    handlePlanFormChange("isActive", e.target.checked)
                  }
                />
                Active plan
              </label>

              <div className="mt-2 flex items-center justify-end gap-2 border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={closePlanModal}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {savingPlan ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Save plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// // 📄 src/pages/admin/FeatureAccess/PlanManagement.jsx
