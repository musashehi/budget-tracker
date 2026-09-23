"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Plus,
  TrendingUp,
  Wallet,
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import AddTransactionModal from "@/components/AddTransactionModal";
import { supabase } from "@/lib/supabase";
import {
  CurrencyCode,
  formatMoney,
  getCurrencyCode,
} from "@/lib/currency";

type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number | string;
  category: string;
  description: string | null;
  transaction_date: string;
  created_at: string;
};

type TransactionType = "income" | "expense";

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function formatTransactionDate(date: string) {
  return shortDateFormatter.format(
    new Date(`${date}T12:00:00`)
  );
}

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [transactionError, setTransactionError] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("EUR");

  const [modalOpen, setModalOpen] = useState(false);
  const [transactionType, setTransactionType] =
    useState<TransactionType>("expense");

  const now = new Date();

  const currentMonthLabel = monthFormatter.format(now);

  const currentMonthName = now.toLocaleDateString("en-US", {
    month: "long",
  });

  const monthStart = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-01`;

  const nextMonthDate = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1
  );

  const nextMonthStart = `${nextMonthDate.getFullYear()}-${String(
    nextMonthDate.getMonth() + 1
  ).padStart(2, "0")}-01`;

  const loadTransactions = useCallback(async () => {
    setLoadingTransactions(true);
    setTransactionError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoadingTransactions(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("currency")
      .eq("id", user.id)
      .maybeSingle();

    setCurrency(getCurrencyCode(profile?.currency));

    const { data, error } = await supabase
      .from("transactions")
      .select(
        "id, type, amount, category, description, transaction_date, created_at"
      )
      .eq("user_id", user.id)
      .order("transaction_date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      setTransactionError(error.message);
      setLoadingTransactions(false);
      return;
    }

    setTransactions((data ?? []) as Transaction[]);
    setLoadingTransactions(false);
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  function openTransactionModal(type: TransactionType) {
    setTransactionType(type);
    setModalOpen(true);
  }

  const monthlyTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      return (
        transaction.transaction_date >= monthStart &&
        transaction.transaction_date < nextMonthStart
      );
    });
  }, [transactions, monthStart, nextMonthStart]);

  const monthlyExpenses = useMemo(() => {
    return monthlyTransactions.filter(
      (transaction) => transaction.type === "expense"
    );
  }, [monthlyTransactions]);

  const income = useMemo(() => {
    return monthlyTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      );
  }, [monthlyTransactions]);

  const expenses = useMemo(() => {
    return monthlyExpenses.reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0
    );
  }, [monthlyExpenses]);

  const balance = useMemo(() => {
    return transactions.reduce((total, transaction) => {
      const amount = Number(transaction.amount);

      if (transaction.type === "income") {
        return total + amount;
      }

      return total - amount;
    }, 0);
  }, [transactions]);

  const savings = Math.max(income - expenses, 0);

  const savingsPercentage =
    income > 0 ? (savings / income) * 100 : 0;

  const expensePercentage =
    income > 0 ? (expenses / income) * 100 : 0;

  const recentTransactions = transactions.slice(0, 5);

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};

    monthlyExpenses.forEach((transaction) => {
      totals[transaction.category] =
        (totals[transaction.category] ?? 0) +
        Number(transaction.amount);
    });

    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [monthlyExpenses]);

  const dailySpending = useMemo(() => {
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();

    const totals = Array.from(
      { length: daysInMonth },
      (_, index) => ({
        day: index + 1,
        amount: 0,
      })
    );

    monthlyExpenses.forEach((transaction) => {
      const day = Number(
        transaction.transaction_date.slice(8, 10)
      );

      if (day >= 1 && day <= daysInMonth) {
        totals[day - 1].amount += Number(transaction.amount);
      }
    });

    return totals;
  }, [monthlyExpenses, now]);

  const maxDailySpending = useMemo(() => {
    return Math.max(
      ...dailySpending.map((item) => item.amount),
      1
    );
  }, [dailySpending]);

  const chartDays = useMemo(() => {
    const daysInMonth = dailySpending.length;

    return [1, 8, 15, 22, daysInMonth]
      .filter(
        (day, index, values) =>
          day <= daysInMonth &&
          values.indexOf(day) === index
      );
  }, [dailySpending]);

  return (
    <AuthGuard>
      <main className="flex min-h-screen bg-[#F6F7F3]">
        <Sidebar />

        <section className="min-w-0 flex-1 px-8 py-7 lg:px-10">
          <div className="mx-auto max-w-[1400px]">
            {/* Header */}
            <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">
                  {currentMonthLabel}
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-slate-900">
                  Dashboard
                </h1>

                <p className="mt-1.5 text-sm text-slate-500">
                  Keep an eye on your money and monthly spending.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600"
                >
                  <CalendarDays size={16} />
                  {currentMonthName}
                  <ChevronDown size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => openTransactionModal("expense")}
                  className="flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
                >
                  <Plus size={17} />
                  Add transaction
                </button>
              </div>
            </header>

            {transactionError && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {transactionError}
              </div>
            )}

            {/* Cards */}
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {/* Balance */}
              <div className="rounded-xl bg-[#174E3B] p-5 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-emerald-100">
                      Available balance
                    </p>

                    <p className="mt-3 text-3xl font-semibold tracking-tight">
                      {formatMoney(balance, currency)}
                    </p>
                  </div>

                  <Wallet
                    size={21}
                    className="text-emerald-100"
                  />
                </div>

                <p className="mt-5 text-xs text-emerald-100">
                  Based on all recorded transactions
                </p>
              </div>

              {/* Income */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-emerald-200 hover:shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">
                      Income
                    </p>

                    <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                      {formatMoney(income, currency)}
                    </p>
                  </div>

                  <ArrowDownLeft
                    size={21}
                    className="text-emerald-600"
                  />
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <TrendingUp size={14} />
                    This month
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openTransactionModal("income")
                    }
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-700 transition hover:text-emerald-900"
                  >
                    <Plus size={14} />
                    Add income
                  </button>
                </div>
              </div>

              {/* Expenses */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-red-200 hover:shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">
                      Expenses
                    </p>

                    <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                      {formatMoney(expenses, currency)}
                    </p>
                  </div>

                  <ArrowUpRight
                    size={21}
                    className="text-[#D95C59]"
                  />
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <p className="text-xs font-medium text-[#B94A48]">
                    {expensePercentage.toFixed(1)}% of income
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      openTransactionModal("expense")
                    }
                    className="flex items-center gap-1 text-xs font-semibold text-[#B94A48] transition hover:text-red-700"
                  >
                    <Plus size={14} />
                    Add expense
                  </button>
                </div>
              </div>

              {/* Savings */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">
                      Saved this month
                    </p>

                    <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                      {formatMoney(savings, currency)}
                    </p>
                  </div>

                  <div className="text-lg font-semibold text-[#3569A8]">
                    {savingsPercentage.toFixed(1)}%
                  </div>
                </div>

                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#3569A8]"
                    style={{
                      width: `${Math.min(
                        savingsPercentage,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Main area */}
            <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
              {/* Spending overview */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Spending overview
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Your spending throughout the month
                  </p>
                </div>

                {monthlyExpenses.length === 0 ? (
                  <div className="flex h-[270px] items-center justify-center">
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-600">
                        No spending data yet
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          openTransactionModal("expense")
                        }
                        className="mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                      >
                        + Add your first expense
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-7">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-semibold tracking-tight text-slate-900">
                          {formatMoney(expenses, currency)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Total spent in {currentMonthName}
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-50 px-3 py-2 text-right">
                        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
                          Daily average
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-700">
                          {formatMoney(
                            expenses / Math.max(now.getDate(), 1),
                            currency
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="relative mt-7 h-[210px]">
                      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                        {[0, 1, 2, 3].map((line) => (
                          <div
                            key={line}
                            className="border-t border-dashed border-slate-100"
                          />
                        ))}
                      </div>

                      <div className="absolute inset-0 flex items-end gap-[3px] sm:gap-1">
                        {dailySpending.map((item) => {
                          const height =
                            item.amount > 0
                              ? Math.max(
                                  (item.amount / maxDailySpending) * 100,
                                  4
                                )
                              : 0;

                          return (
                            <div
                              key={item.day}
                              className="group relative flex h-full min-w-0 flex-1 items-end"
                            >
                              {item.amount > 0 && (
                                <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg group-hover:block">
                                  Day {item.day} ·{" "}
                                  {formatMoney(item.amount, currency)}
                                </div>
                              )}

                              <div
                                className={`w-full rounded-t-[2px] transition ${
                                  item.amount > 0
                                    ? "bg-emerald-600/85 group-hover:bg-emerald-700"
                                    : "bg-transparent"
                                }`}
                                style={{
                                  height: `${height}%`,
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="relative mt-2 h-5 text-[11px] text-slate-400">
                      {chartDays.map((day) => {
                        const position =
                          dailySpending.length > 1
                            ? ((day - 1) /
                                (dailySpending.length - 1)) *
                              100
                            : 0;

                        return (
                          <span
                            key={day}
                            className="absolute -translate-x-1/2"
                            style={{ left: `${position}%` }}
                          >
                            {day}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Top spending */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Top spending
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Largest expense categories this month
                  </p>
                </div>

                {categoryTotals.length === 0 ? (
                  <div className="flex h-[220px] items-center justify-center">
                    <p className="text-sm text-slate-400">
                      No expenses recorded yet.
                    </p>
                  </div>
                ) : (
                  <div className="mt-7 space-y-5">
                    {categoryTotals.map(
                      ([categoryName, categoryAmount], index) => {
                        const colors = [
                          "bg-[#D95C59]",
                          "bg-[#D49A38]",
                          "bg-[#3569A8]",
                        ];

                        const percentage =
                          expenses > 0
                            ? (categoryAmount / expenses) * 100
                            : 0;

                        return (
                          <div key={categoryName}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${colors[index]}`}
                                />

                                <span className="text-sm text-slate-600">
                                  {categoryName}
                                </span>
                              </div>

                              <span className="text-sm font-semibold text-slate-800">
                                {formatMoney(
                                  categoryAmount,
                                  currency
                                )}
                              </span>
                            </div>

                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${colors[index]}`}
                                style={{
                                  width: `${percentage}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Recent transactions */}
            <div className="mt-5 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Recent transactions
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Your latest income and expenses
                  </p>
                </div>

                <Link
                  href="/transactions"
                  className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                >
                  View all
                </Link>
              </div>

              {loadingTransactions ? (
                <div className="px-6 py-10 text-center text-sm text-slate-400">
                  Loading transactions...
                </div>
              ) : recentTransactions.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm font-medium text-slate-600">
                    No transactions yet
                  </p>

                  <div className="mt-3 flex justify-center gap-5">
                    <button
                      type="button"
                      onClick={() =>
                        openTransactionModal("income")
                      }
                      className="text-xs font-semibold text-emerald-700"
                    >
                      + Add income
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openTransactionModal("expense")
                      }
                      className="text-xs font-semibold text-[#B94A48]"
                    >
                      + Add expense
                    </button>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between px-6 py-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {transaction.description ||
                            transaction.category}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {transaction.category} ·{" "}
                          {formatTransactionDate(
                            transaction.transaction_date
                          )}
                        </p>
                      </div>

                      <p
                        className={`text-sm font-semibold ${
                          transaction.type === "income"
                            ? "text-emerald-700"
                            : "text-slate-800"
                        }`}
                      >
                        {transaction.type === "income"
                          ? "+"
                          : "-"}
                        {formatMoney(
                          Number(transaction.amount),
                          currency
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <AddTransactionModal
          open={modalOpen}
          defaultType={transactionType}
          onClose={() => setModalOpen(false)}
          onTransactionAdded={loadTransactions}
        />
      </main>
    </AuthGuard>
  );
}