import { createSupabaseHandlers } from "@/lib/supabase/route";

export const { GET, POST } = createSupabaseHandlers("petugas");
