"use client";

import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";

type Toast = {
    id: number;
    message: string;
};

const ERROR_EVENT = "dash-sampah:error";

function getErrorMessage(value: unknown) {
    if (value instanceof Error && value.message) return value.message;
    if (typeof value === "string" && value.trim()) return value;
    return "Terjadi kesalahan pada sistem.";
}

export function showErrorToast(error: unknown) {
    window.dispatchEvent(
        new CustomEvent(ERROR_EVENT, {
            detail: { message: getErrorMessage(error) },
        }),
    );
}

export default function ErrorToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        const handleErrorToast = (event: Event) => {
            const message = getErrorMessage(
                (event as CustomEvent<{ message?: unknown }>).detail?.message,
            );
            const id = Date.now() + Math.random();
            setToasts((current) => [...current.slice(-2), { id, message }]);
            window.setTimeout(() => {
                setToasts((current) =>
                    current.filter((toast) => toast.id !== id),
                );
            }, 6000);
        };
        const handleRuntimeError = (event: ErrorEvent) => {
            showErrorToast(event.error ?? event.message);
        };
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            showErrorToast(event.reason);
        };
        const originalFetch = window.fetch;

        window.addEventListener(ERROR_EVENT, handleErrorToast);
        window.addEventListener("error", handleRuntimeError);
        window.addEventListener("unhandledrejection", handleUnhandledRejection);
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);
                if (!response.ok) {
                    let message = `Permintaan gagal (${response.status}).`;
                    try {
                        const body = (await response.clone().json()) as {
                            error?: string;
                        };
                        if (body.error) message = body.error;
                    } catch {
                        // Keep the status message when the response is not JSON.
                    }
                    showErrorToast(message);
                }
                return response;
            } catch (error) {
                showErrorToast("Tidak dapat terhubung ke server.");
                throw error;
            }
        };

        return () => {
            window.removeEventListener(ERROR_EVENT, handleErrorToast);
            window.removeEventListener("error", handleRuntimeError);
            window.removeEventListener(
                "unhandledrejection",
                handleUnhandledRejection,
            );
            window.fetch = originalFetch;
        };
    }, []);

    return (
        <div
            className="error-toast-stack"
            aria-live="assertive"
            aria-atomic="false"
        >
            {toasts.map((toast) => (
                <div className="error-toast" key={toast.id} role="alert">
                    <AlertCircle size={18} />
                    <span>{toast.message}</span>
                    <button
                        className="error-toast-close"
                        onClick={() =>
                            setToasts((current) =>
                                current.filter((item) => item.id !== toast.id),
                            )
                        }
                        aria-label="Tutup pesan error"
                    >
                        <X size={15} />
                    </button>
                </div>
            ))}
        </div>
    );
}
