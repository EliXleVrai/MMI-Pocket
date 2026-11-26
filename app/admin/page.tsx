import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CardCreator } from '@/components/card-creator';
import { ExtensionManager } from '@/components/extension-manager';
import { BoosterManager } from '@/components/booster-manager';

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
        Gère les extensions, les boosters, les cartes et le contenu de MMI Pocket.
      </p>

      <section className="profile-card">
        <h2>Bienvenue, @{profile.username}</h2>
        <p>Tu es connecté en tant qu&apos;administrateur.</p>
      </section>

      <ExtensionManager />

      <div className="admin-dashboard-divider" />

      <BoosterManager />

      <div className="admin-dashboard-divider" />

      <CardCreator />
    </main>
  );
}
