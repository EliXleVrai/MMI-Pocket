
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type Props = {
  listingId: string;
  quantityAvailable: number;
  unitPrice: number;
  sellerId: string;
  currentUserId: string;
};

export function MarketCardBuy({
  listingId,
  quantityAvailable,
  unitPrice,
  sellerId,
  currentUserId,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const total = quantity * unitPrice;

  async function buy() {
    if (sellerId === currentUserId) return;

    setLoading(true);
    setMessage('');

    const { error } = await supabase.rpc('buy_market_listing', {
      p_listing_id: listingId,
      p_quantity: quantity,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Achat effectué avec succès !');
    router.refresh();
  }

  if (sellerId === currentUserId) {
    return <span style={{ color: '#829087' }}>Ta propre annonce</span>;
  }

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <select
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        disabled={loading}
        style={{
          padding: '10px',
          borderRadius: 10,
          border: '1px solid #dce8da',
          color: '#355640',
        }}
      >
        {Array.from({ length: quantityAvailable }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>

      <strong style={{ color: '#355640' }}>
        {(total).toLocaleString('fr-FR')} pièces
      </strong>

      <button
        onClick={buy}
        disabled={loading}
        style={{
          background: '#52745b',
          color: 'white',
          border: 'none',
          borderRadius: 10,
          padding: '11px 18px',
          fontWeight: 800,
          cursor: loading ? 'wait' : 'pointer',
        }}
      >
        {loading ? 'Achat...' : 'Acheter'}
      </button>

      {message && (
        <span style={{ width: '100%', fontSize: 13, color: message.includes('succès') ? '#35834b' : '#c04444' }}>
          {message}
        </span>
      )}
    </div>
  );
}
