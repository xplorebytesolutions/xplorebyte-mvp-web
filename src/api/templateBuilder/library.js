// src/api/templateBuilder/library.js
import axiosClient from "../../api/axiosClient";

/**
 * @typedef {Object} BrowseParams
 * @property {string} [industry]
 * @property {string} [q]
 * @property {string} [sort]
 * @property {number} [page]
 * @property {number} [pageSize]
 */

/**
 * GET /api/template-builder/library/industries
 * @returns {Promise<string[]>}
 */
export async function getIndustries() {
  const { data } = await axiosClient.get(
    "/api/template-builder/library/industries"
  );
  return data;
}

/**
 * GET /api/template-builder/library/browse
 * @param {BrowseParams} params
 * @returns {Promise<Object>} paginated result { items: [], total, page, pageSize }
 */
export async function browseLibrary(params = {}) {
  const { data } = await axiosClient.get(
    "/api/template-builder/library/browse",
    { params }
  );
  return data;
}

/**
 * GET /api/template-builder/library/item/{itemId}
 * @param {string} itemId
 * @returns {Promise<Object>} Library item
 */
export async function getLibraryItem(itemId) {
  const { data } = await axiosClient.get(
    `/api/template-builder/library/item/${itemId}`
  );
  return data;
}

/**
 * POST /api/template-builder/library/{itemId}/activate
 * body: { languages: ["en_US"] }
 * @param {string} itemId
 * @param {{languages:string[]}} payload
 * @returns {Promise<Object>} e.g., { draftId: "..." }
 */
export async function activateLibraryItem(itemId, payload) {
  const { data } = await axiosClient.post(
    `/api/template-builder/library/${itemId}/activate`,
    payload
  );
  return data;
}

/**
 * POST /api/template-builder/library/import?dryRun=true|false
 * body: LibraryImportRequest
 * @param {Object} body
 * @param {boolean} dryRun
 */
export async function importLibrary(body, dryRun = true) {
  const { data } = await axiosClient.post(
    `/api/template-builder/library/import`,
    body,
    { params: { dryRun } }
  );
  return data;
}

/**
 * GET /api/template-builder/library/export?industry=
 * @param {string} [industry]
 */
export async function exportLibrary(industry) {
  const { data } = await axiosClient.get(
    "/api/template-builder/library/export",
    { params: { industry } }
  );
  return data;
}
