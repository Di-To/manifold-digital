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
  className: string;
  icon?: string;
} {
  switch (estado) {
    case "Completada":
      return {
        label: "Completada",
        className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10",
        icon: "✓",
      };
    case "Bloqueada":
      return {
        label: "Bloqueada",
        className: "bg-red-50 text-red-700 ring-1 ring-red-600/10",
        icon: "✕",
      };
    case "En_Curso":
      return {
        label: "En curso",
        className: "bg-sky-50 text-sky-700 ring-1 ring-sky-600/10",
      };
    default:
      return {
        label: "Pendiente",
        className: "bg-slate-50 text-slate-500 ring-1 ring-slate-600/10",
      };
  }
}

function fmtRange(start: string, end: string) {
  return `${start.slice(5).replace("-", "/")} – ${end.slice(5).replace("-", "/")}`;
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

  return (
    <div
      className="fixed z-50 w-80 max-h-110 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-4"
      style={{
        top: Math.min(pos.y + 10, window.innerHeight - 460),
        left: Math.min(pos.x, window.innerWidth - 340),
      }}
    >
      {/* close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors text-sm leading-none"
      >
        ✕
      </button>

      {/* group header */}
      <div className="mb-3 pr-6">
        <p className="text-sm font-semibold text-slate-900 leading-snug mb-0.5">
          {group.titulo}
        </p>
        <p className="text-xs text-slate-400">
          {groupDur} días ·{" "}
          {fmtRange(
            group.fecha_inicio_planificada,
            group.fecha_fin_planificada,
          )}
        </p>
      </div>

      {/* section label */}
      {children.length > 0 && (
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Hitos
        </p>
      )}

      {/* children */}
      {children.length === 0 ? (
        <p className="text-xs text-slate-400">Sin subtareas</p>
      ) : (
        <div className="flex flex-col divide-y divide-slate-100">
          {children.map((child) => {
            const dur =
              diffDays(
                child.fecha_inicio_planificada,
                child.fecha_fin_planificada,
              ) + 1;
            const badge = statusBadge(child.estado);

            return (
              <div
                key={child.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                {/* title + dates */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-800 truncate mb-0.5">
                    {child.titulo}
                  </p>
                  <p className="text-xs text-slate-400">
                    {dur} días ·{" "}
                    {fmtRange(
                      child.fecha_inicio_planificada,
                      child.fecha_fin_planificada,
                    )}
                  </p>
                </div>

                {/* status badge */}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold shrink-0 ${badge.className}`}
                >
                  {badge.icon && <span>{badge.icon}</span>}
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
