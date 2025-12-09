// src/api/templateBuilder/templates.js
import axiosClient from "../../api/axiosClient";

/**
 * DELETE /api/template-builder/templates/{name}?language=
 * @param {string} name
 * @param {string} language
 */
export async function deleteApprovedTemplate(name, language = "en_US") {
  const { data } = await axiosClient.delete(
    `/api/template-builder/templates/${encodeURIComponent(name)}`,
    {
      params: { language },
    }
  );
  return data;
}

/**
 * (Optional) placeholder for list endpoint if you add it later.
 * Example: GET /api/whatsapp-templates?businessId=...
 */
export async function listApprovedTemplates(params = {}) {
  // If you don't have a backend endpoint yet, this should be implemented server-side.
  const { data } = await axiosClient.get(`/api/whatsapp-templates`, { params });
  return data;
}
