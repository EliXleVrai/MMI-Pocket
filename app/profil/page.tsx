
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileEditForm } from '@/components/profile-edit-form';

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [
    { data: profile },
    { data: wallet },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),

    supabase
      .from('player_wallets')
      .select('coins, energy, max_energy')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if (!profile?.username) {
    redirect('/choisir-pseudo');
  }

  return (
    <main className="page-container">
      <section className="profile-header">
        <div className="profile-avatar">
          {(profile.display_name || profile.username)
            .charAt(0)
            .toUpperCase()}
        </div>

        <div>
          <p className="eyebrow">JOUEUR MMI POCKET</p>
          <h1>{profile.display_name || profile.username}</h1>
          <p>@{profile.username}</p>
        </div>
      </section>

      <section className="profile-card">
        <h2>Modifier mon profil</h2>

        <ProfileEditForm
          initialUsername={profile.username}
          initialDisplayName={profile.display_name || ''}
        />
      </section>

      <section className="profile-card">
        <h2>Informations du compte</h2>

        <p><strong>Pseudo :</strong> {profile.username}</p>

        <p>
          <strong>Nom affiché :</strong>{' '}
          {profile.display_name || 'Non renseigné'}
        </p>

        <p><strong>Email :</strong> {user.email}</p>

        <p>
          <strong>Inscription :</strong>{' '}
          {new Date(user.created_at).toLocaleDateString('fr-FR')}
        </p>
      </section>

      <section className="profile-card">
        <h2>Portefeuille</h2>

        <div className="profile-wallet">
          <p>🪙 Pièces</p>
          <strong>{wallet?.coins ?? 0}</strong>
        </div>

        <div className="profile-wallet">
          <p>⚡ Énergie</p>
          <strong>{wallet?.energy ?? 0}</strong>
        </div>
      </section>
    </main>
  );
}
