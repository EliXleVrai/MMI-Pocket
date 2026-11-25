import Link from 'next/link';
import { Aperture, ArrowLeft } from 'lucide-react';
import { LoginButtons } from '@/components/login-buttons';

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-panel">
        <Link href="/" className="login-back">
          <ArrowLeft size={15} /> Retour à l&apos;accueil
        </Link>

        <div className="login-brand">
          <span className="brand-mark"><Aperture size={23} /></span>
          <span>MMI<span className="brand-light">Pocket</span></span>
        </div>

        <div className="eyebrow">
          <span className="eyebrow-dot" /> TA COLLECTION COMMENCE ICI
        </div>

        <h1>Entre dans<br /><span>le jeu.</span></h1>

        <p className="login-intro">
          Connecte-toi pour collectionner les cartes de la promo MMI 2026–2029.
        </p>

        <LoginButtons />

        <p className="login-legal">
          En continuant, tu acceptes les règles d&apos;utilisation de MMI Pocket.
        </p>
      </div>

      <div className="login-visual">
        <div className="login-visual-glow" />
        <div className="login-visual-card">
          ✳<small>MMI POCKET · 001</small>
        </div>
        <span className="login-visual-caption">COLLECT • TRADE • REPEAT</span>
      </div>
    </div>
  );
}
