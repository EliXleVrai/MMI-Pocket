
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { MarketPriceChart } from '@/components/market-price-chart';

const rarityLabels: Record<string, string> = {
  common: 'Commune',
  uncommon: 'Peu commune',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function MarketCardPage({ params }: Props) {
  const { id } = await params;
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

  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select(`
      id,
      name,
      description,
      image_url,
      rarity,
      card_number,
      extension_id
    `)
    .eq('id', id)
    .single();

  if (cardError || !card) notFound();

  const { data: extension } = await supabase
    .from('extensions')
    .select('name, cover_url')
    .eq('id', card.extension_id)
    .single();

  const { data: listingRows } = await supabase
    .from('market_listings')
    .select(`
      id,
      seller_id,
      quantity,
      unit_price,
      created_at
    `)
    .eq('card_id', id)
    .eq('status', 'active')
    .order('unit_price', { ascending: true });

  const listings = listingRows ?? [];
  const sellerIds = [...new Set(listings.map((item) => item.seller_id))];

  let sellers: { id: string; username: string }[] = [];

  if (sellerIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', sellerIds);

    sellers = data ?? [];
  }

  const { data: history } = await supabase
    .from('market_card_daily_prices')
    .select(`
      card_id,
      sale_date,
      average_price,
      quantity_sold,
      sales_count
    `)
    .eq('card_id', id)
    .order('sale_date', { ascending: true });

  const lowestPrice = listings.length
    ? Math.min(...listings.map((item) => Number(item.unit_price)))
    : null;

  return (
    <main className="page-container">
      <div style={{
        maxWidth: 1050,
        margin: '0 auto',
        padding: '24px 0',
      }}>
        <a
          href="/market"
          style={{
            display: 'inline-block',
            marginBottom: 24,
            color: '#52745b',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          ← Retour au marché
        </a>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 320px) minmax(0, 1fr)',
          gap: 28,
          alignItems: 'start',
        }}>
          <div style={{
            background: '#f1f6ef',
            border: '1px solid #e1ebdf',
            borderRadius: 20,
            padding: 16,
            textAlign: 'center',
          }}>
            {card.image_url ? (
              <img
                src={card.image_url}
                alt={card.name}
                style={{
                  width: '100%',
                  maxWidth: 280,
                  borderRadius: 14,
                  objectFit: 'contain',
                }}
              />
            ) : (
              <div style={{ padding: 80 }}>🃏</div>
            )}
          </div>

          <div>
            <span style={{
              color: '#719078',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 2,
            }}>
              FICHE CARTE
            </span>

            <h1 style={{
              fontSize: 32,
              color: '#294735',
              margin: '8px 0',
            }}>
              {card.name}
            </h1>

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              margin: '14px 0',
            }}>
              <span className={`market-rarity ${card.rarity}`}>
                {rarityLabels[card.rarity] ?? card.rarity}
              </span>

              <span style={{
                background: '#edf3eb',
                color: '#52745b',
                borderRadius: 20,
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: 700,
              }}>
                {extension?.name ?? 'Extension inconnue'}
              </span>

              {card.card_number !== null && (
                <span style={{
                  background: '#edf3eb',
                  color: '#52745b',
                  borderRadius: 20,
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  N° {card.card_number}
                </span>
              )}
            </div>

            {card.description && (
              <p style={{
                color: '#718078',
                lineHeight: 1.7,
                marginTop: 18,
              }}>
                {card.description}
              </p>
            )}

            <div style={{
              background: '#f5f8f3',
              border: '1px solid #e5eee3',
              borderRadius: 16,
              padding: 18,
              marginTop: 24,
            }}>
              <span style={{ color: '#829087', fontSize: 12 }}>
                Prix le plus bas actuellement
              </span>

              <div style={{
                fontSize: 27,
                fontWeight: 900,
                color: '#355640',
                marginTop: 5,
              }}>
                {lowestPrice !== null
                  ? `${lowestPrice.toLocaleString('fr-FR')} pièces`
                  : 'Aucune annonce'}
              </div>

              <span style={{ color: '#829087', fontSize: 12 }}>
                {listings.length} annonce(s) disponible(s)
              </span>
            </div>
          </div>
        </div>

        <section style={{ marginTop: 36 }}>
          <h2 style={{ color: '#294735', marginBottom: 14 }}>
            Cours de la carte
          </h2>

          <MarketPriceChart points={history ?? []} />
        </section>

        <section style={{ marginTop: 36 }}>
          <h2 style={{ color: '#294735', marginBottom: 14 }}>
            Annonces disponibles
          </h2>

          {listings.length === 0 ? (
            <p style={{ color: '#829087' }}>
              Aucun joueur ne vend cette carte actuellement.
            </p>
          ) : (
            <div style={{
              display: 'grid',
              gap: 12,
            }}>
              {listings.map((listing) => {
                const seller = sellers.find(
                  (item) => item.id === listing.seller_id
                );

                return (
                  <article
                    key={listing.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                      flexWrap: 'wrap',
                      background: 'white',
                      border: '1px solid #e5eee3',
                      borderRadius: 14,
                      padding: 16,
                    }}
                  >
                    <div>
                      <strong style={{ color: '#355640' }}>
                        @{seller?.username ?? 'Joueur'}
                      </strong>
                      <p style={{
                        color: '#829087',
                        fontSize: 13,
                        marginTop: 5,
                      }}>
                        {listing.quantity} exemplaire(s) disponible(s)
                      </p>
                    </div>

                    <strong style={{
                      color: '#355640',
                      fontSize: 18,
                    }}>
                      {Number(listing.unit_price).toLocaleString('fr-FR')} pièces
                      <span style={{
                        fontSize: 11,
                        fontWeight: 500,
                      }}>
                        {' '} / carte
                      </span>
                    </strong>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
