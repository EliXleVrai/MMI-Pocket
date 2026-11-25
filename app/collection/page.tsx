import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function CollectionPage() {
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
      <h1>Ma collection</h1>
      <p className="page-description">
        Retrouve ici toutes les cartes que tu as obtenues.
      </p>

      <section className="profile-card">
        <h2>Mes cartes</h2>
        <p>Ta collection est actuellement vide.</p>
        <p>Ouvre tes premiers boosters pour obtenir des cartes !</p>
      </section>
    </main>
  );
}
