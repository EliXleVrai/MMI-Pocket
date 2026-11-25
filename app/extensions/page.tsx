import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ExtensionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  if (!profile?.username) redirect('/choisir-pseudo');

  return (
    <main className="page-container">
      <h1>Extensions</h1>
      <p className="page-description">
        Découvre les différentes séries de cartes MMI Pocket.
      </p>

      <section className="profile-card">
        <h2>Extensions disponibles</h2>
        <p>Les premières extensions seront bientôt dévoilées !</p>
      </section>
    </main>
  );
}
