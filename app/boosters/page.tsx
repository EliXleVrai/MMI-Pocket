import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function BoostersPage() {
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
      <h1>Boosters</h1>
      <p className="page-description">
        Ouvre des boosters pour agrandir ta collection !
      </p>

      <section className="profile-card">
        <h2>Les boosters arrivent bientôt</h2>
        <p>
          Prépare-toi à découvrir de nouvelles cartes et des raretés exclusives.
        </p>
      </section>
    </main>
  );
}
