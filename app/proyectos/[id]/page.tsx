"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import ProjectTimeline, { type GanttTask } from "@/components/ProjectTimeline";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  nombre: string;
  descripcion: string | null;
  estado: string;
  fecha_inicio_planificada: string | null;
  fecha_fin_planificada: string | null;
  creado_en: string;
}

interface Dependency {
  from: string;
  to: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function diffDays(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

const STATUS_COLORS: Record<string, string> = {
  Activo: "#1D9E75",
  Planificacion: "#378ADD",
  Pausado: "#BA7517",
  Finalizado: "#555",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProyectoDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [deps, setDeps] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    async function load() {
      // project
      const { data: proj, error: projErr } = await supabase
        .from("proyectos")
        .select(
          "id, nombre, descripcion, estado, fecha_inicio_planificada, fecha_fin_planificada, creado_en",
        )
        .eq("id", id)
        .single();

      if (projErr) {
        setError(projErr.message);
        return;
      }
      setProject(proj);

      // tasks
      const { data: tareasData, error: tareasErr } = await supabase
        .from("tareas")
        .select(
          "id, titulo, tarea_padre_id, fecha_inicio_planificada, fecha_fin_planificada, estado, porcentaje_avance_actual",
        )
        .eq("proyecto_id", id)
        .order("creado_en", { ascending: true });

      if (tareasErr) {
        setError(tareasErr.message);
        return;
      }
      if (!tareasData?.length) return;

      // dependencies
      const tareaIds = tareasData.map((t) => t.id);
      const { data: depsData } = await supabase
        .from("dependencias_tareas")
        .select("tarea_id, depende_de_tarea_id")
        .in("tarea_id", tareaIds);

      setTasks(
        tareasData.map((t) => ({
          id: t.id,
          titulo: t.titulo,
          tarea_padre_id: t.tarea_padre_id,
          fecha_inicio_planificada: t.fecha_inicio_planificada,
          fecha_fin_planificada: t.fecha_fin_planificada,
          estado: t.estado ?? "Pendiente",
          porcentaje_avance_actual: t.porcentaje_avance_actual ?? 0,
        })),
      );

      setDeps(
        (depsData ?? []).map((d) => ({
          from: d.depende_de_tarea_id,
          to: d.tarea_id,
        })),
      );
    }

    load().finally(() => setLoading(false));
  }, [id]);

  // ── loading / error ──────────────────────────────────────────────────────

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "var(--color-text-tertiary)",
          fontSize: 13,
          fontFamily: "monospace",
        }}
      >
        Cargando proyecto...
      </div>
    );

  if (error || !project)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: 12,
        }}
      >
        <p style={{ color: "var(--color-text-danger)", fontSize: 13 }}>
          {error ?? "Proyecto no encontrado"}
        </p>
        <Link
          href="/proyectos"
          style={{ fontSize: 12, color: "var(--color-text-info)" }}
        >
          ← Volver a proyectos
        </Link>
      </div>
    );

  // ── derived stats ────────────────────────────────────────────────────────

  const totalTareas = tasks.length;
  const completadas = tasks.filter((t) => t.estado === "Completada").length;
  const enCurso = tasks.filter((t) => t.estado === "En_Curso").length;
  const bloqueadas = tasks.filter((t) => t.estado === "Bloqueada").length;
  const pctFisico =
    totalTareas > 0 ? Math.round((completadas / totalTareas) * 100) : 0;

  const duracionTotal =
    project.fecha_inicio_planificada && project.fecha_fin_planificada
      ? diffDays(
          project.fecha_inicio_planificada,
          project.fecha_fin_planificada,
        )
      : null;

  const diasTranscurridos = project.fecha_inicio_planificada
    ? Math.max(
        0,
        diffDays(
          project.fecha_inicio_planificada,
          new Date().toISOString().slice(0, 10),
        ),
      )
    : null;

  const pctTiempo =
    duracionTotal && diasTranscurridos !== null
      ? Math.min(100, Math.round((diasTranscurridos / duracionTotal) * 100))
      : null;

  const statusColor = STATUS_COLORS[project.estado] ?? "#555";

  // ── JSX ──────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--color-background-tertiary)",
        fontFamily: "var(--font-mono, 'Courier New', monospace)",
        overflow: "hidden",
      }}
    >
      {/* ── top nav ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 20px",
          borderBottom: "0.5px solid var(--color-border-secondary)",
          background: "var(--color-background-primary)",
          flexShrink: 0,
        }}
      >
        <Link
          href="/proyectos"
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
            maxWidth: 300,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {project.nombre}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Link
            href={`/proyectos/${id}/editar`}
            style={{
              fontSize: 10,
              padding: "4px 10px",
              border: "0.5px solid var(--color-border-secondary)",
              borderRadius: 5,
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              background: "var(--color-background-secondary)",
            }}
          >
            editar
          </Link>
        </div>
      </div>

      {/* ── body ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* ── left: main content ──────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {/* project header */}
          <div
            style={{
              padding: "20px 24px 16px",
              borderBottom: "0.5px solid var(--color-border-secondary)",
              background: "var(--color-background-primary)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: statusColor,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      color: statusColor,
                      fontWeight: 500,
                    }}
                  >
                    {project.estado.toUpperCase()}
                  </span>
                </div>
                <h1
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {project.nombre}
                </h1>
                {project.descripcion && (
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-tertiary)",
                      margin: "4px 0 0",
                    }}
                  >
                    {project.descripcion}
                  </p>
                )}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p
                  style={{
                    fontSize: 9,
                    color: "var(--color-text-tertiary)",
                    margin: 0,
                    letterSpacing: "0.06em",
                  }}
                >
                  PERIODO
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--color-text-secondary)",
                    margin: "2px 0 0",
                  }}
                >
                  {fmtDate(project.fecha_inicio_planificada)} →{" "}
                  {fmtDate(project.fecha_fin_planificada)}
                </p>
                {duracionTotal && (
                  <p
                    style={{
                      fontSize: 10,
                      color: "var(--color-text-tertiary)",
                      margin: "2px 0 0",
                    }}
                  >
                    {duracionTotal} días
                  </p>
                )}
              </div>
            </div>

            {/* KPI strip */}
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {[
                {
                  label: "AVANCE FÍSICO",
                  value: `${pctFisico}%`,
                  color: "#1D9E75",
                },
                {
                  label: "TIEMPO",
                  value: pctTiempo !== null ? `${pctTiempo}%` : "—",
                  color: "#378ADD",
                },
                {
                  label: "DESVIACIÓN",
                  value: pctTiempo !== null ? `${pctFisico - pctTiempo}%` : "—",
                  color: pctFisico >= (pctTiempo ?? 0) ? "#1D9E75" : "#993C1D",
                },
                {
                  label: "TAREAS ACTIVAS",
                  value: `${enCurso}`,
                  color: "#BA7517",
                },
                {
                  label: "BLOQUEADAS",
                  value: `${bloqueadas}`,
                  color: "#993C1D",
                },
                {
                  label: "COMPLETADAS",
                  value: `${completadas} / ${totalTareas}`,
                  color: "var(--color-text-tertiary)",
                },
              ].map((kpi) => (
                <div key={kpi.label}>
                  <p
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.08em",
                      color: "var(--color-text-tertiary)",
                      margin: 0,
                    }}
                  >
                    {kpi.label}
                  </p>
                  <p
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: kpi.color,
                      margin: "2px 0 0",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* timeline */}
          <div
            style={{
              flex: 1,
              overflow: "hidden",
              background: "var(--color-background-primary)",
            }}
          >
            {tasks.length > 0 ? (
              <ProjectTimeline
                tasks={tasks}
                dependencies={deps}
                projectName={project.nombre}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  gap: 10,
                }}
              >
                <p
                  style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}
                >
                  No hay tareas importadas.
                </p>
                <Link
                  href={`/proyectos/${id}/editar`}
                  style={{ fontSize: 11, color: "var(--color-text-info)" }}
                >
                  Importar tareas →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── right: activity sidebar ─────────────────────────────────── */}
        <div
          style={{
            width: 300,
            flexShrink: 0,
            borderLeft: "0.5px solid var(--color-border-secondary)",
            background: "var(--color-background-primary)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "0.5px solid var(--color-border-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.08em",
                color: "var(--color-text-secondary)",
              }}
            >
              HISTORIAL DE CONTROL
            </span>
            <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
              ver todos
            </span>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* placeholder activity items — replace with real reportes_avance data */}
            {[
              {
                nombre: "Sin actividad reciente",
                tipo: "—",
                tiempo: "",
                descripcion: "Importa tareas y comienza a registrar avances.",
                color: "#555",
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "0.5px solid var(--color-border-secondary)",
                  background: "var(--color-background-secondary)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {item.nombre}
                  </span>
                  <span
                    style={{ fontSize: 9, color: "var(--color-text-tertiary)" }}
                  >
                    {item.tiempo}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 9,
                    color: "var(--color-text-tertiary)",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {item.descripcion}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
