# MMI Pocket

Jeu de cartes à collectionner communautaire pour la promotion MMI 2026–2029.

## Stack
- Next.js 15 / React 19 / TypeScript
- Supabase Auth + PostgreSQL + Storage
- Lucide React
- Déploiement prévu sur Vercel, code source sur GitHub

## Démarrer en local

```bash
npm install
cp .env.example .env.local
# Renseigner les variables Supabase dans .env.local
npm run dev
```

Ouvrir http://localhost:3000.

## Configuration Supabase

1. Créer un projet sur https://supabase.com.
2. Dans SQL Editor, exécuter `supabase/schema.sql`.
3. Dans Project Settings > API, récupérer Project URL et anon/public key.
4. Les ajouter dans `.env.local` à partir de `.env.example`.
5. Dans Authentication > URL Configuration, définir l'URL locale `http://localhost:3000` et l'URL de production.
6. Configurer Google et Discord dans Authentication > Providers avec leurs identifiants OAuth.

Ne jamais exposer la `service_role` key dans le navigateur ni la committer sur GitHub.

## Déploiement GitHub / Vercel

```bash
git init
git add .
git commit -m "Initialise MMI Pocket"
git branch -M main
git remote add origin https://github.com/TON-COMPTE/mmi-pocket.git
git push -u origin main
```

Importer ensuite le dépôt dans Vercel et ajouter les deux variables d'environnement Supabase.

## État du projet — v0.1.0
- [x] Structure Next.js / TypeScript
- [x] Première interface d'accueil responsive
- [x] Navigation et composants de cartes
- [x] Schéma initial Supabase et politiques RLS de base
- [ ] Authentification Google / Discord et middleware de session
- [ ] Connexion des données réelles Supabase à l'interface
- [ ] Ouverture de boosters transactionnelle et régénération d'énergie
- [ ] Marché et échanges transactionnels
- [ ] Interface d'administration et gestion des rôles

Le tableau de bord contient actuellement des données de démonstration. Les fonctionnalités économiques ne sont pas activées tant que les fonctions RPC sécurisées ne sont pas implémentées.

## Authentification

Une page `/login` et le callback OAuth `/auth/callback` sont inclus. Dans Supabase > Authentication > Providers, activer Google et Discord puis renseigner les Client ID / Client Secret fournis par chaque plateforme. Ajouter `http://localhost:3000/auth/callback` dans les URLs de redirection autorisées (et l'URL de production correspondante).
