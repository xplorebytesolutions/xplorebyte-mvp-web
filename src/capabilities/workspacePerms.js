// 📄 src/capabilities/workspacePerms.js

import { FK } from "./featureKeys";

/**
 * WORKSPACE_PERMS
 * - Used by sidebar + /app/{workspace} routes
 * - Each workspace should normally have ONE main key: *.WORKSPACE.VIEW
 */
export const WORKSPACE_PERMS = {
  messaging: [FK.MESSAGING_WORKSPACE_VIEW],
  superadmin: [FK.SUPER_ADMIN_WORKSPACE_VIEW],
  campaigns: [FK.CAMPAIGN_WORKSPACE_VIEW],
  automation: [FK.AUTOMATION_WORKSPACE_VIEW],
  templates: [FK.TEMPLATE_WORKSPACE_VIEW],
  catalog: [FK.CATALOG_WORKSPACE_VIEW],
  crm: [FK.CRM_WORKSPACE_VIEW],
  inbox: [FK.INBOX_WORKSPACE_VIEW],
  settings: [FK.SETTINGS_WORKSPACE_VIEW],
};
