"use client";

import { CalendarDays, Menu } from "lucide-react";
import { ReactNode, Suspense, useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import ProfileMenu from "./ProfileMenu";
import NotificationBell from "./NotificationBell";

export default function FormShell({
    title,
    activeLabel,
    children,
}: {
    title: string;
    activeLabel?: string;
    children: ReactNode;
}) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [localDate, setLocalDate] = useState("");

    useEffect(() => {
        const timer = window.setTimeout(
            () =>
                setLocalDate(
                    new Intl.DateTimeFormat("id-ID", {
                        dateStyle: "long",
                    }).format(new Date()),
                ),
            0,
        );
        return () => window.clearTimeout(timer);
    }, []);

    return (
        <main className="app-shell">
            <Suspense fallback={null}>
                <Sidebar
                    mobileOpen={mobileOpen}
                    onMobileChange={setMobileOpen}
                    activeLabel={activeLabel ?? title}
                />
            </Suspense>
            <section className="main-area">
                <header className="topbar">
                    <button
                        className="icon-button menu-trigger"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Buka menu"
                    >
                        <Menu size={21} />
                    </button>
                    <div className="breadcrumb">
                        <span>Dashboard</span>
                        <span className="crumb-slash">/</span>
                        <strong>{title}</strong>
                    </div>
                    <div className="topbar-actions">
                        <NotificationBell />
                        <div className="topbar-date">
                            <CalendarDays size={16} /> {localDate}
                        </div>
                        <ProfileMenu />
                    </div>
                </header>
                {children}
            </section>
        </main>
    );
}
