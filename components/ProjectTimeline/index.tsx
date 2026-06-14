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
      drawAncestorTags(
        ctx,
        expanded,
        filtered,
        tasks,
        nodeDepths,
        buildBranchColors(roots),
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
    const laneI =
      filtered.length -
      1 -
      Math.floor((e.clientY - rect.top) / (LANE_H + LANE_PADDING));
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
    const laneI =
      filtered.length -
      1 -
      Math.floor((e.clientY - rect.top) / (LANE_H + LANE_PADDING));
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
    <div className="flex flex-col w-full border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* toolbar */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-200 bg-white flex-wrap">
        <span className="text-xs font-semibold tracking-wide text-slate-800">
          {projectName ?? "Timeline"}
        </span>
        <span className="text-xs text-slate-400">
          · {tasks.length} tareas · {Math.round(totalDays / 30)} meses
        </span>

        {/* zoom */}
        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-xs text-slate-400">zoom</span>
          <input
            type="range"
            min={0.5}
            max={5}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-20"
          />
          <span className="text-xs text-slate-500 min-w-8">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* date window */}
        <div className="flex items-center gap-1 ml-2">
          <span className="text-xs text-slate-400">próx.</span>
          {([30, 60, 90, null] as const).map((d) => (
            <button
              key={d ?? "all"}
              onClick={() => setDayWindow(d)}
              className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                dayWindow === d
                  ? "bg-sky-50 text-sky-700 border-sky-200"
                  : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
              }`}
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
          className={`text-xs px-2 py-0.5 rounded border transition-colors ${
            statusFilter === "active"
              ? "bg-sky-50 text-sky-700 border-sky-200"
              : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
          }`}
        >
          {statusFilter === "active"
            ? "✓ ocultar completadas"
            : "ocultar completadas"}
        </button>

        {/* legend */}
        <div className="ml-auto flex gap-3 flex-wrap">
          {[
            { color: "#185FA5", label: "root" },
            { color: "#378ADD", label: "grupo" },
            { color: "#1D9E75", label: "activa" },
            { color: "#BA7517", label: "pendiente" },
          ].map((l) => (
            <div
              key={l.label}
              className="flex items-center gap-1 text-xs text-slate-400"
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: l.color }}
              />
              {l.label}
            </div>
          ))}
        </div>

        <button
          onClick={() => setCollapsed(new Set())}
          className="text-xs px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
        >
          expand all
        </button>
        <button
          onClick={collapseAll}
          className="text-xs px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
        >
          collapse all
        </button>
      </div>

      {/* canvas wrapper — intentionally dark, isolates the Gantt drawing surface */}
      <div
        ref={wrapRef}
        className="w-full overflow-x-auto overflow-y-auto max-h-[60vh] relative flex flex-col-reverse"
        style={{
          background: "#0f172a",
          padding: "12px 24px",
          boxSizing: "border-box",
        }}
      >
        {W > 0 && (
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
            className="block cursor-pointer"
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
          className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2 text-xs pointer-events-none max-w-55"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          <div className="font-semibold text-slate-800 mb-1">
            {tooltip.task.titulo}
          </div>
          <div className="text-slate-500 leading-relaxed">
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
                {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                },
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
