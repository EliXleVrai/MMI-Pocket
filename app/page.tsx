
import {
  ArrowRight,
  Bolt,
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

const rarityLabels: Record<string, string> = {
  common: 'Commune',
  uncommon: 'Peu commune',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
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
  const featuredCards: {
    id: string;
    name: string;
    image_url: string | null;
    rarity: string;
    card_number: number | null;
    quantity?: number;
  }[] = [];

  if (user) {
    const [profileResult, walletResult, ownedResult, cardsResult, extensionsResult] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('username, display_name')
          .eq('id', user.id)
          .maybeSingle(),

        supabase
          .from('player_wallets')
          .select('*')
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
  }

  const progress =
    totalCards > 0
      ? Math.round((ownedUnique / totalCards) * 100)
      : 0;

  return (
    <main className="page-container home-dashboard">
      <header className="home-topbar">
        <div>
          <span className="home-kicker">MMI POCKET / ESPACE PERSONNEL</span>
          <h1>Salut {username} <span>✳</span></h1>
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
            <Link href={user ? '/boosters' : '/login'} className="home-primary-button">
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
            <strong>UNIVERS<br />MMI</strong>
            <small>CARTE À DÉCOUVRIR</small>
          </div>

          <span className="home-spark home-spark-one">✦</span>
          <span className="home-spark home-spark-two">✧</span>
        </div>
      </section>

      <section className="home-resource-grid">
        <article className="home-resource-card energy">
          <div className="home-resource-icon"><Bolt size={21} /></div>
          <div>
            <span>ÉNERGIE</span>
            <strong>{user ? `${energy} / ${maxEnergy}` : '—'}</strong>
            <small>Pour ouvrir tes boosters</small>
          </div>
          <div className="home-resource-progress">
            <span style={{ width: `${maxEnergy > 0 ? Math.min(100, (energy / maxEnergy) * 100) : 0}%` }} />
          </div>
        </article>

        <article className="home-resource-card money">
          <div className="home-resource-icon"><Coins size={21} /></div>
          <div>
            <span>PIÈCES</span>
            <strong>{user ? coins.toLocaleString('fr-FR') : '—'}</strong>
            <small>Ton portefeuille</small>
          </div>
          <Link href="/market" aria-label="Aller au marché"><ArrowRight size={18} /></Link>
        </article>

        <article className="home-resource-card cards">
          <div className="home-resource-icon"><BookOpen size={21} /></div>
          <div>
            <span>CARTES UNIQUES</span>
            <strong>{user ? `${ownedUnique} / ${totalCards}` : '—'}</strong>
            <small>{user ? `${totalCopies} exemplaires au total` : 'Connecte-toi pour commencer'}</small>
          </div>
          <Link href="/collection" aria-label="Voir la collection"><ArrowRight size={18} /></Link>
        </article>
      </section>

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
              <span>{user ? 'de la collection complétée' : 'Connecte-toi pour suivre ta progression'}</span>
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
            <span>{user ? `${ownedUnique} cartes obtenues` : 'MMI Pocket'}</span>
            <span>{user ? `${Math.max(0, totalCards - ownedUnique)} restantes` : `${activeExtensions} extensions`}</span>
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
            <span className="home-shortcut-icon"><Gift size={23} /></span>
            <span><strong>Ouvrir des boosters</strong><small>Découvre de nouvelles cartes</small></span>
            <ArrowRight size={18} />
          </Link>

          <Link href="/market" className="home-shortcut market">
            <span className="home-shortcut-icon"><ShoppingBag size={23} /></span>
            <span><strong>Marché des joueurs</strong><small>Acheter et vendre des cartes</small></span>
            <ArrowRight size={18} />
          </Link>

          <Link href="/extensions" className="home-shortcut extensions">
            <span className="home-shortcut-icon"><LayoutGrid size={23} /></span>
            <span><strong>Explorer les extensions</strong><small>Découvre les différentes séries</small></span>
            <ArrowRight size={18} />
          </Link>

          <Link href="/classement" className="home-shortcut ranking">
            <span className="home-shortcut-icon"><Trophy size={23} /></span>
            <span><strong>Classement</strong><small>Compare ta collection aux autres</small></span>
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
            <Link href="/login">Se connecter <ArrowRight size={15} /></Link>
          </div>
        ) : featuredCards.length === 0 ? (
          <div className="home-empty-cards">
            <Gift size={25} />
            <strong>Aucune carte disponible pour le moment</strong>
            <p>Les cartes apparaîtront ici dès que l&apos;extension sera publiée.</p>
          </div>
        ) : (
          <div className="home-featured-grid">
            {featuredCards.map((card) => {
              return (
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
                    <span>{rarityLabels[card.rarity] ?? card.rarity}</span>
                    <strong>{card.name}</strong>
                    <small>Carte #{card.card_number ?? '—'}</small>
                  </div>
                </Link>
              );
            })}
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
