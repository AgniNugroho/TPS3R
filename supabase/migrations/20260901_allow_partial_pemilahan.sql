create or replace function validate_pemilahan_sampah()
returns trigger language plpgsql as $$
declare
  total_masuk numeric(12,2);
  total_sudah_dipilah numeric(12,2);
  total_baru numeric(12,2);
begin
  select total_berat_kg
  into total_masuk
  from sampah_masuk
  where id = new.sampah_masuk_id;

  select coalesce(sum(organik_kg + anorganik_kg + residu_kg), 0)
  into total_sudah_dipilah
  from pemilahan_sampah
  where sampah_masuk_id = new.sampah_masuk_id
    and (tg_op = 'INSERT' or id <> new.id);

  total_baru := new.organik_kg + new.anorganik_kg + new.residu_kg;

  if total_masuk is null then
    raise exception 'Sampah masuk tidak ditemukan';
  end if;

  if total_sudah_dipilah + total_baru > total_masuk then
    raise exception 'Total pemilahan tidak boleh melebihi total sampah masuk';
  end if;

  return new;
end;
$$;