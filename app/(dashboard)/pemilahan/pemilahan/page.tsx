import WasteFlowForm from "@/components/forms/WasteFlowForms";
import FormShell from "@/components/dashboard/FormShell";

export default function PemilahanPage() {
  return (
    <FormShell title="Pilah Sampah">
      <main className="content-wrap form-page">
        <p className="eyebrow">PROSES MATERIAL TPS3R</p>
        <h1>Pilah Sampah</h1>
        <p className="heading-copy">
          Pecah sampah masuk menjadi organik (maggot), anorganik (dijual), residu (insinerator),
          dan catat abu sisa pembakaran. Limbah medis/pampers wajib disisihkan.
        </p>
        <WasteFlowForm mode="sorting" />
      </main>
    </FormShell>
  );
}