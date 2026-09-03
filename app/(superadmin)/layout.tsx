import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ADMIN | TPS3R Kecamatan Dukun",
    description: "Panel admin untuk pengelolaan akun pengelola TPS3R.",
    icons: {
        icon: "/logo_kab_mgl.png",
        shortcut: "/logo_kab_mgl.png",
        apple: "/logo_kab_mgl.png",
    },
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
