"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#F6F7F3]">
      <div className="mx-auto flex min-h-screen max-w-[1400px]">
        {/* Left side */}
        <section className="hidden w-1/2 flex-col justify-between p-12 lg:flex">
          <div>
            <Link
              href="/"
              className="text-[24px] font-bold tracking-[-0.04em] text-slate-900"
            >
              Budgetly<span className="text-emerald-600">.</span>
            </Link>
          </div>

          <div className="max-w-lg">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Welcome back
            </p>

            <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.045em] text-slate-900">
              Know where your money goes.
            </h1>

            <p className="mt-6 max-w-md text-base leading-7 text-slate-500">
              Your income, spending, budgets and savings stay together in one
              simple view.
            </p>
          </div>

          <p className="text-xs text-slate-400">
            Budgetly · Personal finance
          </p>
        </section>

        {/* Login */}
        <section className="flex w-full items-center justify-center bg-white px-6 py-12 lg:w-1/2">
          <div className="w-full max-w-md">
            <Link
              href="/"
              className="mb-12 block text-[22px] font-bold tracking-[-0.04em] text-slate-900 lg:hidden"
            >
              Budgetly<span className="text-emerald-600">.</span>
            </Link>

            <p className="text-sm font-medium text-emerald-700">
              Welcome back
            </p>

            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-900">
              Sign in to Budgetly
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter your details to access your financial dashboard.
            </p>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    className="text-xs font-medium text-emerald-700"
                  >
                    Forgot password?
                  </button>
                </div>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                  className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Create account
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}