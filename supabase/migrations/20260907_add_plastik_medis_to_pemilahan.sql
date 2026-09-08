-- Migration: Add plastik_kg and medis_kg to pemilahan_sampah
-- Allows sorting to track: Organik, Residu, Plastik, Kardus, Kaca, Besi, and Medis

alter table public.pemilahan_sampah
  add column if not exists plastik_kg numeric(12,2) not null default 0 check (plastik_kg >= 0),
  add column if not exists medis_kg numeric(12,2) not null default 0 check (medis_kg >= 0);

-- Update anorganik breakdown constraint safely
do $$
declare
  r record;
begin
  for r in (
    select conname
    from pg_constraint
    where conrelid = 'public.pemilahan_sampah'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%anorganik_kg%'
      and pg_get_constraintdef(oid) like '%kardus_kg%'
  ) loop
    execute 'alter table public.pemilahan_sampah drop constraint if exists ' || quote_ident(r.conname);
  end loop;
end $$;

alter table public.pemilahan_sampah
  add constraint check_pemilahan_anorganik_breakdown
  check (plastik_kg + kardus_kg + kaca_kg + besi_kg + medis_kg + anorganik_lainnya_kg <= anorganik_kg);
