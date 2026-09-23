"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  CreditCard,
  PiggyBank,
  TrendingUp,
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import {
  CurrencyCode,
  formatCompactMoney,
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
};

type Saving = {
  id: string;
  target_amount: number | string;
  current_amount: number | string;
};

type Debt = {
  id: string;
  total_amount: number | string;
  remaining_amount: number | string;
};

type MonthlyData = {
  key: string;
  label: string;
  income: number;
  expenses: number;
};

type CategoryData = {
  category: string;
  amount: number;
  percentage: number;
};

function getMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getLastMonths(count: number) {
  const result: {
    key: string;
    label: string;
  }[] = [];

  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - i,
      1
    );

    result.push({
      key: getMonthKey(date),
      label: date.toLocaleDateString("en-US", {
        month: "short",
      }),
    });
  }

  return result;
}

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<
    Transaction[]
  >([]);

  const [savings, setSavings] = useState<Saving[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("EUR");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("currency")
      .eq("id", user.id)
      .maybeSingle();

    setCurrency(getCurrencyCode(profile?.currency));

    const [
      transactionsResult,
      savingsResult,
      debtsResult,
    ] = await Promise.all([
      supabase
        .from("transactions")
        .select(
          "id, type, amount, category, description, transaction_date"
        )
        .eq("user_id", user.id)
        .order("transaction_date", {
          ascending: true,
        }),

      supabase
        .from("savings")
        .select(
          "id, target_amount, current_amount"
        )
        .eq("user_id", user.id),

      supabase
        .from("debts")
        .select(
          "id, total_amount, remaining_amount"
        )
        .eq("user_id", user.id),
    ]);

    if (transactionsResult.error) {
      setError(transactionsResult.error.message);
      setLoading(false);
      return;
    }

    if (savingsResult.error) {
      setError(savingsResult.error.message);
      setLoading(false);
      return;
    }

    if (debtsResult.error) {
      setError(debtsResult.error.message);
      setLoading(false);
      return;
    }

    setTransactions(
      (transactionsResult.data ?? []) as Transaction[]
    );

    setSavings(
      (savingsResult.data ?? []) as Saving[]
    );

    setDebts((debtsResult.data ?? []) as Debt[]);

    setLoading(false);
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const currentMonth = getMonthKey(new Date());

  const currentMonthTransactions = useMemo(() => {
    return transactions.filter((transaction) =>
      transaction.transaction_date.startsWith(
        currentMonth
      )
    );
  }, [transactions, currentMonth]);

  const monthlyIncome = useMemo(() => {
    return currentMonthTransactions
      .filter(
        (transaction) =>
          transaction.type === "income"
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      );
  }, [currentMonthTransactions]);

  const monthlyExpenses = useMemo(() => {
    return currentMonthTransactions
      .filter(
        (transaction) =>
          transaction.type === "expense"
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      );
  }, [currentMonthTransactions]);

  const monthlyNet =
    monthlyIncome - monthlyExpenses;

  const savingsRate =
    monthlyIncome > 0
      ? (monthlyNet / monthlyIncome) * 100
      : 0;

  const totalSaved = useMemo(() => {
    return savings.reduce(
      (total, saving) =>
        total + Number(saving.current_amount),
      0
    );
  }, [savings]);

  const totalSavingsTarget = useMemo(() => {
    return savings.reduce(
      (total, saving) =>
        total + Number(saving.target_amount),
      0
    );
  }, [savings]);

  const savingsProgress =
    totalSavingsTarget > 0
      ? Math.min(
          (totalSaved / totalSavingsTarget) * 100,
          100
        )
      : 0;

  const totalDebt = useMemo(() => {
    return debts.reduce(
      (total, debt) =>
        total + Number(debt.total_amount),
      0
    );
  }, [debts]);

  const remainingDebt = useMemo(() => {
    return debts.reduce(
      (total, debt) =>
        total + Number(debt.remaining_amount),
      0
    );
  }, [debts]);

  const debtPaid = Math.max(
    totalDebt - remainingDebt,
    0
  );

  const debtProgress =
    totalDebt > 0
      ? Math.min(
          (debtPaid / totalDebt) * 100,
          100
        )
      : 0;

  const monthlyData = useMemo<MonthlyData[]>(() => {
    const months = getLastMonths(6);

    return months.map((month) => {
      const monthTransactions =
        transactions.filter((transaction) =>
          transaction.transaction_date.startsWith(
            month.key
          )
        );

      const income = monthTransactions
        .filter(
          (transaction) =>
            transaction.type === "income"
        )
        .reduce(
          (total, transaction) =>
            total + Number(transaction.amount),
          0
        );

      const expenses = monthTransactions
        .filter(
          (transaction) =>
            transaction.type === "expense"
        )
        .reduce(
          (total, transaction) =>
            total + Number(transaction.amount),
          0
        );

      return {
        key: month.key,
        label: month.label,
        income,
        expenses,
      };
    });
  }, [transactions]);

  const categoryData = useMemo<CategoryData[]>(() => {
    const totals: Record<string, number> = {};

    currentMonthTransactions
      .filter(
        (transaction) =>
          transaction.type === "expense"
      )
      .forEach((transaction) => {
        totals[transaction.category] =
          (totals[transaction.category] ?? 0) +
          Number(transaction.amount);
      });

    const sorted = Object.entries(totals)
      .map(([category, amount]) => ({
        category,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);

    return sorted.map((item) => ({
      ...item,
      percentage:
        monthlyExpenses > 0
          ? (item.amount / monthlyExpenses) * 100
          : 0,
    }));
  }, [
    currentMonthTransactions,
    monthlyExpenses,
  ]);

  const largestChartValue = useMemo(() => {
    const values = monthlyData.flatMap((month) => [
      month.income,
      month.expenses,
    ]);

    return Math.max(...values, 1);
  }, [monthlyData]);

  const hasMonthlyChartData = monthlyData.some(
    (month) =>
      month.income > 0 || month.expenses > 0
  );

  const currentMonthName =
    new Date().toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

  return (
    <AuthGuard>
      <main className="flex min-h-screen bg-[#F6F7F3]">
        <Sidebar />

        <section className="min-w-0 flex-1 px-8 py-7 lg:px-10">
          <div className="mx-auto max-w-[1400px]">
            <header>
              <p className="text-sm font-medium text-emerald-700">
                Financial overview
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-slate-900">
                Reports
              </h1>

              <p className="mt-1.5 text-sm text-slate-500">
                Understand where your money is going and how your finances are changing.
              </p>
            </header>

            {error && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="mt-8 rounded-xl border border-slate-200 bg-white px-6 py-20 text-center text-sm text-slate-400">
                Loading reports...
              </div>
            ) : (
              <>
                <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl bg-[#174E3B] p-5 text-white">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-emerald-100">
                        Net this month
                      </p>

                      <TrendingUp
                        size={18}
                        className="text-emerald-200"
                      />
                    </div>

                    <p className="mt-3 text-3xl font-semibold tracking-tight">
                      {formatMoney(monthlyNet, currency)}
                    </p>

                    <p className="mt-5 text-xs text-emerald-100">
                      {currentMonthName}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-500">
                        Income
                      </p>

                      <ArrowUpRight
                        size={18}
                        className="text-emerald-600"
                      />
                    </div>

                    <p className="mt-3 text-2xl font-semibold text-slate-900">
                      {formatMoney(monthlyIncome, currency)}
                    </p>

                    <p className="mt-5 text-xs text-slate-400">
                      Income this month
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-500">
                        Expenses
                      </p>

                      <ArrowDownRight
                        size={18}
                        className="text-[#B94A48]"
                      />
                    </div>

                    <p className="mt-3 text-2xl font-semibold text-slate-900">
                      {formatMoney(monthlyExpenses, currency)}
                    </p>

                    <p className="mt-5 text-xs text-slate-400">
                      Spending this month
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">
                      Savings rate
                    </p>

                    <p
                      className={`mt-3 text-2xl font-semibold ${
                        savingsRate >= 0
                          ? "text-emerald-700"
                          : "text-red-600"
                      }`}
                    >
                      {savingsRate.toFixed(1)}%
                    </p>

                    <p className="mt-5 text-xs text-slate-400">
                      Income minus expenses
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_0.75fr]">
                  {/* Monthly chart */}
                  <div className="rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                      <div>
                        <h2 className="font-semibold text-slate-900">
                          Income vs expenses
                        </h2>

                        <p className="mt-1 text-sm text-slate-400">
                          Last 6 months
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-2 text-slate-500">
                          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
                          Income
                        </div>

                        <div className="flex items-center gap-2 text-slate-500">
                          <span className="h-2.5 w-2.5 rounded-sm bg-[#C96562]" />
                          Expenses
                        </div>
                      </div>
                    </div>

                    {!hasMonthlyChartData ? (
                      <div className="flex h-[330px] flex-col items-center justify-center px-6 text-center">
                        <ChartNoAxesCombined
                          size={30}
                          strokeWidth={1.5}
                          className="text-slate-300"
                        />

                        <p className="mt-4 text-sm font-semibold text-slate-700">
                          No chart data yet
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          Add income and expenses to see your monthly trend.
                        </p>
                      </div>
                    ) : (
                      <div className="px-6 pb-6 pt-8">
                        <div className="flex h-[250px] items-end gap-4 sm:gap-7">
                          {monthlyData.map(
                            (month) => {
                              const incomeHeight =
                                month.income > 0
                                  ? Math.max(
                                      (month.income /
                                        largestChartValue) *
                                        100,
                                      3
                                    )
                                  : 0;

                              const expenseHeight =
                                month.expenses > 0
                                  ? Math.max(
                                      (month.expenses /
                                        largestChartValue) *
                                        100,
                                      3
                                    )
                                  : 0;

                              return (
                                <div
                                  key={month.key}
                                  className="flex h-full min-w-0 flex-1 flex-col justify-end"
                                >
                                  <div className="flex flex-1 items-end justify-center gap-1.5">
                                    <div
                                      title={`Income: ${formatMoney(month.income, currency)}`}
                                      className="w-full max-w-7 rounded-t bg-emerald-600 transition-all"
                                      style={{
                                        height: `${incomeHeight}%`,
                                      }}
                                    />

                                    <div
                                      title={`Expenses: ${formatMoney(month.expenses, currency)}`}
                                      className="w-full max-w-7 rounded-t bg-[#C96562] transition-all"
                                      style={{
                                        height: `${expenseHeight}%`,
                                      }}
                                    />
                                  </div>

                                  <p className="mt-3 text-center text-xs font-medium text-slate-400">
                                    {month.label}
                                  </p>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Categories */}
                  <div className="rounded-xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-6 py-5">
                      <h2 className="font-semibold text-slate-900">
                        Spending by category
                      </h2>

                      <p className="mt-1 text-sm text-slate-400">
                        {currentMonthName}
                      </p>
                    </div>

                    {categoryData.length === 0 ? (
                      <div className="px-6 py-16 text-center">
                        <p className="text-sm font-semibold text-slate-700">
                          No expenses yet
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          Your category breakdown will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-5 p-6">
                        {categoryData.map(
                          (item) => (
                            <div
                              key={
                                item.category
                              }
                            >
                              <div className="flex items-center justify-between gap-4">
                                <p className="truncate text-sm font-medium text-slate-700">
                                  {
                                    item.category
                                  }
                                </p>

                                <p className="shrink-0 text-sm font-semibold text-slate-900">
                                  {formatMoney(item.amount, currency)}
                                </p>
                              </div>

                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-emerald-600"
                                  style={{
                                    width: `${Math.min(
                                      item.percentage,
                                      100
                                    )}%`,
                                  }}
                                />
                              </div>

                              <p className="mt-1.5 text-right text-xs text-slate-400">
                                {item.percentage.toFixed(
                                  1
                                )}
                                %
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  {/* Savings */}
                  <div className="rounded-xl border border-slate-200 bg-white p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-slate-500">
                          Savings progress
                        </p>

                        <p className="mt-2 text-2xl font-semibold text-slate-900">
                          {formatMoney(totalSaved, currency)}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          of{" "}
                          {formatMoney(totalSavingsTarget, currency)}{" "}
                          target
                        </p>
                      </div>

                      <PiggyBank
                        size={21}
                        className="text-emerald-700"
                      />
                    </div>

                    <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-600"
                        style={{
                          width: `${savingsProgress}%`,
                        }}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {savings.length}{" "}
                        {savings.length === 1
                          ? "goal"
                          : "goals"}
                      </span>

                      <span className="font-semibold text-emerald-700">
                        {savingsProgress.toFixed(
                          1
                        )}
                        %
                      </span>
                    </div>
                  </div>

                  {/* Debt */}
                  <div className="rounded-xl border border-slate-200 bg-white p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-slate-500">
                          Debt payoff
                        </p>

                        <p className="mt-2 text-2xl font-semibold text-slate-900">
                          {formatMoney(remainingDebt, currency)}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          remaining from{" "}
                          {formatMoney(totalDebt, currency)}
                        </p>
                      </div>

                      <CreditCard
                        size={21}
                        className="text-slate-500"
                      />
                    </div>

                    <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-600"
                        style={{
                          width: `${debtProgress}%`,
                        }}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {formatMoney(debtPaid, currency)}{" "}
                        paid
                      </span>

                      <span className="font-semibold text-emerald-700">
                        {debtProgress.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Monthly table */}
                <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-6 py-5">
                    <h2 className="font-semibold text-slate-900">
                      Monthly breakdown
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      Income, expenses and net balance
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="min-w-[650px]">
                      <div className="grid grid-cols-4 border-b border-slate-100 bg-slate-50/70 px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                        <span>Month</span>
                        <span className="text-right">
                          Income
                        </span>
                        <span className="text-right">
                          Expenses
                        </span>
                        <span className="text-right">
                          Net
                        </span>
                      </div>

                      {[...monthlyData]
                        .reverse()
                        .map((month) => {
                          const net =
                            month.income -
                            month.expenses;

                          return (
                            <div
                              key={month.key}
                              className="grid grid-cols-4 border-b border-slate-100 px-6 py-4 text-sm last:border-b-0"
                            >
                              <span className="font-medium text-slate-700">
                                {month.label}
                              </span>

                              <span className="text-right font-medium text-emerald-700">
                                {formatCompactMoney(month.income, currency)}
                              </span>

                              <span className="text-right font-medium text-[#B94A48]">
                                {formatCompactMoney(month.expenses, currency)}
                              </span>

                              <span
                                className={`text-right font-semibold ${
                                  net >= 0
                                    ? "text-slate-900"
                                    : "text-red-600"
                                }`}
                              >
                                {formatCompactMoney(net, currency)}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </AuthGuard>
  );
}