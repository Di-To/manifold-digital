"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { useAuth } from "@/hooks/useAuth";

// ─── Swap for real session once auth lands ────────────────────────────────────
// const EMPRESA_ID = "e1111111-1111-1111-1111-111111111111";

interface Project {
  id: string;
  nombre: string;
  descripcion: string | null;
  estado: string;
  fecha_inicio_planificada: string | null;
  fecha_fin_planificada: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  Activo: "#1D9E75",
  Planificacion: "#378ADD",
  Pausado: "#BA7517",
  Finalizado: "#555",
};

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

export default function InspectorPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    const empresaId = user?.companyId;
    if (!empresaId || empresaId === 'NOT_ASSIGN') {
      setError("No se encontró una empresa válida vinculada a tu cuenta.");
      setLoading(false);
      return;
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    supabase
      .from("proyectos")
      .select(
        "id, nombre, descripcion, estado, fecha_inicio_planificada, fecha_fin_planificada",
      )
      .eq("empresa_id", empresaId)
      .in("estado", ["Activo", "Planificacion"])
      .order("creado_en", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setProjects(data ?? []);
        setLoading(false);
      });
  }, [user, authLoading]);

  if (authLoading || loading) return <div style={centered}>Cargando proyectos...</div>;

  if (error)
    return (
      <div style={centered}>
        <p style={{ color: "#993C1D" }}>{error}</p>
      </div>
    );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={shell}>
      {/* header */}
      <div style={topBar}>
        <div>
          <p style={eyebrow}>INSPECTOR</p>
          <h1 style={title}>Mis proyectos</h1>
        </div>
        <p style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
          {new Date().toLocaleDateString("es-CL", {
            weekday: "long",
            day: "2-digit",
            month: "long",
          })}
        </p>
      </div>

      {/* list */}
      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {projects.length === 0 && (
          <p
            style={{
              fontSize: 12,
              color: "var(--color-text-tertiary)",
              textAlign: "center",
              marginTop: 60,
            }}
          >
            No hay proyectos activos asignados.
          </p>
        )}
        {projects.map((p) => {
          const daysLeft = p.fecha_fin_planificada
            ? diffDays(today, p.fecha_fin_planificada)
            : null;
          const isLate = daysLeft !== null && daysLeft < 0;
          const isClose = daysLeft !== null && daysLeft >= 0 && daysLeft <= 14;
          const color = STATUS_COLORS[p.estado] ?? "#555";

          return (
            <Link
              key={p.id}
              href={`/dashboard/inspector/${p.id}`}
              style={{ textDecoration: "none" }}
            >
              <div
                style={card}
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
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 3,
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
                          fontSize: 9,
                          color,
                          fontWeight: 500,
                          letterSpacing: "0.07em",
                        }}
                      >
                        {p.estado.toUpperCase()}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--color-text-primary)",
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {p.nombre}
                    </p>
                    {p.descripcion && (
                      <p
                        style={{
                          fontSize: 10,
                          color: "var(--color-text-tertiary)",
                          margin: "2px 0 0",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {p.descripcion}
                      </p>
                    )}
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {daysLeft !== null && (
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          margin: 0,
                          color: isLate
                            ? "#993C1D"
                            : isClose
                              ? "#BA7517"
                              : "var(--color-text-tertiary)",
                        }}
                      >
                        {isLate
                          ? `${Math.abs(daysLeft)}d vencido`
                          : daysLeft === 0
                            ? "vence hoy"
                            : `${daysLeft}d restantes`}
                      </p>
                    )}
                    <p
                      style={{
                        fontSize: 10,
                        color: "var(--color-text-tertiary)",
                        margin: "2px 0 0",
                      }}
                    >
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const shell: React.CSSProperties = {
  minHeight: "100vh",
  background: "var(--color-background-tertiary)",
  fontFamily: "var(--font-mono, 'Courier New', monospace)",
};

const topBar: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  padding: "20px 20px 14px",
  borderBottom: "0.5px solid var(--color-border-secondary)",
  background: "var(--color-background-primary)",
};

const eyebrow: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.1em",
  color: "var(--color-text-tertiary)",
  margin: "0 0 3px",
};

const title: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: "var(--color-text-primary)",
  margin: 0,
};

const card: React.CSSProperties = {
  padding: "12px 14px",
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
