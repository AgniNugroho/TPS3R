import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "SUPERADMIN | Desa Banyubiru",
    description: "Panel superadmin untuk pengelolaan akun pengelola TPS3R.",
};

export default function SuperadminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
