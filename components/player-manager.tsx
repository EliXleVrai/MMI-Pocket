
'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Player = {
  id: string;
  username: string | null;
  display_name: string | null;
  role: string;
  created_at: string;
};

type AuthProvider = {
  user_id: string;
  provider: string;
  email: string | null;
};

type PlayerProviders = {
  google?: string | null;
  discord?: string | null;
};

export function PlayerManager() {
  const supabase = createClient();

  const [players, setPlayers] = useState<Player[]>([]);
  const [providers, setProviders] = useState<Record<string, PlayerProviders>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [providerError, setProviderError] = useState('');

  async function loadPlayers() {
    setLoading(true);
    setError('');
    setProviderError('');

    const [playersResult, providersResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, display_name, role, created_at')
        .order('created_at', { ascending: false }),

      supabase.rpc('admin_list_player_auth_providers'),
    ]);

    if (playersResult.error) {
      setError(playersResult.error.message);
      setLoading(false);
      return;
    }

    if (providersResult.error) {
      setProviderError(providersResult.error.message);
    }

    const providerMap: Record<string, PlayerProviders> = {};

    if (!providersResult.error) {
      const authProviders = (providersResult.data ?? []) as AuthProvider[];

      authProviders.forEach((item) => {
        if (!providerMap[item.user_id]) {
          providerMap[item.user_id] = {};
        }

        if (item.provider === 'google') {
          providerMap[item.user_id].google = item.email;
        }

        if (item.provider === 'discord') {
          providerMap[item.user_id].discord = item.email;
        }
      });
    }

    setPlayers((playersResult.data ?? []) as Player[]);
    setProviders(providerMap);
    setLoading(false);
  }

  useEffect(() => {
    loadPlayers();
  }, []);

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return players;

    return players.filter((player) =>
      [
        player.username ?? '',
        player.display_name ?? '',
      ].some((value) => value.toLowerCase().includes(query))
    );
  }, [players, search]);

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  function ProviderStatus({
    provider,
    email,
  }: {
    provider: 'google' | 'discord';
    email?: string | null;
  }) {
    const connected = email !== undefined;

    return (
      <div
        className={`admin-provider-status ${
          connected ? 'is-connected' : 'is-disconnected'
        }`}
      >
        <span className="admin-provider-dot" />

        <div>
          <strong>
            {provider === 'google' ? 'Google' : 'Discord'}
          </strong>

          <span>
            {connected
              ? email || 'Compte connecté'
              : 'Non connecté'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <section className="admin-manager">
      <div className="admin-section-heading">
        <div>
          <h2>Joueurs</h2>
          <p>Consulte les comptes inscrits sur MMI Pocket.</p>
        </div>

        <span>{players.length} joueur(s)</span>
      </div>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Rechercher un pseudo..."
        aria-label="Rechercher un joueur"
      />

      {error && <p className="form-error">{error}</p>}

      {providerError && (
        <p className="form-error">
          Impossible de récupérer les comptes Google et Discord :
          {' '}{providerError}
        </p>
      )}

      {loading && <p>Chargement des joueurs...</p>}

      {!loading && filteredPlayers.length === 0 && (
        <p>Aucun joueur trouvé.</p>
      )}

      <div className="admin-player-list">
        {filteredPlayers.map((player) => {
          const playerProviders = providers[player.id] ?? {};

          return (
            <article className="admin-player-item" key={player.id}>
              <div className="admin-player-avatar">
                {(player.username ?? '?').charAt(0).toUpperCase()}
              </div>

              <div className="admin-player-info">
                <strong>
                  {player.display_name || player.username || 'Sans pseudo'}
                </strong>

                <span>
                  @{player.username || 'non défini'}
                </span>

                <span>
                  Inscrit le {formatDate(player.created_at)}
                </span>

                <div className="admin-player-providers">
                  <ProviderStatus
                    provider="google"
                    email={playerProviders.google}
                  />

                  <ProviderStatus
                    provider="discord"
                    email={playerProviders.discord}
                  />
                </div>
              </div>

              <span
                className={
                  player.role === 'admin'
                    ? 'admin-player-role is-admin'
                    : 'admin-player-role'
                }
              >
                {player.role === 'admin' ? 'Administrateur' : 'Joueur'}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
