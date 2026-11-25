'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Aperture, ArrowLeftRight, BookOpen, House, LayoutGrid, ShoppingBag, Sparkles, Trophy, UserRound } from 'lucide-react';

const links = [
  { href: '/', label: 'Accueil', icon: House },
  { href: '/collection', label: 'Ma collection', icon: BookOpen },
  { href: '/boosters', label: 'Boosters', icon: Sparkles },
  { href: '/market', label: 'Marché', icon: ShoppingBag },
  { href: '/trades', label: 'Échanges', icon: ArrowLeftRight },
  { href: '/extensions', label: 'Extensions', icon: LayoutGrid },
  { href: '/classement', label: 'Classement', icon: Trophy },
];

export function Sidebar() {
  const pathname = usePathname();
  return <aside className={`sidebar ${pathname === '/login' ? 'sidebar-login-hidden' : ''}`}>
    <Link href="/" className="brand"><span className="brand-mark"><Aperture size={22}/></span><span>MMI<span className="brand-light">Pocket</span><small>PROMO 2026 — 2029</small></span></Link>
    <div className="nav-caption">JOUER</div>
    <nav>{links.map(({href,label,icon:Icon}) => <Link key={href} href={href} className={`nav-link ${pathname === href ? 'active' : ''}`}><Icon size={18}/>{label}{href === '/boosters' && <span className="nav-dot"/>}</Link>)}</nav>
    <div className="sidebar-bottom"><div className="sidebar-promo"><div className="promo-icon"><Sparkles size={18}/></div><strong>La collection MMI</strong><p>Chaque carte raconte un peu de notre promo.</p><span>Découvrir les extensions <span aria-hidden>↗</span></span></div><Link href="/profil" className="profile-link"><span className="avatar"><UserRound size={17}/></span><span><b>Mon profil</b><small>Invité</small></span><span className="profile-more">•••</span></Link></div>
  </aside>;
}
