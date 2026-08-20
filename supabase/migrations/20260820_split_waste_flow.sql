create table if not exists sampah_masuk (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null default current_date,
  petugas_id uuid references petugas(id),
  asal_sampah text not null,
  wilayah_id uuid references wilayah(id),
  total_berat_kg numeric(12,2) not null check (total_berat_kg >= 0),
  keterangan text,
  created_at timestamptz not null default now()
);

create table if not exists pemilahan_sampah (
  id uuid primary key default gen_random_uuid(),
  sampah_masuk_id uuid not null references sampah_masuk(id) on delete cascade,
  tanggal date not null default current_date,
  organik_kg numeric(12,2) not null default 0 check (organik_kg >= 0),
  anorganik_kg numeric(12,2) not null default 0 check (anorganik_kg >= 0),
  residu_kg numeric(12,2) not null default 0 check (residu_kg >= 0),
  kardus_kg numeric(12,2) not null default 0 check (kardus_kg >= 0),
  kaca_kg numeric(12,2) not null default 0 check (kaca_kg >= 0),
  besi_kg numeric(12,2) not null default 0 check (besi_kg >= 0),
  anorganik_lainnya_kg numeric(12,2) not null default 0 check (anorganik_lainnya_kg >= 0),
  keterangan text,
  created_at timestamptz not null default now(),
  check (kardus_kg + kaca_kg + besi_kg + anorganik_lainnya_kg <= anorganik_kg)
);

create index if not exists idx_sampah_masuk_asal on sampah_masuk (asal_sampah);
create index if not exists idx_sampah_masuk_tanggal on sampah_masuk (tanggal);
create index if not exists idx_pemilahan_sampah_masuk on pemilahan_sampah (sampah_masuk_id);

create or replace function validate_pemilahan_sampah()
returns trigger language plpgsql as $$
declare total_masuk numeric(12,2);
begin
  select total_berat_kg into total_masuk from sampah_masuk where id = new.sampah_masuk_id;
  if total_masuk is null or new.organik_kg + new.anorganik_kg + new.residu_kg <> total_masuk then
    raise exception 'Total pemilahan harus sama dengan total sampah masuk';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_pemilahan_before_insert on pemilahan_sampah;
create trigger validate_pemilahan_before_insert
before insert or update on pemilahan_sampah
for each row execute function validate_pemilahan_sampah();
