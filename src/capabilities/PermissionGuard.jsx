// 📄 src/capabilities/PermissionGuard.jsx
import React from "react";
import { useAuth } from "../app/providers/AuthProvider";

export default function PermissionGuard({ code, fallback = null, children }) {
  const { hasPermission, entitlementsLoading } = useAuth();
  if (entitlementsLoading) return null;
  return hasPermission(code) ? children : fallback;
}
