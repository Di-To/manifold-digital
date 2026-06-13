"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { useAuth } from "@/hooks/useAuth";

// ─── Swap for real session once auth lands ────────────────────────────────────
// const USUARIO_ID = "a1111111-1111-1111-1111-111111111111";

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

const ESTADO_OPTIONS: {
  value: EstadoTarea;
  label: string;
  color: string;
  description: string;
}[] = [
    {
      value: "Completada",
      label: "Aprobada",
      color: "#0F6E56",
      description: "Tarea completada y verificada",
    },
    {
      value: "En_Curso",
      label: "Sin revisar",
      color: "#378ADD",
      description: "En progreso, sin revisión final",
    },
    {
      value: "Bloqueada",
      label: "Bloqueada",
      color: "#993C1D",
      description: "Impedimento activo, requiere atención",
    },
  ];

const GRAVEDAD_OPTIONS: { value: Gravedad; label: string; color: string }[] = [
  { value: "Baja", label: "Baja", color: "#378ADD" },
  { value: "Media", label: "Media", color: "#BA7517" },
  { value: "Alta", label: "Alta", color: "#E8714A" },
  { value: "Critica", label: "Crítica", color: "#993C1D" },
];

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
          setLoading(false); // ← runs on error
          return;
        }
        setTask(data);
        const current = ESTADO_OPTIONS.find((o) => o.value === data.estado);
        if (current) setEstado(current.value);
        setLoading(false); // ← runs on success
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

    // 1. insert reporte_avance
    const pct =
      estado === "Completada"
        ? 100
        : estado === "Bloqueada"
          ? task.porcentaje_avance_actual
          : task.porcentaje_avance_actual;

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

    // 2. update tarea estado
    const { error: tareaErr } = await supabase
      .from("tareas")
      .update({
        estado,
        porcentaje_avance_actual: pct,
      })
      .eq("id", task.id);

    if (tareaErr) {
      setError(tareaErr.message);
      setSubmitting(false);
      return;
    }

    // 3. if bloqueada, insert incidencia
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

  // ── loading / error ──────────────────────────────────────────────────────

  if (authLoading || loading) return <div style={centered}>Cargando tarea y sesión...</div>;
  if (!user) return <div style={centered}>No autorizado. Por favor inicia sesión.</div>;

  if (error && !task)
    return (
      <div style={centered}>
        <p style={{ color: "#993C1D", fontSize: 13 }}>{error}</p>
      </div>
    );

  if (success)
    return (
      <div style={{ ...centered, flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 28 }}>✓</div>
        <p style={{ fontSize: 13, color: "#0F6E56", fontFamily: "monospace" }}>
          Reporte enviado
        </p>
      </div>
    );

  if (!task) return null;

  const today = new Date().toISOString().slice(0, 10);
  const daysLeft = diffDays(today, task.fecha_fin_planificada);

  return (
    <div style={shell}>
      {/* top bar */}
      <div style={topBar}>
        <Link
          href={`/dashboard/inspector/${id}`}
          style={{
            fontSize: 11,
            color: "var(--color-text-tertiary)",
            textDecoration: "none",
          }}
        >
          ← tareas
        </Link>
        <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
          Reportar avance
        </span>
      </div>

      <div style={{ padding: "20px", maxWidth: 540, margin: "0 auto" }}>
        {/* task info card */}
        <div style={infoCard}>
          <p
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--color-text-primary)",
              margin: "0 0 8px",
            }}
          >
            {task.titulo}
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div>
              <p style={metaLabel}>INICIO</p>
              <p style={metaValue}>{fmtDate(task.fecha_inicio_planificada)}</p>
            </div>
            <div>
              <p style={metaLabel}>FIN</p>
              <p style={metaValue}>{fmtDate(task.fecha_fin_planificada)}</p>
            </div>
            <div>
              <p style={metaLabel}>PLAZO</p>
              <p
                style={{
                  ...metaValue,
                  color:
                    daysLeft < 0
                      ? "#993C1D"
                      : daysLeft <= 7
                        ? "#BA7517"
                        : "var(--color-text-secondary)",
                }}
              >
                {daysLeft < 0
                  ? `${Math.abs(daysLeft)}d vencida`
                  : daysLeft === 0
                    ? "vence hoy"
                    : `${daysLeft}d restantes`}
              </p>
            </div>
            <div>
              <p style={metaLabel}>AVANCE</p>
              <p style={metaValue}>{task.porcentaje_avance_actual}%</p>
            </div>
          </div>
        </div>

        {/* estado selector */}
        <div style={section}>
          <p style={sectionLabel}>Estado de la tarea</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ESTADO_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setEstado(opt.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: `1.5px solid ${estado === opt.value ? opt.color : "var(--color-border-secondary)"}`,
                  background:
                    estado === opt.value
                      ? `${opt.color}18`
                      : "var(--color-background-primary)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.1s",
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: opt.color,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--color-text-primary)",
                      margin: 0,
                    }}
                  >
                    {opt.label}
                  </p>
                  <p
                    style={{
                      fontSize: 10,
                      color: "var(--color-text-tertiary)",
                      margin: "1px 0 0",
                    }}
                  >
                    {opt.description}
                  </p>
                </div>
                {estado === opt.value && (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 12,
                      color: opt.color,
                    }}
                  >
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* incidencia fields — only when bloqueada */}
        {showIncidencia && (
          <div style={section}>
            <p style={sectionLabel}>Detalle del bloqueo</p>

            <div style={{ marginBottom: 12 }}>
              <p style={fieldLabel}>Gravedad</p>
              <div style={{ display: "flex", gap: 8 }}>
                {GRAVEDAD_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setGravedad(g.value)}
                    style={{
                      flex: 1,
                      padding: "6px 0",
                      borderRadius: 6,
                      border: `1.5px solid ${gravedad === g.value ? g.color : "var(--color-border-secondary)"}`,
                      background:
                        gravedad === g.value
                          ? `${g.color}18`
                          : "var(--color-background-primary)",
                      fontSize: 11,
                      fontWeight: gravedad === g.value ? 600 : 400,
                      color:
                        gravedad === g.value
                          ? g.color
                          : "var(--color-text-tertiary)",
                      cursor: "pointer",
                      transition: "all 0.1s",
                      fontFamily: "inherit",
                    }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p style={fieldLabel}>
                Descripción del problema{" "}
                <span style={{ color: "#993C1D" }}>*</span>
              </p>
              <textarea
                value={descIncidencia}
                onChange={(e) => setDescIncidencia(e.target.value)}
                rows={3}
                placeholder="Describe qué está bloqueando esta tarea..."
                style={textarea}
              />
            </div>
          </div>
        )}

        {/* comentario + evidencia */}
        <div style={section}>
          <p style={sectionLabel}>Observaciones</p>

          <div style={{ marginBottom: 12 }}>
            <p style={fieldLabel}>Comentario</p>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              placeholder="Observaciones sobre el avance..."
              style={textarea}
            />
          </div>

          <div>
            <p style={fieldLabel}>URL de evidencia fotográfica</p>
            <input
              type="url"
              value={urlEvidencia}
              onChange={(e) => setUrlEvidencia(e.target.value)}
              placeholder="https://..."
              style={input}
            />
          </div>
        </div>

        {/* error */}
        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "#993C1D18",
              border: "0.5px solid #993C1D",
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 11, color: "#993C1D", margin: 0 }}>{error}</p>
          </div>
        )}

        {/* submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || (showIncidencia && !descIncidencia.trim())}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 8,
            border: "none",
            background: submitting
              ? "var(--color-border-secondary)"
              : "#185FA5",
            color: submitting ? "var(--color-text-tertiary)" : "#fff",
            fontSize: 13,
            fontWeight: 500,
            cursor: submitting ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            transition: "background 0.1s",
          }}
        >
          {submitting ? "Enviando..." : "Enviar reporte"}
        </button>

        <div style={{ height: 40 }} />
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

const infoCard: React.CSSProperties = {
  padding: "14px",
  borderRadius: 8,
  border: "0.5px solid var(--color-border-secondary)",
  background: "var(--color-background-primary)",
  marginBottom: 20,
};

const section: React.CSSProperties = {
  marginBottom: 20,
};

const sectionLabel: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: "0.1em",
  color: "var(--color-text-tertiary)",
  margin: "0 0 10px",
};

const fieldLabel: React.CSSProperties = {
  fontSize: 10,
  color: "var(--color-text-secondary)",
  margin: "0 0 5px",
};

const metaLabel: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.08em",
  color: "var(--color-text-tertiary)",
  margin: 0,
};

const metaValue: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: "var(--color-text-secondary)",
  margin: "2px 0 0",
};

const textarea: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "0.5px solid var(--color-border-secondary)",
  background: "var(--color-background-primary)",
  color: "var(--color-text-primary)",
  fontSize: 12,
  fontFamily: "inherit",
  resize: "vertical",
  boxSizing: "border-box",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "0.5px solid var(--color-border-secondary)",
  background: "var(--color-background-primary)",
  color: "var(--color-text-primary)",
  fontSize: 12,
  fontFamily: "inherit",
  boxSizing: "border-box",
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
