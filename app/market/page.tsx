
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MarketView } from '@/components/market-view';

export default async function MarketPage() {
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

  // Annonces actuellement disponibles
  const { data: listingRows, error: listingsError } = await supabase
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
    .order('created_at', { ascending: false });

  if (listingsError) {
    console.error('Erreur chargement du marché :', listingsError);
  }

  const rows = listingRows ?? [];

  // Récupération des pseudos des vendeurs
  const sellerIds = [...new Set(rows.map((row) => row.seller_id))];

  let sellerProfiles: { id: string; username: string }[] = [];

  if (sellerIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', sellerIds);

    sellerProfiles = data ?? [];
  }

  const listings = rows.flatMap((row) => {
    const card = Array.isArray(row.cards) ? row.cards[0] : row.cards;

    if (!card) return [];

    const seller = sellerProfiles.find(
      (profile) => profile.id === row.seller_id
    );

    return [{
      id: row.id,
      seller_id: row.seller_id,
      seller_username: seller?.username ?? 'Joueur',
      card_id: row.card_id,
      quantity: row.quantity,
      unit_price: row.unit_price,
      created_at: row.created_at,
      card,
    }];
  });

  // Cartes possédées par le joueur et disponibles pour la vente
  const { data: ownedRows, error: ownedError } = await supabase
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
    .gt('quantity', 0);

  if (ownedError) {
    console.error('Erreur chargement des cartes :', ownedError);
  }

  const ownedCards = (ownedRows ?? []).flatMap((row) => {
    const card = Array.isArray(row.cards) ? row.cards[0] : row.cards;

    const { data: priceHistoryRows, error: historyError } =
  await supabase
    .from('market_card_daily_prices')
    .select('card_id, sale_date, average_price, quantity_sold, sales_count')
    .order('sale_date', { ascending: true });

if (historyError) {
  console.error('Erreur historique des prix :', historyError);
}

const priceHistory = priceHistoryRows ?? [];

    if (!card) return [];

    return [{
      ...card,
      quantity: row.quantity,
    }];
  });

  return (
    <main className="page-container">
      <MarketView
        initialListings={listings}
        ownedCards={ownedCards}
        currentUserId={user.id}
        priceHistory={priceHistory}
      />
    </main>
  );
}
