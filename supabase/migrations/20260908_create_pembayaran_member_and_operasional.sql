-- Migration: Create pembayaran_member and operasional_tps3r tables
-- Supports monthly member fee collection, operational expense tracking, and BUMDes net remittance reporting

-- 1. Table for member monthly fee payments
create table if not exists public.pembayaran_member (
  id uuid primary key default gen_random_uuid(),
  desa_id uuid not null references public.desa(id) on delete cascade,
  member_id uuid not null references public.member_bank_sampah(id) on delete cascade,
  periode_bulan varchar(7) not null, -- Format YYYY-MM, e.g. '2026-09'
  tanggal_bayar date not null default current_date,
  nominal numeric(12,2) not null default 20000 check (nominal > 0),
  metode_pembayaran text not null default 'Cash' check (metode_pembayaran in ('Cash', 'Transfer')),
  status text not null default 'Lunas' check (status in ('Lunas', 'Pending')),
  catatan text,
  petugas_id uuid references public.petugas(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_member_periode unique (member_id, periode_bulan)
);

-- 2. Table for operational expenses (BBM, Listrik, Dapur, dll)
create table if not exists public.operasional_tps3r (
  id uuid primary key default gen_random_uuid(),
  desa_id uuid not null references public.desa(id) on delete cascade,
  periode_bulan varchar(7) not null, -- Format YYYY-MM, e.g. '2026-09'
  tanggal date not null default current_date,
  kategori text not null default 'BBM' check (kategori in ('BBM', 'Listrik', 'Dapur / Konsumsi', 'Pemeliharaan Mesin', 'Lainnya')),
  keterangan text not null,
  nominal numeric(12,2) not null check (nominal > 0),
  petugas_id uuid references public.petugas(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Indexes for query performance
create index if not exists idx_pembayaran_member_desa on public.pembayaran_member(desa_id);
create index if not exists idx_pembayaran_member_periode on public.pembayaran_member(periode_bulan);
create index if not exists idx_pembayaran_member_member on public.pembayaran_member(member_id);
create index if not exists idx_pembayaran_member_tanggal on public.pembayaran_member(tanggal_bayar);

create index if not exists idx_operasional_tps3r_desa on public.operasional_tps3r(desa_id);
create index if not exists idx_operasional_tps3r_periode on public.operasional_tps3r(periode_bulan);
create index if not exists idx_operasional_tps3r_tanggal on public.operasional_tps3r(tanggal);

-- 4. Enable Row Level Security (RLS)
alter table public.pembayaran_member enable row level security;
alter table public.operasional_tps3r enable row level security;

-- 5. RLS Policies for pembayaran_member
drop policy if exists "pembayaran_member_scope_select" on public.pembayaran_member;
create policy "pembayaran_member_scope_select" on public.pembayaran_member
  for select
  using (is_admin() or desa_id = current_desa_id());

drop policy if exists "pembayaran_member_scope_insert" on public.pembayaran_member;
create policy "pembayaran_member_scope_insert" on public.pembayaran_member
  for insert
  with check (is_admin() or desa_id = current_desa_id());

drop policy if exists "pembayaran_member_scope_update" on public.pembayaran_member;
create policy "pembayaran_member_scope_update" on public.pembayaran_member
  for update
  using (is_admin() or desa_id = current_desa_id())
  with check (is_admin() or desa_id = current_desa_id());

drop policy if exists "pembayaran_member_scope_delete" on public.pembayaran_member;
create policy "pembayaran_member_scope_delete" on public.pembayaran_member
  for delete
  using (is_admin() or desa_id = current_desa_id());

-- 6. RLS Policies for operasional_tps3r
drop policy if exists "operasional_tps3r_scope_select" on public.operasional_tps3r;
create policy "operasional_tps3r_scope_select" on public.operasional_tps3r
  for select
  using (is_admin() or desa_id = current_desa_id());

drop policy if exists "operasional_tps3r_scope_insert" on public.operasional_tps3r;
create policy "operasional_tps3r_scope_insert" on public.operasional_tps3r
  for insert
  with check (is_admin() or desa_id = current_desa_id());

drop policy if exists "operasional_tps3r_scope_update" on public.operasional_tps3r;
create policy "operasional_tps3r_scope_update" on public.operasional_tps3r
  for update
  using (is_admin() or desa_id = current_desa_id())
  with check (is_admin() or desa_id = current_desa_id());

drop policy if exists "operasional_tps3r_scope_delete" on public.operasional_tps3r;
create policy "operasional_tps3r_scope_delete" on public.operasional_tps3r
  for delete
  using (is_admin() or desa_id = current_desa_id());
