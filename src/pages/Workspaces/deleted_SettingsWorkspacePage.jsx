// 📄 src/pages/Workspaces/SettingsWorkspace.jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { FK } from "../../capabilities/featureKeys";
import { Phone, Palette, Lock, Globe, BarChart3, UserCog } from "lucide-react";
import { requestUpgrade } from "../../utils/upgradeBus";

function SettingsCard({ icon, title, desc, allowed, primaryCode, onClick }) {
  const baseClasses =
    "group w-full text-left rounded-xl border p-5 transition bg-white shadow-sm hover:shadow-md cursor-pointer";
  const lockedClasses =
    "opacity-60 border-dashed cursor-not-allowed hover:shadow-sm";

  const cardClasses = allowed ? baseClasses : `${baseClasses} ${lockedClasses}`;

  const handleClick = () => {
    if (!allowed) {
      if (primaryCode) {
        requestUpgrade({
          reason: "feature",
          code: primaryCode,
          source: "settings.workspace.tile",
        });
      }
      return;
    }
    onClick?.();
  };

  const handleKeyDown = e => {
    if (e.key === "Enter") {
      handleClick();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cardClasses}
    >
      {/* 🔒 Upgrade badge for locked tiles */}
      {!allowed && (
        <span className="pointer-events-none absolute top-3 right-3 inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
          🔒 Upgrade
        </span>
      )}

      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-emerald-50 text-emerald-800">
          {icon}
        </div>
        <div>
          <div className="text-emerald-800 font-semibold group-hover:text-emerald-900">
            {title}
          </div>
          <div className="text-sm text-slate-600">{desc}</div>
        </div>
      </div>
    </button>
  );
}

export default function SettingsWorkspace() {
  const nav = useNavigate();
  const { can, hasAllAccess, isLoading, entLoading } = useAuth();

  if (isLoading || entLoading) {
    return (
      <div className="p-10 text-center text-lg text-gray-500">
        Loading settings…
      </div>
    );
  }

  const canAny = codes =>
    hasAllAccess ||
    (Array.isArray(codes) && codes.some(code => can(code))) ||
    (!Array.isArray(codes) && can(codes));

  // Define tiles with their required permission and where they go
  const tiles = [
    {
      key: "whatsapp",
      perm: FK.SETTINGS_WHATSAPP_VIEW,
      icon: <Phone size={20} />,
      title: "WhatsApp Settings",
      desc: "Configure WhatsApp credentials and integration.",
      path: "/app/settings/whatsapp",
    },
    {
      key: "theme",
      perm: FK.SETTINGS_THEME_UPDATE,
      icon: <Palette size={20} />,
      title: "Theme & Colors",
      desc: "Choose light/dark mode and accent colors.",
      path: "/app/settings/theme",
    },
    {
      key: "password",
      perm: FK.SETTINGS_PASSWORD_UPDATE,
      icon: <Lock size={20} />,
      title: "Change Password",
      desc: "Update your account password.",
      path: "/app/settings/password",
    },
    {
      key: "meta-account",
      perm: FK.SETTINGS_WHATSAPP_VIEW, // later: FK.SETTINGS_META_ACCOUNT_VIEW
      icon: <Globe size={20} />,
      title: "Meta Account Management",
      desc: "Disconnect WhatsApp or handle Meta data deletion.",
      path: "/app/settings/meta-account",
    },
    {
      key: "billing",
      // later: FK.BILLING_VIEW (or similar)
      perm: FK.SETTINGS_WHATSAPP_VIEW,
      icon: (
        <svg
          className="w-5 h-5 text-purple-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
          <path d="M3 9h18" />
          <path d="M8 14h2" />
        </svg>
      ),
      title: "Billing & Subscription",
      desc: "View your current plan, invoices, and manage payments.",
      path: "/app/settings/billing",
    },
    {
      key: "user-permissions",
      // TODO: later: FK.ACCESS_USER_PERMISSIONS_MANAGE
      perm: FK.SETTINGS_WHATSAPP_VIEW,
      icon: <BarChart3 size={20} />,
      title: "User Access & Permissions",
      desc: "Override permissions for individual users in your account.",
      path: "/app/admin/user-permissions",
    },
    {
      key: "profile-update",
      // TODO: later switch to FK.SETTINGS_PROFILE_UPDATE
      perm: FK.SETTINGS_WHATSAPP_VIEW,
      icon: <UserCog size={20} />,
      title: "Profile Update",
      desc: "Update your business profile and contact details.",
      path: "/app/profile-completion",
    },
  ];

  const tilesWithAccess = tiles.map(t => {
    const codes = Array.isArray(t.perm) ? t.perm : [t.perm];
    const allowed = canAny(codes);
    return {
      ...t,
      allowed,
      primaryCode: codes[0] || null,
    };
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-emerald-800 mb-4">Settings</h1>

      {tilesWithAccess.length === 0 ? (
        <div className="text-sm text-gray-500">
          You don’t have access to any settings here.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 relative">
          {tilesWithAccess.map(tile => (
            <div key={tile.key} className="relative">
              <SettingsCard
                icon={tile.icon}
                title={tile.title}
                desc={tile.desc}
                allowed={tile.allowed}
                primaryCode={tile.primaryCode}
                onClick={() => nav(tile.path)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// // 📄 src/pages/Workspaces/SettingsWorkspace.jsx
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "../../app/providers/AuthProvider";
// import { FK } from "../../capabilities/featureKeys";
// import { Phone, Palette, Lock, Globe, BarChart3, UserCog } from "lucide-react";

// function Card({ icon, title, desc, onClick }) {
//   return (
//     <button
//       type="button"
//       onClick={onClick}
//       className="w-full text-left rounded-xl border p-5 transition hover:shadow-md bg-white"
//     >
//       <div className="flex items-start gap-3">
//         <div className="p-2 rounded-md bg-emerald-50 text-emerald-800">
//           {icon}
//         </div>
//         <div>
//           <div className="text-emerald-800 font-semibold group-hover:text-emerald-900">
//             {title}
//           </div>
//           <div className="text-sm text-slate-600">{desc}</div>
//         </div>
//       </div>
//     </button>
//   );
// }

// export default function SettingsWorkspace() {
//   const nav = useNavigate();
//   const { can, hasAllAccess, isLoading } = useAuth();

//   if (isLoading) return null;

//   const allow = perm => hasAllAccess || can(perm);

//   // Define tiles with their required permission and where they go
//   const tiles = [
//     {
//       key: "whatsapp",
//       perm: FK.SETTINGS_WHATSAPP_VIEW,
//       icon: <Phone size={20} />,
//       title: "WhatsApp Settings",
//       desc: "Configure WhatsApp credentials and integration.",
//       onClick: () => nav("/app/settings/whatsapp"),
//     },
//     {
//       key: "theme",
//       perm: FK.SETTINGS_THEME_UPDATE,
//       icon: <Palette size={20} />,
//       title: "Theme & Colors",
//       desc: "Choose light/dark mode and accent colors.",
//       onClick: () => nav("/app/settings/theme"),
//     },
//     {
//       key: "password",
//       perm: FK.SETTINGS_PASSWORD_UPDATE,
//       icon: <Lock size={20} />,
//       title: "Change Password",
//       desc: "Update your account password.",
//       onClick: () => nav("/app/settings/password"),
//     },
//     {
//       key: "meta-account",
//       perm: FK.SETTINGS_WHATSAPP_VIEW, // reuse existing permission for now
//       icon: <Globe size={20} />,
//       title: "Meta Account Management",
//       desc: "Disconnect WhatsApp or handle Meta data deletion.",
//       onClick: () => nav("/app/settings/meta-account"),
//     },
//     {
//       key: "billing",
//       perm: FK.SETTINGS_WHATSAPP_VIEW, // or create a proper FK if you want
//       icon: (
//         <svg
//           className="w-5 h-5 text-purple-600"
//           fill="none"
//           stroke="currentColor"
//           strokeWidth="1.8"
//           viewBox="0 0 24 24"
//         >
//           <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
//           <path d="M3 9h18" />
//           <path d="M8 14h2" />
//         </svg>
//       ),
//       title: "Billing & Subscription",
//       desc: "View your current plan, invoices, and manage payments.",
//       onClick: () => nav("/app/settings/billing"),
//     },
//     {
//       key: "user-permissions",
//       // TODO: introduce a dedicated FK like FK.ACCESS_USER_PERMISSIONS_MANAGE
//       perm: FK.SETTINGS_WHATSAPP_VIEW,
//       icon: <BarChart3 size={20} />,
//       title: "User Access & Permissions",
//       desc: "Override permissions for individual users in your account.",
//       // Adjust this route if your admin pages live under /app/admin/...
//       onClick: () => nav("/app/admin/user-permissions"),
//     },
//     {
//       key: "profile-update",
//       // later you can switch this to FK.SETTINGS_PROFILE_UPDATE (or similar)
//       perm: FK.SETTINGS_WHATSAPP_VIEW,
//       icon: <UserCog size={20} />,
//       title: "Profile Update",
//       desc: "Update your business profile and contact details.",
//       onClick: () => nav("/app/profile-completion"),
//     },
//   ];

//   const visibleTiles = tiles.filter(t => allow(t.perm));

//   return (
//     <div className="p-6">
//       <h1 className="text-2xl font-bold text-emerald-800 mb-4">Settings</h1>

//       {visibleTiles.length === 0 ? (
//         <div className="text-sm text-gray-500">
//           You don’t have access to any settings here.
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
//           {visibleTiles.map(t => (
//             <Card
//               key={t.key}
//               icon={t.icon}
//               title={t.title}
//               desc={t.desc}
//               onClick={t.onClick}
//             />
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // 📄 src/pages/Workspaces/SettingsWorkspace.jsx
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "../../app/providers/AuthProvider";
// import { FK } from "../../capabilities/featureKeys";
// import { Phone, Palette, Lock, Globe, BarChart3 } from "lucide-react";

// function Card({ icon, title, desc, onClick }) {
//   return (
//     <button
//       type="button"
//       onClick={onClick}
//       className="w-full text-left rounded-xl border p-5 transition hover:shadow-md bg-white"
//     >
//       <div className="flex items-start gap-3">
//         <div className="p-2 rounded-md bg-emerald-50 text-emerald-800">
//           {icon}
//         </div>
//         <div>
//           <div className="text-emerald-800 font-semibold group-hover:text-emerald-900">
//             {title}
//           </div>
//           <div className="text-sm text-slate-600">{desc}</div>
//         </div>
//       </div>
//     </button>
//   );
// }

// export default function SettingsWorkspace() {
//   const nav = useNavigate();
//   const { can, hasAllAccess, isLoading } = useAuth();

//   if (isLoading) return null;

//   const allow = perm => hasAllAccess || can(perm);

//   // Define tiles with their required permission and where they go
//   const tiles = [
//     {
//       key: "whatsapp",
//       perm: FK.SETTINGS_WHATSAPP_VIEW,
//       icon: <Phone size={20} />,
//       title: "WhatsApp Settings",
//       desc: "Configure WhatsApp credentials and integration.",
//       onClick: () => nav("/app/settings/whatsapp"),
//     },
//     {
//       key: "theme",
//       perm: FK.SETTINGS_THEME_UPDATE,
//       icon: <Palette size={20} />,
//       title: "Theme & Colors",
//       desc: "Choose light/dark mode and accent colors.",
//       onClick: () => nav("/app/settings/theme"),
//     },
//     {
//       key: "password",
//       perm: FK.SETTINGS_PASSWORD_UPDATE,
//       icon: <Lock size={20} />,
//       title: "Change Password",
//       desc: "Update your account password.",
//       onClick: () => nav("/app/settings/password"),
//     },
//     {
//       key: "meta-account",
//       perm: FK.SETTINGS_WHATSAPP_VIEW, // reuse existing permission for now
//       icon: <Globe size={20} />,
//       title: "Meta Account Management",
//       desc: "Disconnect WhatsApp or handle Meta data deletion.",
//       onClick: () => nav("/app/settings/meta-account"),
//     },
//     {
//       key: "billing",
//       perm: FK.SETTINGS_WHATSAPP_VIEW, // or create a proper FK if you want
//       icon: (
//         <svg
//           className="w-5 h-5 text-purple-600"
//           fill="none"
//           stroke="currentColor"
//           strokeWidth="1.8"
//           viewBox="0 0 24 24"
//         >
//           <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
//           <path d="M3 9h18" />
//           <path d="M8 14h2" />
//         </svg>
//       ),
//       title: "Billing & Subscription",
//       desc: "View your current plan, invoices, and manage payments.",
//       onClick: () => nav("/app/settings/billing"),
//     },
//     {
//       key: "user-permissions",
//       // TODO: introduce a dedicated FK like FK.ACCESS_USER_PERMISSIONS_MANAGE
//       perm: FK.SETTINGS_WHATSAPP_VIEW,
//       icon: <BarChart3 size={20} />,
//       title: "User Access & Permissions",
//       desc: "Override permissions for individual users in your account.",
//       // Adjust this route if your admin pages live under /app/admin/...
//       onClick: () => nav("/app/admin/user-permissions"),
//     },
//   ];

//   const visibleTiles = tiles.filter(t => allow(t.perm));

//   return (
//     <div className="p-6">
//       <h1 className="text-2xl font-bold text-emerald-800 mb-4">Settings</h1>

//       {visibleTiles.length === 0 ? (
//         <div className="text-sm text-gray-500">
//           You don’t have access to any settings here.
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
//           {visibleTiles.map(t => (
//             <Card
//               key={t.key}
//               icon={t.icon}
//               title={t.title}
//               desc={t.desc}
//               onClick={t.onClick}
//             />
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }
