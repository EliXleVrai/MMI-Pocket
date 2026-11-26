
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

type Extension = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  is_active: boolean;
  created_at: string;
};

export function ExtensionManager() {
  const supabase = createClient();

  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadExtensions() {
    const { data, error: fetchError } = await supabase
      .from('extensions')
      .select('id, name, slug, description, cover_url, is_active, created_at')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setExtensions((data ?? []) as Extension[]);
  }

  useEffect(() => {
    loadExtensions();
  }, []);

  function createSlug(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const cleanName = name.trim();

      if (!cleanName) {
        throw new Error('Le nom de l’extension est obligatoire.');
      }

      let coverUrl = imageUrl.trim() || null;

      if (imageFile) {
        if (imageFile.size > 5 * 1024 * 1024) {
          throw new Error('L’image ne doit pas dépasser 5 Mo.');
        }

        if (!['image/png', 'image/jpeg', 'image/webp'].includes(imageFile.type)) {
          throw new Error('Format accepté : PNG, JPG ou WEBP.');
        }

        const extension = imageFile.name.split('.').pop()?.toLowerCase() || 'png';
        const filePath = `extensions/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from('card-images')
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from('card-images')
          .getPublicUrl(filePath);

        coverUrl = publicUrl.publicUrl;
      }

      const baseSlug = createSlug(cleanName);

      if (!baseSlug) {
        throw new Error('Le nom ne permet pas de créer un identifiant valide.');
      }

      let slug = baseSlug;
      let suffix = 2;

      while (true) {
        const { data: existing, error: checkError } = await supabase
          .from('extensions')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();

        if (checkError) throw checkError;
        if (!existing) break;

        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
      }

      const { error: insertError } = await supabase
        .from('extensions')
        .insert({
          name: cleanName,
          slug,
          description: description.trim() || null,
          cover_url: coverUrl,
          is_active: true,
        });

      if (insertError) throw insertError;

      setName('');
      setDescription('');
      setImageUrl('');
      setImageFile(null);
      setMessage('Extension créée avec succès !');

      await loadExtensions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  async function toggleExtension(extension: Extension) {
    setError('');
    setMessage('');

    const { error: updateError } = await supabase
      .from('extensions')
      .update({ is_active: !extension.is_active })
      .eq('id', extension.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage(
      extension.is_active
        ? 'Extension désactivée.'
        : 'Extension activée.'
    );

    await loadExtensions();
  }

  return (
    <section className="admin-manager">
      <div className="admin-section-heading">
        <div>
          <h2>Extensions</h2>
          <p>Crée et gère les différentes collections de cartes.</p>
        </div>
        <span>{extensions.length} extension(s)</span>
      </div>

      <form className="admin-manager-form" onSubmit={handleSubmit}>
        <h3>Créer une extension</h3>

        <label>
          Nom de l’extension
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex : MMI — Première année"
            required
          />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Présente cette extension..."
            rows={3}
          />
        </label>

        <label>
          Image de couverture (URL)
          <input
            type="url"
            value={imageUrl}
            onChange={(event) => {
              setImageUrl(event.target.value);
              setImageFile(null);
            }}
            placeholder="https://..."
          />
        </label>

        <label>
          Ou importer une image depuis ton appareil
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              setImageFile(event.target.files?.[0] ?? null);
              if (event.target.files?.[0]) setImageUrl('');
            }}
          />
        </label>

        {imageFile && (
          <p className="admin-file-name">
            Image sélectionnée : {imageFile.name}
          </p>
        )}

        {imageUrl && (
          <img
            src={imageUrl}
            alt="Aperçu de la couverture"
            className="admin-extension-preview"
          />
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Création...' : 'Créer l’extension'}
        </button>

        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}
      </form>

      <div className="admin-extension-list">
        <h3>Extensions existantes</h3>

        {extensions.length === 0 && (
          <p>Aucune extension pour le moment.</p>
        )}

        {extensions.map((extension) => (
          <article className="admin-extension-item" key={extension.id}>
            {extension.cover_url ? (
              <img
                src={extension.cover_url}
                alt={extension.name}
                className="admin-extension-thumbnail"
              />
            ) : (
              <div className="admin-extension-placeholder">MMI</div>
            )}

            <div className="admin-extension-info">
              <strong>{extension.name}</strong>
              <span>{extension.slug}</span>
              <span>
                {extension.is_active ? 'Active' : 'Désactivée'}
              </span>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={() => toggleExtension(extension)}
            >
              {extension.is_active ? 'Désactiver' : 'Activer'}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
