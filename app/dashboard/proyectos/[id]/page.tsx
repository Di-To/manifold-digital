"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import ProjectTimeline, { type GanttTask } from "@/components/ProjectTimeline";
import { useAuth } from "@/hooks/useAuth";

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

const STATUS_STYLES: Record<
  string,
  { dot: string; text: string; badge: string }
> = {
  Activo: {
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    badge: "bg-emerald-50 ring-emerald-600/10",
  },
  Planificacion: {
    dot: "bg-sky-500",
    text: "text-sky-700",
    badge: "bg-sky-50 ring-sky-600/10",
  },
  Pausado: {
    dot: "bg-amber-500",
    text: "text-amber-700",
    badge: "bg-amber-50 ring-amber-600/10",
  },
  Finalizado: {
    dot: "bg-slate-400",
    text: "text-slate-600",
    badge: "bg-slate-50 ring-slate-600/10",
  },
};

const KPI_COLOR: Record<string, string> = {
  positive: "text-emerald-600",
  info: "text-sky-600",
  warning: "text-amber-600",
  danger: "text-red-600",
  muted: "text-slate-500",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProyectoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [deps, setDeps] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth");
      return;
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    async function load() {
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

      const tareaIds = tareasData.map((t) => t.id);
      const { data: depsData } = await supabase
        .from("dependencias_tareas")
        .select("tarea_id, depende_de_tarea_id")
        .in("tarea_id", tareaIds);

      setTasks(
        (tareasData ?? []).map((t) => ({
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
  }, [id, user, authLoading, router]);

  // ── loading / error ──────────────────────────────────────────────────────

  if (authLoading || loading)
    return (
      <div className="flex items-center justify-center h-screen text-sm text-slate-400">
        Cargando proyecto...
      </div>
    );

  if (error || !project)
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <p className="text-sm text-red-600">
          {error ?? "Proyecto no encontrado"}
        </p>
        <Link
          href="/dashboard/proyectos"
          className="text-xs text-sky-600 hover:underline"
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

  const statusStyle = STATUS_STYLES[project.estado] ?? STATUS_STYLES.Finalizado;
  const desviacion = pctTiempo !== null ? pctFisico - pctTiempo : null;

  const kpis = [
    {
      label: "Avance físico",
      value: `${pctFisico}%`,
      color: KPI_COLOR.positive,
    },
    {
      label: "Tiempo",
      value: pctTiempo !== null ? `${pctTiempo}%` : "—",
      color: KPI_COLOR.info,
    },
    {
      label: "Desviación",
      value:
        desviacion !== null
          ? `${desviacion > 0 ? "+" : ""}${desviacion}%`
          : "—",
      color:
        desviacion !== null && desviacion >= 0
          ? KPI_COLOR.positive
          : KPI_COLOR.danger,
    },
    { label: "Tareas activas", value: `${enCurso}`, color: KPI_COLOR.warning },
    { label: "Bloqueadas", value: `${bloqueadas}`, color: KPI_COLOR.danger },
    {
      label: "Completadas",
      value: `${completadas} / ${totalTareas}`,
      color: KPI_COLOR.muted,
    },
  ];

  // ── JSX ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* top nav */}
      <div className="flex items-center gap-2 px-5 py-2.5 border-b border-slate-200 bg-white shrink-0">
        <Link
          href="/dashboard/proyectos"
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors no-underline"
        >
          ← Proyectos
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-xs text-slate-600 truncate max-w-xs">
          {project.nombre}
        </span>
        <div className="ml-auto">
          <Link
            href={`/dashboard/proyectos/${id}/editar`}
            className="text-xs px-3 py-1 border border-slate-200 rounded-md bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors no-underline"
          >
            Editar
          </Link>
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 overflow-hidden">
        {/* main content */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          {/* project header */}
          <div className="px-6 pt-5 pb-4 border-b border-slate-200 bg-white shrink-0">
            <div className="flex items-start justify-between mb-4">
              <div>
                {/* status badge */}
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
                  <span
                    className={`text-xs font-semibold tracking-wide ${statusStyle.text}`}
                  >
                    {project.estado}
                  </span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  {project.nombre}
                </h1>
                {project.descripcion && (
                  <p className="text-xs text-slate-400 mt-1">
                    {project.descripcion}
                  </p>
                )}
              </div>

              {/* date range */}
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Periodo
                </p>
                <p className="text-xs text-slate-600">
                  {fmtDate(project.fecha_inicio_planificada)} →{" "}
                  {fmtDate(project.fecha_fin_planificada)}
                </p>
                {duracionTotal && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {duracionTotal} días
                  </p>
                )}
              </div>
            </div>

            {/* KPI strip */}
            <div className="flex gap-6 flex-wrap">
              {kpis.map((kpi) => (
                <div key={kpi.label}>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                    {kpi.label}
                  </p>
                  <p
                    className={`text-xl font-black tracking-tight ${kpi.color}`}
                  >
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* timeline */}
          <div className="flex-1 overflow-hidden bg-white p-4">
            {tasks.length > 0 ? (
              <ProjectTimeline
                tasks={tasks}
                dependencies={deps}
                projectName={project.nombre}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <p className="text-sm text-slate-400">
                  No hay tareas importadas.
                </p>
                <Link
                  href={`/dashboard/proyectos/${id}/editar`}
                  className="text-xs text-sky-600 hover:underline"
                >
                  Importar tareas →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* activity sidebar */}
        <div className="w-72 shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 shrink-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Historial de control
            </span>
            <span className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 transition-colors">
              Ver todos
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {/* placeholder — replace with real reportes_avance data */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-700">
                  Sin actividad reciente
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Importa tareas y comienza a registrar avances.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
