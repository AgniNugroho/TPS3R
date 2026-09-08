-- Migration: Create member_bank_sampah table and link to bank_sampah transactions
-- Date: 2026-09-03

-- 1. Create table member_bank_sampah
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

-- 2. Indexes for fast lookup & filtering
create index if not exists idx_member_bank_sampah_desa on member_bank_sampah(desa_id);
create index if not exists idx_member_bank_sampah_wilayah on member_bank_sampah(wilayah_id);
create index if not exists idx_member_bank_sampah_nama on member_bank_sampah(nama);

-- 3. Add FK member_id to bank_sampah table
alter table bank_sampah add column if not exists member_id uuid references member_bank_sampah(id) on delete set null;
create index if not exists idx_bank_sampah_member_id on bank_sampah(member_id);

-- 4. Add FK member_id to sampah_masuk table (Pengumpulan)
alter table sampah_masuk add column if not exists member_id uuid references member_bank_sampah(id) on delete set null;
create index if not exists idx_sampah_masuk_member_id on sampah_masuk(member_id);

-- 5. Initial backfill: Auto-enroll existing members from bank_sampah into member_bank_sampah
insert into member_bank_sampah (nama, desa_id)
select distinct trim(b.nama_nasabah), b.desa_id
from bank_sampah b
where b.nama_nasabah is not null 
  and trim(b.nama_nasabah) <> '' 
  and b.desa_id is not null
on conflict do nothing;

-- 6. Link existing bank_sampah records to the newly enrolled members
update bank_sampah b
set member_id = m.id
from member_bank_sampah m
where trim(b.nama_nasabah) = m.nama 
  and b.desa_id = m.desa_id 
  and b.member_id is null;

-- 7. Row Level Security (RLS)
alter table member_bank_sampah enable row level security;

drop policy if exists member_bank_sampah_scope on member_bank_sampah;
create policy member_bank_sampah_scope on member_bank_sampah for all
  using (is_admin() or desa_id = current_desa_id())
  with check (is_admin() or desa_id = current_desa_id());
