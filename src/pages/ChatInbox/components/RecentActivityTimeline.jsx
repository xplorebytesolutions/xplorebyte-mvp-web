// 📄 src/pages/ChatInbox/components/RecentActivityTimeline.jsx

import React from "react";
import { Clock } from "lucide-react";
import { useLeadTimelinePreview } from "../hooks/useLeadTimelinePreview";
import { formatAgo } from "../../CRM/Timeline/timelineUtils";

/**
 * Compact recent-activity view for the Inbox right panel.
 * It is intentionally minimal: last few events only, with relative time.
 */
export function RecentActivityTimeline({ contactId }) {
  const hasContact = Boolean(contactId);

  const { entries, loading, reload } = useLeadTimelinePreview(contactId, {
    limit: 5,
    enabled: hasContact,
  });

  if (!hasContact) {
    return (
      <p className="text-[11px] text-gray-400 italic">
        No CRM contact linked yet. Once this person is saved as a contact, their
        recent activity will appear here.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-800">
          <Clock size={12} />
          <span>Recent activity</span>
        </div>
        <button
          type="button"
          onClick={reload}
          className="text-[10px] text-emerald-700 hover:text-emerald-800"
        >
          ↻ Refresh
        </button>
      </div>

      {loading && entries.length === 0 ? (
        <p className="text-[11px] text-gray-400">Loading recent activity…</p>
      ) : !loading && entries.length === 0 ? (
        <p className="text-[11px] text-gray-400 italic">
          No recent activity logged for this contact.
        </p>
      ) : (
        <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
          {entries.map(entry => (
            <li
              key={entry.id}
              className="border border-gray-100 rounded-md px-2 py-1.5 bg-gray-50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-gray-800">
                  {entry.eventType || "Activity"}
                </span>
                <span className="text-[10px] text-gray-400">
                  {entry.createdAt ? formatAgo(entry.createdAt) : "-"}
                </span>
              </div>
              <div className="text-[11px] text-gray-700 mt-0.5 line-clamp-2">
                {entry.description || "(No description provided)"}
              </div>
              {entry.source && (
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Source: {entry.source}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
