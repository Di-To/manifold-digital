// "use client";
// import React from "react";

// import { GanttTask, dotColor, diffDays, isGroup } from "./types";

// const btnStyle: React.CSSProperties = {
//   fontSize: 10,
//   padding: "3px 8px",
//   border: "0.5px solid var(--color-border-secondary)",
//   borderRadius: 4,
//   background: "var(--color-background-secondary)",
//   color: "var(--color-text-secondary)",
//   cursor: "pointer",
//   fontFamily: "inherit",
// };

// interface GroupOverlayProps {
//   tasks: GanttTask[];
//   expandedId: string;
//   pos: { x: number; y: number };
//   branchColor: Record<string, string>;
//   onClose: () => void;
// }

// export function GroupOverlay({
//   tasks,
//   expandedId,
//   pos,
//   branchColor,
//   onClose,
// }: GroupOverlayProps) {
//   const group = tasks.find((t) => t.id === expandedId);
//   if (!group) return null;

//   const children = tasks.filter(
//     (t) => t.tarea_padre_id === expandedId && !isGroup(t, tasks),
//   );

//   return (
//     <div
//       style={{
//         position: "fixed",
//         top: Math.min(pos.y + 10, window.innerHeight - 420),
//         left: Math.min(pos.x, window.innerWidth - 320),
//         width: 300,
//         maxHeight: 400,
//         overflowY: "auto",
//         background: "var(--color-background-primary)",
//         border: "0.5px solid var(--color-border-secondary)",
//         borderRadius: 8,
//         padding: "10px 12px",
//         zIndex: 50,
//         fontFamily: "var(--font-mono, monospace)",
//       }}
//     >
//       {/* header */}
//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//           marginBottom: 8,
//         }}
//       >
//         <span
//           style={{
//             fontSize: 10,
//             fontWeight: 500,
//             color: "var(--color-text-primary)",
//             maxWidth: 220,
//             overflow: "hidden",
//             textOverflow: "ellipsis",
//             whiteSpace: "nowrap",
//           }}
//         >
//           {group.titulo}
//         </span>
//         <button onClick={onClose} style={{ ...btnStyle, padding: "1px 6px" }}>
//           ✕
//         </button>
//       </div>

//       {/* leaf children */}
//       {children.length === 0 ? (
//         <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
//           Sin subtareas
//         </div>
//       ) : (
//         <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
//           {children.map((child) => {
//             const color = branchColor[child.id] ?? dotColor(child, tasks);
//             const dur =
//               diffDays(
//                 child.fecha_inicio_planificada,
//                 child.fecha_fin_planificada,
//               ) + 1;
//             return (
//               <div
//                 key={child.id}
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   gap: 8,
//                   padding: "4px 6px",
//                   borderRadius: 4,
//                   background: "var(--color-background-secondary)",
//                 }}
//               >
//                 <div
//                   style={{
//                     width: 6,
//                     height: 6,
//                     borderRadius: "50%",
//                     background: color,
//                     flexShrink: 0,
//                   }}
//                 />
//                 <span
//                   style={{
//                     fontSize: 10,
//                     color: "var(--color-text-primary)",
//                     flex: 1,
//                     overflow: "hidden",
//                     textOverflow: "ellipsis",
//                     whiteSpace: "nowrap",
//                   }}
//                 >
//                   {child.titulo}
//                 </span>
//                 <span
//                   style={{
//                     fontSize: 9,
//                     color: "var(--color-text-tertiary)",
//                     flexShrink: 0,
//                   }}
//                 >
//                   {dur}d
//                 </span>
//                 <span
//                   style={{ fontSize: 9, color, flexShrink: 0, fontWeight: 500 }}
//                 >
//                   {child.estado ?? "Pendiente"}
//                 </span>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }

"use client";
import React from "react";
import { GanttTask, diffDays, isGroup } from "./types";

interface GroupOverlayProps {
  tasks: GanttTask[];
  expandedId: string;
  pos: { x: number; y: number };
  branchColor: Record<string, string>;
  onClose: () => void;
}

function statusBadge(estado: string | undefined): {
  label: string;
  bg: string;
  color: string;
  border: string;
  icon?: string;
} {
  switch (estado) {
    case "Completada":
      return {
        label: "Approved",
        bg: "#0F6E56",
        color: "#fff",
        border: "#0F6E56",
        icon: "✓",
      };
    case "Bloqueada":
      return {
        label: "BLOCKED",
        bg: "#fff",
        color: "#993C1D",
        border: "#993C1D",
        icon: "🚫",
      };
    case "En_Curso":
      return {
        label: "En curso",
        bg: "#fff",
        color: "#378ADD",
        border: "#378ADD",
      };
    default:
      return {
        label: "Sin revisar",
        bg: "#fff",
        color: "#888",
        border: "#ccc",
      };
  }
}

export function GroupOverlay({
  tasks,
  expandedId,
  pos,
  onClose,
}: GroupOverlayProps) {
  const group = tasks.find((t) => t.id === expandedId);
  if (!group) return null;

  const children = tasks.filter(
    (t) => t.tarea_padre_id === expandedId && !isGroup(t, tasks),
  );

  const groupDur =
    diffDays(group.fecha_inicio_planificada, group.fecha_fin_planificada) + 1;

  function fmtRange(start: string, end: string) {
    return `${start.slice(5).replace("-", "/")} – ${end.slice(5).replace("-", "/")}`;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: Math.min(pos.y + 10, window.innerHeight - 460),
        left: Math.min(pos.x, window.innerWidth - 340),
        width: 320,
        maxHeight: 440,
        overflowY: "auto",
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        padding: "16px",
        zIndex: 100,
        fontFamily: "system-ui, sans-serif",
        color: "#111",
      }}
    >
      {/* close button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 10,
          right: 12,
          background: "none",
          border: "none",
          fontSize: 16,
          cursor: "pointer",
          color: "#aaa",
          lineHeight: 1,
        }}
      >
        ✕
      </button>

      {/* group header */}
      <div style={{ marginBottom: 14, paddingRight: 24 }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#111",
            margin: "0 0 3px",
            lineHeight: 1.3,
          }}
        >
          {group.titulo}
        </p>
        <p style={{ fontSize: 11, color: "#888", margin: 0 }}>
          {groupDur} días [
          {fmtRange(
            group.fecha_inicio_planificada,
            group.fecha_fin_planificada,
          )}
          ]
        </p>
      </div>

      {/* section label */}
      {children.length > 0 && (
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#333",
            margin: "0 0 10px",
          }}
        >
          Hitos
        </p>
      )}

      {/* children */}
      {children.length === 0 ? (
        <p style={{ fontSize: 11, color: "#888", margin: 0 }}>Sin subtareas</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {children.map((child, ci) => {
            const dur =
              diffDays(
                child.fecha_inicio_planificada,
                child.fecha_fin_planificada,
              ) + 1;
            const badge = statusBadge(child.estado);
            const isLast = ci === children.length - 1;

            return (
              <div
                key={child.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: isLast ? "none" : "0.5px solid #eee",
                }}
              >
                {/* title + dates */}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "#111",
                      margin: "0 0 2px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {child.titulo}
                  </p>
                  <p style={{ fontSize: 10, color: "#888", margin: 0 }}>
                    {dur} días [
                    {fmtRange(
                      child.fecha_inicio_planificada,
                      child.fecha_fin_planificada,
                    )}
                    ]
                  </p>
                </div>

                {/* status badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 10px",
                    borderRadius: 6,
                    border: `1.5px solid ${badge.border}`,
                    background: badge.bg,
                    flexShrink: 0,
                    minWidth: 90,
                    justifyContent: "center",
                  }}
                >
                  {badge.icon && (
                    <span style={{ fontSize: 11 }}>{badge.icon}</span>
                  )}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: badge.color,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {badge.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
