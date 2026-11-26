
'use client';

import { useMemo, useState } from 'react';
import { RarityBadge } from '@/components/rarity-badge';

export type OwnedCard = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  card_number: number | null;
  quantity: number;
  extension: {
    id: string;
    name: string;
  } | null;
};

const rarityLabels = {
  common: 'Commune',
  uncommon: 'Peu commune',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
};

export function CollectionView({
  cards,
}: {
  cards: OwnedCard[];
}) {
  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [extensionFilter, setExtensionFilter] = useState('all');
  const [selectedCard, setSelectedCard] = useState<OwnedCard | null>(null);

  const extensions = useMemo(() => {
    const unique = new Map<string, string>();

    cards.forEach((card) => {
      if (card.extension) {
        unique.set(card.extension.id, card.extension.name);
      }
    });

    return Array.from(unique, ([id, name]) => ({ id, name }));
  }, [cards]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const matchesSearch = card.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesRarity =
        rarityFilter === 'all' || card.rarity === rarityFilter;

      const matchesExtension =
        extensionFilter === 'all' ||
        card.extension?.id === extensionFilter;

      return matchesSearch && matchesRarity && matchesExtension;
    });
  }, [cards, search, rarityFilter, extensionFilter]);

  const totalCards = cards.reduce(
    (total, card) => total + card.quantity,
    0
  );

  const duplicates = cards.reduce(
    (total, card) => total + Math.max(0, card.quantity - 1),
    0
  );

  return (
    <div className="collection-view">
      <div className="collection-stats">
        <div className="collection-stat">
          <span>Cartes différentes</span>
          <strong>{cards.length}</strong>
        </div>

        <div className="collection-stat">
          <span>Total possédé</span>
          <strong>{totalCards}</strong>
        </div>

        <div className="collection-stat">
          <span>Doublons</span>
          <strong>{duplicates}</strong>
        </div>
      </div>

      <div className="collection-toolbar">
        <input
          type="search"
          placeholder="Rechercher une carte..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="collection-search"
        />

        <select
          value={rarityFilter}
          onChange={(event) => setRarityFilter(event.target.value)}
          className="collection-filter"
        >
          <option value="all">Toutes les raretés</option>
          {Object.entries(rarityLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={extensionFilter}
          onChange={(event) => setExtensionFilter(event.target.value)}
          className="collection-filter"
        >
          <option value="all">Toutes les extensions</option>
          {extensions.map((extension) => (
            <option key={extension.id} value={extension.id}>
              {extension.name}
            </option>
          ))}
        </select>
      </div>

      <div className="collection-results">
        <h2>Mes cartes</h2>
        <span>{filteredCards.length} résultat(s)</span>
      </div>

      {filteredCards.length === 0 ? (
        <div className="collection-empty">
          <span>🃏</span>
          <h3>Aucune carte trouvée</h3>
          <p>
            {cards.length === 0
              ? 'Ouvre ton premier booster pour commencer ta collection !'
              : 'Essaie de modifier tes filtres ou ta recherche.'}
          </p>
        </div>
      ) : (
        <div className="collection-grid">
          {filteredCards.map((card) => (
            <button
              key={card.id}
              type="button"
              className={`collection-card rarity-${card.rarity}`}
              onClick={() => setSelectedCard(card)}
            >
              <div className="collection-card-image">
                {card.image_url ? (
                  <img src={card.image_url} alt={card.name} />
                ) : (
                  <div className="collection-card-placeholder">
                    🃏
                  </div>
                )}

                {card.quantity > 1 && (
                  <span className="collection-quantity">
                    ×{card.quantity}
                  </span>
                )}
              </div>

              <div className="collection-card-info">
                <strong>{card.name}</strong>
                <RarityBadge rarity={card.rarity} showLabel={false} />
                <span>
                  {card.extension?.name ?? 'Extension inconnue'}
                </span>
                {card.card_number !== null && (
                  <small>N° {card.card_number}</small>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedCard && (
        <div
          className="collection-modal-overlay"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className={`collection-modal rarity-${selectedCard.rarity}`}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Détail de ${selectedCard.name}`}
          >
            <button
              type="button"
              className="collection-modal-close"
              onClick={() => setSelectedCard(null)}
              aria-label="Fermer"
            >
              ×
            </button>

            <div className="collection-modal-image">
              {selectedCard.image_url ? (
                <img
                  src={selectedCard.image_url}
                  alt={selectedCard.name}
                />
              ) : (
                <div className="collection-card-placeholder">🃏</div>
              )}
            </div>

            <div className="collection-modal-info">
              <RarityBadge rarity={selectedCard.rarity} />

              <h2>{selectedCard.name}</h2>

              <p>
                {selectedCard.description || 'Aucune description disponible.'}
              </p>

              <div className="collection-modal-details">
                <span>
                  Extension : <strong>{selectedCard.extension?.name ?? 'Inconnue'}</strong>
                </span>

                {selectedCard.card_number !== null && (
                  <span>
                    Numéro : <strong>#{selectedCard.card_number}</strong>
                  </span>
                )}

                <span>
                  Quantité possédée : <strong>{selectedCard.quantity}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
