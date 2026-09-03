-- Multi-desa support: each wilayah (dusun) belongs to a desa, petugas are scoped to a desa,
-- and all transactional tables carry a denormalized desa_id for fast, uniform access filtering.

create table if not exists desa (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  nama text not null,
  kecamatan text,
  kabupaten text,
  status text default 'Aktif',
  created_at timestamptz not null default now()
);

insert into desa (kode, nama)
values ('DEFAULT', 'Desa Banyubiru')
on conflict (kode) do nothing;

-- wilayah (dusun) always belongs to exactly one desa
alter table wilayah add column if not exists desa_id uuid references desa(id);
update wilayah set desa_id = (select id from desa where kode = 'DEFAULT') where desa_id is null;
alter table wilayah alter column desa_id set not null;

-- petugas is assigned directly to one desa (not a specific wilayah/dusun) and has a role + optional login account
alter table petugas add column if not exists desa_id uuid references desa(id);
alter table petugas add column if not exists user_id uuid unique references auth.users(id);
alter table petugas add column if not exists role text not null default 'petugas';
alter table petugas drop constraint if exists petugas_role_check;
alter table petugas add constraint petugas_role_check check (role in ('admin', 'petugas'));
drop trigger if exists trg_petugas_desa on petugas;
alter table petugas drop column if exists wilayah_id;

-- transactional tables: denormalize desa_id for simple, uniform filtering
alter table sampah_masuk add column if not exists desa_id uuid references desa(id);
alter table pemilahan_sampah add column if not exists desa_id uuid references desa(id);
alter table pengumpulan add column if not exists desa_id uuid references desa(id);
alter table bank_sampah add column if not exists desa_id uuid references desa(id);
alter table tps3r add column if not exists desa_id uuid references desa(id);
alter table residu add column if not exists desa_id uuid references desa(id);

update sampah_masuk s set desa_id = w.desa_id from wilayah w where s.wilayah_id = w.id and s.desa_id is null;
update pengumpulan g set desa_id = w.desa_id from wilayah w where g.wilayah_id = w.id and g.desa_id is null;
update bank_sampah b set desa_id = p.desa_id from petugas p where b.petugas_id = p.id and b.desa_id is null;
update tps3r t set desa_id = p.desa_id from petugas p where t.petugas_id = p.id and t.desa_id is null;
update residu r set desa_id = p.desa_id from petugas p where r.petugas_id = p.id and r.desa_id is null;
update pemilahan_sampah ps set desa_id = s.desa_id from sampah_masuk s where ps.sampah_masuk_id = s.id and ps.desa_id is null;

create index if not exists idx_wilayah_desa on wilayah (desa_id);
create index if not exists idx_petugas_desa on petugas (desa_id);
create index if not exists idx_sampah_masuk_desa on sampah_masuk (desa_id);
create index if not exists idx_pemilahan_sampah_desa on pemilahan_sampah (desa_id);
create index if not exists idx_pengumpulan_desa on pengumpulan (desa_id);
create index if not exists idx_bank_sampah_desa on bank_sampah (desa_id);
create index if not exists idx_tps3r_desa on tps3r (desa_id);
create index if not exists idx_residu_desa on residu (desa_id);

-- auto-populate desa_id whenever the source reference changes
create or replace function set_desa_id_from_wilayah()
returns trigger language plpgsql as $$
begin
  if new.wilayah_id is not null then
    select desa_id into new.desa_id from wilayah where id = new.wilayah_id;
  end if;
  return new;
end;
$$;

create or replace function set_desa_id_from_petugas()
returns trigger language plpgsql as $$
begin
  if new.petugas_id is not null then
    select desa_id into new.desa_id from petugas where id = new.petugas_id;
  end if;
  return new;
end;
$$;

create or replace function set_desa_id_from_sampah_masuk()
returns trigger language plpgsql as $$
begin
  if new.sampah_masuk_id is not null then
    select desa_id into new.desa_id from sampah_masuk where id = new.sampah_masuk_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sampah_masuk_desa on sampah_masuk;
create trigger trg_sampah_masuk_desa before insert or update of wilayah_id on sampah_masuk
for each row execute function set_desa_id_from_wilayah();

drop trigger if exists trg_pengumpulan_desa on pengumpulan;
create trigger trg_pengumpulan_desa before insert or update of wilayah_id on pengumpulan
for each row execute function set_desa_id_from_wilayah();

drop trigger if exists trg_bank_sampah_desa on bank_sampah;
create trigger trg_bank_sampah_desa before insert or update of petugas_id on bank_sampah
for each row execute function set_desa_id_from_petugas();

drop trigger if exists trg_tps3r_desa on tps3r;
create trigger trg_tps3r_desa before insert or update of petugas_id on tps3r
for each row execute function set_desa_id_from_petugas();

drop trigger if exists trg_residu_desa on residu;
create trigger trg_residu_desa before insert or update of petugas_id on residu
for each row execute function set_desa_id_from_petugas();

drop trigger if exists trg_pemilahan_desa on pemilahan_sampah;
create trigger trg_pemilahan_desa before insert or update of sampah_masuk_id on pemilahan_sampah
for each row execute function set_desa_id_from_sampah_masuk();

-- helper functions for row level security (security definer to avoid recursive RLS lookups)
create or replace function current_petugas_role()
returns text language sql stable security definer set search_path = public as $$
  select role from petugas where user_id = auth.uid() limit 1;
$$;

create or replace function current_desa_id()
returns uuid language sql stable security definer set search_path = public as $$
  select desa_id from petugas where user_id = auth.uid() limit 1;
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role from petugas where user_id = auth.uid() limit 1) = 'admin', false);
$$;

-- row level security: every row is scoped to its desa unless the caller is an admin
alter table desa enable row level security;
alter table wilayah enable row level security;
alter table petugas enable row level security;
alter table sampah_masuk enable row level security;
alter table pemilahan_sampah enable row level security;
alter table pengumpulan enable row level security;
alter table bank_sampah enable row level security;
alter table tps3r enable row level security;
alter table residu enable row level security;

drop policy if exists desa_select on desa;
create policy desa_select on desa for select using (is_admin() or id = current_desa_id());
drop policy if exists desa_write on desa;
create policy desa_write on desa for all using (is_admin()) with check (is_admin());

drop policy if exists wilayah_scope on wilayah;
create policy wilayah_scope on wilayah for all
  using (is_admin() or desa_id = current_desa_id())
  with check (is_admin() or desa_id = current_desa_id());

drop policy if exists petugas_scope on petugas;
create policy petugas_scope on petugas for all
  using (is_admin() or desa_id = current_desa_id())
  with check (is_admin() or desa_id = current_desa_id());

drop policy if exists sampah_masuk_scope on sampah_masuk;
create policy sampah_masuk_scope on sampah_masuk for all
  using (is_admin() or desa_id = current_desa_id())
  with check (is_admin() or desa_id = current_desa_id());

drop policy if exists pemilahan_sampah_scope on pemilahan_sampah;
create policy pemilahan_sampah_scope on pemilahan_sampah for all
  using (is_admin() or desa_id = current_desa_id())
  with check (is_admin() or desa_id = current_desa_id());

drop policy if exists pengumpulan_scope on pengumpulan;
create policy pengumpulan_scope on pengumpulan for all
  using (is_admin() or desa_id = current_desa_id())
  with check (is_admin() or desa_id = current_desa_id());

drop policy if exists bank_sampah_scope on bank_sampah;
create policy bank_sampah_scope on bank_sampah for all
  using (is_admin() or desa_id = current_desa_id())
  with check (is_admin() or desa_id = current_desa_id());

drop policy if exists tps3r_scope on tps3r;
create policy tps3r_scope on tps3r for all
  using (is_admin() or desa_id = current_desa_id())
  with check (is_admin() or desa_id = current_desa_id());

drop policy if exists residu_scope on residu;
create policy residu_scope on residu for all
  using (is_admin() or desa_id = current_desa_id())
  with check (is_admin() or desa_id = current_desa_id());
