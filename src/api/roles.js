// 📄 src/api/roles.js
import axiosClient from "./axiosClient"; // unified axios instance

// Basic CRUD for roles
export const getRoles = () => axiosClient.get("/roles");

export const createRole = payload => axiosClient.post("/roles", payload);

export const updateRole = (id, payload) =>
  axiosClient.put(`/roles/${encodeURIComponent(id)}`, payload);

export const deleteRole = id =>
  axiosClient.delete(`/roles/${encodeURIComponent(id)}`);

// returns: array of permission objects OR codes
export const getRolePermissions = roleId =>
  axiosClient.get(`/roles/${encodeURIComponent(roleId)}/permissions`);

// body: { permissionIds: [...] }
export const updateRolePermissions = (roleId, permissionIds) =>
  axiosClient.put(`/roles/${encodeURIComponent(roleId)}/permissions`, {
    permissionIds: Array.isArray(permissionIds) ? permissionIds : [],
  });

// import api from "./_base"; // your axios instance

// export const getRoles = () => api.get("/api/roles");
// export const createRole = payload => api.post("/api/roles", payload);
// export const updateRole = (id, payload) => api.put(`/api/roles/${id}`, payload);
// export const deleteRole = id => api.delete(`/api/roles/${id}`);

// // returns: array of permission objects OR codes
// export const getRolePermissions = roleId =>
//   api.get(`/roles/${roleId}/permissions`);

// // body: array of permissionIds (GUIDs)
// export const updateRolePermissions = (roleId, permissionIds) =>
//   api.put(`/roles/${roleId}/permissions`, { permissionIds });
