
type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

const rarityLabels: Record<Rarity, string> = {
  common: 'Commune',
  uncommon: 'Peu commune',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
};

export function RarityBadge({
  rarity,
  showLabel = true,
}: {
  rarity: Rarity;
  showLabel?: boolean;
}) {
  const symbols: Record<Rarity, React.ReactNode> = {
    common: (
      <circle cx="12" cy="12" r="6" className="rarity-symbol-outline" />
    ),
    uncommon: (
      <circle cx="12" cy="12" r="6" className="rarity-symbol-fill" />
    ),
    rare: (
      <>
        <circle cx="8" cy="12" r="4" className="rarity-symbol-fill" />
        <circle cx="17" cy="12" r="4" className="rarity-symbol-fill" />
      </>
    ),
    epic: (
      <path d="M12 3 L21 12 L12 21 L3 12 Z" className="rarity-symbol-fill" />
    ),
    legendary: (
      <>
        <path d="M8 3 L15 10 L8 17 L1 10 Z" className="rarity-symbol-fill" />
        <path d="M17 7 L24 14 L17 21 L10 14 Z" className="rarity-symbol-fill" />
      </>
    ),
  };

  return (
    <span className={`rarity-badge rarity-${rarity}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {symbols[rarity]}
      </svg>
      {showLabel && <span>{rarityLabels[rarity]}</span>}
    </span>
  );
}
