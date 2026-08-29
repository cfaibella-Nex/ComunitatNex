-- ═══════════════════════════════════════════════════════════════
-- Comunitat NexSocial · schema Postgres (Supabase)
-- Executa aquest fitxer sencer una vegada a l'SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════

-- ── EVENTS ────────────────────────────────────────────────
create table if not exists public.events (
  id           text primary key,
  tipo         text not null check (tipo in ('mensual','taller','esdeveniment')),
  titol        jsonb not null,           -- { ca, es }
  descripcio   jsonb not null,
  entitat      jsonb,                    -- { ca, es }
  ubicacio     jsonb,                    -- { ca, es }
  mapa_url     text,
  data         date,
  hora         text,
  durada       integer default 90,
  cupo         integer not null default 20 check (cupo >= 0),
  preu_cents   integer not null default 0 check (preu_cents >= 0),
  tipo_iva     text default 'exempt' check (tipo_iva in ('exempt','iva10','iva21')),
  imatge       text,
  estat        text not null default 'actiu' check (estat in ('actiu','proximament','esgotat','arxivat')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_events_data on public.events (data);
create index if not exists idx_events_tipo on public.events (tipo);
create index if not exists idx_events_estat on public.events (estat);

-- Trigger updated_at automàtic
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_events_updated on public.events;
create trigger trg_events_updated before update on public.events
  for each row execute function public.set_updated_at();

-- ── RESERVES ──────────────────────────────────────────────
create table if not exists public.reserves (
  id          text primary key,          -- NX-XXXXXX visible per l'usuari
  event_id    text not null references public.events(id) on delete restrict,
  nom         text not null,
  telefon     text not null,
  email       text,
  places      integer not null check (places > 0),
  notes       text,
  preu_cents  integer not null default 0,
  total_cents integer not null default 0,
  status      text not null default 'pending'
              check (status in ('pending','confirmed','cancelled','attended','no-show')),
  lang        text default 'ca',
  created_at  timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists idx_reserves_event on public.reserves (event_id, status);
create index if not exists idx_reserves_estat on public.reserves (status, created_at);
create index if not exists idx_reserves_tel   on public.reserves (telefon);

-- ── OCUPACIÓ (RPC) ────────────────────────────────────────
-- Places ocupades d'un event: confirmades + pending recents (hold)
create or replace function public.places_ocupades(
  p_event_id text,
  p_hold_min integer default 60
)
returns integer
language sql
stable
as $$
  select coalesce(sum(places), 0)::int
  from public.reserves
  where event_id = p_event_id
    and ( status in ('confirmed','attended')
       or (status = 'pending' and created_at > now() - (p_hold_min || ' minutes')::interval) );
$$;

-- Ocupació de tots els events d'un cop (per al llistat)
create or replace function public.places_ocupades_totes(
  p_hold_min integer default 60
)
returns table (event_id text, places integer)
language sql
stable
as $$
  select r.event_id, coalesce(sum(r.places), 0)::int
  from public.reserves r
  where r.status in ('confirmed','attended')
     or (r.status = 'pending' and r.created_at > now() - (p_hold_min || ' minutes')::interval)
  group by r.event_id;
$$;

-- ── RECURSOS ──────────────────────────────────────────────
create table if not exists public.recursos (
  id          text primary key,
  categoria   text not null,
  titol       jsonb not null,
  descripcio  jsonb not null,
  tipus       text not null check (tipus in ('guia','video','audio','link')),
  enllac      text not null,
  publicat    boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── RLS ───────────────────────────────────────────────────
-- Amb service_role_key des del backend saltem RLS.
-- Igualment, si es vol activar per lectura pública:
alter table public.events enable row level security;
alter table public.reserves enable row level security;
alter table public.recursos enable row level security;

-- Lectura pública només d'events actius
drop policy if exists "public read active events" on public.events;
create policy "public read active events" on public.events
  for select using (estat in ('actiu','proximament','esgotat'));

-- Recursos publicats són públics
drop policy if exists "public read published resources" on public.recursos;
create policy "public read published resources" on public.recursos
  for select using (publicat = true);

-- Reserves: ningú les pot llegir per anon (només via API admin amb service_role)
-- (per defecte amb RLS on i sense policy, cap select és permès)
