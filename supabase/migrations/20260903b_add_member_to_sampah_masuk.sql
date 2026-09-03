-- Migration: Add member_id to sampah_masuk table
-- Date: 2026-09-03

-- 1. Add foreign key member_id to sampah_masuk table
alter table sampah_masuk 
  add column if not exists member_id uuid references member_bank_sampah(id) on delete set null;

-- 2. Index for fast querying by member
create index if not exists idx_sampah_masuk_member_id on sampah_masuk (member_id);
