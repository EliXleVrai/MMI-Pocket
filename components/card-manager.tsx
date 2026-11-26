
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RarityBadge } from '@/components/rarity-badge';

type Rarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary';

type Genre = 'Terrain' | 'Personnage' | 'Objet';

type Card = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  rarity: Rarity;
  genre: Genre;
  card_number: number | null;
  extension_id: string;
  is_active: boolean;
  buyback_price: number;
};

type Extension = {
  id: string;
  name: string;
};

export function CardManager() {
  const supabase = createClient();

  const [cards, setCards] = useState<Card[]>([]);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [extensionId, setExtensionId] = useState('');
  const [rarity, setRarity] = useState<Rarity>('common');
  const [genre, setGenre] = useState<Genre>('Personnage');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [buybackPrice, setBuybackPrice] = useState('0');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');

    const [cardResult, extensionResult] = await Promise.all([
      supabase
        .from('cards')
        .select(
          'id, name, description, image_url, rarity, genre, card_number, extension_id, is_active, buyback_price'
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
    setExtensions(extensionResult.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function startEditing(card: Card) {
    setEditingCard(card);
    setName(card.name);
    setDescription(card.description ?? '');
    setExtensionId(card.extension_id);
    setRarity(card.rarity);
    setGenre(card.genre ?? 'Personnage');
    setImageUrl(card.image_url ?? '');
    setImageFile(null);
    setBuybackPrice(String(card.buyback_price ?? 0));
    setError('');
    setMessage('');

    document.getElementById('card-edit-form')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  function cancelEditing() {
    setEditingCard(null);
    setImageFile(null);
    setError('');
    setMessage('');
  }

  function handleImageChange(file: File | null) {
    setError('');
    setMessage('');

    if (!file) {
      setImageFile(null);
      return;
    }

    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Format invalide. Utilise PNG, JPG ou WEBP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('L’image ne doit pas dépasser 5 Mo.');
      return;
    }

    setImageFile(file);
    setImageUrl('');
  }

  async function saveCard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingCard) return;

    setError('');
    setMessage('');

    if (!extensionId) {
      setError('Choisis une extension.');
      return;
    }

    if (!imageFile && !imageUrl.trim()) {
      setError('Ajoute une image ou une URL.');
      return;
    }

    const parsedBuybackPrice = Number(buybackPrice);

    if (
      !Number.isFinite(parsedBuybackPrice) ||
      parsedBuybackPrice < 0
    ) {
      setError('Le prix de rachat doit être un nombre positif ou nul.');
      return;
    }

    if (imageUrl.trim()) {
      try {
        const parsed = new URL(imageUrl.trim());

        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error();
        }
      } catch {
        setError('Entre une URL d’image valide.');
        return;
      }
    }

    setSaving(true);

    let finalImageUrl = imageUrl.trim();

    if (imageFile) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Tu dois être connecté.');
        setSaving(false);
        return;
      }

      const extension = imageFile.type === 'image/png'
        ? 'png'
        : imageFile.type === 'image/webp'
          ? 'webp'
          : 'jpg';

      const filePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('card-images')
        .upload(filePath, imageFile, {
          contentType: imageFile.type,
          upsert: false,
        });

      if (uploadError) {
        setError(`Échec de l'importation : ${uploadError.message}`);
        setSaving(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('card-images')
        .getPublicUrl(filePath);

      finalImageUrl = publicUrlData.publicUrl;
    }

    const { error: updateError } = await supabase
      .from('cards')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        extension_id: extensionId,
        rarity,
        genre,
        image_url: finalImageUrl,
        buyback_price: Math.floor(parsedBuybackPrice),
      })
      .eq('id', editingCard.id);

    if (updateError) {
      setError(`Impossible de modifier la carte : ${updateError.message}`);
      setSaving(false);
      return;
    }

    setMessage('Carte modifiée avec succès !');
    setEditingCard(null);
    setImageFile(null);
    setSaving(false);

    await loadData();
  }

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

  async function deleteCard(card: Card) {
    const confirmed = window.confirm(
      `Supprimer définitivement "${card.name}" ? Cette action est irréversible.`
    );

    if (!confirmed) return;

    setError('');
    setMessage('');

    const { error: deleteError } = await supabase
      .from('cards')
      .delete()
      .eq('id', card.id);

    if (deleteError) {
      setError(
        `Suppression impossible : ${deleteError.message}. ` +
        'Cette carte est peut-être utilisée dans une collection ou un historique.'
      );
      return;
    }

    setMessage('Carte supprimée définitivement.');

    if (editingCard?.id === card.id) {
      cancelEditing();
    }

    await loadData();
  }

  const previewUrl = imageFile
    ? URL.createObjectURL(imageFile)
    : imageUrl.trim();

  return (
    <section className="admin-manager">
      <div className="admin-section-heading">
        <div>
          <h2>Cartes</h2>
          <p>
            Modifie, active, désactive ou supprime les cartes du jeu.
          </p>
        </div>

        <span>{cards.length} carte(s)</span>
      </div>

      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-success">{message}</p>}

      {editingCard && (
        <form
          id="card-edit-form"
          className="admin-manager-form"
          onSubmit={saveCard}
        >
          <h3>Modifier une carte</h3>

          <label htmlFor="edit-card-name">
            Nom de la carte
          </label>

          <input
            id="edit-card-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
          />

          <label htmlFor="edit-card-description">
            Description
          </label>

          <textarea
            id="edit-card-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />

          <label htmlFor="edit-card-extension">
            Extension
          </label>

          <select
            id="edit-card-extension"
            value={extensionId}
            onChange={(e) => setExtensionId(e.target.value)}
            required
          >
            {extensions.map((extension) => (
              <option key={extension.id} value={extension.id}>
                {extension.name}
              </option>
            ))}
          </select>

          <label htmlFor="edit-card-rarity">
            Rareté
          </label>

          <select
            id="edit-card-rarity"
            value={rarity}
            onChange={(e) => setRarity(e.target.value as Rarity)}
          >
            <option value="common">Commune</option>
            <option value="uncommon">Peu commune</option>
            <option value="rare">Rare</option>
            <option value="epic">Épique</option>
            <option value="legendary">Légendaire</option>
          </select>

          <RarityBadge rarity={rarity} />

          <label htmlFor="edit-card-genre">
            Genre de la carte
          </label>

          <select
            id="edit-card-genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value as Genre)}
          >
            <option value="Terrain">Terrain</option>
            <option value="Personnage">Personnage</option>
            <option value="Objet">Objet</option>
          </select>

          <div className="buyback-price-field">
            <label htmlFor="edit-card-buyback">
              Prix de rachat par le serveur (pièces)
            </label>

            <input
              id="edit-card-buyback"
              type="number"
              min="0"
              step="1"
              value={buybackPrice}
              onChange={(e) => setBuybackPrice(e.target.value)}
              required
            />

            <small>
              Nombre de pièces que le serveur versera lorsqu’un joueur
              vendra cette carte.
            </small>
          </div>

          <label htmlFor="edit-card-image-file">
            Importer une nouvelle image
          </label>

          <input
            id="edit-card-image-file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) =>
              handleImageChange(e.target.files?.[0] ?? null)
            }
          />

          <small>PNG, JPG ou WEBP — 5 Mo maximum.</small>

          <label htmlFor="edit-card-image-url">
            Ou utiliser une URL
          </label>

          <input
            id="edit-card-image-url"
            type="url"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              if (e.target.value) setImageFile(null);
            }}
            placeholder="https://exemple.com/image.png"
          />

          {previewUrl && (
            <div className="card-image-preview">
              <p>Aperçu de l&apos;image</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Aperçu de la carte" />
            </div>
          )}

          <div className="admin-extension-actions">
            <button
              type="submit"
              className="button-primary"
              disabled={saving}
            >
              {saving
                ? 'Enregistrement...'
                : 'Enregistrer les modifications'}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={cancelEditing}
            >
              Annuler
            </button>
          </div>
        </form>
      )}

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
                /* eslint-disable-next-line @next/next/no-img-element */
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

                <RarityBadge rarity={card.rarity} />

                <span className="admin-card-genre">
                  {card.genre ?? 'Personnage'}
                </span>

                <span className="admin-card-buyback">
                  <strong>Rachat serveur :</strong>{' '}
                  {card.buyback_price ?? 0} pièces
                </span>

                <span>
                  {card.card_number !== null
                    ? `N° ${card.card_number}`
                    : 'Sans numéro'}
                </span>

                {card.description && <p>{card.description}</p>}

                <span>
                  {card.is_active ? 'Active' : 'Désactivée'}
                </span>
              </div>

              <div className="admin-extension-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => startEditing(card)}
                >
                  Modifier
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => toggleCard(card)}
                >
                  {card.is_active ? 'Désactiver' : 'Réactiver'}
                </button>

                <button
                  type="button"
                  className="admin-delete-button"
                  onClick={() => deleteCard(card)}
                >
                  Supprimer
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
