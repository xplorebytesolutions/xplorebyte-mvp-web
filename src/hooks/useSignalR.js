// 📄 src/hooks/useSignalR.js
import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { toast } from "react-toastify";
import { TOKEN_KEY } from "../api/axiosClient"; // single source of truth

function getHubUrl() {
  // 1️⃣ Use the same env var as axiosClient
  const raw =
    (process.env.REACT_APP_API_BASE_URL &&
      process.env.REACT_APP_API_BASE_URL.trim()) ||
    "http://localhost:7113/api";

  // Strip trailing slashes: "http://localhost:7113/api///" → "http://localhost:7113/api"
  const base = raw.replace(/\/+$/, "");

  // ⚠️ IMPORTANT:
  // REACT_APP_API_BASE_URL already includes `/api`
  // Hub is mapped as `/api/hubs/inbox` on the server.
  // So final URL becomes: {base}/hubs/inbox → .../api/hubs/inbox
  return `${base}/hubs/inbox`;
}

export default function useSignalR({
  onMessageReceived,
  onUnreadChanged,
} = {}) {
  const [connection, setConnection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const hubUrl = getHubUrl();

    // 1. Read the token using the shared key
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      console.error("SignalR connection skipped: No auth token found.");
      return;
    }

    // 2. Build the connection with token in query string
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${hubUrl}?access_token=${encodeURIComponent(token)}`)
      .withAutomaticReconnect()
      .build();

    // 3. Start the connection
    newConnection
      .start()
      .then(() => {
        console.log("✅ SignalR connected to", hubUrl);
        setConnection(newConnection);
        setIsConnected(true);

        if (onMessageReceived) {
          newConnection.on("ReceiveInboxMessage", onMessageReceived);
        }
        if (onUnreadChanged) {
          newConnection.on("UnreadCountChanged", onUnreadChanged);
        }
      })
      .catch(err => {
        console.error("❌ SignalR connection failed:", err);
        if (err.toString().includes("401")) {
          toast.error(
            "SignalR connection unauthorized. Your session may have expired."
          );
        } else {
          toast.error("Real-time connection failed.");
        }
      });

    // 4. Cleanup
    return () => {
      if (newConnection) {
        newConnection.stop();
      }
    };
  }, [onMessageReceived, onUnreadChanged]);

  return { connection, isConnected };
}

// import { useEffect, useState } from "react";
// import * as signalR from "@microsoft/signalr";
// import { toast } from "react-toastify";

// export default function useSignalR({
//   onMessageReceived,
//   onUnreadChanged,
// } = {}) {
//   const [connection, setConnection] = useState(null);
//   const [isConnected, setIsConnected] = useState(false);

//   useEffect(() => {
//     const hubUrl = "http://localhost:7113/hubs/inbox";

//     // 1. Read the token from localStorage using the correct key.
//     const token = localStorage.getItem("xbyte_token");

//     // 2. Do not attempt to connect if the user is not logged in.
//     if (!token) {
//       console.error("SignalR connection skipped: No auth token found.");
//       return;
//     }

//     // 3. Build the connection, appending the token to the URL as a query string.
//     const newConnection = new signalR.HubConnectionBuilder()
//       .withUrl(`${hubUrl}?access_token=${token}`)
//       .withAutomaticReconnect()
//       .build();

//     // 4. Start the connection and handle the outcome.
//     newConnection
//       .start()
//       .then(() => {
//         console.log("✅ SignalR connected to /hubs/inbox");
//         setConnection(newConnection);
//         setIsConnected(true);

//         // Register event listeners passed in as props
//         if (onMessageReceived) {
//           newConnection.on("ReceiveInboxMessage", onMessageReceived);
//         }
//         if (onUnreadChanged) {
//           newConnection.on("UnreadCountChanged", onUnreadChanged);
//         }
//       })
//       .catch(err => {
//         console.error("❌ SignalR connection failed:", err);
//         if (err.toString().includes("401")) {
//           toast.error(
//             "SignalR connection unauthorized. Your session may have expired."
//           );
//         } else {
//           toast.error("Real-time connection failed.");
//         }
//       });

//     // 5. Clean up the connection when the component unmounts.
//     return () => {
//       if (newConnection) {
//         newConnection.stop();
//       }
//     };
//   }, [onMessageReceived, onUnreadChanged]); // Dependencies for re-binding callbacks if they change

//   return { connection, isConnected };
// }
