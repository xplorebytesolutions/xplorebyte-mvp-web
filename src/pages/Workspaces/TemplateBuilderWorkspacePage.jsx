// 📄 src/pages/Workspaces/TemplateBuilderWorkspacePage.jsx

import {
  FolderKanban,
  ListChecks,
  Archive,
  Pin,
  ArrowRightCircle,
  MoreVertical,
  FileBarChart,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";

import { useAuth } from "../../app/providers/AuthProvider";
import { FK } from "../../capabilities/featureKeys";
// 🔔 Global upgrade flow
import { requestUpgrade } from "../../utils/upgradeBus";

// Map UI blocks → required permissions
const PERM_BY_BLOCK = {
  // workspace-level view (not tied to a tile, but ok to keep)
  "template.builder.view": [FK.TEMPLATE_BUILDER_VIEW],
  "template.builder.create.draft": [FK.TEMPLATE_BUILDER_CREATE_DRAFT],
  "template.builder.approved.templates.view": [
    FK.TEMPLATE_BUILDER_APPROVED_TEMPLATES_VIEW,
  ],
  "template.builder.library.browse": [FK.TEMPLATE_BUILDER_LIBRARY_BROWSE],
};

// Tiles (routes align with steps we built on backend)
const templateBlocks = [
  {
    id: "template.builder.approved.templates.view",
    label: "Approved Templates",
    description: "View approved templates and delete at Meta if needed.",
    path: "/app/template-builder/approved",
    icon: <FileBarChart size={22} />,
    action: "Manage Approved",
  },
  {
    id: "template.builder.library.browse",
    label: "Template Library",
    description:
      "Browse segmented templates (Salon, Gym, Doctor, etc.) and preview.",
    path: "/app/template-builder/library",
    icon: <FolderKanban size={22} />,
    action: "Open Library",
  },
  {
    id: "template.builder.create.draft",
    label: "My Drafts",
    description:
      "Edit header/body/buttons, upload media, preview & submit to Meta.",
    path: "/app/template-builder/drafts",
    icon: <ListChecks size={22} />,
    action: "Manage Drafts",
  },
];

export default function TemplateBuilderWorkspacePage() {
  const navigate = useNavigate();
  const { isLoading, can, hasAllAccess, entLoading } = useAuth();

  const [pinned, setPinned] = useState(
    JSON.parse(localStorage.getItem("tpl-pinned") || "[]")
  );
  const [archived, setArchived] = useState(
    JSON.parse(localStorage.getItem("tpl-archived") || "[]")
  );
  const [order, setOrder] = useState(
    JSON.parse(localStorage.getItem("tpl-order")) ||
      templateBlocks.map(b => b.id)
  );

  const togglePin = (e, id) => {
    e.stopPropagation();
    const updated = pinned.includes(id)
      ? pinned.filter(i => i !== id)
      : [...pinned, id];
    setPinned(updated);
    localStorage.setItem("tpl-pinned", JSON.stringify(updated));
  };

  const toggleArchive = (e, id) => {
    e.stopPropagation();
    const updated = archived.includes(id)
      ? archived.filter(i => i !== id)
      : [...archived, id];
    setArchived(updated);
    localStorage.setItem("tpl-archived", JSON.stringify(updated));
  };

  const onDragEnd = result => {
    if (!result.destination) return;
    const newOrder = Array.from(order);
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    setOrder(newOrder);
    localStorage.setItem("tpl-order", JSON.stringify(newOrder));
  };

  // Build blocks list:
  // - don’t hide by permission (we want locked tiles visible)
  // - only hide archived
  const blocksWithAccess = order
    .map(id => templateBlocks.find(b => b && b.id === id))
    .filter(Boolean)
    .filter(b => !archived.includes(b.id))
    .map(block => {
      const codes = PERM_BY_BLOCK[block.id] || [];
      const allowed =
        hasAllAccess || (Array.isArray(codes) && codes.some(code => can(code)));

      return {
        ...block,
        allowed,
        primaryCode: codes[0] || null,
      };
    });

  if (isLoading || entLoading) {
    return (
      <div className="p-10 text-center text-lg text-gray-500">
        Loading template builder features…
      </div>
    );
  }

  const anyVisible = blocksWithAccess.length > 0;
  const anyAllowed = blocksWithAccess.some(b => b.allowed);

  return (
    <div className="p-6" data-test-id="template-builder-root">
      {/* Emerald animated border like other workspaces */}
      <style>{`
        @keyframes drawRight { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        @keyframes drawDown  { from { transform: scaleY(0) } to { transform: scaleY(1) } }
        @keyframes drawLeft  { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        @keyframes drawUp    { from { transform: scaleY(0) } to { transform: scaleY(1) } }

        .tile:hover .topline    { animation: drawRight .9s ease forwards; }
        .tile:hover .rightline  { animation: drawDown  .9s ease .18s forwards; }
        .tile:hover .bottomline { animation: drawLeft  .9s ease .36s forwards; }
        .tile:hover .leftline   { animation: drawUp    .9s ease .54s forwards; }
      `}</style>

      <h2 className="text-2xl font-bold text-emerald-800 mb-1">
        ✨ Template Builder
      </h2>
      <p className="text-sm text-slate-600 mb-4">
        Create professional WhatsApp templates in minutes. Start from our
        segmented library, customize drafts, preview, and submit for approval.
      </p>

      {/* If tiles exist but all are locked → show restricted banner */}
      {anyVisible && !anyAllowed && (
        <div className="bg-amber-50 text-amber-800 p-4 border-l-4 border-amber-500 rounded-md mb-6 shadow-sm flex items-start gap-3">
          <AlertTriangle size={22} className="mt-1" />
          <div>
            <strong>Locked template tools:</strong> Your current plan
            doesn&apos;t include these template builder features.
            <div className="text-sm mt-1 text-gray-600">
              Try opening a tile to see upgrade options, or contact your
              administrator.
            </div>
          </div>
        </div>
      )}

      {anyVisible && (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="template-blocks" direction="horizontal">
            {provided => (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {blocksWithAccess.map((block, index) => {
                  const baseCardClasses =
                    "tile group relative overflow-hidden cursor-pointer bg-white rounded-md border shadow-sm hover:shadow-md transition transform hover:-translate-y-0.5 duration-200 focus:outline-none focus:ring-2 focus:ring-purple-300";
                  const lockedClasses =
                    "opacity-70 border-dashed cursor-not-allowed hover:-translate-y-0 hover:shadow-sm";

                  const cardClasses = block.allowed
                    ? baseCardClasses
                    : `${baseCardClasses} ${lockedClasses}`;

                  const handleCardClick = () => {
                    if (!block.allowed) {
                      if (block.primaryCode) {
                        requestUpgrade({
                          reason: "feature",
                          code: block.primaryCode,
                          source: "templatebuilder.workspace.tile",
                        });
                      }
                      return;
                    }
                    navigate(block.path);
                  };

                  const handlePrimaryActionClick = e => {
                    e.stopPropagation();
                    if (!block.allowed) {
                      if (block.primaryCode) {
                        requestUpgrade({
                          reason: "feature",
                          code: block.primaryCode,
                          source: "templatebuilder.workspace.action",
                        });
                      }
                      return;
                    }
                    navigate(block.path);
                  };

                  return (
                    <Draggable
                      key={block.id}
                      draggableId={block.id}
                      index={index}
                    >
                      {provided => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          role="button"
                          tabIndex={0}
                          aria-label={`${block.label}: ${block.action}`}
                          onKeyDown={e => {
                            if (e.key === "Enter") handleCardClick();
                          }}
                          onClick={handleCardClick}
                          className={cardClasses}
                          style={{ userSelect: "none" }}
                        >
                          {/* 🔒 Upgrade badge for locked tiles */}
                          {!block.allowed && (
                            <span className="pointer-events-none absolute top-3 right-3 inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              🔒 Upgrade
                            </span>
                          )}

                          {/* Emerald animated borders */}
                          <span
                            aria-hidden
                            className="topline pointer-events-none absolute left-0 -top-[2px] h-[2px] w-full origin-left rounded opacity-0 group-hover:opacity-100"
                            style={{
                              background:
                                "linear-gradient(90deg, #A7F3D0, #34D399, #059669)",
                              transform: "scaleX(0)",
                            }}
                          />
                          <span
                            aria-hidden
                            className="rightline pointer-events-none absolute right-0 -top-[2px] h-[calc(100%+4px)] w-[2px] origin-top rounded opacity-0 group-hover:opacity-100"
                            style={{
                              background:
                                "linear-gradient(180deg, #A7F3D0, #34D399, #059669)",
                              transform: "scaleY(0)",
                            }}
                          />
                          <span
                            aria-hidden
                            className="bottomline pointer-events-none absolute left-0 -bottom-[2px] h-[2px] w-full origin-right rounded opacity-0 group-hover:opacity-100"
                            style={{
                              background:
                                "linear-gradient(270deg, #A7F3D0, #34D399, #059669)",
                              transform: "scaleX(0)",
                            }}
                          />
                          <span
                            aria-hidden
                            className="leftline pointer-events-none absolute left-0 -top-[2px] h-[calc(100%+4px)] w-[2px] origin-bottom rounded opacity-0 group-hover:opacity-100"
                            style={{
                              background:
                                "linear-gradient(0deg, #A7F3D0, #34D399, #059669)",
                              transform: "scaleY(0)",
                            }}
                          />

                          <div className="flex items-start gap-4 p-5">
                            <div className="bg-emerald-50 rounded-md p-2 text-emerald-800">
                              {block.icon}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-md font-semibold text-emerald-800 group-hover:text-emerald-900">
                                {block.label}
                              </h3>
                              <p className="text-sm text-slate-600">
                                {block.description}
                              </p>
                            </div>

                            {/* Drag handle only on kebab */}
                            <div
                              {...provided.dragHandleProps}
                              title="Drag to re-order"
                              className="ml-2 rounded p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                              onClick={e => e.stopPropagation()}
                            >
                              <MoreVertical size={16} />
                            </div>
                          </div>

                          <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                            <button
                              onClick={handlePrimaryActionClick}
                              className="text-sm text-gray-700 font-medium flex items-center gap-1 hover:text-gray-900"
                            >
                              {block.allowed
                                ? block.action
                                : "Upgrade to unlock"}
                              <ArrowRightCircle size={18} />
                            </button>

                            <div className="flex items-center gap-3">
                              <button
                                onClick={e => togglePin(e, block.id)}
                                title={
                                  pinned.includes(block.id) ? "Unpin" : "Pin"
                                }
                              >
                                <Pin
                                  size={18}
                                  className={
                                    pinned.includes(block.id)
                                      ? "text-red-600"
                                      : "text-gray-400 hover:text-red-500"
                                  }
                                />
                              </button>
                              <button
                                onClick={e => toggleArchive(e, block.id)}
                                title="Archive this"
                              >
                                <Archive
                                  size={18}
                                  className={
                                    archived.includes(block.id)
                                      ? "text-indigo-600"
                                      : "text-gray-400 hover:text-indigo-500"
                                  }
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {!anyVisible && (
        <div className="bg-red-100 text-red-700 p-4 border-l-4 border-red-500 rounded-md mt-4 shadow-sm flex items-start gap-3">
          <AlertTriangle size={22} className="mt-1" />
          <div>
            <strong>No template tiles:</strong> All template tools are archived
            or hidden.
            <div className="text-sm mt-1 text-gray-600">
              Un-archive some tiles to see them here.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// // 📄 src/pages/Workspaces/TemplateBuilderWorkspacePage.jsx

// import {
//   FolderKanban,
//   ListChecks,
//   Archive,
//   Pin,
//   ArrowRightCircle,
//   MoreVertical,
//   FileBarChart,
// } from "lucide-react";
// import { useNavigate } from "react-router-dom";
// import { useState } from "react";
// import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";

// import { useAuth } from "../../app/providers/AuthProvider";
// import { FK } from "../../capabilities/featureKeys";
// // 🔔 Global upgrade flow
// import { requestUpgrade } from "../../utils/upgradeBus";

// // Map UI blocks → required permissions
// const PERM_BY_BLOCK = {
//   // workspace-level view (not tied to a tile, but ok to keep)
//   "template.builder.view": [FK.TEMPLATE_BUILDER_VIEW],
//   "template.builder.create.draft": [FK.TEMPLATE_BUILDER_CREATE_DRAFT],
//   "template.builder.approved.templates.view": [
//     FK.TEMPLATE_BUILDER_APPROVED_TEMPLATES_VIEW,
//   ],
//   "template.builder.library.browse": [FK.TEMPLATE_BUILDER_LIBRARY_BROWSE],
// };

// // Tiles (routes align with steps we built on backend)
// const templateBlocks = [
//   {
//     id: "template.builder.approved.templates.view",
//     label: "Approved Templates",
//     description: "View approved templates and delete at Meta if needed.",
//     path: "/app/template-builder/approved",
//     icon: <FileBarChart className="text-pink-500" size={22} />,
//     action: "Manage Approved",
//   },
//   {
//     id: "template.builder.library.browse",
//     label: "Template Library",
//     description:
//       "Browse segmented templates (Salon, Gym, Doctor, etc.) and preview.",
//     path: "/app/template-builder/library",
//     icon: <FolderKanban className="text-indigo-600" size={22} />,
//     action: "Open Library",
//   },
//   {
//     id: "template.builder.create.draft",
//     label: "My Drafts",
//     description:
//       "Edit header/body/buttons, upload media, preview & submit to Meta.",
//     path: "/app/template-builder/drafts",
//     icon: <ListChecks className="text-purple-600" size={22} />,
//     action: "Manage Drafts",
//   },
// ];

// export default function TemplateBuilderWorkspacePage() {
//   const navigate = useNavigate();
//   const { isLoading, can, hasAllAccess, entLoading } = useAuth();

//   const [pinned, setPinned] = useState(
//     JSON.parse(localStorage.getItem("tpl-pinned") || "[]")
//   );
//   const [archived, setArchived] = useState(
//     JSON.parse(localStorage.getItem("tpl-archived") || "[]")
//   );
//   const [order, setOrder] = useState(
//     JSON.parse(localStorage.getItem("tpl-order")) ||
//       templateBlocks.map(b => b.id)
//   );

//   const togglePin = (e, id) => {
//     e.stopPropagation();
//     const updated = pinned.includes(id)
//       ? pinned.filter(i => i !== id)
//       : [...pinned, id];
//     setPinned(updated);
//     localStorage.setItem("tpl-pinned", JSON.stringify(updated));
//   };

//   const toggleArchive = (e, id) => {
//     e.stopPropagation();
//     const updated = archived.includes(id)
//       ? archived.filter(i => i !== id)
//       : [...archived, id];
//     setArchived(updated);
//     localStorage.setItem("tpl-archived", JSON.stringify(updated));
//   };

//   const onDragEnd = result => {
//     if (!result.destination) return;
//     const newOrder = Array.from(order);
//     const [moved] = newOrder.splice(result.source.index, 1);
//     newOrder.splice(result.destination.index, 0, moved);
//     setOrder(newOrder);
//     localStorage.setItem("tpl-order", JSON.stringify(newOrder));
//   };

//   // Build blocks list:
//   // - don’t hide by permission (we want locked tiles visible)
//   // - only hide archived
//   const blocksWithAccess = order
//     .map(id => templateBlocks.find(b => b && b.id === id))
//     .filter(Boolean)
//     .filter(b => !archived.includes(b.id))
//     .map(block => {
//       const codes = PERM_BY_BLOCK[block.id] || [];
//       const allowed =
//         hasAllAccess || (Array.isArray(codes) && codes.some(code => can(code)));

//       return {
//         ...block,
//         allowed,
//         primaryCode: codes[0] || null,
//       };
//     });

//   if (isLoading || entLoading) {
//     return (
//       <div className="p-10 text-center text-lg text-gray-500">
//         Loading template builder features…
//       </div>
//     );
//   }

//   return (
//     <div className="p-6">
//       {/* Animated “hand-drawn” border like your other workspaces */}
//       <style>{`
//         @keyframes drawRight { from { transform: scaleX(0) } to { transform: scaleX(1) } }
//         @keyframes drawDown  { from { transform: scaleY(0) } to { transform: scaleY(1) } }
//         @keyframes drawLeft  { from { transform: scaleX(0) } to { transform: scaleX(1) } }
//         @keyframes drawUp    { from { transform: scaleY(0) } to { transform: scaleY(1) } }

//         .tile:hover .topline    { animation: drawRight .9s ease forwards; }
//         .tile:hover .rightline  { animation: drawDown  .9s ease .18s forwards; }
//         .tile:hover .bottomline { animation: drawLeft  .9s ease .36s forwards; }
//         .tile:hover .leftline   { animation: drawUp    .9s ease .54s forwards; }

//         .cursor-finger { cursor: pointer; }
//       `}</style>

//       <h2 className="text-2xl font-bold text-purple-800 mb-2">
//         ✨ Template Builder
//       </h2>
//       <p className="text-sm text-gray-600 mb-6">
//         Create professional WhatsApp templates in minutes. Start from our
//         segmented library, customize drafts, preview, and submit for approval.
//       </p>

//       <DragDropContext onDragEnd={onDragEnd}>
//         <Droppable droppableId="template-blocks" direction="horizontal">
//           {provided => (
//             <div
//               className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
//               ref={provided.innerRef}
//               {...provided.droppableProps}
//             >
//               {blocksWithAccess.map((block, index) => {
//                 const baseCardClasses =
//                   "tile group relative overflow-hidden cursor-finger bg-white rounded-md border shadow-sm hover:shadow-md transition transform hover:-translate-y-0.5 duration-200 focus:outline-none focus:ring-2 focus:ring-purple-300";
//                 const lockedClasses =
//                   "opacity-60 border-dashed cursor-not-allowed hover:-translate-y-0 hover:shadow-sm";

//                 const cardClasses = block.allowed
//                   ? baseCardClasses
//                   : `${baseCardClasses} ${lockedClasses}`;

//                 const handleCardClick = () => {
//                   if (!block.allowed) {
//                     if (block.primaryCode) {
//                       requestUpgrade({
//                         reason: "feature",
//                         code: block.primaryCode,
//                         source: "templatebuilder.workspace.tile",
//                       });
//                     }
//                     return;
//                   }
//                   navigate(block.path);
//                 };

//                 const handlePrimaryActionClick = e => {
//                   e.stopPropagation();
//                   if (!block.allowed) {
//                     if (block.primaryCode) {
//                       requestUpgrade({
//                         reason: "feature",
//                         code: block.primaryCode,
//                         source: "templatebuilder.workspace.action",
//                       });
//                     }
//                     return;
//                   }
//                   navigate(block.path);
//                 };

//                 return (
//                   <Draggable
//                     key={block.id}
//                     draggableId={block.id}
//                     index={index}
//                   >
//                     {provided => (
//                       <div
//                         ref={provided.innerRef}
//                         {...provided.draggableProps}
//                         role="button"
//                         tabIndex={0}
//                         aria-label={`${block.label}: ${block.action}`}
//                         onKeyDown={e => {
//                           if (e.key === "Enter") handleCardClick();
//                         }}
//                         onClick={handleCardClick}
//                         className={cardClasses}
//                         style={{ userSelect: "none" }}
//                       >
//                         {/* 🔒 Upgrade badge for locked tiles */}
//                         {!block.allowed && (
//                           <span className="pointer-events-none absolute top-3 right-3 inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
//                             🔒 Upgrade
//                           </span>
//                         )}

//                         {/* Animated borders */}
//                         <span
//                           aria-hidden
//                           className="topline pointer-events-none absolute left-0 -top-[2px] h-[2px] w-full origin-left rounded opacity-0 group-hover:opacity-100"
//                           style={{
//                             background:
//                               "linear-gradient(90deg, #6B7280, #374151, #F3E8FF)",
//                             transform: "scaleX(0)",
//                           }}
//                         />
//                         <span
//                           aria-hidden
//                           className="rightline pointer-events-none absolute right-0 -top-[2px] h-[calc(100%+4px)] w-[2px] origin-top rounded opacity-0 group-hover:opacity-100"
//                           style={{
//                             background:
//                               "linear-gradient(180deg, #6B7280, #374151, #F3E8FF)",
//                             transform: "scaleY(0)",
//                           }}
//                         />
//                         <span
//                           aria-hidden
//                           className="bottomline pointer-events-none absolute left-0 -bottom-[2px] h-[2px] w-full origin-right rounded opacity-0 group-hover:opacity-100"
//                           style={{
//                             background:
//                               "linear-gradient(270deg, #6B7280, #374151, #F3E8FF)",
//                             transform: "scaleX(0)",
//                           }}
//                         />
//                         <span
//                           aria-hidden
//                           className="leftline pointer-events-none absolute left-0 -top-[2px] h-[calc(100%+4px)] w-[2px] origin-bottom rounded opacity-0 group-hover:opacity-100"
//                           style={{
//                             background:
//                               "linear-gradient(0deg, #6B7280, #374151, #F3E8FF)",
//                             transform: "scaleY(0)",
//                           }}
//                         />

//                         <div className="flex items-start gap-4 p-5">
//                           <div className="bg-purple-50 rounded-md p-2">
//                             {block.icon}
//                           </div>
//                           <div className="flex-1">
//                             <h3 className="text-md font-semibold text-purple-700">
//                               {block.label}
//                             </h3>
//                             <p className="text-sm text-gray-600">
//                               {block.description}
//                             </p>
//                           </div>

//                           {/* Drag handle only on kebab */}
//                           <div
//                             {...provided.dragHandleProps}
//                             title="Drag to re-order"
//                             className="ml-2 rounded p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
//                             onClick={e => e.stopPropagation()}
//                           >
//                             <MoreVertical size={16} />
//                           </div>
//                         </div>

//                         <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between">
//                           <button
//                             onClick={handlePrimaryActionClick}
//                             className="text-sm text-purple-600 font-medium flex items-center gap-1 hover:text-purple-800"
//                           >
//                             {block.allowed ? block.action : "Upgrade to unlock"}
//                             <ArrowRightCircle size={18} />
//                           </button>

//                           <div className="flex items-center gap-3">
//                             <button
//                               onClick={e => togglePin(e, block.id)}
//                               title="Pin this"
//                             >
//                               <Pin
//                                 size={18}
//                                 className={
//                                   pinned.includes(block.id)
//                                     ? "text-red-600"
//                                     : "text-gray-400 hover:text-red-500"
//                                 }
//                               />
//                             </button>
//                             <button
//                               onClick={e => toggleArchive(e, block.id)}
//                               title="Archive this"
//                             >
//                               <Archive
//                                 size={18}
//                                 className={
//                                   archived.includes(block.id)
//                                     ? "text-indigo-600"
//                                     : "text-gray-400 hover:text-indigo-500"
//                                 }
//                               />
//                             </button>
//                           </div>
//                         </div>
//                       </div>
//                     )}
//                   </Draggable>
//                 );
//               })}
//               {provided.placeholder}
//             </div>
//           )}
//         </Droppable>
//       </DragDropContext>
//     </div>
//   );
// }

// // 📄 src/pages/Workspaces/TemplateBuilderWorkspacePage.jsx

// import {
//   FolderKanban,
//   PlusCircle,
//   ListChecks,
//   Archive,
//   Pin,
//   ArrowRightCircle,
//   MoreVertical,
//   FileBarChart,
// } from "lucide-react";
// import { useNavigate } from "react-router-dom";
// import { useState } from "react";
// import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";

// import { useAuth } from "../../app/providers/AuthProvider";
// import { FK } from "../../capabilities/featureKeys";
// // 🔔 Global upgrade flow
// import { requestUpgrade } from "../../utils/upgradeBus";

// // Map UI blocks → required permissions
// const PERM_BY_BLOCK = {
//   // workspace-level view (not tied to a tile, but ok to keep)
//   "template.builder.view": [FK.TEMPLATE_BUILDER_VIEW],
//   "template.builder.create.draft": [FK.TEMPLATE_BUILDER_CREATE_DRAFT],
//   "template.builder.approved.templates.view": [
//     FK.TEMPLATE_BUILDER_APPROVED_TEMPLATES_VIEW,
//   ],
//   "template.builder.library.browse": [FK.TEMPLATE_BUILDER_LIBRARY_BROWSE],
// };

// // Tiles (routes align with steps we built on backend)
// const templateBlocks = [
//   {
//     id: "template.builder.approved.templates.view",
//     label: "Approved Templates",
//     description: "View approved templates and delete at Meta if needed.",
//     path: "/app/template-builder/approved",
//     icon: <FileBarChart className="text-pink-500" size={22} />,
//     action: "Manage Approved",
//   },
//   {
//     id: "template.builder.library.browse",
//     label: "Template Library",
//     description:
//       "Browse segmented templates (Salon, Gym, Doctor, etc.) and preview.",
//     path: "/app/template-builder/library",
//     icon: <FolderKanban className="text-indigo-600" size={22} />,
//     action: "Open Library",
//   },
//   {
//     id: "template.builder.create.draft",
//     label: "My Drafts",
//     description:
//       "Edit header/body/buttons, upload media, preview & submit to Meta.",
//     path: "/app/template-builder/drafts",
//     icon: <ListChecks className="text-purple-600" size={22} />,
//     action: "Manage Drafts",
//   },
// ];

// export default function TemplateBuilderWorkspacePage() {
//   const navigate = useNavigate();
//   const { isLoading, can, hasAllAccess, entLoading } = useAuth();

//   const [pinned, setPinned] = useState(
//     JSON.parse(localStorage.getItem("tpl-pinned") || "[]")
//   );
//   const [archived, setArchived] = useState(
//     JSON.parse(localStorage.getItem("tpl-archived") || "[]")
//   );
//   const [order, setOrder] = useState(
//     JSON.parse(localStorage.getItem("tpl-order")) ||
//       templateBlocks.map(b => b.id)
//   );

//   const togglePin = (e, id) => {
//     e.stopPropagation();
//     const updated = pinned.includes(id)
//       ? pinned.filter(i => i !== id)
//       : [...pinned, id];
//     setPinned(updated);
//     localStorage.setItem("tpl-pinned", JSON.stringify(updated));
//   };

//   const toggleArchive = (e, id) => {
//     e.stopPropagation();
//     const updated = archived.includes(id)
//       ? archived.filter(i => i !== id)
//       : [...archived, id];
//     setArchived(updated);
//     localStorage.setItem("tpl-archived", JSON.stringify(updated));
//   };

//   const onDragEnd = result => {
//     if (!result.destination) return;
//     const newOrder = Array.from(order);
//     const [moved] = newOrder.splice(result.source.index, 1);
//     newOrder.splice(result.destination.index, 0, moved);
//     setOrder(newOrder);
//     localStorage.setItem("tpl-order", JSON.stringify(newOrder));
//   };

//   // Build blocks list:
//   // - don’t hide by permission (we want locked tiles visible)
//   // - only hide archived
//   const blocksWithAccess = order
//     .map(id => templateBlocks.find(b => b && b.id === id))
//     .filter(Boolean)
//     .filter(b => !archived.includes(b.id))
//     .map(block => {
//       const codes = PERM_BY_BLOCK[block.id] || [];
//       const allowed =
//         hasAllAccess || (Array.isArray(codes) && codes.some(code => can(code)));

//       return {
//         ...block,
//         allowed,
//         primaryCode: codes[0] || null,
//       };
//     });

//   if (isLoading || entLoading) {
//     return (
//       <div className="p-10 text-center text-lg text-gray-500">
//         Loading template builder features…
//       </div>
//     );
//   }

//   return (
//     <div className="p-6">
//       {/* Animated “hand-drawn” border like your Campaign workspace */}
//       <style>{`
//         @keyframes drawRight { from { transform: scaleX(0) } to { transform: scaleX(1) } }
//         @keyframes drawDown  { from { transform: scaleY(0) } to { transform: scaleY(1) } }
//         @keyframes drawLeft  { from { transform: scaleX(0) } to { transform: scaleX(1) } }
//         @keyframes drawUp    { from { transform: scaleY(0) } to { transform: scaleY(1) } }

//         .tile:hover .topline    { animation: drawRight .9s ease forwards; }
//         .tile:hover .rightline  { animation: drawDown  .9s ease .18s forwards; }
//         .tile:hover .bottomline { animation: drawLeft  .9s ease .36s forwards; }
//         .tile:hover .leftline   { animation: drawUp    .9s ease .54s forwards; }

//         .cursor-finger { cursor: pointer; }
//       `}</style>

//       <h2 className="text-2xl font-bold text-purple-800 mb-4">
//         ✨ Template Builder
//       </h2>
//       <p className="text-sm text-gray-600 mb-6">
//         Create professional WhatsApp templates in minutes. Start from our
//         segmented library, customize drafts, preview, and submit for approval.
//       </p>

//       <DragDropContext onDragEnd={onDragEnd}>
//         <Droppable droppableId="template-blocks" direction="horizontal">
//           {provided => (
//             <div
//               className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
//               ref={provided.innerRef}
//               {...provided.droppableProps}
//             >
//               {blocksWithAccess.map((block, index) => {
//                 const baseCardClasses =
//                   "tile group relative overflow-hidden cursor-finger bg-white rounded-md border shadow-sm hover:shadow-md transition transform hover:-translate-y-0.5 duration-200 focus:outline-none focus:ring-2 focus:ring-purple-300";
//                 const lockedClasses =
//                   "opacity-60 border-dashed cursor-not-allowed hover:-translate-y-0 hover:shadow-sm";

//                 const cardClasses = block.allowed
//                   ? baseCardClasses
//                   : `${baseCardClasses} ${lockedClasses}`;

//                 const handleCardClick = () => {
//                   if (!block.allowed) {
//                     if (block.primaryCode) {
//                       requestUpgrade({
//                         reason: "feature",
//                         code: block.primaryCode,
//                         source: "templatebuilder.workspace.tile",
//                       });
//                     }
//                     return;
//                   }
//                   navigate(block.path);
//                 };

//                 const handlePrimaryActionClick = e => {
//                   e.stopPropagation();
//                   if (!block.allowed) {
//                     if (block.primaryCode) {
//                       requestUpgrade({
//                         reason: "feature",
//                         code: block.primaryCode,
//                         source: "templatebuilder.workspace.action",
//                       });
//                     }
//                     return;
//                   }
//                   navigate(block.path);
//                 };

//                 return (
//                   <Draggable
//                     key={block.id}
//                     draggableId={block.id}
//                     index={index}
//                   >
//                     {provided => (
//                       <div
//                         ref={provided.innerRef}
//                         {...provided.draggableProps}
//                         role="button"
//                         tabIndex={0}
//                         aria-label={`${block.label}: ${block.action}`}
//                         onKeyDown={e => {
//                           if (e.key === "Enter") handleCardClick();
//                         }}
//                         onClick={handleCardClick}
//                         className={cardClasses}
//                         style={{ userSelect: "none" }}
//                       >
//                         {/* 🔒 Upgrade badge for locked tiles */}
//                         {!block.allowed && (
//                           <span className="pointer-events-none absolute top-3 right-3 inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
//                             🔒 Upgrade
//                           </span>
//                         )}

//                         {/* Animated borders */}
//                         <span
//                           aria-hidden
//                           className="topline pointer-events-none absolute left-0 -top-[2px] h-[2px] w-full origin-left rounded opacity-0 group-hover:opacity-100"
//                           style={{
//                             background:
//                               "linear-gradient(90deg, #6B7280, #374151, #F3E8FF)",
//                             transform: "scaleX(0)",
//                           }}
//                         />
//                         <span
//                           aria-hidden
//                           className="rightline pointer-events-none absolute right-0 -top-[2px] h-[calc(100%+4px)] w-[2px] origin-top rounded opacity-0 group-hover:opacity-100"
//                           style={{
//                             background:
//                               "linear-gradient(180deg, #6B7280, #374151, #F3E8FF)",
//                             transform: "scaleY(0)",
//                           }}
//                         />
//                         <span
//                           aria-hidden
//                           className="bottomline pointer-events-none absolute left-0 -bottom-[2px] h-[2px] w-full origin-right rounded opacity-0 group-hover:opacity-100"
//                           style={{
//                             background:
//                               "linear-gradient(270deg, #6B7280, #374151, #F3E8FF)",
//                             transform: "scaleX(0)",
//                           }}
//                         />
//                         <span
//                           aria-hidden
//                           className="leftline pointer-events-none absolute left-0 -top-[2px] h-[calc(100%+4px)] w-[2px] origin-bottom rounded opacity-0 group-hover:opacity-100"
//                           style={{
//                             background:
//                               "linear-gradient(0deg, #6B7280, #374151, #F3E8FF)",
//                             transform: "scaleY(0)",
//                           }}
//                         />

//                         <div className="flex items-start gap-4 p-5">
//                           <div className="bg-gray-100 rounded-md p-2">
//                             {block.icon}
//                           </div>
//                           <div className="flex-1">
//                             <h3 className="text-md font-semibold text-purple-700">
//                               {block.label}
//                             </h3>
//                             <p className="text-sm text-gray-600">
//                               {block.description}
//                             </p>
//                           </div>

//                           {/* Drag handle only on kebab */}
//                           <div
//                             {...provided.dragHandleProps}
//                             title="Drag to re-order"
//                             className="ml-2 rounded p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
//                             onClick={e => e.stopPropagation()}
//                           >
//                             <MoreVertical size={16} />
//                           </div>
//                         </div>

//                         <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between">
//                           <button
//                             onClick={handlePrimaryActionClick}
//                             className="text-sm text-purple-600 font-medium flex items-center gap-1 hover:text-purple-800"
//                           >
//                             {block.allowed ? block.action : "Upgrade to unlock"}
//                             <ArrowRightCircle size={18} />
//                           </button>

//                           <div className="flex items-center gap-3">
//                             <button
//                               onClick={e => togglePin(e, block.id)}
//                               title="Pin this"
//                             >
//                               <Pin
//                                 size={18}
//                                 className={
//                                   pinned.includes(block.id)
//                                     ? "text-red-600"
//                                     : "text-gray-400 hover:text-red-500"
//                                 }
//                               />
//                             </button>
//                             <button
//                               onClick={e => toggleArchive(e, block.id)}
//                               title="Archive this"
//                             >
//                               <Archive
//                                 size={18}
//                                 className={
//                                   archived.includes(block.id)
//                                     ? "text-indigo-600"
//                                     : "text-gray-400 hover:text-indigo-500"
//                                 }
//                               />
//                             </button>
//                           </div>
//                         </div>
//                       </div>
//                     )}
//                   </Draggable>
//                 );
//               })}
//               {provided.placeholder}
//             </div>
//           )}
//         </Droppable>
//       </DragDropContext>
//     </div>
//   );
// }

// // import {
// //   FolderKanban,
// //   PlusCircle,
// //   ListChecks,
// //   Archive,
// //   Pin,
// //   ArrowRightCircle,
// //   MoreVertical,
// //   FileBarChart,
// // } from "lucide-react";
// // import { useNavigate } from "react-router-dom";
// // import { useState } from "react";
// // import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";

// // import { useAuth } from "../../app/providers/AuthProvider";
// // import { FK } from "../../capabilities/featureKeys";
// // // Map UI blocks → required permissions (reuse your FK set for now)
// // const PERM_BY_BLOCK = {
// //   "template.builder.view": [FK.TEMPLATE_BUILDER_VIEW],
// //   "template.builder.create.draft": [FK.TEMPLATE_BUILDER_CREATE_DRAFT],

// //   "template.builder.approved.templates.view": [
// //     FK.TEMPLATE_BUILDER_APPROVED_TEMPLATES_VIEW,
// //   ],
// //   "template.builder.library.browse": [FK.TEMPLATE_BUILDER_LIBRARY_BROWSE],
// // };

// // // Tiles (routes align with steps we built on backend)
// // const templateBlocks = [
// //   {
// //     id: "template.builder.approved.templates.view",
// //     label: "Approved Templates",
// //     description: "View approved templates and delete at Meta if needed.",
// //     // (You can wire this to a simple list/grid that reads WhatsAppTemplates and calls DELETE /api/template-builder/templates/{name})
// //     path: "/app/template-builder/approved",
// //     icon: <FileBarChart className="text-pink-500" size={22} />,
// //     action: "Manage Approved",
// //   },
// //   {
// //     id: "template.builder.library.browse",
// //     label: "Template Library",
// //     description:
// //       "Browse segmented templates (Salon, Gym, Doctor, etc.) and preview.",
// //     path: "/app/template-builder/library",
// //     icon: <FolderKanban className="text-indigo-600" size={22} />,
// //     action: "Open Library",
// //   },
// //   {
// //     id: "template.builder.create.draft",
// //     label: "My Drafts",
// //     description:
// //       "Edit header/body/buttons, upload media, preview & submit to Meta.",
// //     // (If you later add a Drafts list page, point here. For now, you can navigate directly when a draft is created.)
// //     path: "/app/template-builder/drafts",
// //     icon: <ListChecks className="text-purple-600" size={22} />,
// //     action: "Manage Drafts",
// //   },
// // ];

// // export default function TemplateBuilderWorkspacePage() {
// //   const navigate = useNavigate();
// //   const { isLoading, can, hasAllAccess } = useAuth();

// //   const [pinned, setPinned] = useState(
// //     JSON.parse(localStorage.getItem("tpl-pinned") || "[]")
// //   );
// //   const [archived, setArchived] = useState(
// //     JSON.parse(localStorage.getItem("tpl-archived") || "[]")
// //   );
// //   const [order, setOrder] = useState(
// //     JSON.parse(localStorage.getItem("tpl-order")) ||
// //       templateBlocks.map(b => b.id)
// //   );

// //   const togglePin = (e, id) => {
// //     e.stopPropagation();
// //     const updated = pinned.includes(id)
// //       ? pinned.filter(i => i !== id)
// //       : [...pinned, id];
// //     setPinned(updated);
// //     localStorage.setItem("tpl-pinned", JSON.stringify(updated));
// //   };

// //   const toggleArchive = (e, id) => {
// //     e.stopPropagation();
// //     const updated = archived.includes(id)
// //       ? archived.filter(i => i !== id)
// //       : [...archived, id];
// //     setArchived(updated);
// //     localStorage.setItem("tpl-archived", JSON.stringify(updated));
// //   };

// //   const onDragEnd = result => {
// //     if (!result.destination) return;
// //     const newOrder = Array.from(order);
// //     const [moved] = newOrder.splice(result.source.index, 1);
// //     newOrder.splice(result.destination.index, 0, moved);
// //     setOrder(newOrder);
// //     localStorage.setItem("tpl-order", JSON.stringify(newOrder));
// //   };

// //   const canAny = codes => hasAllAccess || (codes || []).some(code => can(code));
// //   const isAllowed = block => canAny(PERM_BY_BLOCK[block.id]);

// //   const visibleBlocks = order
// //     .map(id => templateBlocks.find(b => b && b.id === id))
// //     .filter(Boolean)
// //     .filter(b => !archived.includes(b.id))
// //     .filter(isAllowed);

// //   if (isLoading)
// //     return (
// //       <div className="p-10 text-center text-lg text-gray-500">
// //         Loading features…
// //       </div>
// //     );

// //   return (
// //     <div className="p-6">
// //       {/* Animated “hand-drawn” border like your Campaign workspace */}
// //       <style>{`
// //         @keyframes drawRight { from { transform: scaleX(0) } to { transform: scaleX(1) } }
// //         @keyframes drawDown  { from { transform: scaleY(0) } to { transform: scaleY(1) } }
// //         @keyframes drawLeft  { from { transform: scaleX(0) } to { transform: scaleX(1) } }
// //         @keyframes drawUp    { from { transform: scaleY(0) } to { transform: scaleY(1) } }

// //         .tile:hover .topline    { animation: drawRight .9s ease forwards; }
// //         .tile:hover .rightline  { animation: drawDown  .9s ease .18s forwards; }
// //         .tile:hover .bottomline { animation: drawLeft  .9s ease .36s forwards; }
// //         .tile:hover .leftline   { animation: drawUp    .9s ease .54s forwards; }
// //       `}</style>

// //       <h2 className="text-2xl font-bold text-purple-800 mb-4">
// //         ✨ Template Builder
// //       </h2>
// //       <p className="text-sm text-gray-600 mb-6">
// //         Create professional WhatsApp templates in minutes. Start from our
// //         segmented library, customize drafts, preview, and submit for approval.
// //       </p>

// //       <DragDropContext onDragEnd={onDragEnd}>
// //         <Droppable droppableId="template-blocks" direction="horizontal">
// //           {provided => (
// //             <div
// //               className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
// //               ref={provided.innerRef}
// //               {...provided.droppableProps}
// //             >
// //               {visibleBlocks.map((block, index) => (
// //                 <Draggable key={block.id} draggableId={block.id} index={index}>
// //                   {provided => (
// //                     <div
// //                       ref={provided.innerRef}
// //                       {...provided.draggableProps}
// //                       role="button"
// //                       tabIndex={0}
// //                       aria-label={`${block.label}: ${block.action}`}
// //                       onKeyDown={e => {
// //                         if (e.key === "Enter") navigate(block.path);
// //                       }}
// //                       onClick={() => navigate(block.path)}
// //                       className="tile group relative overflow-hidden cursor-pointer bg-white rounded-md border shadow-sm hover:shadow-md transition transform hover:-translate-y-0.5 duration-200 focus:outline-none focus:ring-2 focus:ring-purple-300"
// //                       style={{ userSelect: "none" }}
// //                     >
// //                       {/* Animated borders */}
// //                       <span
// //                         aria-hidden
// //                         className="topline pointer-events-none absolute left-0 -top-[2px] h-[2px] w-full origin-left rounded opacity-0 group-hover:opacity-100"
// //                         style={{
// //                           background:
// //                             "linear-gradient(90deg, #6B7280, #374151, #F3E8FF)",
// //                           transform: "scaleX(0)",
// //                         }}
// //                       />
// //                       <span
// //                         aria-hidden
// //                         className="rightline pointer-events-none absolute right-0 -top-[2px] h-[calc(100%+4px)] w-[2px] origin-top rounded opacity-0 group-hover:opacity-100"
// //                         style={{
// //                           background:
// //                             "linear-gradient(180deg, #6B7280, #374151, #F3E8FF)",
// //                           transform: "scaleY(0)",
// //                         }}
// //                       />
// //                       <span
// //                         aria-hidden
// //                         className="bottomline pointer-events-none absolute left-0 -bottom-[2px] h-[2px] w-full origin-right rounded opacity-0 group-hover:opacity-100"
// //                         style={{
// //                           background:
// //                             "linear-gradient(270deg, #6B7280, #374151, #F3E8FF)",
// //                           transform: "scaleX(0)",
// //                         }}
// //                       />
// //                       <span
// //                         aria-hidden
// //                         className="leftline pointer-events-none absolute left-0 -top-[2px] h-[calc(100%+4px)] w-[2px] origin-bottom rounded opacity-0 group-hover:opacity-100"
// //                         style={{
// //                           background:
// //                             "linear-gradient(0deg, #6B7280, #374151, #F3E8FF)",
// //                           transform: "scaleY(0)",
// //                         }}
// //                       />

// //                       <div className="flex items-start gap-4 p-5">
// //                         <div className="bg-gray-100 rounded-md p-2">
// //                           {block.icon}
// //                         </div>
// //                         <div className="flex-1">
// //                           <h3 className="text-md font-semibold text-purple-700">
// //                             {block.label}
// //                           </h3>
// //                           <p className="text-sm text-gray-600">
// //                             {block.description}
// //                           </p>
// //                         </div>

// //                         {/* Drag handle only on kebab */}
// //                         <div
// //                           {...provided.dragHandleProps}
// //                           title="Drag to re-order"
// //                           className="ml-2 rounded p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
// //                           onClick={e => e.stopPropagation()}
// //                         >
// //                           <MoreVertical size={16} />
// //                         </div>
// //                       </div>

// //                       <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between">
// //                         <button
// //                           onClick={e => {
// //                             e.stopPropagation();
// //                             navigate(block.path);
// //                           }}
// //                           className="text-sm text-purple-600 font-medium flex items-center gap-1 hover:text-purple-800"
// //                         >
// //                           {block.action} <ArrowRightCircle size={18} />
// //                         </button>

// //                         <div className="flex items-center gap-3">
// //                           <button
// //                             onClick={e => togglePin(e, block.id)}
// //                             title="Pin this"
// //                           >
// //                             <Pin
// //                               size={18}
// //                               className={
// //                                 pinned.includes(block.id)
// //                                   ? "text-red-600"
// //                                   : "text-gray-400 hover:text-red-500"
// //                               }
// //                             />
// //                           </button>
// //                           <button
// //                             onClick={e => toggleArchive(e, block.id)}
// //                             title="Archive this"
// //                           >
// //                             <Archive
// //                               size={18}
// //                               className={
// //                                 archived.includes(block.id)
// //                                   ? "text-indigo-600"
// //                                   : "text-gray-400 hover:text-indigo-500"
// //                               }
// //                             />
// //                           </button>
// //                         </div>
// //                       </div>
// //                     </div>
// //                   )}
// //                 </Draggable>
// //               ))}
// //               {provided.placeholder}
// //             </div>
// //           )}
// //         </Droppable>
// //       </DragDropContext>
// //     </div>
// //   );
// // }
