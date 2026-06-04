"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import GanttChart, { type GanttTask } from "@/components/ProjectTimeline";

interface JsonTask {
  id_temporal: string;
  titulo: string;
  tarea_padre_id_temporal: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  depende_de: string[];
}

interface Dependency {
  from: string;
  to: string;
}

export default function TareasPage() {
  const { id } = useParams<{ id: string }>();
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [deps, setDeps] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/san_gregorio_minimal.json")
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo cargar el archivo JSON");
        return r.json();
      })
      .then((data: { tareas: JsonTask[] }) => {
        // Map JSON shape → GanttTask shape
        const mapped: GanttTask[] = data.tareas.map((t) => ({
          id: t.id_temporal,
          titulo: t.titulo,
          tarea_padre_id: t.tarea_padre_id_temporal,
          fecha_inicio_planificada: t.fecha_inicio,
          fecha_fin_planificada: t.fecha_fin,
          estado: "Pendiente",
          porcentaje_avance_actual: 0,
        }));

        // Extract dependency pairs
        const depPairs: Dependency[] = [];
        data.tareas.forEach((t) => {
          t.depende_de.forEach((fromId) => {
            depPairs.push({ from: fromId, to: t.id_temporal });
          });
        });

        setTasks(mapped);
        setDeps(depPairs);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
        Cargando tareas...
      </div>
    );

  if (error)
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
          {error}
        </p>
        <Link
          href={`/proyectos/${id}`}
          style={{ fontSize: 12, color: "var(--color-text-info)" }}
        >
          ← Volver al proyecto
        </Link>
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 16px",
          borderBottom: "0.5px solid var(--color-border-secondary)",
          background: "var(--color-background-primary)",
          flexShrink: 0,
        }}
      >
        <Link
          href={`/proyectos/${id}`}
          style={{
            fontSize: 11,
            color: "var(--color-text-tertiary)",
            textDecoration: "none",
            fontFamily: "monospace",
          }}
        >
          ← proyecto
        </Link>
        <span style={{ color: "var(--color-border-secondary)" }}>/</span>
        <span
          style={{
            fontSize: 11,
            color: "var(--color-text-secondary)",
            fontFamily: "monospace",
          }}
        >
          tareas
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            color: "var(--color-text-tertiary)",
            fontFamily: "monospace",
          }}
        >
          {tasks.length} tareas · {deps.length} dependencias
        </span>
      </div>

      {/* Gantt fills remaining height */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <GanttChart
          tasks={tasks}
          dependencies={deps}
          projectName="SAN GREGORIO ETAPA 2"
        />
      </div>
    </div>
  );
}
