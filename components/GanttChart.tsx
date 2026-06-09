"use client";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GanttTask {
  id: string;
  titulo: string;
  tarea_padre_id: string | null;
  fecha_inicio_planificada: string;
  fecha_fin_planificada: string;
  estado?: string;
  porcentaje_avance_actual?: number;
}

export interface Dependency {
  from: string;
  to: string;
}

interface GanttProps {
  tasks: GanttTask[];
  dependencies?: Dependency[];
  projectName?: string;
}

interface TreeNode extends GanttTask {
  children: TreeNode[];
  depth: number;
  isGroup: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOT_R = 4; // radius of task start dots
const GROUP_DOT_R = 5; // radius for group/parent task dots
const LANE_H = 14; // height per task lane
const LANE_PADDING = 4; // gap between lanes
const RULER_H = 40; // height for the date ruler at bottom
const INDENT_PX = 12; // horizontal indent per depth level

// total canvas height

// ─── Helpers ──────────────────────────────────────────────────────────────────

function diffDays(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function fmtShort(s: string): string {
  return new Date(s).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtMonthYear(d: Date): string {
  return d.toLocaleDateString("es", { month: "short", year: "2-digit" });
}

function getMonths(
  start: string,
  end: string,
): { label: string; offsetDays: number }[] {
  const list: { label: string; offsetDays: number }[] = [];
  const cur = new Date(start);
  cur.setDate(1);
  while (cur <= new Date(end)) {
    list.push({
      label: fmtMonthYear(cur),
      offsetDays: Math.max(0, diffDays(start, cur.toISOString().slice(0, 10))),
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return list;
}

function isGroup(task: GanttTask, tasks: GanttTask[]): boolean {
  return tasks.some((t) => t.tarea_padre_id === task.id);
}

function dotColor(task: GanttTask, tasks: GanttTask[]): string {
  if (!task.tarea_padre_id) return "#185FA5"; // root
  if (isGroup(task, tasks)) return "#378ADD"; // group
  switch (task.estado) {
    case "Completada":
      return "#0F6E56";
    case "En_Curso":
      return "#1D9E75";
    case "Bloqueada":
      return "#993C1D";
    default:
      return "#BA7517";
  }
}

function buildTree(tasks: GanttTask[]): TreeNode[] {
  const byId: Record<string, TreeNode> = {};
  tasks.forEach((t) => {
    byId[t.id] = { ...t, children: [], depth: 0, isGroup: false };
  });
  const roots: TreeNode[] = [];
  tasks.forEach((t) => {
    if (t.tarea_padre_id && byId[t.tarea_padre_id])
      byId[t.tarea_padre_id].children.push(byId[t.id]);
    else roots.push(byId[t.id]);
  });
  function setMeta(n: TreeNode, d: number) {
    n.depth = d;
    n.isGroup = n.children.length > 0;
    n.children.forEach((c) => setMeta(c, d + 1));
  }
  roots.forEach((r) => setMeta(r, 0));
  return roots;
}

function getVisible(roots: TreeNode[], collapsed: Set<string>): TreeNode[] {
  const out: TreeNode[] = [];
  function walk(n: TreeNode) {
    out.push(n);
    if (!collapsed.has(n.id)) n.children.forEach(walk);
  }
  roots.forEach(walk);
  return out;
}

// ─── Main component ───────────────────────────────────────────────────────────

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

  const roots = useMemo(() => buildTree(tasks), [tasks]);
  const visible = useMemo(
    () => getVisible(roots, collapsed),
    [roots, collapsed],
  );

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    task: GanttTask | null;
  }>({ visible: false, x: 0, y: 0, task: null });

  // ── derive project bounds BEFORE hooks that depend on them ──────────────
  const projectStart = tasks.length
    ? tasks.reduce(
        (min, t) =>
          t.fecha_inicio_planificada < min ? t.fecha_inicio_planificada : min,
        tasks[0].fecha_inicio_planificada,
      )
    : "";
  const projectEnd = tasks.length
    ? tasks.reduce(
        (max, t) =>
          t.fecha_fin_planificada > max ? t.fecha_fin_planificada : max,
        tasks[0].fecha_fin_planificada,
      )
    : "";
  const totalDays =
    projectStart && projectEnd ? diffDays(projectStart, projectEnd) : 1;
  const timelineW = W * zoom;
  const months = useMemo(
    () =>
      projectStart && projectEnd ? getMonths(projectStart, projectEnd) : [],
    [projectStart, projectEnd],
  );

  const filtered = useMemo(() => {
    const todayOffset = diffDays(
      projectStart,
      new Date().toISOString().slice(0, 10),
    );

    // first pass: which task ids survive the filters
    const passing = new Set(
      visible
        .filter((task) => {
          const startOff = diffDays(
            projectStart,
            task.fecha_inicio_planificada,
          );
          if (dayWindow !== null && startOff > todayOffset + dayWindow)
            return false;
          if (statusFilter === "active" && task.estado === "Completada")
            return false;
          return true;
        })
        .map((t) => t.id),
    );

    // second pass: keep a group only if it has at least one passing descendant
    function hasPassingDescendant(task: GanttTask): boolean {
      if (passing.has(task.id)) return true;
      return tasks
        .filter((c) => c.tarea_padre_id === task.id)
        .some(hasPassingDescendant);
    }

    return visible.filter((task) => {
      if (isGroup(task, tasks)) return hasPassingDescendant(task);
      return passing.has(task.id);
    });
  }, [visible, dayWindow, statusFilter, tasks, projectStart]);

  // measure container
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    // measure container
    const obs = new ResizeObserver((e) => setW(e[0].contentRect.width));
    obs.observe(el);
    setW(el.clientWidth);

    // wheel zoom
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((prev) => {
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        return Math.min(
          5,
          Math.max(0.5, parseFloat((prev + delta).toFixed(1))),
        );
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      obs.disconnect();
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  // project bounds

  const pxDay = useCallback(
    (days: number) => (timelineW > 0 ? (days / totalDays) * timelineW : 0),
    [totalDays, timelineW],
  );

  // draw canvas
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

    const lineColor = "rgba(255,255,255,0.12)";
    const labelColor = "rgba(255,255,255,0.45)";
    const BRANCH_COLORS = [
      "#4A9EE8", // bright sky blue
      "#B065E0", // violet
      "#E8714A", // coral orange
      "#4AE8A0", // mint green
      "#E8C84A", // warm yellow
      "#4A7BE8", // cobalt
      "#E84A8F", // hot pink
      "#7BE84A", // lime
      "#E84A4A", // red
      "#4AE8D8", // cyan
      "#E8A84A", // amber
      "#A84AE8", // purple
    ];

    const branchColor: Record<string, string> = {};
    function assignColors(n: TreeNode, color: string) {
      branchColor[n.id] = color;
      n.children.forEach((c) => assignColors(c, color));
    }
    roots.forEach((r) => {
      branchColor[r.id] = "#185FA5";
      r.children.forEach((child, i) => {
        assignColors(child, BRANCH_COLORS[i % BRANCH_COLORS.length]);
      });
    });

    const todayDays = projectStart
      ? diffDays(projectStart, new Date().toISOString().slice(0, 10))
      : 0;

    // ── ruler line ────────────────────────────────────────────────────
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rulerY);
    ctx.lineTo(timelineW, rulerY);
    ctx.stroke();

    // ── month ticks + labels on ruler ────────────────────────────────
    months.forEach((m, mi) => {
      const x = pxDay(m.offsetDays);

      // faint vertical guide through all lanes
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rulerY);
      ctx.stroke();

      // tick on ruler
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, rulerY);
      ctx.lineTo(x, rulerY + 6);
      ctx.stroke();

      // month label
      const nextX =
        mi < months.length - 1 ? pxDay(months[mi + 1].offsetDays) : timelineW;
      if (nextX - x > 28) {
        ctx.fillStyle = labelColor;
        ctx.font = "9px var(--font-mono, monospace)";
        ctx.textAlign = "left";
        ctx.fillText(m.label, x + 3, rulerY + 16);
      }
    });

    // ── today line ────────────────────────────────────────────────────
    if (todayDays >= 0 && todayDays <= totalDays) {
      const tx = pxDay(todayDays);
      ctx.strokeStyle = "rgba(220,50,50,0.55)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(tx, 0);
      ctx.lineTo(tx, rulerY + 8);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "rgba(220,50,50,0.7)";
      ctx.font = "9px var(--font-mono, monospace)";
      ctx.textAlign = "center";
      ctx.fillText("hoy", tx, rulerY + 28);
    }

    // ── start / end anchors ───────────────────────────────────────────
    ctx.fillStyle = labelColor;
    ctx.font = "9px var(--font-mono, monospace)";
    ctx.textAlign = "left";
    ctx.fillText(fmtShort(projectStart), 2, rulerY + 28);
    ctx.textAlign = "right";
    ctx.fillText(fmtShort(projectEnd), timelineW - 2, rulerY + 28);

    // ── one lane per task ─────────────────────────────────────────────
    filtered.forEach((task, i) => {
      const startOff = diffDays(projectStart, task.fecha_inicio_planificada);
      const endOff = diffDays(projectStart, task.fecha_fin_planificada);
      const x1Raw = pxDay(startOff);
      const x1 = x1Raw + task.depth * INDENT_PX;
      const x2 = pxDay(endOff);
      const laneY =
        (filtered.length - 1 - i) * (LANE_H + LANE_PADDING) + LANE_H / 2;
      const isSel = task.id === expanded;
      const color = branchColor[task.id] ?? dotColor(task, tasks);
      const isGrp = isGroup(task, tasks);
      const r = isGrp ? GROUP_DOT_R : DOT_R;

      if (!isGrp) return;
      if (task.depth === 1) return; // depth-1 still hidden, only shows as tag

      // depth-2 draws as a subtle clickable line
      const lineW = task.depth === 0 ? 2.5 : task.depth === 2 ? 1.2 : 1.8;
      const alpha =
        task.depth === 0 ? 0.9 : task.depth === 2 ? 0.35 : isSel ? 1 : 0.6;
      // ── depth 1: tag in top-left, no line ────────────────────────────

      // vertical stem from task start down to ruler — add before horizontal line

      function findDrawnAncestor(taskId: string | null): number {
        if (!taskId) return -1;
        const idx = filtered.findIndex((t) => t.id === taskId);
        if (idx !== -1 && filtered[idx].depth !== 1) return idx;
        // parent exists but is hidden (depth-1) — walk up one more level
        const parent = tasks.find((t) => t.id === taskId);
        return parent ? findDrawnAncestor(parent.tarea_padre_id) : -1;
      }

      const parentIdx = findDrawnAncestor(task.tarea_padre_id);

      const parentLaneY =
        parentIdx !== -1
          ? (filtered.length - 1 - parentIdx) * (LANE_H + LANE_PADDING) +
            LANE_H / 2
          : rulerY; // fallback to ruler if parent not visible
      ctx.strokeStyle = color;
      ctx.lineWidth = isGrp ? 2 : 1.5;
      ctx.globalAlpha = isSel ? 1 : isGrp ? 0.6 : 0.4;
      ctx.beginPath();
      ctx.moveTo(x1, laneY);
      ctx.lineTo(x1, parentLaneY);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // horizontal task line

      ctx.strokeStyle = color;
      ctx.lineWidth = lineW;
      ctx.globalAlpha = isSel ? 1 : alpha;
      ctx.beginPath();
      ctx.moveTo(x1, laneY);
      ctx.lineTo(x2, laneY);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // end dot (filled)
      ctx.beginPath();
      ctx.arc(x2, laneY, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = isSel ? 1 : isGrp ? 0.85 : 0.65;
      ctx.fill();
      ctx.globalAlpha = 1;

      // selection ring
      if (isSel) {
        ctx.beginPath();
        ctx.arc(x2, laneY, r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // label above the lane
        const label =
          task.titulo.length > 32
            ? task.titulo.slice(0, 30) + "…"
            : task.titulo;
        const labelX = Math.max(60, Math.min(x2, timelineW - 60));
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "bold 10px var(--font-mono, monospace)";
        ctx.textAlign = "center";
        ctx.fillText(label, labelX, laneY - r - 4);

        ctx.font = "9px var(--font-mono, monospace)";
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.fillText(
          `${fmtShort(task.fecha_inicio_planificada)} → ${fmtShort(task.fecha_fin_planificada)}`,
          labelX,
          laneY - r - 14,
        );
      }
    });

    if (expanded) {
      const selectedTask = filtered.find((t) => t.id === expanded);
      if (selectedTask) {
        // walk up the ancestor chain
        const ancestors: GanttTask[] = [];
        let current: GanttTask | undefined = selectedTask;
        while (current?.tarea_padre_id) {
          const parent = tasks.find((t) => t.id === current!.tarea_padre_id);
          if (parent) {
            ancestors.unshift(parent);
            current = parent;
          } else break;
        }

        const nodeDepths: Record<string, number> = {};
        function walkDepths(n: TreeNode) {
          nodeDepths[n.id] = n.depth;
          n.children.forEach(walkDepths);
        }
        roots.forEach(walkDepths);

        const tagAncestors = ancestors.filter((a) => {
          const d = nodeDepths[a.id];
          return d === 1 || d === 2;
        });

        // draw tags stacked in top-left
        let tagX = 8;
        tagAncestors.forEach((ancestor) => {
          const node = filtered.find((v) => v.id === ancestor.id)!;
          const color = branchColor[ancestor.id] ?? dotColor(ancestor, tasks);
          const label =
            ancestor.titulo.length > 24
              ? ancestor.titulo.slice(0, 22) + "…"
              : ancestor.titulo;
          const tagH = 16;
          const tagPadX = 7;
          const tagY = 6;

          ctx.font = `500 9px var(--font-mono, monospace)`;
          const textW = ctx.measureText(label).width;
          const tagW = textW + tagPadX * 2;

          // background
          ctx.beginPath();
          ctx.roundRect(tagX, tagY, tagW, tagH, tagH / 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = node.depth === 1 ? 0.75 : 0.55;
          ctx.fill();
          ctx.globalAlpha = 1;

          // label
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.font = `500 9px var(--font-mono, monospace)`;
          ctx.textAlign = "left";
          ctx.fillText(label, tagX + tagPadX, tagY + tagH / 2 + 3);

          tagX += tagW + 6; // stack horizontally
        });
      }
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
    visible,
    collapsed,
    roots,
    filtered,
  ]);

  if (!tasks.length) return null;

  // hit detection on canvas click
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const my = e.clientY - rect.top;
    const laneI =
      filtered.length - 1 - Math.floor(my / (LANE_H + LANE_PADDING));

    if (laneI < 0 || laneI >= filtered.length) {
      // click outside — close overlay and re-collapse expanded node
      if (expanded) {
        setCollapsed((prev) => {
          const next = new Set(prev);
          next.add(expanded);
          return next;
        });
        setExpanded(null);
      }
      return;
    }

    const task = filtered[laneI];
    if (!isGroup(task, tasks)) return;

    if (task.id === expanded) {
      // same node — close and re-collapse
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.add(task.id);
        return next;
      });
      setExpanded(null);
    } else {
      // new node — collapse previous if any, expand new one
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (expanded) next.add(expanded); // re-collapse previous
        next.delete(task.id); // expand new
        return next;
      });
      setExpanded(task.id);
      setExpandedPos({ x: e.clientX, y: e.clientY });
    }
  }

  // tooltip on mousemove
  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const my = e.clientY - rect.top;
    const laneI =
      filtered.length - 1 - Math.floor(my / (LANE_H + LANE_PADDING));

    if (laneI < 0 || laneI >= filtered.length) {
      setTooltip((t) => ({ ...t, visible: false }));
      return;
    }
    const task = filtered[laneI];
    setTooltip({ visible: true, x: e.clientX, y: e.clientY, task });
  }
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
      {/* ── toolbar ──────────────────────────────────────────────────────── */}
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
        <button
          onClick={() => {
            const s = new Set<string>();
            function walk(t: GanttTask) {
              if (isGroup(t, tasks)) {
                s.add(t.id);
                tasks.filter((c) => c.tarea_padre_id === t.id).forEach(walk);
              }
            }
            tasks.filter((t) => !t.tarea_padre_id).forEach(walk);
            setCollapsed(s);
          }}
          style={btnStyle}
        >
          collapse all
        </button>
      </div>

      {/* ── timeline canvas ──────────────────────────────────────────────── */}
      <div
        ref={wrapRef}
        style={{
          width: "100%",
          overflowX: "auto",
          overflowY: "auto",
          height: "60vh", // ← fixed, not max
          position: "relative",
          padding: "0 24px",
          boxSizing: "border-box",
          display: "flex",
          // flexDirection: "column-reverse",
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

        {/* ── group overlay ─────────────────────────────────────────────────── */}

        {expanded &&
          (() => {
            const group = tasks.find((t) => t.id === expanded);
            if (!group) return null;
            const children = tasks.filter(
              (t) => t.tarea_padre_id === expanded && !isGroup(t, tasks),
            );

            return (
              <div
                style={{
                  position: "fixed",
                  top: Math.min(expandedPos.y + 10, window.innerHeight - 420),
                  left: Math.min(expandedPos.x, window.innerWidth - 320),
                  width: 300,
                  maxHeight: 400,
                  overflowY: "auto",
                  background: "var(--color-background-primary)",
                  border: "0.5px solid white",
                  borderRadius: 8,
                  padding: "10px 12px",
                  zIndex: 50,
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {/* header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: "var(--color-text-primary)",
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {group.titulo}
                  </span>
                  <button
                    onClick={() => setExpanded(null)}
                    style={{ ...btnStyle, padding: "1px 6px" }}
                  >
                    ✕
                  </button>
                </div>

                {/* leaf children */}
                {children.length === 0 ? (
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--color-text-tertiary)",
                    }}
                  >
                    Sin subtareas
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 4 }}
                  >
                    {children.map((child) => {
                      const color = dotColor(child, tasks);
                      const dur =
                        diffDays(
                          child.fecha_inicio_planificada,
                          child.fecha_fin_planificada,
                        ) + 1;
                      return (
                        <div
                          key={child.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "4px 6px",
                            borderRadius: 4,
                            background: "var(--color-background-secondary)",
                          }}
                        >
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: color,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 10,
                              color: "var(--color-text-primary)",
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {child.titulo}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              color: "var(--color-text-tertiary)",
                              flexShrink: 0,
                            }}
                          >
                            {dur}d
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              color,
                              flexShrink: 0,
                              fontWeight: 500,
                            }}
                          >
                            {child.estado ?? "Pendiente"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
      </div>

      {/* ── selected task detail strip ────────────────────────────────────── */}

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
            <div>Inicio: {fmtShort(tooltip.task.fecha_inicio_planificada)}</div>
            <div>Fin: {fmtShort(tooltip.task.fecha_fin_planificada)}</div>
            <div>
              {diffDays(
                tooltip.task.fecha_inicio_planificada,
                tooltip.task.fecha_fin_planificada,
              ) + 1}{" "}
              días
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
