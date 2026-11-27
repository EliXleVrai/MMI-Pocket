
import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  // Vérification de l'origine de la requête
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json(
      { error: 'Requête non autorisée.' },
      { status: 403 }
    );
  }

  // Vérifier la session de l'utilisateur
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: 'Tu dois être connecté pour effectuer cette action.' },
      { status: 401 }
    );
  }

  // Vérifier la présence de la clé administrateur
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Configuration administrateur Supabase manquante.');

    return NextResponse.json(
      { error: 'Le service de suppression est momentanément indisponible.' },
      { status: 500 }
    );
  }

  // Client réservé au serveur, avec les droits administrateur
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

  // Supprimer définitivement le compte Auth.
  // La suppression du profil déclenche les cascades SQL.
  const { error: deleteError } =
    await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error('Erreur de suppression du compte :', deleteError.message);

    return NextResponse.json(
      { error: 'Impossible de supprimer ton compte. Réessaie plus tard.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
