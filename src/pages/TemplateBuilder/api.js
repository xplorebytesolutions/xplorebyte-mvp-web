import axiosClient from "../../api/axiosClient";

/**
 * @typedef {Object} LibraryListItem
 * @property {string} id
 * @property {string} industry
 * @property {string} key
 * @property {string} category
 * @property {boolean} isFeatured
 * @property {string} language
 * @property {"NONE"|"TEXT"|"IMAGE"|"VIDEO"|"DOCUMENT"} headerType
 * @property {number} placeholders
 * @property {string} bodyPreview
 * @property {string} buttonsSummary
 */

/**
 * @typedef {Object} LibraryBrowseResponse
 * @property {number} page
 * @property {number} pageSize
 * @property {number} total
 * @property {LibraryListItem[]} items
 */

/**
 * Browse/search library items (paged).
 * Backend: GET /api/template-builder/library/browse
 *
 * @param {{industry?: string, q?: string, sort?: "featured"|"name", page?: number, pageSize?: number}} params
 * @returns {Promise<LibraryBrowseResponse>}
 */
export async function browseLibrary(params = {}) {
  const { industry, q, sort = "featured", page = 1, pageSize = 20 } = params;
  const res = await axiosClient.get("/template-builder/library/browse", {
    params: { industry, q, sort, page, pageSize },
  });
  return res.data;
}

/**
 * Activate a library item → create a draft with selected languages.
 * Backend: POST /api/template-builder/library/{itemId}/activate
 *
 * @param {string} itemId
 * @param {{ languages: string[] }} body
 * @returns {Promise<{ success: boolean, message?: string, draftId: string }>}
 */
export async function activateLibraryItem(itemId, body) {
  const res = await axiosClient.post(
    `/template-builder/library/${itemId}/activate`,
    body
  );
  return res.data;
}

/**
 * Get available industries (for filter dropdowns).
 * Backend: GET /api/template-builder/library/industries
 *
 * @returns {Promise<{ success:boolean, industries: string[] }>}
 */
export async function listIndustries() {
  const res = await axiosClient.get("/template-builder/library/industries");
  return res.data;
}

/**
 * Get a single library item + its variants (for preview drawer).
 * Backend: GET /api/template-builder/library/item/{itemId}
 *
 * @param {string} itemId
 * @returns {Promise<{ success:boolean, item: any, variants: any[] }>}
 */
export async function getLibraryItem(itemId) {
  const res = await axiosClient.get(`/template-builder/library/item/${itemId}`);
  return res.data;
}

/**
 * ADMIN: Export library payload (optionally by industry) for backup/migrations.
 * Backend: GET /api/template-builder/library/export?industry=...
 *
 * @param {string=} industry
 * @returns {Promise<{ success:boolean, count:number, items:any[] }>}
 */
export async function exportLibrary(industry) {
  const res = await axiosClient.get("/template-builder/library/export", {
    params: { industry },
  });
  return res.data;
}

/**
 * ADMIN: Import library payload. Supports dryRun for safe previews.
 * Backend: POST /api/template-builder/library/import?dryRun={bool}
 *
 * @param {{ items: any[] }} payload
 * @param {boolean} [dryRun=false]
 * @returns {Promise<{ success:boolean, dryRun:boolean, TotalItems:number, CreatedItems:number, UpdatedItems:number, CreatedVariants:number, UpdatedVariants:number, errors?:string[] }>}
 */
export async function importLibrary(payload, dryRun = false) {
  const res = await axiosClient.post(
    `/template-builder/library/import`,
    payload,
    { params: { dryRun } }
  );
  return res.data;
}
