import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ADMIN | Desa Banyubiru",
    description: "Panel admin untuk pengelolaan akun pengelola TPS3R.",
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
