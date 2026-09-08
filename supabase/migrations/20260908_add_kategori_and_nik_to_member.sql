-- Migration: Add kategori and nik to member_bank_sampah
-- Khusus untuk pengelola Desa Dukun: menambahkan kategori (Rumahan / Industri) dan NIK (Nomor Induk Kependudukan)

alter table public.member_bank_sampah 
  add column if not exists kategori text default 'Rumahan' check (kategori in ('Rumahan', 'Industri')),
  add column if not exists nik text;

create index if not exists idx_member_bank_sampah_kategori on public.member_bank_sampah(kategori);
create index if not exists idx_member_bank_sampah_nik on public.member_bank_sampah(nik);
