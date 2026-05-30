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

export interface GanttProps {
  tasks: GanttTask[];
  dependencies?: Dependency[];
  projectName?: string;
}

export interface TreeNode extends GanttTask {
  children: TreeNode[];
  depth: number;
  isGroup: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const DOT_R = 4;
export const GROUP_DOT_R = 5;
export const LANE_H = 14;
export const LANE_PADDING = 4;
export const RULER_H = 40;
export const INDENT_PX = 12;

export const BRANCH_COLORS = [
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function diffDays(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function fmtShort(s: string): string {
  return new Date(s).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fmtMonthYear(d: Date): string {
  return d.toLocaleDateString("es", { month: "short", year: "2-digit" });
}

export function isGroup(task: GanttTask, tasks: GanttTask[]): boolean {
  return tasks.some((t) => t.tarea_padre_id === task.id);
}

export function dotColor(task: GanttTask, tasks: GanttTask[]): string {
  if (!task.tarea_padre_id) return "#185FA5";
  if (isGroup(task, tasks)) return "#378ADD";
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

export function buildTree(tasks: GanttTask[]): TreeNode[] {
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

export function getVisible(
  roots: TreeNode[],
  collapsed: Set<string>,
): TreeNode[] {
  const out: TreeNode[] = [];
  function walk(n: TreeNode) {
    out.push(n);
    if (!collapsed.has(n.id)) n.children.forEach(walk);
  }
  roots.forEach(walk);
  return out;
}

export function getMonths(
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

export function buildBranchColors(roots: TreeNode[]): Record<string, string> {
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
  return branchColor;
}
