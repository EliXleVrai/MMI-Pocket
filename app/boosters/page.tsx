
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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
  rarity: string;
  card_number: number | null;
};

type OpeningResult = {
  opening_id: string;
  energy_spent: number;
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

  if (loading) {
    return (
      <main className="page-container">
        <p>Chargement des boosters...</p>
      </main>
    );
  }

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

      {boosters.length === 0 ? (
        <div className="booster-empty">
          <span>🎁</span>
          <h2>Aucun booster disponible</h2>
          <p>Reviens plus tard, de nouveaux boosters arriveront bientôt.</p>
        </div>
      ) : (
        <div className="booster-list">
          {boosters.map((booster) => {
            const extension = getExtension(booster.extension_id);

            return (
              <article className="booster-product" key={booster.id}>
                <div className="booster-product-image">
                  {extension?.cover_url ? (
                    <img
                      src={extension.cover_url}
                      alt={extension.name}
                    />
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
                      className="booster-open-button"
                      onClick={() => void openBooster(booster)}
                      disabled={
                        openingId !== null ||
                        energy < booster.energy_cost
                      }
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

      {result && (
        <section className="booster-result">
          <div className="booster-result-heading">
            <span>✨</span>
            <h2>Ton ouverture est terminée !</h2>
            <p>
              {result.cards.length} nouvelles cartes ajoutées à ta collection.
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
                  <span className="booster-won-rarity">
                    {rarityLabels[card.rarity] ?? card.rarity}
                  </span>
                  <h3>{card.name}</h3>
                  {card.card_number !== null && (
                    <small>#{card.card_number}</small>
                  )}
                  {card.description && (
                    <p>{card.description}</p>
                  )}
                </div>
              </article>
            ))}
          </div>

          <button
            className="booster-again-button"
            onClick={() => setResult(null)}
          >
            Continuer
          </button>
        </section>
      )}
    </main>
  );
}
