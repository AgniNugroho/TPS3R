-- Migration: sampah_masuk.desa_id was only auto-filled from wilayah_id, so
-- member-based entries (desa without dusun/wilayah, e.g. Desa Dukun) kept
-- desa_id = null and disappeared once the pemilahan page started filtering
-- by the sidebar's selected desa.
-- Date: 2026-09-08

-- Re-run the wilayah-based backfill in case earlier rows were missed
update sampah_masuk s
set desa_id = w.desa_id
from wilayah w
where s.wilayah_id = w.id
  and s.desa_id is null;

-- Backfill existing null desa_id from the linked member's desa
update sampah_masuk s
set desa_id = m.desa_id
from member_bank_sampah m
where s.member_id = m.id
  and s.desa_id is null;

-- Cascade the backfill to already-sorted records
update pemilahan_sampah ps
set desa_id = s.desa_id
from sampah_masuk s
where ps.sampah_masuk_id = s.id
  and ps.desa_id is null
  and s.desa_id is not null;

-- Resolve desa_id from member_id too, not just wilayah_id
create or replace function set_desa_id_from_wilayah()
returns trigger language plpgsql as $$
begin
  if new.wilayah_id is not null then
    select desa_id into new.desa_id from wilayah where id = new.wilayah_id;
  elsif new.member_id is not null then
    select desa_id into new.desa_id from member_bank_sampah where id = new.member_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sampah_masuk_desa on sampah_masuk;
create trigger trg_sampah_masuk_desa before insert or update of wilayah_id, member_id on sampah_masuk
for each row execute function set_desa_id_from_wilayah();
