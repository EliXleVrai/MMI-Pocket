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

export function PlayerManager() {
  const supabase = createClient();

  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadPlayers() {
    setLoading(true);
    setError('');

    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('id, username, display_name, role, created_at')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setPlayers((data ?? []) as Player[]);
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

      {loading && <p>Chargement des joueurs...</p>}

      {!loading && filteredPlayers.length === 0 && (
        <p>Aucun joueur trouvé.</p>
      )}

      <div className="admin-player-list">
        {filteredPlayers.map((player) => (
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
        ))}
      </div>
    </section>
  );
}
