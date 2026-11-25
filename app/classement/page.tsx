import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function RankingPage() {
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
      <h1>Classement</h1>
      <p className="page-description">
        Découvre les meilleurs collectionneurs de MMI Pocket.
      </p>

      <section className="profile-card">
        <h2>Classement des joueurs</h2>
        <p>Le classement sera bientôt disponible !</p>
      </section>
    </main>
  );
}
