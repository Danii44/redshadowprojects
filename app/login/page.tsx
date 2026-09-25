"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("red-shadow-login-email") ?? "";
  });
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.localStorage.getItem("red-shadow-login-email"));
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${
            60 * 60 * 24 * 7
          }; SameSite=Lax`;
          router.replace("/");
        }
      });
    }
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase environment variables are missing.");
      return;
    }
    if (rememberEmail)
      window.localStorage.setItem("red-shadow-login-email", email);
    else window.localStorage.removeItem("red-shadow-login-email");

    setBusy(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setBusy(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (data.session) {
      document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${
        60 * 60 * 24 * 7
      }; SameSite=Lax`;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#111419] p-5">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e3292f] font-black text-white">
            R
          </span>
          <div>
            <h1 className="font-black text-slate-900">Red Shadow Projects</h1>
            <p className="text-sm text-slate-500">Private company workspace</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-bold text-slate-700">
            Work email
            <input
              required
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900"
            />
          </label>

          <label className="block text-sm font-bold text-slate-700">
            Password
            <input
              required
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900"
            />
          </label>

          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={rememberEmail}
              onChange={(e) => setRememberEmail(e.target.checked)}
              className="h-4 w-4 accent-[#e3292f]"
            />
            Remember my email
          </label>

          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          <button
            disabled={busy}
            type="submit"
            className="h-12 w-full rounded-xl bg-[#e3292f] font-black text-white disabled:opacity-60 hover:bg-red-700 transition"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Your browser can offer to save the password securely.
        </p>
        <p className="mt-5 text-center text-xs text-slate-400">
          Accounts are created by your administrator.
        </p>
      </section>
    </main>
  );
}
