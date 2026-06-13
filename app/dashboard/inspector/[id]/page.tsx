"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  titulo: string;
  tarea_padre_id: string | null;
  fecha_inicio_planificada: string;
  fecha_fin_planificada: string;
  estado: string;
  porcentaje_avance_actual: number;
}

interface Project {
  id: string;
  nombre: string;
}

type Urgency = "vencida" | "hoy" | "proxima" | "futura" | "completada";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function diffDays(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
  });
}

function getUrgency(task: Task, today: string): Urgency {
  if (task.estado === "Completada") return "completada";
  const daysToEnd = diffDays(today, task.fecha_fin_planificada);
  const daysToStart = diffDays(today, task.fecha_inicio_planificada);
  if (daysToEnd < 0) return "vencida";
  if (daysToEnd === 0) return "hoy";
  if (daysToStart <= 7 || daysToEnd <= 7) return "proxima";
  return "futura";
}

function isLeaf(task: Task, tasks: Task[]): boolean {
  return !tasks.some((t) => t.tarea_padre_id === task.id);
}

// ─── Config ───────────────────────────────────────────────────────────────────

const URGENCY_ORDER: Urgency[] = [
  "vencida",
  "hoy",
  "proxima",
  "futura",
  "completada",
];

const URGENCY_LABELS: Record<Urgency, string> = {
  vencida: "Vencidas",
  hoy: "Vence hoy",
  proxima: "Próximos 7 días",
  futura: "Próximas",
  completada: "Completadas",
};

const URGENCY_STYLES: Record<Urgency, { dot: string; text: string }> = {
  vencida: { dot: "bg-red-500", text: "text-red-700" },
  hoy: { dot: "bg-orange-400", text: "text-orange-600" },
  proxima: { dot: "bg-amber-500", text: "text-amber-700" },
  futura: { dot: "bg-slate-400", text: "text-slate-500" },
  completada: { dot: "bg-emerald-500", text: "text-emerald-700" },
};

const ESTADO_STYLES: Record<string, string> = {
  Completada: "text-emerald-700",
  En_Curso: "text-emerald-600",
  Bloqueada: "text-red-700",
  Pendiente: "text-amber-700",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InspectorProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<Urgency>>(
    new Set(["completada", "futura"]),
  );

  useEffect(() => {
    if (authLoading) return;

    async function load() {
      if (!user) {
        setError("No autorizado. Por favor inicia sesión.");
        setLoading(false);
        return;
      }

      const { data: proj, error: projErr } = await supabase
        .from("proyectos")
        .select("id, nombre")
        .eq("id", id)
        .single();

      if (projErr) {
        setError(projErr.message);
        setLoading(false);
        return;
      }
      setProject(proj);

      const { data: tareasData, error: tareasErr } = await supabase
        .from("tareas")
        .select(
          "id, titulo, tarea_padre_id, fecha_inicio_planificada, fecha_fin_planificada, estado, porcentaje_avance_actual",
        )
        .eq("proyecto_id", id)
        .order("fecha_fin_planificada", { ascending: true });

      if (tareasErr) {
        setError(tareasErr.message);
        setLoading(false);
        return;
      }
      setTasks(tareasData ?? []);
      setLoading(false);
    }

    load();
  }, [id, user, authLoading]);

  if (authLoading || loading)
    return (
      <div className="flex items-center justify-center h-screen text-sm text-slate-400">
        Cargando tareas...
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );

  const today = new Date().toISOString().slice(0, 10);
  const leaves = tasks.filter((t) => isLeaf(t, tasks));

  const grouped = URGENCY_ORDER.reduce<Record<Urgency, Task[]>>(
    (acc, u) => {
      acc[u] = leaves.filter((t) => getUrgency(t, today) === u);
      return acc;
    },
    { vencida: [], hoy: [], proxima: [], futura: [], completada: [] },
  );

  function toggleGroup(u: Urgency) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(u)) next.delete(u);
      else next.add(u);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/inspector"
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors no-underline"
          >
            ← Proyectos
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs text-slate-600 truncate max-w-[200px]">
            {project?.nombre}
          </span>
        </div>
        <span className="text-xs text-slate-400">{leaves.length} tareas</span>
      </div>

      {/* task groups */}
      <div className="p-5 flex flex-col gap-5">
        {URGENCY_ORDER.map((urgency) => {
          const group = grouped[urgency];
          if (group.length === 0) return null;
          const isOpen = !collapsed.has(urgency);
          const style = URGENCY_STYLES[urgency];

          return (
            <div key={urgency}>
              {/* group header */}
              <button
                onClick={() => toggleGroup(urgency)}
                className="flex items-center gap-2 w-full py-1 mb-2 bg-transparent border-none cursor-pointer"
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                <span
                  className={`text-xs font-bold tracking-wide ${style.text}`}
                >
                  {URGENCY_LABELS[urgency]}
                </span>
                <span className="text-xs text-slate-400">({group.length})</span>
                <span className="ml-auto text-xs text-slate-400">
                  {isOpen ? "▼" : "▶"}
                </span>
              </button>

              {/* task cards */}
              {isOpen && (
                <div className="flex flex-col gap-2">
                  {group.map((task) => {
                    const daysLeft = diffDays(
                      today,
                      task.fecha_fin_planificada,
                    );
                    const estadoText =
                      ESTADO_STYLES[task.estado] ?? "text-slate-400";
                    const daysColor =
                      daysLeft < 0
                        ? "text-red-600"
                        : daysLeft === 0
                          ? "text-orange-500"
                          : "text-slate-400";
                    const daysLabel =
                      daysLeft < 0
                        ? `${Math.abs(daysLeft)}d vencida`
                        : daysLeft === 0
                          ? "vence hoy"
                          : `${daysLeft}d`;

                    return (
                      <Link
                        key={task.id}
                        href={`/dashboard/inspector/${id}/tarea/${task.id}`}
                        className="no-underline group"
                      >
                        <div className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer transition-all group-hover:shadow-md group-hover:border-slate-300">
                          {/* title + estado */}
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-slate-800 truncate flex-1 min-w-0 m-0">
                              {task.titulo}
                            </p>
                            <span
                              className={`text-xs font-semibold shrink-0 ${estadoText}`}
                            >
                              {task.estado}
                            </span>
                          </div>

                          {/* dates + days left */}
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-xs text-slate-400">
                              {fmtDate(task.fecha_inicio_planificada)} →{" "}
                              {fmtDate(task.fecha_fin_planificada)}
                            </span>
                            <span
                              className={`text-xs font-medium ${daysColor}`}
                            >
                              {daysLabel}
                            </span>
                          </div>

                          {/* progress bar */}
                          {task.porcentaje_avance_actual > 0 && (
                            <div className="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{
                                  width: `${task.porcentaje_avance_actual}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
