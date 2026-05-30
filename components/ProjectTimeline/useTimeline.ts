import { useMemo, useCallback } from "react";
import {
  GanttTask,
  TreeNode,
  buildTree,
  getVisible,
  getMonths,
  diffDays,
  isGroup,
} from "./types";

interface UseTimelineOptions {
  tasks: GanttTask[];
  collapsed: Set<string>;
  dayWindow: number | null;
  statusFilter: "all" | "active";
  W: number;
  zoom: number;
}

export function useTimeline({
  tasks,
  collapsed,
  dayWindow,
  statusFilter,
  W,
  zoom,
}: UseTimelineOptions) {
  const roots = useMemo(() => buildTree(tasks), [tasks]);

  const visible = useMemo(
    () => getVisible(roots, collapsed),
    [roots, collapsed],
  );

  // project bounds — always derived from full tasks array so ruler never shifts
  const projectStart = useMemo(
    () =>
      tasks.length
        ? tasks.reduce(
            (min, t) =>
              t.fecha_inicio_planificada < min
                ? t.fecha_inicio_planificada
                : min,
            tasks[0].fecha_inicio_planificada,
          )
        : "",
    [tasks],
  );

  const projectEnd = useMemo(
    () =>
      tasks.length
        ? tasks.reduce(
            (max, t) =>
              t.fecha_fin_planificada > max ? t.fecha_fin_planificada : max,
            tasks[0].fecha_fin_planificada,
          )
        : "",
    [tasks],
  );

  const totalDays = useMemo(
    () => (projectStart && projectEnd ? diffDays(projectStart, projectEnd) : 1),
    [projectStart, projectEnd],
  );

  const months = useMemo(
    () =>
      projectStart && projectEnd ? getMonths(projectStart, projectEnd) : [],
    [projectStart, projectEnd],
  );

  const timelineW = W * zoom;

  const pxDay = useCallback(
    (days: number) => (timelineW > 0 ? (days / totalDays) * timelineW : 0),
    [totalDays, timelineW],
  );

  const filtered = useMemo(() => {
    const todayOffset = diffDays(
      projectStart,
      new Date().toISOString().slice(0, 10),
    );

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

  // build node depth map from full tree (for tag ancestors)
  const nodeDepths = useMemo(() => {
    const map: Record<string, number> = {};
    function walk(n: TreeNode) {
      map[n.id] = n.depth;
      n.children.forEach(walk);
    }
    roots.forEach(walk);
    return map;
  }, [roots]);

  return {
    roots,
    visible,
    filtered,
    projectStart,
    projectEnd,
    totalDays,
    months,
    timelineW,
    pxDay,
    nodeDepths,
  };
}
