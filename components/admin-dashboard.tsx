
import { createClient } from '@/lib/supabase/server';

type RecentCard = {
  id: string;
  name: string;
  rarity: string;
  created_at: string;
};

type RecentPlayer = {
  id: string;
  username: string | null;
  created_at: string;
};

export async function AdminDashboard() {
  const supabase = await createClient();

  const [
    playersResult,
    adminsResult,
    cardsResult,
    activeCardsResult,
    boostersResult,
    extensionsResult,
    recentCardsResult,
    recentPlayersResult,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
    supabase.from('cards').select('*', { count: 'exact', head: true }),
    supabase.from('cards').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('boosters').select('*', { count: 'exact', head: true }),
    supabase.from('extensions').select('*', { count: 'exact', head: true }),
    supabase.from('cards')
      .select('id, name, rarity, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('profiles')
      .select('id, username, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const stats = [
    {
      label: 'Joueurs',
      value: playersResult.count ?? 0,
      icon: '👥',
      detail: `${adminsResult.count ?? 0} administrateur(s)`,
    },
    {
      label: 'Cartes',
      value: cardsResult.count ?? 0,
      icon: '🃏',
      detail: `${activeCardsResult.count ?? 0} carte(s) active(s)`,
    },
    {
      label: 'Boosters',
      value: boostersResult.count ?? 0,
      icon: '🎁',
      detail: 'Boosters configurés',
    },
    {
      label: 'Extensions',
      value: extensionsResult.count ?? 0,
      icon: '📚',
      detail: 'Extensions créées',
    },
  ];

  const recentCards = (recentCardsResult.data ?? []) as RecentCard[];
  const recentPlayers = (recentPlayersResult.data ?? []) as RecentPlayer[];

  const rarityLabels: Record<string, string> = {
    common: 'Commune',
    uncommon: 'Peu commune',
    rare: 'Rare',
    epic: 'Épique',
    legendary: 'Légendaire',
  };

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-heading">
        <div>
          <h2>Vue d&apos;ensemble</h2>
          <p>Les statistiques globales de MMI Pocket.</p>
        </div>
        <span className="admin-live-indicator">
          ● Données en direct
        </span>
      </div>

      <div className="admin-stats-grid">
        {stats.map((stat) => (
          <article className="admin-stat-card" key={stat.label}>
            <div className="admin-stat-top">
              <span>{stat.label}</span>
              <span className="admin-stat-icon">{stat.icon}</span>
            </div>
            <strong>{stat.value.toLocaleString('fr-FR')}</strong>
            <p>{stat.detail}</p>
          </article>
        ))}
      </div>

      <div className="admin-dashboard-columns">
        <section className="admin-activity-card">
          <h3>Dernières cartes</h3>
          {recentCards.length === 0 ? (
            <p>Aucune carte créée.</p>
          ) : (
            recentCards.map((card) => (
              <div className="admin-activity-item" key={card.id}>
                <div>
                  <strong>{card.name}</strong>
                  <span>{rarityLabels[card.rarity] ?? card.rarity}</span>
                </div>
                <time>{formatDate(card.created_at)}</time>
              </div>
            ))
          )}
        </section>

        <section className="admin-activity-card">
          <h3>Dernières inscriptions</h3>
          {recentPlayers.length === 0 ? (
            <p>Aucun joueur inscrit.</p>
          ) : (
            recentPlayers.map((player) => (
              <div className="admin-activity-item" key={player.id}>
                <div>
                  <strong>
                    @{player.username || 'Sans pseudo'}
                  </strong>
                  <span>Nouveau joueur</span>
                </div>
                <time>{formatDate(player.created_at)}</time>
              </div>
            ))
          )}
        </section>
      </div>
    </section>
  );
}
