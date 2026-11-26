
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

type Extension = {
  id: string;
  name: string;
};

type Booster = {
  id: string;
  name: string;
  extension_id: string;
  energy_cost: number;
  cards_per_pack: number;
  is_active: boolean;
};

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

type Rates = Record<Rarity, number>;

const rarityLabels: Record<Rarity, string> = {
  common: 'Commune',
  uncommon: 'Peu commune',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
};

const defaultRates: Rates = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1,
};

export function BoosterManager() {
  const supabase = createClient();

  const [boosters, setBoosters] = useState<Booster[]>([]);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [name, setName] = useState('');
  const [extensionId, setExtensionId] = useState('');
  const [energyCost, setEnergyCost] = useState(5);
  const [cardsPerPack, setCardsPerPack] = useState(5);
  const [rates, setRates] = useState<Rates>(defaultRates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadData() {
    const [boostersResult, extensionsResult] = await Promise.all([
      supabase
        .from('boosters')
        .select('id, name, extension_id, energy_cost, cards_per_pack, is_active')
        .order('created_at', { ascending: false }),
      supabase
        .from('extensions')
        .select('id, name')
        .order('name'),
    ]);

    if (boostersResult.error) {
      setError(boostersResult.error.message);
    } else {
      setBoosters((boostersResult.data ?? []) as Booster[]);
    }

    if (extensionsResult.error) {
      setError(extensionsResult.error.message);
    } else {
      setExtensions((extensionsResult.data ?? []) as Extension[]);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function resetForm() {
    setName('');
    setExtensionId('');
    setEnergyCost(5);
    setCardsPerPack(5);
    setRates(defaultRates);
    setEditingId(null);
  }

  function updateRate(rarity: Rarity, value: number) {
    setRates((current) => ({
      ...current,
      [rarity]: Math.max(0, value),
    }));
  }

  async function startEditing(booster: Booster) {
    setError('');
    setMessage('');
    setLoading(true);

    const { data, error: ratesError } = await supabase
      .from('booster_card_rates')
      .select('rarity, weight')
      .eq('booster_id', booster.id);

    if (ratesError) {
      setError(ratesError.message);
      setLoading(false);
      return;
    }

    const nextRates = { ...defaultRates };

    for (const row of data ?? []) {
      nextRates[row.rarity as Rarity] = row.weight;
    }

    setEditingId(booster.id);
    setName(booster.name);
    setExtensionId(booster.extension_id);
    setEnergyCost(booster.energy_cost);
    setCardsPerPack(booster.cards_per_pack);
    setRates(nextRates);
    setLoading(false);

    document.getElementById('booster-manager-form')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function saveRates(boosterId: string) {
    const rateRows = (Object.entries(rates) as [Rarity, number][])
      .filter(([, weight]) => weight > 0)
      .map(([rarity, weight]) => ({
        booster_id: boosterId,
        rarity,
        weight,
      }));

    if (rateRows.length === 0) {
      throw new Error('Il faut au moins une rareté avec un poids supérieur à zéro.');
    }

    const { error: deleteError } = await supabase
      .from('booster_card_rates')
      .delete()
      .eq('booster_id', boosterId);

    if (deleteError) throw deleteError;

    const { error: insertError } = await supabase
      .from('booster_card_rates')
      .insert(rateRows);

    if (insertError) throw insertError;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const cleanName = name.trim();

      if (!cleanName) {
        throw new Error('Le nom du booster est obligatoire.');
      }

      if (!extensionId) {
        throw new Error('Choisis une extension.');
      }

      if (!Number.isInteger(energyCost) || energyCost < 0) {
        throw new Error('Le coût en énergie doit être un entier positif ou nul.');
      }

      if (!Number.isInteger(cardsPerPack) || cardsPerPack < 1 || cardsPerPack > 20) {
        throw new Error('Le nombre de cartes doit être compris entre 1 et 20.');
      }

      const rateRows = (Object.entries(rates) as [Rarity, number][])
        .filter(([, weight]) => weight > 0);

      if (rateRows.length === 0) {
        throw new Error('Il faut au moins une rareté avec un poids supérieur à zéro.');
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from('boosters')
          .update({
            name: cleanName,
            extension_id: extensionId,
            energy_cost: energyCost,
            cards_per_pack: cardsPerPack,
          })
          .eq('id', editingId);

        if (updateError) throw updateError;

        await saveRates(editingId);
        setMessage('Booster modifié avec succès !');
      } else {
        const { data: booster, error: insertError } = await supabase
          .from('boosters')
          .insert({
            name: cleanName,
            extension_id: extensionId,
            energy_cost: energyCost,
            cards_per_pack: cardsPerPack,
            is_active: true,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        await saveRates(booster.id);
        setMessage('Booster créé avec succès !');
      }

      resetForm();
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

  async function deleteBooster(booster: Booster) {
    const confirmed = window.confirm(
      `Supprimer définitivement le booster "${booster.name}" ?\n\nLes ouvertures déjà effectuées seront conservées. Si son historique empêche la suppression, Supabase bloquera l'opération.`
    );

    if (!confirmed) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error: deleteError } = await supabase
        .from('boosters')
        .delete()
        .eq('id', booster.id);

      if (deleteError) {
        throw new Error(
          'Suppression impossible : ce booster possède probablement un historique d’ouverture. Désactive-le pour le retirer du jeu sans perdre les données.'
        );
      }

      if (editingId === booster.id) resetForm();

      setMessage('Booster supprimé.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de suppression.');
    } finally {
      setLoading(false);
    }
  }

  function extensionName(id: string) {
    return extensions.find((extension) => extension.id === id)?.name
      ?? 'Extension inconnue';
  }

  return (
    <section className="admin-manager">
      <div className="admin-section-heading">
        <div>
          <h2>Boosters</h2>
          <p>Configure les paquets et leurs probabilités de tirage.</p>
        </div>
        <span>{boosters.length} booster(s)</span>
      </div>

      <form
        id="booster-manager-form"
        className="admin-manager-form"
        onSubmit={handleSubmit}
      >
        <h3>{editingId ? 'Modifier un booster' : 'Créer un booster'}</h3>

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
            Coût en énergie
            <input
              type="number"
              min="0"
              step="1"
              value={energyCost}
              onChange={(event) => setEnergyCost(Number(event.target.value))}
              required
            />
          </label>

          <label>
            Cartes par paquet
            <input
              type="number"
              min="1"
              max="20"
              step="1"
              value={cardsPerPack}
              onChange={(event) => setCardsPerPack(Number(event.target.value))}
              required
            />
          </label>
        </div>

        <div className="admin-rates-section">
          <h4>Probabilités de rareté</h4>
          <p>
            Les valeurs sont des poids relatifs : elles ne représentent pas
            directement des pourcentages.
          </p>

          <div className="admin-rates-grid">
            {(Object.keys(rarityLabels) as Rarity[]).map((rarity) => (
              <label key={rarity}>
                {rarityLabels[rarity]}
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={rates[rarity]}
                  onChange={(event) =>
                    updateRate(rarity, Number(event.target.value))
                  }
                />
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading || extensions.length === 0}>
          {loading
            ? 'Enregistrement...'
            : editingId
              ? 'Enregistrer les modifications'
              : 'Créer le booster'}
        </button>

        {editingId && (
          <button
            type="button"
            className="secondary-button"
            onClick={resetForm}
          >
            Annuler la modification
          </button>
        )}

        {extensions.length === 0 && (
          <p className="form-error">
            Crée d'abord une extension pour pouvoir créer un booster.
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

        {boosters.map((booster) => (
          <article className="admin-extension-item" key={booster.id}>
            <div className="admin-extension-placeholder">🎁</div>

            <div className="admin-extension-info">
              <strong>{booster.name}</strong>
              <span>{extensionName(booster.extension_id)}</span>
              <span>
                ⚡ {booster.energy_cost} · {booster.cards_per_pack} cartes
              </span>
              <span>{booster.is_active ? 'Actif' : 'Désactivé'}</span>
            </div>

            <div className="admin-extension-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => void startEditing(booster)}
                disabled={loading}
              >
                Modifier
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => void toggleBooster(booster)}
                disabled={loading}
              >
                {booster.is_active ? 'Désactiver' : 'Activer'}
              </button>

              <button
                type="button"
                className="admin-delete-button"
                onClick={() => void deleteBooster(booster)}
                disabled={loading}
              >
                Supprimer
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
