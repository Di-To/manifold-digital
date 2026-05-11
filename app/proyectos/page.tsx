"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getProyectos,
  type Project,
  type ProjectStatus,
} from "@/services/proyectos";

// ─── Swap for real session empresa_id once auth is ready ──────────────────────
const EMPRESA_ID = "e1111111-1111-1111-1111-111111111111";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  Planificacion: "Planificación",
  Activo: "Activo",
  Pausado: "Pausado",
  Finalizado: "Finalizado",
};

const STATUS_GROUPS: { label: string; statuses: ProjectStatus[] }[] = [
  { label: "Proyectos activos", statuses: ["Activo", "Planificacion"] },
  { label: "Proyectos pausados", statuses: ["Pausado"] },
  { label: "Proyectos cerrados", statuses: ["Finalizado"] },
];

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const styles: Record<ProjectStatus, string> = {
    Activo: "bg-emerald-100 text-emerald-800",
    Planificacion: "bg-blue-100 text-blue-800",
    Pausado: "bg-amber-100 text-amber-800",
    Finalizado: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function ProjectGroup({
  label,
  projects,
}: {
  label: string;
  projects: Project[];
}) {
  const [open, setOpen] = useState(true);
  if (projects.length === 0) return null;

  return (
    <div className="mb-8">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm font-semibold text-blue-600 mb-3 hover:text-blue-800 transition-colors"
      >
        <span>{open ? "▲" : "▼"}</span>
        {label}
        <span className="text-gray-400 font-normal">({projects.length})</span>
      </button>

      {open && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 font-medium">Estado</th>
                <th className="text-left px-4 py-3 font-medium">Inicio</th>
                <th className="text-left px-4 py-3 font-medium">
                  Fecha prevista
                </th>
                <th className="text-left px-4 py-3 font-medium">Creado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {p.nombre}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.estado as ProjectStatus} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(p.fecha_inicio_planificada)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(p.fecha_fin_planificada)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(p.creado_en)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/proyectos/${p.id}`}
                      className="inline-block px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ProyectosPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProyectos(EMPRESA_ID)
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-1">
              Gestión de obras
            </p>
            <h1 className="text-3xl font-bold text-gray-900">
              Listado de proyectos
            </h1>
          </div>
          <Link
            href="/proyectos/nuevo"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            Nuevo proyecto
          </Link>
        </div>

        {/* States */}
        {loading && (
          <div className="text-center py-20 text-gray-400 text-sm">
            Cargando proyectos...
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
            Error al cargar proyectos: {error}
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className="text-center py-20 text-gray-400 text-sm">
            No hay proyectos aún.{" "}
            <Link
              href="/proyectos/nuevo"
              className="text-blue-600 hover:underline"
            >
              Crear el primero
            </Link>
          </div>
        )}

        {/* Grouped tables */}
        {!loading &&
          !error &&
          STATUS_GROUPS.map((group) => (
            <ProjectGroup
              key={group.label}
              label={group.label}
              projects={projects.filter((p) =>
                group.statuses.includes(p.estado as ProjectStatus),
              )}
            />
          ))}
      </div>
    </div>
  );
}
