'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RoleTypes } from '../data-structure';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const TIEMPO_INACTIVIDAD = 15 * 60 * 1000;
    let timeoutId: NodeJS.Timeout;

    const reiniciarTemporizador = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(cerrarSesionPorInactividad, TIEMPO_INACTIVIDAD);
    };

    const cerrarSesionPorInactividad = async () => {
      console.warn("Sesión expirada por inactividad.");
      try {
        router.push('/auth');
        await logout();
      } catch (error) {
        console.error("Error al cerrar sesión por inactividad:", error);
      }
    };

    const eventos = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    eventos.forEach(evento => {
      window.addEventListener(evento, reiniciarTemporizador);
    });
    reiniciarTemporizador();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      eventos.forEach(evento => {
        window.removeEventListener(evento, reiniciarTemporizador);
      });
    };
  }, [logout, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-slate-500 text-sm font-bold animate-pulse">Cargando aplicación...</div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      router.push('/auth');
      await logout();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const companyName = user?.companyName || "Mi Empresa";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans">
      <aside className="w-64 border-r border-slate-200 bg-[#f8fafc] flex flex-col justify-between fixed h-full z-10">
        <div className="p-6 space-y-8">
          <div className="flex flex-col">
            <span className="font-black text-lg text-slate-900 tracking-tight leading-none">MANIFOLD DIGITAL</span>
            <span className="font-bold text-xs text-[#0284c7] tracking-widest uppercase mt-1">Proyectos</span>
          </div>

          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${pathname === '/dashboard'
                ? 'bg-white border border-slate-200 text-[#0284c7] shadow-sm'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}>
              <span className="text-base">📊</span> Dashboard
            </Link>

            {(user?.role === RoleTypes.Gerente || user?.role === RoleTypes.Jefe_Obra) && (
              <Link
                href="/dashboard/proyectos"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${pathname.startsWith('/dashboard/proyectos') // Cambiado a startsWith para mantener activo el link en subrutas como [id]
                  ? 'bg-white border border-slate-200 text-[#0284c7] shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`}>
                <span className="text-base">🏗️</span> Proyectos de la Empresa
              </Link>
            )}

            {user?.role === RoleTypes.Inspector && (
              <Link
                href="/dashboard/inspector"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${pathname === '/dashboard/inspector' // Corregido el pathname que apuntaba a /proyectos
                  ? 'bg-white border border-slate-200 text-[#0284c7] shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`}>
                <span className="text-base">📋</span> Inspecciones y Reportes
              </Link>
            )}

            {user?.role === RoleTypes.Gerente && (
              <Link
                href="/dashboard/usuarios"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${pathname === '/dashboard/usuarios'
                  ? 'bg-white border border-slate-200 text-[#0284c7] shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`}>
                <span className="text-base">👥</span> Registro de Personal
              </Link>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 bg-white space-y-2">
          <div className="flex items-center gap-3 px-2 py-1.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-sky-100 text-[#0284c7] flex items-center justify-center font-bold text-sm select-none">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-800 truncate">{user?.name || 'Usuario'}</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">{user?.role || 'Personal'}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer border border-red-200/50 shadow-sm">
            ❌ Cerrar Sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col pl-64">
        <header className="h-16 border-b border-slate-200 bg-white px-8 flex justify-between items-center fixed right-0 left-64 z-10">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2 select-none">
            <span>🏢</span> {pathname === '/usuarios' ? `Configuración de Empresa — ${companyName}` : companyName}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-500 font-medium">
              Estado del Sistema: <span className="text-emerald-500 font-bold">● En Línea</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 mt-16 bg-[#f8fafc]">
          {children}
        </main>
      </div>
    </div>
  );
}