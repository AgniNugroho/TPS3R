-- Izinkan petugas mengedit/menghapus entri pengumpulan yang dia catat sendiri.
-- Sebelumnya modul ini append-only (cuma select + insert); sekarang butuh koreksi
-- data lapangan (salah input berat/tanggal, dsb) tapi tetap dibatasi ke entri milik sendiri.

create policy "pengumpulan_update_self" on pengumpulan
  for update to authenticated using (petugas_id = auth.uid()) with check (petugas_id = auth.uid());

create policy "pengumpulan_delete_self" on pengumpulan
  for delete to authenticated using (petugas_id = auth.uid());
