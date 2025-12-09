// 📄 src/capabilities/QuotaBadge.jsx
import { useAuth } from "../app/providers/AuthProvider"; // <- relative path, no alias

export default function QuotaBadge({ quotaKey }) {
  const { getQuota } = useAuth(); // <- use the real API
  const q = getQuota?.(quotaKey);
  if (!q) return null;

  const used = q.used ?? 0;
  const max = q.limit ?? q.max ?? 0; // tolerate either naming
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;

  return (
    <div className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-lg border">
      <span className="font-semibold">{quotaKey}</span>
      <span className="opacity-75">
        {used}/{max} ({pct}%)
      </span>
    </div>
  );
}
