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

// ─── Ruler + month guides ─────────────────────────────────────────────────────

export function drawRuler(
  ctx: CanvasRenderingContext2D,
  rulerY: number,
  timelineW: number,
) {
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
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
  const lineColor = "rgba(255,255,255,0.12)";
  const labelColor = "rgba(255,255,255,0.45)";

  months.forEach((m, mi) => {
    const x = pxDay(m.offsetDays);
    const nextX =
      mi < months.length - 1 ? pxDay(months[mi + 1].offsetDays) : timelineW;

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, rulerY);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, rulerY);
    ctx.lineTo(x, rulerY + 6);
    ctx.stroke();

    if (nextX - x > 28) {
      ctx.fillStyle = labelColor;
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
  const labelColor = "rgba(255,255,255,0.45)";
  ctx.fillStyle = labelColor;
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
  const x1Raw = pxDay(startOff);
  const x1 = x1Raw + task.depth * INDENT_PX;
  const x2 = pxDay(endOff);
  const y = laneY(i, filtered.length);
  const isSel = task.id === expandedId;
  const color = branchColor[task.id] ?? dotColor(task, tasks);
  const isGrp = isGroup(task, tasks);
  const r = isGrp ? GROUP_DOT_R : DOT_R;
  const lineW = task.depth === 0 ? 2.5 : task.depth === 2 ? 1.2 : 1.8;
  const alpha =
    task.depth === 0 ? 0.9 : task.depth === 2 ? 0.35 : isSel ? 1 : 0.6;

  // selected lane background
  if (isSel) {
    ctx.fillStyle = "rgba(255,255,255,0.04)";
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

  // selection ring + label
  if (isSel) {
    ctx.beginPath();
    ctx.arc(x2, y, r + 3, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const label =
      task.titulo.length > 32 ? task.titulo.slice(0, 30) + "…" : task.titulo;

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "bold 10px var(--font-mono, monospace)";
    ctx.textAlign = "center";
    ctx.fillText(label, x2, y - r - 4);
    ctx.font = "9px var(--font-mono, monospace)";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
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
    ctx.globalAlpha = depth === 1 ? 0.75 : 0.55;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = `500 9px var(--font-mono, monospace)`;
    ctx.textAlign = "left";
    ctx.fillText(label, tagX + tagPadX, tagY + tagH / 2 + 3);

    tagX += tagW + 6;
  });
}
