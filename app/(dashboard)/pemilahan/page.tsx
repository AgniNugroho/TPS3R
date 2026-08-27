import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import WasteFlowForm from "@/components/forms/WasteFlowForms";

export default async function PemilahanPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PROSES MATERIAL</p>
          <h1>Pilah Sampah</h1>
          <p className="heading-copy">
            Pecah sampah masuk menjadi organik, anorganik, dan residu. Anorganik dicatat lagi berdasarkan materialnya.
          </p>
        </div>
      </div>

      <WasteFlowForm mode="sorting" />
    </>
  );
}
