"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CompanyLogo } from "@/components/ui/company-logo";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("red-shadow-login-email") ?? "";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="grid min-h-dvh place-items-center bg-background p-5">
      <section className="login-surface w-full max-w-md rounded-3xl border border-border bg-white p-7 sm:p-10">
        <div className="mb-7 flex items-center gap-3">
          <CompanyLogo size={44}/>
          <div>
            <h1 className="font-semibold text-slate-900">Red Shadow Projects</h1>
            <p className="text-sm text-slate-500">Private company workspace</p>
          </div>
        </div>

        <div className="mb-8"><h2 className="text-3xl font-semibold tracking-tight text-foreground">Welcome back.</h2><p className="mt-2 text-sm leading-6 text-slate-500">Sign in to keep your projects and your team moving forward.</p></div>
        <form method="post" onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
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

          <div>
            <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700">Password</label>
            <div className="relative mt-2">
              <input required id="login-password" type={showPassword ? "text" : "password"} name="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 pl-4 pr-12 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900" />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>

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
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          <button
            disabled={busy}
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-white disabled:opacity-60 hover:bg-red-700 transition"
          >
            {busy ? "Signing in..." : <>Sign in <ArrowRight size={17} /></>}
          </button>
        </form>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500"><LockKeyhole size={12} />Private access for the Red Shadow team</p>
        <p className="mt-5 text-center text-xs text-slate-400">
          Accounts are created by your administrator.
        </p>
      </section>
    </main>
  );
}
