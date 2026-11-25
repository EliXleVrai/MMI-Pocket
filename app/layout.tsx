import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/sidebar';

export const metadata: Metadata = { title: 'MMI Pocket — La collection de la promo', description: 'Collectionne les cartes de la promotion MMI 2026–2029.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body><div className="app-shell"><Sidebar/><main className="main-content">{children}</main></div></body></html>;
}
