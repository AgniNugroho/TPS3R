"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff } from "lucide-react";

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Placeholder until the notifikasi backend exists.
    const items: { id: string; pesan: string }[] = [];
    const unreadCount = items.length;

    useEffect(() => {
        if (!open) return;
        function handlePointerDown(event: MouseEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        }
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") setOpen(false);
        }
        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    return (
        <div className="notif-menu" ref={menuRef}>
            <button
                className="icon-button notification"
                aria-label="Notifikasi"
                aria-expanded={open}
                aria-haspopup="menu"
                onClick={() => setOpen((value) => !value)}
            >
                <Bell size={19} />
                {unreadCount > 0 && <i />}
            </button>
            {open && (
                <div className="notif-dropdown" role="menu">
                    <div className="notif-dropdown-head">
                        <strong>Notifikasi</strong>
                        {unreadCount > 0 && (
                            <span className="notif-count">{unreadCount}</span>
                        )}
                    </div>
                    {items.length === 0 ? (
                        <div className="notif-empty">
                            <BellOff size={22} />
                            <span>Tidak ada pemberitahuan</span>
                        </div>
                    ) : (
                        <ul className="notif-list">
                            {items.map((item) => (
                                <li key={item.id}>{item.pesan}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
