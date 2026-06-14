import {
  GanttTask,
  TreeNode,
  DOT_R,
  GROUP_DOT_R,
  LANE_H,
  LANE_PADDING,
  INDENT_PX,
  diffDays,
  fmtShort,
  isGroup,
  dotColor,
} from "./types";

// ─── Shared draw helpers ──────────────────────────────────────────────────────

function laneY(idx: number, total: number): number {
  return (total - 1 - idx) * (LANE_H + LANE_PADDING) + LANE_H / 2;
}

// Canvas palette — dark surface (#0f172a base)
const C = {
  rulerLine: "rgba(148,163,184,0.25)", // slate-400 @ 25%
  gridLine: "rgba(148,163,184,0.10)", // slate-400 @ 10%
  tick: "rgba(148,163,184,0.30)", // slate-400 @ 30%
  label: "rgba(148,163,184,0.70)", // slate-400 @ 70%
  labelFaint: "rgba(148,163,184,0.45)", // slate-400 @ 45%
  today: "rgba(239,68,68,0.60)", // red-500
  todayFill: "rgba(239,68,68,0.80)",
  selLane: "rgba(148,163,184,0.06)", // faint lane highlight
  taskLabel: "rgba(241,245,249,0.90)", // slate-100
  tagLabel: "rgba(241,245,249,0.95)", // slate-100
} as const;

// ─── Ruler + month guides ─────────────────────────────────────────────────────

export function drawRuler(
  ctx: CanvasRenderingContext2D,
  rulerY: number,
  timelineW: number,
) {
  ctx.strokeStyle = C.rulerLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, rulerY);
  ctx.lineTo(timelineW, rulerY);
  ctx.stroke();
}

export function drawMonths(
  ctx: CanvasRenderingContext2D,
  months: { label: string; offsetDays: number }[],
  rulerY: number,
  timelineW: number,
  pxDay: (d: number) => number,
) {
  months.forEach((m, mi) => {
    const x = pxDay(m.offsetDays);
    const nextX =
      mi < months.length - 1 ? pxDay(months[mi + 1].offsetDays) : timelineW;

    // vertical grid line
    ctx.strokeStyle = C.gridLine;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, rulerY);
    ctx.stroke();

    // tick below ruler
    ctx.strokeStyle = C.tick;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, rulerY);
    ctx.lineTo(x, rulerY + 6);
    ctx.stroke();

    // month label
    if (nextX - x > 28) {
      ctx.fillStyle = C.label;
      ctx.font = "9px var(--font-mono, monospace)";
      ctx.textAlign = "left";
      ctx.fillText(m.label, x + 3, rulerY + 16);
    }
  });
}

export function drawDateAnchors(
  ctx: CanvasRenderingContext2D,
  projectStart: string,
  projectEnd: string,
  rulerY: number,
  timelineW: number,
) {
  ctx.fillStyle = C.labelFaint;
  ctx.font = "9px var(--font-mono, monospace)";
  ctx.textAlign = "left";
  ctx.fillText(fmtShort(projectStart), 2, rulerY + 28);
  ctx.textAlign = "right";
  ctx.fillText(fmtShort(projectEnd), timelineW - 2, rulerY + 28);
}

export function drawTodayLine(
  ctx: CanvasRenderingContext2D,
  todayDays: number,
  totalDays: number,
  rulerY: number,
  pxDay: (d: number) => number,
) {
  if (todayDays < 0 || todayDays > totalDays) return;
  const tx = pxDay(todayDays);

  ctx.strokeStyle = C.today;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(tx, 0);
  ctx.lineTo(tx, rulerY + 8);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = C.todayFill;
  ctx.font = "9px var(--font-mono, monospace)";
  ctx.textAlign = "center";
  ctx.fillText("hoy", tx, rulerY + 28);
}

// ─── Lane drawing ─────────────────────────────────────────────────────────────

export function drawLane(
  ctx: CanvasRenderingContext2D,
  task: TreeNode,
  i: number,
  filtered: TreeNode[],
  tasks: GanttTask[],
  projectStart: string,
  pxDay: (d: number) => number,
  rulerY: number,
  expandedId: string | null,
  branchColor: Record<string, string>,
) {
  const startOff = diffDays(projectStart, task.fecha_inicio_planificada);
  const endOff = diffDays(projectStart, task.fecha_fin_planificada);
  const x1 = pxDay(startOff) + task.depth * INDENT_PX;
  const x2 = pxDay(endOff);
  const y = laneY(i, filtered.length);

  const isSel = task.id === expandedId;
  const color = branchColor[task.id] ?? dotColor(task, tasks);
  const isGrp = isGroup(task, tasks);
  const r = isGrp ? GROUP_DOT_R : DOT_R;
  const lineW = task.depth === 0 ? 2.5 : task.depth === 2 ? 1.2 : 1.8;
  const alpha =
    task.depth === 0 ? 0.9 : task.depth === 2 ? 0.35 : isSel ? 1 : 0.6;

  // selected lane highlight
  if (isSel) {
    ctx.fillStyle = C.selLane;
    ctx.fillRect(
      0,
      (filtered.length - 1 - i) * (LANE_H + LANE_PADDING),
      99999,
      LANE_H + LANE_PADDING,
    );
  }

  // vertical stem to drawn ancestor
  const parentIdx = findDrawnAncestor(task.tarea_padre_id, filtered, tasks);
  const parentY = parentIdx !== -1 ? laneY(parentIdx, filtered.length) : rulerY;

  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = isSel ? 0.5 : 0.18;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x1, parentY);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // horizontal bar
  ctx.strokeStyle = color;
  ctx.lineWidth = lineW;
  ctx.globalAlpha = isSel ? 1 : alpha;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // end dot
  ctx.beginPath();
  ctx.arc(x2, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = isSel ? 1 : isGrp ? 0.85 : 0.65;
  ctx.fill();
  ctx.globalAlpha = 1;

  // selection ring + floating label
  if (isSel) {
    ctx.beginPath();
    ctx.arc(x2, y, r + 3, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const label =
      task.titulo.length > 32 ? task.titulo.slice(0, 30) + "…" : task.titulo;

    ctx.fillStyle = C.taskLabel;
    ctx.font = "bold 10px var(--font-mono, monospace)";
    ctx.textAlign = "center";
    ctx.fillText(label, x2, y - r - 4);

    ctx.font = "9px var(--font-mono, monospace)";
    ctx.fillStyle = C.labelFaint;
    ctx.fillText(
      `${fmtShort(task.fecha_inicio_planificada)} → ${fmtShort(task.fecha_fin_planificada)}`,
      x2,
      y - r - 14,
    );
  }
}

function findDrawnAncestor(
  taskId: string | null,
  filtered: TreeNode[],
  tasks: GanttTask[],
): number {
  if (!taskId) return -1;
  const idx = filtered.findIndex((t) => t.id === taskId);
  if (idx !== -1 && filtered[idx].depth !== 1) return idx;
  const parent = tasks.find((t) => t.id === taskId);
  return parent
    ? findDrawnAncestor(parent.tarea_padre_id, filtered, tasks)
    : -1;
}

// ─── Ancestor tags ────────────────────────────────────────────────────────────

export function drawAncestorTags(
  ctx: CanvasRenderingContext2D,
  expandedId: string,
  filtered: TreeNode[],
  tasks: GanttTask[],
  nodeDepths: Record<string, number>,
  branchColor: Record<string, string>,
) {
  const selectedTask = filtered.find((t) => t.id === expandedId);
  if (!selectedTask) return;

  const ancestors: GanttTask[] = [];
  let current: GanttTask | undefined = selectedTask;
  while (current?.tarea_padre_id) {
    const parent = tasks.find((t) => t.id === current!.tarea_padre_id);
    if (parent) {
      ancestors.unshift(parent);
      current = parent;
    } else break;
  }

  const tagAncestors = ancestors.filter((a) => {
    const d = nodeDepths[a.id];
    return d === 1 || d === 2;
  });

  let tagX = 8;
  tagAncestors.forEach((ancestor) => {
    const depth = nodeDepths[ancestor.id] ?? 0;
    const color = branchColor[ancestor.id] ?? dotColor(ancestor, tasks);
    const label =
      ancestor.titulo.length > 24
        ? ancestor.titulo.slice(0, 22) + "…"
        : ancestor.titulo;
    const tagH = 16;
    const tagPadX = 7;
    const tagY = 6;

    ctx.font = `500 9px var(--font-mono, monospace)`;
    const tagW = ctx.measureText(label).width + tagPadX * 2;

    ctx.beginPath();
    ctx.roundRect(tagX, tagY, tagW, tagH, tagH / 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = depth === 1 ? 0.8 : 0.6;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = C.tagLabel;
    ctx.font = `500 9px var(--font-mono, monospace)`;
    ctx.textAlign = "left";
    ctx.fillText(label, tagX + tagPadX, tagY + tagH / 2 + 3);

    tagX += tagW + 6;
  });
}
