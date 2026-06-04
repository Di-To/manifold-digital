'use client';

import { useEffect, useState } from 'react';
import { userAuth } from '@/hooks/userAuth';
import { supabase } from '@/lib/supabaseClient';
import { Project, ProjectStatusTypes } from '@/app/data-structure';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = userAuth();
  const [proyectos, setProyectos] = useState<Project[]>([]);
  const [errorProyectos, setErrorProyectos] = useState<string | null>(null);
  const [loadingProyectos, setLoadingProyectos] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchProyectos() {
      if (!user?.companyId) return;

      try {
        setLoadingProyectos(true);
        const { data, error } = await supabase
          .from('proyectos')
          .select('id, empresa_id, nombre, descripcion, fecha_inicio_planificada, fecha_fin_planificada, estado, creado_en')
          .eq('empresa_id', user.companyId);

        if (error) throw error;

        const proyectosMapeados: Project[] = (data || []).map((p: any) => {
          const proy = new Project();
          proy.id = p.id;
          proy.companyId = p.empresa_id;
          proy.name = p.nombre;
          proy.description = p.descripcion || '';
          proy.startDate = p.fecha_inicio_planificada || '';
          proy.endDate = p.fecha_fin_planificada || '';
          proy.status = p.estado as ProjectStatusTypes;
          proy.creationDate = p.creado_en;
          return proy;
        });

        setProyectos(proyectosMapeados);
      } catch (err: any) {
        setErrorProyectos(err.message || 'Error al obtener proyectos');
      } finally {
        setLoadingProyectos(false);
      }
    }

    if (!loading && user) {
      fetchProyectos();
    }
  }, [user, loading]);

  if (loading) return null;
  if (!user) return null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Operaciones Globales</span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">Panel de Control</h1>
          <p className="text-slate-500 text-xs mt-1">
            Bienvenido, <span className="font-bold text-slate-800">{user.name}</span>
            <span className="ml-2 inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-700/10">
              {user.role}
            </span>
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>📂</span> Proyectos
          <span className="text-xs font-bold bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded-full">
            {proyectos.length}
          </span>
        </h2>

        {loadingProyectos ? (
          <div className="p-8 text-center text-slate-400 text-sm animate-pulse">
            Cargando módulos y proyectos asignados...
          </div>
        ) : errorProyectos ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">
            ❌ {errorProyectos}
          </div>
        ) : proyectos.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            <span className="text-2xl">🏗️</span>
            <p className="text-sm font-medium text-slate-400 mt-2">No hay proyectos registrados para esta empresa todavía.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {proyectos.map((proyecto) => (
              <div
                key={proyecto.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 text-base tracking-tight">{proyecto.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{proyecto.description}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${proyecto.status === ProjectStatusTypes.Activo
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10'
                      : 'bg-slate-50 text-slate-700 ring-1 ring-slate-600/10'
                    }`}>
                    {proyecto.status}
                  </span>
                  <button className="text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors">
                    Ver Detalles →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}