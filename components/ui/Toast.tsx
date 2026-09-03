"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, X } from "lucide-react";

type ToastItem = {
    id: number;
    message: string;
    type: "error" | "success";
    leaving?: boolean;
};

const ERROR_EVENT = "dash-sampah:error";
const SUCCESS_EVENT = "dash-sampah:success";
const TOAST_EXIT_DURATION = 300;

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

export function showSuccessToast(message: string) {
    window.dispatchEvent(
        new CustomEvent(SUCCESS_EVENT, { detail: { message } }),
    );
}

export default function Toast() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    function dismissToast(id: number) {
        setToasts((current) =>
            current.map((toast) =>
                toast.id === id ? { ...toast, leaving: true } : toast,
            ),
        );
        window.setTimeout(() => {
            setToasts((current) => current.filter((toast) => toast.id !== id));
        }, TOAST_EXIT_DURATION);
    }

    useEffect(() => {
        const addToast = (event: Event, type: ToastItem["type"]) => {
            const message = getErrorMessage(
                (event as CustomEvent<{ message?: unknown }>).detail?.message,
            );
            const id = Date.now() + Math.random();
            setToasts((current) => [
                ...current.slice(-2),
                { id, message, type },
            ]);
            window.setTimeout(
                () => dismissToast(id),
                6000 - TOAST_EXIT_DURATION,
            );
        };
        const handleErrorToast = (event: Event) => addToast(event, "error");
        const handleSuccessToast = (event: Event) => addToast(event, "success");
        const handleRuntimeError = (event: ErrorEvent) => {
            showErrorToast(event.error ?? event.message);
        };
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            showErrorToast(event.reason);
        };
        const originalFetch = window.fetch;

        window.addEventListener(ERROR_EVENT, handleErrorToast);
        window.addEventListener(SUCCESS_EVENT, handleSuccessToast);
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
            window.removeEventListener(SUCCESS_EVENT, handleSuccessToast);
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
                <div
                    className={`error-toast ${toast.type === "success" ? "success-toast" : ""} ${toast.leaving ? "toast-leaving" : ""}`}
                    key={toast.id}
                    role="alert"
                >
                    {toast.type === "success" ? (
                        <CheckCircle size={18} />
                    ) : (
                        <AlertCircle size={18} />
                    )}
                    <span>{toast.message}</span>
                    <button
                        className="error-toast-close"
                        onClick={() => dismissToast(toast.id)}
                        aria-label="Tutup pesan error"
                    >
                        <X size={15} />
                    </button>
                </div>
            ))}
        </div>
    );
}
