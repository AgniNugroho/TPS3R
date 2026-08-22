-- Form kedua: pemilahan jenis sampah, direkap bulanan untuk seluruh desa/TPS3R
-- (tidak dipecah per dusun -- sortir dilakukan setelah sampah semua dusun
-- terkumpul jadi satu di TPS3R).

create table jenis_sampah (
  id bigint generated always as identity primary key,
  nama text not null unique,
  created_at timestamptz not null default now()
);

create table pemilahan (
  id bigint generated always as identity primary key,
  bulan date not null,
  jenis_sampah_id bigint not null references jenis_sampah (id) on delete restrict,
  berat_kg numeric(10, 2) not null check (berat_kg >= 0),
  petugas_id uuid not null references petugas (id) on delete restrict,
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bulan, jenis_sampah_id)
);

create index pemilahan_bulan_idx on pemilahan (bulan);

alter table jenis_sampah enable row level security;
alter table pemilahan enable row level security;

create policy "jenis_sampah_select_authenticated" on jenis_sampah
  for select to authenticated using (true);

create policy "pemilahan_select_authenticated" on pemilahan
  for select to authenticated using (true);

create policy "pemilahan_insert_self" on pemilahan
  for insert to authenticated with check (petugas_id = auth.uid());

-- Rekap kolektif bulanan -- petugas mana pun boleh koreksi angka bulan tsb,
-- bukan cuma yang pertama kali input (beda dengan `pengumpulan` yang append-only).
create policy "pemilahan_update_authenticated" on pemilahan
  for update to authenticated using (true) with check (petugas_id = auth.uid());
