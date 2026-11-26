
'use client';

import { useMemo, useState } from 'react';
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
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'mine'>('buy');
  const [listings, setListings] = useState(initialListings);
  const [search, setSearch] = useState('');
  const [selectedCard, setSelectedCard] = useState<OwnedCard | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(100);
  const [buyQuantities, setBuyQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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
    return ownedCards.filter((card) =>
      card.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [ownedCards, search]);

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

  async function buyListing(listing: Listing) {
    const amount = buyQuantities[listing.id] ?? 1;

    if (amount < 1 || amount > listing.quantity) {
      setErrorMessage('Quantité invalide.');
      return;
    }

    const total = amount * listing.unit_price;

    if (
      !window.confirm(
        `Acheter ${amount} exemplaire(s) de ${listing.card.name} pour ${total} pièces ?`
      )
    ) {
      return;
    }

    setLoading(listing.id);
    setMessage('');
    setErrorMessage('');

    const { error } = await supabase.rpc('buy_market_listing', {
      p_listing_id: listing.id,
      p_quantity: amount,
    });

    setLoading(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage('Achat effectué avec succès !');
    setListings((previous) =>
      previous
        .map((item) =>
          item.id === listing.id
            ? { ...item, quantity: item.quantity - amount }
            : item
        )
        .filter((item) => item.quantity > 0)
    );

    router.refresh();
  }

  async function cancelListing(listing: Listing) {
    if (
      !window.confirm(
        `Annuler cette annonce et récupérer ${listing.quantity} carte(s) ?`
      )
    ) {
      return;
    }

    setLoading(listing.id);
    setMessage('');
    setErrorMessage('');

    const { error } = await supabase.rpc('cancel_market_listing', {
      p_listing_id: listing.id,
    });

    setLoading(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setListings((previous) =>
      previous.filter((item) => item.id !== listing.id)
    );

    setMessage('Annonce annulée. Tes cartes ont été rendues.');
    router.refresh();
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
                      {listing.card.image_url ? (
                        <img
                          src={listing.card.image_url}
                          alt={listing.card.name}
                        />
                      ) : (
                        <span>🃏</span>
                      )}
                      <span className={`market-rarity ${listing.card.rarity}`}>
                        {rarityLabels[listing.card.rarity] ?? listing.card.rarity}
                      </span>
                    </div>

                    <div className="market-listing-content">
                      <h3>{listing.card.name}</h3>
                      <p className="market-seller">
                        Vendeur : @{listing.seller_username || 'Joueur'}
                      </p>

                      <div className="market-price">
                        <strong>{listing.unit_price.toLocaleString('fr-FR')}</strong>
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
                        Total : {(amount * listing.unit_price).toLocaleString('fr-FR')} pièces
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
                {loading === 'create' ? 'Publication...' : 'Publier mon annonce'}
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
                    <strong>{listing.card.name}</strong>
                    <span>{listing.quantity} carte(s)</span>
                    <span>{listing.unit_price.toLocaleString('fr-FR')} pièces / carte</span>
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
    </div>
  );
}
