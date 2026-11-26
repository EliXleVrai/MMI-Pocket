
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Props = {
  cardId: string;
  currentUserId: string;
  initialIsFavorite: boolean;
};

export function MarketFavoriteButton({
  cardId,
  currentUserId,
  initialIsFavorite,
}: Props) {
  const supabase = createClient();

  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function toggleFavorite() {
    if (loading) return;

    setLoading(true);
    setErrorMessage('');

    if (isFavorite) {
      const { error } = await supabase
        .from('market_favorites')
        .delete()
        .eq('user_id', currentUserId)
        .eq('card_id', cardId);

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setIsFavorite(false);
    } else {
      const { error } = await supabase
        .from('market_favorites')
        .insert({
          user_id: currentUserId,
          card_id: cardId,
        });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setIsFavorite(true);
    }

    setLoading(false);
  }

  return (
    <div style={{ marginTop: 18 }}>
      <button
        type="button"
        onClick={toggleFavorite}
        disabled={loading}
        aria-pressed={isFavorite}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 9,
          padding: '11px 18px',
          borderRadius: 12,
          border: '1px solid #dce8da',
          background: isFavorite ? '#fff5df' : '#f1f6ef',
          color: isFavorite ? '#a87518' : '#52745b',
          fontWeight: 800,
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        <span style={{ fontSize: 18 }}>
          {isFavorite ? '★' : '☆'}
        </span>
        {loading
          ? 'Chargement...'
          : isFavorite
            ? 'Retirer des favoris'
            : 'Ajouter aux favoris'}
      </button>

      {errorMessage && (
        <p style={{ color: '#c04444', fontSize: 13, marginTop: 8 }}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}
