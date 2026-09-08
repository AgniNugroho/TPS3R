"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, Clock, MessageSquareWarning } from "lucide-react";

type NotifItem = {
    id: string;
    tipe: "pengaduan" | "reminder";
    judul: string;
    pesan: string;
    waktu: string | null;
    href: string;
};

function timeAgo(iso: string | null) {
    if (!iso) return "";
    const diffMs = Date.now() - new Date(iso).getTime();
    const menit = Math.floor(diffMs / 60000);
    if (menit < 1) return "baru saja";
    if (menit < 60) return `${menit} menit lalu`;
    const jam = Math.floor(menit / 60);
    if (jam < 24) return `${jam} jam lalu`;
    const hari = Math.floor(jam / 24);
    if (hari === 1) return "kemarin";
    if (hari < 7) return `${hari} hari lalu`;
    return new Date(iso).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
    });
}

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotifItem[]>([]);
    const menuRef = useRef<HTMLDivElement>(null);

    const load = useCallback(() => {
        fetch("/api/notifikasi")
            .then((response) => response.json())
            .then((result) => {
                if (result?.ok && Array.isArray(result.items)) {
                    setItems(result.items);
                }
            })
            .catch(() => undefined);
    }, []);

    useEffect(() => {
        load();
        const timer = window.setInterval(load, 60000);
        const onFocus = () => load();
        window.addEventListener("focus", onFocus);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener("focus", onFocus);
        };
    }, [load]);

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

    const count = items.length;

    return (
        <div className="notif-menu" ref={menuRef}>
            <button
                className="icon-button notification"
                aria-label="Notifikasi"
                aria-expanded={open}
                aria-haspopup="menu"
                onClick={() => {
                    setOpen((value) => !value);
                    if (!open) load();
                }}
            >
                <Bell size={19} />
                {count > 0 && <i />}
            </button>
            {open && (
                <div className="notif-dropdown" role="menu">
                    <div className="notif-dropdown-head">
                        <strong>Notifikasi</strong>
                        {count > 0 && (
                            <span className="notif-count">{count}</span>
                        )}
                    </div>
                    {count === 0 ? (
                        <div className="notif-empty">
                            <BellOff size={22} />
                            <span>Tidak ada pemberitahuan</span>
                        </div>
                    ) : (
                        <ul className="notif-list">
                            {items.map((item) => (
                                <li key={item.id}>
                                    <Link
                                        href={item.href}
                                        className="notif-item"
                                        onClick={() => setOpen(false)}
                                    >
                                        <span
                                            className={`notif-item-icon ${item.tipe}`}
                                        >
                                            {item.tipe === "pengaduan" ? (
                                                <MessageSquareWarning
                                                    size={15}
                                                />
                                            ) : (
                                                <Clock size={15} />
                                            )}
                                        </span>
                                        <span className="notif-item-body">
                                            <strong>{item.judul}</strong>
                                            <span>{item.pesan}</span>
                                            {item.waktu && (
                                                <span className="notif-item-time">
                                                    {timeAgo(item.waktu)}
                                                </span>
                                            )}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
