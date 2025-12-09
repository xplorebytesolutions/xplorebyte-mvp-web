// src/api/templateBuilder/uploads.js
import axiosClient from "../../api/axiosClient";

/**
 * Upload header media (multipart/form-data)
 * POST /api/template-builder/uploads/header?mediaType=IMAGE|VIDEO|DOCUMENT
 * Form: file (IFormFile) OR sourceUrl
 * @param {File} file
 * @param {'IMAGE'|'VIDEO'|'DOCUMENT'} mediaType
 * @returns {Promise<{handle:string}>}
 */
export async function uploadHeaderMedia(file, mediaType = "IMAGE") {
  const form = new FormData();
  form.append("file", file);
  const { data } = await axiosClient.post(
    `/api/template-builder/uploads/header`,
    form,
    {
      params: { mediaType },
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return data;
}
