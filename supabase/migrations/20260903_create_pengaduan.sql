gitcreate table public.pengaduan (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  nama_pelapor text not null,
  kontak_pelapor text not null,
  kategori text not null,
  deskripsi text not null,
  status text not null default 'Diterima'
);

-- Enable RLS
alter table public.pengaduan enable row level security;

-- Warga (anon/public) can insert complaints
create policy "Anyone can insert pengaduan"
  on public.pengaduan for insert
  with check (true);

-- Only authenticated users (admins/staff) can view complaints
create policy "Authenticated users can view pengaduan"
  on public.pengaduan for select
  using (auth.role() = 'authenticated');

-- Only authenticated users can update complaints (e.g. changing status)
create policy "Authenticated users can update pengaduan"
  on public.pengaduan for update
  using (auth.role() = 'authenticated');
