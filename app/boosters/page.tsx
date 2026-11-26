
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RarityBadge } from '@/components/rarity-badge';

type Booster = {
  id: string;
  name: string;
  energy_cost: number;
  cards_per_pack: number;
  extension_id: string;
};

type Extension = {
  id: string;
  name: string;
  cover_url: string | null;
};

type WonCard = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  card_number: number | null;
};

type OpeningResult = {
  opening_id: string;
  energy_spent: number;
  lucky?: boolean;
  cards: WonCard[];
};

const rarityLabels: Record<string, string> = {
  common: 'Commune',
  uncommon: 'Peu commune',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
};

export default function BoostersPage() {
  const supabase = createClient();

  const [boosters, setBoosters] = useState<Booster[]>([]);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [energy, setEnergy] = useState(0);
  const [maxEnergy, setMaxEnergy] = useState(20);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [result, setResult] = useState<OpeningResult | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardRevealed, setIsCardRevealed] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError('');

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError('Tu dois être connecté pour ouvrir des boosters.');
        setLoading(false);
        return;
      }

      const [boostersResult, extensionsResult, walletResult] =
        await Promise.all([
          supabase
            .from('boosters')
            .select('id, name, energy_cost, cards_per_pack, extension_id')
            .eq('is_active', true)
            .order('name'),

          supabase
            .from('extensions')
            .select('id, name, cover_url')
            .eq('is_active', true),

          supabase
            .from('player_wallets')
            .select('energy, max_energy')
            .eq('user_id', user.id)
            .single(),
        ]);

      if (boostersResult.error) {
        setError('Impossible de charger les boosters.');
      } else {
        setBoosters(boostersResult.data ?? []);
      }

      if (extensionsResult.error) {
        setError('Impossible de charger les extensions.');
      } else {
        setExtensions(extensionsResult.data ?? []);
      }

      if (walletResult.error) {
        setError('Impossible de charger ton énergie.');
      } else {
        setEnergy(walletResult.data.energy);
        setMaxEnergy(walletResult.data.max_energy);
      }

      setLoading(false);
    }

    void loadData();
  }, [supabase]);

  async function openBooster(booster: Booster) {
    if (openingId) return;

    setError('');
    setResult(null);
    setShowSummary(false);
    setCurrentCardIndex(0);
    setIsCardRevealed(false);

    if (energy < booster.energy_cost) {
      setError('Tu ne possèdes pas assez d’énergie pour ouvrir ce booster.');
      return;
    }

    setOpeningId(booster.id);

    const { data, error: openingError } = await supabase.rpc(
      'open_booster',
      { p_booster_id: booster.id }
    );

    if (openingError) {
      setError(openingError.message);
      setOpeningId(null);
      return;
    }

    const opening = data as OpeningResult;

    setResult(opening);
    setEnergy((current) => current - opening.energy_spent);
    setOpeningId(null);
  }

  function getExtension(extensionId: string) {
    return extensions.find((extension) => extension.id === extensionId);
  }

  function nextCard() {
    if (!result) return;

    if (currentCardIndex < result.cards.length - 1) {
      setCurrentCardIndex((current) => current + 1);
      setIsCardRevealed(false);
    } else {
      setShowSummary(true);
    }
  }

  function closeOpening() {
    setResult(null);
    setShowSummary(false);
    setCurrentCardIndex(0);
    setIsCardRevealed(false);
  }

  if (loading) {
    return (
      <main className="page-container">
        <p>Chargement des boosters...</p>
      </main>
    );
  }

  const currentCard = result?.cards[currentCardIndex];

  return (
    <main className="page-container booster-page">

      <div className="booster-page-heading">
        <div>
          <span className="booster-eyebrow">MMI POCKET</span>
          <h1>Ouvrir des boosters</h1>
          <p className="page-description">
            Dépense ton énergie et découvre de nouvelles cartes !
          </p>
        </div>

        <div className="booster-energy-display">
          <span>⚡</span>
          <div>
            <strong>{energy} / {maxEnergy}</strong>
            <small>Énergie disponible</small>
          </div>
        </div>
      </div>

      {error && (
        <div className="booster-error">
          {error}
        </div>
      )}

      {!result && (
        <>
          {boosters.length === 0 ? (
            <div className="booster-empty">
              <span>🎁</span>
              <h2>Aucun booster disponible</h2>
              <p>
                Reviens plus tard, de nouveaux boosters arriveront bientôt.
              </p>
            </div>
          ) : (
            <div className="booster-list">
              {boosters.map((booster) => {
                const extension = getExtension(booster.extension_id);

                return (
                  <article className="booster-product" key={booster.id}>
                    <div className="booster-product-image">
                      {extension?.cover_url ? (
                        <img src={extension.cover_url} alt={extension.name} />
                      ) : (
                        <span>🎴</span>
                      )}
                    </div>

                    <div className="booster-product-content">
                      <span className="booster-product-extension">
                        {extension?.name ?? 'Extension'}
                      </span>

                      <h2>{booster.name}</h2>

                      <p>
                        Un paquet contenant {booster.cards_per_pack} cartes
                        à découvrir.
                      </p>

                      <div className="booster-product-footer">
                        <span className="booster-cost">
                          ⚡ {booster.energy_cost}
                        </span>

                        <button
                          type="button"
                          onClick={() => openBooster(booster)}
                          disabled={openingId !== null}
                        >
                          {openingId === booster.id
                            ? 'Ouverture...'
                            : 'Ouvrir le booster'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* OUVERTURE DES CARTES */}

      {result && !showSummary && currentCard && (
        <section className="booster-opening">

          {result.lucky && (
            <div className="lucky-booster-banner">
              <div className="lucky-booster-stars">✦ ✧ ✦</div>
              <div className="lucky-booster-icon">🌟</div>
              <h2>BOOSTER CHANCEUX !</h2>
              <p>
                Une chance sur 500 !
                Toutes tes cartes sont épiques ou légendaires !
              </p>
              <div className="lucky-booster-stars">✧ ✦ ✧</div>
            </div>
          )}

          <div className="booster-opening-heading">
            <span className="booster-eyebrow">OUVERTURE EN COURS</span>
            <h2>Découvre tes cartes !</h2>
            <p>
              Carte {currentCardIndex + 1} sur {result.cards.length}
            </p>
          </div>

          <div className="booster-progress">
            {result.cards.map((card, index) => (
              <div
                key={`${card.id}-${index}`}
                className={`booster-progress-dot ${
                  index < currentCardIndex
                    ? 'completed'
                    : index === currentCardIndex
                      ? 'current'
                      : ''
                }`}
              />
            ))}
          </div>

          <div className="booster-single-card-area">
            <div
              key={`${currentCard.id}-${currentCardIndex}`}
              className={`booster-flip-card ${
                isCardRevealed ? 'is-revealed' : ''
              } rarity-${currentCard.rarity} ${
                result.lucky ? 'lucky-booster-card' : ''
              }`}
              onClick={() => {
                if (!isCardRevealed) {
                  setIsCardRevealed(true);
                } else {
                  nextCard();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={
                isCardRevealed
                  ? 'Passer à la carte suivante'
                  : 'Révéler la carte'
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();

                  if (!isCardRevealed) {
                    setIsCardRevealed(true);
                  } else {
                    nextCard();
                  }
                }
              }}
            >
              <div className="booster-card-inner">

                <div className="booster-card-face booster-card-back">
                  <div className="booster-card-back-pattern">
                    <span>MMI</span>
                    <strong>POCKET</strong>
                    <div>✦</div>
                    <small>UNE CARTE À DÉCOUVRIR</small>
                  </div>
                </div>

                <div className="booster-card-face booster-card-front">
                  <div className="booster-single-image">
                    {currentCard.image_url ? (
                      <img
                        src={currentCard.image_url}
                        alt={currentCard.name}
                      />
                    ) : (
                      <span>🃏</span>
                    )}
                  </div>

                  <div className="booster-single-info">
                    <RarityBadge rarity={currentCard.rarity} />
                    <h3>{currentCard.name}</h3>

                    {currentCard.card_number !== null && (
                      <small>#{currentCard.card_number}</small>
                    )}

                    {currentCard.description && (
                      <p>{currentCard.description}</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="booster-reveal-actions">
            {!isCardRevealed ? (
              <button
                className="booster-reveal-button"
                onClick={() => setIsCardRevealed(true)}
              >
                ✨ Révéler la carte
              </button>
            ) : (
              <button
                className="booster-reveal-button"
                onClick={nextCard}
              >
                {currentCardIndex < result.cards.length - 1
                  ? 'Carte suivante →'
                  : 'Voir mes cartes obtenues'}
              </button>
            )}

            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowSummary(true)}
            >
              Passer au récapitulatif
            </button>
          </div>

        </section>
      )}

      {/* RÉCAPITULATIF */}

      {result && showSummary && (
        <section className="booster-summary">

          {result.lucky && (
            <div className="lucky-summary-banner">
              <span>🌟</span>
              <div>
                <h2>OUVERTURE EXCEPTIONNELLE !</h2>
                <p>
                  Tu as obtenu un booster chanceux :
                  100 % de cartes épiques ou légendaires !
                </p>
              </div>
              <span>✨</span>
            </div>
          )}

          <section className="booster-result">
            <div className="booster-result-heading">
              <span>✨</span>
              <h2>Ton ouverture est terminée !</h2>
              <p>
                {result.cards.length} cartes ajoutées à ta collection.
              </p>
            </div>

            <div className="booster-result-grid">
              {result.cards.map((card, index) => (
                <article
                  className={`booster-won-card rarity-${card.rarity}`}
                  key={`${card.id}-${index}`}
                >
                  <div className="booster-won-image">
                    {card.image_url ? (
                      <img src={card.image_url} alt={card.name} />
                    ) : (
                      <span>🃏</span>
                    )}
                  </div>

                  <div className="booster-won-info">
                    <RarityBadge rarity={card.rarity} />
                    <h3>{card.name}</h3>

                    {card.card_number !== null && (
                      <small>#{card.card_number}</small>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <button
              className="booster-again-button"
              onClick={closeOpening}
            >
              Continuer
            </button>
          </section>

        </section>
      )}

    </main>
  );
}
