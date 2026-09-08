-- Migration: Add wilayah_id and make member_id optional in pembayaran_member
-- Supports dusun-level fee collection for Desa Banyubiru & Desa Kalibening

-- 1. Make member_id nullable
alter table public.pembayaran_member alter column member_id drop not null;

-- 2. Add wilayah_id referencing public.wilayah
alter table public.pembayaran_member add column if not exists wilayah_id uuid references public.wilayah(id) on delete cascade;

-- 3. Create index for performance
create index if not exists idx_pembayaran_member_wilayah on public.pembayaran_member(wilayah_id);

-- 4. Prevent duplicate payments per dusun per monthly period
create unique index if not exists uq_wilayah_periode on public.pembayaran_member(wilayah_id, periode_bulan) where wilayah_id is not null;
