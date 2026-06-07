import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } },
  );

  const payload = await req.json();
  // payload shape: { proyecto_id, tareas: [...] }

  const { proyecto_id, tareas } = payload;

  // ── Pass 1: insert all tasks with placeholder parent ──────────────
  const idMap: Record<string, string> = {}; // id_temporal → real uuid

  for (const t of tareas) {
    const { data, error } = await supabase
      .from("tareas")
      .insert({
        proyecto_id,
        titulo: t.titulo,
        tarea_padre_id: null, // set in pass 2
        fecha_inicio_planificada: t.fecha_inicio,
        fecha_fin_planificada: t.fecha_fin,
        estado: "Pendiente",
        porcentaje_avance_actual: 0,
      })
      .select("id")
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    idMap[t.id_temporal] = data.id;
  }

  // ── Pass 2: set tarea_padre_id now that all uuids exist ───────────
  for (const t of tareas) {
    if (!t.tarea_padre_id_temporal) continue;
    const realParentId = idMap[t.tarea_padre_id_temporal];
    if (!realParentId) continue;

    const { error } = await supabase
      .from("tareas")
      .update({ tarea_padre_id: realParentId })
      .eq("id", idMap[t.id_temporal]);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Pass 3: insert dependencies ───────────────────────────────────
  for (const t of tareas) {
    for (const depId of t.depende_de) {
      const { error } = await supabase.from("dependencias_tareas").insert({
        tarea_id: idMap[t.id_temporal],
        depende_de_tarea_id: idMap[depId],
        tipo_dependencia: "Fin-a-Inicio",
      });

      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, count: tareas.length, idMap });
}
