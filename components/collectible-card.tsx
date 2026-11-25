import { Star } from 'lucide-react';

type Collectible = { name:string; type:string; rarity:string; number:string; gradient:string; symbol:string };
export function CollectibleCard({card}:{card:Collectible}) {
  return <article className={`collectible ${card.gradient}`}><div className="collectible-top"><span>{card.type}</span><span className="rarity"><Star size={11} fill="currentColor"/> {card.rarity}</span></div><div className="art-window"><div className="art-orbit"/><div className="art-symbol">{card.symbol}</div><div className="art-spark">✦</div></div><div className="collectible-bottom"><div><h3>{card.name}</h3><p>MMI Pocket · {card.number}</p></div><span className="card-shine">✧</span></div></article>;
}
