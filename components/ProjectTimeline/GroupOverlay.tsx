"use client";
import React from "react";

import { GanttTask, dotColor, diffDays, isGroup } from "./types";

const btnStyle: React.CSSProperties = {
  fontSize: 10,
  padding: "3px 8px",
  border: "0.5px solid var(--color-border-secondary)",
  borderRadius: 4,
  background: "var(--color-background-secondary)",
  color: "var(--color-text-secondary)",
  cursor: "pointer",
  fontFamily: "inherit",
};

interface GroupOverlayProps {
  tasks: GanttTask[];
  expandedId: string;
  pos: { x: number; y: number };
  branchColor: Record<string, string>;
  onClose: () => void;
}

export function GroupOverlay({
  tasks,
  expandedId,
  pos,
  branchColor,
  onClose,
}: GroupOverlayProps) {
  const group = tasks.find((t) => t.id === expandedId);
  if (!group) return null;

  const children = tasks.filter(
    (t) => t.tarea_padre_id === expandedId && !isGroup(t, tasks),
  );

  return (
    <div
      style={{
        position: "fixed",
        top: Math.min(pos.y + 10, window.innerHeight - 420),
        left: Math.min(pos.x, window.innerWidth - 320),
        width: 300,
        maxHeight: 400,
        overflowY: "auto",
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-secondary)",
        borderRadius: 8,
        padding: "10px 12px",
        zIndex: 50,
        fontFamily: "var(--font-mono, monospace)",
      }}
    >
      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: "var(--color-text-primary)",
            maxWidth: 220,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {group.titulo}
        </span>
        <button onClick={onClose} style={{ ...btnStyle, padding: "1px 6px" }}>
          ✕
        </button>
      </div>

      {/* leaf children */}
      {children.length === 0 ? (
        <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
          Sin subtareas
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {children.map((child) => {
            const color = branchColor[child.id] ?? dotColor(child, tasks);
            const dur =
              diffDays(
                child.fecha_inicio_planificada,
                child.fecha_fin_planificada,
              ) + 1;
            return (
              <div
                key={child.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 6px",
                  borderRadius: 4,
                  background: "var(--color-background-secondary)",
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--color-text-primary)",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {child.titulo}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    color: "var(--color-text-tertiary)",
                    flexShrink: 0,
                  }}
                >
                  {dur}d
                </span>
                <span
                  style={{ fontSize: 9, color, flexShrink: 0, fontWeight: 500 }}
                >
                  {child.estado ?? "Pendiente"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
