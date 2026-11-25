import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function TradesPage() {
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
      <h1>Échanges</h1>
      <p className="page-description">
        Échange tes cartes avec les autres joueurs.
      </p>

      <section className="profile-card">
        <h2>Aucun échange pour le moment</h2>
        <p>Le système d'échange entre joueurs arrive bientôt !</p>
      </section>
    </main>
  );
}
