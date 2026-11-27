
import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json(
      { error: 'Requête non autorisée.' },
      { status: 403 }
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: 'Tu dois être connecté.' },
      { status: 401 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Configuration Supabase manquante.');

    return NextResponse.json(
      { error: 'Service indisponible.' },
      { status: 500 }
    );
  }

  const admin = createSupabaseClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const { error: deleteError } =
    await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error('Erreur de suppression :', deleteError.message);

    return NextResponse.json(
      { error: 'Impossible de supprimer ton compte.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
