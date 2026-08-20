create extension if not exists pgcrypto;

create table if not exists wilayah (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  dusun text not null,
  rt text,
  rw text,
  jumlah_kk integer default 0,
  jumlah_jiwa integer default 0,
  status text default 'Aktif',
  created_at timestamptz not null default now()
);

create table if not exists petugas (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  nama text not null,
  jabatan text,
  wilayah_id uuid references wilayah(id),
  nomor_hp text,
  status text default 'Aktif',
  created_at timestamptz not null default now()
);

create table if not exists sampah_masuk (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null default current_date,
  petugas_id uuid references petugas(id),
  asal_sampah text not null,
  wilayah_id uuid references wilayah(id),
  total_berat_kg numeric(12,2) not null check (total_berat_kg >= 0),
  keterangan text,
  created_at timestamptz not null default now()
);

create table if not exists pemilahan_sampah (
  id uuid primary key default gen_random_uuid(),
  sampah_masuk_id uuid not null references sampah_masuk(id) on delete cascade,
  tanggal date not null default current_date,
  organik_kg numeric(12,2) not null default 0 check (organik_kg >= 0),
  anorganik_kg numeric(12,2) not null default 0 check (anorganik_kg >= 0),
  residu_kg numeric(12,2) not null default 0 check (residu_kg >= 0),
  kardus_kg numeric(12,2) not null default 0 check (kardus_kg >= 0),
  kaca_kg numeric(12,2) not null default 0 check (kaca_kg >= 0),
  besi_kg numeric(12,2) not null default 0 check (besi_kg >= 0),
  anorganik_lainnya_kg numeric(12,2) not null default 0 check (anorganik_lainnya_kg >= 0),
  keterangan text,
  created_at timestamptz not null default now(),
  check (organik_kg + anorganik_kg + residu_kg >= 0),
  check (kardus_kg + kaca_kg + besi_kg + anorganik_lainnya_kg <= anorganik_kg)
);

create index if not exists idx_sampah_masuk_asal on sampah_masuk (asal_sampah);
create index if not exists idx_sampah_masuk_tanggal on sampah_masuk (tanggal);
create index if not exists idx_pemilahan_sampah_masuk on pemilahan_sampah (sampah_masuk_id);

create or replace function validate_pemilahan_sampah()
returns trigger language plpgsql as $$
declare total_masuk numeric(12,2);
begin
  select total_berat_kg into total_masuk from sampah_masuk where id = new.sampah_masuk_id;
  if total_masuk is null or new.organik_kg + new.anorganik_kg + new.residu_kg <> total_masuk then
    raise exception 'Total pemilahan harus sama dengan total sampah masuk';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_pemilahan_before_insert on pemilahan_sampah;
create trigger validate_pemilahan_before_insert
before insert or update on pemilahan_sampah
for each row execute function validate_pemilahan_sampah();

create table if not exists pengumpulan (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null default current_date,
  petugas_id uuid references petugas(id),
  wilayah_id uuid references wilayah(id),
  jumlah_rumah_dilayani integer default 0,
  organik_kg numeric(12,2) default 0,
  plastik_kg numeric(12,2) default 0,
  kertas_kg numeric(12,2) default 0,
  logam_kg numeric(12,2) default 0,
  kaca_kg numeric(12,2) default 0,
  residu_kg numeric(12,2) default 0,
  total_kg numeric(12,2) generated always as (organik_kg + plastik_kg + kertas_kg + logam_kg + kaca_kg + residu_kg) stored,
  foto_url text,
  keterangan text,
  created_at timestamptz not null default now()
);

create table if not exists bank_sampah (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null default current_date,
  nasabah_id text,
  nama_nasabah text,
  jenis_sampah text,
  berat_kg numeric(12,2) default 0,
  harga_per_kg numeric(12,2) default 0,
  nilai_transaksi numeric(12,2) generated always as (berat_kg * harga_per_kg) stored,
  jenis_transaksi text default 'Setor',
  petugas_id uuid references petugas(id),
  created_at timestamptz not null default now()
);

create table if not exists tps3r (
  id uuid primary key default gen_random_uuid(), tanggal date not null default current_date,
  petugas_id uuid references petugas(id), sumber_sampah text, berat_masuk_kg numeric(12,2) default 0,
  organik_kg numeric(12,2) default 0, anorganik_kg numeric(12,2) default 0,
  sampah_bernilai_kg numeric(12,2) default 0, sampah_diolah_kg numeric(12,2) default 0,
  residu_kg numeric(12,2) default 0, produk text, foto_url text, created_at timestamptz not null default now()
);

create table if not exists residu (
  id uuid primary key default gen_random_uuid(), tanggal date not null default current_date,
  lokasi text, sumber text, berat_kg numeric(12,2) default 0, jenis_residu text,
  tujuan_akhir text, petugas_id uuid references petugas(id), foto_url text, keterangan text,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public) values ('dokumentasi', 'dokumentasi', true) on conflict (id) do nothing;
