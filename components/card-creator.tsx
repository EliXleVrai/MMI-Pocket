'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Extension = {
  id: string;
  name: string;
};

type Rarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary';

export function CardCreator() {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [extensionId, setExtensionId] = useState('');
  const [rarity, setRarity] = useState<Rarity>('common');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loadingExtensions, setLoadingExtensions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadExtensions() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('extensions')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) {
        setError('Impossible de charger les extensions.');
      } else {
        setExtensions(data ?? []);
        if (data?.length) setExtensionId(data[0].id);
      }

      setLoadingExtensions(false);
    }

    loadExtensions();
  }, []);

  function handleImageChange(file: File | null) {
    setError('');
    setMessage('');

    if (!file) {
      setImageFile(null);
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];

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

  async function createCard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

    if (imageUrl.trim()) {
      try {
        const parsedUrl = new URL(imageUrl.trim());
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          throw new Error('URL invalide');
        }
      } catch {
        setError('Entre une URL d’image valide.');
        return;
      }
    }

    setSaving(true);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('Tu dois être connecté.');
      setSaving(false);
      return;
    }

    let finalImageUrl = imageUrl.trim() || null;

    if (imageFile) {
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
        setError(`Échec de l’importation : ${uploadError.message}`);
        setSaving(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('card-images')
        .getPublicUrl(filePath);

      finalImageUrl = publicUrlData.publicUrl;
    }

    const { data: lastCard, error: numberError } = await supabase
      .from('cards')
      .select('card_number')
      .eq('extension_id', extensionId)
      .not('card_number', 'is', null)
      .order('card_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (numberError) {
      setError('Impossible de déterminer le prochain numéro.');
      setSaving(false);
      return;
    }

    const nextNumber = (lastCard?.card_number ?? 0) + 1;

    const { error: insertError } = await supabase
      .from('cards')
      .insert({
        extension_id: extensionId,
        name: name.trim(),
        description: description.trim() || null,
        image_url: finalImageUrl,
        rarity,
        card_number: nextNumber,
        is_active: true,
      });

    if (insertError) {
      setError(`Impossible de créer la carte : ${insertError.message}`);
      setSaving(false);
      return;
    }

    setMessage(`Carte créée avec succès ! Numéro : ${nextNumber}`);
    setName('');
    setDescription('');
    setRarity('common');
    setImageUrl('');
    setImageFile(null);

    const fileInput = document.getElementById(
      'card-image-file'
    ) as HTMLInputElement | null;

    if (fileInput) fileInput.value = '';

    setSaving(false);
  }

  const previewUrl = imageFile
    ? URL.createObjectURL(imageFile)
    : imageUrl.trim();

  return (
    <section className="profile-card">
      <h2>Créer une carte</h2>
      <p>Ajoute une nouvelle carte à une extension de MMI Pocket.</p>

      <form onSubmit={createCard} className="card-creator-form">
        <label htmlFor="card-name">Nom de la carte</label>
        <input
          id="card-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex. Le Développeur"
          maxLength={100}
          required
        />

        <label htmlFor="card-description">Description</label>
        <textarea
          id="card-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Raconte l’histoire de cette carte..."
          rows={4}
        />

        <label htmlFor="card-extension">Extension</label>
        <select
          id="card-extension"
          value={extensionId}
          onChange={(event) => setExtensionId(event.target.value)}
          disabled={loadingExtensions || extensions.length === 0}
          required
        >
          {loadingExtensions && <option>Chargement...</option>}
          {!loadingExtensions && extensions.length === 0 && (
            <option value="">Aucune extension disponible</option>
          )}
          {extensions.map((extension) => (
            <option key={extension.id} value={extension.id}>
              {extension.name}
            </option>
          ))}
        </select>

        <label htmlFor="card-rarity">Rareté</label>
        <select
          id="card-rarity"
          value={rarity}
          onChange={(event) => setRarity(event.target.value as Rarity)}
        >
          <option value="common">Commune</option>
          <option value="uncommon">Peu commune</option>
          <option value="rare">Rare</option>
          <option value="epic">Épique</option>
          <option value="legendary">Légendaire</option>
        </select>

        <label htmlFor="card-image-file">Importer une image</label>
        <input
          id="card-image-file"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) =>
            handleImageChange(event.target.files?.[0] ?? null)
          }
        />
        <small>PNG, JPG ou WEBP — 5 Mo maximum.</small>

        <label htmlFor="card-image-url">Ou utiliser une URL</label>
        <input
          id="card-image-url"
          type="url"
          value={imageUrl}
          onChange={(event) => {
            setImageUrl(event.target.value);
            if (event.target.value) setImageFile(null);
          }}
          placeholder="https://exemple.com/image.png"
        />

        {previewUrl && (
          <div className="card-image-preview">
            <p>Aperçu de l’illustration</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Aperçu de la carte"
              onError={() => setError('Impossible de charger cette image.')}
            />
          </div>
        )}

        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}

        <button
          type="submit"
          className="button-primary"
          disabled={saving || loadingExtensions || extensions.length === 0}
        >
          {saving ? 'Création en cours...' : 'Créer la carte'}
        </button>
      </form>
    </section>
  );
}
