import { ArrowRight, Bolt, Coins, Flame, Gift, Plus, Sparkles, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { StatCard } from '@/components/stat-card';
import { CollectibleCard } from '@/components/collectible-card';

const featured = [
  { name:'Le Créatif',type:'DESIGN',rarity:'Épique',number:'001',gradient:'card-lilac',symbol:'✳' },
  { name:'La Nuit de rendu',type:'LIFE MMI',rarity:'Rare',number:'014',gradient:'card-blue',symbol:'☾' },
  { name:'Le Développeur',type:'CODE',rarity:'Légendaire',number:'027',gradient:'card-peach',symbol:'⌘' },
];

export default function Home() {
  return <div className="page-wrap">
    <header className="topbar"><div className="breadcrumb">ESPACE PERSONNEL <span>/</span> ACCUEIL</div><div className="topbar-actions"><button className="icon-button" aria-label="Récompenses"><Gift size={18}/></button><Link href="/login" className="button-secondary top-login">Se connecter</Link></div></header>
    <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot"/> TON UNIVERS MMI</div><h1>Bienvenue dans<br/><span>ta collection.</span></h1><p>Les meilleurs moments de la promo méritent leur propre carte.</p><div className="welcome-actions"><Link href="/boosters" className="button-primary"><Sparkles size={17}/> Ouvrir un booster <ArrowRight size={16}/></Link><Link href="/collection" className="button-secondary">Voir ma collection</Link></div></div><div className="hero-art"><div className="hero-glow"/><div className="hero-card hero-card-back">✳</div><div className="hero-card hero-card-front"><span className="hero-card-label">MMI · ÉDITION 2026</span><div className="hero-card-illustration">✺</div><strong>UNIQUE<br/>EN SON GENRE.</strong><span className="hero-card-number">MMI — 001</span></div><div className="floating-star star-one">✦</div><div className="floating-star star-two">✧</div><div className="floating-pill">COLLECT • TRADE • REPEAT</div></div></section>
    <section className="stats-grid"><StatCard label="ÉNERGIE" value="20 / 20" detail="Recharge dans 30 min" icon={<Bolt size={19}/>} tone="mint"/><StatCard label="PIÈCES" value="1 250" detail="Prêtes à être dépensées" icon={<Coins size={19}/>} tone="peach"/><StatCard label="CARTES" value="0 / 120" detail="Commence ta collection" icon={<Sparkles size={19}/>} tone="blue"/></section>
    <section className="section-block"><div className="section-heading"><div><div className="eyebrow">À COLLECTIONNER</div><h2>Cartes à découvrir <span>✳</span></h2><p>Un aperçu des cartes qui t'attendent.</p></div><Link href="/collection" className="text-link">Toute la collection <ArrowRight size={15}/></Link></div><div className="cards-grid">{featured.map(card=><CollectibleCard key={card.number} card={card}/>)}</div></section>
    <section className="bottom-grid"><div className="daily-card"><div className="daily-icon"><Flame size={20}/></div><div><div className="eyebrow">PETIT RITUEL QUOTIDIEN</div><h3>Un jour, une récompense.</h3><p>Reviens chaque jour pour récupérer des pièces et faire grandir ta collection.</p><button className="button-dark" disabled><Gift size={16}/> Bientôt disponible</button></div><div className="daily-decoration">✳</div></div><div className="activity-card"><div className="activity-title"><h3>Ton activité</h3><TrendingUp size={17}/></div><div className="empty-activity"><div className="empty-icon"><Plus size={19}/></div><strong>Tout commence ici</strong><p>Ouvre ton premier booster pour voir apparaître ton activité.</p></div></div></section>
    <footer className="footer">MMI POCKET <span>FAIT AVEC ♥ POUR LA PROMO MMI 2026—2029</span><span>VERSION 0.1.0</span></footer>
  </div>;
}
