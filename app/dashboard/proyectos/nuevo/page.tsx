"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createProyecto, type ProjectStatus } from "@/services/proyectos";
import { useAuth } from "@/hooks/useAuth";

// ─── Swap for real session empresa_id once auth is ready ──────────────────────
// const EMPRESA_ID = "e1111111-1111-1111-1111-111111111111";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "Planificacion", label: "Planificación" },
  { value: "Activo", label: "Activo" },
  { value: "Pausado", label: "Pausado" },
  { value: "Finalizado", label: "Finalizado" },
];

interface FormState {
  nombre: string;
  descripcion: string;
  fecha_inicio_planificada: string;
  fecha_fin_planificada: string;
  estado: ProjectStatus;
}

const EMPTY_FORM: FormState = {
  nombre: "",
  descripcion: "",
  fecha_inicio_planificada: "",
  fecha_fin_planificada: "",
  estado: "Planificacion",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

export default function NuevoProyectoPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { user } = useAuth();

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};

    if (!form.nombre.trim()) next.nombre = "El nombre es obligatorio.";
    if (form.nombre.trim().length > 150) next.nombre = "Máximo 150 caracteres.";
    if (!form.fecha_inicio_planificada)
      next.fecha_inicio_planificada = "La fecha de inicio es obligatoria.";
    if (!form.fecha_fin_planificada)
      next.fecha_fin_planificada = "La fecha de término es obligatoria.";
    if (
      form.fecha_inicio_planificada &&
      form.fecha_fin_planificada &&
      form.fecha_fin_planificada <= form.fecha_inicio_planificada
    ) {
      next.fecha_fin_planificada =
        "La fecha de término debe ser posterior al inicio.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    if (!user?.companyId || user.companyId === 'NOT_ASSIGN') {
      setServerError("Tu cuenta de usuario no tiene una empresa válida asignada para crear proyectos.");
      return;
    }
    setSubmitting(true);
    setServerError(null);

    try {
      await createProyecto({
        empresa_id: user.companyId,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
        fecha_inicio_planificada: form.fecha_inicio_planificada,
        fecha_fin_planificada: form.fecha_fin_planificada,
        estado: form.estado,
      });
      router.push("/dashboard/proyectos");
    } catch (e: unknown) {
      setServerError(
        e instanceof Error ? e.message : "Error al crear el proyecto.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/proyectos"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors mb-4 inline-flex items-center gap-1"
          >
            ← Volver a proyectos
          </Link>
          <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-1">
            Gestión de obras
          </p>
          <h1 className="text-3xl font-bold text-gray-900">Nuevo proyecto</h1>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-6">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => update("nombre", e.target.value)}
              placeholder="Ej: Torre Manifold Fase 2"
              className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-blue-500 transition
                ${errors.nombre ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"}`}
            />
            <FieldError message={errors.nombre} />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
              <span className="ml-1 text-xs text-gray-400 font-normal">
                (opcional)
              </span>
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) => update("descripcion", e.target.value)}
              placeholder="Describe el alcance del proyecto..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900
                placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
            />
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de inicio <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.fecha_inicio_planificada}
                onChange={(e) =>
                  update("fecha_inicio_planificada", e.target.value)
                }
                className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-blue-500 transition
                  ${errors.fecha_inicio_planificada ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"}`}
              />
              <FieldError message={errors.fecha_inicio_planificada} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de término <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.fecha_fin_planificada}
                onChange={(e) =>
                  update("fecha_fin_planificada", e.target.value)
                }
                className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-blue-500 transition
                  ${errors.fecha_fin_planificada ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"}`}
              />
              <FieldError message={errors.fecha_fin_planificada} />
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado inicial
            </label>
            <select
              value={form.estado}
              onChange={(e) => update("estado", e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900
                focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Server error */}
          {serverError && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
              {serverError}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/dashboard/proyectos"
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancelar
            </Link>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                text-white text-sm font-medium rounded-lg transition-colors"
            >
              {submitting ? "Creando..." : "Crear proyecto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
