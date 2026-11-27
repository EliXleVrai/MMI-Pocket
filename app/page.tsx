
import {
  ArrowRight,
  BookOpen,
  Coins,
  Gift,
  LayoutGrid,
  ShoppingBag,
  Sparkles,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { HomeEnergyDisplay } from '@/components/home-energy-display';
import { HomeDailyShop } from '@/components/home-daily-shop';

const rarityLabels: Record<string, string> = {
  common: 'Commune',
  uncommon: 'Peu commune',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
};

type FeaturedCard = {
  id: string;
  name: string;
  image_url: string | null;
  rarity: string;
  card_number: number | null;
  quantity?: number;
};

type RecentOpening = {
  id: string;
  opened_at: string;
  energy_spent: number;
  boosterName: string;
  cards: string[];
};

type RecentMarketTransaction = {
  id: string;
  sold_at: string;
  kind: 'purchase' | 'sale';
  cardName: string;
  quantity: number;
  total_amount: number;
  seller_earnings: number;
};

type RecentActivity = {
  id: string;
  date: string;
  kind: 'booster' | 'purchase' | 'sale';
  title: string;
  description: string;
  detail?: string;
};

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let username = 'Joueur';
  let energy = 0;
  let maxEnergy = 20;
  let coins = 0;
  let ownedUnique = 0;
  let totalCopies = 0;
  let totalCards = 0;
  let activeExtensions = 0;

  let featuredCards: FeaturedCard[] = [];
  let recentOpenings: RecentOpening[] = [];
  let recentMarketTransactions: RecentMarketTransaction[] = [];
  let recentActivity: RecentActivity[] = [];

  if (user) {
    const [
      profileResult,
      walletResult,
      ownedResult,
      cardsResult,
      extensionsResult,
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', user.id)
        .maybeSingle(),

      supabase
        .from('player_wallets')
        .select('energy, max_energy, coins')
        .eq('user_id', user.id)
        .maybeSingle(),

      supabase
        .from('player_cards')
        .select('card_id, quantity')
        .eq('user_id', user.id)
        .gt('quantity', 0),

      supabase
        .from('cards')
        .select('id, name, image_url, rarity, card_number')
        .eq('is_active', true)
        .order('card_number', { ascending: true }),

      supabase
        .from('extensions')
        .select('id')
        .eq('is_active', true),
    ]);

    username =
      profileResult.data?.display_name ||
      profileResult.data?.username ||
      user.email?.split('@')[0] ||
      'Joueur';

    energy = walletResult.data?.energy ?? 0;
    maxEnergy = walletResult.data?.max_energy ?? 20;
    coins = walletResult.data?.coins ?? 0;

    const owned = ownedResult.data ?? [];

    ownedUnique = owned.length;

    totalCopies = owned.reduce(
      (sum, card) => sum + (card.quantity ?? 0),
      0
    );

    const cards = cardsResult.data ?? [];

    totalCards = cards.length;
    activeExtensions = extensionsResult.data?.length ?? 0;

    const ownedIds = new Set(owned.map((card) => card.card_id));

    featuredCards = cards
      .filter((card) => ownedIds.has(card.id))
      .slice(0, 3);

    if (featuredCards.length < 3) {
      const missing = cards
        .filter((card) => !ownedIds.has(card.id))
        .slice(0, 3 - featuredCards.length);

      featuredCards = [...featuredCards, ...missing];
    }

    // ACTIVITÉ RÉCENTE : boosters et marché en parallèle

    const [openingsResult, marketSalesResult] = await Promise.all([
      supabase
        .from('booster_openings')
        .select('id, booster_id, energy_spent, opened_at')
        .eq('user_id', user.id)
        .order('opened_at', { ascending: false })
        .limit(5),

      supabase
        .from('market_sales')
        .select(
          'id, buyer_id, seller_id, card_id, quantity, total_amount, seller_earnings, sold_at'
        )
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('sold_at', { ascending: false })
        .limit(10),
    ]);

    const openings = openingsResult.data ?? [];
    const marketSales = marketSalesResult.data ?? [];

    // Récupération des boosters et des cartes obtenues

    const openingIds = openings.map((opening) => opening.id);

    const boosterIds = [
      ...new Set(openings.map((opening) => opening.booster_id)),
    ];

    const [boostersResult, openingCardsResult] = await Promise.all([
      boosterIds.length > 0
        ? supabase
            .from('boosters')
            .select('id, name')
            .in('id', boosterIds)
        : Promise.resolve({ data: [] }),

      openingIds.length > 0
        ? supabase
            .from('booster_opening_cards')
            .select('opening_id, card_id')
            .in('opening_id', openingIds)
        : Promise.resolve({ data: [] }),
    ]);

    const openingCards = openingCardsResult.data ?? [];

    // Un seul chargement pour les cartes des boosters et du marché

    const allCardIds = [
      ...new Set([
        ...openingCards.map((item) => item.card_id),
        ...marketSales.map((sale) => sale.card_id),
      ]),
    ];

    const { data: activityCards } =
      allCardIds.length > 0
        ? await supabase
            .from('cards')
            .select('id, name')
            .in('id', allCardIds)
        : { data: [] };

    const boosterNames = new Map(
      (boostersResult.data ?? []).map((booster) => [
        booster.id,
        booster.name,
      ])
    );

    const cardNames = new Map(
      (activityCards ?? []).map((card) => [card.id, card.name])
    );

    // Reconstruction de l'historique des boosters

    recentOpenings = openings.map((opening) => ({
      id: opening.id,
      opened_at: opening.opened_at,
      energy_spent: opening.energy_spent,
      boosterName:
        boosterNames.get(opening.booster_id) ?? 'Booster',
      cards: openingCards
        .filter((item) => item.opening_id === opening.id)
        .map((item) => cardNames.get(item.card_id) ?? 'Carte inconnue'),
    }));

    // Reconstruction de l'historique du marché

    recentMarketTransactions = marketSales.map((sale) => ({
      id: sale.id,
      sold_at: sale.sold_at,
      kind: sale.buyer_id === user.id ? 'purchase' : 'sale',
      cardName: cardNames.get(sale.card_id) ?? 'Carte inconnue',
      quantity: sale.quantity,
      total_amount: sale.total_amount,
      seller_earnings: sale.seller_earnings,
    }));

    // Fusion des activités et tri chronologique

    recentActivity = [
      ...recentOpenings.map((opening) => ({
        id: `booster-${opening.id}`,
        date: opening.opened_at,
        kind: 'booster' as const,
        title: `Booster ouvert : ${opening.boosterName}`,
        description: `${opening.cards.length} carte${
          opening.cards.length > 1 ? 's' : ''
        } obtenue${opening.cards.length > 1 ? 's' : ''} · ${
          opening.energy_spent
        } énergie dépensée`,
        detail: opening.cards.join(' · '),
      })),

      ...recentMarketTransactions.map((transaction) => ({
        id: `market-${transaction.id}`,
        date: transaction.sold_at,
        kind: transaction.kind,
        title:
          transaction.kind === 'purchase'
            ? `Carte achetée : ${transaction.cardName}`
            : `Carte vendue : ${transaction.cardName}`,
        description:
          transaction.kind === 'purchase'
            ? `${transaction.quantity} exemplaire${
                transaction.quantity > 1 ? 's' : ''
              } · ${Number(transaction.total_amount).toLocaleString(
                'fr-FR'
              )} pièces dépensées`
            : `${transaction.quantity} exemplaire${
                transaction.quantity > 1 ? 's' : ''
              } · ${Number(transaction.seller_earnings).toLocaleString(
                'fr-FR'
              )} pièces reçues`,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      .slice(0, 5);
  }

  const progress =
    totalCards > 0
      ? Math.round((ownedUnique / totalCards) * 100)
      : 0;

  return (
    <main className="page-container home-dashboard">
      <header className="home-topbar">
        <div>
          <span className="home-kicker">
            MMI POCKET / ESPACE PERSONNEL
          </span>
          <h1>
            Salut {username} <span>✳</span>
          </h1>
          <p>Prêt à faire grandir ta collection ?</p>
        </div>

        {user ? (
          <Link href="/profil" className="home-profile-link">
            Mon profil <ArrowRight size={16} />
          </Link>
        ) : (
          <Link href="/login" className="home-profile-link">
            Se connecter <ArrowRight size={16} />
          </Link>
        )}
      </header>

      <section className="home-hero">
        <div className="home-hero-content">
          <span className="home-hero-tag">
            <Sparkles size={14} /> TON UNIVERS MMI
          </span>

          <h2>
            Chaque carte
            <br />
            raconte une <span>histoire.</span>
          </h2>

          <p>
            Collectionne les moments, les personnalités et les souvenirs
            de la promo MMI 2026–2029.
          </p>

          <div className="home-hero-actions">
            <Link
              href={user ? '/boosters' : '/login'}
              className="home-primary-button"
            >
              <Gift size={17} /> Ouvrir un booster
              <ArrowRight size={16} />
            </Link>

            <Link href="/collection" className="home-secondary-button">
              <BookOpen size={17} /> Ma collection
            </Link>
          </div>
        </div>

        <div className="home-hero-visual">
          <div className="home-orbit home-orbit-one" />
          <div className="home-orbit home-orbit-two" />

          <div className="home-floating-card home-floating-back">
            <span>MMI POCKET</span>
            <strong>✦</strong>
            <small>COLLECTION</small>
          </div>

          <div className="home-floating-card home-floating-front">
            <span>ÉDITION 2026–2029</span>
            <div className="home-card-symbol">✳</div>
            <strong>
              UNIVERS
              <br />
              MMI
            </strong>
            <small>CARTE À DÉCOUVRIR</small>
          </div>

          <span className="home-spark home-spark-one">✦</span>
          <span className="home-spark home-spark-two">✧</span>
        </div>
      </section>

      <section className="home-resource-grid">
        {user ? (
          <HomeEnergyDisplay
            initialEnergy={energy}
            initialMaxEnergy={maxEnergy}
          />
        ) : (
          <article className="home-resource-card energy">
            <div className="home-resource-icon">
              <span>⚡</span>
            </div>
            <div>
              <span>ÉNERGIE</span>
              <strong>—</strong>
              <small>Connecte-toi pour commencer</small>
            </div>
            <div className="home-resource-progress">
              <span style={{ width: '0%' }} />
            </div>
          </article>
        )}

        <article className="home-resource-card money">
          <div className="home-resource-icon">
            <Coins size={21} />
          </div>
          <div>
            <span>PIÈCES</span>
            <strong>
              {user ? coins.toLocaleString('fr-FR') : '—'}
            </strong>
            <small>Ton portefeuille</small>
          </div>
          <Link href="/market" aria-label="Aller au marché">
            <ArrowRight size={18} />
          </Link>
        </article>

        <article className="home-resource-card cards">
          <div className="home-resource-icon">
            <BookOpen size={21} />
          </div>
          <div>
            <span>CARTES UNIQUES</span>
            <strong>
              {user ? `${ownedUnique} / ${totalCards}` : '—'}
            </strong>
            <small>
              {user
                ? `${totalCopies} exemplaires au total`
                : 'Connecte-toi pour commencer'}
            </small>
          </div>
          <Link href="/collection" aria-label="Voir la collection">
            <ArrowRight size={18} />
          </Link>
        </article>
      </section>
      
      {user && (
        <HomeDailyShop
          initialCoins={coins}
          initialEnergy={energy}
          initialMaxEnergy={maxEnergy}
        />
      )}
      
      <section className="home-progress-section">
        <div className="home-section-heading">
          <div>
            <span className="home-kicker">TA COLLECTION</span>
            <h2>Ta progression</h2>
          </div>
          <Link href="/collection" className="home-text-link">
            Voir l&apos;album <ArrowRight size={15} />
          </Link>
        </div>

        <div className="home-progress-card">
          <div className="home-progress-copy">
            <div>
              <strong>{user ? `${progress}%` : 'Bienvenue !'}</strong>
              <span>
                {user
                  ? 'de la collection complétée'
                  : 'Connecte-toi pour suivre ta progression'}
              </span>
            </div>
            <p>
              {user
                ? `${ownedUnique} cartes différentes découvertes sur ${totalCards}. Continue tes ouvertures !`
                : 'Ouvre des boosters, découvre les cartes et complète ton album.'}
            </p>
          </div>

          <div className="home-progress-track">
            <span style={{ width: `${user ? progress : 0}%` }} />
          </div>

          <div className="home-progress-footer">
            <span>
              {user ? `${ownedUnique} cartes obtenues` : 'MMI Pocket'}
            </span>
            <span>
              {user
                ? `${Math.max(0, totalCards - ownedUnique)} restantes`
                : `${activeExtensions} extensions`}
            </span>
          </div>
        </div>
      </section>

      <section className="home-shortcuts-section">
        <div className="home-section-heading">
          <div>
            <span className="home-kicker">À TOI DE JOUER</span>
            <h2>Que veux-tu faire ?</h2>
          </div>
        </div>

        <div className="home-shortcuts-grid">
          <Link href="/boosters" className="home-shortcut booster">
            <span className="home-shortcut-icon">
              <Gift size={23} />
            </span>
            <span>
              <strong>Ouvrir des boosters</strong>
              <small>Découvre de nouvelles cartes</small>
            </span>
            <ArrowRight size={18} />
          </Link>

          <Link href="/market" className="home-shortcut market">
            <span className="home-shortcut-icon">
              <ShoppingBag size={23} />
            </span>
            <span>
              <strong>Marché des joueurs</strong>
              <small>Acheter et vendre des cartes</small>
            </span>
            <ArrowRight size={18} />
          </Link>

          <Link href="/extensions" className="home-shortcut extensions">
            <span className="home-shortcut-icon">
              <LayoutGrid size={23} />
            </span>
            <span>
              <strong>Explorer les extensions</strong>
              <small>Découvre les différentes séries</small>
            </span>
            <ArrowRight size={18} />
          </Link>

          <Link href="/classement" className="home-shortcut ranking">
            <span className="home-shortcut-icon">
              <Trophy size={23} />
            </span>
            <span>
              <strong>Classement</strong>
              <small>Compare ta collection aux autres</small>
            </span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section className="home-cards-section">
        <div className="home-section-heading">
          <div>
            <span className="home-kicker">TON ALBUM</span>
            <h2>Quelques cartes</h2>
          </div>
          <Link href="/collection" className="home-text-link">
            Toute la collection <ArrowRight size={15} />
          </Link>
        </div>

        {!user ? (
          <div className="home-empty-cards">
            <Sparkles size={25} />
            <strong>Ta collection t&apos;attend</strong>
            <p>Connecte-toi pour découvrir tes cartes.</p>
            <Link href="/login">
              Se connecter <ArrowRight size={15} />
            </Link>
          </div>
        ) : featuredCards.length === 0 ? (
          <div className="home-empty-cards">
            <Gift size={25} />
            <strong>Aucune carte disponible pour le moment</strong>
            <p>
              Les cartes apparaîtront ici dès que l&apos;extension sera publiée.
            </p>
          </div>
        ) : (
          <div className="home-featured-grid">
            {featuredCards.map((card) => (
              <Link
                href="/collection"
                className={`home-featured-card rarity-${card.rarity}`}
                key={card.id}
              >
                <div className="home-featured-image">
                  {card.image_url ? (
                    <img src={card.image_url} alt={card.name} />
                  ) : (
                    <span>✦</span>
                  )}
                </div>
                <div className="home-featured-info">
                  <span>
                    {rarityLabels[card.rarity] ?? card.rarity}
                  </span>
                  <strong>{card.name}</strong>
                  <small>Carte #{card.card_number ?? '—'}</small>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="home-activity-section">
        <div className="home-section-heading">
          <div>
            <span className="home-kicker">TON HISTORIQUE</span>
            <h2>Activité récente</h2>
          </div>
          <span className="home-activity-count">
            {recentActivity.length} activité
            {recentActivity.length > 1 ? 's' : ''}
          </span>
        </div>

        {!user ? (
          <div className="home-activity-empty">
            Connecte-toi pour retrouver ton activité.
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="home-activity-empty">
            <Gift size={22} />
            <strong>Pas encore d&apos;activité</strong>
            <span>
              Ouvre ton premier booster ou fais un échange au marché pour
              commencer ton historique !
            </span>
            <Link href="/boosters">
              Découvrir les boosters <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <div className="home-activity-list">
            {recentActivity.map((activity) => (
              <article
                className="home-activity-item"
                key={activity.id}
              >
                <div className="home-activity-icon">
                  {activity.kind === 'booster' ? (
                    <Gift size={20} />
                  ) : activity.kind === 'purchase' ? (
                    <ShoppingBag size={20} />
                  ) : (
                    <Coins size={20} />
                  )}
                </div>

                <div className="home-activity-content">
                  <strong>{activity.title}</strong>
                  <span>{activity.description}</span>
                  {activity.detail && (
                    <small>{activity.detail}</small>
                  )}
                </div>

                <time dateTime={activity.date}>
                  {new Date(activity.date).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="home-footer">
        <strong>MMI POCKET</strong>
        <span>Fait avec ♥ pour la promo MMI 2026–2029</span>
        <span>{activeExtensions} extensions disponibles</span>
      </footer>
    </main>
  );
}
