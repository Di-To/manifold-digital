// app/proyectos/test/page.tsx
// DELETE THIS FILE before going to production

"use client";
import { useState } from "react";
import {
  getProyectos,
  getProyectoById,
  createProyecto,
  updateProyecto,
  deleteProyecto,
} from "@/services/proyectos";

// ← swap for a real empresa_id from your seed data
const TEST_EMPRESA_ID = "e1111111-1111-1111-1111-111111111111";

export default function TestPage() {
  const [log, setLog] = useState<string[]>([]);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const print = (msg: string) => setLog((prev) => [...prev, msg]);

  async function runAll() {
    setLog([]);
    try {
      // 1. CREATE
      print("▶ createProyecto...");
      const created = await createProyecto({
        empresa_id: TEST_EMPRESA_ID,
        nombre: "Proyecto Test",
        descripcion: "Creado desde test page",
        fecha_inicio_planificada: "2026-06-01",
        fecha_fin_planificada: "2026-12-01",
        estado: "Planificacion",
      });
      print(`✅ created: ${created.id} — ${created.nombre}`);
      setCreatedId(created.id!);

      // 2. GET ALL
      print("▶ getProyectos...");
      const all = await getProyectos(TEST_EMPRESA_ID);
      print(`✅ getProyectos: ${all.length} proyecto(s) found`);

      // 3. GET BY ID
      print("▶ getProyectoById...");
      const one = await getProyectoById(created.id!);
      print(`✅ getProyectoById: ${one?.nombre}`);

      // 4. UPDATE
      print("▶ updateProyecto...");
      const updated = await updateProyecto(created.id!, {
        estado: "Activo",
        nombre: "Proyecto Test (editado)",
      });
      print(`✅ updated: estado=${updated.estado}, nombre=${updated.nombre}`);

      // 5. DELETE
      print("▶ deleteProyecto...");
      await deleteProyecto(created.id!);
      print(`✅ deleted: ${created.id}`);
      setCreatedId(null);

      print("─────────────────");
      print("🎉 All tests passed");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      print(`❌ ERROR: ${message}`);
    }
  }

  return (
    <div style={{ padding: 32, fontFamily: "monospace" }}>
      <h1>Service test — proyectos</h1>
      <p style={{ color: "gray", fontSize: 13 }}>
        Uses empresa_id: <strong>{TEST_EMPRESA_ID}</strong>
      </p>
      <button
        onClick={runAll}
        style={{ padding: "8px 20px", marginBottom: 24 }}
      >
        Run all tests
      </button>
      {createdId && (
        <p style={{ color: "orange" }}>
          ⚠ Created ID still alive: {createdId} — run tests again to clean up
        </p>
      )}
      <div
        style={{
          background: "#111",
          color: "#eee",
          padding: 16,
          borderRadius: 8,
          minHeight: 200,
        }}
      >
        {log.length === 0 && (
          <span style={{ color: "#555" }}>Output will appear here...</span>
        )}
        {log.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}
