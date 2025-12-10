// 📄 src/api/templateBuilder/drafts.js
import axiosClient from "../../api/axiosClient";

/**
 * @typedef {Object} VariantPayload
 * @property {string} name
 * @property {string} language
 * @property {string} category
 * @property {string} headerType
 * @property {string} headerText
 * @property {string} headerMediaHandle
 * @property {string} bodyText
 * @property {string} footerText
 * @property {Array<Object>} buttons
 * @property {Array<string>} examples
 */

/**
 * GET preview for a draft variant
 * GET /api/template-builder/drafts/{draftId}/preview?language=
 */
export async function getPreview(draftId, language = "en_US") {
  const { data } = await axiosClient.get(
    `/template-builder/drafts/${encodeURIComponent(draftId)}/preview`,
    { params: { language } }
  );
  return data;
}

/**
 * PUT save/replace variant
 * PUT /api/template-builder/drafts/{draftId}/variant/{language}
 */
export async function saveVariant(draftId, language, payload) {
  const { data } = await axiosClient.put(
    `/template-builder/drafts/${encodeURIComponent(
      draftId
    )}/variant/${encodeURIComponent(language)}`,
    payload
  );
  return data;
}

/**
 * POST submit draft to Meta
 * POST /api/template-builder/drafts/{draftId}/submit
 */
export async function submitDraft(draftId) {
  const { data } = await axiosClient.post(
    `/template-builder/drafts/${encodeURIComponent(draftId)}/submit`
  );
  return data;
}

/**
 * GET draft status (maps to WhatsAppTemplates)
 * GET /api/template-builder/drafts/{draftId}/status
 */
export async function getStatus(draftId) {
  const { data } = await axiosClient.get(
    `/template-builder/drafts/${encodeURIComponent(draftId)}/status`
  );
  return data;
}

/**
 * GET name-check
 * GET /api/template-builder/drafts/{draftId}/name-check?language=
 */
export async function nameCheck(draftId, language = "en_US") {
  const { data } = await axiosClient.get(
    `/template-builder/drafts/${encodeURIComponent(draftId)}/name-check`,
    { params: { language } }
  );
  return data;
}

/**
 * POST duplicate draft
 * POST /api/template-builder/drafts/{draftId}/duplicate
 */
export async function duplicateDraft(draftId) {
  const { data } = await axiosClient.post(
    `/template-builder/drafts/${encodeURIComponent(draftId)}/duplicate`
  );
  return data;
}

/**
 * DELETE draft
 * DELETE /api/template-builder/drafts/{draftId}
 */
export async function deleteDraft(draftId) {
  const { data } = await axiosClient.delete(
    `/template-builder/drafts/${encodeURIComponent(draftId)}`
  );
  return data;
}

// // src/api/templateBuilder/drafts.js
// import axiosClient from "../../api/axiosClient";

// /**
//  * @typedef {Object} VariantPayload
//  * @property {string} name
//  * @property {string} language
//  * @property {string} category
//  * @property {string} headerType
//  * @property {string} headerText
//  * @property {string} headerMediaHandle
//  * @property {string} bodyText
//  * @property {string} footerText
//  * @property {Array<Object>} buttons
//  * @property {Array<string>} examples
//  */

// /**
//  * GET preview for a draft variant
//  * GET /api/template-builder/drafts/{draftId}/preview?language=
//  * @param {string} draftId
//  * @param {string} language
//  * @returns {Promise<Object>} { human, components, category }
//  */
// export async function getPreview(draftId, language = "en_US") {
//   const { data } = await axiosClient.get(
//     `/api/template-builder/drafts/${draftId}/preview`,
//     { params: { language } }
//   );
//   return data;
// }

// /**
//  * PUT save/replace variant
//  * PUT /api/template-builder/drafts/{draftId}/variant/{language}
//  * @param {string} draftId
//  * @param {string} language
//  * @param {VariantPayload} payload
//  * @returns {Promise<void>}
//  */
// export async function saveVariant(draftId, language, payload) {
//   const { data } = await axiosClient.put(
//     `/api/template-builder/drafts/${draftId}/variant/${language}`,
//     payload
//   );
//   return data;
// }

// /**
//  * POST submit draft to Meta
//  * POST /api/template-builder/drafts/{draftId}/submit
//  * @param {string} draftId
//  */
// export async function submitDraft(draftId) {
//   const { data } = await axiosClient.post(
//     `/api/template-builder/drafts/${draftId}/submit`
//   );
//   return data;
// }

// /**
//  * GET draft status (maps to WhatsAppTemplates)
//  * GET /api/template-builder/drafts/{draftId}/status
//  * @param {string} draftId
//  * @returns {Promise<Object>} status object
//  */
// export async function getStatus(draftId) {
//   const { data } = await axiosClient.get(
//     `/api/template-builder/drafts/${draftId}/status`
//   );
//   return data;
// }

// /**
//  * GET name-check
//  * GET /api/template-builder/drafts/{draftId}/name-check?language=
//  * @param {string} draftId
//  * @param {string} language
//  * @returns {Promise<{available:boolean,message?:string}>}
//  */
// export async function nameCheck(draftId, language = "en_US") {
//   const { data } = await axiosClient.get(
//     `/api/template-builder/drafts/${draftId}/name-check`,
//     { params: { language } }
//   );
//   return data;
// }

// /**
//  * POST duplicate draft
//  * POST /api/template-builder/drafts/{draftId}/duplicate
//  * @param {string} draftId
//  * @returns {Promise<Object>} new draft info
//  */
// export async function duplicateDraft(draftId) {
//   const { data } = await axiosClient.post(
//     `/api/template-builder/drafts/${draftId}/duplicate`
//   );
//   return data;
// }

// /**
//  * DELETE draft
//  * DELETE /api/template-builder/drafts/{draftId}
//  * @param {string} draftId
//  * @returns {Promise<void>}
//  */
// export async function deleteDraft(draftId) {
//   const { data } = await axiosClient.delete(
//     `/api/template-builder/drafts/${draftId}`
//   );
//   return data;
// }
