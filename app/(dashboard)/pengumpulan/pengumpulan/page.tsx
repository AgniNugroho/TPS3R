import WasteFlowForm from "@/components/forms/WasteFlowForms";
import FormShell from "@/components/dashboard/FormShell";

export default function PengumpulanPage() {
  return (
    <FormShell title="Pengumpulan" activeLabel="Pengumpulan">
      <main className="content-wrap form-page">
        <p className="eyebrow">INPUT OPERASIONAL LAPANGAN</p>
        <h1>Catat Sampah Masuk</h1>
        <p className="heading-copy">
          Pilih nama member dan masukkan berat kotor hasil pengambilan.
          Form ini dioptimalkan untuk petugas lapangan di HP Android.
        </p>
        <WasteFlowForm mode="incoming" />
      </main>
    </FormShell>
  );
}