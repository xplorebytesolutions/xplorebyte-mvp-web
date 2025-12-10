// 📄 src/api/templateBuilder/templates.js
import axiosClient from "../../api/axiosClient";

/**
 * DELETE /api/template-builder/templates/{name}?language=
 */
export async function deleteApprovedTemplate(name, language = "en_US") {
  const { data } = await axiosClient.delete(
    `/template-builder/templates/${encodeURIComponent(name)}`,
    { params: { language } }
  );
  return data;
}

/**
 * Example: GET /api/whatsapp-templates?businessId=...
 * (Frontend path should not repeat /api because baseURL already ends with /api)
 */
export async function listApprovedTemplates(params = {}) {
  const { data } = await axiosClient.get("/whatsapp-templates", { params });
  return data;
}

// // src/api/templateBuilder/templates.js
// import axiosClient from "../../api/axiosClient";

// /**
//  * DELETE /api/template-builder/templates/{name}?language=
//  * @param {string} name
//  * @param {string} language
//  */
// export async function deleteApprovedTemplate(name, language = "en_US") {
//   const { data } = await axiosClient.delete(
//     `/api/template-builder/templates/${encodeURIComponent(name)}`,
//     {
//       params: { language },
//     }
//   );
//   return data;
// }

// /**
//  * (Optional) placeholder for list endpoint if you add it later.
//  * Example: GET /api/whatsapp-templates?businessId=...
//  */
// export async function listApprovedTemplates(params = {}) {
//   // If you don't have a backend endpoint yet, this should be implemented server-side.
//   const { data } = await axiosClient.get(`/api/whatsapp-templates`, { params });
//   return data;
// }
