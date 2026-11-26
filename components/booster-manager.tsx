'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

type Extension = {
  id: string;
  name: string;
};

type Booster = {
  id: string;
  extension_id: string;
  name: string;
  energy_cost: number;
  cards_per_pack: number;
  is_active: boolean;
};

const rarities = [
  { value: 'common', label: 'Commune' },
  { value: 'uncommon', label: 'Peu commune' },
  { value: 'rare', label: 'Rare' },
  { value: 'epic', label: 'Épique' },
  { value: 'legendary', label: 'Légendaire' },
];

export function BoosterManager() {
  const supabase = createClient();

  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [boosters, setBoosters] = useState<Booster[]>([]);
  const [name, setName] = useState('');
  const [extensionId, setExtensionId] = useState('');
  const [energyCost, setEnergyCost] = useState(5);
  const [cardsPerPack, setCardsPerPack] = useState(5);
  const [rates, setRates] = useState<Record<string, number>>({
    common: 60,
    uncommon: 25,
    rare: 10,
    epic: 4,
    legendary: 1,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadData() {
    const [extensionResult, boosterResult] = await Promise.all([
      supabase
        .from('extensions')
        .select('id, name')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('boosters')
        .select('id, extension_id, name, energy_cost, cards_per_pack, is_active')
        .order('created_at', { ascending: false }),
    ]);

    if (extensionResult.error) {
      setError(extensionResult.error.message);
      return;
    }

    if (boosterResult.error) {
      setError(boosterResult.error.message);
      return;
    }

    const loadedExtensions = (extensionResult.data ?? []) as Extension[];

    setExtensions(loadedExtensions);
    setBoosters((boosterResult.data ?? []) as Booster[]);

    if (!extensionId && loadedExtensions.length > 0) {
      setExtensionId(loadedExtensions[0].id);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateRate(rarity: string, value: number) {
    setRates((current) => ({
      ...current,
      [rarity]: Math.max(0, value),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (!name.trim()) {
        throw new Error('Le nom du booster est obligatoire.');
      }

      if (!extensionId) {
        throw new Error('Sélectionne une extension.');
      }

      if (!Number.isInteger(energyCost) || energyCost < 0) {
        throw new Error('Le coût en énergie doit être un entier positif ou nul.');
      }

      if (!Number.isInteger(cardsPerPack) || cardsPerPack < 1 || cardsPerPack > 20) {
        throw new Error('Le nombre de cartes doit être compris entre 1 et 20.');
      }

      const totalWeight = Object.values(rates).reduce(
        (total, value) => total + value,
        0
      );

      if (totalWeight <= 0) {
        throw new Error('La somme des probabilités doit être supérieure à zéro.');
      }

      const { data: booster, error: insertError } = await supabase
        .from('boosters')
        .insert({
          extension_id: extensionId,
          name: name.trim(),
          energy_cost: energyCost,
          cards_per_pack: cardsPerPack,
          is_active: true,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      const rateRows = rarities
        .filter((rarity) => rates[rarity.value] > 0)
        .map((rarity) => ({
          booster_id: booster.id,
          rarity: rarity.value,
          weight: rates[rarity.value],
        }));

      const { error: ratesError } = await supabase
        .from('booster_card_rates')
        .insert(rateRows);

      if (ratesError) {
        await supabase.from('boosters').delete().eq('id', booster.id);
        throw ratesError;
      }

      setName('');
      setEnergyCost(5);
      setCardsPerPack(5);
      setRates({
        common: 60,
        uncommon: 25,
        rare: 10,
        epic: 4,
        legendary: 1,
      });

      setMessage('Booster créé avec succès !');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  async function toggleBooster(booster: Booster) {
    setError('');
    setMessage('');

    const { error: updateError } = await supabase
      .from('boosters')
      .update({ is_active: !booster.is_active })
      .eq('id', booster.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage(
      booster.is_active ? 'Booster désactivé.' : 'Booster activé.'
    );

    await loadData();
  }

  return (
    <section className="admin-manager">
      <div className="admin-section-heading">
        <div>
          <h2>Boosters</h2>
          <p>Configure les paquets et leurs probabilités de rareté.</p>
        </div>
        <span>{boosters.length} booster(s)</span>
      </div>

      <form className="admin-manager-form" onSubmit={handleSubmit}>
        <h3>Créer un booster</h3>

        <label>
          Nom du booster
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex : Booster MMI classique"
            required
          />
        </label>

        <label>
          Extension associée
          <select
            value={extensionId}
            onChange={(event) => setExtensionId(event.target.value)}
            required
          >
            <option value="">Choisir une extension</option>
            {extensions.map((extension) => (
              <option key={extension.id} value={extension.id}>
                {extension.name}
              </option>
            ))}
          </select>
        </label>

        <div className="admin-booster-fields">
          <label>
            Prix en énergie
            <input
              type="number"
              min="0"
              step="1"
              value={energyCost}
              onChange={(event) => setEnergyCost(Number(event.target.value))}
            />
          </label>

          <label>
            Cartes par booster
            <input
              type="number"
              min="1"
              max="20"
              step="1"
              value={cardsPerPack}
              onChange={(event) => setCardsPerPack(Number(event.target.value))}
            />
          </label>
        </div>

        <h4>Poids des raretés</h4>
        <p className="admin-help">
          Plus le poids est élevé, plus la rareté a de chances d’être tirée.
          Les valeurs sont des poids relatifs, pas des pourcentages directs.
        </p>

        <div className="admin-rates-grid">
          {rarities.map((rarity) => (
            <label key={rarity.value}>
              {rarity.label}
              <input
                type="number"
                min="0"
                step="1"
                value={rates[rarity.value]}
                onChange={(event) =>
                  updateRate(rarity.value, Number(event.target.value))
                }
              />
            </label>
          ))}
        </div>

        <p className="admin-help">
          Total des poids :{' '}
          {Object.values(rates).reduce((total, value) => total + value, 0)}
        </p>

        <button type="submit" disabled={loading || extensions.length === 0}>
          {loading ? 'Création...' : 'Créer le booster'}
        </button>

        {extensions.length === 0 && (
          <p className="admin-help">
            Crée d’abord une extension active pour pouvoir lui associer un booster.
          </p>
        )}

        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}
      </form>

      <div className="admin-extension-list">
        <h3>Boosters existants</h3>

        {boosters.length === 0 && (
          <p>Aucun booster pour le moment.</p>
        )}

        {boosters.map((booster) => {
          const extension = extensions.find(
            (item) => item.id === booster.extension_id
          );

          return (
            <article className="admin-extension-item" key={booster.id}>
              <div className="admin-extension-info">
                <strong>{booster.name}</strong>
                <span>{extension?.name ?? 'Extension associée'}</span>
                <span>
                  {booster.energy_cost} énergie · {booster.cards_per_pack} cartes
                </span>
                <span>
                  {booster.is_active ? 'Actif' : 'Désactivé'}
                </span>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() => toggleBooster(booster)}
              >
                {booster.is_active ? 'Désactiver' : 'Activer'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
