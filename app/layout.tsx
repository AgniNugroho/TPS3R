import type { Metadata } from "next";
import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import Toast from "@/components/ui/Toast";
import "./globals.css";

const bodyFont = DM_Sans({
    variable: "--font-body",
    subsets: ["latin"],
});

const displayFont = Plus_Jakarta_Sans({
    variable: "--font-display",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "DASH-SAMPAH DESA | Kecamatan Dukun",
    description: "Dashboard pengelolaan sampah desa berbasis data.",
    icons: {
        icon: "/logo_kab_mgl.png",
        shortcut: "/logo_kab_mgl.png",
        apple: "/logo_kab_mgl.png",
    },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html
            lang="id"
            className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}
        >
            <body className="min-h-full flex flex-col">
                {children}
                <Toast />
            </body>
        </html>
    );
}
