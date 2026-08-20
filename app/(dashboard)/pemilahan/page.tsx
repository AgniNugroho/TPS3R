import WasteFlowForm from "@/components/forms/WasteFlowForms";
import FormShell from "@/components/dashboard/FormShell";

export default function PemilahanPage() {
  return <FormShell title="Pilah Sampah"><main className="content-wrap form-page"><p className="eyebrow">PROSES MATERIAL</p><h1>Pilah Sampah</h1><p className="heading-copy">Pecah sampah masuk menjadi organik, anorganik, dan residu. Anorganik dicatat lagi berdasarkan materialnya.</p><WasteFlowForm mode="sorting" /></main></FormShell>;
}