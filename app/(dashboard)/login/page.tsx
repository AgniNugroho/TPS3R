"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <main className="content-wrap" style={{ maxWidth: 400 }}>
      <h1>Login Petugas</h1>
      <p>Masuk untuk mencatat data pengumpulan sampah.</p>
      <form action={formAction} className="flex flex-col gap-4 mt-6">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            name="email"
            required
            className="border rounded-md px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            name="password"
            required
            className="border rounded-md px-3 py-2 text-sm"
          />
        </label>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="primary-button justify-center disabled:opacity-60"
        >
          {pending ? "Masuk..." : "Masuk"}
        </button>
      </form>
    </main>
  );
}
