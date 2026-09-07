-- Migration: Link bank_sampah transactions with sampah_masuk batch records
-- Date: 2026-09-03

-- 1. Add foreign key sampah_masuk_id to bank_sampah table
alter table bank_sampah
  add column if not exists sampah_masuk_id uuid references sampah_masuk(id) on delete set null;

-- 2. Index for fast querying and joining
create index if not exists idx_bank_sampah_sampah_masuk_id on bank_sampah (sampah_masuk_id);
