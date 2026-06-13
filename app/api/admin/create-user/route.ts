import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@/lib/supabaseServer';

export async function POST(request: Request) {
  try {
    const supabaseServer = await createClient();
    const { data: { user: currentUser }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json({ error: 'No autorizado. Debes iniciar sesión.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseServer
      .from('usuarios')
      .select('rol, empresa_id')
      .eq('id', currentUser.id)
      .single();

    if (profileError || !profile || profile.rol !== 'Gerente') {
      return NextResponse.json(
        { error: 'Permisos insuficientes. Solo los Gerentes pueden registrar usuarios.' },
        { status: 403 }
      );
    }

    const { email, password, nombre, rol, hiringDate } = await request.json();
    if (!email || !password || !nombre || !rol || !hiringDate) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 });
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: nombre,
        role: rol,
        companyId: profile.empresa_id
      }
    });

    if (createError || !newUser.user) {
      return NextResponse.json({ error: createError?.message || 'Error al crear el usuario.' }, { status: 400 });
    }

    const { error: dbError } = await supabaseAdmin
      .from('usuarios')
      .update({
        fecha_contratacion: hiringDate 
      })
      .eq('id', newUser.user.id); 

    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ error: `Error en base de datos al asignar fecha: ${dbError.message}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario creado exitosamente',
      userId: newUser.user.id
    });

  } catch (error) {
    console.error('Error crítico en el registro de usuarios:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}