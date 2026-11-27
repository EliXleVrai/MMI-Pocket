
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function DeleteAccountButton() {
  const router = useRouter();
  const supabase = createClient();

  const [isOpen, setIsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    if (confirmation !== 'SUPPRIMER' || isDeleting) return;

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'La suppression a échoué.');
      }

      // La suppression du compte peut déjà avoir invalidé la session.
      await supabase.auth.signOut();

      router.replace('/login?deleted=1');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue.'
      );
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="delete-account-button"
        onClick={() => {
          setConfirmation('');
          setError('');
          setIsOpen(true);
        }}
      >
        Supprimer mon compte
      </button>

      {isOpen && (
        <div
          className="delete-account-overlay"
          onClick={() => {
            if (!isDeleting) setIsOpen(false);
          }}
        >
          <div
            className="delete-account-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
          >
            <div className="delete-account-icon">⚠</div>

            <h2 id="delete-account-title">
              Supprimer définitivement ton compte ?
            </h2>

            <p>
              Cette action est irréversible. Ton compte et les données
              qui lui sont associées seront supprimés.
            </p>

            <ul>
              <li>Ton portefeuille et tes pièces</li>
              <li>Ta collection de cartes</li>
              <li>Ton historique et tes activités</li>
              <li>Tes annonces et échanges du marché</li>
              <li>Tes informations de profil</li>
            </ul>

            <label htmlFor="delete-account-confirmation">
              Écris <strong>SUPPRIMER</strong> pour confirmer :
            </label>

            <input
              id="delete-account-confirmation"
              type="text"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="SUPPRIMER"
              autoComplete="off"
              disabled={isDeleting}
            />

            {error && (
              <p className="delete-account-error">{error}</p>
            )}

            <div className="delete-account-actions">
              <button
                type="button"
                className="delete-account-cancel"
                onClick={() => setIsOpen(false)}
                disabled={isDeleting}
              >
                Annuler
              </button>

              <button
                type="button"
                className="delete-account-confirm"
                onClick={handleDelete}
                disabled={confirmation !== 'SUPPRIMER' || isDeleting}
              >
                {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
