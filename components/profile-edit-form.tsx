
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type ProfileEditFormProps = {
  initialUsername: string;
  initialDisplayName: string;
};

export function ProfileEditForm({
  initialUsername,
  initialDisplayName,
}: ProfileEditFormProps) {
  const router = useRouter();

  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setSuccess('');

    const normalized = username.trim().toLowerCase();
    const normalizedDisplayName = displayName.trim();

    if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
      setError(
        'Pseudo de 3 à 20 caractères : lettres, chiffres et _ uniquement.'
      );
      return;
    }

    if (normalizedDisplayName.length > 40) {
      setError('Le nom affiché ne peut pas dépasser 40 caractères.');
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace('/login');
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        username: normalized,
        display_name: normalizedDisplayName || null,
      })
      .eq('id', user.id);

    if (updateError) {
      setError(
        updateError.code === '23505'
          ? 'Ce pseudo est déjà utilisé.'
          : 'Impossible de modifier ton profil. Réessaie.'
      );
      setLoading(false);
      return;
    }

    setUsername(normalized);
    setSuccess('Ton profil a bien été mis à jour.');
    setLoading(false);

    router.refresh();
  }

  return (
    <form className="profile-edit-form" onSubmit={submit}>
      <div className="profile-edit-field">
        <label htmlFor="profile-username">Pseudo</label>
        <input
          id="profile-username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          minLength={3}
          maxLength={20}
          required
        />
        <small>
          3 à 20 caractères : lettres minuscules, chiffres et _.
        </small>
      </div>

      <div className="profile-edit-field">
        <label htmlFor="profile-display-name">Nom affiché</label>
        <input
          id="profile-display-name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          maxLength={40}
          placeholder="Ton nom affiché"
        />
      </div>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="profile-edit-success">{success}</p>}

      <button
        type="submit"
        className="button-primary"
        disabled={loading}
      >
        {loading ? 'Enregistrement…' : 'Enregistrer les modifications'}
      </button>
    </form>
  );
}
