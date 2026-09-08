-- Migration: Create penjualan_anorganik table for waste sales to pengepul and BUMDes setoran
create table if not exists public.penjualan_anorganik (
  id uuid primary key default gen_random_uuid(),
  desa_id uuid not null references public.desa(id) on delete cascade,
  tanggal date not null default current_date,
  pembeli text not null,
  kontak_pembeli text,
  kategori text not null check (kategori in ('Plastik', 'Kardus', 'Kaca', 'Besi', 'Medis', 'Lainnya')),
  berat_kg numeric(12,2) not null check (berat_kg > 0),
  harga_per_kg numeric(12,2) not null check (harga_per_kg >= 0),
  total_pendapatan numeric(12,2) not null check (total_pendapatan >= 0),
  status_setoran text not null default 'Belum Disetor' check (status_setoran in ('Belum Disetor', 'Sudah Disetor')),
  tanggal_setor date,
  catatan text,
  petugas_id uuid references public.petugas(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for querying and reporting
create index if not exists idx_penjualan_anorganik_desa on public.penjualan_anorganik(desa_id);
create index if not exists idx_penjualan_anorganik_tanggal on public.penjualan_anorganik(tanggal);
create index if not exists idx_penjualan_anorganik_kategori on public.penjualan_anorganik(kategori);
create index if not exists idx_penjualan_anorganik_status on public.penjualan_anorganik(status_setoran);

-- Enable RLS
alter table public.penjualan_anorganik enable row level security;

-- Scope policy
drop policy if exists penjualan_anorganik_scope on public.penjualan_anorganik;
create policy penjualan_anorganik_scope on public.penjualan_anorganik for all
  using (is_admin() or desa_id = current_desa_id())
  with check (is_admin() or desa_id = current_desa_id());
