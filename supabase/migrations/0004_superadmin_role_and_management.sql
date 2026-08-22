-- Migration 0004: Menambahkan role superadmin dan RLS policies untuk manajemen database akun, wilayah, dan anggota

-- 1. Tambahkan kolom role ke tabel petugas jika belum ada
alter table petugas 
add column if not exists role text not null default 'petugas' check (role in ('petugas', 'superadmin'));

-- 2. Buat fungsi helper security definer untuk mengecek apakah auth.uid() adalah superadmin
create or replace function public.is_superadmin()
returns boolean as $$
  select exists (
    select 1 from public.petugas 
    where id = auth.uid() and role = 'superadmin'
  );
$$ language sql security definer;

-- 3. RLS Policies untuk tabel `petugas` (Superadmin dapat mengelola akun)
create policy "petugas_insert_superadmin" on public.petugas
  for insert to authenticated
  with check (public.is_superadmin() or auth.uid() = id);

create policy "petugas_update_superadmin" on public.petugas
  for update to authenticated
  using (public.is_superadmin() or auth.uid() = id)
  with check (public.is_superadmin() or auth.uid() = id);

create policy "petugas_delete_superadmin" on public.petugas
  for delete to authenticated
  using (public.is_superadmin());

-- 4. RLS Policies untuk tabel `wilayah` (Superadmin dapat CRUD dusun)
create policy "wilayah_insert_superadmin" on public.wilayah
  for insert to authenticated
  with check (public.is_superadmin());

create policy "wilayah_update_superadmin" on public.wilayah
  for update to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "wilayah_delete_superadmin" on public.wilayah
  for delete to authenticated
  using (public.is_superadmin());

-- 5. RLS Policies untuk tabel `anggota` (Superadmin dapat CRUD warga)
create policy "anggota_insert_superadmin" on public.anggota
  for insert to authenticated
  with check (public.is_superadmin());

create policy "anggota_update_superadmin" on public.anggota
  for update to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "anggota_delete_superadmin" on public.anggota
  for delete to authenticated
  using (public.is_superadmin());
