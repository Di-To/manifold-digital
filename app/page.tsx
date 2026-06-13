/*import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Consultamos la tabla de proyectos que creamos con el script SQL
  const { data: proyectos, error } = await supabase
    .from("proyectos")
    .select("*");

  return (
    <main
      style={{ padding: "2rem", fontFamily: "sans-serif", lineHeight: "1.6" }}
    >
      <h1>Manifold Digital - Dashboard de Control</h1>
      <hr />

      {error ? (
        <div style={{ color: "red", marginTop: "1rem" }}>
          <p>❌ Error al obtener proyectos:</p>
          <pre>{error.message}</pre>
        </div>
      ) : (
        <section style={{ marginTop: "1rem" }}>
          <p style={{ color: "green", fontWeight: "bold" }}>
            ✅ Conexión exitosa a la base de datos.
          </p>

          <h2>Proyectos Activos ({proyectos?.length || 0})</h2>

          <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
            {proyectos?.map((proyecto) => (
              <div
                key={proyecto.id}
                style={{
                  border: "1px solid #ccc",
                  padding: "1rem",
                  borderRadius: "8px",
                  background: "#f9f9f9",
                }}
              >
                <h3 style={{ margin: "0 0 0.5rem 0" }}>{proyecto.nombre}</h3>
                <p style={{ fontSize: "0.9rem", color: "#555" }}>
                  {proyecto.descripcion}
                </p>
                <span
                  style={{
                    background:
                      proyecto.estado === "Activo" ? "#d4edda" : "#eee",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "0.8rem",
                  }}
                >
                  Estado: {proyecto.estado}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}*/

'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 font-sans">
      <div className="max-w-md w-full text-center space-y-8 bg-white p-10 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-sky-600 bg-sky-50 px-3 py-1 rounded-full">
            AUDITECH
          </span>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            MANIFOLD DIGITAL <br />
            <span className="text-sky-600">PROYECTOS</span>
          </h1>
          <p className="text-slate-500 text-sm">
            Sistema para el monitoreo de inspecciones técnicas de obras.
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="/dashboard"
            className="w-full bg-[#0284c7] hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md shadow-sky-600/20 tracking-wide text-sm flex items-center justify-center gap-2"
          >
            Ingresar al Panel de Control →
          </Link>
        </div>
      </div>
    </div>
  );
}