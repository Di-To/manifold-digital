// services/proyectos.ts
import { supabase } from "@/lib/supabase";

// ─── Temporary types (move to /types/index.ts after colleague merges) ────────

export type ProjectStatus =
  | "Planificacion"
  | "Activo"
  | "Pausado"
  | "Finalizado";

export interface Project {
  id?: string; // optional on create — Supabase generates it
  empresa_id: string;
  nombre: string;
  descripcion?: string;
  fecha_inicio_planificada?: string;
  fecha_fin_planificada?: string;
  estado?: ProjectStatus;
  creado_en?: string;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getProyectos(empresaId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from("proyectos")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("creado_en", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getProyectoById(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from("proyectos")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createProyecto(
  proyecto: Omit<Project, "id" | "creado_en">,
): Promise<Project> {
  const { data, error } = await supabase
    .from("proyectos")
    .insert(proyecto)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateProyecto(
  id: string,
  updates: Partial<Project>,
): Promise<Project> {
  const { data, error } = await supabase
    .from("proyectos")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteProyecto(id: string): Promise<void> {
  const { error } = await supabase.from("proyectos").delete().eq("id", id);

  if (error) throw new Error(error.message);
}
