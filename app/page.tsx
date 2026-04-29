// import Image from "next/image";

// export default function Home() {
//   return (
//     <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
//       <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
//         <Image
//           className="dark:invert"
//           src="/next.svg"
//           alt="Next.js logo"
//           width={100}
//           height={20}
//           priority
//         />
//         <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
//           <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
//             To get started, edit the page.tsx file.
//           </h1>
//           <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
//             Looking for a starting point or more instructions? Head over to{" "}
//             <a
//               href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//               className="font-medium text-zinc-950 dark:text-zinc-50"
//             >
//               Templates
//             </a>{" "}
//             or the{" "}
//             <a
//               href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//               className="font-medium text-zinc-950 dark:text-zinc-50"
//             >
//               Learning
//             </a>{" "}
//             center.
//           </p>
//         </div>
//         <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
//           <a
//             className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
//             href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             <Image
//               className="dark:invert"
//               src="/vercel.svg"
//               alt="Vercel logomark"
//               width={16}
//               height={16}
//             />
//             Deploy Now
//           </a>
//           <a
//             className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
//             href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             Documentation
//           </a>
//         </div>
//       </main>
//     </div>
//   );
// }

import { createClient } from "@/utils/supabase/server";
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
}
