
'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DiagnosticPage() {
  type DiagnosticResult = {
  session: boolean;
  user: boolean;
  email: string;
  id: string;
  profile: string;
  profileError: string;
};

  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    setLoading(true);

    const supabase = createClient();
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    const user = userData.user;
    let profile = 'Non vérifié';
    let profileError = '';

    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', user.id)
        .maybeSingle();

      profile = error ? 'Erreur' : data ? 'Trouvé' : 'Absent';
      profileError = error?.message ?? '';
    }

    setResult({
      session: !!sessionData.session && !sessionError,
      user: !!user && !userError,
      email: user?.email ?? 'Aucun',
      id: user?.id ?? 'Aucun',
      profile,
      profileError,
    });

    setg(false);
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  return (
    <main style={{ padding: 30, color: '#172033' }}>
      <h1>Diagnostic MMI Pocket</h1>

      {loading || !result ? <p>Vérification...</p> : (
        <>
          <p>Session : {result.session ? 'DÉTECTÉE' : 'ABSENTE'}</p>
          <p>Utilisateur Supabase : {result.user ? 'CONNECTÉ' : 'NON CONNECTÉ'}</p>
          <p>Email : {result.email}</p>
          <p>ID : {result.id}</p>
          <p>Profil : {result.profile}</p>
          {result.profileError && <p>Erreur : {result.profileError}</p>}
        </>
      )}

      <button onClick={() => void check()} disabled={loading}>
        Actualiser
      </button>
    </main>
  );
}
