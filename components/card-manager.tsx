
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Card = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  rarity: string;
  card_number: number | null;
  extension_id: string;
  is_active: boolean;
};

type Extension = {
  id: string;
  name: string;
};

const rarityLabels: Record<string, string> = {
  common: 'Commune',
  uncommon: 'Peu commune',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
};

export function CardManager() {
  const supabase = createClient();

  const [cards, setCards] = useState<Card[]>([]);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');

    const [cardResult, extensionResult] = await Promise.all([
      supabase
        .from('cards')
        .select(
          'id, name, description, image_url, rarity, card_number, extension_id, is_active'
        )
        .order('created_at', { ascending: false }),
      supabase
        .from('extensions')
        .select('id, name')
        .order('name'),
    ]);

    if (cardResult.error) {
      setError(cardResult.error.message);
      setLoading(false);
      return;
    }

    if (extensionResult.error) {
      setError(extensionResult.error.message);
      setLoading(false);
      return;
    }

    setCards((cardResult.data ?? []) as Card[]);
    setExtensions((extensionResult.data ?? []) as Extension[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function toggleCard(card: Card) {
    setError('');
    setMessage('');

    const { error: updateError } = await supabase
      .from('cards')
      .update({ is_active: !card.is_active })
      .eq('id', card.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage(
      card.is_active
        ? 'Carte désactivée.'
        : 'Carte réactivée.'
    );

    await loadData();
  }

  return (
    <section className="admin-manager">
      <div className="admin-section-heading">
        <div>
          <h2>Cartes</h2>
          <p>Consulte et gère toutes les cartes du jeu.</p>
        </div>

        <span>{cards.length} carte(s)</span>
      </div>

      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-success">{message}</p>}

      {loading && <p>Chargement des cartes...</p>}

      {!loading && cards.length === 0 && (
        <p>Aucune carte créée pour le moment.</p>
      )}

      <div className="admin-card-list">
        {cards.map((card) => {
          const extension = extensions.find(
            (item) => item.id === card.extension_id
          );

          return (
            <article className="admin-card-item" key={card.id}>
              {card.image_url ? (
                <img
                  src={card.image_url}
                  alt={card.name}
                  className="admin-card-thumbnail"
                />
              ) : (
                <div className="admin-card-placeholder">MMI</div>
              )}

              <div className="admin-card-info">
                <strong>{card.name}</strong>

                <span>
                  {extension?.name ?? 'Extension inconnue'}
                </span>

                <span>
                  {rarityLabels[card.rarity] ?? card.rarity}
                  {card.card_number !== null
                    ? ` · N° ${card.card_number}`
                    : ''}
                </span>

                {card.description && (
                  <p>{card.description}</p>
                )}

                <span>
                  {card.is_active ? 'Active' : 'Désactivée'}
                </span>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() => toggleCard(card)}
              >
                {card.is_active ? 'Désactiver' : 'Réactiver'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
