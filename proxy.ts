import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Iniciar al usuario en el proxy
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set({ name, value, ...options })
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({ name, value, ...options })
          );
        },
      },
    }
  );

  // Obtener el usuario actual
  const { data: { user } } = await supabase.auth.getUser();
  const url = request.nextUrl.clone();
  
  // Si el usuario está logueado e intenta ir al Login/Auth, va al dashboard
  if (user && url.pathname.startsWith('/auth')) {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Si el usuario NO está logueado, va al login
  if (!user && (
    url.pathname.startsWith('/dashboard') || 
    url.pathname.startsWith('/proyectos') || 
    url.pathname.startsWith('/inspecciones')
  )) {
    url.pathname = '/auth';
    return NextResponse.redirect(url);
  }

  return response;
}

// Rutas para el proxy
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};