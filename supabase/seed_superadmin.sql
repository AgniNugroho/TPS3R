-- Skrip Inisialisasi Akun Superadmin Default
-- Email: admin@tps3r.desa.id
-- Password Default: AdminTPS3R2026!
-- (Password dapat langsung diganti setelah login melalui menu Kelola Akun)

do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_email text := 'admin@tps3r.desa.id';
  v_password text := 'AdminTPS3R2026!';
  v_encrypted_pw text := crypt(v_password, gen_salt('bf'));
  v_existing_id uuid;
begin
  -- Cek apakah user sudah ada di auth.users
  select id into v_existing_id from auth.users where email = v_email;

  if v_existing_id is null then
    -- Buat akun baru di auth.users
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      v_encrypted_pw,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"nama":"Super Admin TPS3R"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    -- Tambahkan profil superadmin ke tabel petugas
    insert into public.petugas (id, nama, email, role, created_at)
    values (v_user_id, 'Super Admin TPS3R', v_email, 'superadmin', now())
    on conflict (id) do update set role = 'superadmin', nama = 'Super Admin TPS3R';

    raise notice 'Akun Superadmin baru berhasil dibuat dengan email: %', v_email;
  else
    -- Update jika sudah ada
    update auth.users
    set encrypted_password = v_encrypted_pw,
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
    where id = v_existing_id;

    insert into public.petugas (id, nama, email, role, created_at)
    values (v_existing_id, 'Super Admin TPS3R', v_email, 'superadmin', now())
    on conflict (id) do update set role = 'superadmin';

    raise notice 'Akun Superadmin yang sudah ada (% ) diperbarui menjadi role superadmin.', v_email;
  end if;
end $$;
