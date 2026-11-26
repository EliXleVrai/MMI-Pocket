
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MarketView } from '@/components/market-view';

export default async function MarketPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Les 4 chargements indépendants sont lancés simultanément.
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const historyStart = sevenDaysAgo.toISOString().slice(0, 10);

  const [
    profileResult,
    listingsResult,
    ownedResult,
    historyResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single(),

    supabase
      .from('market_listings')
      .select(`
        id,
        seller_id,
        card_id,
        quantity,
        unit_price,
        created_at,
        cards (
          id,
          name,
          image_url,
          rarity,
          card_number
        )
      `)
      .order('created_at', { ascending: false }),

    supabase
      .from('player_cards')
      .select(`
        card_id,
        quantity,
        cards (
          id,
          name,
          image_url,
          rarity,
          card_number
        )
      `)
      .eq('user_id', user.id)
      .gt('quantity', 0),

    supabase
      .from('market_card_daily_prices')
      .select(`
        card_id,
        sale_date,
        average_price,
        quantity_sold,
        sales_count
      `)
      .gte('sale_date', historyStart)
      .order('sale_date', { ascending: true }),
  ]);

  if (!profileResult.data?.username) {
    redirect('/choisir-pseudo');
  }

  if (listingsResult.error) {
    console.error('Erreur chargement du marché :', listingsResult.error);
  }

  if (ownedResult.error) {
    console.error('Erreur chargement des cartes :', ownedResult.error);
  }

  if (historyResult.error) {
    console.error('Erreur historique des prix :', historyResult.error);
  }

  const rows = listingsResult.data ?? [];

  // Récupération des pseudos vendeurs.
  const sellerIds = [
    ...new Set(rows.map((row) => row.seller_id)),
  ];

  let sellerProfiles: { id: string; username: string }[] = [];

  if (sellerIds.length > 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', sellerIds);

    if (error) {
      console.error('Erreur chargement des vendeurs :', error);
    }

    sellerProfiles = data ?? [];
  }

  const sellerMap = new Map(
    sellerProfiles.map((profile) => [
      profile.id,
      profile.username,
    ])
  );

  // Préparation des annonces.
  const listings = rows.flatMap((row) => {
    const card = Array.isArray(row.cards)
      ? row.cards[0]
      : row.cards;

    if (!card) return [];

    return [{
      id: row.id,
      seller_id: row.seller_id,
      seller_username: sellerMap.get(row.seller_id) ?? 'Joueur',
      card_id: row.card_id,
      quantity: row.quantity,
      unit_price: row.unit_price,
      created_at: row.created_at,
      card,
    }];
  });

  // Préparation des cartes possédées.
  const ownedCards = (ownedResult.data ?? []).flatMap((row) => {
    const card = Array.isArray(row.cards)
      ? row.cards[0]
      : row.cards;

    if (!card) return [];

    return [{
      ...card,
      quantity: row.quantity,
    }];
  });

  const priceHistory = historyResult.data ?? [];

  return (
    <main className="page-container">
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto 20px',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <a
          href="/market/favoris"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '11px 18px',
            borderRadius: 12,
            background: '#fff5df',
            border: '1px solid #f0dfb8',
            color: '#a87518',
            fontWeight: 800,
            textDecoration: 'none',
          }}
        >
          ★ Mes favoris
        </a>
      </div>

      <MarketView
        initialListings={listings}
        ownedCards={ownedCards}
        currentUserId={user.id}
        priceHistory={priceHistory}
      />
    </main>
  );
}
