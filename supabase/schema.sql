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
declare
  total_masuk numeric(12,2);
  total_sudah_dipilah numeric(12,2);
  total_baru numeric(12,2);
begin
  select total_berat_kg
  into total_masuk
  from sampah_masuk
  where id = new.sampah_masuk_id;

  select coalesce(sum(organik_kg + anorganik_kg + residu_kg), 0)
  into total_sudah_dipilah
  from pemilahan_sampah
  where sampah_masuk_id = new.sampah_masuk_id
    and (tg_op = 'INSERT' or id <> new.id);

  total_baru := new.organik_kg + new.anorganik_kg + new.residu_kg;

  if total_masuk is null then
    raise exception 'Sampah masuk tidak ditemukan';
  end if;

  if total_sudah_dipilah + total_baru > total_masuk then
    raise exception 'Total pemilahan tidak boleh melebihi total sampah masuk';
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

create table if not exists residu (
  id uuid primary key default gen_random_uuid(), tanggal date not null default current_date,
  lokasi text, sumber text, berat_kg numeric(12,2) default 0, jenis_residu text,
  tujuan_akhir text, petugas_id uuid references petugas(id), foto_url text, keterangan text,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public) values ('dokumentasi', 'dokumentasi', true) on conflict (id) do nothing;

-- Multi-desa support: each wilayah (dusun) belongs to a desa, petugas are scoped to a desa,
-- and all transactional tables carry a denormalized desa_id for fast, uniform access filtering.

create table if not exists desa (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  nama text not null,
  kecamatan text,
  kabupaten text,
  status text default 'Aktif',
  created_at timestamptz not null default now()
);

insert into desa (kode, nama)
values ('DEFAULT', 'Desa Banyubiru')
on conflict (kode) do nothing;

-- wilayah (dusun) always belongs to exactly one desa
alter table wilayah add column if not exists desa_id uuid references desa(id);
update wilayah set desa_id = (select id from desa where kode = 'DEFAULT') where desa_id is null;
alter table wilayah alter column desa_id set not null;

-- petugas is assigned directly to one desa (not a specific wilayah/dusun) and has a role + optional login account
alter table petugas add column if not exists desa_id uuid references desa(id);
alter table petugas add column if not exists user_id uuid unique references auth.users(id);
alter table petugas add column if not exists role text not null default 'petugas';
alter table petugas drop constraint if exists petugas_role_check;
alter table petugas add constraint petugas_role_check check (role in ('admin', 'petugas'));
drop trigger if exists trg_petugas_desa on petugas;
alter table petugas drop column if exists wilayah_id;

-- transactional tables: denormalize desa_id for simple, uniform filtering
alter table sampah_masuk add column if not exists desa_id uuid references desa(id);
alter table pemilahan_sampah add column if not exists desa_id uuid references desa(id);
alter table pengumpulan add column if not exists desa_id uuid references desa(id);
alter table bank_sampah add column if not exists desa_id uuid references desa(id);
alter table residu add column if not exists desa_id uuid references desa(id);

create table if not exists member_bank_sampah (
  id uuid primary key default gen_random_uuid(),
  kode_member text unique,
  nama text not null,
  desa_id uuid not null references desa(id) on delete cascade,
  wilayah_id uuid references wilayah(id) on delete set null,
  nomor_hp text,
  alamat text,
  status text not null default 'Aktif' check (status in ('Aktif', 'Nonaktif')),
  created_at timestamptz not null default now()
);

create index if not exists idx_member_bank_sampah_desa on member_bank_sampah (desa_id);
create index if not exists idx_member_bank_sampah_wilayah on member_bank_sampah (wilayah_id);
create index if not exists idx_member_bank_sampah_nama on member_bank_sampah (nama);

alter table bank_sampah add column if not exists member_id uuid references member_bank_sampah(id) on delete set null;
create index if not exists idx_bank_sampah_member_id on bank_sampah (member_id);

alter table bank_sampah add column if not exists sampah_masuk_id uuid references sampah_masuk(id) on delete set null;
create index if not exists idx_bank_sampah_sampah_masuk_id on bank_sampah (sampah_masuk_id);

alter table sampah_masuk add column if not exists member_id uuid references member_bank_sampah(id) on delete set null;
create index if not exists idx_sampah_masuk_member_id on sampah_masuk (member_id);

update sampah_masuk s set desa_id = w.desa_id from wilayah w where s.wilayah_id = w.id and s.desa_id is null;
update pengumpulan g set desa_id = w.desa_id from wilayah w where g.wilayah_id = w.id and g.desa_id is null;
update bank_sampah b set desa_id = p.desa_id from petugas p where b.petugas_id = p.id and b.desa_id is null;
update residu r set desa_id = p.desa_id from petugas p where r.petugas_id = p.id and r.desa_id is null;
update pemilahan_sampah ps set desa_id = s.desa_id from sampah_masuk s where ps.sampah_masuk_id = s.id and ps.desa_id is null;

create index if not exists idx_wilayah_desa on wilayah (desa_id);
create index if not exists idx_petugas_desa on petugas (desa_id);
create index if not exists idx_sampah_masuk_desa on sampah_masuk (desa_id);
create index if not exists idx_pemilahan_sampah_desa on pemilahan_sampah (desa_id);
create index if not exists idx_pengumpulan_desa on pengumpulan (desa_id);
create index if not exists idx_bank_sampah_desa on bank_sampah (desa_id);
create index if not exists idx_residu_desa on residu (desa_id);

-- auto-populate desa_id whenever the source reference changes
create or replace function set_desa_id_from_wilayah()
returns trigger language plpgsql as $$
begin
  if new.wilayah_id is not null then
    select desa_id into new.desa_id from wilayah where id = new.wilayah_id;
  end if;
  return new;
end;
$$;

create or replace function set_desa_id_from_petugas()
returns trigger language plpgsql as $$
begin
  if new.petugas_id is not null then
    select desa_id into new.desa_id from petugas where id = new.petugas_id;
  end if;
  return new;
end;
$$;

create or replace function set_desa_id_from_sampah_masuk()
returns trigger language plpgsql as $$
begin
  if new.sampah_masuk_id is not null then
    select desa_id into new.desa_id from sampah_masuk where id = new.sampah_masuk_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sampah_masuk_desa on sampah_masuk;
create trigger trg_sampah_masuk_desa before insert or update of wilayah_id on sampah_masuk
for each row execute function set_desa_id_from_wilayah();

drop trigger if exists trg_pengumpulan_desa on pengumpulan;
create trigger trg_pengumpulan_desa before insert or update of wilayah_id on pengumpulan
for each row execute function set_desa_id_from_wilayah();

drop trigger if exists trg_bank_sampah_desa on bank_sampah;
create trigger trg_bank_sampah_desa before insert or update of petugas_id on bank_sampah
for each row execute function set_desa_id_from_petugas();

drop trigger if exists trg_residu_desa on residu;
create trigger trg_residu_desa before insert or update of petugas_id on residu
for each row execute function set_desa_id_from_petugas();

drop trigger if exists trg_pemilahan_desa on pemilahan_sampah;
create trigger trg_pemilahan_desa before insert or update of sampah_masuk_id on pemilahan_sampah
for each row execute function set_desa_id_from_sampah_masuk();

-- helper functions for row level security (security definer to avoid recursive RLS lookups)
create or replace function current_petugas_role()
returns text language sql stable security definer set search_path = public as $$
  select role from petugas where user_id = auth.uid() limit 1;
$$;

create or replace function current_desa_id()
returns uuid language sql stable security definer set search_path = public as $$
  select desa_id from petugas where user_id = auth.uid() limit 1;
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role from petugas where user_id = auth.uid() limit 1) = 'admin', false);
$$;

-- row level security: every row is scoped to its desa unless the caller is an admin
alter table desa enable row level security;
alter table wilayah enable row level security;
alter table petugas enable row level security;
alter table sampah_masuk enable row level security;
alter table pemilahan_sampah enable row level security;
alter table pengumpulan enable row level security;
alter table bank_sampah enable row level security;
alter table residu enable row level security;
alter table member_bank_sampah enable row level security;

drop policy if exists desa_select on desa;
create policy desa_select on desa for select using (is_admin() or id = current_desa_id());
drop policy if exists desa_write on desa;
create policy desa_write on desa for all using (is_admin()) with check (is_admin());

drop policy if exists wilayah_scope on wilayah;
create policy wilayah_scope on wilayah for all
  using (is_admin() or desa_id = current_desa_id())
  with check (is_admin() or desa_id = current_desa_id());

drop policy if exists petugas_scope on petugas;
create policy petugas_scope on petugas for all
  using (is_admin() or desa_id = current_desa_id())
  with check (is_admin() or desa_id = current_desa_id());

drop policy if exists sampah_masuk_scope on sampah_masuk;
create policy sampah_masuk_scope on sampah_masuk for all
  using (is_admin() or desa_id = current_desa_id())
  with check (is_admin() or desa_id = current_desa_id());

drop policy if exists pemilahan_sampah_scope on pemilahan_sampah;
create policy pemilahan_sampah_scope on pemilahan_sampah for all
  using (is_admin() or desa_id = current_desa_id())
  with check (is_admin() or desa_id = current_desa_id());

drop policy if exists pengumpulan_scope on pengumpulan;
create policy pengumpulan_scope on pengumpulan for all
  using (is_admin() or desa_id = current_desa_id())
  with check (is_admin() or desa_id = current_desa_id());

drop policy if exists bank_sampah_scope on bank_sampah;
create policy bank_sampah_scope on bank_sampah for all
  using (is_admin() or desa_id = current_desa_id())
  with check (is_admin() or desa_id = current_desa_id());

drop policy if exists residu_scope on residu;
create policy residu_scope on residu for all
  using (is_admin() or desa_id = current_desa_id())
  with check (is_admin() or desa_id = current_desa_id());

drop policy if exists member_bank_sampah_scope on member_bank_sampah;
create policy member_bank_sampah_scope on member_bank_sampah for all
  using (is_admin() or desa_id = current_desa_id())
  with check (is_admin() or desa_id = current_desa_id());
