"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import {
  CurrencyCode,
  formatMoney,
  getCurrencyCode,
  getCurrencySymbol,
} from "@/lib/currency";

type Budget = {
  id: string;
  user_id: string;
  category: string;
  amount: number | string;
  month: string;
  created_at: string;
};

type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number | string;
  category: string;
  transaction_date: string;
};

type BudgetWithSpent = Budget & {
  spent: number;
  remaining: number;
  percentage: number;
};

const categories = [
  "Housing",
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Education",
  "Travel",
  "Debt Payment",
  "Other",
];

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

function getMonthValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getMonthDatabaseValue(monthValue: string) {
  return `${monthValue}-01`;
}

function getNextMonthStart(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);

  const nextMonth = new Date(year, month, 1);

  const nextYear = nextMonth.getFullYear();
  const nextMonthNumber = String(
    nextMonth.getMonth() + 1
  ).padStart(2, "0");

  return `${nextYear}-${nextMonthNumber}-01`;
}

function getMonthLabel(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);

  return monthFormatter.format(
    new Date(year, month - 1, 1)
  );
}

export default function BudgetsPage() {
  const [selectedMonth, setSelectedMonth] = useState(
    getMonthValue(new Date())
  );

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("EUR");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] =
    useState<Budget | null>(null);

  const [category, setCategory] = useState("Food");
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const [deleteBudget, setDeleteBudget] =
    useState<Budget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loadData = useCallback(async () => {
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

    const monthStart =
      getMonthDatabaseValue(selectedMonth);

    const nextMonthStart =
      getNextMonthStart(selectedMonth);

    const [budgetsResult, transactionsResult] =
      await Promise.all([
        supabase
          .from("budgets")
          .select(
            "id, user_id, category, amount, month, created_at"
          )
          .eq("user_id", user.id)
          .eq("month", monthStart)
          .order("created_at", {
            ascending: true,
          }),

        supabase
          .from("transactions")
          .select(
            "id, type, amount, category, transaction_date"
          )
          .eq("user_id", user.id)
          .eq("type", "expense")
          .gte("transaction_date", monthStart)
          .lt("transaction_date", nextMonthStart),
      ]);

    if (budgetsResult.error) {
      setError(budgetsResult.error.message);
      setLoading(false);
      return;
    }

    if (transactionsResult.error) {
      setError(transactionsResult.error.message);
      setLoading(false);
      return;
    }

    setBudgets((budgetsResult.data ?? []) as Budget[]);

    setTransactions(
      (transactionsResult.data ?? []) as Transaction[]
    );

    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!modalOpen && !deleteBudget) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen, deleteBudget]);

  const budgetsWithSpent = useMemo<BudgetWithSpent[]>(() => {
    return budgets.map((budget) => {
      const budgetAmount = Number(budget.amount);

      const spent = transactions
        .filter(
          (transaction) =>
            transaction.category === budget.category
        )
        .reduce(
          (total, transaction) =>
            total + Number(transaction.amount),
          0
        );

      const remaining = budgetAmount - spent;

      const percentage =
        budgetAmount > 0
          ? (spent / budgetAmount) * 100
          : 0;

      return {
        ...budget,
        spent,
        remaining,
        percentage,
      };
    });
  }, [budgets, transactions]);

  const totalBudget = useMemo(() => {
    return budgets.reduce(
      (total, budget) =>
        total + Number(budget.amount),
      0
    );
  }, [budgets]);

  const totalSpent = useMemo(() => {
    return budgetsWithSpent.reduce(
      (total, budget) => total + budget.spent,
      0
    );
  }, [budgetsWithSpent]);

  const totalRemaining =
    totalBudget - totalSpent;

  const overallPercentage =
    totalBudget > 0
      ? (totalSpent / totalBudget) * 100
      : 0;

  function openAddBudget() {
    setEditingBudget(null);
    setCategory("Food");
    setAmount("");
    setFormError("");
    setModalOpen(true);
  }

  function openEditBudget(budget: Budget) {
    setMenuOpen(null);
    setEditingBudget(budget);
    setCategory(budget.category);
    setAmount(String(budget.amount));
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setEditingBudget(null);
    setFormError("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setFormError("");

    const numericAmount = Number(amount);

    if (
      !amount ||
      Number.isNaN(numericAmount) ||
      numericAmount <= 0
    ) {
      setFormError(
        "Enter a valid budget amount."
      );
      return;
    }

    if (!category) {
      setFormError("Select a category.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setFormError(
        "Your session has expired. Please sign in again."
      );
      setSaving(false);
      return;
    }

    if (editingBudget) {
      const { error: updateError } = await supabase
        .from("budgets")
        .update({
          category,
          amount: numericAmount,
        })
        .eq("id", editingBudget.id)
        .eq("user_id", user.id);

      if (updateError) {
        setFormError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const existingBudget = budgets.find(
        (budget) => budget.category === category
      );

      if (existingBudget) {
        setFormError(
          `You already have a ${category} budget for this month.`
        );
        setSaving(false);
        return;
      }

      const { error: insertError } = await supabase
        .from("budgets")
        .insert({
          user_id: user.id,
          category,
          amount: numericAmount,
          month:
            getMonthDatabaseValue(selectedMonth),
        });

      if (insertError) {
        setFormError(insertError.message);
        setSaving(false);
        return;
      }
    }

    await loadData();

    setSaving(false);
    setModalOpen(false);
    setEditingBudget(null);
  }

  function openDeleteBudget(budget: Budget) {
    setMenuOpen(null);
    setDeleteBudget(budget);
    setDeleteError("");
  }

  function closeDeleteModal() {
    if (deleting) {
      return;
    }

    setDeleteBudget(null);
    setDeleteError("");
  }

  async function handleDelete() {
    if (!deleteBudget) {
      return;
    }

    setDeleting(true);
    setDeleteError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setDeleteError(
        "Your session has expired. Please sign in again."
      );
      setDeleting(false);
      return;
    }

    const { error: removeError } = await supabase
      .from("budgets")
      .delete()
      .eq("id", deleteBudget.id)
      .eq("user_id", user.id);

    if (removeError) {
      setDeleteError(removeError.message);
      setDeleting(false);
      return;
    }

    await loadData();

    setDeleting(false);
    setDeleteBudget(null);
  }

  return (
    <AuthGuard>
      <main
        className="flex min-h-screen bg-[#F6F7F3]"
        onClick={() => {
          if (menuOpen) {
            setMenuOpen(null);
          }
        }}
      >
        <Sidebar />

        <section className="min-w-0 flex-1 px-8 py-7 lg:px-10">
          <div className="mx-auto max-w-[1400px]">
            <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">
                  Monthly plan
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-slate-900">
                  Budgets
                </h1>

                <p className="mt-1.5 text-sm text-slate-500">
                  Set spending limits and track how much you have left.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) =>
                    setSelectedMonth(event.target.value)
                  }
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 outline-none transition focus:border-emerald-600"
                />

                <button
                  type="button"
                  onClick={openAddBudget}
                  className="flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
                >
                  <Plus size={17} />
                  Add budget
                </button>
              </div>
            </header>

            {error && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-[#174E3B] p-5 text-white">
                <p className="text-sm text-emerald-100">
                  Monthly budget
                </p>

                <p className="mt-3 text-3xl font-semibold tracking-tight">
                  {formatMoney(totalBudget, currency)}
                </p>

                <p className="mt-5 text-xs text-emerald-100">
                  {getMonthLabel(selectedMonth)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">
                  Spent
                </p>

                <p className="mt-3 text-2xl font-semibold text-slate-900">
                  {formatMoney(totalSpent, currency)}
                </p>

                <div className="mt-5 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Used
                  </span>

                  <span
                    className={`font-semibold ${
                      overallPercentage > 100
                        ? "text-red-600"
                        : "text-slate-600"
                    }`}
                  >
                    {overallPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">
                  Remaining
                </p>

                <p
                  className={`mt-3 text-2xl font-semibold ${
                    totalRemaining < 0
                      ? "text-red-600"
                      : "text-emerald-700"
                  }`}
                >
                  {formatMoney(totalRemaining, currency)}
                </p>

                <p className="mt-5 text-xs text-slate-400">
                  Across all budget categories
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Category budgets
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    {getMonthLabel(selectedMonth)}
                  </p>
                </div>

                <WalletCards
                  size={20}
                  className="text-slate-400"
                />
              </div>

              {loading ? (
                <div className="px-6 py-16 text-center text-sm text-slate-400">
                  Loading budgets...
                </div>
              ) : budgetsWithSpent.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    No budgets yet
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Create a spending limit for one of your categories.
                  </p>

                  <button
                    type="button"
                    onClick={openAddBudget}
                    className="mt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    + Add your first budget
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {budgetsWithSpent.map((budget) => {
                    const overBudget =
                      budget.remaining < 0;

                    const closeToLimit =
                      !overBudget &&
                      budget.percentage >= 80;

                    return (
                      <div
                        key={budget.id}
                        className="relative px-6 py-5"
                      >
                        <div className="flex items-start justify-between gap-5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-800">
                                {budget.category}
                              </h3>

                              {overBudget && (
                                <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                                  <AlertTriangle size={13} />
                                  Over budget
                                </span>
                              )}

                              {closeToLimit && (
                                <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
                                  <AlertTriangle size={13} />
                                  Near limit
                                </span>
                              )}

                              {!overBudget &&
                                !closeToLimit &&
                                budget.percentage > 0 && (
                                  <CheckCircle2
                                    size={15}
                                    className="text-emerald-600"
                                  />
                                )}
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                              <p className="text-slate-500">
                                Spent{" "}
                                <span className="font-semibold text-slate-800">
                                  {formatMoney(budget.spent, currency)}
                                </span>
                              </p>

                              <p className="text-slate-500">
                                of{" "}
                                <span className="font-semibold text-slate-800">
                                  {formatMoney(Number(budget.amount), currency)}
                                </span>
                              </p>

                              <p
                                className={
                                  overBudget
                                    ? "font-medium text-red-600"
                                    : "font-medium text-emerald-700"
                                }
                              >
                                {overBudget
                                  ? `${formatMoney(Math.abs(budget.remaining), currency)} over`
                                  : `${formatMoney(budget.remaining, currency)} left`}
                              </p>
                            </div>

                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  overBudget
                                    ? "bg-red-500"
                                    : closeToLimit
                                    ? "bg-amber-500"
                                    : "bg-emerald-600"
                                }`}
                                style={{
                                  width: `${Math.min(
                                    budget.percentage,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>

                            <p className="mt-2 text-right text-xs font-medium text-slate-400">
                              {budget.percentage.toFixed(1)}%
                            </p>
                          </div>

                          <div
                            className="relative"
                            onClick={(event) =>
                              event.stopPropagation()
                            }
                          >
                            <button
                              type="button"
                              aria-label="Budget options"
                              onClick={() =>
                                setMenuOpen(
                                  menuOpen === budget.id
                                    ? null
                                    : budget.id
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                              <MoreHorizontal size={18} />
                            </button>

                            {menuOpen === budget.id && (
                              <div className="absolute right-0 top-9 z-30 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditBudget(budget)
                                  }
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                >
                                  <Pencil size={15} />
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openDeleteBudget(budget)
                                  }
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                                >
                                  <Trash2 size={15} />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
            <button
              type="button"
              aria-label="Close"
              onClick={closeModal}
              className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
            />

            <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                    {getMonthLabel(selectedMonth)}
                  </p>

                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-slate-900">
                    {editingBudget
                      ? "Edit budget"
                      : "Add budget"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Set a monthly spending limit.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  <X size={19} />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="p-6"
              >
                <div>
                  <label
                    htmlFor="budget-category"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Category
                  </label>

                  <select
                    id="budget-category"
                    value={category}
                    onChange={(event) =>
                      setCategory(event.target.value)
                    }
                    className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-600"
                  >
                    {categories.map((item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="budget-amount"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Monthly limit
                  </label>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                      {getCurrencySymbol(currency)}
                    </span>

                    <input
                      id="budget-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(event) =>
                        setAmount(event.target.value)
                      }
                      placeholder="0.00"
                      autoFocus
                      className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-lg font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-300 focus:border-emerald-600"
                    />
                  </div>
                </div>

                {formError && (
                  <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}

                <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="h-10 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : editingBudget
                      ? "Save changes"
                      : "Add budget"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteBudget && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <button
              type="button"
              aria-label="Close"
              onClick={closeDeleteModal}
              className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
            />

            <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Delete budget?
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    The{" "}
                    <span className="font-medium text-slate-700">
                      {deleteBudget.category}
                    </span>{" "}
                    budget for{" "}
                    {getMonthLabel(selectedMonth)} will be deleted.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Monthly limit
                  </span>

                  <span className="text-sm font-semibold text-slate-900">
                    {formatMoney(Number(deleteBudget.amount), currency)}
                  </span>
                </div>
              </div>

              {deleteError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {deleteError}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="h-10 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}