// 📄 src/hooks/usePermission.js
import { useMemo } from "react";
import { useAuth } from "../app/providers/AuthProvider";

/**
 * usePermission(required, options?)
 *
 * required: string | string[]
 * options:
 *  - requireAll?: boolean  // default false (any one permission passes)
 *
 * returns: { allowed: boolean, loading: boolean }
 */
export function usePermission(required, options = {}) {
  const { requireAll = false } = options;
  const { hasFeature, entLoading, isLoading } = useAuth() || {};
  const loading = Boolean(isLoading) || Boolean(entLoading);

  const allowed = useMemo(() => {
    if (!required || !hasFeature || loading) return false;
    const list = Array.isArray(required) ? required : [required];
    return requireAll
      ? list.every(code => hasFeature(code))
      : list.some(code => hasFeature(code));
  }, [required, hasFeature, requireAll, loading]);

  return { allowed, loading };
}
