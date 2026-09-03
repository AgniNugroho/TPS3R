import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({ 
  title = "Belum Ada Data", 
  description = "Saat ini belum ada data yang bisa ditampilkan.", 
  icon = <FolderOpen size={48} color="#a0aaa6" strokeWidth={1.5} />
}: EmptyStateProps) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "40px 20px", textAlign: "center", background: "#f8faf9",
      border: "1px dashed #dce4e1", borderRadius: "12px", width: "100%", margin: "20px 0"
    }}>
      <div style={{ marginBottom: "16px" }}>{icon}</div>
      <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#4a5a55", marginBottom: "8px" }}>
        {title}
      </h3>
      <p style={{ fontSize: "12px", color: "#8b9994", maxWidth: "300px", lineHeight: 1.5 }}>
        {description}
      </p>
    </div>
  );
}
