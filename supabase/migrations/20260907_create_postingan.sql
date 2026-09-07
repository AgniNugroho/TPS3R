-- Migration: Create postingan table for product & information showcase (Tanpa harga dan kontak WA)
create table if not exists public.postingan (
  id uuid primary key default gen_random_uuid(),
  desa_id uuid not null references public.desa(id) on delete cascade,
  judul text not null,
  deskripsi text not null,
  gambar_url text not null,
  status text not null default 'Publik' check (status in ('Publik', 'Draft')),
  author_id uuid references public.petugas(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_postingan_desa on public.postingan (desa_id);
create index if not exists idx_postingan_status on public.postingan (status);
create index if not exists idx_postingan_created_at on public.postingan (created_at desc);

-- Enable Row Level Security (RLS)
alter table public.postingan enable row level security;

-- Policies:
-- 1. Public can read published posts
drop policy if exists "postingan_public_read" on public.postingan;
create policy "postingan_public_read" on public.postingan
  for select
  using (status = 'Publik');

-- 2. Staff/Admin can read all posts matching their village scope
drop policy if exists "postingan_scope_select" on public.postingan;
create policy "postingan_scope_select" on public.postingan
  for select
  using (is_admin() or desa_id = current_desa_id());

-- 3. Staff/Admin can insert posts matching their village scope
drop policy if exists "postingan_scope_insert" on public.postingan;
create policy "postingan_scope_insert" on public.postingan
  for insert
  with check (is_admin() or desa_id = current_desa_id());

-- 4. Staff/Admin can update posts matching their village scope
drop policy if exists "postingan_scope_update" on public.postingan;
create policy "postingan_scope_update" on public.postingan
  for update
  using (is_admin() or desa_id = current_desa_id())
  with check (is_admin() or desa_id = current_desa_id());

-- 5. Staff/Admin can delete posts matching their village scope
drop policy if exists "postingan_scope_delete" on public.postingan;
create policy "postingan_scope_delete" on public.postingan
  for delete
  using (is_admin() or desa_id = current_desa_id());
