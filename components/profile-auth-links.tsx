
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Chrome, MessageCircle, CheckCircle2 } from 'lucide-react';

type Provider = 'google' | 'discord';

export function ProfileAuthLinks({
  initialProviders,
}: {
  initialProviders: string[];
}) {
  const [providers, setProviders] = useState(initialProviders);
  const [loading, setLoading] = useState<Provider | null>(null);
  const [error, setError] = useState('');

  async function linkProvider(provider: Provider) {
    setLoading(provider);
    setError('');

    try {
      const supabase = createClient();

      const { data, error: linkError } =
        await supabase.auth.linkIdentity({
          provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });

      if (linkError) throw linkError;

      if (!data.url) {
        throw new Error('Impossible de lancer la liaison.');
      }

      window.location.assign(data.url);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Une erreur est survenue pendant la liaison.'
      );
      setLoading(null);
    }
  }

  return (
    <div className="profile-auth-links">
      <p className="profile-auth-description">
        Connecte plusieurs méthodes de connexion à ton compte MMI Pocket.
        Tu conserveras ainsi la même collection et la même progression.
      </p>

      <div className="profile-auth-provider">
        <div className="profile-auth-provider-info">
          <Chrome size={21} />
          <div>
            <strong>Google</strong>
            <small>
              {providers.includes('google')
                ? 'Compte connecté'
                : 'Aucun compte connecté'}
            </small>
          </div>
        </div>

        {providers.includes('google') ? (
          <span className="profile-auth-connected">
            <CheckCircle2 size={16} />
            Connecté
          </span>
        ) : (
          <button
            type="button"
            className="button-primary profile-auth-button"
            disabled={loading !== null}
            onClick={() => linkProvider('google')}
          >
            {loading === 'google' ? 'Redirection…' : 'Lier Google'}
          </button>
        )}
      </div>

      <div className="profile-auth-provider">
        <div className="profile-auth-provider-info">
          <MessageCircle size={21} />
          <div>
            <strong>Discord</strong>
            <small>
              {providers.includes('discord')
                ? 'Compte connecté'
                : 'Aucun compte connecté'}
            </small>
          </div>
        </div>

        {providers.includes('discord') ? (
          <span className="profile-auth-connected">
            <CheckCircle2 size={16} />
            Connecté
          </span>
        ) : (
          <button
            type="button"
            className="button-primary profile-auth-button"
            disabled={loading !== null}
            onClick={() => linkProvider('discord')}
          >
            {loading === 'discord' ? 'Redirection…' : 'Lier Discord'}
          </button>
        )}
      </div>

      {error && (
        <p className="form-error">{error}</p>
      )}
    </div>
  );
}
