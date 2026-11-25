
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

import {
  Aperture,
  ArrowLeftRight,
  BookOpen,
  House,
  LayoutGrid,
  ShoppingBag,
  Sparkles,
  Trophy,
  UserRound,
  LogOut,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

type PlayerProfile = {
  username: string | null;
  display_name: string | null;
};

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
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function loadUser() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!active) return;

      setUser(currentUser);

      if (currentUser) {
        const { data } = await supabase
          .from('profiles')
          .select('username, display_name')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (!active) return;

        setProfile(data);
      } else {
        setProfile(null);
      }

      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const displayName =
    profile?.username ||
    profile?.display_name ||
    user?.email ||
    'Joueur';

  return (
    <aside
      className={`sidebar ${
        pathname === '/login' ? 'sidebar-login-hidden' : ''
      }`}
    >
      <Link href="/" className="brand">
        <span className="brand-mark">
          <Aperture size={22} />
        </span>

        <span>
          MMI<span className="brand-light">Pocket</span>
          <small>PROMO 2026 — 2029</small>
        </span>
      </Link>

      <div className="nav-caption">JOUER</div>

      <nav>
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`nav-link ${
              pathname === href ? 'active' : ''
            }`}
          >
            <Icon size={18} />
            {label}
            {href === '/boosters' && (
              <span className="nav-dot" />
            )}
          </Link>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-promo">
          <div className="promo-icon">
            <Sparkles size={18} />
          </div>

          <strong>La collection MMI</strong>
          <p>
            Chaque carte raconte un peu de notre promo.
          </p>

          <span>
            Découvrir les extensions ↗
          </span>
        </div>

        <Link href="/profil" className="profile-link">
          <span className="avatar">
            <UserRound size={17} />
          </span>

          <span>
            <b>
              {loading ? 'Chargement...' : displayName}
            </b>

            <small>
              {loading
                ? ' '
                : user
                  ? 'Connecté'
                  : 'Invité'}
            </small>
          </span>
        </Link>

        {user && (
          <button
            type="button"
            onClick={logout}
            className="logout-button"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        )}
      </div>
    </aside>
  );
}
