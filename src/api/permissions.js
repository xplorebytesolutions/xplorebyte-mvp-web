// 📄 src/api/permissions.js

import axiosClient from "./axiosClient";

// Flat list (unchanged behavior)
export const getAllPermissions = () => axiosClient.get("/permissions");

// Grouped list – tolerant to different backend routes,
// but still returns a plain array for the UI.
// 📄 src/api/permissions.js

// Grouped list – tolerant to different backend routes,
// but still returns a plain array for the UI.
export const getGroupedPermissions = async () => {
  const paths = [
    "/permission/grouped",
    "/Permission/grouped",
    // "/api/Permission/grouped", // ❌ no longer valid with baseURL ending /api
  ];

  let lastErr;

  for (const p of paths) {
    try {
      const res = await axiosClient.get(p);

      const data = res?.data;
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.groups)) return data.groups;
      if (Array.isArray(res)) return res;

      return [];
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404 || status === 405) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }

  throw lastErr ?? new Error("No grouped-permissions endpoint responded.");
};

// CRUD
export const createPermission = dto =>
  axiosClient.post("/Permission", {
    ...dto,
    code: String(dto.code || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_"),
  });

export const updatePermission = (id, dto) =>
  axiosClient.put(`/Permission/${id}`, dto);

export const togglePermissionActive = (id, isActive) =>
  axiosClient.patch(`/Permission/${id}/status`, { isActive });

export const deletePermission = id => axiosClient.delete(`/Permission/${id}`);

// import axiosClient from "../utils/axiosClient";

// // Flat list (unchanged behavior)
// export const getAllPermissions = () => axiosClient.get("/permissions");

// // Grouped list (more tolerant: supports data.data OR data)
// export const getGroupedPermissions = async () => {
//   const res = await axiosClient.get("/api/Permission/grouped");
//   return Array.isArray(res?.data?.data)
//     ? res.data.data
//     : Array.isArray(res?.data)
//     ? res.data
//     : [];
// };

// // CRUD
// export const createPermission = dto =>
//   axiosClient.post("/api/Permission", {
//     ...dto,
//     code: String(dto.code || "")
//       .trim()
//       .toUpperCase()
//       .replace(/\s+/g, "_"),
//   });

// export const updatePermission = (id, dto) =>
//   axiosClient.put(`/api/Permission/${id}`, dto);

// export const togglePermissionActive = (id, isActive) =>
//   axiosClient.patch(`/api/Permission/${id}/status`, { isActive });

// export const deletePermission = id =>
//   axiosClient.delete(`/api/Permission/${id}`);

// import axiosClient from "../utils/axiosClient";

// export const getAllPermissions = () => axiosClient.get("/permissions");
// export const getGroupedPermissions = async () => {
//   const response = await axiosClient.get("/api/Permission/grouped");
//   return response.data.data; // <- this ensures you're extracting the nested `data` key
// };
