"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, formAction, isPending] = useActionState(login, null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <form
        action={formAction}
        className="w-full max-w-sm space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-8"
      >
        <h1 className="text-lg font-semibold text-neutral-100">lpinvestors</h1>
        <p className="text-sm text-neutral-400">Enter the shared password to continue.</p>
        <input
          type="password"
          name="password"
          autoFocus
          required
          className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded bg-neutral-100 px-3 py-2 font-medium text-neutral-900 disabled:opacity-50"
        >
          {isPending ? "Checking..." : "Enter"}
        </button>
      </form>
    </main>
  );
}
