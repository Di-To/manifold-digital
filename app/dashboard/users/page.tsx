'use client';

import { userAuth } from '@/hooks/userAuth';
import { RoleTypes } from '../../data-structure';
import RegisterEmployeeForm from '@/components/forms/RegisterEmployeeForm';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function UsersPage() {
  const { user, loading } = userAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== RoleTypes.Gerente)) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="p-4 text-slate-500 text-xs animate-pulse font-bold uppercase tracking-wider">
        Verificando permisos de acceso...
      </div>
    );
  }

  if (user?.role !== RoleTypes.Gerente) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col space-y-1 pb-4 border-b border-slate-200">
        <span className="text-xs font-bold text-[#0284c7] uppercase tracking-widest">Administración de Cuentas</span>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestión de Personal</h1>
        <p className="text-slate-500 text-xs font-medium">
          Registro de nuevos usuarios para los trabajadores asignados a su misma empresa corporativa.
        </p>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl shadow-slate-100 text-slate-900">
        <RegisterEmployeeForm />
      </div>
    </div>
  );
}