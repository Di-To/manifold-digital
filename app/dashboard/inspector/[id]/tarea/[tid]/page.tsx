"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

type EstadoTarea = "Completada" | "Pendiente" | "En_Curso" | "Bloqueada";
type Gravedad = "Baja" | "Media" | "Alta" | "Critica";

interface Task {
  id: string;
  titulo: string;
  fecha_inicio_planificada: string;
  fecha_fin_planificada: string;
  estado: string;
  porcentaje_avance_actual: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ESTADO_OPTIONS: {
  value: EstadoTarea;
  label: string;
  dot: string;
  ring: string;
  bg: string;
  check: string;
  description: string;
}[] = [
  {
    value: "Completada",
    label: "Aprobada",
    dot: "bg-emerald-600",
    ring: "border-emerald-600",
    bg: "bg-emerald-50",
    check: "text-emerald-600",
    description: "Tarea completada y verificada",
  },
  {
    value: "En_Curso",
    label: "Sin revisar",
    dot: "bg-sky-500",
    ring: "border-sky-500",
    bg: "bg-sky-50",
    check: "text-sky-500",
    description: "En progreso, sin revisión final",
  },
  {
    value: "Bloqueada",
    label: "Bloqueada",
    dot: "bg-red-700",
    ring: "border-red-700",
    bg: "bg-red-50",
    check: "text-red-700",
    description: "Impedimento activo, requiere atención",
  },
];

const GRAVEDAD_OPTIONS: {
  value: Gravedad;
  label: string;
  active: string;
  ring: string;
}[] = [
  {
    value: "Baja",
    label: "Baja",
    active: "text-sky-700 bg-sky-50",
    ring: "border-sky-500",
  },
  {
    value: "Media",
    label: "Media",
    active: "text-amber-700 bg-amber-50",
    ring: "border-amber-500",
  },
  {
    value: "Alta",
    label: "Alta",
    active: "text-orange-700 bg-orange-50",
    ring: "border-orange-500",
  },
  {
    value: "Critica",
    label: "Crítica",
    active: "text-red-700 bg-red-50",
    ring: "border-red-600",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function diffDays(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InspectorTareaPage() {
  const { id, tid } = useParams<{ id: string; tid: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // form state
  const [estado, setEstado] = useState<EstadoTarea>("En_Curso");
  const [comentario, setComentario] = useState("");
  const [urlEvidencia, setUrlEvidencia] = useState("");
  const [gravedad, setGravedad] = useState<Gravedad>("Media");
  const [descIncidencia, setDescIncidencia] = useState("");

  const showIncidencia = estado === "Bloqueada";

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    supabase
      .from("tareas")
      .select(
        "id, titulo, fecha_inicio_planificada, fecha_fin_planificada, estado, porcentaje_avance_actual",
      )
      .eq("id", tid)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }
        setTask(data);
        const current = ESTADO_OPTIONS.find((o) => o.value === data.estado);
        if (current) setEstado(current.value);
        setLoading(false);
      });
  }, [tid]);

  async function handleSubmit() {
    if (!task) return;
    setSubmitting(true);
    setError(null);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const pct = estado === "Completada" ? 100 : task.porcentaje_avance_actual;

    const { error: reporteErr } = await supabase
      .from("reportes_avance")
      .insert({
        tarea_id: task.id,
        usuario_id: user?.id,
        porcentaje_reportado: pct,
        comentarios: comentario.trim() || null,
        url_evidencia: urlEvidencia.trim() || null,
      });

    if (reporteErr) {
      setError(reporteErr.message);
      setSubmitting(false);
      return;
    }

    const { error: tareaErr } = await supabase
      .from("tareas")
      .update({ estado, porcentaje_avance_actual: pct })
      .eq("id", task.id);

    if (tareaErr) {
      setError(tareaErr.message);
      setSubmitting(false);
      return;
    }

    if (showIncidencia && descIncidencia.trim()) {
      const { error: incErr } = await supabase.from("incidencias").insert({
        proyecto_id: id,
        tarea_id: task.id,
        reportado_por: user?.id,
        tipo_incidencia: "Bloqueo",
        gravedad,
        descripcion: descIncidencia.trim(),
        estado: "Abierta",
      });
      if (incErr) {
        setError(incErr.message);
        setSubmitting(false);
        return;
      }
    }

    setSuccess(true);
    setTimeout(() => router.push(`/dashboard/inspector/${id}`), 1500);
  }

  // ── loading / error / success ────────────────────────────────────────────

  if (authLoading || loading)
    return (
      <div className="flex items-center justify-center h-screen text-sm text-slate-400">
        Cargando tarea...
      </div>
    );

  if (!user)
    return (
      <div className="flex items-center justify-center h-screen text-sm text-slate-400">
        No autorizado. Por favor inicia sesión.
      </div>
    );

  if (error && !task)
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );

  if (success)
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <div className="text-3xl text-emerald-600">✓</div>
        <p className="text-sm font-semibold text-emerald-700">
          Reporte enviado
        </p>
      </div>
    );

  if (!task) return null;

  const today = new Date().toISOString().slice(0, 10);
  const daysLeft = diffDays(today, task.fecha_fin_planificada);
  const daysLabel =
    daysLeft < 0
      ? `${Math.abs(daysLeft)}d vencida`
      : daysLeft === 0
        ? "Vence hoy"
        : `${daysLeft}d restantes`;
  const daysColor =
    daysLeft < 0
      ? "text-red-600"
      : daysLeft <= 7
        ? "text-amber-600"
        : "text-slate-500";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white">
        <Link
          href={`/dashboard/inspector/${id}`}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors no-underline"
        >
          ← Tareas
        </Link>
        <span className="text-xs font-semibold text-slate-500">
          Reportar avance
        </span>
      </div>

      <div className="px-5 py-6 max-w-xl mx-auto flex flex-col gap-5">
        {/* task info card */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <p className="text-sm font-semibold text-slate-900 mb-3">
            {task.titulo}
          </p>
          <div className="flex gap-5 flex-wrap">
            {[
              {
                label: "Inicio",
                value: fmtDate(task.fecha_inicio_planificada),
                color: "",
              },
              {
                label: "Fin",
                value: fmtDate(task.fecha_fin_planificada),
                color: "",
              },
              { label: "Plazo", value: daysLabel, color: daysColor },
              {
                label: "Avance",
                value: `${task.porcentaje_avance_actual}%`,
                color: "",
              },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                  {label}
                </p>
                <p
                  className={`text-xs font-semibold ${color || "text-slate-600"}`}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* estado selector */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Estado de la tarea
          </p>
          <div className="flex flex-col gap-2">
            {ESTADO_OPTIONS.map((opt) => {
              const isSelected = estado === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setEstado(opt.value)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    isSelected
                      ? `${opt.bg} ${opt.ring}`
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${opt.dot}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 m-0">
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {opt.description}
                    </p>
                  </div>
                  {isSelected && (
                    <span className={`text-sm font-bold shrink-0 ${opt.check}`}>
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* incidencia — only when bloqueada */}
        {showIncidencia && (
          <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col gap-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Detalle del bloqueo
            </p>

            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">
                Gravedad
              </p>
              <div className="flex gap-2">
                {GRAVEDAD_OPTIONS.map((g) => {
                  const isSelected = gravedad === g.value;
                  return (
                    <button
                      key={g.value}
                      onClick={() => setGravedad(g.value)}
                      className={`flex-1 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? `${g.active} ${g.ring}`
                          : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-600 mb-1.5">
                Descripción del problema <span className="text-red-500">*</span>
              </p>
              <textarea
                value={descIncidencia}
                onChange={(e) => setDescIncidencia(e.target.value)}
                rows={3}
                placeholder="Describe qué está bloqueando esta tarea..."
                className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* observaciones */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col gap-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Observaciones
          </p>

          <div>
            <p className="text-xs font-medium text-slate-600 mb-1.5">
              Comentario
            </p>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              placeholder="Observaciones sobre el avance..."
              className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-600 mb-1.5">
              URL de evidencia fotográfica
            </p>
            <input
              type="url"
              value={urlEvidencia}
              onChange={(e) => setUrlEvidencia(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* error */}
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || (showIncidencia && !descIncidencia.trim())}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Enviando..." : "Enviar reporte"}
        </button>

        <div className="h-8" />
      </div>
    </div>
  );
}
