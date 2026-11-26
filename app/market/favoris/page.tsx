
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function MarketFavoritesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: favorites, error } = await supabase
    .from('market_favorites')
    .select(`
      card_id,
      created_at,
      cards (
        id,
        name,
        image_url,
        rarity,
        card_number
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur chargement des favoris :', error);
  }

  const favoriteCards = (favorites ?? []).flatMap((favorite) => {
    const card = Array.isArray(favorite.cards)
      ? favorite.cards[0]
      : favorite.cards;

    if (!card) return [];

    return [card];
  });

  const cardIds = favoriteCards.map((card) => card.id);

  let listingRows: {
    card_id: string;
    unit_price: number;
    quantity: number;
  }[] = [];

  if (cardIds.length > 0) {
    const { data } = await supabase
      .from('market_listings')
      .select('card_id, unit_price, quantity')
      .in('card_id', cardIds)
      .eq('status', 'active');

    listingRows = data ?? [];
  }

  const rarityLabels: Record<string, string> = {
    common: 'Commune',
    uncommon: 'Peu commune',
    rare: 'Rare',
    epic: 'Épique',
    legendary: 'Légendaire',
  };

  return (
    <main className="page-container">
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '28px 0',
      }}>
        <a
          href="/market"
          style={{
            color: '#52745b',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          ← Retour au marché
        </a>

        <h1 style={{
          color: '#294735',
          fontSize: 32,
          marginTop: 24,
          marginBottom: 8,
        }}>
          ⭐ Mes favoris
        </h1>

        <p style={{
          color: '#829087',
          marginBottom: 28,
        }}>
          Retrouvez les cartes que tu souhaites surveiller.
        </p>

        {favoriteCards.length === 0 ? (
          <div style={{
            background: '#f1f6ef',
            border: '1px solid #e1ebdf',
            borderRadius: 18,
            padding: 35,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 42 }}>☆</div>
            <h2 style={{ color: '#355640' }}>
              Aucun favori pour le moment
            </h2>
            <p style={{ color: '#829087', marginTop: 8 }}>
              Ajoute des cartes à tes favoris depuis leur fiche sur le marché.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 18,
          }}>
            {favoriteCards.map((card) => {
              const cardListings = listingRows.filter(
                (listing) => listing.card_id === card.id
              );

              const lowestPrice = cardListings.length > 0
                ? Math.min(...cardListings.map((listing) => Number(listing.unit_price)))
                : null;

              return (
                <a
                  key={card.id}
                  href={`/market/carte/${card.id}`}
                  style={{
                    display: 'block',
                    textDecoration: 'none',
                    background: 'white',
                    border: '1px solid #e1ebdf',
                    borderRadius: 16,
                    padding: 12,
                    transition: 'transform 0.2s',
                  }}
                >
                  {card.image_url ? (
                    <img
                      src={card.image_url}
                      alt={card.name}
                      style={{
                        width: '100%',
                        aspectRatio: '3 / 4',
                        objectFit: 'contain',
                        borderRadius: 10,
                        background: '#f1f6ef',
                      }}
                    />
                  ) : (
                    <div style={{
                      aspectRatio: '3 / 4',
                      background: '#f1f6ef',
                      borderRadius: 10,
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 40,
                    }}>
                      🃏
                    </div>
                  )}

                  <h3 style={{
                    color: '#355640',
                    fontSize: 15,
                    marginTop: 12,
                  }}>
                    {card.name}
                  </h3>

                  <span style={{
                    display: 'inline-block',
                    color: '#719078',
                    fontSize: 11,
                    fontWeight: 800,
                    marginTop: 5,
                  }}>
                    {rarityLabels[card.rarity] ?? card.rarity}
                  </span>

                  <div style={{
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: '1px solid #edf2eb',
                  }}>
                    <strong style={{
                      color: '#355640',
                      fontSize: 14,
                    }}>
                      {lowestPrice !== null
                        ? `${lowestPrice.toLocaleString('fr-FR')} pièces`
                        : 'Aucune annonce'}
                    </strong>

                    <p style={{
                      color: '#829087',
                      fontSize: 11,
                      marginTop: 4,
                    }}>
                      {cardListings.length} annonce(s) disponible(s)
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
