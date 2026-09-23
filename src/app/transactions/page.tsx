"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import AddTransactionModal from "@/components/AddTransactionModal";
import { supabase } from "@/lib/supabase";
import {
  CurrencyCode,
  formatMoney,
  getCurrencyCode,
  getCurrencySymbol,
} from "@/lib/currency";

type TransactionType = "income" | "expense";
type FilterType = "all" | "income" | "expense";

type Transaction = {
  id: string;
  type: TransactionType;
  amount: number | string;
  category: string;
  description: string | null;
  transaction_date: string;
  created_at: string;
};

const expenseCategories = [
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

const incomeCategories = [
  "Salary",
  "Freelance",
  "Business",
  "Investment",
  "Gift",
  "Other",
];

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(date: string) {
  return dateFormatter.format(
    new Date(`${date}T12:00:00`)
  );
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("EUR");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [transactionType, setTransactionType] =
    useState<TransactionType>("expense");

  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const [editTransaction, setEditTransaction] =
    useState<Transaction | null>(null);

  const [editType, setEditType] =
    useState<TransactionType>("expense");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const [deleteTransaction, setDeleteTransaction] =
    useState<Transaction | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("currency")
      .eq("id", user.id)
      .maybeSingle();

    setCurrency(getCurrencyCode(profile?.currency));

    const { data, error: loadError } = await supabase
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

    if (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }

    setTransactions((data ?? []) as Transaction[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    if (!editTransaction && !deleteTransaction) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [editTransaction, deleteTransaction]);

  function openTransactionModal(type: TransactionType) {
    setTransactionType(type);
    setModalOpen(true);
  }

  function openEditModal(transaction: Transaction) {
    setMenuOpen(null);
    setEditTransaction(transaction);
    setEditType(transaction.type);
    setEditAmount(String(transaction.amount));
    setEditCategory(transaction.category);
    setEditDescription(transaction.description ?? "");
    setEditDate(transaction.transaction_date);
    setEditError("");
  }

  function closeEditModal() {
    if (editLoading) {
      return;
    }

    setEditTransaction(null);
    setEditError("");
  }

  function changeEditType(type: TransactionType) {
    setEditType(type);

    if (type === "income") {
      setEditCategory("Salary");
    } else {
      setEditCategory("Food");
    }
  }

  async function handleEditSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!editTransaction) {
      return;
    }

    setEditError("");

    const numericAmount = Number(editAmount);

    if (
      !editAmount ||
      Number.isNaN(numericAmount) ||
      numericAmount <= 0
    ) {
      setEditError("Enter a valid amount.");
      return;
    }

    if (!editCategory) {
      setEditError("Select a category.");
      return;
    }

    if (!editDate) {
      setEditError("Select a date.");
      return;
    }

    setEditLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setEditError(
        "Your session has expired. Please sign in again."
      );
      setEditLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("transactions")
      .update({
        type: editType,
        amount: numericAmount,
        category: editCategory,
        description: editDescription.trim() || null,
        transaction_date: editDate,
      })
      .eq("id", editTransaction.id)
      .eq("user_id", user.id);

    if (updateError) {
      setEditError(updateError.message);
      setEditLoading(false);
      return;
    }

    await loadTransactions();

    setEditLoading(false);
    setEditTransaction(null);
  }

  function openDeleteModal(transaction: Transaction) {
    setMenuOpen(null);
    setDeleteTransaction(transaction);
    setDeleteError("");
  }

  function closeDeleteModal() {
    if (deleteLoading) {
      return;
    }

    setDeleteTransaction(null);
    setDeleteError("");
  }

  async function handleDelete() {
    if (!deleteTransaction) {
      return;
    }

    setDeleteLoading(true);
    setDeleteError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setDeleteError(
        "Your session has expired. Please sign in again."
      );
      setDeleteLoading(false);
      return;
    }

    const { error: removeError } = await supabase
      .from("transactions")
      .delete()
      .eq("id", deleteTransaction.id)
      .eq("user_id", user.id);

    if (removeError) {
      setDeleteError(removeError.message);
      setDeleteLoading(false);
      return;
    }

    await loadTransactions();

    setDeleteLoading(false);
    setDeleteTransaction(null);
  }

  const filteredTransactions = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesType =
        filter === "all" || transaction.type === filter;

      const matchesSearch =
        !searchValue ||
        transaction.category.toLowerCase().includes(searchValue) ||
        (transaction.description ?? "")
          .toLowerCase()
          .includes(searchValue);

      return matchesType && matchesSearch;
    });
  }, [transactions, filter, search]);

  const totalIncome = useMemo(() => {
    return transactions
      .filter((transaction) => transaction.type === "income")
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      );
  }, [transactions]);

  const totalExpenses = useMemo(() => {
    return transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      );
  }, [transactions]);

  const editCategories =
    editType === "income"
      ? incomeCategories
      : expenseCategories;

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
                  Money activity
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-slate-900">
                  Transactions
                </h1>

                <p className="mt-1.5 text-sm text-slate-500">
                  Review all your income and expenses in one place.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => openTransactionModal("income")}
                  className="flex h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  <Plus size={16} />
                  Income
                </button>

                <button
                  type="button"
                  onClick={() => openTransactionModal("expense")}
                  className="flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
                >
                  <Plus size={16} />
                  Expense
                </button>
              </div>
            </header>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">
                  Total transactions
                </p>

                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {transactions.length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">
                      Total income
                    </p>

                    <p className="mt-2 text-2xl font-semibold text-emerald-700">
                      {formatMoney(totalIncome, currency)}
                    </p>
                  </div>

                  <ArrowDownLeft
                    size={20}
                    className="text-emerald-600"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">
                      Total expenses
                    </p>

                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {formatMoney(totalExpenses, currency)}
                    </p>
                  </div>

                  <ArrowUpRight
                    size={20}
                    className="text-[#D95C59]"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 overflow-visible rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative w-full lg:max-w-sm">
                    <Search
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      value={search}
                      onChange={(event) =>
                        setSearch(event.target.value)
                      }
                      placeholder="Search transactions..."
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <SlidersHorizontal
                      size={16}
                      className="mr-1 text-slate-400"
                    />

                    {(
                      [
                        ["all", "All"],
                        ["income", "Income"],
                        ["expense", "Expenses"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFilter(value)}
                        className={`h-9 rounded-lg px-4 text-sm font-medium transition ${
                          filter === value
                            ? "bg-slate-900 text-white"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="py-16 text-center text-sm text-slate-400">
                  Loading transactions...
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    No transactions found
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    {transactions.length === 0
                      ? "Add your first income or expense."
                      : "Try changing your search or filter."}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="hidden grid-cols-[1fr_150px_150px_130px_50px] border-b border-slate-100 bg-slate-50/70 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 md:grid">
                    <span>Transaction</span>
                    <span>Category</span>
                    <span>Date</span>
                    <span className="text-right">Amount</span>
                    <span />
                  </div>

                  <div className="divide-y divide-slate-100">
                    {filteredTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="relative grid gap-3 px-6 py-4 transition hover:bg-slate-50/60 md:grid-cols-[1fr_150px_150px_130px_50px] md:items-center"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                              transaction.type === "income"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-[#B94A48]"
                            }`}
                          >
                            {transaction.type === "income" ? (
                              <ArrowDownLeft size={17} />
                            ) : (
                              <ArrowUpRight size={17} />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {transaction.description ||
                                transaction.category}
                            </p>

                            <p className="mt-0.5 text-xs capitalize text-slate-400 md:hidden">
                              {transaction.type}
                            </p>
                          </div>
                        </div>

                        <p className="text-sm text-slate-500">
                          {transaction.category}
                        </p>

                        <p className="text-sm text-slate-500">
                          {formatDate(
                            transaction.transaction_date
                          )}
                        </p>

                        <p
                          className={`text-sm font-semibold md:text-right ${
                            transaction.type === "income"
                              ? "text-emerald-700"
                              : "text-slate-800"
                          }`}
                        >
                          {transaction.type === "income"
                            ? "+"
                            : "-"}
                          {formatMoney(Number(transaction.amount), currency)}
                        </p>

                        <div
                          className="relative flex justify-end"
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >
                          <button
                            type="button"
                            aria-label="Transaction options"
                            onClick={() =>
                              setMenuOpen(
                                menuOpen === transaction.id
                                  ? null
                                  : transaction.id
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <MoreHorizontal size={18} />
                          </button>

                          {menuOpen === transaction.id && (
                            <div className="absolute right-0 top-9 z-30 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(transaction)
                                }
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                              >
                                <Pencil size={15} />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openDeleteModal(transaction)
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
                    ))}
                  </div>
                </div>
              )}

              {!loading && transactions.length > 0 && (
                <div className="border-t border-slate-100 px-6 py-4">
                  <p className="text-xs text-slate-400">
                    Showing {filteredTransactions.length} of{" "}
                    {transactions.length} transactions
                  </p>
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

        {/* Edit modal */}
        {editTransaction && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8">
            <button
              type="button"
              aria-label="Close edit modal"
              onClick={closeEditModal}
              className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
            />

            <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                    Transaction
                  </p>

                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-slate-900">
                    Edit transaction
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Update the details of this transaction.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={editLoading}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  <X size={19} />
                </button>
              </div>

              <form
                onSubmit={handleEditSubmit}
                className="p-6"
              >
                <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() =>
                      changeEditType("expense")
                    }
                    className={`h-10 rounded-md text-sm font-semibold transition ${
                      editType === "expense"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    Expense
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      changeEditType("income")
                    }
                    className={`h-10 rounded-md text-sm font-semibold transition ${
                      editType === "income"
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    Income
                  </button>
                </div>

                <div className="mt-6">
                  <label
                    htmlFor="edit-amount"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Amount
                  </label>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                      {getCurrencySymbol(currency)}
                    </span>

                    <input
                      id="edit-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={editAmount}
                      onChange={(event) =>
                        setEditAmount(event.target.value)
                      }
                      className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-lg font-semibold text-slate-900 outline-none transition focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="edit-category"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Category
                    </label>

                    <select
                      id="edit-category"
                      value={editCategory}
                      onChange={(event) =>
                        setEditCategory(event.target.value)
                      }
                      className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-emerald-600"
                    >
                      {editCategories.map((category) => (
                        <option
                          key={category}
                          value={category}
                        >
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="edit-date"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Date
                    </label>

                    <input
                      id="edit-date"
                      type="date"
                      value={editDate}
                      onChange={(event) =>
                        setEditDate(event.target.value)
                      }
                      className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="edit-description"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Description
                    <span className="ml-1 font-normal text-slate-400">
                      optional
                    </span>
                  </label>

                  <input
                    id="edit-description"
                    type="text"
                    value={editDescription}
                    onChange={(event) =>
                      setEditDescription(event.target.value)
                    }
                    maxLength={120}
                    placeholder="Transaction description"
                    className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-600"
                  />
                </div>

                {editError && (
                  <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {editError}
                  </div>
                )}

                <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    disabled={editLoading}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={editLoading}
                    className="h-10 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {editLoading
                      ? "Saving..."
                      : "Save changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {deleteTransaction && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
            <button
              type="button"
              aria-label="Close delete confirmation"
              onClick={closeDeleteModal}
              className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
            />

            <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Delete transaction?
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    This will permanently delete{" "}
                    <span className="font-medium text-slate-700">
                      {deleteTransaction.description ||
                        deleteTransaction.category}
                    </span>
                    .
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deleteLoading}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Amount
                  </span>

                  <span
                    className={`text-sm font-semibold ${
                      deleteTransaction.type === "income"
                        ? "text-emerald-700"
                        : "text-slate-900"
                    }`}
                  >
                    {deleteTransaction.type === "income"
                      ? "+"
                      : "-"}
                    {formatMoney(Number(deleteTransaction.amount), currency)}
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
                  disabled={deleteLoading}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="h-10 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleteLoading
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