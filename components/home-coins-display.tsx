
'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Coins } from 'lucide-react';
import Link from 'next/link';

export function HomeCoinsDisplay({
  initialCoins,
}: {
  initialCoins: number;
}) {
  const [coins, setCoins] = useState(initialCoins);

  useEffect(() => {
    function handleWalletUpdate(event: Event) {
      const customEvent = event as CustomEvent<{ coins: number }>;

      if (typeof customEvent.detail?.coins === 'number') {
        setCoins(customEvent.detail.coins);
      }
    }

    window.addEventListener('mmi-wallet-updated', handleWalletUpdate);

    return () => {
      window.removeEventListener(
        'mmi-wallet-updated',
        handleWalletUpdate
      );
    };
  }, []);

  return (
    <article className="home-resource-card money">
      <div className="home-resource-icon">
        <Coins size={21} />
      </div>

      <div>
        <span>PIÈCES</span>
        <strong>{coins.toLocaleString('fr-FR')}</strong>
        <small>Ton portefeuille</small>
      </div>

      <Link href="/market" aria-label="Aller au marché">
        <ArrowRight size={18} />
      </Link>
    </article>
  );
}
