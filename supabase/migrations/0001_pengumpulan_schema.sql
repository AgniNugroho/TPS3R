-- Skema minimal untuk form petugas: input total sampah (kg) per anggota/dusun.

create table wilayah (
  id bigint generated always as identity primary key,
  nama_dusun text not null,
  kode_wilayah text,
  created_at timestamptz not null default now()
);

create table anggota (
  id bigint generated always as identity primary key,
  nama text not null,
  wilayah_id bigint references wilayah (id) on delete set null,
  alamat text,
  created_at timestamptz not null default now()
);

-- Profil petugas, 1:1 dengan akun Supabase Auth (auth.users).
create table petugas (
  id uuid primary key references auth.users (id) on delete cascade,
  nama text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table pengumpulan (
  id bigint generated always as identity primary key,
  tanggal date not null default current_date,
  anggota_id bigint not null references anggota (id) on delete restrict,
  wilayah_id bigint references wilayah (id) on delete set null,
  petugas_id uuid not null references petugas (id) on delete restrict,
  berat_kg numeric(10, 2) not null check (berat_kg > 0),
  catatan text,
  created_at timestamptz not null default now()
);

create index pengumpulan_anggota_id_idx on pengumpulan (anggota_id);
create index pengumpulan_wilayah_id_idx on pengumpulan (wilayah_id);
create index pengumpulan_tanggal_idx on pengumpulan (tanggal);
create index anggota_wilayah_id_idx on anggota (wilayah_id);

alter table wilayah enable row level security;
alter table anggota enable row level security;
alter table petugas enable row level security;
alter table pengumpulan enable row level security;

-- Petugas yang sudah login boleh baca wilayah & anggota untuk mengisi dropdown form.
create policy "wilayah_select_authenticated" on wilayah
  for select to authenticated using (true);

create policy "anggota_select_authenticated" on anggota
  for select to authenticated using (true);

-- Petugas hanya boleh melihat profilnya sendiri.
create policy "petugas_select_self" on petugas
  for select to authenticated using (id = auth.uid());

-- Petugas yang login boleh mencatat & melihat data pengumpulan, dengan petugas_id = dirinya sendiri.
create policy "pengumpulan_select_authenticated" on pengumpulan
  for select to authenticated using (true);

create policy "pengumpulan_insert_self" on pengumpulan
  for insert to authenticated with check (petugas_id = auth.uid());
