"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getProyectoById,
  updateProyecto,
  type Project,
  type ProjectStatus,
} from "@/services/proyectos";

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

function toFormState(p: Project): FormState {
  return {
    nombre: p.nombre ?? "",
    descripcion: p.descripcion ?? "",
    fecha_inicio_planificada: p.fecha_inicio_planificada ?? "",
    fecha_fin_planificada: p.fecha_fin_planificada ?? "",
    estado: (p.estado as ProjectStatus) ?? "Planificacion",
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

export default function EditarProyectoPage() {
  // Add this state at the top of EditarProyectoPage:
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<FormState | null>(null);
  const [original, setOriginal] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    getProyectoById(id)
      .then((p) => {
        if (!p) throw new Error("Proyecto no encontrado.");
        const state = toFormState(p);
        setForm(state);
        setOriginal(state);
      })
      .catch((e) => setFetchError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const input = e.target;
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const payload = JSON.parse(text);

      // override proyecto_id with the current project id
      payload.proyecto_id = id;

      const res = await fetch("/api/import-tareas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Error al importar");
      setImportResult({
        ok: true,
        message: `${data.count} tareas importadas correctamente.`,
      });
    } catch (err) {
      setImportResult({
        ok: false,
        message: err instanceof Error ? err.message : "Error desconocido",
      });
    } finally {
      setImporting(false);
      // reset the input so the same file can be re-uploaded if needed
      input.value = "";
    }
  }

  function update(field: keyof FormState, value: string) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    if (!form) return false;
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

  const isDirty =
    form && original
      ? JSON.stringify(form) !== JSON.stringify(original)
      : false;

  async function handleSubmit() {
    if (!validate() || !form) return;
    setSubmitting(true);
    setServerError(null);

    try {
      await updateProyecto(id, {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
        fecha_inicio_planificada: form.fecha_inicio_planificada,
        fecha_fin_planificada: form.fecha_fin_planificada,
        estado: form.estado,
      });
      router.push(`/proyectos/${id}`);
    } catch (e: unknown) {
      setServerError(
        e instanceof Error ? e.message : "Error al guardar los cambios.",
      );
      setSubmitting(false);
    }
  }

  // ── Loading / error states ──────────────────────────────────────────────────

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Cargando proyecto...</p>
      </div>
    );

  if (fetchError || !form)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-500 mb-4">
            {fetchError ?? "Proyecto no encontrado."}
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

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/proyectos/${id}`}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors mb-4 inline-flex items-center gap-1"
          >
            ← Volver al proyecto
          </Link>
          <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-1">
            Gestión de obras
          </p>
          <h1 className="text-3xl font-bold text-gray-900">Editar proyecto</h1>
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
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900
                placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
            />
          </div>

          {/* Dates */}
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
              Estado
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

          {/* JSON Import */}
          <div className="border-t border-gray-100 pt-6">
            <p className="text-sm font-medium text-gray-700 mb-1">
              Importar tareas desde JSON
              <span className="ml-1 text-xs text-gray-400 font-normal">
                (opcional)
              </span>
            </p>
            <p className="text-xs text-gray-400 mb-3">
              Sube un archivo JSON con el formato de tareas para poblar este
              proyecto. Las tareas existentes no se eliminan.
            </p>

            <label
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm cursor-pointer transition-colors
    ${
      importing
        ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
        : "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
    }`}
            >
              <input
                type="file"
                accept=".json"
                disabled={importing}
                onChange={handleImport}
                className="sr-only"
              />
              {importing ? "Importando..." : "Seleccionar archivo .json"}
            </label>

            {importResult && (
              <div
                className={`mt-3 rounded-lg px-4 py-3 text-sm border
      ${
        importResult.ok
          ? "bg-green-50 border-green-200 text-green-700"
          : "bg-red-50 border-red-200 text-red-700"
      }`}
              >
                {importResult.message}
              </div>
            )}
          </div>

          {/* Server error */}
          {serverError && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
              {serverError}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            {isDirty ? (
              <p className="text-xs text-amber-600">
                Tienes cambios sin guardar
              </p>
            ) : (
              <p className="text-xs text-gray-400">Sin cambios</p>
            )}
            <div className="flex items-center gap-3">
              <Link
                href={`/proyectos/${id}`}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancelar
              </Link>
              <button
                onClick={handleSubmit}
                disabled={submitting || !isDirty}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                  text-white text-sm font-medium rounded-lg transition-colors"
              >
                {submitting ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
