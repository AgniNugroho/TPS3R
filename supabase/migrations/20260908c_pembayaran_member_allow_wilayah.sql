-- Migration: Iuran for non-Dukun desa is paid per dusun/wilayah, not per member.
-- Make pembayaran_member.member_id optional and add wilayah_id as an alternative payer.
-- Date: 2026-09-08

alter table public.pembayaran_member alter column member_id drop not null;
alter table public.pembayaran_member add column if not exists wilayah_id uuid references public.wilayah(id) on delete cascade;

alter table public.pembayaran_member drop constraint if exists uq_member_periode;
alter table public.pembayaran_member
  add constraint pembayaran_member_payer_check
  check (
    (member_id is not null and wilayah_id is null)
    or (member_id is null and wilayah_id is not null)
  );

create unique index if not exists uq_pembayaran_member_periode
  on public.pembayaran_member (member_id, periode_bulan) where member_id is not null;
create unique index if not exists uq_pembayaran_wilayah_periode
  on public.pembayaran_member (wilayah_id, periode_bulan) where wilayah_id is not null;

create index if not exists idx_pembayaran_member_wilayah on public.pembayaran_member(wilayah_id);
