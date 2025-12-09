// 📄 File: src/pages/ChatInbox.jsx

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  Phone,
  Filter,
  Search,
  Clock,
  CheckCircle2,
  MessageCircle,
  Mail,
  User,
  ChevronDown,
  ChevronRight,
  Check,
  CheckCheck,
  AlertCircle,
  Tag,
  Bell,
  Activity,
  StickyNote,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";

// ✅ Reuse the existing SignalR hook from Inbox v1
//    Change the path if your hook file is elsewhere.
// import { useSignalR } from "../../realtime/useSignalR";
import useSignalR from "../../hooks/useSignalR";
// 🔢 Mock WhatsApp numbers (real API wiring can come later)
const MOCK_NUMBERS = [
  { id: "all", label: "All numbers" },
  { id: "wa-1", label: "+91 98765 43210" },
  { id: "wa-2", label: "+91 99887 77665" },
];

// 🧠 Tabs for the inbox
const TABS = [
  { id: "live", label: "Live (24h)" },
  { id: "history", label: "Older" },
  { id: "unassigned", label: "Unassigned" },
  { id: "my", label: "My Chats" },
];

// Local helper: format dates nicely
function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

// Local helper: first letter avatar
function getInitial(name, phone) {
  const src = name || phone || "?";
  return src.trim()[0]?.toUpperCase() ?? "?";
}

// 🗓 Day label for separators (Today / Yesterday / 12 Dec 2025)
function formatDayLabel(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const todayKey = today.toDateString();

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = yesterday.toDateString();

  const key = date.toDateString();

  if (key === todayKey) return "Today";
  if (key === yesterdayKey) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ✅ Map message status → icon
function StatusIcon({ status }) {
  if (!status) return null;
  const s = String(status).toLowerCase();

  if (s === "failed" || s === "error") {
    return (
      <span className="inline-flex items-center text-[10px] text-rose-200">
        <AlertCircle className="w-3 h-3 mr-0.5" />
      </span>
    );
  }

  if (s === "read" || s === "seen" || s === "viewed") {
    return (
      <span className="inline-flex items-center text-[10px] text-emerald-200">
        <CheckCheck className="w-3 h-3 mr-0.5" />
      </span>
    );
  }

  if (s === "delivered") {
    return (
      <span className="inline-flex items-center text-[10px] text-slate-200">
        <CheckCheck className="w-3 h-3 mr-0.5" />
      </span>
    );
  }

  if (s === "sent" || s === "sending" || s === "queued") {
    return (
      <span className="inline-flex items-center text-[10px] text-slate-200">
        <Check className="w-3 h-3 mr-0.5" />
      </span>
    );
  }

  return null;
}

// 🔁 Map hub payload → ChatInbox message shape
function mapHubMessageToChat(msg) {
  if (!msg) return null;

  const id =
    msg.id ??
    msg.messageId ??
    msg.clientMessageId ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const text =
    msg.text ?? msg.message ?? msg.body ?? msg.content ?? msg.messageText ?? "";

  const directionRaw = msg.direction ?? msg.Direction ?? msg.dir ?? "";
  const status = msg.status ?? msg.deliveryStatus ?? "";

  const dir = String(directionRaw).toLowerCase();
  let isInbound = typeof msg.isInbound === "boolean" ? msg.isInbound : false;

  if (typeof msg.isInbound !== "boolean") {
    isInbound =
      dir === "inbound" ||
      dir === "in" ||
      dir === "incoming" ||
      dir === "received" ||
      dir === "customer" ||
      dir === "from";
  }

  const createdAt =
    msg.createdAt ??
    msg.sentAt ??
    msg.sentAtUtc ??
    msg.timestamp ??
    new Date().toISOString();

  return {
    id,
    direction: directionRaw || (isInbound ? "in" : "out"),
    isInbound,
    text,
    sentAt: createdAt,
    status,
    errorMessage: msg.errorMessage ?? null,
  };
}

// 🔹 Quick Tag modal for Inbox – adds ONE new tag to the current contact
function InboxAddTagModal({
  isOpen,
  onClose,
  contactId,
  currentTags,
  onTagAdded,
}) {
  const [availableTags, setAvailableTags] = React.useState([]);
  const [selectedTagId, setSelectedTagId] = React.useState("");
  const [loadingTags, setLoadingTags] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Load all tags when modal opens
  React.useEffect(() => {
    if (!isOpen) return;

    const fetchTags = async () => {
      try {
        setLoadingTags(true);

        // ✅ use correct backend route: /tags/get-tags
        const response = await axiosClient.get("/tags/get-tags");
        const allTags = response.data?.data || response.data || [];

        // Remove tags that this contact already has
        const existingIds = new Set(
          (currentTags || []).map(t => t.id || t.tagId)
        );
        const filtered = allTags.filter(t => !existingIds.has(t.id));

        setAvailableTags(filtered);
        setSelectedTagId(filtered.length > 0 ? filtered[0].id : "");
      } catch (error) {
        console.error("Failed to load tags for Inbox:", error);
        toast.error("Failed to load tags");
        setAvailableTags([]);
      } finally {
        setLoadingTags(false);
      }
    };

    fetchTags();
  }, [isOpen, currentTags]);

  const handleSubmit = async e => {
    e.preventDefault();

    if (!selectedTagId) {
      toast.warn("Select a tag to add.");
      return;
    }
    if (!contactId) {
      toast.error("No contact selected.");
      return;
    }

    try {
      setSaving(true);

      // Reuse existing bulk assign endpoint from CRM
      await axiosClient.post("/contacts/bulk-assign-tag", {
        contactIds: [contactId],
        tagId: selectedTagId,
      });

      toast.success("Tag added to this contact");
      onTagAdded && onTagAdded();
      onClose();
    } catch (error) {
      console.error("Failed to assign tag from Inbox:", error);
      const message = error.response?.data?.message || "Failed to assign tag";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Add tag to this contact
        </h2>

        {loadingTags ? (
          <p className="text-xs text-slate-500">Loading tags…</p>
        ) : availableTags.length === 0 ? (
          // ✅ Show a Close button so the user is not trapped
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              No new tags available. Create tags in the CRM workspace first, or
              this contact already has all tags.
            </p>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Select tag
              </label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                value={selectedTagId}
                onChange={e => setSelectedTagId(e.target.value)}
                disabled={saving}
              >
                {availableTags.map(tag => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name || tag.tagName || "Tag"}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || availableTags.length === 0}
                className="rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
              >
                {saving ? "Adding…" : "Add tag"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ChatInbox() {
  const navigate = useNavigate();

  // 🔌 SignalR connection
  const { connection, isConnected } = useSignalR();

  // 🔹 Filters & selection
  const [activeTab, setActiveTab] = useState("live");
  const [selectedNumberId, setSelectedNumberId] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // 🔹 Data from backend
  const [allConversations, setAllConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 🔹 Selected conversation & message input
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [newMessage, setNewMessage] = useState("");

  // 🔹 Messages for selected conversation
  const [messages, setMessages] = useState([]);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);

  // 🔹 Sending & assignment state
  const [isSending, setIsSending] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // 🔹 CRM summary for right panel
  const [contactSummary, setContactSummary] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  // 🔹 Quick CRM actions (notes + reminders)
  const [noteDraft, setNoteDraft] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDueAt, setReminderDueAt] = useState("");
  const [reminderDescription, setReminderDescription] = useState("");
  const [isSavingReminder, setIsSavingReminder] = useState(false);

  // 🔹 Tag modal state
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);

  // Right panel toggles
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showDetails, setShowDetails] = useState(true);
  const [showCrmPanel, setShowCrmPanel] = useState(true);

  // 🔽 Auto-scroll anchor for chat messages
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, []);

  const currentUserId = useMemo(() => localStorage.getItem("userId"), []);

  // 🧮 Selected conversation
  const selectedConversation = useMemo(
    () => allConversations.find(c => c.id === selectedConversationId) || null,
    [allConversations, selectedConversationId]
  );

  // Stable contactId for effects
  const selectedContactId = useMemo(
    () => selectedConversation?.contactId || null,
    [selectedConversation]
  );

  // 🧮 24h window flag
  const isWithin24h = selectedConversation?.within24h ?? false;

  // 🧮 Assignment flags for header
  const headerIsAssigned = !!selectedConversation?.assignedToUserId;
  const headerIsAssignedToMe =
    !!selectedConversation?.isAssignedToMe ||
    (!!selectedConversation?.assignedToUserId &&
      currentUserId &&
      selectedConversation.assignedToUserId === currentUserId);
  const headerAssignedName = headerIsAssignedToMe
    ? "You"
    : selectedConversation?.assignedToUserName || "Agent";

  // 🧮 Filter + sort conversations
  const filteredConversations = useMemo(() => {
    let list = [...allConversations];

    if (selectedNumberId !== "all") {
      list = list.filter(c => c.numberId === selectedNumberId);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        c =>
          c.contactName?.toLowerCase().includes(q) ||
          c.contactPhone?.toLowerCase().includes(q) ||
          c.lastMessagePreview?.toLowerCase().includes(q)
      );
    }

    if (activeTab === "live") {
      list = list.filter(c => c.within24h);
    } else if (activeTab === "unassigned") {
      list = list.filter(c => !c.assignedToUserId);
    } else if (activeTab === "my") {
      if (currentUserId) {
        list = list.filter(c => c.assignedToUserId === currentUserId);
      }
    }

    // 🔽 Sort: unread first, then most recent lastMessageAt
    list.sort((a, b) => {
      const aUnread = a.unreadCount > 0;
      const bUnread = b.unreadCount > 0;

      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;

      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;

      return bTime - aTime; // newest first
    });

    return list;
  }, [
    allConversations,
    activeTab,
    selectedNumberId,
    searchTerm,
    currentUserId,
  ]);

  // 🛰 Load conversations (supports "silent" refresh)
  const fetchConversations = useCallback(
    async (options = {}) => {
      const { limit, silent } = options;

      try {
        if (!silent) {
          setIsLoading(true);
        }

        const businessId = localStorage.getItem("businessId");

        if (!businessId) {
          toast.error(
            "❌ Missing business context. Please login again to load inbox."
          );
          if (!silent) {
            setIsLoading(false);
          }
          return;
        }

        const params = {
          businessId,
          currentUserId,
          tab: activeTab,
          numberId:
            selectedNumberId && selectedNumberId !== "all"
              ? selectedNumberId
              : undefined,
          search: searchTerm || undefined,
          limit: limit ?? 100,
        };

        const res = await axiosClient.get("/chat-inbox/conversations", {
          params,
        });

        const apiItems = Array.isArray(res.data) ? res.data : [];

        const mapped = apiItems.map(item => ({
          id: item.id,
          contactId: item.contactId,
          contactName: item.contactName,
          contactPhone: item.contactPhone,
          lastMessagePreview: item.lastMessagePreview,
          lastMessageAt: item.lastMessageAt,
          unreadCount: item.unreadCount || 0,
          status: item.status || "Open",
          numberId: item.numberId,
          numberLabel: item.numberLabel,
          within24h: !!item.within24h,
          assignedToUserId: item.assignedToUserId || null,
          assignedToUserName: item.assignedToUserName || null,
          isAssignedToMe: !!item.isAssignedToMe,
          sourceType: item.sourceType || "WhatsApp",
          sourceName: item.sourceName || "WhatsApp",
          mode: item.mode || "Live",
          firstSeenAt: item.firstSeenAt,
          lastInboundAt: item.lastInboundAt,
          lastOutboundAt: item.lastOutboundAt,
        }));

        setAllConversations(mapped);

        if (!selectedConversationId && mapped.length > 0) {
          setSelectedConversationId(mapped[0].id);
        }
      } catch (error) {
        console.error("❌ Failed to load inbox conversations:", error);
        const message =
          error.response?.data?.message ||
          "Failed to load inbox conversations.";
        toast.error(message);
      } finally {
        if (!options.silent) {
          setIsLoading(false);
        }
      }
    },
    [
      activeTab,
      selectedNumberId,
      searchTerm,
      selectedConversationId,
      currentUserId,
    ]
  );

  // Initial + filter-based load
  useEffect(() => {
    fetchConversations();
  }, [activeTab, selectedNumberId, searchTerm, fetchConversations]);

  // 🔁 Auto-refresh conversations every 25 seconds (silent, no flicker)
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchConversations({ silent: true, limit: 100 });
    }, 25000);

    return () => clearInterval(intervalId);
  }, [fetchConversations]);

  // 🛰 Load messages for selected conversation
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedConversationId) {
        setMessages([]);
        return;
      }

      const conv = allConversations.find(c => c.id === selectedConversationId);
      if (!conv) {
        setMessages([]);
        return;
      }

      const businessId = localStorage.getItem("businessId");
      if (!businessId) {
        toast.error(
          "❌ Missing business context. Please login again to load messages."
        );
        return;
      }

      try {
        setIsMessagesLoading(true);

        const res = await axiosClient.get("/chat-inbox/messages", {
          params: {
            businessId,
            contactPhone: conv.contactPhone,
            limit: 100,
          },
        });

        const apiItems = Array.isArray(res.data) ? res.data : [];

        const mapped = apiItems
          .map(m => {
            const directionRaw =
              m.direction ?? m.Direction ?? m.dir ?? m.messageDirection ?? "";
            const statusRaw = m.status ?? "";

            const dir = String(directionRaw).toLowerCase();
            const status = String(statusRaw).toLowerCase();

            let inferredIsInbound =
              typeof m.isInbound === "boolean" ? m.isInbound : false;

            if (typeof m.isInbound !== "boolean") {
              inferredIsInbound =
                dir === "inbound" ||
                dir === "in" ||
                dir === "incoming" ||
                dir === "received" ||
                dir === "customer" ||
                dir === "from" ||
                status === "received" ||
                status === "incoming";
            }

            return {
              id: m.id,
              direction: directionRaw || (inferredIsInbound ? "in" : "out"),
              isInbound: inferredIsInbound,
              text: m.text || "",
              sentAt: m.sentAtUtc || m.sentAt,
              status: m.status,
              errorMessage: m.errorMessage,
            };
          })
          .reverse();

        setMessages(mapped);
      } catch (error) {
        console.error("❌ Failed to load messages:", error);
        const message =
          error.response?.data?.message || "Failed to load messages.";
        toast.error(message);
        setMessages([]);
      } finally {
        setIsMessagesLoading(false);
      }
    };

    loadMessages();
  }, [selectedConversationId, allConversations]);

  // 🔔 Mark as read when opening a conversation (HTTP + SignalR)
  useEffect(() => {
    if (!selectedConversationId) return;

    const conv = allConversations.find(c => c.id === selectedConversationId);
    if (!conv || !conv.contactId) return;

    const businessId = localStorage.getItem("businessId");
    const userId = localStorage.getItem("userId");

    if (!businessId || !userId) return;

    const payload = {
      businessId,
      contactId: conv.contactId,
      userId,
    };

    // Fire-and-forget; we don't block UI on this.
    axiosClient.post("/chat-inbox/mark-read", payload).catch(err => {
      console.error("Failed to mark conversation as read:", err);
    });

    // Notify other agents via SignalR, non-blocking
    if (connection && isConnected) {
      connection.invoke("MarkAsRead", conv.contactId).catch(err => {
        console.warn("SignalR MarkAsRead failed (non-fatal):", err);
      });
    }

    // Optimistically zero-out unread count in UI
    setAllConversations(prev =>
      prev.map(c => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
    );
  }, [selectedConversationId, allConversations, connection, isConnected]);

  // 🔁 Helper to (re)load CRM contact summary
  const refreshContactSummary = useCallback(async () => {
    if (!selectedContactId) {
      setContactSummary(null);
      return;
    }

    try {
      setIsSummaryLoading(true);
      const res = await axiosClient.get(
        `/crm/contact-summary/${selectedContactId}`
      );
      const payload = res.data?.data ?? res.data;
      setContactSummary(payload || null);
    } catch (error) {
      console.error("❌ Failed to load contact summary:", error);
      setContactSummary(null);
      // kept quiet to avoid toast noise while switching chats
    } finally {
      setIsSummaryLoading(false);
    }
  }, [selectedContactId]);

  // 🛰 Load CRM contact summary for right panel
  useEffect(() => {
    if (!selectedContactId) {
      setContactSummary(null);
      return;
    }
    refreshContactSummary();
  }, [selectedContactId, refreshContactSummary]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (!selectedConversationId) return;
    if (isMessagesLoading) return;
    if (messages.length === 0) return;

    scrollToBottom();
  }, [messages, isMessagesLoading, selectedConversationId, scrollToBottom]);

  // 🧮 Messages + date separators
  const messagesWithSeparators = useMemo(() => {
    const result = [];
    let lastDateKey = null;

    messages.forEach(m => {
      const dateObj = m.sentAt ? new Date(m.sentAt) : null;
      const key = dateObj ? dateObj.toDateString() : "unknown";

      if (key !== lastDateKey) {
        if (dateObj) {
          result.push({
            type: "separator",
            id: `sep-${key}`,
            label: formatDayLabel(dateObj),
          });
        }
        lastDateKey = key;
      }

      result.push({ type: "message", ...m });
    });

    return result;
  }, [messages]);

  // 🔔 SignalR: ReceiveInboxMessage handler
  const handleReceiveInboxMessage = useCallback(
    payload => {
      if (!payload) return;

      const contactId = payload.contactId ?? payload.ContactId ?? null;
      const conversationId =
        payload.conversationId ?? payload.ConversationId ?? null;

      const mapped = mapHubMessageToChat(payload);
      if (!mapped) return;

      // 1) Update messages if this conversation is open
      setMessages(prev => {
        if (!selectedConversation) return prev;

        const matchesOpenConversation =
          (conversationId &&
            selectedConversation.id &&
            selectedConversation.id === conversationId) ||
          (contactId &&
            selectedConversation.contactId &&
            selectedConversation.contactId === contactId) ||
          (payload.contactPhone &&
            selectedConversation.contactPhone &&
            selectedConversation.contactPhone === payload.contactPhone);

        if (!matchesOpenConversation) return prev;

        const already = prev.some(
          m =>
            m.id === mapped.id ||
            m.id === payload.id ||
            m.id === payload.messageId ||
            m.id === payload.clientMessageId
        );
        if (already) return prev;

        return [...prev, mapped];
      });

      // 2) Update conversations list (preview, timestamps, unread)
      setAllConversations(prev => {
        const previewText =
          payload.lastMessagePreview ??
          payload.preview ??
          payload.text ??
          payload.message ??
          payload.body ??
          payload.messageText ??
          "";

        const lastAt =
          payload.lastMessageAt ??
          payload.sentAt ??
          payload.sentAtUtc ??
          payload.createdAt ??
          payload.timestamp ??
          new Date().toISOString();

        const idx = prev.findIndex(
          c =>
            (conversationId && c.id === conversationId) ||
            (contactId && c.contactId === contactId) ||
            (payload.contactPhone &&
              c.contactPhone &&
              c.contactPhone === payload.contactPhone)
        );

        // New conversation
        if (idx === -1) {
          if (!contactId) return prev;

          const shouldIncreaseUnread =
            mapped.isInbound &&
            (!selectedConversation ||
              selectedConversation.contactId !== contactId);

          const unread = payload.unreadCount ?? (shouldIncreaseUnread ? 1 : 0);

          const newConv = {
            id: conversationId || contactId,
            contactId,
            contactName:
              payload.contactName ?? payload.contactPhone ?? "Unknown",
            contactPhone: payload.contactPhone ?? "",
            lastMessagePreview: previewText,
            lastMessageAt: lastAt,
            unreadCount: unread,
            status: payload.status ?? "Open",
            numberId: payload.numberId ?? null,
            numberLabel: payload.numberLabel ?? undefined,
            within24h: payload.within24h ?? true,
            assignedToUserId: payload.assignedToUserId ?? null,
            assignedToUserName: payload.assignedToUserName ?? null,
            isAssignedToMe: payload.isAssignedToMe ?? false,
            sourceType: payload.sourceType ?? "WhatsApp",
            sourceName: payload.sourceName ?? "WhatsApp",
            mode: payload.mode ?? "Live",
            firstSeenAt: payload.firstSeenAt ?? null,
            lastInboundAt:
              payload.lastInboundAt ?? (mapped.isInbound ? lastAt : null),
            lastOutboundAt:
              payload.lastOutboundAt ?? (!mapped.isInbound ? lastAt : null),
          };

          return [newConv, ...prev];
        }

        // Existing conversation
        return prev.map((c, index) => {
          if (index !== idx) return c;

          const shouldIncreaseUnread =
            mapped.isInbound &&
            (!selectedConversation ||
              selectedConversation.contactId !== c.contactId);

          const newUnread =
            payload.unreadCount ??
            (shouldIncreaseUnread
              ? (c.unreadCount || 0) + 1
              : c.unreadCount || 0);

          return {
            ...c,
            contactName: payload.contactName ?? c.contactName,
            contactPhone: payload.contactPhone ?? c.contactPhone,
            lastMessagePreview: previewText || c.lastMessagePreview,
            lastMessageAt: lastAt || c.lastMessageAt,
            unreadCount: newUnread,
            lastInboundAt: mapped.isInbound
              ? lastAt
              : c.lastInboundAt ?? c.lastInboundAt,
            lastOutboundAt: !mapped.isInbound
              ? lastAt
              : c.lastOutboundAt ?? c.lastOutboundAt,
          };
        });
      });
    },
    [selectedConversation]
  );

  // 🔔 SignalR: UnreadCountChanged handler
  const handleUnreadCountChanged = useCallback(
    payload => {
      if (!payload) return;

      // { refresh: true } → full silent reload
      if (payload.refresh) {
        fetchConversations({ silent: true, limit: 100 });
        return;
      }

      // Single { contactId, unreadCount }
      if (payload.contactId) {
        setAllConversations(prev =>
          prev.map(c =>
            c.contactId === payload.contactId
              ? { ...c, unreadCount: payload.unreadCount ?? 0 }
              : c
          )
        );
        return;
      }

      // { items: [{ contactId, unreadCount }, ...] }
      if (Array.isArray(payload.items)) {
        const map = new Map();
        payload.items.forEach(item => {
          if (!item || !item.contactId) return;
          map.set(item.contactId, item.unreadCount ?? 0);
        });

        setAllConversations(prev =>
          prev.map(c =>
            map.has(c.contactId)
              ? { ...c, unreadCount: map.get(c.contactId) }
              : c
          )
        );
      }
    },
    [fetchConversations]
  );

  // 🔌 Subscribe to SignalR events
  useEffect(() => {
    if (!connection || !isConnected) return;

    connection.on("ReceiveInboxMessage", handleReceiveInboxMessage);
    connection.on("UnreadCountChanged", handleUnreadCountChanged);

    return () => {
      connection.off("ReceiveInboxMessage", handleReceiveInboxMessage);
      connection.off("UnreadCountChanged", handleUnreadCountChanged);
    };
  }, [
    connection,
    isConnected,
    handleReceiveInboxMessage,
    handleUnreadCountChanged,
  ]);

  // 📨 Send message (HTTP is source of truth)
  const handleSendMessage = async () => {
    if (!selectedConversation) {
      toast.warn("Please select a conversation first.");
      return;
    }

    if (!isWithin24h) {
      toast.warn(
        "This chat is outside the 24-hour WhatsApp window. Use a template or campaign to re-engage."
      );
      return;
    }

    const trimmed = newMessage.trim();
    if (!trimmed) {
      toast.warn("Type a message before sending.");
      return;
    }

    const businessId = localStorage.getItem("businessId");
    if (!businessId) {
      toast.error("❌ Missing business context. Please login again.");
      return;
    }

    if (isSending) return;

    const tempId = `temp-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const optimisticMsg = {
      id: tempId,
      direction: "out",
      isInbound: false,
      text: trimmed,
      sentAt: nowIso,
      status: "Sending...",
      errorMessage: null,
    };

    setMessages(prev => [...prev, optimisticMsg]);

    setNewMessage("");
    setIsSending(true);

    try {
      const payload = {
        businessId,
        conversationId: selectedConversation.id,
        contactId: selectedConversation.contactId,
        to: selectedConversation.contactPhone,
        text: trimmed,
        numberId: selectedConversation.numberId,
      };

      const res = await axiosClient.post("/chat-inbox/send-message", payload);
      const saved = res.data || {};

      const finalSentAt =
        saved.sentAtUtc || saved.sentAt || optimisticMsg.sentAt;
      const finalSentAtIso =
        finalSentAt instanceof Date ? finalSentAt.toISOString() : finalSentAt;

      // ✅ Update message bubble (avoid double-insert if hub echoes)
      setMessages(prev =>
        prev.map(m =>
          m.id === tempId
            ? {
                id: saved.id ?? tempId,
                direction: saved.direction ?? "out",
                isInbound:
                  typeof saved.isInbound === "boolean"
                    ? saved.isInbound
                    : false,
                text: saved.text ?? trimmed,
                sentAt: finalSentAtIso,
                status: saved.status || "Sent",
                errorMessage: saved.errorMessage || null,
              }
            : m
        )
      );

      // ✅ Optimistically update left list preview + timestamps
      setAllConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id
            ? {
                ...c,
                lastMessagePreview: trimmed,
                lastMessageAt: finalSentAtIso,
                lastOutboundAt: finalSentAtIso,
                within24h: true,
              }
            : c
        )
      );
    } catch (error) {
      console.error("❌ Failed to send message:", error);
      toast.error(
        error.response?.data?.message || "Failed to send message. Please retry."
      );

      setMessages(prev =>
        prev.map(m =>
          m.id === tempId
            ? {
                ...m,
                status: "Failed",
                errorMessage: "Not delivered",
              }
            : m
        )
      );
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  };

  const handleComposerKeyDown = event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isSending && newMessage.trim()) {
        handleSendMessage();
      }
    }
  };

  // 👤 Assign conversation to me
  const handleAssignToMe = async () => {
    if (!selectedConversation || !selectedConversation.contactId) {
      toast.warn("Select a conversation before assigning.");
      return;
    }

    const businessId = localStorage.getItem("businessId");
    const userId = localStorage.getItem("userId");

    if (!businessId || !userId) {
      toast.error("Missing business or user context. Please login again.");
      return;
    }

    if (isAssigning) return;

    setIsAssigning(true);
    try {
      const payload = {
        businessId,
        contactId: selectedConversation.contactId,
        userId,
      };

      await axiosClient.post("/chat-inbox/assign", payload);

      // Optimistic local update
      setAllConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id
            ? {
                ...c,
                assignedToUserId: userId,
                assignedToUserName: "You",
                isAssignedToMe: true,
              }
            : c
        )
      );

      toast.success("Conversation assigned to you.");
    } catch (error) {
      console.error("Failed to assign conversation:", error);
      toast.error(
        error.response?.data?.message || "Failed to assign conversation."
      );
    } finally {
      setIsAssigning(false);
    }
  };

  // 🚫 Unassign conversation
  const handleUnassign = async () => {
    if (!selectedConversation || !selectedConversation.contactId) {
      toast.warn("Select a conversation before unassigning.");
      return;
    }

    const businessId = localStorage.getItem("businessId");

    if (!businessId) {
      toast.error("Missing business context. Please login again.");
      return;
    }

    if (isAssigning) return;

    setIsAssigning(true);
    try {
      const payload = {
        businessId,
        contactId: selectedConversation.contactId,
      };

      await axiosClient.post("/chat-inbox/unassign", payload);

      // Optimistic local update
      setAllConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id
            ? {
                ...c,
                assignedToUserId: null,
                assignedToUserName: null,
                isAssignedToMe: false,
              }
            : c
        )
      );

      toast.info("Conversation unassigned.");
    } catch (error) {
      console.error("Failed to unassign conversation:", error);
      toast.error(
        error.response?.data?.message || "Failed to unassign conversation."
      );
    } finally {
      setIsAssigning(false);
    }
  };

  // 🔗 Open full CRM (Contact 360 workspace)
  const handleOpenFullCrm = () => {
    if (!selectedConversation) {
      toast.info("Select a conversation first to open full CRM.");
      return;
    }
    if (!selectedContactId) {
      toast.info("No contact is linked to this conversation yet.");
      return;
    }

    // 🔗 Match route: /app/crm/contacts/:contactId
    navigate(`/app/crm/contacts/${selectedContactId}`);
  };

  // 📝 Quick add note from Inbox
  const handleAddNote = async () => {
    if (!selectedConversation || !selectedContactId) {
      toast.warn("Select a conversation with a linked contact to add notes.");
      return;
    }

    const content = noteDraft.trim();
    if (!content) {
      toast.warn("Type something for the note before saving.");
      return;
    }

    if (isSavingNote) return;

    const title =
      content.length > 50 ? `${content.substring(0, 50)}…` : content;

    const dto = {
      contactId: selectedContactId,
      title,
      content,
      // CreatedBy / BusinessId / CreatedAt handled server-side
    };

    setIsSavingNote(true);
    try {
      // 🔗 Reuse the same API as CRM module
      await axiosClient.post("/notes", dto);

      // 🧾 Auto-log to LeadTimeline (Inbox origin)
      try {
        await axiosClient.post("/leadtimeline", {
          contactId: selectedContactId,
          eventType: "NoteAdded",
          description: `Note added from Inbox: '${title}'`,
          source: "Inbox",
          category: "Manual",
          isSystemGenerated: true,
        });
      } catch (timelineErr) {
        console.warn("Timeline log failed (Inbox note):", timelineErr);
      }

      toast.success("Note added.");
      setNoteDraft("");
      await refreshContactSummary();
    } catch (error) {
      console.error("Failed to add note:", error);
      toast.error(
        error.response?.data?.message || "Failed to add note from inbox."
      );
    } finally {
      setIsSavingNote(false);
    }
  };

  // ⏰ Quick add reminder from Inbox
  const handleAddReminder = async () => {
    if (!selectedConversation || !selectedContactId) {
      toast.warn(
        "Select a conversation with a linked contact to add reminders."
      );
      return;
    }

    const title = reminderTitle.trim();
    if (!title) {
      toast.warn("Enter a reminder title.");
      return;
    }
    if (!reminderDueAt) {
      toast.warn("Choose a due date/time for the reminder.");
      return;
    }

    const due = new Date(reminderDueAt);
    if (Number.isNaN(due.getTime())) {
      toast.error("Invalid reminder date/time.");
      return;
    }

    if (isSavingReminder) return;

    const dto = {
      contactId: selectedContactId,
      title,
      description: reminderDescription || null,
      dueAt: due.toISOString(),
      // Status & Priority defaults handled server-side
    };

    setIsSavingReminder(true);
    try {
      // 🔗 Same API as CRM Reminders module
      await axiosClient.post("/reminders", dto);

      // 🧾 Auto-log to LeadTimeline (Inbox origin)
      try {
        const formattedDate = due.toLocaleString();

        await axiosClient.post("/leadtimeline", {
          contactId: selectedContactId,
          eventType: "ReminderSet",
          description: `Reminder from Inbox '${title}' scheduled for ${formattedDate}.`,
          source: "Inbox",
          category: "Auto",
          isSystemGenerated: true,
        });
      } catch (timelineErr) {
        console.warn("Timeline log failed (Inbox reminder):", timelineErr);
      }

      toast.success("Reminder added.");
      setReminderTitle("");
      setReminderDueAt("");
      setReminderDescription("");
      await refreshContactSummary();
    } catch (error) {
      console.error("Failed to add reminder:", error);
      toast.error(
        error.response?.data?.message || "Failed to add reminder from inbox."
      );
    } finally {
      setIsSavingReminder(false);
    }
  };

  // Small helpers for CRM panel
  const tagsList =
    (contactSummary?.tags ??
      contactSummary?.contactTags ??
      contactSummary?.contactTagsDto ??
      []) ||
    [];

  const recentNotes = contactSummary?.recentNotes ?? [];
  const nextReminder = contactSummary?.nextReminder ?? null;
  const recentTimeline = contactSummary?.recentTimeline ?? [];

  return (
    <div className="h-[calc(100vh-64px)] flex bg-slate-50">
      {/* 📥 Left: Conversations list */}
      <div className="w-[360px] border-r border-slate-200 flex flex-col">
        {/* Top filters */}
        <div className="px-4 py-3 border-b border-slate-200 bg-white flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-slate-800">
              Chat Inbox
            </span>
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-slate-500">
              <Activity
                className={`w-3 h-3 ${
                  isConnected ? "text-emerald-500" : "text-slate-400"
                }`}
              />
              {isConnected ? "Live" : "Offline"}
            </span>
          </div>

          {/* Number + tab + search row */}
          <div className="flex gap-2 items-center">
            <div className="relative">
              <select
                value={selectedNumberId}
                onChange={e => setSelectedNumberId(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 text-xs rounded-full pl-3 pr-7 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              >
                {MOCK_NUMBERS.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-full px-2">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-1" />
              <input
                type="text"
                placeholder="Search name, number, message..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-none text-xs text-slate-700 focus:outline-none"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-3 text-[11px] font-medium">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-1 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-purple-600 text-purple-700"
                    : "border-transparent text-slate-500 hover:text-purple-600"
                }`}
              >
                {tab.label}
              </button>
            ))}

            <button className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700">
              <Filter className="w-3 h-3" />
              More
            </button>
          </div>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {isLoading && (
            <div className="p-4 text-xs text-slate-500">Loading chats…</div>
          )}

          {!isLoading && filteredConversations.length === 0 && (
            <div className="p-4 text-xs text-slate-400 italic">
              No conversations found for this filter.
            </div>
          )}

          {filteredConversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setSelectedConversationId(conv.id)}
              className={`w-full flex items-start gap-3 px-3 py-2.5 text-left border-b border-slate-100 hover:bg-white transition ${
                selectedConversationId === conv.id ? "bg-white" : "bg-slate-50"
              }`}
            >
              {/* Avatar + unread badge */}
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-semibold text-emerald-700">
                  {getInitial(conv.contactName, conv.contactPhone)}
                </div>
                {conv.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-semibold rounded-full px-1.5 py-[1px]">
                    {conv.unreadCount}
                  </span>
                )}
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {conv.contactName || conv.contactPhone || "Unknown"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {conv.contactPhone}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 ml-2">
                    {conv.lastMessageAt
                      ? new Date(conv.lastMessageAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-600 truncate pr-4">
                    {conv.lastMessagePreview || "No recent message"}
                  </p>

                  <div className="flex flex-col items-end gap-0.5">
                    <span
                      className={`text-[9px] px-1.5 py-[1px] rounded-full border ${
                        conv.within24h
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      }`}
                    >
                      {conv.within24h ? "24h window" : "Outside 24h"}
                    </span>
                    {conv.assignedToUserName && (
                      <span className="text-[9px] text-slate-400">
                        👤 {conv.assignedToUserName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 💬 Middle: Chat window */}
      <div className="flex-1 flex flex-col">
        {/* Chat header */}
        <div className="h-[64px] border-b border-slate-200 bg-white flex items-center justify-between px-4">
          {selectedConversation ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-semibold text-emerald-700">
                  {getInitial(
                    selectedConversation.contactName,
                    selectedConversation.contactPhone
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">
                      {selectedConversation.contactName ||
                        selectedConversation.contactPhone}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {selectedConversation.contactPhone}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {selectedConversation.lastInboundAt
                        ? formatDateTime(selectedConversation.lastInboundAt)
                        : "Last inbound: -"}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {selectedConversation.status || "Open"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-[1px] rounded-full text-[10px] border ${
                        isWithin24h
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {isWithin24h ? "Within 24h" : "Outside 24h"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                      <User className="w-3 h-3" />
                      {headerIsAssigned
                        ? headerIsAssignedToMe
                          ? "Assigned to you"
                          : `Assigned to ${headerAssignedName}`
                        : "Unassigned"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  {selectedConversation.sourceName || "WhatsApp"}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {selectedConversation.mode || "Live"}
                </span>

                {/* Assignment actions */}
                {!headerIsAssigned && currentUserId && (
                  <button
                    onClick={handleAssignToMe}
                    disabled={isAssigning}
                    className={`ml-2 px-2 py-[2px] rounded-full border text-[11px] ${
                      isAssigning
                        ? "border-emerald-300 text-emerald-400 cursor-wait"
                        : "border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                    }`}
                  >
                    {isAssigning ? "Assigning…" : "Assign to me"}
                  </button>
                )}

                {headerIsAssignedToMe && (
                  <button
                    onClick={handleUnassign}
                    disabled={isAssigning}
                    className={`ml-1 px-2 py-[2px] rounded-full border text-[11px] ${
                      isAssigning
                        ? "border-slate-300 text-slate-400 cursor-wait"
                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {isAssigning ? "Updating…" : "Unassign"}
                  </button>
                )}

                <button
                  onClick={() => setShowRightPanel(v => !v)}
                  className="ml-2 text-xs text-purple-600 hover:text-purple-700"
                >
                  {showRightPanel ? "Hide details" : "Show details"}
                </button>
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-400">
              Select a conversation to start chatting.
            </div>
          )}
        </div>

        {/* Chat messages area */}
        <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-3">
          {!selectedConversation && (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No conversation selected.
            </div>
          )}

          {selectedConversation && (
            <div className="flex flex-col gap-2 text-xs">
              {isMessagesLoading && (
                <div className="text-slate-400">Loading messages…</div>
              )}

              {!isMessagesLoading && messages.length === 0 && (
                <div className="text-slate-400 italic">
                  No messages yet for this contact.
                </div>
              )}

              {!isMessagesLoading &&
                messagesWithSeparators.length > 0 &&
                messagesWithSeparators.map(item => {
                  if (item.type === "separator") {
                    return (
                      <div key={item.id} className="flex justify-center my-2">
                        <span className="px-3 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-500">
                          {item.label}
                        </span>
                      </div>
                    );
                  }

                  const msg = item;
                  const isInbound = !!msg.isInbound;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${
                        isInbound ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-3 py-2 shadow-sm ${
                          isInbound
                            ? "bg-white text-slate-800"
                            : "bg-purple-600 text-white"
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words">
                          {msg.text || "-"}
                        </div>
                        <div className="mt-1 text-[10px] opacity-75 flex items-center justify-end gap-1">
                          {msg.sentAt &&
                            new Date(msg.sentAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          <StatusIcon status={msg.status} />
                          {msg.status && <span>{msg.status}</span>}
                        </div>
                        {msg.errorMessage && (
                          <div className="mt-0.5 text-[10px] text-rose-200">
                            {msg.errorMessage}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Chat input */}
        <div className="border-t border-slate-200 bg-white px-4 py-3">
          {selectedConversation && !isWithin24h && (
            <div className="text-[11px] text-amber-600 mb-2">
              This conversation is{" "}
              <span className="font-semibold">outside</span> the 24-hour
              WhatsApp window. Free-form replies are disabled here. Use approved
              templates (campaigns / flows) to re-engage.
            </div>
          )}

          <div className="flex items-center gap-2">
            <textarea
              rows={1}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={
                selectedConversation
                  ? isWithin24h
                    ? "Type a reply…"
                    : "24h window expired – send via template campaign."
                  : "Select a conversation first."
              }
              disabled={!selectedConversation || !isWithin24h || isSending}
              className={`flex-1 resize-none border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 ${
                !selectedConversation || !isWithin24h
                  ? "bg-slate-50 text-slate-400 cursor-not-allowed"
                  : "bg-white"
              }`}
            />
            <button
              onClick={handleSendMessage}
              disabled={
                isSending ||
                !newMessage.trim() ||
                !selectedConversation ||
                !isWithin24h
              }
              className={`bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm ${
                isSending ||
                !newMessage.trim() ||
                !selectedConversation ||
                !isWithin24h
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:bg-purple-700"
              }`}
            >
              {isSending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>

      {/* 📇 Right: CRM + details */}
      {showRightPanel && (
        <div className="w-80 border-l border-slate-200 bg-white flex flex-col">
          {/* Top section: summary */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-800">
                Contact & CRM
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selectedContactId && (
                <button
                  type="button"
                  onClick={handleOpenFullCrm}
                  className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-[2px] text-[11px] font-medium text-purple-700 hover:bg-purple-100"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open full CRM
                </button>
              )}
              <button
                onClick={() => setShowDetails(v => !v)}
                className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                {showDetails ? "Hide" : "Show"}
                {showDetails ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {/* Contact + CRM summary */}
          {showDetails && (
            <div className="p-4 text-xs text-slate-600 space-y-3 overflow-y-auto">
              {selectedConversation ? (
                <>
                  {/* Basic identity */}
                  <div>
                    <div className="font-semibold text-slate-800 mb-0.5">
                      {selectedConversation.contactName ||
                        selectedConversation.contactPhone ||
                        "Unknown contact"}
                    </div>
                    <div className="text-slate-500">
                      {selectedConversation.contactPhone}
                    </div>
                    {contactSummary?.leadSource && (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Lead source:{" "}
                        <span className="text-slate-600">
                          {contactSummary.leadSource}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* High-level stats */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-50 rounded-md p-2">
                      <div className="text-slate-400">First seen</div>
                      <div className="font-medium">
                        {formatDateTime(selectedConversation.firstSeenAt)}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-md p-2">
                      <div className="text-slate-400">Last inbound</div>
                      <div className="font-medium">
                        {formatDateTime(selectedConversation.lastInboundAt)}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-md p-2">
                      <div className="text-slate-400">Last outbound</div>
                      <div className="font-medium">
                        {formatDateTime(selectedConversation.lastOutboundAt)}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-md p-2">
                      <div className="text-slate-400">Status</div>
                      <div className="font-medium">
                        {selectedConversation.status || "Open"}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-slate-200 my-2" />

                  {/* CRM summary details */}
                  {isSummaryLoading && (
                    <div className="text-[11px] text-slate-400">
                      Loading CRM data…
                    </div>
                  )}

                  {!isSummaryLoading && !contactSummary && (
                    <div className="text-[11px] text-slate-400 italic">
                      No CRM data yet. Add a note or reminder from the CRM
                      workspace to enrich this contact.
                    </div>
                  )}

                  {!isSummaryLoading && contactSummary && (
                    <>
                      {/* Tags */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <Tag className="w-3 h-3 text-slate-400" />
                            <span className="font-semibold text-[11px] text-slate-700">
                              Tags
                            </span>
                          </div>

                          {selectedContactId && (
                            <button
                              type="button"
                              onClick={() => setIsTagModalOpen(true)}
                              className="text-[11px] font-medium text-purple-600 hover:text-purple-700"
                            >
                              + Tag
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {tagsList.length > 0 ? (
                            tagsList.map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-0.5 text-[10px] rounded-full font-medium border border-slate-200"
                                style={{
                                  backgroundColor: tag.colorHex || "#EEF2FF",
                                }}
                              >
                                {tag.tagName || tag.name || "Tag"}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              No tags yet. Use{" "}
                              <span className="font-semibold">+ Tag</span> or
                              full CRM to add tags.
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Next reminder */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <Bell className="w-3 h-3 text-slate-400" />
                            <span className="font-semibold text-[11px] text-slate-700">
                              Next reminder
                            </span>
                          </div>
                        </div>
                        {nextReminder ? (
                          <div className="bg-amber-50 border border-amber-100 rounded-md p-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-amber-800">
                                {nextReminder.title}
                              </span>
                              <span className="text-[10px] text-amber-700">
                                {formatDateTime(nextReminder.dueAt)}
                              </span>
                            </div>
                            {nextReminder.description && (
                              <div className="mt-0.5 text-[11px] text-amber-900">
                                {nextReminder.description}
                              </div>
                            )}
                            {nextReminder.status && (
                              <div className="mt-0.5 text-[10px] text-amber-700">
                                Status: {nextReminder.status}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            No upcoming reminder for this contact.
                          </span>
                        )}

                        {/* Quick reminder form */}
                        {selectedContactId && (
                          <div className="mt-2">
                            <div className="text-[11px] text-slate-500 mb-1">
                              Quick reminder
                            </div>
                            <input
                              type="text"
                              value={reminderTitle}
                              onChange={e => setReminderTitle(e.target.value)}
                              placeholder="Reminder title"
                              className="w-full mb-1 border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                            />
                            <input
                              type="datetime-local"
                              value={reminderDueAt}
                              onChange={e => setReminderDueAt(e.target.value)}
                              className="w-full mb-1 border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                            />
                            <textarea
                              rows={2}
                              value={reminderDescription}
                              onChange={e =>
                                setReminderDescription(e.target.value)
                              }
                              placeholder="Optional description…"
                              className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                            />
                            <div className="mt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={handleAddReminder}
                                disabled={
                                  isSavingReminder ||
                                  !reminderTitle.trim() ||
                                  !reminderDueAt
                                }
                                className={`px-2 py-[3px] rounded-md text-[11px] font-medium ${
                                  isSavingReminder ||
                                  !reminderTitle.trim() ||
                                  !reminderDueAt
                                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                    : "bg-amber-600 text-white hover:bg-amber-700"
                                }`}
                              >
                                {isSavingReminder ? "Saving…" : "Add reminder"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Recent notes */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <StickyNote className="w-3 h-3 text-slate-400" />
                            <span className="font-semibold text-[11px] text-slate-700">
                              Recent notes
                            </span>
                          </div>
                        </div>
                        {recentNotes.length > 0 ? (
                          <div className="space-y-1.5">
                            {recentNotes.map(note => (
                              <div
                                key={note.id}
                                className="bg-slate-50 border border-slate-100 rounded-md p-2"
                              >
                                <div className="text-[11px] text-slate-700">
                                  {note.content || note.text || "(no content)"}
                                </div>
                                <div className="mt-0.5 text-[10px] text-slate-400 flex justify-between">
                                  <span>
                                    {note.createdByName ||
                                      note.createdBy ||
                                      "Agent"}
                                  </span>
                                  <span>
                                    {note.createdAt
                                      ? new Date(
                                          note.createdAt
                                        ).toLocaleString()
                                      : ""}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            No notes yet.
                          </span>
                        )}

                        {/* Quick note form */}
                        {selectedContactId && (
                          <div className="mt-2">
                            <div className="text-[11px] text-slate-500 mb-1">
                              Add a quick note
                            </div>
                            <textarea
                              rows={2}
                              value={noteDraft}
                              onChange={e => setNoteDraft(e.target.value)}
                              placeholder="Type an internal note about this contact…"
                              className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                            />
                            <div className="mt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={handleAddNote}
                                disabled={isSavingNote || !noteDraft.trim()}
                                className={`px-2 py-[3px] rounded-md text-[11px] font-medium ${
                                  isSavingNote || !noteDraft.trim()
                                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                    : "bg-purple-600 text-white hover:bg-purple-700"
                                }`}
                              >
                                {isSavingNote ? "Saving…" : "Add note"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Recent timeline */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <Activity className="w-3 h-3 text-slate-400" />
                            <span className="font-semibold text-[11px] text-slate-700">
                              Recent activity
                            </span>
                          </div>
                        </div>
                        {recentTimeline.length > 0 ? (
                          <div className="space-y-1.5">
                            {recentTimeline.map(event => (
                              <div
                                key={event.id}
                                className="bg-slate-50 border border-slate-100 rounded-md p-2"
                              >
                                <div className="text-[11px] text-slate-700">
                                  {event.title ||
                                    event.shortDescription ||
                                    event.description ||
                                    "Activity"}
                                </div>
                                <div className="mt-0.5 text-[10px] text-slate-400 flex justify-between">
                                  <span>
                                    {event.source ||
                                      event.category ||
                                      event.eventType ||
                                      ""}
                                  </span>
                                  <span>
                                    {event.createdAt
                                      ? new Date(
                                          event.createdAt
                                        ).toLocaleString()
                                      : ""}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            No recent activity logged yet.
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-slate-400 italic">
                  Select a conversation to see CRM info.
                </div>
              )}
            </div>
          )}

          {/* CRM panel placeholder / footer */}
          {showCrmPanel && (
            <div className="border-t border-slate-200 p-3 text-[11px] text-slate-500">
              This mini-CRM view uses your existing Contacts, Tags, Notes,
              Reminders, and Timeline data. Use{" "}
              <span className="font-semibold text-slate-700">
                “Open full CRM”
              </span>{" "}
              for a 360° view.
            </div>
          )}
        </div>
      )}

      {/* 📌 Inbox Tag Modal (overlay) */}
      <InboxAddTagModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        contactId={selectedContactId}
        currentTags={tagsList}
        onTagAdded={refreshContactSummary}
      />
    </div>
  );
}

// // 📄 File: src/pages/ChatInbox.jsx

// import React, {
//   useState,
//   useMemo,
//   useCallback,
//   useEffect,
//   useRef,
// } from "react";
// import {
//   Phone,
//   Filter,
//   Search,
//   Clock,
//   CheckCircle2,
//   MessageCircle,
//   Mail,
//   User,
//   ChevronDown,
//   ChevronRight,
//   Check,
//   CheckCheck,
//   AlertCircle,
//   Tag,
//   Bell,
//   Activity,
//   StickyNote,
//   ExternalLink,
// } from "lucide-react";
// import { useNavigate } from "react-router-dom";
// import axiosClient from "../../api/axiosClient";
// import { toast } from "react-toastify";

// // 🔢 Mock WhatsApp numbers (real API wiring can come later)
// const MOCK_NUMBERS = [
//   { id: "all", label: "All numbers" },
//   { id: "wa-1", label: "+91 98765 43210" },
//   { id: "wa-2", label: "+91 99887 77665" },
// ];

// // 🧠 Tabs for the inbox
// const TABS = [
//   { id: "live", label: "Live (24h)" },
//   { id: "history", label: "Older" },
//   { id: "unassigned", label: "Unassigned" },
//   { id: "my", label: "My Chats" },
// ];

// // Local helper: format dates nicely
// function formatDateTime(value) {
//   if (!value) return "-";
//   const d = new Date(value);
//   if (Number.isNaN(d.getTime())) return String(value);
//   return d.toLocaleString();
// }

// // Local helper: first letter avatar
// function getInitial(name, phone) {
//   const src = name || phone || "?";
//   return src.trim()[0]?.toUpperCase() ?? "?";
// }

// // 🗓 Day label for separators (Today / Yesterday / 12 Dec 2025)
// function formatDayLabel(date) {
//   if (!date || Number.isNaN(date.getTime())) return "";
//   const today = new Date();
//   const todayKey = today.toDateString();

//   const yesterday = new Date();
//   yesterday.setDate(today.getDate() - 1);
//   const yesterdayKey = yesterday.toDateString();

//   const key = date.toDateString();

//   if (key === todayKey) return "Today";
//   if (key === yesterdayKey) return "Yesterday";

//   return date.toLocaleDateString(undefined, {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//   });
// }

// // ✅ Map message status → icon
// function StatusIcon({ status }) {
//   if (!status) return null;
//   const s = String(status).toLowerCase();

//   if (s === "failed" || s === "error") {
//     return (
//       <span className="inline-flex items-center text-[10px] text-rose-200">
//         <AlertCircle className="w-3 h-3 mr-0.5" />
//       </span>
//     );
//   }

//   if (s === "read" || s === "seen" || s === "viewed") {
//     return (
//       <span className="inline-flex items-center text-[10px] text-emerald-200">
//         <CheckCheck className="w-3 h-3 mr-0.5" />
//       </span>
//     );
//   }

//   if (s === "delivered") {
//     return (
//       <span className="inline-flex items-center text-[10px] text-slate-200">
//         <CheckCheck className="w-3 h-3 mr-0.5" />
//       </span>
//     );
//   }

//   if (s === "sent" || s === "sending" || s === "queued") {
//     return (
//       <span className="inline-flex items-center text-[10px] text-slate-200">
//         <Check className="w-3 h-3 mr-0.5" />
//       </span>
//     );
//   }

//   return null;
// }

// // 🔹 Quick Tag modal for Inbox – adds ONE new tag to the current contact
// // 🔹 Quick Tag modal for Inbox – adds ONE new tag to the current contact
// function InboxAddTagModal({
//   isOpen,
//   onClose,
//   contactId,
//   currentTags,
//   onTagAdded,
// }) {
//   const [availableTags, setAvailableTags] = React.useState([]);
//   const [selectedTagId, setSelectedTagId] = React.useState("");
//   const [loadingTags, setLoadingTags] = React.useState(false);
//   const [saving, setSaving] = React.useState(false);

//   // Load all tags when modal opens
//   React.useEffect(() => {
//     if (!isOpen) return;

//     const fetchTags = async () => {
//       try {
//         setLoadingTags(true);

//         // ✅ use correct backend route: /api/tags/get-tags
//         const response = await axiosClient.get("/tags/get-tags");
//         const allTags = response.data?.data || response.data || [];

//         // Remove tags that this contact already has
//         const existingIds = new Set(
//           (currentTags || []).map(t => t.id || t.tagId)
//         );
//         const filtered = allTags.filter(t => !existingIds.has(t.id));

//         setAvailableTags(filtered);
//         setSelectedTagId(filtered.length > 0 ? filtered[0].id : "");
//       } catch (error) {
//         console.error("Failed to load tags for Inbox:", error);
//         toast.error("Failed to load tags");
//         setAvailableTags([]);
//       } finally {
//         setLoadingTags(false);
//       }
//     };

//     fetchTags();
//   }, [isOpen, currentTags]);

//   const handleSubmit = async e => {
//     e.preventDefault();

//     if (!selectedTagId) {
//       toast.warn("Select a tag to add.");
//       return;
//     }
//     if (!contactId) {
//       toast.error("No contact selected.");
//       return;
//     }

//     try {
//       setSaving(true);

//       // Reuse existing bulk assign endpoint from CRM
//       await axiosClient.post("/contacts/bulk-assign-tag", {
//         contactIds: [contactId],
//         tagId: selectedTagId,
//       });

//       toast.success("Tag added to this contact");
//       onTagAdded && onTagAdded();
//       onClose();
//     } catch (error) {
//       console.error("Failed to assign tag from Inbox:", error);
//       const message = error.response?.data?.message || "Failed to assign tag";
//       toast.error(message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
//       <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
//         <h2 className="mb-3 text-sm font-semibold text-slate-900">
//           Add tag to this contact
//         </h2>

//         {loadingTags ? (
//           <p className="text-xs text-slate-500">Loading tags…</p>
//         ) : availableTags.length === 0 ? (
//           // ✅ Show a Close button so the user is not trapped
//           <div className="space-y-3">
//             <p className="text-xs text-slate-500">
//               No new tags available. Create tags in the CRM workspace first, or
//               this contact already has all tags.
//             </p>
//             <div className="flex justify-end pt-1">
//               <button
//                 type="button"
//                 onClick={onClose}
//                 className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         ) : (
//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div>
//               <label className="mb-1 block text-xs font-medium text-slate-600">
//                 Select tag
//               </label>
//               <select
//                 className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
//                 value={selectedTagId}
//                 onChange={e => setSelectedTagId(e.target.value)}
//                 disabled={saving}
//               >
//                 {availableTags.map(tag => (
//                   <option key={tag.id} value={tag.id}>
//                     {tag.name || tag.tagName || "Tag"}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div className="flex justify-end gap-2 pt-1">
//               <button
//                 type="button"
//                 onClick={onClose}
//                 disabled={saving}
//                 className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
//               >
//                 Cancel
//               </button>
//               <button
//                 type="submit"
//                 disabled={saving || availableTags.length === 0}
//                 className="rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
//               >
//                 {saving ? "Adding…" : "Add tag"}
//               </button>
//             </div>
//           </form>
//         )}
//       </div>
//     </div>
//   );
// }

// export default function ChatInbox() {
//   const navigate = useNavigate();

//   // 🔹 Filters & selection
//   const [activeTab, setActiveTab] = useState("live");
//   const [selectedNumberId, setSelectedNumberId] = useState("all");
//   const [searchTerm, setSearchTerm] = useState("");

//   // 🔹 Data from backend
//   const [allConversations, setAllConversations] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);

//   // 🔹 Selected conversation & message input
//   const [selectedConversationId, setSelectedConversationId] = useState(null);
//   const [newMessage, setNewMessage] = useState("");

//   // 🔹 Messages for selected conversation
//   const [messages, setMessages] = useState([]);
//   const [isMessagesLoading, setIsMessagesLoading] = useState(false);

//   // 🔹 Sending & assignment state
//   const [isSending, setIsSending] = useState(false);
//   const [isAssigning, setIsAssigning] = useState(false);

//   // 🔹 CRM summary for right panel
//   const [contactSummary, setContactSummary] = useState(null);
//   const [isSummaryLoading, setIsSummaryLoading] = useState(false);

//   // 🔹 Quick CRM actions (notes + reminders)
//   const [noteDraft, setNoteDraft] = useState("");
//   const [isSavingNote, setIsSavingNote] = useState(false);

//   const [reminderTitle, setReminderTitle] = useState("");
//   const [reminderDueAt, setReminderDueAt] = useState("");
//   const [reminderDescription, setReminderDescription] = useState("");
//   const [isSavingReminder, setIsSavingReminder] = useState(false);

//   // 🔹 Tag modal state
//   const [isTagModalOpen, setIsTagModalOpen] = useState(false);

//   // Right panel toggles
//   const [showRightPanel, setShowRightPanel] = useState(true);
//   const [showDetails, setShowDetails] = useState(true);
//   const [showCrmPanel, setShowCrmPanel] = useState(true);

//   // 🔽 Auto-scroll anchor for chat messages
//   const messagesEndRef = useRef(null);

//   const scrollToBottom = useCallback(() => {
//     if (messagesEndRef.current) {
//       messagesEndRef.current.scrollIntoView({
//         behavior: "smooth",
//         block: "end",
//       });
//     }
//   }, []);

//   const currentUserId = useMemo(() => localStorage.getItem("userId"), []);

//   // 🧮 Selected conversation
//   const selectedConversation = useMemo(
//     () => allConversations.find(c => c.id === selectedConversationId) || null,
//     [allConversations, selectedConversationId]
//   );

//   // Stable contactId for effects
//   const selectedContactId = useMemo(
//     () => selectedConversation?.contactId || null,
//     [selectedConversation]
//   );

//   // 🧮 24h window flag
//   const isWithin24h = selectedConversation?.within24h ?? false;

//   // 🧮 Assignment flags for header
//   const headerIsAssigned = !!selectedConversation?.assignedToUserId;
//   const headerIsAssignedToMe =
//     !!selectedConversation?.isAssignedToMe ||
//     (!!selectedConversation?.assignedToUserId &&
//       currentUserId &&
//       selectedConversation.assignedToUserId === currentUserId);
//   const headerAssignedName = headerIsAssignedToMe
//     ? "You"
//     : selectedConversation?.assignedToUserName || "Agent";

//   // 🧮 Filter + sort conversations
//   const filteredConversations = useMemo(() => {
//     let list = [...allConversations];

//     if (selectedNumberId !== "all") {
//       list = list.filter(c => c.numberId === selectedNumberId);
//     }

//     if (searchTerm.trim()) {
//       const q = searchTerm.trim().toLowerCase();
//       list = list.filter(
//         c =>
//           c.contactName?.toLowerCase().includes(q) ||
//           c.contactPhone?.toLowerCase().includes(q) ||
//           c.lastMessagePreview?.toLowerCase().includes(q)
//       );
//     }

//     if (activeTab === "live") {
//       list = list.filter(c => c.within24h);
//     } else if (activeTab === "unassigned") {
//       list = list.filter(c => !c.assignedToUserId);
//     } else if (activeTab === "my") {
//       if (currentUserId) {
//         list = list.filter(c => c.assignedToUserId === currentUserId);
//       }
//     }

//     // 🔽 Sort: unread first, then most recent lastMessageAt
//     list.sort((a, b) => {
//       const aUnread = a.unreadCount > 0;
//       const bUnread = b.unreadCount > 0;

//       if (aUnread && !bUnread) return -1;
//       if (!aUnread && bUnread) return 1;

//       const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
//       const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;

//       return bTime - aTime; // newest first
//     });

//     return list;
//   }, [
//     allConversations,
//     activeTab,
//     selectedNumberId,
//     searchTerm,
//     currentUserId,
//   ]);

//   // 🛰 Load conversations (supports "silent" refresh)
//   const fetchConversations = useCallback(
//     async (options = {}) => {
//       const { limit, silent } = options;

//       try {
//         if (!silent) {
//           setIsLoading(true);
//         }

//         const businessId = localStorage.getItem("businessId");

//         if (!businessId) {
//           toast.error(
//             "❌ Missing business context. Please login again to load inbox."
//           );
//           if (!silent) {
//             setIsLoading(false);
//           }
//           return;
//         }

//         const params = {
//           businessId,
//           currentUserId,
//           tab: activeTab,
//           numberId:
//             selectedNumberId && selectedNumberId !== "all"
//               ? selectedNumberId
//               : undefined,
//           search: searchTerm || undefined,
//           limit: limit ?? 100,
//         };

//         const res = await axiosClient.get("/chat-inbox/conversations", {
//           params,
//         });

//         const apiItems = Array.isArray(res.data) ? res.data : [];

//         const mapped = apiItems.map(item => ({
//           id: item.id,
//           contactId: item.contactId,
//           contactName: item.contactName,
//           contactPhone: item.contactPhone,
//           lastMessagePreview: item.lastMessagePreview,
//           lastMessageAt: item.lastMessageAt,
//           unreadCount: item.unreadCount || 0,
//           status: item.status || "Open",
//           numberId: item.numberId,
//           numberLabel: item.numberLabel,
//           within24h: !!item.within24h,
//           assignedToUserId: item.assignedToUserId || null,
//           assignedToUserName: item.assignedToUserName || null,
//           isAssignedToMe: !!item.isAssignedToMe,
//           sourceType: item.sourceType || "WhatsApp",
//           sourceName: item.sourceName || "WhatsApp",
//           mode: item.mode || "Live",
//           firstSeenAt: item.firstSeenAt,
//           lastInboundAt: item.lastInboundAt,
//           lastOutboundAt: item.lastOutboundAt,
//         }));

//         setAllConversations(mapped);

//         if (!selectedConversationId && mapped.length > 0) {
//           setSelectedConversationId(mapped[0].id);
//         }
//       } catch (error) {
//         console.error("❌ Failed to load inbox conversations:", error);
//         const message =
//           error.response?.data?.message ||
//           "Failed to load inbox conversations.";
//         toast.error(message);
//       } finally {
//         if (!options.silent) {
//           setIsLoading(false);
//         }
//       }
//     },
//     [
//       activeTab,
//       selectedNumberId,
//       searchTerm,
//       selectedConversationId,
//       currentUserId,
//     ]
//   );

//   // Initial + filter-based load
//   useEffect(() => {
//     fetchConversations();
//   }, [activeTab, selectedNumberId, searchTerm, fetchConversations]);

//   // 🔁 Auto-refresh conversations every 25 seconds (silent, no flicker)
//   useEffect(() => {
//     const intervalId = setInterval(() => {
//       fetchConversations({ silent: true, limit: 100 });
//     }, 25000);

//     return () => clearInterval(intervalId);
//   }, [fetchConversations]);

//   // 🛰 Load messages for selected conversation
//   useEffect(() => {
//     const loadMessages = async () => {
//       if (!selectedConversationId) {
//         setMessages([]);
//         return;
//       }

//       const conv = allConversations.find(c => c.id === selectedConversationId);
//       if (!conv) {
//         setMessages([]);
//         return;
//       }

//       const businessId = localStorage.getItem("businessId");
//       if (!businessId) {
//         toast.error(
//           "❌ Missing business context. Please login again to load messages."
//         );
//         return;
//       }

//       try {
//         setIsMessagesLoading(true);

//         const res = await axiosClient.get("/chat-inbox/messages", {
//           params: {
//             businessId,
//             contactPhone: conv.contactPhone,
//             limit: 100,
//           },
//         });

//         const apiItems = Array.isArray(res.data) ? res.data : [];

//         const mapped = apiItems
//           .map(m => {
//             const directionRaw =
//               m.direction ?? m.Direction ?? m.dir ?? m.messageDirection ?? "";
//             const statusRaw = m.status ?? "";

//             const dir = String(directionRaw).toLowerCase();
//             const status = String(statusRaw).toLowerCase();

//             let inferredIsInbound =
//               typeof m.isInbound === "boolean" ? m.isInbound : false;

//             if (typeof m.isInbound !== "boolean") {
//               inferredIsInbound =
//                 dir === "inbound" ||
//                 dir === "in" ||
//                 dir === "incoming" ||
//                 dir === "received" ||
//                 dir === "customer" ||
//                 dir === "from" ||
//                 status === "received" ||
//                 status === "incoming";
//             }

//             return {
//               id: m.id,
//               direction: directionRaw || (inferredIsInbound ? "in" : "out"),
//               isInbound: inferredIsInbound,
//               text: m.text || "",
//               sentAt: m.sentAtUtc || m.sentAt,
//               status: m.status,
//               errorMessage: m.errorMessage,
//             };
//           })
//           .reverse();

//         setMessages(mapped);
//       } catch (error) {
//         console.error("❌ Failed to load messages:", error);
//         const message =
//           error.response?.data?.message || "Failed to load messages.";
//         toast.error(message);
//         setMessages([]);
//       } finally {
//         setIsMessagesLoading(false);
//       }
//     };

//     loadMessages();
//   }, [selectedConversationId, allConversations]);

//   // 🔔 Mark as read when opening a conversation
//   useEffect(() => {
//     if (!selectedConversationId) return;

//     const conv = allConversations.find(c => c.id === selectedConversationId);
//     if (!conv || !conv.contactId) return;

//     const businessId = localStorage.getItem("businessId");
//     const userId = localStorage.getItem("userId");

//     if (!businessId || !userId) return;

//     const payload = {
//       businessId,
//       contactId: conv.contactId,
//       userId,
//     };

//     // Fire-and-forget; we don't block UI on this.
//     axiosClient.post("/chat-inbox/mark-read", payload).catch(err => {
//       console.error("Failed to mark conversation as read:", err);
//     });

//     // Optimistically zero-out unread count in UI
//     setAllConversations(prev =>
//       prev.map(c => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
//     );
//   }, [selectedConversationId, allConversations]);

//   // 🔁 Helper to (re)load CRM contact summary
//   const refreshContactSummary = useCallback(async () => {
//     if (!selectedContactId) {
//       setContactSummary(null);
//       return;
//     }

//     try {
//       setIsSummaryLoading(true);
//       const res = await axiosClient.get(
//         `/crm/contact-summary/${selectedContactId}`
//       );
//       const payload = res.data?.data ?? res.data;
//       setContactSummary(payload || null);
//     } catch (error) {
//       console.error("❌ Failed to load contact summary:", error);
//       setContactSummary(null);
//       // kept quiet to avoid toast noise while switching chats
//     } finally {
//       setIsSummaryLoading(false);
//     }
//   }, [selectedContactId]);

//   // 🛰 Load CRM contact summary for right panel
//   useEffect(() => {
//     if (!selectedContactId) {
//       setContactSummary(null);
//       return;
//     }
//     refreshContactSummary();
//   }, [selectedContactId, refreshContactSummary]);

//   // Auto-scroll when messages change
//   useEffect(() => {
//     if (!selectedConversationId) return;
//     if (isMessagesLoading) return;
//     if (messages.length === 0) return;

//     scrollToBottom();
//   }, [messages, isMessagesLoading, selectedConversationId, scrollToBottom]);

//   // 🧮 Messages + date separators
//   const messagesWithSeparators = useMemo(() => {
//     const result = [];
//     let lastDateKey = null;

//     messages.forEach(m => {
//       const dateObj = m.sentAt ? new Date(m.sentAt) : null;
//       const key = dateObj ? dateObj.toDateString() : "unknown";

//       if (key !== lastDateKey) {
//         if (dateObj) {
//           result.push({
//             type: "separator",
//             id: `sep-${key}`,
//             label: formatDayLabel(dateObj),
//           });
//         }
//         lastDateKey = key;
//       }

//       result.push({ type: "message", ...m });
//     });

//     return result;
//   }, [messages]);

//   // 📨 Send message
//   const handleSendMessage = async () => {
//     if (!selectedConversation) {
//       toast.warn("Please select a conversation first.");
//       return;
//     }

//     if (!isWithin24h) {
//       toast.warn(
//         "This chat is outside the 24-hour WhatsApp window. Use a template or campaign to re-engage."
//       );
//       return;
//     }

//     const trimmed = newMessage.trim();
//     if (!trimmed) {
//       toast.warn("Type a message before sending.");
//       return;
//     }

//     const businessId = localStorage.getItem("businessId");
//     if (!businessId) {
//       toast.error("❌ Missing business context. Please login again.");
//       return;
//     }

//     if (isSending) return;

//     const tempId = `temp-${Date.now()}`;
//     const nowIso = new Date().toISOString();

//     const optimisticMsg = {
//       id: tempId,
//       direction: "out",
//       isInbound: false,
//       text: trimmed,
//       sentAt: nowIso,
//       status: "Sending...",
//       errorMessage: null,
//     };

//     setMessages(prev => [...prev, optimisticMsg]);

//     setNewMessage("");
//     setIsSending(true);

//     try {
//       const payload = {
//         businessId,
//         conversationId: selectedConversation.id,
//         contactId: selectedConversation.contactId,
//         to: selectedConversation.contactPhone,
//         text: trimmed,
//         numberId: selectedConversation.numberId,
//       };

//       const res = await axiosClient.post("/chat-inbox/send-message", payload);
//       const saved = res.data || {};

//       const finalSentAt =
//         saved.sentAtUtc || saved.sentAt || optimisticMsg.sentAt;
//       const finalSentAtIso =
//         finalSentAt instanceof Date ? finalSentAt.toISOString() : finalSentAt;

//       // ✅ Update message bubble
//       setMessages(prev =>
//         prev.map(m =>
//           m.id === tempId
//             ? {
//                 id: saved.id ?? tempId,
//                 direction: saved.direction ?? "out",
//                 isInbound:
//                   typeof saved.isInbound === "boolean"
//                     ? saved.isInbound
//                     : false,
//                 text: saved.text ?? trimmed,
//                 sentAt: finalSentAtIso,
//                 status: saved.status || "Sent",
//                 errorMessage: saved.errorMessage || null,
//               }
//             : m
//         )
//       );

//       // ✅ Optimistically update left list preview + timestamps
//       setAllConversations(prev =>
//         prev.map(c =>
//           c.id === selectedConversation.id
//             ? {
//                 ...c,
//                 lastMessagePreview: trimmed,
//                 lastMessageAt: finalSentAtIso,
//                 lastOutboundAt: finalSentAtIso,
//                 within24h: true,
//               }
//             : c
//         )
//       );
//     } catch (error) {
//       console.error("❌ Failed to send message:", error);
//       toast.error(
//         error.response?.data?.message || "Failed to send message. Please retry."
//       );

//       setMessages(prev =>
//         prev.map(m =>
//           m.id === tempId
//             ? {
//                 ...m,
//                 status: "Failed",
//                 errorMessage: "Not delivered",
//               }
//             : m
//         )
//       );
//     } finally {
//       setIsSending(false);
//       scrollToBottom();
//     }
//   };

//   const handleComposerKeyDown = event => {
//     if (event.key === "Enter" && !event.shiftKey) {
//       event.preventDefault();
//       if (!isSending && newMessage.trim()) {
//         handleSendMessage();
//       }
//     }
//   };

//   // 👤 Assign conversation to me
//   const handleAssignToMe = async () => {
//     if (!selectedConversation || !selectedConversation.contactId) {
//       toast.warn("Select a conversation before assigning.");
//       return;
//     }

//     const businessId = localStorage.getItem("businessId");
//     const userId = localStorage.getItem("userId");

//     if (!businessId || !userId) {
//       toast.error("Missing business or user context. Please login again.");
//       return;
//     }

//     if (isAssigning) return;

//     setIsAssigning(true);
//     try {
//       const payload = {
//         businessId,
//         contactId: selectedConversation.contactId,
//         userId,
//       };

//       await axiosClient.post("/chat-inbox/assign", payload);

//       // Optimistic local update
//       setAllConversations(prev =>
//         prev.map(c =>
//           c.id === selectedConversation.id
//             ? {
//                 ...c,
//                 assignedToUserId: userId,
//                 assignedToUserName: "You",
//                 isAssignedToMe: true,
//               }
//             : c
//         )
//       );

//       toast.success("Conversation assigned to you.");
//     } catch (error) {
//       console.error("Failed to assign conversation:", error);
//       toast.error(
//         error.response?.data?.message || "Failed to assign conversation."
//       );
//     } finally {
//       setIsAssigning(false);
//     }
//   };

//   // 🚫 Unassign conversation
//   const handleUnassign = async () => {
//     if (!selectedConversation || !selectedConversation.contactId) {
//       toast.warn("Select a conversation before unassigning.");
//       return;
//     }

//     const businessId = localStorage.getItem("businessId");

//     if (!businessId) {
//       toast.error("Missing business context. Please login again.");
//       return;
//     }

//     if (isAssigning) return;

//     setIsAssigning(true);
//     try {
//       const payload = {
//         businessId,
//         contactId: selectedConversation.contactId,
//       };

//       await axiosClient.post("/chat-inbox/unassign", payload);

//       // Optimistic local update
//       setAllConversations(prev =>
//         prev.map(c =>
//           c.id === selectedConversation.id
//             ? {
//                 ...c,
//                 assignedToUserId: null,
//                 assignedToUserName: null,
//                 isAssignedToMe: false,
//               }
//             : c
//         )
//       );

//       toast.info("Conversation unassigned.");
//     } catch (error) {
//       console.error("Failed to unassign conversation:", error);
//       toast.error(
//         error.response?.data?.message || "Failed to unassign conversation."
//       );
//     } finally {
//       setIsAssigning(false);
//     }
//   };

//   // 🔗 Open full CRM (Contact 360 workspace)
//   const handleOpenFullCrm = () => {
//     if (!selectedConversation) {
//       toast.info("Select a conversation first to open full CRM.");
//       return;
//     }
//     if (!selectedContactId) {
//       toast.info("No contact is linked to this conversation yet.");
//       return;
//     }

//     // 🔗 Match route: /app/crm/contacts/:contactId
//     navigate(`/app/crm/contacts/${selectedContactId}`);
//   };

//   // 📝 Quick add note from Inbox
//   // 📝 Quick add note from Inbox
//   const handleAddNote = async () => {
//     if (!selectedConversation || !selectedContactId) {
//       toast.warn("Select a conversation with a linked contact to add notes.");
//       return;
//     }

//     const content = noteDraft.trim();
//     if (!content) {
//       toast.warn("Type something for the note before saving.");
//       return;
//     }

//     if (isSavingNote) return;

//     const title =
//       content.length > 50 ? `${content.substring(0, 50)}…` : content;

//     const dto = {
//       contactId: selectedContactId,
//       title,
//       content,
//       // CreatedBy / BusinessId / CreatedAt handled server-side
//     };

//     setIsSavingNote(true);
//     try {
//       // 🔗 Reuse the same API as CRM module
//       await axiosClient.post("/notes", dto);

//       // 🧾 Auto-log to LeadTimeline (Inbox origin)
//       try {
//         await axiosClient.post("/leadtimeline", {
//           contactId: selectedContactId,
//           eventType: "NoteAdded",
//           description: `Note added from Inbox: '${title}'`,
//           source: "Inbox",
//           category: "Manual",
//           isSystemGenerated: true,
//         });
//       } catch (timelineErr) {
//         console.warn("Timeline log failed (Inbox note):", timelineErr);
//       }

//       toast.success("Note added.");
//       setNoteDraft("");
//       await refreshContactSummary();
//     } catch (error) {
//       console.error("Failed to add note:", error);
//       toast.error(
//         error.response?.data?.message || "Failed to add note from inbox."
//       );
//     } finally {
//       setIsSavingNote(false);
//     }
//   };

//   // ⏰ Quick add reminder from Inbox
//   // ⏰ Quick add reminder from Inbox
//   const handleAddReminder = async () => {
//     if (!selectedConversation || !selectedContactId) {
//       toast.warn(
//         "Select a conversation with a linked contact to add reminders."
//       );
//       return;
//     }

//     const title = reminderTitle.trim();
//     if (!title) {
//       toast.warn("Enter a reminder title.");
//       return;
//     }
//     if (!reminderDueAt) {
//       toast.warn("Choose a due date/time for the reminder.");
//       return;
//     }

//     const due = new Date(reminderDueAt);
//     if (Number.isNaN(due.getTime())) {
//       toast.error("Invalid reminder date/time.");
//       return;
//     }

//     if (isSavingReminder) return;

//     const dto = {
//       contactId: selectedContactId,
//       title,
//       description: reminderDescription || null,
//       dueAt: due.toISOString(),
//       // Status & Priority defaults handled server-side
//     };

//     setIsSavingReminder(true);
//     try {
//       // 🔗 Same API as CRM Reminders module
//       await axiosClient.post("/reminders", dto);

//       // 🧾 Auto-log to LeadTimeline (Inbox origin)
//       try {
//         const formattedDate = due.toLocaleString();

//         await axiosClient.post("/leadtimeline", {
//           contactId: selectedContactId,
//           eventType: "ReminderSet",
//           description: `Reminder from Inbox '${title}' scheduled for ${formattedDate}.`,
//           source: "Inbox",
//           category: "Auto",
//           isSystemGenerated: true,
//         });
//       } catch (timelineErr) {
//         console.warn("Timeline log failed (Inbox reminder):", timelineErr);
//       }

//       toast.success("Reminder added.");
//       setReminderTitle("");
//       setReminderDueAt("");
//       setReminderDescription("");
//       await refreshContactSummary();
//     } catch (error) {
//       console.error("Failed to add reminder:", error);
//       toast.error(
//         error.response?.data?.message || "Failed to add reminder from inbox."
//       );
//     } finally {
//       setIsSavingReminder(false);
//     }
//   };

//   // Small helpers for CRM panel
//   const tagsList =
//     (contactSummary?.tags ??
//       contactSummary?.contactTags ??
//       contactSummary?.contactTagsDto ??
//       []) ||
//     [];

//   const recentNotes = contactSummary?.recentNotes ?? [];
//   const nextReminder = contactSummary?.nextReminder ?? null;
//   const recentTimeline = contactSummary?.recentTimeline ?? [];

//   return (
//     <div className="h-[calc(100vh-64px)] flex bg-slate-50">
//       {/* 📥 Left: Conversations list */}
//       <div className="w-[360px] border-r border-slate-200 flex flex-col">
//         {/* Top filters */}
//         <div className="px-4 py-3 border-b border-slate-200 bg-white flex flex-col gap-3">
//           <div className="flex items-center gap-2">
//             <Phone className="w-4 h-4 text-emerald-600" />
//             <span className="text-sm font-semibold text-slate-800">
//               Chat Inbox
//             </span>
//           </div>

//           {/* Number + tab + search row */}
//           <div className="flex gap-2 items-center">
//             <div className="relative">
//               <select
//                 value={selectedNumberId}
//                 onChange={e => setSelectedNumberId(e.target.value)}
//                 className="appearance-none bg-slate-50 border border-slate-200 text-xs rounded-full pl-3 pr-7 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
//               >
//                 {MOCK_NUMBERS.map(n => (
//                   <option key={n.id} value={n.id}>
//                     {n.label}
//                   </option>
//                 ))}
//               </select>
//               <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
//             </div>

//             <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-full px-2">
//               <Search className="w-3.5 h-3.5 text-slate-400 mr-1" />
//               <input
//                 type="text"
//                 placeholder="Search name, number, message..."
//                 value={searchTerm}
//                 onChange={e => setSearchTerm(e.target.value)}
//                 className="w-full bg-transparent border-none text-xs text-slate-700 focus:outline-none"
//               />
//             </div>
//           </div>

//           {/* Tabs */}
//           <div className="flex items-center gap-3 text-[11px] font-medium">
//             {TABS.map(tab => (
//               <button
//                 key={tab.id}
//                 onClick={() => setActiveTab(tab.id)}
//                 className={`pb-1 border-b-2 transition-colors ${
//                   activeTab === tab.id
//                     ? "border-purple-600 text-purple-700"
//                     : "border-transparent text-slate-500 hover:text-purple-600"
//                 }`}
//               >
//                 {tab.label}
//               </button>
//             ))}

//             <button className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700">
//               <Filter className="w-3 h-3" />
//               More
//             </button>
//           </div>
//         </div>

//         {/* Conversations list */}
//         <div className="flex-1 overflow-y-auto bg-slate-50">
//           {isLoading && (
//             <div className="p-4 text-xs text-slate-500">Loading chats…</div>
//           )}

//           {!isLoading && filteredConversations.length === 0 && (
//             <div className="p-4 text-xs text-slate-400 italic">
//               No conversations found for this filter.
//             </div>
//           )}

//           {filteredConversations.map(conv => (
//             <button
//               key={conv.id}
//               onClick={() => setSelectedConversationId(conv.id)}
//               className={`w-full flex items-start gap-3 px-3 py-2.5 text-left border-b border-slate-100 hover:bg-white transition ${
//                 selectedConversationId === conv.id ? "bg-white" : "bg-slate-50"
//               }`}
//             >
//               {/* Avatar + unread badge */}
//               <div className="relative">
//                 <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-semibold text-emerald-700">
//                   {getInitial(conv.contactName, conv.contactPhone)}
//                 </div>
//                 {conv.unreadCount > 0 && (
//                   <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-semibold rounded-full px-1.5 py-[1px]">
//                     {conv.unreadCount}
//                   </span>
//                 )}
//               </div>

//               {/* Main info */}
//               <div className="flex-1 min-w-0">
//                 <div className="flex items-center justify-between mb-0.5">
//                   <div className="flex flex-col">
//                     <span className="text-xs font-semibold text-slate-800 truncate">
//                       {conv.contactName || conv.contactPhone || "Unknown"}
//                     </span>
//                     <span className="text-[10px] text-slate-400">
//                       {conv.contactPhone}
//                     </span>
//                   </div>
//                   <span className="text-[10px] text-slate-400 ml-2">
//                     {conv.lastMessageAt
//                       ? new Date(conv.lastMessageAt).toLocaleTimeString([], {
//                           hour: "2-digit",
//                           minute: "2-digit",
//                         })
//                       : "-"}
//                   </span>
//                 </div>

//                 <div className="flex items-center justify-between gap-2">
//                   <p className="text-[11px] text-slate-600 truncate pr-4">
//                     {conv.lastMessagePreview || "No recent message"}
//                   </p>

//                   <div className="flex flex-col items-end gap-0.5">
//                     <span
//                       className={`text-[9px] px-1.5 py-[1px] rounded-full border ${
//                         conv.within24h
//                           ? "bg-emerald-50 text-emerald-700 border-emerald-100"
//                           : "bg-slate-50 text-slate-500 border-slate-200"
//                       }`}
//                     >
//                       {conv.within24h ? "24h window" : "Outside 24h"}
//                     </span>
//                     {conv.assignedToUserName && (
//                       <span className="text-[9px] text-slate-400">
//                         👤 {conv.assignedToUserName}
//                       </span>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* 💬 Middle: Chat window */}
//       <div className="flex-1 flex flex-col">
//         {/* Chat header */}
//         <div className="h-[64px] border-b border-slate-200 bg-white flex items-center justify-between px-4">
//           {selectedConversation ? (
//             <>
//               <div className="flex items-center gap-3">
//                 <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-semibold text-emerald-700">
//                   {getInitial(
//                     selectedConversation.contactName,
//                     selectedConversation.contactPhone
//                   )}
//                 </div>
//                 <div>
//                   <div className="flex items-center gap-2">
//                     <span className="text-sm font-semibold text-slate-800">
//                       {selectedConversation.contactName ||
//                         selectedConversation.contactPhone}
//                     </span>
//                     <span className="text-[11px] text-slate-400">
//                       {selectedConversation.contactPhone}
//                     </span>
//                   </div>
//                   <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
//                     <span className="flex items-center gap-1">
//                       <Clock className="w-3 h-3" />
//                       {selectedConversation.lastInboundAt
//                         ? formatDateTime(selectedConversation.lastInboundAt)
//                         : "Last inbound: -"}
//                     </span>
//                     <span className="flex items-center gap-1">
//                       <CheckCircle2 className="w-3 h-3" />
//                       {selectedConversation.status || "Open"}
//                     </span>
//                     <span
//                       className={`inline-flex items-center gap-1 px-2 py-[1px] rounded-full text-[10px] border ${
//                         isWithin24h
//                           ? "bg-emerald-50 text-emerald-700 border-emerald-200"
//                           : "bg-slate-50 text-slate-500 border-slate-200"
//                       }`}
//                     >
//                       <Clock className="w-3 h-3" />
//                       {isWithin24h ? "Within 24h" : "Outside 24h"}
//                     </span>
//                     <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
//                       <User className="w-3 h-3" />
//                       {headerIsAssigned
//                         ? headerIsAssignedToMe
//                           ? "Assigned to you"
//                           : `Assigned to ${headerAssignedName}`
//                         : "Unassigned"}
//                     </span>
//                   </div>
//                 </div>
//               </div>

//               <div className="flex items-center gap-2 text-[11px] text-slate-500">
//                 <span className="flex items-center gap-1">
//                   <MessageCircle className="w-3 h-3" />
//                   {selectedConversation.sourceName || "WhatsApp"}
//                 </span>
//                 <span className="flex items-center gap-1">
//                   <Mail className="w-3 h-3" />
//                   {selectedConversation.mode || "Live"}
//                 </span>

//                 {/* Assignment actions */}
//                 {!headerIsAssigned && currentUserId && (
//                   <button
//                     onClick={handleAssignToMe}
//                     disabled={isAssigning}
//                     className={`ml-2 px-2 py-[2px] rounded-full border text-[11px] ${
//                       isAssigning
//                         ? "border-emerald-300 text-emerald-400 cursor-wait"
//                         : "border-emerald-500 text-emerald-600 hover:bg-emerald-50"
//                     }`}
//                   >
//                     {isAssigning ? "Assigning…" : "Assign to me"}
//                   </button>
//                 )}

//                 {headerIsAssignedToMe && (
//                   <button
//                     onClick={handleUnassign}
//                     disabled={isAssigning}
//                     className={`ml-1 px-2 py-[2px] rounded-full border text-[11px] ${
//                       isAssigning
//                         ? "border-slate-300 text-slate-400 cursor-wait"
//                         : "border-slate-300 text-slate-600 hover:bg-slate-50"
//                     }`}
//                   >
//                     {isAssigning ? "Updating…" : "Unassign"}
//                   </button>
//                 )}

//                 <button
//                   onClick={() => setShowRightPanel(v => !v)}
//                   className="ml-2 text-xs text-purple-600 hover:text-purple-700"
//                 >
//                   {showRightPanel ? "Hide details" : "Show details"}
//                 </button>
//               </div>
//             </>
//           ) : (
//             <div className="text-xs text-slate-400">
//               Select a conversation to start chatting.
//             </div>
//           )}
//         </div>

//         {/* Chat messages area */}
//         <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-3">
//           {!selectedConversation && (
//             <div className="h-full flex items-center justify-center text-xs text-slate-400">
//               No conversation selected.
//             </div>
//           )}

//           {selectedConversation && (
//             <div className="flex flex-col gap-2 text-xs">
//               {isMessagesLoading && (
//                 <div className="text-slate-400">Loading messages…</div>
//               )}

//               {!isMessagesLoading && messages.length === 0 && (
//                 <div className="text-slate-400 italic">
//                   No messages yet for this contact.
//                 </div>
//               )}

//               {!isMessagesLoading &&
//                 messagesWithSeparators.length > 0 &&
//                 messagesWithSeparators.map(item => {
//                   if (item.type === "separator") {
//                     return (
//                       <div key={item.id} className="flex justify-center my-2">
//                         <span className="px-3 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-500">
//                           {item.label}
//                         </span>
//                       </div>
//                     );
//                   }

//                   const msg = item;
//                   const isInbound = !!msg.isInbound;

//                   return (
//                     <div
//                       key={msg.id}
//                       className={`flex ${
//                         isInbound ? "justify-start" : "justify-end"
//                       }`}
//                     >
//                       <div
//                         className={`max-w-[70%] rounded-lg px-3 py-2 shadow-sm ${
//                           isInbound
//                             ? "bg-white text-slate-800"
//                             : "bg-purple-600 text-white"
//                         }`}
//                       >
//                         <div className="whitespace-pre-wrap break-words">
//                           {msg.text || "-"}
//                         </div>
//                         <div className="mt-1 text-[10px] opacity-75 flex items-center justify-end gap-1">
//                           {msg.sentAt &&
//                             new Date(msg.sentAt).toLocaleTimeString([], {
//                               hour: "2-digit",
//                               minute: "2-digit",
//                             })}
//                           <StatusIcon status={msg.status} />
//                           {msg.status && <span>{msg.status}</span>}
//                         </div>
//                         {msg.errorMessage && (
//                           <div className="mt-0.5 text-[10px] text-rose-200">
//                             {msg.errorMessage}
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   );
//                 })}

//               <div ref={messagesEndRef} />
//             </div>
//           )}
//         </div>

//         {/* Chat input */}
//         <div className="border-t border-slate-200 bg-white px-4 py-3">
//           {selectedConversation && !isWithin24h && (
//             <div className="text-[11px] text-amber-600 mb-2">
//               This conversation is{" "}
//               <span className="font-semibold">outside</span> the 24-hour
//               WhatsApp window. Free-form replies are disabled here. Use approved
//               templates (campaigns / flows) to re-engage.
//             </div>
//           )}

//           <div className="flex items-center gap-2">
//             <textarea
//               rows={1}
//               value={newMessage}
//               onChange={e => setNewMessage(e.target.value)}
//               onKeyDown={handleComposerKeyDown}
//               placeholder={
//                 selectedConversation
//                   ? isWithin24h
//                     ? "Type a reply…"
//                     : "24h window expired – send via template campaign."
//                   : "Select a conversation first."
//               }
//               disabled={!selectedConversation || !isWithin24h || isSending}
//               className={`flex-1 resize-none border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 ${
//                 !selectedConversation || !isWithin24h
//                   ? "bg-slate-50 text-slate-400 cursor-not-allowed"
//                   : "bg-white"
//               }`}
//             />
//             <button
//               onClick={handleSendMessage}
//               disabled={
//                 isSending ||
//                 !newMessage.trim() ||
//                 !selectedConversation ||
//                 !isWithin24h
//               }
//               className={`bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm ${
//                 isSending ||
//                 !newMessage.trim() ||
//                 !selectedConversation ||
//                 !isWithin24h
//                   ? "opacity-60 cursor-not-allowed"
//                   : "hover:bg-purple-700"
//               }`}
//             >
//               {isSending ? "Sending..." : "Send"}
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* 📇 Right: CRM + details */}
//       {showRightPanel && (
//         <div className="w-80 border-l border-slate-200 bg-white flex flex-col">
//           {/* Top section: summary */}
//           <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
//             <div className="flex items-center gap-2">
//               <User className="w-4 h-4 text-slate-500" />
//               <span className="text-xs font-semibold text-slate-800">
//                 Contact & CRM
//               </span>
//             </div>
//             <div className="flex items-center gap-2">
//               {selectedContactId && (
//                 <button
//                   type="button"
//                   onClick={handleOpenFullCrm}
//                   className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-[2px] text-[11px] font-medium text-purple-700 hover:bg-purple-100"
//                 >
//                   <ExternalLink className="w-3 h-3" />
//                   Open full CRM
//                 </button>
//               )}
//               <button
//                 onClick={() => setShowDetails(v => !v)}
//                 className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1"
//               >
//                 {showDetails ? "Hide" : "Show"}
//                 {showDetails ? (
//                   <ChevronDown className="w-3 h-3" />
//                 ) : (
//                   <ChevronRight className="w-3 h-3" />
//                 )}
//               </button>
//             </div>
//           </div>

//           {/* Contact + CRM summary */}
//           {showDetails && (
//             <div className="p-4 text-xs text-slate-600 space-y-3 overflow-y-auto">
//               {selectedConversation ? (
//                 <>
//                   {/* Basic identity */}
//                   <div>
//                     <div className="font-semibold text-slate-800 mb-0.5">
//                       {selectedConversation.contactName ||
//                         selectedConversation.contactPhone ||
//                         "Unknown contact"}
//                     </div>
//                     <div className="text-slate-500">
//                       {selectedConversation.contactPhone}
//                     </div>
//                     {contactSummary?.leadSource && (
//                       <div className="text-[11px] text-slate-400 mt-0.5">
//                         Lead source:{" "}
//                         <span className="text-slate-600">
//                           {contactSummary.leadSource}
//                         </span>
//                       </div>
//                     )}
//                   </div>

//                   {/* High-level stats */}
//                   <div className="grid grid-cols-2 gap-2 text-[11px]">
//                     <div className="bg-slate-50 rounded-md p-2">
//                       <div className="text-slate-400">First seen</div>
//                       <div className="font-medium">
//                         {formatDateTime(selectedConversation.firstSeenAt)}
//                       </div>
//                     </div>
//                     <div className="bg-slate-50 rounded-md p-2">
//                       <div className="text-slate-400">Last inbound</div>
//                       <div className="font-medium">
//                         {formatDateTime(selectedConversation.lastInboundAt)}
//                       </div>
//                     </div>
//                     <div className="bg-slate-50 rounded-md p-2">
//                       <div className="text-slate-400">Last outbound</div>
//                       <div className="font-medium">
//                         {formatDateTime(selectedConversation.lastOutboundAt)}
//                       </div>
//                     </div>
//                     <div className="bg-slate-50 rounded-md p-2">
//                       <div className="text-slate-400">Status</div>
//                       <div className="font-medium">
//                         {selectedConversation.status || "Open"}
//                       </div>
//                     </div>
//                   </div>

//                   {/* Divider */}
//                   <div className="h-px bg-slate-200 my-2" />

//                   {/* CRM summary details */}
//                   {isSummaryLoading && (
//                     <div className="text-[11px] text-slate-400">
//                       Loading CRM data…
//                     </div>
//                   )}

//                   {!isSummaryLoading && !contactSummary && (
//                     <div className="text-[11px] text-slate-400 italic">
//                       No CRM data yet. Add a note or reminder from the CRM
//                       workspace to enrich this contact.
//                     </div>
//                   )}

//                   {!isSummaryLoading && contactSummary && (
//                     <>
//                       {/* Tags */}
//                       <div>
//                         <div className="flex items-center justify-between mb-1">
//                           <div className="flex items-center gap-1">
//                             <Tag className="w-3 h-3 text-slate-400" />
//                             <span className="font-semibold text-[11px] text-slate-700">
//                               Tags
//                             </span>
//                           </div>

//                           {selectedContactId && (
//                             <button
//                               type="button"
//                               onClick={() => setIsTagModalOpen(true)}
//                               className="text-[11px] font-medium text-purple-600 hover:text-purple-700"
//                             >
//                               + Tag
//                             </button>
//                           )}
//                         </div>

//                         <div className="flex flex-wrap gap-1">
//                           {tagsList.length > 0 ? (
//                             tagsList.map((tag, index) => (
//                               <span
//                                 key={index}
//                                 className="px-2 py-0.5 text-[10px] rounded-full font-medium border border-slate-200"
//                                 style={{
//                                   backgroundColor: tag.colorHex || "#EEF2FF",
//                                 }}
//                               >
//                                 {tag.tagName || tag.name || "Tag"}
//                               </span>
//                             ))
//                           ) : (
//                             <span className="text-[11px] text-slate-400">
//                               No tags yet. Use{" "}
//                               <span className="font-semibold">+ Tag</span> or
//                               full CRM to add tags.
//                             </span>
//                           )}
//                         </div>
//                       </div>

//                       {/* Next reminder */}
//                       <div>
//                         <div className="flex items-center justify-between mb-1">
//                           <div className="flex items-center gap-1">
//                             <Bell className="w-3 h-3 text-slate-400" />
//                             <span className="font-semibold text-[11px] text-slate-700">
//                               Next reminder
//                             </span>
//                           </div>
//                         </div>
//                         {nextReminder ? (
//                           <div className="bg-amber-50 border border-amber-100 rounded-md p-2">
//                             <div className="flex items-center justify-between">
//                               <span className="text-[11px] font-semibold text-amber-800">
//                                 {nextReminder.title}
//                               </span>
//                               <span className="text-[10px] text-amber-700">
//                                 {formatDateTime(nextReminder.dueAt)}
//                               </span>
//                             </div>
//                             {nextReminder.description && (
//                               <div className="mt-0.5 text-[11px] text-amber-900">
//                                 {nextReminder.description}
//                               </div>
//                             )}
//                             {nextReminder.status && (
//                               <div className="mt-0.5 text-[10px] text-amber-700">
//                                 Status: {nextReminder.status}
//                               </div>
//                             )}
//                           </div>
//                         ) : (
//                           <span className="text-[11px] text-slate-400">
//                             No upcoming reminder for this contact.
//                           </span>
//                         )}

//                         {/* Quick reminder form */}
//                         {selectedContactId && (
//                           <div className="mt-2">
//                             <div className="text-[11px] text-slate-500 mb-1">
//                               Quick reminder
//                             </div>
//                             <input
//                               type="text"
//                               value={reminderTitle}
//                               onChange={e => setReminderTitle(e.target.value)}
//                               placeholder="Reminder title"
//                               className="w-full mb-1 border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
//                             />
//                             <input
//                               type="datetime-local"
//                               value={reminderDueAt}
//                               onChange={e => setReminderDueAt(e.target.value)}
//                               className="w-full mb-1 border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
//                             />
//                             <textarea
//                               rows={2}
//                               value={reminderDescription}
//                               onChange={e =>
//                                 setReminderDescription(e.target.value)
//                               }
//                               placeholder="Optional description…"
//                               className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
//                             />
//                             <div className="mt-1 flex justify-end">
//                               <button
//                                 type="button"
//                                 onClick={handleAddReminder}
//                                 disabled={
//                                   isSavingReminder ||
//                                   !reminderTitle.trim() ||
//                                   !reminderDueAt
//                                 }
//                                 className={`px-2 py-[3px] rounded-md text-[11px] font-medium ${
//                                   isSavingReminder ||
//                                   !reminderTitle.trim() ||
//                                   !reminderDueAt
//                                     ? "bg-slate-200 text-slate-500 cursor-not-allowed"
//                                     : "bg-amber-600 text-white hover:bg-amber-700"
//                                 }`}
//                               >
//                                 {isSavingReminder ? "Saving…" : "Add reminder"}
//                               </button>
//                             </div>
//                           </div>
//                         )}
//                       </div>

//                       {/* Recent notes */}
//                       <div>
//                         <div className="flex items-center justify-between mb-1">
//                           <div className="flex items-center gap-1">
//                             <StickyNote className="w-3 h-3 text-slate-400" />
//                             <span className="font-semibold text-[11px] text-slate-700">
//                               Recent notes
//                             </span>
//                           </div>
//                         </div>
//                         {recentNotes.length > 0 ? (
//                           <div className="space-y-1.5">
//                             {recentNotes.map(note => (
//                               <div
//                                 key={note.id}
//                                 className="bg-slate-50 border border-slate-100 rounded-md p-2"
//                               >
//                                 <div className="text-[11px] text-slate-700">
//                                   {note.content || note.text || "(no content)"}
//                                 </div>
//                                 <div className="mt-0.5 text-[10px] text-slate-400 flex justify-between">
//                                   <span>
//                                     {note.createdByName ||
//                                       note.createdBy ||
//                                       "Agent"}
//                                   </span>
//                                   <span>
//                                     {note.createdAt
//                                       ? new Date(
//                                           note.createdAt
//                                         ).toLocaleString()
//                                       : ""}
//                                   </span>
//                                 </div>
//                               </div>
//                             ))}
//                           </div>
//                         ) : (
//                           <span className="text-[11px] text-slate-400">
//                             No notes yet.
//                           </span>
//                         )}

//                         {/* Quick note form */}
//                         {selectedContactId && (
//                           <div className="mt-2">
//                             <div className="text-[11px] text-slate-500 mb-1">
//                               Add a quick note
//                             </div>
//                             <textarea
//                               rows={2}
//                               value={noteDraft}
//                               onChange={e => setNoteDraft(e.target.value)}
//                               placeholder="Type an internal note about this contact…"
//                               className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
//                             />
//                             <div className="mt-1 flex justify-end">
//                               <button
//                                 type="button"
//                                 onClick={handleAddNote}
//                                 disabled={isSavingNote || !noteDraft.trim()}
//                                 className={`px-2 py-[3px] rounded-md text-[11px] font-medium ${
//                                   isSavingNote || !noteDraft.trim()
//                                     ? "bg-slate-200 text-slate-500 cursor-not-allowed"
//                                     : "bg-purple-600 text-white hover:bg-purple-700"
//                                 }`}
//                               >
//                                 {isSavingNote ? "Saving…" : "Add note"}
//                               </button>
//                             </div>
//                           </div>
//                         )}
//                       </div>

//                       {/* Recent timeline */}
//                       <div>
//                         <div className="flex items-center justify-between mb-1">
//                           <div className="flex items-center gap-1">
//                             <Activity className="w-3 h-3 text-slate-400" />
//                             <span className="font-semibold text-[11px] text-slate-700">
//                               Recent activity
//                             </span>
//                           </div>
//                         </div>
//                         {recentTimeline.length > 0 ? (
//                           <div className="space-y-1.5">
//                             {recentTimeline.map(event => (
//                               <div
//                                 key={event.id}
//                                 className="bg-slate-50 border border-slate-100 rounded-md p-2"
//                               >
//                                 <div className="text-[11px] text-slate-700">
//                                   {event.title ||
//                                     event.shortDescription ||
//                                     event.description ||
//                                     "Activity"}
//                                 </div>
//                                 <div className="mt-0.5 text-[10px] text-slate-400 flex justify-between">
//                                   <span>
//                                     {event.source ||
//                                       event.category ||
//                                       event.eventType ||
//                                       ""}
//                                   </span>
//                                   <span>
//                                     {event.createdAt
//                                       ? new Date(
//                                           event.createdAt
//                                         ).toLocaleString()
//                                       : ""}
//                                   </span>
//                                 </div>
//                               </div>
//                             ))}
//                           </div>
//                         ) : (
//                           <span className="text-[11px] text-slate-400">
//                             No recent activity logged yet.
//                           </span>
//                         )}
//                       </div>
//                     </>
//                   )}
//                 </>
//               ) : (
//                 <div className="text-slate-400 italic">
//                   Select a conversation to see CRM info.
//                 </div>
//               )}
//             </div>
//           )}

//           {/* CRM panel placeholder / footer */}
//           {showCrmPanel && (
//             <div className="border-t border-slate-200 p-3 text-[11px] text-slate-500">
//               This mini-CRM view uses your existing Contacts, Tags, Notes,
//               Reminders, and Timeline data. Use{" "}
//               <span className="font-semibold text-slate-700">
//                 “Open full CRM”
//               </span>{" "}
//               for a 360° view.
//             </div>
//           )}
//         </div>
//       )}

//       {/* 📌 Inbox Tag Modal (overlay) */}
//       <InboxAddTagModal
//         isOpen={isTagModalOpen}
//         onClose={() => setIsTagModalOpen(false)}
//         contactId={selectedContactId}
//         currentTags={tagsList}
//         onTagAdded={refreshContactSummary}
//       />
//     </div>
//   );
// }

// // 📄 File: src/pages/ChatInbox.jsx

// import React, {
//   useState,
//   useMemo,
//   useCallback,
//   useEffect,
//   useRef,
// } from "react";
// import {
//   Phone,
//   Filter,
//   Search,
//   Clock,
//   CheckCircle2,
//   MessageCircle,
//   Mail,
//   User,
//   ChevronDown,
//   ChevronRight,
//   Check,
//   CheckCheck,
//   AlertCircle,
//   Tag,
//   Bell,
//   Activity,
//   StickyNote,
// } from "lucide-react";
// import axiosClient from "../../api/axiosClient";
// import { toast } from "react-toastify";

// // 🔢 Mock WhatsApp numbers (real API wiring can come later)
// const MOCK_NUMBERS = [
//   { id: "all", label: "All numbers" },
//   { id: "wa-1", label: "+91 98765 43210" },
//   { id: "wa-2", label: "+91 99887 77665" },
// ];

// // 🧠 Tabs for the inbox
// const TABS = [
//   { id: "live", label: "Live (24h)" },
//   { id: "history", label: "Older" },
//   { id: "unassigned", label: "Unassigned" },
//   { id: "my", label: "My Chats" },
// ];

// // Local helper: format dates nicely
// function formatDateTime(value) {
//   if (!value) return "-";
//   const d = new Date(value);
//   if (Number.isNaN(d.getTime())) return String(value);
//   return d.toLocaleString();
// }

// // Local helper: first letter avatar
// function getInitial(name, phone) {
//   const src = name || phone || "?";
//   return src.trim()[0]?.toUpperCase() ?? "?";
// }

// // 🗓 Day label for separators (Today / Yesterday / 12 Dec 2025)
// function formatDayLabel(date) {
//   if (!date || Number.isNaN(date.getTime())) return "";
//   const today = new Date();
//   const todayKey = today.toDateString();

//   const yesterday = new Date();
//   yesterday.setDate(today.getDate() - 1);
//   const yesterdayKey = yesterday.toDateString();

//   const key = date.toDateString();

//   if (key === todayKey) return "Today";
//   if (key === yesterdayKey) return "Yesterday";

//   return date.toLocaleDateString(undefined, {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//   });
// }

// // ✅ Map message status → icon
// function StatusIcon({ status }) {
//   if (!status) return null;
//   const s = String(status).toLowerCase();

//   if (s === "failed" || s === "error") {
//     return (
//       <span className="inline-flex items-center text-[10px] text-rose-200">
//         <AlertCircle className="w-3 h-3 mr-0.5" />
//       </span>
//     );
//   }

//   if (s === "read" || s === "seen" || s === "viewed") {
//     return (
//       <span className="inline-flex items-center text-[10px] text-emerald-200">
//         <CheckCheck className="w-3 h-3 mr-0.5" />
//       </span>
//     );
//   }

//   if (s === "delivered") {
//     return (
//       <span className="inline-flex items-center text-[10px] text-slate-200">
//         <CheckCheck className="w-3 h-3 mr-0.5" />
//       </span>
//     );
//   }

//   if (s === "sent" || s === "sending" || s === "queued") {
//     return (
//       <span className="inline-flex items-center text-[10px] text-slate-200">
//         <Check className="w-3 h-3 mr-0.5" />
//       </span>
//     );
//   }

//   return null;
// }

// export default function ChatInbox() {
//   // 🔹 Filters & selection
//   const [activeTab, setActiveTab] = useState("live");
//   const [selectedNumberId, setSelectedNumberId] = useState("all");
//   const [searchTerm, setSearchTerm] = useState("");

//   // 🔹 Data from backend
//   const [allConversations, setAllConversations] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);

//   // 🔹 Selected conversation & message input
//   const [selectedConversationId, setSelectedConversationId] = useState(null);
//   const [newMessage, setNewMessage] = useState("");

//   // 🔹 Messages for selected conversation
//   const [messages, setMessages] = useState([]);
//   const [isMessagesLoading, setIsMessagesLoading] = useState(false);

//   // 🔹 Sending & assignment state
//   const [isSending, setIsSending] = useState(false);
//   const [isAssigning, setIsAssigning] = useState(false);

//   // 🔹 CRM summary for right panel
//   const [contactSummary, setContactSummary] = useState(null);
//   const [isSummaryLoading, setIsSummaryLoading] = useState(false);

//   // Right panel toggles
//   const [showRightPanel, setShowRightPanel] = useState(true);
//   const [showDetails, setShowDetails] = useState(true);
//   const [showCrmPanel, setShowCrmPanel] = useState(true);

//   // 🔽 Auto-scroll anchor for chat messages
//   const messagesEndRef = useRef(null);

//   const scrollToBottom = useCallback(() => {
//     if (messagesEndRef.current) {
//       messagesEndRef.current.scrollIntoView({
//         behavior: "smooth",
//         block: "end",
//       });
//     }
//   }, []);

//   const currentUserId = useMemo(() => localStorage.getItem("userId"), []);

//   // 🧮 Selected conversation
//   const selectedConversation = useMemo(
//     () => allConversations.find(c => c.id === selectedConversationId) || null,
//     [allConversations, selectedConversationId]
//   );

//   // We also want a stable contactId for effects
//   const selectedContactId = useMemo(
//     () => selectedConversation?.contactId || null,
//     [selectedConversation]
//   );

//   // 🧮 24h window flag
//   const isWithin24h = selectedConversation?.within24h ?? false;

//   // 🧮 Assignment flags for header
//   const headerIsAssigned = !!selectedConversation?.assignedToUserId;
//   const headerIsAssignedToMe =
//     !!selectedConversation?.isAssignedToMe ||
//     (!!selectedConversation?.assignedToUserId &&
//       currentUserId &&
//       selectedConversation.assignedToUserId === currentUserId);
//   const headerAssignedName = headerIsAssignedToMe
//     ? "You"
//     : selectedConversation?.assignedToUserName || "Agent";

//   // 🧮 Filter + sort conversations
//   const filteredConversations = useMemo(() => {
//     let list = [...allConversations];

//     if (selectedNumberId !== "all") {
//       list = list.filter(c => c.numberId === selectedNumberId);
//     }

//     if (searchTerm.trim()) {
//       const q = searchTerm.trim().toLowerCase();
//       list = list.filter(
//         c =>
//           c.contactName?.toLowerCase().includes(q) ||
//           c.contactPhone?.toLowerCase().includes(q) ||
//           c.lastMessagePreview?.toLowerCase().includes(q)
//       );
//     }

//     if (activeTab === "live") {
//       list = list.filter(c => c.within24h);
//     } else if (activeTab === "unassigned") {
//       list = list.filter(c => !c.assignedToUserId);
//     } else if (activeTab === "my") {
//       if (currentUserId) {
//         list = list.filter(c => c.assignedToUserId === currentUserId);
//       }
//     }

//     // 🔽 Sort: unread first, then most recent lastMessageAt
//     list.sort((a, b) => {
//       const aUnread = a.unreadCount > 0;
//       const bUnread = b.unreadCount > 0;

//       if (aUnread && !bUnread) return -1;
//       if (!aUnread && bUnread) return 1;

//       const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
//       const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;

//       return bTime - aTime; // newest first
//     });

//     return list;
//   }, [
//     allConversations,
//     activeTab,
//     selectedNumberId,
//     searchTerm,
//     currentUserId,
//   ]);

//   // 🛰 Load conversations (supports "silent" refresh)
//   const fetchConversations = useCallback(
//     async (options = {}) => {
//       const { limit, silent } = options;

//       try {
//         if (!silent) {
//           setIsLoading(true);
//         }

//         const businessId = localStorage.getItem("businessId");

//         if (!businessId) {
//           toast.error(
//             "❌ Missing business context. Please login again to load inbox."
//           );
//           if (!silent) {
//             setIsLoading(false);
//           }
//           return;
//         }

//         const params = {
//           businessId,
//           currentUserId,
//           tab: activeTab,
//           numberId:
//             selectedNumberId && selectedNumberId !== "all"
//               ? selectedNumberId
//               : undefined,
//           search: searchTerm || undefined,
//           limit: limit ?? 100,
//         };

//         const res = await axiosClient.get("/chat-inbox/conversations", {
//           params,
//         });

//         const apiItems = Array.isArray(res.data) ? res.data : [];

//         const mapped = apiItems.map(item => ({
//           id: item.id,
//           contactId: item.contactId,
//           contactName: item.contactName,
//           contactPhone: item.contactPhone,
//           lastMessagePreview: item.lastMessagePreview,
//           lastMessageAt: item.lastMessageAt,
//           unreadCount: item.unreadCount || 0,
//           status: item.status || "Open",
//           numberId: item.numberId,
//           numberLabel: item.numberLabel,
//           within24h: !!item.within24h,
//           assignedToUserId: item.assignedToUserId || null,
//           assignedToUserName: item.assignedToUserName || null,
//           isAssignedToMe: !!item.isAssignedToMe,
//           sourceType: item.sourceType || "WhatsApp",
//           sourceName: item.sourceName || "WhatsApp",
//           mode: item.mode || "Live",
//           firstSeenAt: item.firstSeenAt,
//           lastInboundAt: item.lastInboundAt,
//           lastOutboundAt: item.lastOutboundAt,
//         }));

//         setAllConversations(mapped);

//         if (!selectedConversationId && mapped.length > 0) {
//           setSelectedConversationId(mapped[0].id);
//         }
//       } catch (error) {
//         console.error("❌ Failed to load inbox conversations:", error);
//         const message =
//           error.response?.data?.message ||
//           "Failed to load inbox conversations.";
//         toast.error(message);
//       } finally {
//         if (!options.silent) {
//           setIsLoading(false);
//         }
//       }
//     },
//     [
//       activeTab,
//       selectedNumberId,
//       searchTerm,
//       selectedConversationId,
//       currentUserId,
//     ]
//   );

//   // Initial + filter-based load
//   useEffect(() => {
//     fetchConversations();
//   }, [activeTab, selectedNumberId, searchTerm, fetchConversations]);

//   // 🔁 Auto-refresh conversations every 25 seconds (silent, no flicker)
//   useEffect(() => {
//     const intervalId = setInterval(() => {
//       fetchConversations({ silent: true, limit: 100 });
//     }, 25000);

//     return () => clearInterval(intervalId);
//   }, [fetchConversations]);

//   // 🛰 Load messages for selected conversation
//   useEffect(() => {
//     const loadMessages = async () => {
//       if (!selectedConversationId) {
//         setMessages([]);
//         return;
//       }

//       const conv = allConversations.find(c => c.id === selectedConversationId);
//       if (!conv) {
//         setMessages([]);
//         return;
//       }

//       const businessId = localStorage.getItem("businessId");
//       if (!businessId) {
//         toast.error(
//           "❌ Missing business context. Please login again to load messages."
//         );
//         return;
//       }

//       try {
//         setIsMessagesLoading(true);

//         const res = await axiosClient.get("/chat-inbox/messages", {
//           params: {
//             businessId,
//             contactPhone: conv.contactPhone,
//             limit: 100,
//           },
//         });

//         const apiItems = Array.isArray(res.data) ? res.data : [];

//         const mapped = apiItems
//           .map(m => {
//             const directionRaw =
//               m.direction ?? m.Direction ?? m.dir ?? m.messageDirection ?? "";
//             const statusRaw = m.status ?? "";

//             const dir = String(directionRaw).toLowerCase();
//             const status = String(statusRaw).toLowerCase();

//             let inferredIsInbound =
//               typeof m.isInbound === "boolean" ? m.isInbound : false;

//             if (typeof m.isInbound !== "boolean") {
//               inferredIsInbound =
//                 dir === "inbound" ||
//                 dir === "in" ||
//                 dir === "incoming" ||
//                 dir === "received" ||
//                 dir === "customer" ||
//                 dir === "from" ||
//                 status === "received" ||
//                 status === "incoming";
//             }

//             return {
//               id: m.id,
//               direction: directionRaw || (inferredIsInbound ? "in" : "out"),
//               isInbound: inferredIsInbound,
//               text: m.text || "",
//               sentAt: m.sentAtUtc || m.sentAt,
//               status: m.status,
//               errorMessage: m.errorMessage,
//             };
//           })
//           .reverse();

//         setMessages(mapped);
//       } catch (error) {
//         console.error("❌ Failed to load messages:", error);
//         const message =
//           error.response?.data?.message || "Failed to load messages.";
//         toast.error(message);
//         setMessages([]);
//       } finally {
//         setIsMessagesLoading(false);
//       }
//     };

//     loadMessages();
//   }, [selectedConversationId, allConversations]);

//   // 🔔 Mark as read when opening a conversation
//   useEffect(() => {
//     if (!selectedConversationId) return;

//     const conv = allConversations.find(c => c.id === selectedConversationId);
//     if (!conv || !conv.contactId) return;

//     const businessId = localStorage.getItem("businessId");
//     const userId = localStorage.getItem("userId");

//     if (!businessId || !userId) return;

//     const payload = {
//       businessId,
//       contactId: conv.contactId,
//       userId,
//     };

//     // Fire-and-forget; we don't block UI on this.
//     axiosClient.post("/chat-inbox/mark-read", payload).catch(err => {
//       console.error("Failed to mark conversation as read:", err);
//     });

//     // Optimistically zero-out unread count in UI
//     setAllConversations(prev =>
//       prev.map(c => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
//     );
//   }, [selectedConversationId, allConversations]);

//   // 🛰 Load CRM contact summary for right panel
//   useEffect(() => {
//     if (!selectedContactId) {
//       setContactSummary(null);
//       return;
//     }

//     let isCancelled = false;

//     const loadSummary = async () => {
//       try {
//         setIsSummaryLoading(true);
//         const res = await axiosClient.get(
//           `/crm/contact-summary/${selectedContactId}`
//         );
//         const payload = res.data?.data ?? res.data;
//         if (!isCancelled) {
//           setContactSummary(payload || null);
//         }
//       } catch (error) {
//         console.error("❌ Failed to load contact summary:", error);
//         if (!isCancelled) {
//           setContactSummary(null);
//         }
//         // We keep this quiet (no toast) to avoid noise when switching chats.
//       } finally {
//         if (!isCancelled) {
//           setIsSummaryLoading(false);
//         }
//       }
//     };

//     loadSummary();

//     return () => {
//       isCancelled = true;
//     };
//   }, [selectedContactId]);

//   // Auto-scroll when messages change
//   useEffect(() => {
//     if (!selectedConversationId) return;
//     if (isMessagesLoading) return;
//     if (messages.length === 0) return;

//     scrollToBottom();
//   }, [messages, isMessagesLoading, selectedConversationId, scrollToBottom]);

//   // 🧮 Messages + date separators
//   const messagesWithSeparators = useMemo(() => {
//     const result = [];
//     let lastDateKey = null;

//     messages.forEach(m => {
//       const dateObj = m.sentAt ? new Date(m.sentAt) : null;
//       const key = dateObj ? dateObj.toDateString() : "unknown";

//       if (key !== lastDateKey) {
//         if (dateObj) {
//           result.push({
//             type: "separator",
//             id: `sep-${key}`,
//             label: formatDayLabel(dateObj),
//           });
//         }
//         lastDateKey = key;
//       }

//       result.push({ type: "message", ...m });
//     });

//     return result;
//   }, [messages]);

//   // 📨 Send message
//   const handleSendMessage = async () => {
//     if (!selectedConversation) {
//       toast.warn("Please select a conversation first.");
//       return;
//     }

//     if (!isWithin24h) {
//       toast.warn(
//         "This chat is outside the 24-hour WhatsApp window. Use a template or campaign to re-engage."
//       );
//       return;
//     }

//     const trimmed = newMessage.trim();
//     if (!trimmed) {
//       toast.warn("Type a message before sending.");
//       return;
//     }

//     const businessId = localStorage.getItem("businessId");
//     if (!businessId) {
//       toast.error("❌ Missing business context. Please login again.");
//       return;
//     }

//     if (isSending) return;

//     const tempId = `temp-${Date.now()}`;
//     const nowIso = new Date().toISOString();

//     const optimisticMsg = {
//       id: tempId,
//       direction: "out",
//       isInbound: false,
//       text: trimmed,
//       sentAt: nowIso,
//       status: "Sending...",
//       errorMessage: null,
//     };

//     setMessages(prev => [...prev, optimisticMsg]);

//     setNewMessage("");
//     setIsSending(true);

//     try {
//       const payload = {
//         businessId,
//         conversationId: selectedConversation.id,
//         contactId: selectedConversation.contactId,
//         to: selectedConversation.contactPhone,
//         text: trimmed,
//         numberId: selectedConversation.numberId,
//       };

//       const res = await axiosClient.post("/chat-inbox/send-message", payload);
//       const saved = res.data || {};

//       const finalSentAt =
//         saved.sentAtUtc || saved.sentAt || optimisticMsg.sentAt;
//       const finalSentAtIso =
//         finalSentAt instanceof Date ? finalSentAt.toISOString() : finalSentAt;

//       // ✅ Update message bubble
//       setMessages(prev =>
//         prev.map(m =>
//           m.id === tempId
//             ? {
//                 id: saved.id ?? tempId,
//                 direction: saved.direction ?? "out",
//                 isInbound:
//                   typeof saved.isInbound === "boolean"
//                     ? saved.isInbound
//                     : false,
//                 text: saved.text ?? trimmed,
//                 sentAt: finalSentAtIso,
//                 status: saved.status || "Sent",
//                 errorMessage: saved.errorMessage || null,
//               }
//             : m
//         )
//       );

//       // ✅ Optimistically update left list preview + timestamps
//       setAllConversations(prev =>
//         prev.map(c =>
//           c.id === selectedConversation.id
//             ? {
//                 ...c,
//                 lastMessagePreview: trimmed,
//                 lastMessageAt: finalSentAtIso,
//                 lastOutboundAt: finalSentAtIso,
//                 within24h: true,
//               }
//             : c
//         )
//       );
//     } catch (error) {
//       console.error("❌ Failed to send message:", error);
//       toast.error(
//         error.response?.data?.message || "Failed to send message. Please retry."
//       );

//       setMessages(prev =>
//         prev.map(m =>
//           m.id === tempId
//             ? {
//                 ...m,
//                 status: "Failed",
//                 errorMessage: "Not delivered",
//               }
//             : m
//         )
//       );
//     } finally {
//       setIsSending(false);
//       scrollToBottom();
//     }
//   };

//   // 👤 Assign conversation to me
//   const handleAssignToMe = async () => {
//     if (!selectedConversation || !selectedConversation.contactId) {
//       toast.warn("Select a conversation before assigning.");
//       return;
//     }

//     const businessId = localStorage.getItem("businessId");
//     const userId = localStorage.getItem("userId");

//     if (!businessId || !userId) {
//       toast.error("Missing business or user context. Please login again.");
//       return;
//     }

//     if (isAssigning) return;

//     setIsAssigning(true);
//     try {
//       const payload = {
//         businessId,
//         contactId: selectedConversation.contactId,
//         userId,
//       };

//       await axiosClient.post("/chat-inbox/assign", payload);

//       // Optimistic local update
//       setAllConversations(prev =>
//         prev.map(c =>
//           c.id === selectedConversation.id
//             ? {
//                 ...c,
//                 assignedToUserId: userId,
//                 assignedToUserName: "You",
//                 isAssignedToMe: true,
//               }
//             : c
//         )
//       );

//       toast.success("Conversation assigned to you.");
//     } catch (error) {
//       console.error("Failed to assign conversation:", error);
//       toast.error(
//         error.response?.data?.message || "Failed to assign conversation."
//       );
//     } finally {
//       setIsAssigning(false);
//     }
//   };

//   // 🚫 Unassign conversation
//   const handleUnassign = async () => {
//     if (!selectedConversation || !selectedConversation.contactId) {
//       toast.warn("Select a conversation before unassigning.");
//       return;
//     }

//     const businessId = localStorage.getItem("businessId");

//     if (!businessId) {
//       toast.error("Missing business context. Please login again.");
//       return;
//     }

//     if (isAssigning) return;

//     setIsAssigning(true);
//     try {
//       const payload = {
//         businessId,
//         contactId: selectedConversation.contactId,
//       };

//       await axiosClient.post("/chat-inbox/unassign", payload);

//       // Optimistic local update
//       setAllConversations(prev =>
//         prev.map(c =>
//           c.id === selectedConversation.id
//             ? {
//                 ...c,
//                 assignedToUserId: null,
//                 assignedToUserName: null,
//                 isAssignedToMe: false,
//               }
//             : c
//         )
//       );

//       toast.info("Conversation unassigned.");
//     } catch (error) {
//       console.error("Failed to unassign conversation:", error);
//       toast.error(
//         error.response?.data?.message || "Failed to unassign conversation."
//       );
//     } finally {
//       setIsAssigning(false);
//     }
//   };

//   const handleComposerKeyDown = event => {
//     if (event.key === "Enter" && !event.shiftKey) {
//       event.preventDefault();
//       if (!isSending && newMessage.trim()) {
//         handleSendMessage();
//       }
//     }
//   };

//   // Small helpers for CRM panel
//   const tagsList =
//     (contactSummary?.tags ??
//       contactSummary?.contactTags ??
//       contactSummary?.contactTagsDto ??
//       []) ||
//     [];

//   const recentNotes = contactSummary?.recentNotes ?? [];
//   const nextReminder = contactSummary?.nextReminder ?? null;
//   const recentTimeline = contactSummary?.recentTimeline ?? [];

//   return (
//     <div className="h-[calc(100vh-64px)] flex bg-slate-50">
//       {/* 📥 Left: Conversations list */}
//       <div className="w-[360px] border-r border-slate-200 flex flex-col">
//         {/* Top filters */}
//         <div className="px-4 py-3 border-b border-slate-200 bg-white flex flex-col gap-3">
//           <div className="flex items-center gap-2">
//             <Phone className="w-4 h-4 text-emerald-600" />
//             <span className="text-sm font-semibold text-slate-800">
//               Chat Inbox
//             </span>
//           </div>

//           {/* Number + tab + search row */}
//           <div className="flex gap-2 items-center">
//             <div className="relative">
//               <select
//                 value={selectedNumberId}
//                 onChange={e => setSelectedNumberId(e.target.value)}
//                 className="appearance-none bg-slate-50 border border-slate-200 text-xs rounded-full pl-3 pr-7 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
//               >
//                 {MOCK_NUMBERS.map(n => (
//                   <option key={n.id} value={n.id}>
//                     {n.label}
//                   </option>
//                 ))}
//               </select>
//               <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
//             </div>

//             <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-full px-2">
//               <Search className="w-3.5 h-3.5 text-slate-400 mr-1" />
//               <input
//                 type="text"
//                 placeholder="Search name, number, message..."
//                 value={searchTerm}
//                 onChange={e => setSearchTerm(e.target.value)}
//                 className="w-full bg-transparent border-none text-xs text-slate-700 focus:outline-none"
//               />
//             </div>
//           </div>

//           {/* Tabs */}
//           <div className="flex items-center gap-3 text-[11px] font-medium">
//             {TABS.map(tab => (
//               <button
//                 key={tab.id}
//                 onClick={() => setActiveTab(tab.id)}
//                 className={`pb-1 border-b-2 transition-colors ${
//                   activeTab === tab.id
//                     ? "border-purple-600 text-purple-700"
//                     : "border-transparent text-slate-500 hover:text-purple-600"
//                 }`}
//               >
//                 {tab.label}
//               </button>
//             ))}

//             <button className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700">
//               <Filter className="w-3 h-3" />
//               More
//             </button>
//           </div>
//         </div>

//         {/* Conversations list */}
//         <div className="flex-1 overflow-y-auto bg-slate-50">
//           {isLoading && (
//             <div className="p-4 text-xs text-slate-500">Loading chats…</div>
//           )}

//           {!isLoading && filteredConversations.length === 0 && (
//             <div className="p-4 text-xs text-slate-400 italic">
//               No conversations found for this filter.
//             </div>
//           )}

//           {filteredConversations.map(conv => (
//             <button
//               key={conv.id}
//               onClick={() => setSelectedConversationId(conv.id)}
//               className={`w-full flex items-start gap-3 px-3 py-2.5 text-left border-b border-slate-100 hover:bg-white transition ${
//                 selectedConversationId === conv.id ? "bg-white" : "bg-slate-50"
//               }`}
//             >
//               {/* Avatar + unread badge */}
//               <div className="relative">
//                 <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-semibold text-emerald-700">
//                   {getInitial(conv.contactName, conv.contactPhone)}
//                 </div>
//                 {conv.unreadCount > 0 && (
//                   <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-semibold rounded-full px-1.5 py-[1px]">
//                     {conv.unreadCount}
//                   </span>
//                 )}
//               </div>

//               {/* Main info */}
//               <div className="flex-1 min-w-0">
//                 <div className="flex items-center justify-between mb-0.5">
//                   <div className="flex flex-col">
//                     <span className="text-xs font-semibold text-slate-800 truncate">
//                       {conv.contactName || conv.contactPhone || "Unknown"}
//                     </span>
//                     <span className="text-[10px] text-slate-400">
//                       {conv.contactPhone}
//                     </span>
//                   </div>
//                   <span className="text-[10px] text-slate-400 ml-2">
//                     {conv.lastMessageAt
//                       ? new Date(conv.lastMessageAt).toLocaleTimeString([], {
//                           hour: "2-digit",
//                           minute: "2-digit",
//                         })
//                       : "-"}
//                   </span>
//                 </div>

//                 <div className="flex items-center justify-between gap-2">
//                   <p className="text-[11px] text-slate-600 truncate pr-4">
//                     {conv.lastMessagePreview || "No recent message"}
//                   </p>

//                   <div className="flex flex-col items-end gap-0.5">
//                     <span
//                       className={`text-[9px] px-1.5 py-[1px] rounded-full border ${
//                         conv.within24h
//                           ? "bg-emerald-50 text-emerald-700 border-emerald-100"
//                           : "bg-slate-50 text-slate-500 border-slate-200"
//                       }`}
//                     >
//                       {conv.within24h ? "24h window" : "Outside 24h"}
//                     </span>
//                     {conv.assignedToUserName && (
//                       <span className="text-[9px] text-slate-400">
//                         👤 {conv.assignedToUserName}
//                       </span>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* 💬 Middle: Chat window */}
//       <div className="flex-1 flex flex-col">
//         {/* Chat header */}
//         <div className="h-[64px] border-b border-slate-200 bg-white flex items-center justify-between px-4">
//           {selectedConversation ? (
//             <>
//               <div className="flex items-center gap-3">
//                 <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-semibold text-emerald-700">
//                   {getInitial(
//                     selectedConversation.contactName,
//                     selectedConversation.contactPhone
//                   )}
//                 </div>
//                 <div>
//                   <div className="flex items-center gap-2">
//                     <span className="text-sm font-semibold text-slate-800">
//                       {selectedConversation.contactName ||
//                         selectedConversation.contactPhone}
//                     </span>
//                     <span className="text-[11px] text-slate-400">
//                       {selectedConversation.contactPhone}
//                     </span>
//                   </div>
//                   <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
//                     <span className="flex items-center gap-1">
//                       <Clock className="w-3 h-3" />
//                       {selectedConversation.lastInboundAt
//                         ? formatDateTime(selectedConversation.lastInboundAt)
//                         : "Last inbound: -"}
//                     </span>
//                     <span className="flex items-center gap-1">
//                       <CheckCircle2 className="w-3 h-3" />
//                       {selectedConversation.status || "Open"}
//                     </span>
//                     <span
//                       className={`inline-flex items-center gap-1 px-2 py-[1px] rounded-full text-[10px] border ${
//                         isWithin24h
//                           ? "bg-emerald-50 text-emerald-700 border-emerald-200"
//                           : "bg-slate-50 text-slate-500 border-slate-200"
//                       }`}
//                     >
//                       <Clock className="w-3 h-3" />
//                       {isWithin24h ? "Within 24h" : "Outside 24h"}
//                     </span>
//                     <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
//                       <User className="w-3 h-3" />
//                       {headerIsAssigned
//                         ? headerIsAssignedToMe
//                           ? "Assigned to you"
//                           : `Assigned to ${headerAssignedName}`
//                         : "Unassigned"}
//                     </span>
//                   </div>
//                 </div>
//               </div>

//               <div className="flex items-center gap-2 text-[11px] text-slate-500">
//                 <span className="flex items-center gap-1">
//                   <MessageCircle className="w-3 h-3" />
//                   {selectedConversation.sourceName || "WhatsApp"}
//                 </span>
//                 <span className="flex items-center gap-1">
//                   <Mail className="w-3 h-3" />
//                   {selectedConversation.mode || "Live"}
//                 </span>

//                 {/* Assignment actions */}
//                 {!headerIsAssigned && currentUserId && (
//                   <button
//                     onClick={handleAssignToMe}
//                     disabled={isAssigning}
//                     className={`ml-2 px-2 py-[2px] rounded-full border text-[11px] ${
//                       isAssigning
//                         ? "border-emerald-300 text-emerald-400 cursor-wait"
//                         : "border-emerald-500 text-emerald-600 hover:bg-emerald-50"
//                     }`}
//                   >
//                     {isAssigning ? "Assigning…" : "Assign to me"}
//                   </button>
//                 )}

//                 {headerIsAssignedToMe && (
//                   <button
//                     onClick={handleUnassign}
//                     disabled={isAssigning}
//                     className={`ml-1 px-2 py-[2px] rounded-full border text-[11px] ${
//                       isAssigning
//                         ? "border-slate-300 text-slate-400 cursor-wait"
//                         : "border-slate-300 text-slate-600 hover:bg-slate-50"
//                     }`}
//                   >
//                     {isAssigning ? "Updating…" : "Unassign"}
//                   </button>
//                 )}

//                 <button
//                   onClick={() => setShowRightPanel(v => !v)}
//                   className="ml-2 text-xs text-purple-600 hover:text-purple-700"
//                 >
//                   {showRightPanel ? "Hide details" : "Show details"}
//                 </button>
//               </div>
//             </>
//           ) : (
//             <div className="text-xs text-slate-400">
//               Select a conversation to start chatting.
//             </div>
//           )}
//         </div>

//         {/* Chat messages area */}
//         <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-3">
//           {!selectedConversation && (
//             <div className="h-full flex items-center justify-center text-xs text-slate-400">
//               No conversation selected.
//             </div>
//           )}

//           {selectedConversation && (
//             <div className="flex flex-col gap-2 text-xs">
//               {isMessagesLoading && (
//                 <div className="text-slate-400">Loading messages…</div>
//               )}

//               {!isMessagesLoading && messages.length === 0 && (
//                 <div className="text-slate-400 italic">
//                   No messages yet for this contact.
//                 </div>
//               )}

//               {!isMessagesLoading &&
//                 messagesWithSeparators.length > 0 &&
//                 messagesWithSeparators.map(item => {
//                   if (item.type === "separator") {
//                     return (
//                       <div key={item.id} className="flex justify-center my-2">
//                         <span className="px-3 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-500">
//                           {item.label}
//                         </span>
//                       </div>
//                     );
//                   }

//                   const msg = item;
//                   const isInbound = !!msg.isInbound;

//                   return (
//                     <div
//                       key={msg.id}
//                       className={`flex ${
//                         isInbound ? "justify-start" : "justify-end"
//                       }`}
//                     >
//                       <div
//                         className={`max-w-[70%] rounded-lg px-3 py-2 shadow-sm ${
//                           isInbound
//                             ? "bg-white text-slate-800"
//                             : "bg-purple-600 text-white"
//                         }`}
//                       >
//                         <div className="whitespace-pre-wrap break-words">
//                           {msg.text || "-"}
//                         </div>
//                         <div className="mt-1 text-[10px] opacity-75 flex items-center justify-end gap-1">
//                           {msg.sentAt &&
//                             new Date(msg.sentAt).toLocaleTimeString([], {
//                               hour: "2-digit",
//                               minute: "2-digit",
//                             })}
//                           <StatusIcon status={msg.status} />
//                           {msg.status && <span>{msg.status}</span>}
//                         </div>
//                         {msg.errorMessage && (
//                           <div className="mt-0.5 text-[10px] text-rose-200">
//                             {msg.errorMessage}
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   );
//                 })}

//               <div ref={messagesEndRef} />
//             </div>
//           )}
//         </div>

//         {/* Chat input */}
//         <div className="border-t border-slate-200 bg-white px-4 py-3">
//           {selectedConversation && !isWithin24h && (
//             <div className="text-[11px] text-amber-600 mb-2">
//               This conversation is{" "}
//               <span className="font-semibold">outside</span> the 24-hour
//               WhatsApp window. Free-form replies are disabled here. Use approved
//               templates (campaigns / flows) to re-engage.
//             </div>
//           )}

//           <div className="flex items-center gap-2">
//             <textarea
//               rows={1}
//               value={newMessage}
//               onChange={e => setNewMessage(e.target.value)}
//               onKeyDown={handleComposerKeyDown}
//               placeholder={
//                 selectedConversation
//                   ? isWithin24h
//                     ? "Type a reply…"
//                     : "24h window expired – send via template campaign."
//                   : "Select a conversation first."
//               }
//               disabled={!selectedConversation || !isWithin24h || isSending}
//               className={`flex-1 resize-none border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 ${
//                 !selectedConversation || !isWithin24h
//                   ? "bg-slate-50 text-slate-400 cursor-not-allowed"
//                   : "bg-white"
//               }`}
//             />
//             <button
//               onClick={handleSendMessage}
//               disabled={
//                 isSending ||
//                 !newMessage.trim() ||
//                 !selectedConversation ||
//                 !isWithin24h
//               }
//               className={`bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm ${
//                 isSending ||
//                 !newMessage.trim() ||
//                 !selectedConversation ||
//                 !isWithin24h
//                   ? "opacity-60 cursor-not-allowed"
//                   : "hover:bg-purple-700"
//               }`}
//             >
//               {isSending ? "Sending..." : "Send"}
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* 📇 Right: CRM + details */}
//       {showRightPanel && (
//         <div className="w-80 border-l border-slate-200 bg-white flex flex-col">
//           {/* Top section: summary */}
//           <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
//             <div className="flex items-center gap-2">
//               <User className="w-4 h-4 text-slate-500" />
//               <span className="text-xs font-semibold text-slate-800">
//                 Contact & CRM
//               </span>
//             </div>
//             <button
//               onClick={() => setShowDetails(v => !v)}
//               className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1"
//             >
//               {showDetails ? "Hide" : "Show"}
//               {showDetails ? (
//                 <ChevronDown className="w-3 h-3" />
//               ) : (
//                 <ChevronRight className="w-3 h-3" />
//               )}
//             </button>
//           </div>

//           {/* Contact + CRM summary */}
//           {showDetails && (
//             <div className="p-4 text-xs text-slate-600 space-y-3 overflow-y-auto">
//               {selectedConversation ? (
//                 <>
//                   {/* Basic identity */}
//                   <div>
//                     <div className="font-semibold text-slate-800 mb-0.5">
//                       {selectedConversation.contactName ||
//                         selectedConversation.contactPhone ||
//                         "Unknown contact"}
//                     </div>
//                     <div className="text-slate-500">
//                       {selectedConversation.contactPhone}
//                     </div>
//                     {contactSummary?.leadSource && (
//                       <div className="text-[11px] text-slate-400 mt-0.5">
//                         Lead source:{" "}
//                         <span className="text-slate-600">
//                           {contactSummary.leadSource}
//                         </span>
//                       </div>
//                     )}
//                   </div>

//                   {/* High-level stats */}
//                   <div className="grid grid-cols-2 gap-2 text-[11px]">
//                     <div className="bg-slate-50 rounded-md p-2">
//                       <div className="text-slate-400">First seen</div>
//                       <div className="font-medium">
//                         {formatDateTime(selectedConversation.firstSeenAt)}
//                       </div>
//                     </div>
//                     <div className="bg-slate-50 rounded-md p-2">
//                       <div className="text-slate-400">Last inbound</div>
//                       <div className="font-medium">
//                         {formatDateTime(selectedConversation.lastInboundAt)}
//                       </div>
//                     </div>
//                     <div className="bg-slate-50 rounded-md p-2">
//                       <div className="text-slate-400">Last outbound</div>
//                       <div className="font-medium">
//                         {formatDateTime(selectedConversation.lastOutboundAt)}
//                       </div>
//                     </div>
//                     <div className="bg-slate-50 rounded-md p-2">
//                       <div className="text-slate-400">Status</div>
//                       <div className="font-medium">
//                         {selectedConversation.status || "Open"}
//                       </div>
//                     </div>
//                   </div>

//                   {/* Divider */}
//                   <div className="h-px bg-slate-200 my-2" />

//                   {/* CRM summary details */}
//                   {isSummaryLoading && (
//                     <div className="text-[11px] text-slate-400">
//                       Loading CRM data…
//                     </div>
//                   )}

//                   {!isSummaryLoading && !contactSummary && (
//                     <div className="text-[11px] text-slate-400 italic">
//                       No CRM data yet. Add a note or reminder from the CRM
//                       workspace to enrich this contact.
//                     </div>
//                   )}

//                   {!isSummaryLoading && contactSummary && (
//                     <>
//                       {/* Tags */}
//                       <div>
//                         <div className="flex items-center justify-between mb-1">
//                           <div className="flex items-center gap-1">
//                             <Tag className="w-3 h-3 text-slate-400" />
//                             <span className="font-semibold text-[11px] text-slate-700">
//                               Tags
//                             </span>
//                           </div>
//                         </div>
//                         <div className="flex flex-wrap gap-1">
//                           {tagsList.length > 0 ? (
//                             tagsList.map((tag, index) => (
//                               <span
//                                 key={index}
//                                 className="px-2 py-0.5 text-[10px] rounded-full font-medium border border-slate-200"
//                                 style={{
//                                   backgroundColor: tag.colorHex || "#EEF2FF",
//                                 }}
//                               >
//                                 {tag.tagName || tag.name || "Tag"}
//                               </span>
//                             ))
//                           ) : (
//                             <span className="text-[11px] text-slate-400">
//                               No tags yet.
//                             </span>
//                           )}
//                         </div>
//                       </div>

//                       {/* Next reminder */}
//                       <div>
//                         <div className="flex items-center justify-between mb-1">
//                           <div className="flex items-center gap-1">
//                             <Bell className="w-3 h-3 text-slate-400" />
//                             <span className="font-semibold text-[11px] text-slate-700">
//                               Next reminder
//                             </span>
//                           </div>
//                         </div>
//                         {nextReminder ? (
//                           <div className="bg-amber-50 border border-amber-100 rounded-md p-2">
//                             <div className="flex items-center justify-between">
//                               <span className="text-[11px] font-semibold text-amber-800">
//                                 {nextReminder.title}
//                               </span>
//                               <span className="text-[10px] text-amber-700">
//                                 {formatDateTime(nextReminder.dueAt)}
//                               </span>
//                             </div>
//                             {nextReminder.description && (
//                               <div className="mt-0.5 text-[11px] text-amber-900">
//                                 {nextReminder.description}
//                               </div>
//                             )}
//                             {nextReminder.status && (
//                               <div className="mt-0.5 text-[10px] text-amber-700">
//                                 Status: {nextReminder.status}
//                               </div>
//                             )}
//                           </div>
//                         ) : (
//                           <span className="text-[11px] text-slate-400">
//                             No upcoming reminder for this contact.
//                           </span>
//                         )}
//                       </div>

//                       {/* Recent notes */}
//                       <div>
//                         <div className="flex items-center justify-between mb-1">
//                           <div className="flex items-center gap-1">
//                             <StickyNote className="w-3 h-3 text-slate-400" />
//                             <span className="font-semibold text-[11px] text-slate-700">
//                               Recent notes
//                             </span>
//                           </div>
//                         </div>
//                         {recentNotes.length > 0 ? (
//                           <div className="space-y-1.5">
//                             {recentNotes.map(note => (
//                               <div
//                                 key={note.id}
//                                 className="bg-slate-50 border border-slate-100 rounded-md p-2"
//                               >
//                                 <div className="text-[11px] text-slate-700">
//                                   {note.content || note.text || "(no content)"}
//                                 </div>
//                                 <div className="mt-0.5 text-[10px] text-slate-400 flex justify-between">
//                                   <span>
//                                     {note.createdByName ||
//                                       note.createdBy ||
//                                       "Agent"}
//                                   </span>
//                                   <span>
//                                     {note.createdAt
//                                       ? new Date(
//                                           note.createdAt
//                                         ).toLocaleString()
//                                       : ""}
//                                   </span>
//                                 </div>
//                               </div>
//                             ))}
//                           </div>
//                         ) : (
//                           <span className="text-[11px] text-slate-400">
//                             No notes yet.
//                           </span>
//                         )}
//                       </div>

//                       {/* Recent timeline */}
//                       <div>
//                         <div className="flex items-center justify-between mb-1">
//                           <div className="flex items-center gap-1">
//                             <Activity className="w-3 h-3 text-slate-400" />
//                             <span className="font-semibold text-[11px] text-slate-700">
//                               Recent activity
//                             </span>
//                           </div>
//                         </div>
//                         {recentTimeline.length > 0 ? (
//                           <div className="space-y-1.5">
//                             {recentTimeline.map(event => (
//                               <div
//                                 key={event.id}
//                                 className="bg-slate-50 border border-slate-100 rounded-md p-2"
//                               >
//                                 <div className="text-[11px] text-slate-700">
//                                   {event.title ||
//                                     event.shortDescription ||
//                                     event.description ||
//                                     "Activity"}
//                                 </div>
//                                 <div className="mt-0.5 text-[10px] text-slate-400 flex justify-between">
//                                   <span>
//                                     {event.source ||
//                                       event.category ||
//                                       event.eventType ||
//                                       ""}
//                                   </span>
//                                   <span>
//                                     {event.createdAt
//                                       ? new Date(
//                                           event.createdAt
//                                         ).toLocaleString()
//                                       : ""}
//                                   </span>
//                                 </div>
//                               </div>
//                             ))}
//                           </div>
//                         ) : (
//                           <span className="text-[11px] text-slate-400">
//                             No recent activity logged yet.
//                           </span>
//                         )}
//                       </div>
//                     </>
//                   )}
//                 </>
//               ) : (
//                 <div className="text-slate-400 italic">
//                   Select a conversation to see CRM info.
//                 </div>
//               )}
//             </div>
//           )}

//           {/* CRM panel placeholder / footer */}
//           {showCrmPanel && (
//             <div className="border-t border-slate-200 p-3 text-[11px] text-slate-500">
//               This mini-CRM view uses your existing Contacts, Tags, Notes,
//               Reminders, and Timeline data. A dedicated full CRM workspace can
//               later reuse the same summary component for deeper editing.
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// // 📄 src/pages/chatInbox/ChatInbox.jsx
// import React, { useState, useMemo } from "react";
// import { ConversationList } from "./components/ConversationList";
// import { ChatHeader } from "./components/ChatHeader";
// import { MessageList } from "./components/MessageList";
// import { MessageComposer } from "./components/MessageComposer";
// import { ContactDetailsPanel } from "./components/ContactDetailsPanel";
// import { EmptyState } from "./components/EmptyState";

// // 💡 Mock numbers – later from API
// const MOCK_NUMBERS = [
//   { id: "wa-num-1", displayPhoneNumber: "+91 89740 05240", label: "Sales" },
//   { id: "wa-num-2", displayPhoneNumber: "+91 98765 43210", label: "Support" },
// ];

// // 💡 Mock conversations shaped close to backend contract
// const INITIAL_CONVERSATIONS = [
//   {
//     id: "conv-1",
//     contactName: "Rahul Sharma",
//     contactPhone: "+91 98765 11111",
//     lastMessagePreview: "Hi, I want to know the price of hair oil.",
//     lastMessageAt: "2025-11-25T10:31:00Z",
//     unreadCount: 2,
//     status: "New",
//     numberId: "wa-num-1",
//     numberLabel: "Sales",
//     within24h: true,
//     assignedToUserId: null,
//     assignedToUserName: null,
//     isAssignedToMe: false,
//     mode: "automation",
//     sourceType: "AutoReply",
//     sourceName: "Hair Oil Pricing",
//     firstSeenAt: "2025-11-25T10:29:00Z",
//     totalMessages: 3,
//     lastAgentReplyAt: null,
//     lastAutomationAt: "2025-11-25T10:32:00Z",
//   },
//   {
//     id: "conv-2",
//     contactName: "Neha Gupta",
//     contactPhone: "+91 98765 22222",
//     lastMessagePreview: "Thanks, I will place the order.",
//     lastMessageAt: "2025-11-25T09:50:00Z",
//     unreadCount: 0,
//     status: "Open",
//     numberId: "wa-num-1",
//     numberLabel: "Sales",
//     within24h: true,
//     assignedToUserId: "me",
//     assignedToUserName: "You",
//     isAssignedToMe: true,
//     mode: "agent",
//     sourceType: "Campaign",
//     sourceName: "Diwali Blast – Hair Oil",
//     firstSeenAt: "2025-11-24T18:00:00Z",
//     totalMessages: 5,
//     lastAgentReplyAt: "2025-11-25T09:50:00Z",
//     lastAutomationAt: "2025-11-24T18:01:00Z",
//   },
//   {
//     id: "conv-3",
//     contactName: "Rohan Verma",
//     contactPhone: "+91 98765 33333",
//     lastMessagePreview: "Is cash on delivery available?",
//     lastMessageAt: "2025-11-25T09:05:00Z",
//     unreadCount: 1,
//     status: "Pending",
//     numberId: "wa-num-2",
//     numberLabel: "Support",
//     within24h: false,
//     assignedToUserId: "u-priya",
//     assignedToUserName: "Priya",
//     isAssignedToMe: false,
//     mode: "automation",
//     sourceType: "Manual",
//     sourceName: null,
//     firstSeenAt: "2025-11-23T12:20:00Z",
//     totalMessages: 9,
//     lastAgentReplyAt: "2025-11-24T11:10:00Z",
//     lastAutomationAt: "2025-11-25T08:55:00Z",
//   },
// ];

// // 💡 Mock messages
// const MOCK_MESSAGES_BY_CONV = {
//   "conv-2": [
//     {
//       id: "m1",
//       direction: "in",
//       text: "Hi, is the hair oil still available?",
//       sentAt: "2025-11-24T18:00:00Z",
//     },
//     {
//       id: "m2",
//       direction: "automation",
//       text: "Automation • Campaign: Diwali Blast – Hair Oil (template sent)",
//       sentAt: "2025-11-24T18:01:00Z",
//     },
//     {
//       id: "m3",
//       direction: "out",
//       senderName: "You",
//       text: "Yes, it is in stock. You can place your order anytime.",
//       sentAt: "2025-11-24T18:05:00Z",
//     },
//     {
//       id: "m4",
//       direction: "in",
//       text: "Thanks, I will place the order.",
//       sentAt: "2025-11-25T09:50:00Z",
//     },
//   ],
//   // other conversations omitted for brevity…
// };

// function ChatInbox() {
//   const [activeTab, setActiveTab] = useState("live"); // live | history | unassigned | my
//   const [selectedNumberId, setSelectedNumberId] = useState("all");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedConversationId, setSelectedConversationId] = useState(
//     INITIAL_CONVERSATIONS[1]?.id ?? null
//   );
//   const [allConversations, setAllConversations] = useState(
//     INITIAL_CONVERSATIONS
//   );

//   // 🔢 Tab counters – from ALL conversations
//   const tabCounts = useMemo(
//     () => ({
//       live: allConversations.filter(c => c.within24h).length,
//       history: allConversations.filter(c => !c.within24h).length,
//       unassigned: allConversations.filter(
//         c => !c.assignedToUserId && !c.assignedToUserName
//       ).length,
//       my: allConversations.filter(c => c.isAssignedToMe).length,
//     }),
//     [allConversations]
//   );

//   // Filtered list for left column
//   const conversations = useMemo(() => {
//     let list = [...allConversations];

//     if (selectedNumberId !== "all") {
//       list = list.filter(c => c.numberId === selectedNumberId);
//     }

//     if (activeTab === "live") {
//       list = list.filter(c => c.within24h);
//     } else if (activeTab === "history") {
//       list = list.filter(c => !c.within24h);
//     } else if (activeTab === "unassigned") {
//       list = list.filter(c => !c.assignedToUserId && !c.assignedToUserName);
//     } else if (activeTab === "my") {
//       list = list.filter(c => c.isAssignedToMe);
//     }

//     if (searchTerm.trim()) {
//       const term = searchTerm.toLowerCase();
//       list = list.filter(
//         c =>
//           c.contactName.toLowerCase().includes(term) ||
//           c.contactPhone.toLowerCase().includes(term) ||
//           c.lastMessagePreview.toLowerCase().includes(term)
//       );
//     }

//     return list;
//   }, [activeTab, selectedNumberId, searchTerm, allConversations]);

//   const selectedConversation = useMemo(
//     () => allConversations.find(c => c.id === selectedConversationId) || null,
//     [allConversations, selectedConversationId]
//   );

//   const messages =
//     (selectedConversation && MOCK_MESSAGES_BY_CONV[selectedConversation.id]) ||
//     [];

//   // === Actions (later go to API) ===

//   const handleSendMessage = text => {
//     if (!selectedConversation) return;
//     console.log("Send free-form message", {
//       convId: selectedConversation.id,
//       text,
//     });
//   };

//   const handleSendTemplate = () => {
//     if (!selectedConversation) return;
//     console.log("Open template picker for conv", selectedConversation.id);
//   };

//   const handleAssignToMe = () => {
//     if (!selectedConversation) return;
//     setAllConversations(prev =>
//       prev.map(c =>
//         c.id === selectedConversation.id
//           ? {
//               ...c,
//               assignedToUserId: "me",
//               assignedToUserName: "You",
//               isAssignedToMe: true,
//               status: c.status === "New" ? "Open" : c.status,
//             }
//           : c
//       )
//     );
//   };

//   const handleToggleMode = () => {
//     if (!selectedConversation) return;
//     setAllConversations(prev =>
//       prev.map(c =>
//         c.id === selectedConversation.id
//           ? {
//               ...c,
//               mode: c.mode === "automation" ? "agent" : "automation",
//             }
//           : c
//       )
//     );
//   };

//   return (
//     <div className="h-full flex flex-col p-4 space-y-4">
//       {/* Page title */}
//       <div>
//         <h1 className="text-2xl font-semibold text-gray-900">Inbox</h1>
//         <p className="text-sm text-gray-500">
//           Respond to WhatsApp messages, manage assignments, and track windows.
//         </p>
//       </div>

//       {/* Main 3-column layout */}
//       <div className="flex flex-1 gap-4 min-h-0">
//         {/* Left – Conversation list */}
//         <ConversationList
//           activeTab={activeTab}
//           onTabChange={setActiveTab}
//           tabCounts={tabCounts}
//           numbers={MOCK_NUMBERS}
//           selectedNumberId={selectedNumberId}
//           onNumberChange={setSelectedNumberId}
//           conversations={conversations}
//           selectedConversationId={selectedConversationId}
//           onSelectConversation={setSelectedConversationId}
//           searchTerm={searchTerm}
//           onSearchChange={setSearchTerm}
//         />

//         {/* Middle – Chat panel */}
//         <div className="flex flex-col flex-[2] bg-white rounded-2xl shadow-sm border border-gray-200 min-w-0">
//           {selectedConversation ? (
//             <>
//               <ChatHeader
//                 conversation={selectedConversation}
//                 onAssignToMe={handleAssignToMe}
//                 onToggleMode={handleToggleMode}
//               />
//               <MessageList messages={messages} />
//               <MessageComposer
//                 canSendFreeForm={selectedConversation.within24h}
//                 onSend={handleSendMessage}
//                 onSendTemplate={handleSendTemplate}
//               />
//             </>
//           ) : (
//             <EmptyState />
//           )}
//         </div>

//         {/* Right – Contact / context panel */}
//         <ContactDetailsPanel conversation={selectedConversation} />
//       </div>
//     </div>
//   );
// }

// export default ChatInbox;
