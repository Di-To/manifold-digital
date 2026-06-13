"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";

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
  proxima: "Próximas 7 días",
  futura: "Próximas",
  completada: "Completadas",
};

const URGENCY_COLORS: Record<Urgency, string> = {
  vencida: "#993C1D",
  hoy: "#E8714A",
  proxima: "#BA7517",
  futura: "var(--color-text-secondary)",
  completada: "#0F6E56",
};

const ESTADO_COLORS: Record<string, string> = {
  Completada: "#0F6E56",
  En_Curso: "#1D9E75",
  Bloqueada: "#993C1D",
  Pendiente: "#BA7517",
};

function isLeaf(task: Task, tasks: Task[]): boolean {
  return !tasks.some((t) => t.tarea_padre_id === task.id);
}

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
    /*const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );*/
    if (authLoading) return;
    if (!user) {
      setError("No autorizado. Por favor inicia sesión.");
      setLoading(false);
      return;
    }

    async function load() {
      const { data: proj, error: projErr } = await supabase
        .from("proyectos")
        .select("id, nombre")
        .eq("id", id)
        .single();

      if (projErr) {
        setError(projErr.message);
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
        return;
      }
      setTasks(tareasData ?? []);
    }

    load().finally(() => setLoading(false));
  }, [id, user, authLoading]);

  if (authLoading || loading) return <div style={centered}>Cargando tareas...</div>;
  if (error)
    return (
      <div style={centered}>
        <p style={{ color: "#993C1D" }}>{error}</p>
      </div>
    );

  const today = new Date().toISOString().slice(0, 10);

  // only show leaf tasks — groups are not reportable
  const leaves = tasks.filter((t) => isLeaf(t, tasks));

  // group by urgency
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
    <div style={shell}>
      {/* top bar */}
      <div style={topBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/dashboard/inspector"
            style={{
              fontSize: 11,
              color: "var(--color-text-tertiary)",
              textDecoration: "none",
            }}
          >
            ← proyectos
          </Link>
          <span style={{ color: "var(--color-border-secondary)" }}>/</span>
          <span
            style={{
              fontSize: 11,
              color: "var(--color-text-secondary)",
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {project?.nombre}
          </span>
        </div>
        <p style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
          {leaves.length} tareas
        </p>
      </div>

      {/* task groups */}
      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {URGENCY_ORDER.map((urgency) => {
          const group = grouped[urgency];
          if (group.length === 0) return null;
          const isOpen = !collapsed.has(urgency);
          const color = URGENCY_COLORS[urgency];

          return (
            <div key={urgency}>
              {/* group header */}
              <button
                onClick={() => toggleGroup(urgency)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  background: "none",
                  border: "none",
                  padding: "4px 0",
                  cursor: "pointer",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.07em",
                    color,
                  }}
                >
                  {URGENCY_LABELS[urgency].toUpperCase()}
                </span>
                <span
                  style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}
                >
                  ({group.length})
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 9,
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  {isOpen ? "▼" : "▶"}
                </span>
              </button>

              {/* task cards */}
              {isOpen && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {group.map((task) => {
                    const daysLeft = diffDays(
                      today,
                      task.fecha_fin_planificada,
                    );
                    const estadoColor =
                      ESTADO_COLORS[task.estado] ??
                      "var(--color-text-tertiary)";

                    return (
                      <Link
                        key={task.id}
                        href={`/dashboard/inspector/${id}/tarea/${task.id}`}
                        style={{ textDecoration: "none" }}
                      >
                        <div
                          style={taskCard}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.borderColor = color)
                          }
                          onMouseLeave={(e) =>
                          (e.currentTarget.style.borderColor =
                            "var(--color-border-secondary)")
                          }
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                            }}
                          >
                            <p
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: "var(--color-text-primary)",
                                margin: 0,
                                flex: 1,
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {task.titulo}
                            </p>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 500,
                                color: estadoColor,
                                flexShrink: 0,
                              }}
                            >
                              {task.estado}
                            </span>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginTop: 6,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 10,
                                color: "var(--color-text-tertiary)",
                              }}
                            >
                              {fmtDate(task.fecha_inicio_planificada)} →{" "}
                              {fmtDate(task.fecha_fin_planificada)}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 500,
                                color:
                                  daysLeft < 0
                                    ? "#993C1D"
                                    : daysLeft === 0
                                      ? "#E8714A"
                                      : "var(--color-text-tertiary)",
                              }}
                            >
                              {daysLeft < 0
                                ? `${Math.abs(daysLeft)}d vencida`
                                : daysLeft === 0
                                  ? "vence hoy"
                                  : `${daysLeft}d`}
                            </span>
                          </div>

                          {/* progress bar */}
                          {task.porcentaje_avance_actual > 0 && (
                            <div
                              style={{
                                marginTop: 6,
                                height: 3,
                                borderRadius: 2,
                                background: "var(--color-border-secondary)",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${task.porcentaje_avance_actual}%`,
                                  background: estadoColor,
                                  borderRadius: 2,
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const shell: React.CSSProperties = {
  minHeight: "100vh",
  background: "var(--color-background-tertiary)",
  fontFamily: "var(--font-mono, 'Courier New', monospace)",
};

const topBar: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 20px",
  borderBottom: "0.5px solid var(--color-border-secondary)",
  background: "var(--color-background-primary)",
};

const taskCard: React.CSSProperties = {
  padding: "10px 12px",
  background: "var(--color-background-primary)",
  border: "0.5px solid var(--color-border-secondary)",
  borderRadius: 8,
  cursor: "pointer",
  transition: "border-color 0.15s",
};

const centered: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100vh",
  fontSize: 13,
  color: "var(--color-text-tertiary)",
  fontFamily: "monospace",
};
