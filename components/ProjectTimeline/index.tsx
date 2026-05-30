"use client";
import { useEffect, useRef, useState } from "react";
import {
  GanttProps,
  GanttTask,
  LANE_H,
  LANE_PADDING,
  RULER_H,
  buildBranchColors,
  isGroup,
} from "./types";
import { useTimeline } from "./useTimeline";
import {
  drawRuler,
  drawMonths,
  drawDateAnchors,
  drawTodayLine,
  drawLane,
  drawAncestorTags,
} from "./canvas";
import { GroupOverlay } from "./GroupOverlay";

// ─── Shared button style ──────────────────────────────────────────────────────

const btnStyle: React.CSSProperties = {
  fontSize: 10,
  padding: "3px 8px",
  border: "0.5px solid var(--color-border-secondary)",
  borderRadius: 4,
  background: "var(--color-background-secondary)",
  color: "var(--color-text-secondary)",
  cursor: "pointer",
  fontFamily: "inherit",
};

// ─── Component ────────────────────────────────────────────────────────────────

export type { GanttTask } from "./types";

export default function ProjectTimeline({ tasks, projectName }: GanttProps) {
  const [W, setW] = useState(0);
  const [zoom, setZoom] = useState(1);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedPos, setExpandedPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const s = new Set<string>();
    tasks
      .filter((t) => tasks.some((c) => c.tarea_padre_id === t.id))
      .forEach((t) => {
        let depth = 0;
        let cur: GanttTask | undefined = t;
        while (cur?.tarea_padre_id) {
          cur = tasks.find((p) => p.id === cur!.tarea_padre_id);
          depth++;
        }
        if (depth >= 2) s.add(t.id);
      });
    return s;
  });

  const [dayWindow, setDayWindow] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active">("all");

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    task: GanttTask | null;
  }>({ visible: false, x: 0, y: 0, task: null });

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    roots,
    filtered,
    projectStart,
    projectEnd,
    totalDays,
    months,
    timelineW,
    pxDay,
    nodeDepths,
  } = useTimeline({ tasks, collapsed, dayWindow, statusFilter, W, zoom });

  // ── resize + wheel zoom ───────────────────────────────────────────────────
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new ResizeObserver((e) => setW(e[0].contentRect.width));
    obs.observe(el);
    setW(el.clientWidth);
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((prev) =>
        Math.min(
          5,
          Math.max(
            0.5,
            parseFloat((prev + (e.deltaY > 0 ? -0.1 : 0.1)).toFixed(1)),
          ),
        ),
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      obs.disconnect();
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  // ── draw ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || W === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const canvasH = filtered.length * (LANE_H + LANE_PADDING) + RULER_H;
    const rulerY = canvasH - RULER_H;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = timelineW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = `${timelineW}px`;
    canvas.style.height = `${canvasH}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, timelineW, canvasH);

    const branchColor = buildBranchColors(roots);
    const todayDays = projectStart
      ? Math.round((Date.now() - new Date(projectStart).getTime()) / 86400000)
      : 0;

    drawRuler(ctx, rulerY, timelineW);
    drawMonths(ctx, months, rulerY, timelineW, pxDay);
    drawDateAnchors(ctx, projectStart, projectEnd, rulerY, timelineW);
    drawTodayLine(ctx, todayDays, totalDays, rulerY, pxDay);

    filtered.forEach((task, i) => {
      if (!isGroup(task, tasks)) return;
      if (task.depth === 1) return;
      drawLane(
        ctx,
        task,
        i,
        filtered,
        tasks,
        projectStart,
        pxDay,
        rulerY,
        expanded,
        branchColor,
      );
    });

    if (expanded) {
      const branchColorForTags = buildBranchColors(roots);
      drawAncestorTags(
        ctx,
        expanded,
        filtered,
        tasks,
        nodeDepths,
        branchColorForTags,
      );
    }
  }, [
    W,
    zoom,
    tasks,
    expanded,
    projectStart,
    projectEnd,
    totalDays,
    months,
    pxDay,
    timelineW,
    filtered,
    roots,
    nodeDepths,
  ]);

  if (!tasks.length) return null;

  // ── hit detection ─────────────────────────────────────────────────────────
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const my = e.clientY - rect.top;
    const laneI =
      filtered.length - 1 - Math.floor(my / (LANE_H + LANE_PADDING));
    if (laneI < 0 || laneI >= filtered.length) {
      setExpanded(null);
      return;
    }
    const task = filtered[laneI];
    if (!isGroup(task, tasks)) return;
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(task.id)) next.delete(task.id);
      else next.add(task.id);
      return next;
    });
    setExpanded(task.id === expanded ? null : task.id);
    setExpandedPos({ x: e.clientX, y: e.clientY });
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const my = e.clientY - rect.top;
    const laneI =
      filtered.length - 1 - Math.floor(my / (LANE_H + LANE_PADDING));
    if (laneI < 0 || laneI >= filtered.length) {
      setTooltip((t) => ({ ...t, visible: false }));
      return;
    }
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      task: filtered[laneI],
    });
  }

  const collapseAll = () => {
    const s = new Set<string>();
    function walk(t: GanttTask) {
      if (isGroup(t, tasks)) {
        s.add(t.id);
        tasks.filter((c) => c.tarea_padre_id === t.id).forEach(walk);
      }
    }
    tasks.filter((t) => !t.tarea_padre_id).forEach(walk);
    setCollapsed(s);
  };

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        background: "var(--color-background-primary)",
        fontFamily: "var(--font-mono, 'Courier New', monospace)",
      }}
    >
      {/* toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 14px",
          borderBottom: "0.5px solid var(--color-border-secondary)",
          flexWrap: "wrap",
          rowGap: 6,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.07em",
            color: "var(--color-text-primary)",
          }}
        >
          {projectName ?? "TIMELINE"}
        </span>
        <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
          / {tasks.length} tareas · {Math.round(totalDays / 30)} meses
        </span>

        {/* zoom */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginLeft: 8,
          }}
        >
          <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
            zoom
          </span>
          <input
            type="range"
            min={0.5}
            max={5}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            style={{ width: 80 }}
          />
          <span
            style={{
              fontSize: 10,
              color: "var(--color-text-secondary)",
              minWidth: 32,
            }}
          >
            {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* date window */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginLeft: 8,
          }}
        >
          <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
            próx.
          </span>
          {([30, 60, 90, null] as const).map((d) => (
            <button
              key={d ?? "all"}
              onClick={() => setDayWindow(d)}
              style={{
                ...btnStyle,
                background:
                  dayWindow === d
                    ? "var(--color-background-info)"
                    : "var(--color-background-secondary)",
                color:
                  dayWindow === d
                    ? "var(--color-text-info)"
                    : "var(--color-text-secondary)",
                border:
                  dayWindow === d
                    ? "0.5px solid var(--color-border-info)"
                    : "0.5px solid var(--color-border-secondary)",
              }}
            >
              {d === null ? "todo" : `${d}d`}
            </button>
          ))}
        </div>

        {/* status filter */}
        <button
          onClick={() =>
            setStatusFilter((p) => (p === "all" ? "active" : "all"))
          }
          style={{
            ...btnStyle,
            background:
              statusFilter === "active"
                ? "var(--color-background-info)"
                : "var(--color-background-secondary)",
            color:
              statusFilter === "active"
                ? "var(--color-text-info)"
                : "var(--color-text-secondary)",
            border:
              statusFilter === "active"
                ? "0.5px solid var(--color-border-info)"
                : "0.5px solid var(--color-border-secondary)",
          }}
        >
          {statusFilter === "active"
            ? "✓ ocultar completadas"
            : "ocultar completadas"}
        </button>

        {/* legend */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {[
            { color: "#185FA5", label: "root" },
            { color: "#378ADD", label: "grupo" },
            { color: "#1D9E75", label: "activa" },
            { color: "#BA7517", label: "pendiente" },
          ].map((l) => (
            <div
              key={l.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10,
                color: "var(--color-text-tertiary)",
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: l.color,
                }}
              />
              {l.label}
            </div>
          ))}
        </div>

        <button onClick={() => setCollapsed(new Set())} style={btnStyle}>
          expand all
        </button>
        <button onClick={collapseAll} style={btnStyle}>
          collapse all
        </button>
      </div>

      {/* canvas wrapper */}
      <div
        ref={wrapRef}
        style={{
          width: "100%",
          overflowX: "auto",
          overflowY: "auto",
          maxHeight: "60vh",
          position: "relative",
          padding: "0 24px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column-reverse",
        }}
      >
        {W > 0 && (
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
            style={{ display: "block", cursor: "pointer" }}
          />
        )}

        {expanded && (
          <GroupOverlay
            tasks={tasks}
            expandedId={expanded}
            pos={expandedPos}
            branchColor={buildBranchColors(roots)}
            onClose={() => setExpanded(null)}
          />
        )}
      </div>

      {/* tooltip */}
      {tooltip.visible && tooltip.task && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x + 12,
            top: tooltip.y - 8,
            zIndex: 1000,
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-secondary)",
            borderRadius: 6,
            padding: "7px 10px",
            fontSize: 11,
            pointerEvents: "none",
            maxWidth: 220,
          }}
        >
          <div
            style={{
              fontWeight: 500,
              marginBottom: 3,
              color: "var(--color-text-primary)",
            }}
          >
            {tooltip.task.titulo}
          </div>
          <div
            style={{
              color: "var(--color-text-secondary)",
              fontSize: 10,
              lineHeight: 1.8,
            }}
          >
            <div>
              Inicio:{" "}
              {new Date(
                tooltip.task.fecha_inicio_planificada,
              ).toLocaleDateString("es-CL", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </div>
            <div>
              Fin:{" "}
              {new Date(tooltip.task.fecha_fin_planificada).toLocaleDateString(
                "es-CL",
                { day: "2-digit", month: "short", year: "numeric" },
              )}
            </div>
            <div>
              {Math.round(
                (new Date(tooltip.task.fecha_fin_planificada).getTime() -
                  new Date(tooltip.task.fecha_inicio_planificada).getTime()) /
                  86400000,
              ) + 1}{" "}
              días
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
