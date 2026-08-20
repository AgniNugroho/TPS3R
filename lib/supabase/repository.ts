import { getSupabaseServerClient } from "./server";
import type { DatabaseRow, TableName } from "./types";

export type QueryFilters = Record<string, string | number | boolean | null>;

export async function listRows(table: TableName, filters: QueryFilters = {}) {
  const supabase = getSupabaseServerClient();
  let query = supabase.from(table).select("*");
  for (const [column, value] of Object.entries(filters)) {
    if (value !== null && value !== "") query = query.eq(column, value);
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createRow(table: TableName, row: DatabaseRow) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) throw new Error(error.message);
  return data;
}
