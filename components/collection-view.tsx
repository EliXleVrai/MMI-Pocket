
'use client';

import { useMemo, useState } from 'react';
import { RarityBadge } from '@/components/rarity-badge';
import { createClient } from '@/lib/supabase/client';
import { createPortal } from 'react-dom';

export type OwnedCard = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  genre: 'Terrain' | 'Personnage' | 'Objet';
  card_number: number | null;
  quantity: number;
  buyback_price: number;
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

type StatusFilter = 'all' | 'owned' | 'missing' | 'duplicates';

export function CollectionView({ cards: initialCards }: { cards: OwnedCard[] }) {
  const supabase = createClient();

  const [cards, setCards] = useState(initialCards);
  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [extensionFilter, setExtensionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedCard, setSelectedCard] = useState<OwnedCard | null>(null);

  const [sellQuantity, setSellQuantity] = useState(1);
  const [selling, setSelling] = useState(false);
  const [sellError, setSellError] = useState('');
  const [sellMessage, setSellMessage] = useState('');

  const extensions = useMemo(() => {
    const unique = new Map<string, string>();

    cards.forEach((card) => {
      if (card.extension) {
        unique.set(card.extension.id, card.extension.name);
      }
    });

    return Array.from(unique, ([id, name]) => ({ id, name }));
  }, [cards]);

  const ownedTypes = cards.filter((card) => card.quantity > 0).length;
  const missingTypes = cards.length - ownedTypes;

  const totalCards = cards.reduce(
    (total, card) => total + card.quantity,
    0
  );

  const duplicates = cards.reduce(
    (total, card) => total + Math.max(0, card.quantity - 1),
    0
  );

  const totalBuybackValue = cards.reduce(
    (total, card) => total + card.quantity * card.buyback_price,
    0
  );

  const completion = cards.length
    ? Math.round((ownedTypes / cards.length) * 100)
    : 0;

  const extensionProgress = extensions.map((extension) => {
    const extensionCards = cards.filter(
      (card) => card.extension?.id === extension.id
    );

    const owned = extensionCards.filter(
      (card) => card.quantity > 0
    ).length;

    return {
      ...extension,
      total: extensionCards.length,
      owned,
      percentage: extensionCards.length
        ? Math.round((owned / extensionCards.length) * 100)
        : 0,
    };
  });

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const matchesSearch =
        card.name.toLowerCase().includes(search.toLowerCase()) ||
        (card.extension?.name ?? '')
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesRarity =
        rarityFilter === 'all' || card.rarity === rarityFilter;

      const matchesExtension =
        extensionFilter === 'all' ||
        card.extension?.id === extensionFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'owned' && card.quantity > 0) ||
        (statusFilter === 'missing' && card.quantity === 0) ||
        (statusFilter === 'duplicates' && card.quantity > 1);

      return (
        matchesSearch &&
        matchesRarity &&
        matchesExtension &&
        matchesStatus
      );
    });
  }, [
    cards,
    search,
    rarityFilter,
    extensionFilter,
    statusFilter,
  ]);

  async function sellCard() {
    if (!selectedCard || selling) return;

    setSellError('');
    setSellMessage('');

    if (
      sellQuantity < 1 ||
      sellQuantity > selectedCard.quantity ||
      !Number.isInteger(sellQuantity)
    ) {
      setSellError('Quantité de vente invalide.');
      return;
    }

    if (selectedCard.buyback_price <= 0) {
      setSellError('Cette carte ne peut pas être vendue au serveur.');
      return;
    }

    const total = selectedCard.buyback_price * sellQuantity;

    const confirmed = window.confirm(
      `Vendre ${sellQuantity} exemplaire(s) de "${selectedCard.name}" pour ${total} pièces ?`
    );

    if (!confirmed) return;

    setSelling(true);

    const { error } = await supabase.rpc('sell_card_to_server', {
      p_card_id: selectedCard.id,
      p_quantity: sellQuantity,
    });

    if (error) {
      setSellError(error.message);
      setSelling(false);
      return;
    }

    const updatedQuantity = selectedCard.quantity - sellQuantity;

    setCards((previousCards) =>
      previousCards.map((card) =>
        card.id === selectedCard.id
          ? { ...card, quantity: updatedQuantity }
          : card
      )
    );

    setSellMessage(
      `${sellQuantity} carte(s) vendue(s) pour ${total} pièces !`
    );

    setSelectedCard((previous) =>
      previous
        ? { ...previous, quantity: updatedQuantity }
        : null
    );

    setSellQuantity(1);
    setSelling(false);
  }

  function openCard(card: OwnedCard) {
    setSelectedCard(card);
    setSellQuantity(1);
    setSellError('');
    setSellMessage('');
  }

  return (
    <div className="collection-view">
      <div className="collection-stats">
        <div className="collection-stat">
          <span>Cartes obtenues</span>
          <strong>{ownedTypes} / {cards.length}</strong>
        </div>

        <div className="collection-stat">
          <span>Total possédé</span>
          <strong>{totalCards}</strong>
        </div>

        <div className="collection-stat">
          <span>Doublons</span>
          <strong>{duplicates}</strong>
        </div>

        <div className="collection-stat">
          <span>Valeur de rachat</span>
          <strong>{totalBuybackValue} pièces</strong>
        </div>
      </div>

      <section className="collection-progress">
        <div className="collection-progress-heading">
          <div>
            <h2>Progression de l&apos;album</h2>
            <p>{ownedTypes} cartes découvertes sur {cards.length}</p>
          </div>
          <strong>{completion}%</strong>
        </div>

        <div className="collection-progress-track">
          <div
            className="collection-progress-fill"
            style={{ width: `${completion}%` }}
          />
        </div>

        <div className="collection-progress-legend">
          <span>{ownedTypes} obtenues</span>
          <span>{missingTypes} manquantes</span>
        </div>
      </section>

      {extensionProgress.length > 0 && (
        <section className="collection-extensions">
          <h2>Progression par extension</h2>

          <div className="collection-extension-grid">
            {extensionProgress.map((extension) => (
              <button
                type="button"
                key={extension.id}
                className={`collection-extension-card ${
                  extensionFilter === extension.id ? 'active' : ''
                }`}
                onClick={() =>
                  setExtensionFilter(
                    extensionFilter === extension.id
                      ? 'all'
                      : extension.id
                  )
                }
              >
                <div className="collection-extension-heading">
                  <strong>{extension.name}</strong>
                  <span>{extension.percentage}%</span>
                </div>

                <div className="collection-progress-track">
                  <div
                    className="collection-progress-fill"
                    style={{
                      width: `${extension.percentage}%`,
                    }}
                  />
                </div>

                <small>
                  {extension.owned} / {extension.total} cartes
                </small>
              </button>
            ))}
          </div>
        </section>
      )}

      {sellMessage && (
        <div className="collection-sale-success">
          ✓ {sellMessage}
        </div>
      )}

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

      <div className="collection-status-filters">
        {([
          ['all', 'Toutes'],
          ['owned', 'Obtenues'],
          ['missing', 'Manquantes'],
          ['duplicates', 'Doublons'],
        ] as [StatusFilter, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={statusFilter === value ? 'active' : ''}
            onClick={() => setStatusFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="collection-results">
        <h2>Album de cartes</h2>
        <span>{filteredCards.length} résultat(s)</span>
      </div>

      {filteredCards.length === 0 ? (
        <div className="collection-empty">
          <span>🃏</span>
          <h3>Aucune carte trouvée</h3>
          <p>Essaie de modifier tes filtres ou ta recherche.</p>
        </div>
      ) : (
        <div className="collection-grid">
          {filteredCards.map((card) => {
            const missing = card.quantity === 0;

            return (
              <button
                key={card.id}
                type="button"
                className={`collection-card rarity-${card.rarity} ${
                  missing ? 'collection-card-missing' : 'collection-card-owned'
                }`}
                onClick={() => openCard(card)}
              >
                <div className="collection-card-image">
                  {card.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.image_url}
                      alt={missing ? 'Carte non obtenue' : card.name}
                    />
                  ) : (
                    <div className="collection-card-placeholder">
                      🃏
                    </div>
                  )}

                  {missing ? (
                    <span className="collection-missing-label">
                      ?
                    </span>
                  ) : (
                    <span className="collection-owned-label">
                      ✓
                    </span>
                  )}

                  {card.quantity > 1 && (
                    <span className="collection-quantity">
                      ×{card.quantity}
                    </span>
                  )}
                </div>

                <div className="collection-card-info">
                  <strong>
                    {missing ? 'Carte inconnue' : card.name}
                  </strong>

                  <div className="collection-card-badges">
                    <RarityBadge rarity={card.rarity} showLabel={false} />
                    <span className="collection-genre-badge">
                      {card.genre ?? 'Personnage'}
                    </span>
                  </div>

                  <span>
                    {card.extension?.name ?? 'Extension inconnue'}
                  </span>

                  {card.card_number !== null && (
                    <small>N° {card.card_number}</small>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedCard && typeof document !== 'undefined' && createPortal(
        <div
          className="collection-modal-overlay"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className={`collection-modal collection-modal-premium rarity-${selectedCard.rarity}`}
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
      
            <div className="collection-modal-art">
              <div className="collection-modal-art-label">
                {selectedCard.quantity > 0 ? 'CARTE DÉCOUVERTE' : 'CARTE À DÉCOUVRIR'}
              </div>
      
              <div className="collection-modal-image">
                {selectedCard.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedCard.image_url}
                    alt={selectedCard.name}
                  />
                ) : (
                  <div className="collection-card-placeholder">🃏</div>
                )}
              </div>
      
              <div className="collection-modal-art-footer">
                <span>
                  {selectedCard.extension?.name ?? 'Extension inconnue'}
                </span>
                {selectedCard.card_number !== null && (
                  <strong>#{selectedCard.card_number}</strong>
                )}
              </div>
            </div>
      
            <div className="collection-modal-info">
              <div className="collection-modal-topline">
                <span className="collection-modal-kicker">
                  FICHE DE COLLECTION
                </span>
                <span className={`collection-modal-owned ${selectedCard.quantity > 0 ? 'is-owned' : 'is-missing'}`}>
                  {selectedCard.quantity > 0 ? '✓ Obtenue' : '? Manquante'}
                </span>
              </div>
      
              <div className="collection-card-badges">
                <RarityBadge rarity={selectedCard.rarity} />
                <span className="collection-genre-badge">
                  {selectedCard.genre ?? 'Personnage'}
                </span>
              </div>
      
              <h2>{selectedCard.name}</h2>
      
              <p className="collection-modal-description">
                {selectedCard.description || 'Aucune description disponible.'}
              </p>
      
              <div className="collection-modal-details">
                <span>
                  Extension
                  <strong>{selectedCard.extension?.name ?? 'Inconnue'}</strong>
                </span>
      
                <span>
                  Numéro
                  <strong>
                    {selectedCard.card_number !== null
                      ? `#${selectedCard.card_number}`
                      : 'Non défini'}
                  </strong>
                </span>
      
                <span>
                  Exemplaires possédés
                  <strong>{selectedCard.quantity}</strong>
                </span>
              </div>
      
              {selectedCard.quantity > 0 ? (
                <div className="collection-sale-panel">
                  <div className="collection-sale-heading">
                    <div>
                      <span className="collection-modal-kicker">ÉCONOMIE</span>
                      <h3>Vendre au serveur</h3>
                    </div>
                    <span className="collection-sale-icon">↗</span>
                  </div>
      
                  <div className="collection-sale-price">
                    <span>Prix de rachat unitaire</span>
                    <strong>{selectedCard.buyback_price} pièces</strong>
                  </div>
      
                  {selectedCard.buyback_price > 0 ? (
                    <>
                      <div className="collection-sale-quantity">
                        <label htmlFor="sell-quantity">
                          Exemplaires à vendre
                        </label>
      
                        <input
                          id="sell-quantity"
                          type="number"
                          min="1"
                          max={selectedCard.quantity}
                          step="1"
                          value={sellQuantity}
                          onChange={(event) =>
                            setSellQuantity(
                              Math.max(1, Number(event.target.value) || 1)
                            )
                          }
                        />
                      </div>
      
                      <div className="collection-sale-total">
                        <span>Montant reçu</span>
                        <strong>
                          {selectedCard.buyback_price *
                            Math.min(sellQuantity, selectedCard.quantity)}{' '}
                          pièces
                        </strong>
                      </div>
      
                      {sellError && (
                        <p className="form-error">{sellError}</p>
                      )}
      
                      <button
                        type="button"
                        className="collection-sell-button"
                        onClick={sellCard}
                        disabled={
                          selling ||
                          sellQuantity < 1 ||
                          sellQuantity > selectedCard.quantity
                        }
                      >
                        {selling ? 'Vente en cours...' : 'Confirmer la vente'}
                      </button>
                    </>
                  ) : (
                    <p className="collection-no-buyback">
                      Cette carte ne peut pas être rachetée par le serveur.
                    </p>
                  )}
      
                  <small>
                    Prix fixé par l&apos;administrateur et vérifié par Supabase.
                  </small>
                </div>
              ) : (
                <div className="collection-missing-details">
                  <strong>Cette carte manque à ta collection</strong>
                  <p>
                    Ouvre des boosters pour tenter de la découvrir et compléter ton album.
                  </p>
                </div>
              )}
            </div>
          </div>
          </div>,
        document.body
      )}
    </div>
  );
}
