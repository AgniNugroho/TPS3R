-- jabatan duplicated the role column's purpose; drop it.
alter table petugas drop column if exists jabatan;
