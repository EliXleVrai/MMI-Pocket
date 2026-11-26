
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

  // Toutes les cartes du jeu
  const { data: allCards, error: cardsError } = await supabase
    .from('cards')
    .select(`
      id,
      name,
      description,
      image_url,
      rarity,
      card_number,
      buyback_price,
      extension_id,
      is_active,
      genre,
      extensions (
        id,
        name
      )
    `)
    .order('card_number', { ascending: true });

  // Cartes possédées par le joueur
  const { data: ownedRows, error: ownedError } = await supabase
    .from('player_cards')
    .select('card_id, quantity')
    .eq('user_id', user.id)
    .gt('quantity', 0);

  if (cardsError) {
    console.error('Erreur chargement des cartes :', cardsError);
  }

  if (ownedError) {
    console.error('Erreur chargement de la collection :', ownedError);
  }

  // Quantités possédées
  const ownedQuantities = new Map(
    (ownedRows ?? []).map((item) => [
      item.card_id,
      item.quantity,
    ])
  );

  // Construction de la collection complète
  const cards = (allCards ?? [])
    .filter((card) => {
      const quantity = ownedQuantities.get(card.id) ?? 0;

      // Les cartes désactivées restent visibles si le joueur les possède.
      return card.is_active || quantity > 0;
    })
    .map((card) => {
      const extension = Array.isArray(card.extensions)
        ? card.extensions[0]
        : card.extensions;

      return {
        id: card.id,
        name: card.name,
        description: card.description,
        image_url: card.image_url,
        rarity: card.rarity,
        card_number: card.card_number,
        quantity: ownedQuantities.get(card.id) ?? 0,
        buyback_price: card.buyback_price ?? 0,
        extension: extension
          ? {
              id: extension.id,
              name: extension.name,
            }
          : null,
      };
    });

  const error = cardsError || ownedError;

  return (
    <main className="page-container">
      <h1>Ma collection</h1>

      <p className="page-description">
        Découvre toutes les cartes du jeu, retrouve celles que tu possèdes
        et complète tes extensions !
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
