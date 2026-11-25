'use client';
import { createClient } from '@/lib/supabase/client';
import { Chrome, MessageCircle } from 'lucide-react';
import { useState } from 'react';

export function LoginButtons() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  async function signIn(provider: 'google' | 'discord') {
    setLoading(provider); setError('');
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      });
      if (authError) throw authError;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion impossible. Vérifie la configuration Supabase.');
      setLoading(null);
    }
  }
  return <div className="login-actions">
    <button className="login-provider" onClick={() => signIn('google')} disabled={!!loading}><Chrome size={18}/>{loading === 'google' ? 'Redirection…' : 'Continuer avec Google'}</button>
    <button className="login-provider discord" onClick={() => signIn('discord')} disabled={!!loading}><MessageCircle size={18}/>{loading === 'discord' ? 'Redirection…' : 'Continuer avec Discord'}</button>
    {error && <p className="login-error">{error}</p>}
  </div>;
}
