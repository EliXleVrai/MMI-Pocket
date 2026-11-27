
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Coins, Gift, ShoppingBag, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type ShopStatus = {
  energy_purchased: number;
  pack5_purchases: number;
  pack10_purchases: number;
  daily_reward_claimed: boolean;
};

type WalletData = {
  coins: number;
  energy: number;
  max_energy: number;
};

export function HomeDailyShop({
  initialCoins,
  initialEnergy,
  initialMaxEnergy,
}: {
  initialCoins: number;
  initialEnergy: number;
  initialMaxEnergy: number;
}) {
  const [supabase] = useState(() => createClient());

  const [coins, setCoins] = useState(initialCoins);
  const [energy, setEnergy] = useState(initialEnergy);
  const [maxEnergy, setMaxEnergy] = useState(initialMaxEnergy);

  const [status, setStatus] = useState<ShopStatus>({
    energy_purchased: 0,
    pack5_purchases: 0,
    pack10_purchases: 0,
    daily_reward_claimed: false,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const remainingEnergy = Math.max(0, maxEnergy - energy);

  const getUnitPrice = (index: number) => {
    if (index < 10) return 250;
    if (index < 20) return 500;
    return 1000;
  };

  const getPackPrice = (amount: number) => {
    let basePrice = 0;

    for (let i = 0; i < amount; i++) {
      basePrice += getUnitPrice(status.energy_purchased + i);
    }

    const discount = amount === 5 ? 0.85 : 0.8;

    return Math.round(basePrice * discount);
  };

  const unitPrice = getUnitPrice(status.energy_purchased);

  const pack5Price = useMemo(
    () => getPackPrice(5),
    [status.energy_purchased]
  );

  const pack10Price = useMemo(
    () => getPackPrice(10),
    [status.energy_purchased]
  );

  async function refreshData() {
    const [statusResult, walletResult] = await Promise.all([
      supabase.rpc('get_daily_shop_status'),
      supabase
        .from('player_wallets')
        .select('coins, energy, max_energy')
        .single(),
    ]);

    if (!statusResult.error && statusResult.data) {
      setStatus(statusResult.data as ShopStatus);
    }

    if (!walletResult.error && walletResult.data) {
      const wallet = walletResult.data as WalletData;

      setCoins(wallet.coins);
      setEnergy(wallet.energy);
      setMaxEnergy(wallet.max_energy);
    }
  }

  useEffect(() => {
    void refreshData();
  }, []);

  async function buyEnergy(amount: 1 | 5 | 10) {
    if (loading) return;

    setLoading(true);
    setMessage('');

    const { data, error } = await supabase.rpc(
      'buy_energy_with_coins',
      { p_pack_size: amount }
    );

    if (error) {
      setMessage(error.message);
      setMessageType('error');
      setLoading(false);
      return;
    }

    const result = data as {
      success?: boolean;
      message?: string;
      error?: string;
    } | null;

    if (result?.success === false) {
      setMessage(result.message || result.error || 'Achat impossible.');
      setMessageType('error');
      setLoading(false);
      return;
    }

    await refreshData();

    setMessage(
      result?.message || `${amount} énergie${amount > 1 ? 's' : ''} achetée${amount > 1 ? 's' : ''} !`
    );
    setMessageType('success');
    setLoading(false);
  }

  async function claimDailyReward() {
    if (loading || status.daily_reward_claimed) return;

    setLoading(true);
    setMessage('');

    const { data, error } = await supabase.rpc('claim_daily_coins');

    if (error) {
      setMessage(error.message);
      setMessageType('error');
      setLoading(false);
      return;
    }

    const result = data as {
      success?: boolean;
      message?: string;
      error?: string;
    } | null;

    if (result?.success === false) {
      setMessage(result.message || result.error || 'Récompense indisponible.');
      setMessageType('error');
      setLoading(false);
      return;
    }

    await refreshData();

    setMessage('100 pièces ajoutées à ton portefeuille !');
    setMessageType('success');
    setLoading(false);
  }

  const pack5LimitReached = status.pack5_purchases >= 5;
  const pack10LimitReached = status.pack10_purchases >= 5;

  return (
    <section className="home-daily-shop">
      <div className="home-daily-shop-header">
        <div className="home-daily-shop-heading">
          <div className="home-daily-shop-icon">
            <ShoppingBag size={22} />
          </div>

          <div>
            <span className="home-section-eyebrow">BOUTIQUE QUOTIDIENNE</span>
            <h2>Les offres du jour</h2>
            <p>Utilise tes pièces pour obtenir de l'énergie.</p>
          </div>
        </div>

        <div className="home-shop-balance">
          <Coins size={17} />
          <strong>{coins.toLocaleString('fr-FR')}</strong>
          <span>pièces</span>
        </div>
      </div>

      <div className="home-shop-energy-info">
        <div>
          <Zap size={17} />
          <span>Ton énergie</span>
        </div>

        <strong>
          {energy} / {maxEnergy}
        </strong>

        <div className="home-shop-energy-bar">
          <span
            style={{
              width: `${maxEnergy > 0 ? (energy / maxEnergy) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      <div className="home-shop-purchase-grid">
        <article className="home-shop-offer">
          <div className="home-shop-offer-top">
            <span className="home-shop-offer-icon">
              <Zap size={20} />
            </span>
            <span className="home-shop-offer-tag">À l'unité</span>
          </div>

          <h3>1 énergie</h3>
          <strong className="home-shop-price">
            {unitPrice.toLocaleString('fr-FR')} pièces
          </strong>

          <p>
            {status.energy_purchased < 10
              ? `${10 - status.energy_purchased} premiers achats à 250 pièces`
              : status.energy_purchased < 20
                ? `${20 - status.energy_purchased} prochains achats à 500 pièces`
                : 'Prix standard : 1 000 pièces'}
          </p>

          <button
            type="button"
            onClick={() => buyEnergy(1)}
            disabled={loading || remainingEnergy < 1 || coins < unitPrice}
          >
            Acheter
          </button>
        </article>

        <article className="home-shop-offer home-shop-offer-highlight">
          <div className="home-shop-offer-top">
            <span className="home-shop-offer-icon">
              <Zap size={20} />
            </span>
            <span className="home-shop-offer-tag">-15 %</span>
          </div>

          <h3>Pack de 5</h3>
          <strong className="home-shop-price">
            {pack5Price.toLocaleString('fr-FR')} pièces
          </strong>

          <p>
            {status.pack5_purchases}/5 achats aujourd'hui
          </p>

          <button
            type="button"
            onClick={() => buyEnergy(5)}
            disabled={
              loading ||
              pack5LimitReached ||
              remainingEnergy < 5 ||
              coins < pack5Price
            }
          >
            {pack5LimitReached ? 'Limite atteinte' : 'Acheter'}
          </button>
        </article>

        <article className="home-shop-offer">
          <div className="home-shop-offer-top">
            <span className="home-shop-offer-icon">
              <Zap size={20} />
            </span>
            <span className="home-shop-offer-tag">-20 %</span>
          </div>

          <h3>Pack de 10</h3>
          <strong className="home-shop-price">
            {pack10Price.toLocaleString('fr-FR')} pièces
          </strong>

          <p>
            {status.pack10_purchases}/5 achats aujourd'hui
          </p>

          <button
            type="button"
            onClick={() => buyEnergy(10)}
            disabled={
              loading ||
              pack10LimitReached ||
              remainingEnergy < 10 ||
              coins < pack10Price
            }
          >
            {pack10LimitReached ? 'Limite atteinte' : 'Acheter'}
          </button>
        </article>
      </div>

      <div className="home-daily-reward">
        <div className="home-daily-reward-icon">
          <Gift size={23} />
        </div>

        <div className="home-daily-reward-text">
          <strong>Cadeau quotidien</strong>
          <span>Récupère gratuitement 100 pièces chaque jour.</span>
        </div>

        <button
          type="button"
          onClick={claimDailyReward}
          disabled={loading || status.daily_reward_claimed}
        >
          {status.daily_reward_claimed ? 'Déjà récupéré' : 'Récupérer'}
        </button>
      </div>

      {message && (
        <div
          className={`home-shop-message ${
            messageType === 'error' ? 'is-error' : 'is-success'
          }`}
        >
          {message}
        </div>
      )}

      <p className="home-shop-reset-info">
        Les limites et le cadeau sont réinitialisés chaque jour à minuit
        (heure de Paris).
      </p>
    </section>
  );
}
