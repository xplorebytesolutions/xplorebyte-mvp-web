// 📄 File: src/api/userPermissions.js

import axiosClient from "./axiosClient";

/**
 * Get active UserPermission overrides for a specific user.
 *
 * Backend: GET /api/admin/users/{userId}/permissions
 *
 * Returns an array of:
 * {
 *   permissionId: string;
 *   code: string;
 *   name: string;
 *   isGranted: boolean;
 *   isRevoked: boolean;
 *   assignedAt: string;
 *   assignedBy: string | null;
 * }
 */
export async function getUserPermissionOverrides(userId) {
  if (!userId) {
    throw new Error("getUserPermissionOverrides: userId is required");
  }

  const res = await axiosClient.get(
    `/admin/users/${encodeURIComponent(userId)}/permissions`
  );
  return res.data;
}

/**
 * Upsert a UserPermission override for a specific user + permission.
 *
 * Backend: POST /api/admin/users/{userId}/permissions
 *
 * Payload:
 * {
 *   permissionId: string;
 *   isGranted: boolean; // true = explicit allow, false = explicit deny
 * }
 *
 * Returns the updated override DTO (same shape as GET).
 */
export async function upsertUserPermissionOverride(userId, payload) {
  if (!userId) {
    throw new Error("upsertUserPermissionOverride: userId is required");
  }
  if (!payload?.permissionId) {
    throw new Error(
      "upsertUserPermissionOverride: payload.permissionId is required"
    );
  }

  const res = await axiosClient.post(
    `/admin/users/${encodeURIComponent(userId)}/permissions`,
    {
      permissionId: payload.permissionId,
      isGranted: payload.isGranted,
    }
  );
  return res.data;
}

/**
 * Clear (soft delete) a UserPermission override so the user
 * falls back to their plan-level permission.
 *
 * Backend: DELETE /api/admin/users/{userId}/permissions/{permissionId}
 */
export async function deleteUserPermissionOverride(userId, permissionId) {
  if (!userId) {
    throw new Error("deleteUserPermissionOverride: userId is required");
  }
  if (!permissionId) {
    throw new Error("deleteUserPermissionOverride: permissionId is required");
  }

  const res = await axiosClient.delete(
    `/admin/users/${encodeURIComponent(
      userId
    )}/permissions/${encodeURIComponent(permissionId)}`
  );
  return res.data; // could be empty / status only; adjust if needed
}

// Optional namespace export
const userPermissionsApi = {
  getUserPermissionOverrides,
  upsertUserPermissionOverride,
  deleteUserPermissionOverride,
};

export default userPermissionsApi;

// // 📄 File: src/api/userPermissions.js

// import axiosClient from "./axiosClient";

// /**
//  * Get active UserPermission overrides for a specific user.
//  *
//  * Backend: GET /api/admin/users/{userId}/permissions
//  *
//  * Returns an array of:
//  * {
//  *   permissionId: string;
//  *   code: string;
//  *   name: string;
//  *   isGranted: boolean;
//  *   isRevoked: boolean;
//  *   assignedAt: string;
//  *   assignedBy: string | null;
//  * }
//  */
// export async function getUserPermissionOverrides(userId) {
//   if (!userId) {
//     throw new Error("getUserPermissionOverrides: userId is required");
//   }

//   const res = await axiosClient.get(
//     `/admin/users/${encodeURIComponent(userId)}/permissions`
//   );
//   return res.data;
// }

// /**
//  * Upsert a UserPermission override for a specific user + permission.
//  *
//  * Backend: POST /api/admin/users/{userId}/permissions
//  *
//  * Payload:
//  * {
//  *   permissionId: string;
//  *   isGranted: boolean; // true = explicit allow, false = explicit deny
//  * }
//  *
//  * Returns the updated override DTO (same shape as GET).
//  */
// export async function upsertUserPermissionOverride(userId, payload) {
//   if (!userId) {
//     throw new Error("upsertUserPermissionOverride: userId is required");
//   }
//   if (!payload?.permissionId) {
//     throw new Error(
//       "upsertUserPermissionOverride: payload.permissionId is required"
//     );
//   }

//   const res = await axiosClient.post(
//     `/admin/users/${encodeURIComponent(userId)}/permissions`,
//     {
//       permissionId: payload.permissionId,
//       isGranted: payload.isGranted,
//     }
//   );
//   return res.data;
// }

// /**
//  * Clear (soft delete) a UserPermission override so the user
//  * falls back to their plan-level permission.
//  *
//  * Backend: DELETE /api/admin/users/{userId}/permissions/{permissionId}
//  */
// export async function deleteUserPermissionOverride(userId, permissionId) {
//   if (!userId) {
//     throw new Error("deleteUserPermissionOverride: userId is required");
//   }
//   if (!permissionId) {
//     throw new Error("deleteUserPermissionOverride: permissionId is required");
//   }

//   const res = await axiosClient.delete(
//     `/api/admin/users/${encodeURIComponent(
//       userId
//     )}/permissions/${encodeURIComponent(permissionId)}`
//   );
//   return res.data; // could be empty / status only; adjust if needed
// }

// // Optional namespace export
// const userPermissionsApi = {
//   getUserPermissionOverrides,
//   upsertUserPermissionOverride,
//   deleteUserPermissionOverride,
// };

// export default userPermissionsApi;
