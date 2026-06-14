"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  nombre: string;
  descripcion: string | null;
  estado: string;
  fecha_inicio_planificada: string | null;
  fecha_fin_planificada: string | null;
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

const STATUS_STYLES: Record<string, { dot: string; text: string }> = {
  Activo: { dot: "bg-emerald-500", text: "text-emerald-700" },
  Planificacion: { dot: "bg-sky-500", text: "text-sky-700" },
  Pausado: { dot: "bg-amber-500", text: "text-amber-700" },
  Finalizado: { dot: "bg-slate-400", text: "text-slate-500" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InspectorPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    async function load() {
      const empresaId = user?.companyId;

      if (!empresaId || empresaId === "NOT_ASSIGN") {
        setError("No se encontró una empresa válida vinculada a tu cuenta.");
        setLoading(false);
        return;
      }

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      const { data, error } = await supabase
        .from("proyectos")
        .select(
          "id, nombre, descripcion, estado, fecha_inicio_planificada, fecha_fin_planificada",
        )
        .eq("empresa_id", empresaId)
        .in("estado", ["Activo", "Planificacion"])
        .order("creado_en", { ascending: false });

      if (error) setError(error.message);
      else setProjects(data ?? []);
      setLoading(false);
    }

    load();
  }, [user, authLoading]);

  if (authLoading || loading)
    return (
      <div className="flex items-center justify-center h-screen text-sm text-slate-400">
        Cargando proyectos...
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* header */}
      <div className="flex items-end justify-between px-5 pt-5 pb-4 border-b border-slate-200 bg-white">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            Inspector
          </p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Mis proyectos
          </h1>
        </div>
        <p className="text-xs text-slate-400 capitalize">
          {new Date().toLocaleDateString("es-CL", {
            weekday: "long",
            day: "2-digit",
            month: "long",
          })}
        </p>
      </div>

      {/* list */}
      <div className="p-5 flex flex-col gap-3">
        {projects.length === 0 && (
          <p className="text-sm text-slate-400 text-center mt-16">
            No hay proyectos activos asignados.
          </p>
        )}

        {projects.map((p) => {
          const daysLeft = p.fecha_fin_planificada
            ? diffDays(today, p.fecha_fin_planificada)
            : null;
          const isLate = daysLeft !== null && daysLeft < 0;
          const isClose = daysLeft !== null && daysLeft >= 0 && daysLeft <= 14;
          const status = STATUS_STYLES[p.estado] ?? STATUS_STYLES.Finalizado;

          const daysLabel =
            daysLeft === null
              ? null
              : isLate
                ? `${Math.abs(daysLeft)}d vencido`
                : daysLeft === 0
                  ? "Vence hoy"
                  : `${daysLeft}d restantes`;

          const daysColor = isLate
            ? "text-red-600"
            : isClose
              ? "text-amber-600"
              : "text-slate-400";

          return (
            <Link
              key={p.id}
              href={`/dashboard/inspector/${p.id}`}
              className="no-underline group"
            >
              <div className="p-4 bg-white border border-slate-200 rounded-xl cursor-pointer transition-all group-hover:shadow-md group-hover:border-slate-300">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`}
                      />
                      <span
                        className={`text-xs font-semibold tracking-wide ${status.text}`}
                      >
                        {p.estado}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {p.nombre}
                    </p>
                    {p.descripcion && (
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {p.descripcion}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    {daysLabel && (
                      <p className={`text-xs font-semibold ${daysColor}`}>
                        {daysLabel}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">
                      hasta {fmtDate(p.fecha_fin_planificada)}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
