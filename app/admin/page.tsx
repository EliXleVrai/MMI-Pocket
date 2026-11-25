import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, role')
    .eq('id', user.id)
    .single();

  if (!profile?.username) redirect('/choisir-pseudo');

  if (profile.role !== 'admin') redirect('/');

  return (
    <main className="page-container">
      <h1>Administration</h1>

      <p className="page-description">
        Bienvenue dans le panneau de gestion de MMI Pocket.
      </p>

      <section className="profile-card">
        <h2>Gestion du jeu</h2>
        <p>Connecté en tant que @{profile.username}</p>
      </section>

      <section className="admin-grid">
        <article className="profile-card">
          <h2>Cartes</h2>
          <p>Créer et gérer les cartes du jeu.</p>
        </article>

        <article className="profile-card">
          <h2>Extensions</h2>
          <p>Créer et gérer les extensions.</p>
        </article>

        <article className="profile-card">
          <h2>Boosters</h2>
          <p>Configurer les boosters et leurs contenus.</p>
        </article>

        <article className="profile-card">
          <h2>Joueurs</h2>
          <p>Consulter et gérer les comptes joueurs.</p>
        </article>
      </section>
    </main>
  );
}
