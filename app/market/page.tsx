import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function MarketPage() {
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
      <h1>Marché</h1>
      <p className="page-description">
        Échange tes pièces contre des cartes et objets.
      </p>

      <section className="profile-card">
        <h2>Le marché arrive bientôt</h2>
        <p>Les offres et les achats seront bientôt disponibles.</p>
      </section>
    </main>
  );
}
