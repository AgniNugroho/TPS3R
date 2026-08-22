-- Tabel riwayat pengumpulan perlu menampilkan nama petugas yang mencatat tiap
-- baris (bisa petugas lain, bukan cuma diri sendiri) -- longgarkan policy select
-- petugas dari "hanya diri sendiri" jadi "semua petugas yang login".

drop policy "petugas_select_self" on petugas;

create policy "petugas_select_authenticated" on petugas
  for select to authenticated using (true);
