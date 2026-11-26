
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  Trophy,
  Medal,
  Crown,
  Coins,
  Layers,
  Sparkles,
  User,
} from 'lucide-react';

type LeaderboardPlayer = {
  user_id: string;
  username: string;
  display_name: string | null;
  unique_cards: number;
  total_cards: number;
  coins: number;
};

function formatNumber(value: number) {
  return Number(value ?? 0).toLocaleString('fr-FR');
}

export default async function RankingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  if (!profile?.username) redirect('/choisir-pseudo');

  const { data, error } = await supabase.rpc(
    'get_player_leaderboard'
  );

  if (error) {
    console.error('Erreur classement :', error);
  }

  const players = (data ?? []) as LeaderboardPlayer[];

  const currentPlayerIndex = players.findIndex(
    (player) => player.user_id === user.id
  );

  const currentPlayer =
    currentPlayerIndex >= 0 ? players[currentPlayerIndex] : null;

  const topThree = players.slice(0, 3);
  const otherPlayers = players.slice(3);

  return (
    <main className="page-container ranking-page">
      <header className="ranking-header">
        <div>
          <span className="ranking-eyebrow">
            <Sparkles size={14} /> MMI POCKET
          </span>
          <h1>Classement <span>des joueurs</span></h1>
          <p className="page-description">
            Découvre les meilleurs collectionneurs et mesure ta progression
            face aux autres joueurs.
          </p>
        </div>

        <div className="ranking-total">
          <Trophy size={22} />
          <strong>{players.length}</strong>
          <span>joueurs classés</span>
        </div>
      </header>

      {error ? (
        <section className="ranking-empty">
          <Trophy size={30} />
          <h2>Impossible de charger le classement</h2>
          <p>Une erreur est survenue lors de la récupération des joueurs.</p>
        </section>
      ) : players.length === 0 ? (
        <section className="ranking-empty">
          <Trophy size={30} />
          <h2>Le classement est vide</h2>
          <p>Sois le premier à commencer ta collection !</p>
        </section>
      ) : (
        <>
          <section className="ranking-podium-section">
            <div className="ranking-section-heading">
              <div>
                <span>LES MEILLEURS COLLECTIONNEURS</span>
                <h2>Le podium</h2>
              </div>
              <Trophy size={23} />
            </div>

            <div className="ranking-podium">
              {topThree[1] && (
                <article className="podium-player podium-second">
                  <div className="podium-avatar">
                    <Medal size={25} />
                  </div>
                  <span className="podium-position">2e PLACE</span>
                  <strong>
                    {topThree[1].display_name || topThree[1].username}
                  </strong>
                  <small>@{topThree[1].username}</small>
                  <div className="podium-score">
                    <Layers size={15} />
                    {formatNumber(topThree[1].unique_cards)} cartes
                  </div>
                  <div className="podium-base">
                    <span>2</span>
                  </div>
                </article>
              )}

              {topThree[0] && (
                <article className="podium-player podium-first">
                  <div className="podium-crown">
                    <Crown size={24} />
                  </div>
                  <div className="podium-avatar">
                    <Trophy size={28} />
                  </div>
                  <span className="podium-position">1re PLACE</span>
                  <strong>
                    {topThree[0].display_name || topThree[0].username}
                  </strong>
                  <small>@{topThree[0].username}</small>
                  <div className="podium-score">
                    <Layers size={15} />
                    {formatNumber(topThree[0].unique_cards)} cartes
                  </div>
                  <div className="podium-base">
                    <span>1</span>
                  </div>
                </article>
              )}

              {topThree[2] && (
                <article className="podium-player podium-third">
                  <div className="podium-avatar">
                    <Medal size={25} />
                  </div>
                  <span className="podium-position">3e PLACE</span>
                  <strong>
                    {topThree[2].display_name || topThree[2].username}
                  </strong>
                  <small>@{topThree[2].username}</small>
                  <div className="podium-score">
                    <Layers size={15} />
                    {formatNumber(topThree[2].unique_cards)} cartes
                  </div>
                  <div className="podium-base">
                    <span>3</span>
                  </div>
                </article>
              )}
            </div>
          </section>

          <section className="ranking-table-section">
            <div className="ranking-section-heading">
              <div>
                <span>TOUS LES JOUEURS</span>
                <h2>Classement général</h2>
              </div>
              <span className="ranking-count">
                {players.length} joueurs
              </span>
            </div>

            <div className="ranking-table">
              <div className="ranking-table-head">
                <span>POSITION</span>
                <span>JOUEUR</span>
                <span>CARTES UNIQUES</span>
                <span>EXEMPLAIRES</span>
                <span>PIÈCES</span>
              </div>

              {players.map((player, index) => {
                const isCurrentPlayer = player.user_id === user.id;

                return (
                  <div
                    className={`ranking-row ${
                      isCurrentPlayer ? 'ranking-current-player' : ''
                    }`}
                    key={player.user_id}
                  >
                    <div className="ranking-rank">
                      {index === 0 ? (
                        <Crown size={19} />
                      ) : index === 1 ? (
                        <Medal size={19} />
                      ) : index === 2 ? (
                        <Medal size={19} />
                      ) : (
                        `#${index + 1}`
                      )}
                    </div>

                    <div className="ranking-player">
                      <div className="ranking-player-avatar">
                        {(player.display_name || player.username)
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div>
                        <strong>
                          {player.display_name || player.username}
                          {isCurrentPlayer && (
                            <span className="ranking-you">TOI</span>
                          )}
                        </strong>
                        <small>@{player.username}</small>
                      </div>
                    </div>

                    <strong className="ranking-stat">
                      {formatNumber(player.unique_cards)}
                    </strong>

                    <span className="ranking-stat">
                      {formatNumber(player.total_cards)}
                    </span>

                    <span className="ranking-stat ranking-coins">
                      <Coins size={14} />
                      {formatNumber(player.coins)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {currentPlayer && (
            <section className="ranking-my-position">
              <div className="ranking-my-icon">
                <User size={22} />
              </div>
              <div className="ranking-my-info">
                <span>TA POSITION</span>
                <strong>
                  {currentPlayer.display_name || currentPlayer.username}
                </strong>
                <small>
                  {formatNumber(currentPlayer.unique_cards)} cartes uniques
                  · {formatNumber(currentPlayer.total_cards)} exemplaires
                </small>
              </div>
              <div className="ranking-my-rank">
                <span>RANG</span>
                <strong>#{currentPlayerIndex + 1}</strong>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
