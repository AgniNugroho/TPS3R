-- Migration: Create pemberitahuan table for operational announcements & member reminders
create table if not exists public.pemberitahuan (
  id uuid primary key default gen_random_uuid(),
  desa_id uuid not null references public.desa(id) on delete cascade,
  judul text not null,
  isi text not null,
  kategori text not null default 'Operasional' check (kategori in ('Operasional', 'Iuran & Keuangan', 'Jadwal Layanan', 'Sosialisasi & Edukasi', 'Lainnya')),
  tingkat_urgensi text not null default 'Normal' check (tingkat_urgensi in ('Penting', 'Normal', 'Info')),
  status text not null default 'Aktif' check (status in ('Aktif', 'Diarsipkan')),
  tanggal_mulai date not null default current_date,
  tanggal_selesai date,
  author_id uuid references public.petugas(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for query performance
create index if not exists idx_pemberitahuan_desa on public.pemberitahuan (desa_id);
create index if not exists idx_pemberitahuan_status on public.pemberitahuan (status);
create index if not exists idx_pemberitahuan_urgensi on public.pemberitahuan (tingkat_urgensi);
create index if not exists idx_pemberitahuan_created_at on public.pemberitahuan (created_at desc);

-- Enable Row Level Security (RLS)
alter table public.pemberitahuan enable row level security;

-- Policies:
-- 1. Public can read active announcements without login
drop policy if exists "pemberitahuan_public_read" on public.pemberitahuan;
create policy "pemberitahuan_public_read" on public.pemberitahuan
  for select
  using (status = 'Aktif');

-- 2. Staff/Admin can view announcements scoped to their village (or all for admin)
drop policy if exists "pemberitahuan_scope_select" on public.pemberitahuan;
create policy "pemberitahuan_scope_select" on public.pemberitahuan
  for select
  using (is_admin() or desa_id = current_desa_id());

-- 3. Staff/Admin can insert announcements scoped to their village
drop policy if exists "pemberitahuan_scope_insert" on public.pemberitahuan;
create policy "pemberitahuan_scope_insert" on public.pemberitahuan
  for insert
  with check (is_admin() or desa_id = current_desa_id());

-- 4. Staff/Admin can update announcements scoped to their village
drop policy if exists "pemberitahuan_scope_update" on public.pemberitahuan;
create policy "pemberitahuan_scope_update" on public.pemberitahuan
  for update
  using (is_admin() or desa_id = current_desa_id())
  with check (is_admin() or desa_id = current_desa_id());

-- 5. Staff/Admin can delete announcements scoped to their village
drop policy if exists "pemberitahuan_scope_delete" on public.pemberitahuan;
create policy "pemberitahuan_scope_delete" on public.pemberitahuan
  for delete
  using (is_admin() or desa_id = current_desa_id());
