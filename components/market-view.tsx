
'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MarketPriceChart } from '@/components/market-price-chart';

type MarketCard = {
  id: string;
  name: string;
  image_url: string | null;
  rarity: string;
  card_number: number | null;
};

type Listing = {
  id: string;
  seller_id: string;
  seller_username: string;
  card_id: string;
  quantity: number;
  unit_price: number;
  created_at: string;
  card: MarketCard;
};

type OwnedCard = MarketCard & {
  quantity: number;
};

type PricePoint = {
  card_id: string;
  sale_date: string;
  average_price: number;
  quantity_sold: number;
  sales_count: number;
};

type Props = {
  priceHistory: PricePoint[];
  initialListings: Listing[];
  ownedCards: OwnedCard[];
  currentUserId: string;
};

type MarketConfirmation =
  | {
      type: 'buy';
      listing: Listing;
      quantity: number;
      total: number;
    }
  | {
      type: 'cancel';
      listing: Listing;
    };

const rarityLabels: Record<string, string> = {
  common: 'Commune',
  uncommon: 'Peu commune',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
};

export function MarketView({
  initialListings,
  ownedCards,
  currentUserId,
  priceHistory,
}: Props) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'mine'>('buy');
  const [listings, setListings] = useState(initialListings);
  const [currentOwnedCards, setCurrentOwnedCards] = useState(ownedCards);

  const [search, setSearch] = useState('');
  const [selectedCard, setSelectedCard] = useState<OwnedCard | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(100);
  const [buyQuantities, setBuyQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [confirmation, setConfirmation] =
    useState<MarketConfirmation | null>(null);
  const [confirmationError, setConfirmationError] = useState('');

  // Synchronisation des données reçues du serveur
  useEffect(() => {
    setListings(initialListings);
  }, [initialListings]);

  useEffect(() => {
    setCurrentOwnedCards(ownedCards);
  }, [ownedCards]);

  // Abonnement Supabase Realtime
  useEffect(() => {
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    function scheduleRefresh() {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      refreshTimeout = setTimeout(() => {
        router.refresh();
      }, 250);
    }

    const channel = supabase
      .channel(`market-realtime-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_listings',
        },
        () => {
          scheduleRefresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_cards',
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          scheduleRefresh();
        }
      )
      .subscribe();

    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      void supabase.removeChannel(channel);
    };
  }, [supabase, currentUserId, router]);

  const myListings = listings.filter(
    (listing) => listing.seller_id === currentUserId
  );

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const isNotMine = listing.seller_id !== currentUserId;
      const matchesSearch = listing.card.name
        .toLowerCase()
        .includes(search.toLowerCase());

      return isNotMine && matchesSearch;
    });
  }, [listings, search, currentUserId]);

  const filteredOwnedCards = useMemo(() => {
    return currentOwnedCards.filter((card) =>
      card.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [currentOwnedCards, search]);

  async function createListing() {
    if (!selectedCard) return;

    if (quantity < 1 || quantity > selectedCard.quantity) {
      setErrorMessage('Quantité invalide.');
      return;
    }

    if (!Number.isInteger(price) || price < 1) {
      setErrorMessage('Le prix doit être un nombre entier positif.');
      return;
    }

    setLoading('create');
    setMessage('');
    setErrorMessage('');

    const { error } = await supabase.rpc('create_market_listing', {
      p_card_id: selectedCard.id,
      p_quantity: quantity,
      p_unit_price: price,
    });

    setLoading(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage('Ton annonce a bien été publiée !');
    setSelectedCard(null);
    setQuantity(1);
    setPrice(100);

    router.refresh();
  }

  function buyListing(listing: Listing) {
    const amount = buyQuantities[listing.id] ?? 1;

    if (amount < 1 || amount > listing.quantity) {
      setErrorMessage('Quantité invalide.');
      return;
    }

    setMessage('');
    setErrorMessage('');
    setConfirmationError('');

    setConfirmation({
      type: 'buy',
      listing,
      quantity: amount,
      total: amount * listing.unit_price,
    });
  }

  function cancelListing(listing: Listing) {
    setMessage('');
    setErrorMessage('');
    setConfirmationError('');

    setConfirmation({
      type: 'cancel',
      listing,
    });
  }

  async function confirmMarketAction() {
    if (!confirmation) return;

    const action = confirmation;

    setLoading(action.listing.id);
    setConfirmationError('');

    if (action.type === 'buy') {
      const { error } = await supabase.rpc('buy_market_listing', {
        p_listing_id: action.listing.id,
        p_quantity: action.quantity,
      });

      setLoading(null);

      if (error) {
        setConfirmationError(error.message);
        router.refresh();
        return;
      }

      setMessage('Achat effectué avec succès !');

      setListings((previous) =>
        previous
          .map((item) =>
            item.id === action.listing.id
              ? {
                  ...item,
                  quantity: item.quantity - action.quantity,
                }
              : item
          )
          .filter((item) => item.quantity > 0)
      );

      setConfirmation(null);
      router.refresh();
      return;
    }

    const { error } = await supabase.rpc('cancel_market_listing', {
      p_listing_id: action.listing.id,
    });

    setLoading(null);

    if (error) {
      setConfirmationError(error.message);
      router.refresh();
      return;
    }

    setListings((previous) =>
      previous.filter((item) => item.id !== action.listing.id)
    );

    setMessage('Annonce annulée. Tes cartes ont été rendues.');
    setConfirmation(null);

    router.refresh();
  }

  function closeConfirmation() {
    if (loading) return;

    setConfirmation(null);
    setConfirmationError('');
  }

  return (
    <div className="market-container">
      <div className="market-header">
        <div>
          <span className="market-eyebrow">MMI POCKET EXCHANGE</span>
          <h1>Marché</h1>
          <p>Achète, vends et échange tes cartes avec les autres joueurs.</p>
        </div>

        <div className="market-header-icon">↗</div>
      </div>

      <div className="market-tabs">
        <button
          className={activeTab === 'buy' ? 'active' : ''}
          onClick={() => {
            setActiveTab('buy');
            setMessage('');
            setErrorMessage('');
          }}
        >
          Acheter
        </button>

        <button
          className={activeTab === 'sell' ? 'active' : ''}
          onClick={() => {
            setActiveTab('sell');
            setMessage('');
            setErrorMessage('');
          }}
        >
          Vendre
        </button>

        <button
          className={activeTab === 'mine' ? 'active' : ''}
          onClick={() => {
            setActiveTab('mine');
            setMessage('');
            setErrorMessage('');
          }}
        >
          Mes annonces ({myListings.length})
        </button>
      </div>

      {message && (
        <div className="market-message success">{message}</div>
      )}

      {errorMessage && (
        <div className="market-message error">{errorMessage}</div>
      )}

      {activeTab !== 'mine' && (
        <input
          className="market-search"
          placeholder="Rechercher une carte..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      )}

      {activeTab === 'buy' && (
        <section className="market-section">
          <div className="market-section-heading">
            <div>
              <h2>Cartes disponibles</h2>
              <p>{filteredListings.length} annonce(s) disponible(s)</p>
            </div>
          </div>

          {filteredListings.length === 0 ? (
            <div className="market-empty">
              <span>🛒</span>
              <h3>Aucune annonce pour le moment</h3>
              <p>Reviens plus tard ou mets tes propres cartes en vente.</p>
            </div>
          ) : (
            <div className="market-listings-grid">
              {filteredListings.map((listing) => {
                const amount = buyQuantities[listing.id] ?? 1;

                return (
                  <article className="market-listing-card" key={listing.id}>
                    <div className="market-card-image">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/market/carte/${listing.card_id}`)
                        }
                        aria-label={`Voir la fiche de ${listing.card.name}`}
                        style={{
                          border: 'none',
                          padding: 0,
                          background: 'transparent',
                          cursor: 'pointer',
                          width: '100%',
                        }}
                      >
                        {listing.card.image_url ? (
                          <img
                            src={listing.card.image_url}
                            alt={listing.card.name}
                          />
                        ) : (
                          <span>🃏</span>
                        )}
                      </button>

                      <span className={`market-rarity ${listing.card.rarity}`}>
                        {rarityLabels[listing.card.rarity] ??
                          listing.card.rarity}
                      </span>
                    </div>

                    <div className="market-listing-content">
                      <h3>
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/market/carte/${listing.card_id}`)
                          }
                          style={{
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            color: 'inherit',
                            font: 'inherit',
                            fontWeight: 'inherit',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          {listing.card.name}
                        </button>
                      </h3>

                      <p className="market-seller">
                        Vendeur : @{listing.seller_username || 'Joueur'}
                      </p>

                      <div className="market-price">
                        <strong>
                          {listing.unit_price.toLocaleString('fr-FR')}
                        </strong>
                        <span>pièces / carte</span>
                      </div>

                      <p className="market-stock">
                        {listing.quantity} exemplaire(s) disponible(s)
                      </p>

                      <div className="market-buy-controls">
                        <input
                          type="number"
                          min={1}
                          max={listing.quantity}
                          value={amount}
                          onChange={(event) =>
                            setBuyQuantities((previous) => ({
                              ...previous,
                              [listing.id]: Math.max(
                                1,
                                Math.min(
                                  listing.quantity,
                                  Number(event.target.value) || 1
                                )
                              ),
                            }))
                          }
                        />

                        <button
                          onClick={() => buyListing(listing)}
                          disabled={loading === listing.id}
                        >
                          {loading === listing.id ? 'Achat...' : 'Acheter'}
                        </button>
                      </div>

                      <p className="market-total">
                        Total :{' '}
                        {(amount * listing.unit_price).toLocaleString('fr-FR')}{' '}
                        pièces
                      </p>

                      <MarketPriceChart
                        points={priceHistory.filter(
                          (point) => point.card_id === listing.card_id
                        )}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === 'sell' && (
        <section className="market-section">
          <div className="market-section-heading">
            <div>
              <h2>Vendre une carte</h2>
              <p>Choisis une carte de ta collection et fixe ton prix.</p>
            </div>
          </div>

          {filteredOwnedCards.length === 0 ? (
            <div className="market-empty">
              <span>📦</span>
              <h3>Aucune carte disponible</h3>
              <p>Ouvre des boosters pour enrichir ta collection.</p>
            </div>
          ) : (
            <div className="market-owned-grid">
              {filteredOwnedCards.map((card) => (
                <button
                  className={`market-owned-card ${
                    selectedCard?.id === card.id ? 'selected' : ''
                  }`}
                  key={card.id}
                  onClick={() => {
                    setSelectedCard(card);
                    setQuantity(1);
                    setPrice(100);
                  }}
                >
                  {card.image_url ? (
                    <img src={card.image_url} alt={card.name} />
                  ) : (
                    <span>🃏</span>
                  )}

                  <strong>{card.name}</strong>
                  <small>{card.quantity} possédée(s)</small>
                </button>
              ))}
            </div>
          )}

          {selectedCard && (
            <div className="market-sell-panel">
              <h3>Créer une annonce</h3>
              <p className="market-selected-name">{selectedCard.name}</p>

              <label>
                Quantité à vendre
                <input
                  type="number"
                  min={1}
                  max={selectedCard.quantity}
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(
                      Math.max(
                        1,
                        Math.min(
                          selectedCard.quantity,
                          Number(event.target.value) || 1
                        )
                      )
                    )
                  }
                />
              </label>

              <label>
                Prix par carte (pièces)
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={price}
                  onChange={(event) =>
                    setPrice(Number(event.target.value) || 0)
                  }
                />
              </label>

              <div className="market-sell-summary">
                <span>Valeur totale de l&apos;annonce</span>
                <strong>
                  {(quantity * price).toLocaleString('fr-FR')} pièces
                </strong>
              </div>

              <p className="market-commission">
                Commission de 5 % prélevée lors de la vente.
              </p>

              <button
                className="market-primary-button"
                onClick={createListing}
                disabled={loading === 'create'}
              >
                {loading === 'create'
                  ? 'Publication...'
                  : 'Publier mon annonce'}
              </button>

              <button
                className="market-cancel-button"
                onClick={() => setSelectedCard(null)}
              >
                Annuler
              </button>
            </div>
          )}
        </section>
      )}

      {activeTab === 'mine' && (
        <section className="market-section">
          <div className="market-section-heading">
            <div>
              <h2>Mes annonces</h2>
              <p>Gère les cartes que tu proposes à la vente.</p>
            </div>
          </div>

          {myListings.length === 0 ? (
            <div className="market-empty">
              <span>📋</span>
              <h3>Tu n&apos;as aucune annonce</h3>
              <p>Les cartes que tu mets en vente apparaîtront ici.</p>
            </div>
          ) : (
            <div className="market-my-listings">
              {myListings.map((listing) => (
                <article className="market-my-listing" key={listing.id}>
                  <div className="market-my-listing-image">
                    {listing.card.image_url ? (
                      <img
                        src={listing.card.image_url}
                        alt={listing.card.name}
                      />
                    ) : (
                      <span>🃏</span>
                    )}
                  </div>

                  <div className="market-my-listing-info">
                    <strong>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/market/carte/${listing.card_id}`)
                        }
                        style={{
                          border: 'none',
                          background: 'transparent',
                          padding: 0,
                          color: 'inherit',
                          font: 'inherit',
                          fontWeight: 'inherit',
                          cursor: 'pointer',
                        }}
                      >
                        {listing.card.name}
                      </button>
                    </strong>

                    <span>{listing.quantity} carte(s)</span>

                    <span>
                      {listing.unit_price.toLocaleString('fr-FR')} pièces /
                      carte
                    </span>
                  </div>

                  <button
                    className="market-cancel-listing"
                    onClick={() => cancelListing(listing)}
                    disabled={loading === listing.id}
                  >
                    {loading === listing.id ? '...' : 'Annuler'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="market-footer-note">
        <span>📈</span>
        <p>
          Chaque transaction contribue à l&apos;historique des cours.
          Consulte bientôt l&apos;évolution des prix de tes cartes sur 7 jours.
        </p>
      </div>

      {confirmation &&
        createPortal(
          <div
            className="game-confirm-overlay"
            onClick={closeConfirmation}
          >
            <div
              className="game-confirm-box"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="game-confirm-icon">
                {confirmation.type === 'buy' ? '🛒' : '📦'}
              </div>

              <span className="game-confirm-kicker">
                MMI POCKET EXCHANGE
              </span>

              <h2>
                {confirmation.type === 'buy'
                  ? 'Confirmer l’achat'
                  : 'Annuler cette annonce ?'}
              </h2>

              <p className="game-confirm-description">
                {confirmation.type === 'buy'
                  ? 'Vérifie les détails de ton achat avant de continuer.'
                  : 'Tes cartes seront retirées du marché et rendues dans ta collection.'}
              </p>

              <div className="game-confirm-card">
                {confirmation.listing.card.image_url ? (
                  <img
                    src={confirmation.listing.card.image_url}
                    alt={confirmation.listing.card.name}
                  />
                ) : (
                  <div className="game-confirm-card-placeholder">🃏</div>
                )}

                <div>
                  <strong>{confirmation.listing.card.name}</strong>

                  <span>
                    {confirmation.type === 'buy'
                      ? `${confirmation.quantity} exemplaire(s)`
                      : `${confirmation.listing.quantity} exemplaire(s) récupéré(s)`}
                  </span>
                </div>
              </div>

              {confirmation.type === 'buy' ? (
                <div className="game-confirm-total">
                  <span>Montant à payer</span>
                  <strong>
                    {confirmation.total.toLocaleString('fr-FR')} pièces
                  </strong>
                </div>
              ) : (
                <div className="game-confirm-total">
                  <span>Prix actuel par carte</span>
                  <strong>
                    {confirmation.listing.unit_price.toLocaleString('fr-FR')}{' '}
                    pièces
                  </strong>
                </div>
              )}

              {confirmationError && (
                <p className="game-confirm-error">
                  {confirmationError}
                </p>
              )}

              <div className="game-confirm-actions">
                <button
                  className="game-confirm-cancel"
                  onClick={closeConfirmation}
                  disabled={!!loading}
                >
                  Retour
                </button>

                <button
                  className="game-confirm-accept"
                  onClick={confirmMarketAction}
                  disabled={!!loading}
                >
                  {loading
                    ? 'Chargement...'
                    : confirmation.type === 'buy'
                      ? 'Confirmer l’achat'
                      : 'Confirmer l’annulation'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
