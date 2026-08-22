-- Data dummy: dusun & anggota, supaya dropdown form pengumpulan tidak kosong.
-- Akun petugas TIDAK di-seed di sini — buat manual lewat Supabase Dashboard
-- (Authentication -> Add user), lalu insert baris matching ke tabel `petugas`:
--   insert into petugas (id, nama, email) values ('<uuid-user-tsb>', 'Nama Petugas', 'email@petugas');

insert into wilayah (nama_dusun, kode_wilayah) values
  ('Dusun Suka Maju', 'DSM'),
  ('Dusun Mekar Jaya', 'DMJ'),
  ('Dusun Harapan', 'DHR'),
  ('Dusun Cipta Karya', 'DCK');

insert into anggota (nama, wilayah_id, alamat) values
  ('Budi Santoso', (select id from wilayah where kode_wilayah = 'DSM'), 'RT 01/RW 02'),
  ('Siti Aminah', (select id from wilayah where kode_wilayah = 'DSM'), 'RT 03/RW 02'),
  ('Agus Wijaya', (select id from wilayah where kode_wilayah = 'DMJ'), 'RT 01/RW 01'),
  ('Rina Kurnia', (select id from wilayah where kode_wilayah = 'DMJ'), 'RT 02/RW 01'),
  ('Dedi Setiawan', (select id from wilayah where kode_wilayah = 'DHR'), 'RT 04/RW 03'),
  ('Yuni Lestari', (select id from wilayah where kode_wilayah = 'DHR'), 'RT 01/RW 03'),
  ('Hendra Gunawan', (select id from wilayah where kode_wilayah = 'DCK'), 'RT 02/RW 04'),
  ('Wati Suryani', (select id from wilayah where kode_wilayah = 'DCK'), 'RT 03/RW 04');

-- Kategori jenis sampah untuk form pemilahan bulanan.
insert into jenis_sampah (nama) values
  ('Plastik'),
  ('Kardus'),
  ('Kaca'),
  ('Besi'),
  ('Medis'),
  ('Lainnya')
on conflict (nama) do nothing;
