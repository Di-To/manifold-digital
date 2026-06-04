'use client';

import { useState } from 'react';
import { userAuth } from '@/hooks/userAuth';
import { RoleTypes } from '@/app/data-structure';

export default function RegisterEmployeeForm() {
  const { user } = userAuth();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<RoleTypes>(RoleTypes.Inspector);
  const [hiringDate, setHiringDate] = useState('');

  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          email,
          password,
          rol,
          hiringDate,
          companyId: user?.companyId
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar trabajador');

      setStatus({ success: true, message: '🚀 Trabajador registrado exitosamente.' });
      setNombre('');
      setEmail('');
      setPassword('');
      setRol(RoleTypes.Inspector);
      setHiringDate('');
    } catch (err: any) {
      setStatus({ success: false, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Registrar Nuevo Trabajador</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          El nuevo usuario se asociará automáticamente a tu misma empresa.
        </p>
      </div>

      {status && (
        <div className={`p-3.5 rounded-xl text-xs font-semibold ring-1 ${status.success
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/10'
            : 'bg-red-50 text-red-600 ring-red-600/10'
          }`}>
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre Completo</label>
          <input
            type="text"
            required
            placeholder="Ej: Juan Pérez Soto"
            className="w-full px-4 py-2 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 text-sm outline-none focus:border-sky-500 bg-slate-50/50"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email</label>
          <input
            type="email"
            required
            placeholder="nombre@empresa.cl"
            className="w-full px-4 py-2 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 text-sm outline-none focus:border-sky-500 bg-slate-50/50"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Contraseña temporal</label>
          <input
            type="password"
            required
            placeholder="••••••••"
            className="w-full px-4 py-2 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 text-sm outline-none focus:border-sky-500 bg-slate-50/50"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Rol operacional</label>
          <select
            className="w-full px-4 py-2 rounded-xl border border-slate-200 text-slate-900 text-sm outline-none focus:border-sky-500 bg-slate-50/50 h-[38px]"
            value={rol}
            onChange={(e) => setRol(e.target.value as RoleTypes)}
          >
            <option value={RoleTypes.Inspector}>Inspector Técnico</option>
            <option value={RoleTypes.Jefe_Obra}>Jefe de Obra</option>
            <option value={RoleTypes.Gerente}>Gerente</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha de contratación</label>
          <input
            type="date"
            required
            className="w-full px-4 py-2 rounded-xl border border-slate-200 text-slate-900 text-sm outline-none focus:border-sky-500 bg-slate-50/50 h-[38px]"
            value={hiringDate}
            onChange={(e) => setHiringDate(e.target.value)}
          />
        </div>

        <div className="sm:col-span-2 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto bg-[#0284c7] hover:bg-sky-700 text-white font-bold py-2 px-6 rounded-xl text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {loading ? 'Registrando...' : 'Crear nuevo usuario'}
          </button>
        </div>
      </form>
    </div>
  );
}