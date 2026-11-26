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
  Shield,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

type PlayerProfile = {
  username: string | null;
  display_name: string | null;
  role: string | null;
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
          .select('username, display_name, role')
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
    profile?.display_name ||
    profile?.username ||
    user?.email ||
    'Joueur';

  const initial = displayName.charAt(0).toUpperCase();
  const isAdmin = profile?.role === 'admin';

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

        {isAdmin && (
          <>
            <div className="nav-caption">ADMINISTRATION</div>

            <Link
              href="/admin"
              className={`nav-link ${
                pathname.startsWith('/admin') ? 'active' : ''
              }`}
            >
              <Shield size={18} />
              Administration
            </Link>
          </>
        )}
      </nav>

      <div className="sidebar-bottom">
        <Link href="/profil" className="profile-link">
          <span className="avatar">
            {loading ? (
              <UserRound size={17} />
            ) : (
              initial
            )}
          </span>

          <span>
            <b>
              {loading ? 'Chargement...' : displayName}
            </b>

            <small>
              {loading
                ? ' '
                : isAdmin
                  ? 'Administrateur'
                  : user
                    ? 'Joueur connecté'
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
