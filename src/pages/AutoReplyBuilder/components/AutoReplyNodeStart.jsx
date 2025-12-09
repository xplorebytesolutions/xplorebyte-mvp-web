// 📄 src/pages/AutoReplyBuilder/components/AutoReplyNodeStart.jsx
import React from "react";
import { Handle, Position } from "reactflow";

export default function AutoReplyNodeStart({ data }) {
  return (
    <div className="rounded-md border border-green-400 bg-green-100 px-2 py-1.5 w-48 shadow-sm text-[8px] text-zinc-800">
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#aac0b2" }}
      />

      {/* Header (smaller title) */}
      <div className="font-semibold text-[9px] leading-tight">
        ▶ {data.label || "Start"}
      </div>

      {/* Subtitle */}
      <div className="text-[8px] text-zinc-600 mt-0.5">Flow begins here</div>
    </div>
  );
}
