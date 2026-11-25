-- MMI Pocket — schéma initial Supabase
-- À exécuter dans Supabase > SQL Editor. Les actions économiques seront ajoutées via RPC transactionnelles.
create extension if not exists pgcrypto;

create type public.card_rarity as enum ('common','uncommon','rare','epic','legendary');
create type public.listing_status as enum ('active','sold','cancelled');
create type public.trade_status as enum ('pending','accepted','declined','cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  role text not null default 'player' check (role in ('player','admin')),
  created_at timestamptz not null default now()
);

create table public.extensions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  cover_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  extension_id uuid not null references public.extensions(id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  rarity public.card_rarity not null default 'common',
  card_number integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(extension_id, card_number)
);

create table public.boosters (
  id uuid primary key default gen_random_uuid(),
  extension_id uuid not null references public.extensions(id) on delete cascade,
  name text not null,
  energy_cost integer not null default 5 check (energy_cost >= 0),
  cards_per_pack integer not null default 5 check (cards_per_pack between 1 and 20),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.booster_card_rates (
  booster_id uuid not null references public.boosters(id) on delete cascade,
  rarity public.card_rarity not null,
  weight integer not null check (weight > 0),
  primary key(booster_id, rarity)
);

create table public.player_wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  energy integer not null default 20 check (energy >= 0),
  max_energy integer not null default 20 check (max_energy > 0),
  coins bigint not null default 500 check (coins >= 0),
  energy_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.player_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  acquired_at timestamptz not null default now(),
  unique(user_id, card_id)
);

create table public.booster_openings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  booster_id uuid not null references public.boosters(id),
  energy_spent integer not null,
  opened_at timestamptz not null default now()
);

create table public.booster_opening_cards (
  opening_id uuid not null references public.booster_openings(id) on delete cascade,
  card_id uuid not null references public.cards(id),
  primary key(opening_id, card_id)
);

create table public.market_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id),
  card_id uuid not null references public.cards(id),
  quantity integer not null default 1 check (quantity > 0),
  price bigint not null check (price > 0),
  status public.listing_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  proposer_id uuid not null references public.profiles(id),
  recipient_id uuid not null references public.profiles(id),
  status public.trade_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (proposer_id <> recipient_id)
);

create table public.trade_items (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  owner_id uuid not null references public.profiles(id),
  card_id uuid not null references public.cards(id),
  quantity integer not null default 1 check (quantity > 0)
);

create table public.daily_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  claim_date date not null default current_date,
  coins_reward integer not null default 100,
  energy_reward integer not null default 5,
  unique(user_id, claim_date)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Création automatique du profil et du portefeuille à l'inscription.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, username, display_name, avatar_url)
  values (new.id, nullif(new.raw_user_meta_data->>'user_name',''), coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'avatar_url');
  insert into public.player_wallets(user_id) values (new.id);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- RLS : aucun client ne peut s'attribuer des ressources ou modifier les tables économiques directement.
alter table public.profiles enable row level security;
alter table public.extensions enable row level security;
alter table public.cards enable row level security;
alter table public.boosters enable row level security;
alter table public.booster_card_rates enable row level security;
alter table public.player_wallets enable row level security;
alter table public.player_cards enable row level security;
alter table public.booster_openings enable row level security;
alter table public.booster_opening_cards enable row level security;
alter table public.market_listings enable row level security;
alter table public.trades enable row level security;
alter table public.trade_items enable row level security;
alter table public.daily_claims enable row level security;
alter table public.notifications enable row level security;

create policy "Profiles are visible to players" on public.profiles for select to authenticated using (true);
create policy "Players update their own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Empêche un joueur de s'accorder le rôle admin via une mise à jour de profil.
create or replace function public.protect_profile_role() returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() = old.id and new.role is distinct from old.role then
    raise exception 'Le rôle ne peut pas être modifié depuis le profil joueur';
  end if;
  return new;
end;
$$;
create trigger protect_profile_role before update on public.profiles for each row execute procedure public.protect_profile_role();
create policy "Active extensions are public" on public.extensions for select using (is_active = true or exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Active cards are public" on public.cards for select using (is_active = true or exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Active boosters are public" on public.boosters for select using (is_active = true or exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Booster rates are readable" on public.booster_card_rates for select to authenticated using (true);
create policy "Wallet is private" on public.player_wallets for select to authenticated using (auth.uid() = user_id);
create policy "Inventory is private" on public.player_cards for select to authenticated using (auth.uid() = user_id);
create policy "Opening history is private" on public.booster_openings for select to authenticated using (auth.uid() = user_id);
create policy "Opening cards are private" on public.booster_opening_cards for select to authenticated using (exists(select 1 from public.booster_openings o where o.id = opening_id and o.user_id = auth.uid()));
create policy "Active market is public" on public.market_listings for select to authenticated using (status = 'active' or seller_id = auth.uid());
create policy "Trade participants can view trades" on public.trades for select to authenticated using (auth.uid() in (proposer_id, recipient_id));
create policy "Trade items visible to participants" on public.trade_items for select to authenticated using (exists(select 1 from public.trades t where t.id = trade_id and auth.uid() in (t.proposer_id,t.recipient_id)));
create policy "Daily claims are private" on public.daily_claims for select to authenticated using (auth.uid() = user_id);
create policy "Notifications are private" on public.notifications for select to authenticated using (auth.uid() = user_id);

-- Pas de policy INSERT/UPDATE/DELETE côté client pour les portefeuilles, inventaires et transactions.
-- Les opérations seront exposées via des fonctions RPC SECURITY DEFINER vérifiées et transactionnelles.
