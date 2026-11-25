import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UsernameForm } from '@/components/username-form';

export default async function ChooseUsernamePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  if (profile?.username) {
    redirect('/');
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-logo">MMI POCKET</div>

        <h1>Bienvenue dans MMI Pocket !</h1>

        <p>
          Avant de commencer ton aventure, choisis ton pseudo.
          Les autres joueurs pourront te retrouver grâce à celui-ci.
        </p>

        <UsernameForm />
      </section>
    </main>
  );
}
