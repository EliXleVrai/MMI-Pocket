
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function UsernameForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const normalized = username.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
      setError('Pseudo de 3 à 20 caractères : lettres, chiffres et _ uniquement.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.replace('/login');
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        username: normalized,
        display_name: displayName.trim() || null,
      })
      .eq('id', user.id);

    if (updateError) {
      setError(
        updateError.code === '23505'
          ? 'Ce pseudo est déjà utilisé.'
          : 'Impossible d’enregistrer ton pseudo. Réessaie.'
      );
      setLoading(false);
      return;
    }

    router.replace('/');
    router.refresh();
  }

  return (
    <form className="username-form" onSubmit={submit}>
      <label htmlFor="username">Ton pseudo</label>
      <input
        id="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Ton pseudo"
        minLength={3}
        maxLength={20}
        required
      />

      <small
        style={{
          display: 'block',
          marginTop: '6px',
          marginBottom: '18px',
        }}
      >
        3 à 20 caractères, lettres, chiffres et _.
      </small>

      <label htmlFor="displayName">Nom affiché (facultatif)</label>
      <input
        id="displayName"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Ton nom affiché"
        maxLength={40}
      />

      {error && <p className="form-error">{error}</p>}

      <button
        className="button-primary username-submit"
        type="submit"
        disabled={loading}
      >
        {loading ? 'Enregistrement…' : 'Valider mon pseudo'}
      </button>
    </form>
  );
}
