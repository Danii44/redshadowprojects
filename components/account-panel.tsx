import React, { useState } from "react";
import { X } from "lucide-react";
import type { Role } from "@/lib/types";
import { supabase } from "@/lib/supabase";

interface AccountPanelProps {
  panel: "profile" | "password";
  name: string;
  email: string;
  role: Role;
  close: () => void;
  notify: (message: string) => void;
}

export function AccountPanel({
  panel,
  name,
  email,
  role,
  close,
  notify,
}: AccountPanelProps) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirmation) return setError("Passwords do not match.");
    setBusy(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) return setError(updateError.message);
    notify("Password updated");
    close();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-red-600">Account</p>
            <h2 className="mt-1 text-2xl font-black">
              {panel === "profile" ? "Your profile" : "Change password"}
            </h2>
          </div>
          <button
            onClick={close}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close account panel"
          >
            <X size={20} />
          </button>
        </div>
        {panel === "profile" ? (
          <div className="space-y-3">
            <AccountField label="Name" value={name} />
            <AccountField label="Email" value={email || "Email unavailable"} />
            <AccountField label="Role" value={role} />
          </div>
        ) : (
          <form onSubmit={changePassword} className="space-y-4">
            <label className="block text-sm font-bold">
              New password
              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-red-400"
              />
            </label>
            <label className="block text-sm font-bold">
              Confirm new password
              <input
                required
                type="password"
                minLength={8}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-red-400"
              />
            </label>
            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}
            <button
              disabled={busy}
              className="h-11 w-full rounded-xl bg-[#e3292f] text-sm font-black text-white disabled:opacity-60"
            >
              {busy ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

export function AccountField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-bold text-slate-800">{value}</p>
    </div>
  );
}
