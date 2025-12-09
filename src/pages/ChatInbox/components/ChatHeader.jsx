// 📄 src/pages/chatInbox/components/ChatHeader.jsx
import React from "react";
import {
  Phone,
  MoreVertical,
  ShieldCheck,
  UserCheck,
  Bot,
  User,
  Clock,
} from "lucide-react";

export function ChatHeader({ conversation, onAssignToMe, onToggleMode }) {
  if (!conversation) return null;

  const isUnassigned =
    !conversation.assignedToUserId && !conversation.assignedToUserName;
  const isAssignedToMe = conversation.isAssignedToMe;
  const isAutomation = conversation.mode === "automation";
  const within24h = conversation.within24h;

  return (
    <div className="border-b border-gray-100 px-4 py-3 flex flex-col gap-2">
      {/* Top row: contact name + channel badge + phone */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900 truncate">
              {conversation.contactName}
            </h2>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
              WhatsApp
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
            <span className="inline-flex items-center gap-1 truncate">
              <Phone size={12} /> {conversation.contactPhone}
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <ShieldCheck size={12} />
              Customer
            </span>
          </div>
        </div>

        <button
          type="button"
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
        >
          <MoreVertical size={16} />
        </button>
      </div>

      {/* Second row: grouped chips */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px]">
        {/* Group 1: channel & line */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[10px] text-gray-700 border border-gray-100">
            <Bot size={12} className="mr-1 text-gray-500" />
            WhatsApp line
          </span>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700">
            {conversation.numberLabel || "Default line"}
          </span>
        </div>

        {/* Group 2: assignment + mode */}
        <div className="flex items-center gap-3">
          {/* Assignment chip + button */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700">
              <UserCheck size={12} className="mr-1 text-gray-500" />
              {isUnassigned
                ? "Unassigned"
                : isAssignedToMe
                ? "Assigned to you"
                : `Assigned to: ${conversation.assignedToUserName}`}
            </span>

            {isUnassigned && (
              <button
                type="button"
                onClick={onAssignToMe}
                className="inline-flex items-center rounded-full bg-emerald-500 text-white px-3 py-1 text-[11px] font-medium hover:bg-emerald-600"
              >
                <User size={12} className="mr-1" />
                Assign to me
              </button>
            )}
          </div>

          {/* Mode pill + toggle */}
          <div className="flex items-center gap-2">
            <span
              className={
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] border " +
                (isAutomation
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-emerald-600 text-white border-emerald-600")
              }
            >
              {isAutomation ? (
                <>
                  <Bot size={12} className="mr-1" /> Automation
                </>
              ) : (
                <>
                  <User size={12} className="mr-1" /> Agent
                </>
              )}
            </span>

            <button
              type="button"
              onClick={onToggleMode}
              className="inline-flex items-center text-[11px] text-purple-600 hover:text-purple-700 underline-offset-2 hover:underline"
            >
              {isAutomation ? (
                <>Take over as agent</>
              ) : (
                <>Return to automation</>
              )}
            </button>
          </div>
        </div>

        {/* Group 3: 24h service window */}
        <div className="flex items-center gap-2">
          <span
            className={
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] border " +
              (within24h
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-amber-50 text-amber-700 border-amber-200")
            }
          >
            <Clock
              size={12}
              className={
                within24h ? "mr-1 text-emerald-500" : "mr-1 text-amber-500"
              }
            />
            {within24h
              ? "Within 24h service window"
              : "24h service window expired"}
          </span>
        </div>
      </div>
    </div>
  );
}

// // 📄 src/pages/chatInbox/components/ChatHeader.jsx
// import React from "react";
// import {
//   Phone,
//   MoreVertical,
//   ShieldCheck,
//   UserCheck,
//   Bot,
//   User,
// } from "lucide-react";

// export function ChatHeader({ conversation, onAssignToMe, onToggleMode }) {
//   if (!conversation) return null;

//   const isUnassigned =
//     !conversation.assignedToUserId && !conversation.assignedToUserName;
//   const isAssignedToMe = conversation.isAssignedToMe;
//   const isAutomation = conversation.mode === "automation";

//   return (
//     <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
//       {/* Left – contact + line */}
//       <div className="flex items-center gap-3">
//         <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-xs font-semibold text-white">
//           {conversation.contactName?.[0] || "?"}
//         </div>
//         <div>
//           <div className="flex items-center gap-2">
//             <h2 className="text-sm font-semibold text-gray-900">
//               {conversation.contactName}
//             </h2>
//             <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
//               WhatsApp
//             </span>
//           </div>
//           <div className="flex items-center gap-3 text-[11px] text-gray-500">
//             <span className="inline-flex items-center gap-1">
//               <Phone size={12} /> {conversation.contactPhone}
//             </span>
//             <span className="inline-flex items-center gap-1">
//               <ShieldCheck size={12} className="text-emerald-500" />
//               {conversation.numberLabel} line
//             </span>
//           </div>
//         </div>
//       </div>

//       {/* Right – grouped chips */}
//       <div className="flex items-center gap-4 text-[11px]">
//         {/* Group 1: assignment */}
//         <div className="flex items-center gap-2">
//           <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700">
//             <UserCheck size={12} className="mr-1 text-gray-500" />
//             {isUnassigned
//               ? "Unassigned"
//               : isAssignedToMe
//               ? "Assigned to you"
//               : `Assigned to: ${conversation.assignedToUserName}`}
//           </span>

//           {isUnassigned && (
//             <button
//               onClick={onAssignToMe}
//               className="inline-flex items-center rounded-full bg-emerald-500 text-white px-3 py-1 text-[11px] font-medium hover:bg-emerald-600"
//             >
//               <User size={12} className="mr-1" />
//               Assign to me
//             </button>
//           )}
//         </div>

//         {/* Group 2: mode (automation / agent) */}
//         <div className="flex items-center gap-2">
//           <span
//             className={
//               "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] border " +
//               (isAutomation
//                 ? "bg-emerald-50 text-emerald-700 border-emerald-100"
//                 : "bg-emerald-600 text-white border-emerald-600")
//             }
//           >
//             {isAutomation ? (
//               <>
//                 <Bot size={12} className="mr-1" /> Automation
//               </>
//             ) : (
//               <>
//                 <User size={12} className="mr-1" /> Agent
//               </>
//             )}
//           </span>

//           {isAssignedToMe && (
//             <button
//               onClick={onToggleMode}
//               className="inline-flex items-center rounded-full border border-emerald-200 px-2 py-0.5 text-[10px] text-emerald-700 hover:bg-emerald-50"
//             >
//               <Bot size={11} className="mr-1" />
//               {isAutomation ? "Take over (pause bot)" : "Back to automation"}
//             </button>
//           )}
//         </div>

//         {/* Group 3: 24h window */}
//         <span
//           className={
//             "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] border " +
//             (conversation.within24h
//               ? "bg-green-50 text-green-700 border-green-100"
//               : "bg-amber-50 text-amber-700 border-amber-100")
//           }
//         >
//           {conversation.within24h ? "Within 24h window" : "24h window expired"}
//         </span>

//         <button className="rounded-full border border-gray-200 p-1.5 hover:bg-gray-50">
//           <MoreVertical size={16} className="text-gray-500" />
//         </button>
//       </div>
//     </div>
//   );
// }

// // 📄 src/pages/chatInbox/components/ChatHeader.jsx
// import React from "react";
// import {
//   Phone,
//   MoreVertical,
//   ShieldCheck,
//   UserCheck,
//   Bot,
//   User,
// } from "lucide-react";

// export function ChatHeader({ conversation, onAssignToMe, onToggleMode }) {
//   if (!conversation) return null;

//   const isUnassigned = !conversation.assignedToName;
//   const isAssignedToMe = conversation.assignedToMe;
//   const isAutomation = conversation.mode === "automation";

//   return (
//     <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
//       {/* Left side – contact & number */}
//       <div className="flex items-center gap-3">
//         <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-500 to-indigo-500 flex items-center justify-center text-xs font-semibold text-white">
//           {conversation.contactName?.[0] || "?"}
//         </div>
//         <div>
//           <div className="flex items-center gap-2">
//             <h2 className="text-sm font-semibold text-gray-900">
//               {conversation.contactName}
//             </h2>
//             <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
//               WhatsApp
//             </span>
//           </div>
//           <div className="flex items-center gap-3 text-[11px] text-gray-500">
//             <span className="inline-flex items-center gap-1">
//               <Phone size={12} /> {conversation.contactPhone}
//             </span>
//             <span className="inline-flex items-center gap-1">
//               <ShieldCheck size={12} className="text-purple-500" />
//               {conversation.numberLabel} line
//             </span>
//           </div>
//         </div>
//       </div>

//       {/* Right side – assignment, mode, window, menu */}
//       <div className="flex items-center gap-3 text-[11px]">
//         {/* Assignment pill */}
//         <div className="flex items-center gap-2">
//           <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700">
//             <UserCheck size={12} className="mr-1 text-gray-500" />
//             {isUnassigned
//               ? "Unassigned"
//               : isAssignedToMe
//               ? "Assigned to you"
//               : `Assigned to: ${conversation.assignedToName}`}
//           </span>

//           {isUnassigned && (
//             <button
//               onClick={onAssignToMe}
//               className="inline-flex items-center rounded-full bg-emerald-500 text-white px-3 py-1 text-[11px] font-medium hover:bg-emerald-600"
//             >
//               <User size={12} className="mr-1" />
//               Assign to me
//             </button>
//           )}
//         </div>

//         {/* Mode pill + toggle */}
//         <div className="flex items-center gap-1">
//           <span
//             className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] border ${
//               isAutomation
//                 ? "bg-emerald-50 text-emerald-700 border-emerald-100"
//                 : "bg-emerald-600 text-white border-emerald-600"
//             }`}
//           >
//             {isAutomation ? (
//               <>
//                 <Bot size={12} className="mr-1" /> Automation
//               </>
//             ) : (
//               <>
//                 <User size={12} className="mr-1" /> Agent
//               </>
//             )}
//           </span>

//           {/* Only allow mode toggle when the chat is assigned to current user
//               (later backend will enforce this too) */}
//           {isAssignedToMe && (
//             <button
//               onClick={onToggleMode}
//               className="text-[10px] text-purple-700 font-medium underline decoration-dotted underline-offset-2"
//             >
//               {isAutomation ? "Take over (pause bot)" : "Back to automation"}
//             </button>
//           )}
//         </div>

//         {/* 24-hour window indicator */}
//         <span
//           className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ${
//             conversation.within24h
//               ? "bg-green-50 text-green-700 border border-green-100"
//               : "bg-amber-50 text-amber-700 border border-amber-100"
//           }`}
//         >
//           {conversation.within24h ? "Within 24h window" : "24h window expired"}
//         </span>

//         <button className="rounded-full border border-gray-200 p-1.5 hover:bg-gray-50">
//           <MoreVertical size={16} className="text-gray-500" />
//         </button>
//       </div>
//     </div>
//   );
// }
