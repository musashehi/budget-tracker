"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  ArrowLeftRight,
  ChartPie,
  PiggyBank,
  Landmark,
  ChartNoAxesCombined,
  Settings,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const menuItems = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    name: "Transactions",
    icon: ArrowLeftRight,
    href: "/transactions",
  },
  {
    name: "Budgets",
    icon: ChartPie,
    href: "/budgets",
  },
  {
    name: "Savings",
    icon: PiggyBank,
    href: "/savings",
  },
  {
    name: "Debts",
    icon: Landmark,
    href: "/debts",
  },
  {
    name: "Reports",
    icon: ChartNoAxesCombined,
    href: "/reports",
  },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [fullName, setFullName] =
    useState("My Account");
  const [email, setEmail] = useState("");
  const [signingOut, setSigningOut] =
    useState(false);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      const profileName =
        profile?.full_name?.trim();

      const metadataName =
        user.user_metadata?.full_name?.trim();

      setFullName(
        profileName ||
          metadataName ||
          "My Account"
      );
    }

    loadUser();
  }, [pathname]);

  async function handleSignOut() {
    setSigningOut(true);

    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  }

  function getInitials(name: string) {
    const words = name
      .trim()
      .split(" ")
      .filter(Boolean);

    if (words.length === 0) {
      return "U";
    }

    if (words.length === 1) {
      return words[0]
        .charAt(0)
        .toUpperCase();
    }

    return (
      words[0].charAt(0) +
      words[words.length - 1].charAt(0)
    ).toUpperCase();
  }

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(href);
  }

  const settingsActive =
    pathname.startsWith("/settings");

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-[#FCFCFA] px-5 py-7">
      <div className="px-2">
        <Link
          href="/"
          className="text-[22px] font-bold tracking-[-0.04em] text-slate-900"
        >
          Budgetly
          <span className="text-emerald-600">
            .
          </span>
        </Link>

        <p className="mt-1 text-xs text-slate-400">
          Personal finance
        </p>
      </div>

      <nav className="mt-10 flex flex-1 flex-col">
        <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Overview
        </p>

        <div className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(
              item.href
            );

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`relative flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition-colors ${
                  active
                    ? "font-semibold text-slate-900"
                    : "font-medium text-slate-500 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                {active && (
                  <span className="absolute -left-5 h-6 w-[3px] rounded-r-full bg-emerald-600" />
                )}

                <Icon
                  size={18}
                  strokeWidth={
                    active ? 2.1 : 1.7
                  }
                  className={
                    active
                      ? "text-emerald-600"
                      : "text-slate-400"
                  }
                />

                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-slate-200 pt-4">
        <Link
          href="/settings"
          className={`relative flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors ${
            settingsActive
              ? "font-semibold text-slate-900"
              : "font-medium text-slate-500 hover:bg-slate-100/70 hover:text-slate-900"
          }`}
        >
          {settingsActive && (
            <span className="absolute -left-5 h-6 w-[3px] rounded-r-full bg-emerald-600" />
          )}

          <Settings
            size={18}
            strokeWidth={
              settingsActive ? 2.1 : 1.7
            }
            className={
              settingsActive
                ? "text-emerald-600"
                : "text-slate-400"
            }
          />

          <span>Settings</span>
        </Link>

        <div className="mt-4 flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-semibold text-white">
            {getInitials(fullName)}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">
              {fullName}
            </p>

            <p className="mt-0.5 truncate text-xs text-slate-400">
              {email ||
                "Personal account"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="mt-3 flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut
            size={17}
            strokeWidth={1.7}
          />

          <span>
            {signingOut
              ? "Signing out..."
              : "Sign out"}
          </span>
        </button>
      </div>
    </aside>
  );
}