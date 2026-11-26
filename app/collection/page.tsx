
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CollectionView } from '@/components/collection-view';

export default async function CollectionPage() {
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

  const { data: ownedCards, error } = await supabase
    .from('player_cards')
    .select(`
      quantity,
      cards (
        id,
        name,
        description,
        image_url,
        rarity,
        card_number,
        buyback_price,
        extensions (id, name)
      )
    `)
    .eq('user_id', user.id)
    .order('acquired_at', { ascending: false });

  if (error) {
    console.error('Erreur chargement collection :', error);
  }

  const cards = (ownedCards ?? [])
    .filter((item) => item.cards)
    .map((item) => {
      const card = Array.isArray(item.cards)
        ? item.cards[0]
        : item.cards;

      const extension = Array.isArray(card?.extensions)
        ? card.extensions[0]
        : card?.extensions;

      return {
        id: card.id,
        name: card.name,
        description: card.description,
        image_url: card.image_url,
        rarity: card.rarity,
        card_number: card.card_number,
        quantity: item.quantity,
        buyback_price: card.buyback_price ?? 0,
        extension: extension
          ? {
              id: extension.id,
              name: extension.name,
            }
          : null,
      };
    });

  return (
    <main className="page-container">
      <h1>Ma collection</h1>

      <p className="page-description">
        Retrouve toutes tes cartes, découvre leurs raretés
        et complète tes extensions.
      </p>

      <CollectionView cards={cards} />

      {error && (
        <div className="error-message">
          <strong>Erreur de chargement de la collection</strong>
          <p>{error.message}</p>
          <small>Code : {error.code}</small>
          <small>Détails : {error.details}</small>
          <small>Conseil : {error.hint}</small>
        </div>
      )}
    </main>
  );
}
