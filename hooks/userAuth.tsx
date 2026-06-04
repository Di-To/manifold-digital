'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { RoleTypes } from '../app/data-structure';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: RoleTypes;
  companyId: string;
  companyName: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (uid: string, email: string): Promise<AuthUser | null> => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, email, rol, empresa_id, empresas(nombre)')
        .eq('id', uid)
        .single();

      if (error || !data) {
        console.error('Error al obtener perfil de usuario:', error);
        return null;
      }

      const companyData = data.empresas as any;
      const companyNameExtracted = companyData?.nombre || 'Mi Empresa';

      return {
        id: data.id,
        email: email,
        name: data.nombre,
        role: data.rol as RoleTypes,
        companyId: data.empresa_id || 'NOT_ASSIGN',
        companyName: companyNameExtracted,
      };

    } catch (err) {
      console.error('Error inesperado en fetchUserProfile:', err);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session?.user && isMounted) {
          const profile = await fetchUserProfile(session.user.id, session.user.email || '');
          if (isMounted) {
            setUser(profile);
          }
        } else {
          if (isMounted) setUser(null);
        }
      } catch (err) {
        console.error("Error crítico inicializando autenticación:", err);
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            const profile = await fetchUserProfile(session.user.id, session.user.email || '');
            if (isMounted) {
              setUser(profile);
              setLoading(false);
            }
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function userAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('userAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}