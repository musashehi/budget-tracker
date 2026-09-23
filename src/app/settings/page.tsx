"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Check,
  CircleUserRound,
  Coins,
  Mail,
  Save,
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

type Currency = {
  code: string;
  name: string;
  symbol: string;
};

const currencies: Currency[] = [
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
  },
  {
    code: "ALL",
    name: "Albanian Lek",
    symbol: "L",
  },
  {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
  },
  {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
  },
];

export default function SettingsPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] =
    useState("EUR");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError(
        "Your session has expired. Please sign in again."
      );
      setLoading(false);
      return;
    }

    setEmail(user.email ?? "");

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("full_name, currency")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    setFullName(
      profile?.full_name ??
        user.user_metadata?.full_name ??
        ""
    );

    setCurrency(profile?.currency ?? "EUR");

    setLoading(false);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!fullName.trim()) {
      setError("Enter your full name.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError(
        "Your session has expired. Please sign in again."
      );
      setSaving(false);
      return;
    }

    const { error: profileError } =
      await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            full_name: fullName.trim(),
            currency,
          },
          {
            onConflict: "id",
          }
        );

    if (profileError) {
      setError(profileError.message);
      setSaving(false);
      return;
    }

    const { error: metadataError } =
      await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
        },
      });

    if (metadataError) {
      setError(metadataError.message);
      setSaving(false);
      return;
    }

    setFullName(fullName.trim());
    setSuccess("Settings saved successfully.");
    setSaving(false);
  }

  return (
    <AuthGuard>
      <main className="flex min-h-screen bg-[#F6F7F3]">
        <Sidebar />

        <section className="min-w-0 flex-1 px-8 py-7 lg:px-10">
          <div className="mx-auto max-w-[1000px]">
            <header>
              <p className="text-sm font-medium text-emerald-700">
                Account
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-slate-900">
                Settings
              </h1>

              <p className="mt-1.5 text-sm text-slate-500">
                Manage your profile and financial preferences.
              </p>
            </header>

            {loading ? (
              <div className="mt-8 rounded-xl border border-slate-200 bg-white px-6 py-20 text-center">
                <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-700" />

                <p className="mt-4 text-sm text-slate-400">
                  Loading settings...
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSave}
                className="mt-8"
              >
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-6 py-5">
                    <div className="flex items-center gap-3">
                      <CircleUserRound
                        size={20}
                        className="text-emerald-700"
                      />

                      <div>
                        <h2 className="font-semibold text-slate-900">
                          Profile
                        </h2>

                        <p className="mt-0.5 text-sm text-slate-400">
                          Your personal account information.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 p-6">
                    <div>
                      <label
                        htmlFor="full-name"
                        className="mb-2 block text-sm font-medium text-slate-700"
                      >
                        Full name
                      </label>

                      <input
                        id="full-name"
                        type="text"
                        value={fullName}
                        onChange={(event) => {
                          setFullName(
                            event.target.value
                          );
                          setSuccess("");
                        }}
                        placeholder="Your name"
                        maxLength={80}
                        className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="mb-2 block text-sm font-medium text-slate-700"
                      >
                        Email address
                      </label>

                      <div className="relative">
                        <Mail
                          size={17}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                          id="email"
                          type="email"
                          value={email}
                          readOnly
                          className="h-12 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-500 outline-none"
                        />
                      </div>

                      <p className="mt-2 text-xs text-slate-400">
                        Your login email cannot be changed here.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-6 py-5">
                    <div className="flex items-center gap-3">
                      <Coins
                        size={20}
                        className="text-emerald-700"
                      />

                      <div>
                        <h2 className="font-semibold text-slate-900">
                          Currency
                        </h2>

                        <p className="mt-0.5 text-sm text-slate-400">
                          Choose the currency used across your account.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {currencies.map((item) => {
                        const selected =
                          currency === item.code;

                        return (
                          <button
                            key={item.code}
                            type="button"
                            onClick={() => {
                              setCurrency(
                                item.code
                              );
                              setSuccess("");
                            }}
                            className={`flex items-center justify-between rounded-xl border px-4 py-4 text-left transition ${
                              selected
                                ? "border-emerald-600 bg-emerald-50/60"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                                  selected
                                    ? "bg-emerald-700 text-white"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {item.symbol}
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-slate-800">
                                  {item.code}
                                </p>

                                <p className="mt-0.5 text-xs text-slate-400">
                                  {item.name}
                                </p>
                              </div>
                            </div>

                            {selected && (
                              <Check
                                size={18}
                                className="text-emerald-700"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-5 rounded-lg bg-amber-50 px-4 py-3">
                      <p className="text-xs leading-5 text-amber-800">
                        Changing the currency changes your account preference.
                        It does not convert amounts that you have already entered.
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <Check size={17} />
                    {success}
                  </div>
                )}

                <div className="mt-5 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={16} />

                    {saving
                      ? "Saving..."
                      : "Save settings"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>
    </AuthGuard>
  );
}