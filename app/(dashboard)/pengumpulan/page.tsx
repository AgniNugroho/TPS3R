import WasteFlowForm from "@/components/forms/WasteFlowForms";
import FormShell from "@/components/dashboard/FormShell";

export default function PengumpulanPage() {
  return <FormShell title="Pengumpulan" activeLabel="Pengumpulan"><main className="content-wrap form-page"><p className="eyebrow">INPUT OPERASIONAL</p><h1>Total Sampah Masuk</h1><p className="heading-copy">Catat satu total berat dan asal sampah.</p><WasteFlowForm mode="incoming" /></main></FormShell>;
}