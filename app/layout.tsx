import { AuthProvider } from '@/hooks/userAuth';
import '@/app/globals.css';

//
export const metadata = {
  title: 'Manifold Digital',
  description: 'Sistema de Gestión de Inspecciones e Incidencias',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}