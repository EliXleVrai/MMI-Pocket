
'use client';

import { useEffect, useState } from 'react';
import { Bolt } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type EnergyData = {
  energy: number;
  max_energy: number;
  next_energy_at: string | null;
};

export function HomeEnergyDisplay({
  initialEnergy,
  initialMaxEnergy,
}: {
  initialEnergy: number;
  initialMaxEnergy: number;
}) {
  const [supabase] = useState(() => createClient());

  const [energy, setEnergy] = useState(initialEnergy);
  const [maxEnergy, setMaxEnergy] = useState(initialMaxEnergy);
  const [nextEnergyAt, setNextEnergyAt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    let active = true;

    async function refreshEnergy() {
      const { data, error } = await supabase.rpc(
        'recharge_player_energy'
      );

      if (error || !data || !active) return;

      const result = data as EnergyData;

      setEnergy(result.energy);
      setMaxEnergy(result.max_energy);
      setNextEnergyAt(result.next_energy_at);
    }

    void refreshEnergy();

    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!nextEnergyAt || energy >= maxEnergy) {
      setCountdown('');
      return;
    }

    let refreshing = false;

    async function refreshEnergy() {
      if (refreshing) return;

      refreshing = true;

      const { data, error } = await supabase.rpc(
        'recharge_player_energy'
      );

      if (!error && data) {
        const result = data as EnergyData;

        setEnergy(result.energy);
        setMaxEnergy(result.max_energy);
        setNextEnergyAt(result.next_energy_at);
      }

      refreshing = false;
    }

    function updateCountdown() {
      const remaining = Math.max(
        0,
        Math.ceil(
          (new Date(nextEnergyAt!).getTime() - Date.now()) / 1000
        )
      );

      if (remaining <= 0) {
        void refreshEnergy();
        return;
      }

      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;

      setCountdown(
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    }

    updateCountdown();

    const timer = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(timer);
  }, [nextEnergyAt, energy, maxEnergy, supabase]);

  const percentage =
    maxEnergy > 0
      ? Math.min(100, (energy / maxEnergy) * 100)
      : 0;

  return (
    <article className="home-resource-card energy">
      <div className="home-resource-icon">
        <Bolt size={21} />
      </div>

      <div>
        <span>ÉNERGIE</span>

        <strong>
          {energy} / {maxEnergy}
        </strong>

        <small>
          {energy >= maxEnergy
            ? 'Énergie maximale'
            : countdown
              ? `Prochaine énergie dans ${countdown}`
              : 'Calcul de la recharge...'}
        </small>
      </div>

      <div className="home-resource-progress">
        <span style={{ width: `${percentage}%` }} />
      </div>
    </article>
  );
}
