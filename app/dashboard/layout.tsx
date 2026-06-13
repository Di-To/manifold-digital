"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { RoleTypes } from "../data-structure";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavLink {
  href: string;
  label: string;
  icon: string;
  active: boolean;
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  navLinks: NavLink[];
  userName: string | undefined;
  userRole: string | undefined;
  onLogout: () => void;
}

function Sidebar({ navLinks, userName, userRole, onLogout }: SidebarProps) {
  return (
    <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col justify-between h-full">
      <div className="p-6 space-y-8">
        {/* brand */}
        <div className="flex flex-col">
          <span className="font-black text-lg text-slate-900 tracking-tight leading-none">
            MANIFOLD DIGITAL
          </span>
          <span className="font-bold text-xs text-sky-600 tracking-widest uppercase mt-1">
            Proyectos
          </span>
        </div>

        {/* nav */}
        <nav className="space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all no-underline ${
                link.active
                  ? "bg-white border border-slate-200 text-sky-600 shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-base">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* user + logout */}
      <div className="p-4 border-t border-slate-200 bg-white space-y-2">
        <div className="flex items-center gap-3 px-2 py-1.5 mb-2">
          <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-sm select-none shrink-0">
            {userName?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-slate-800 truncate">
              {userName || "Usuario"}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">
              {userRole || "Personal"}
            </span>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer border border-red-100"
        >
          ❌ Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    const TIMEOUT = 15 * 60 * 1000;
    let timeoutId: NodeJS.Timeout;

    const reset = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        console.warn("Sesión expirada por inactividad.");
        try {
          router.push("/auth");
          await logout();
        } catch (e) {
          console.error("Error al cerrar sesión:", e);
        }
      }, TIMEOUT);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      clearTimeout(timeoutId);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [logout, router]);

  useEffect(() => {
    setTimeout(() => setSidebarOpen(false), 0);
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 text-sm font-bold animate-pulse">
          Cargando aplicación...
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      router.push("/auth");
      await logout();
    } catch (e) {
      console.error("Error al cerrar sesión:", e);
    }
  };

  const companyName = user?.companyName || "Mi Empresa";

  const navLinks: NavLink[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: "📊",
      active: pathname === "/dashboard",
    },
    ...(user?.role === RoleTypes.Gerente || user?.role === RoleTypes.Jefe_Obra
      ? [
          {
            href: "/dashboard/proyectos",
            label: "Proyectos de la Empresa",
            icon: "🏗️",
            active: pathname.startsWith("/dashboard/proyectos"),
          },
        ]
      : []),
    ...(user?.role === RoleTypes.Inspector
      ? [
          {
            href: "/dashboard/inspector",
            label: "Inspecciones y Reportes",
            icon: "📋",
            active: pathname.startsWith("/dashboard/inspector"),
          },
        ]
      : []),
    ...(user?.role === RoleTypes.Gerente
      ? [
          {
            href: "/dashboard/usuarios",
            label: "Registro de Personal",
            icon: "👥",
            active: pathname === "/dashboard/usuarios",
          },
        ]
      : []),
  ];

  const sidebarProps: SidebarProps = {
    navLinks,
    userName: user?.name,
    userRole: user?.role,
    onLogout: handleLogout,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans">
      {/* desktop sidebar */}
      <div className="hidden lg:flex fixed inset-y-0 left-0 w-64 z-20 flex-col">
        <Sidebar {...sidebarProps} />
      </div>

      {/* mobile sidebar drawer */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 z-40 lg:hidden flex flex-col shadow-xl">
            <Sidebar {...sidebarProps} />
          </div>
        </>
      )}

      {/* main */}
      <div className="flex-1 flex flex-col lg:pl-64">
        {/* header */}
        <header className="h-14 lg:h-16 border-b border-slate-200 bg-white px-4 lg:px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2 select-none">
              <span>🏢</span>
              <span className="hidden sm:inline">{companyName}</span>
            </span>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            <span className="hidden sm:inline">Estado del Sistema: </span>
            <span className="text-emerald-500 font-bold">● En Línea</span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-slate-50">{children}</main>
      </div>
    </div>
  );
}
