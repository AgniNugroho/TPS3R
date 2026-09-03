import { createSupabaseHandlers } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

export const { GET, POST } = createSupabaseHandlers("sampah_masuk");
