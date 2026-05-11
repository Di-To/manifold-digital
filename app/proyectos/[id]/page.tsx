"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getProyectoById,
  deleteProyecto,
  type Project,
  type ProjectStatus,
} from "@/services/proyectos";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  Planificacion: "Planificación",
  Activo: "Activo",
  Pausado: "Pausado",
  Finalizado: "Finalizado",
};

const STATUS_COLORS: Record<ProjectStatus, string> = {
  Activo: "bg-emerald-100 text-emerald-800",
  Planificacion: "bg-blue-100 text-blue-800",
  Pausado: "bg-amber-100 text-amber-800",
  Finalizado: "bg-gray-100 text-gray-600",
};

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 w-40 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 text-right">{value}</span>
    </div>
  );
}

export default function ProyectoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getProyectoById(id)
      .then(setProject)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteProyecto(id);
      router.push("/proyectos");
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Error al eliminar el proyecto.",
      );
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Cargando proyecto...</p>
      </div>
    );

  if (error || !project)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-500 mb-4">
            {error ?? "Proyecto no encontrado."}
          </p>
          <Link
            href="/proyectos"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Volver a proyectos
          </Link>
        </div>
      </div>
    );

  const status = project.estado as ProjectStatus;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Back */}
        <Link
          href="/proyectos"
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors mb-6 inline-flex items-center gap-1"
        >
          ← Volver a proyectos
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-1">
              Detalle de proyecto
            </p>
            <h1 className="text-3xl font-bold text-gray-900">
              {project.nombre}
            </h1>
          </div>
          <span
            className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[status]}`}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>

        {/* Info card */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-2 mb-6">
          <InfoRow
            label="ID"
            value={
              <span className="font-mono text-xs text-gray-400">
                {project.id}
              </span>
            }
          />
          <InfoRow
            label="Descripción"
            value={
              project.descripcion || (
                <span className="text-gray-400 italic">Sin descripción</span>
              )
            }
          />
          <InfoRow
            label="Fecha de inicio"
            value={formatDate(project.fecha_inicio_planificada)}
          />
          <InfoRow
            label="Fecha de término"
            value={formatDate(project.fecha_fin_planificada)}
          />
          <InfoRow label="Creado" value={formatDate(project.creado_en)} />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Link
            href={`/proyectos/${id}/editar`}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Editar proyecto
          </Link>

          {/* Delete — two-step confirmation */}
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="px-4 py-2 text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Eliminar proyecto
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              <span className="text-sm text-red-700">
                ¿Confirmar eliminación?
              </span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-xs font-medium rounded transition-colors"
              >
                {deleting ? "Eliminando..." : "Sí, eliminar"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
