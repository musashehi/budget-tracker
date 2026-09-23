"use client";

import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  CurrencyCode,
  getCurrencyCode,
  getCurrencySymbol,
} from "@/lib/currency";

type TransactionType = "income" | "expense";

type AddTransactionModalProps = {
  open: boolean;
  defaultType: TransactionType;
  onClose: () => void;
  onTransactionAdded: () => void | Promise<void>;
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

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function AddTransactionModal({
  open,
  defaultType,
  onClose,
  onTransactionAdded,
}: AddTransactionModalProps) {
  const [type, setType] =
    useState<TransactionType>(defaultType);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(
    defaultType === "income" ? "Salary" : "Food"
  );
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(getToday());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("EUR");

  const categories =
    type === "income"
      ? incomeCategories
      : expenseCategories;

  useEffect(() => {
    if (!open) {
      return;
    }

    async function loadCurrency() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("currency")
        .eq("id", user.id)
        .maybeSingle();

      setCurrency(getCurrencyCode(profile?.currency));
    }

    loadCurrency();

    setType(defaultType);
    setAmount("");
    setCategory(
      defaultType === "income" ? "Salary" : "Food"
    );
    setDescription("");
    setDate(getToday());
    setError("");
  }, [open, defaultType]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape
    );

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );

      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  function changeType(newType: TransactionType) {
    setType(newType);

    setCategory(
      newType === "income"
        ? "Salary"
        : "Food"
    );

    setError("");
  }

  function clearForm() {
    setAmount("");

    setCategory(
      type === "income"
        ? "Salary"
        : "Food"
    );

    setDescription("");
    setDate(getToday());
    setError("");
  }

  async function saveTransaction(
    addAnother: boolean
  ) {
    setError("");

    const numericAmount = Number(amount);

    if (
      !amount ||
      Number.isNaN(numericAmount) ||
      numericAmount <= 0
    ) {
      setError("Enter a valid amount.");
      return;
    }

    if (!category) {
      setError("Select a category.");
      return;
    }

    if (!date) {
      setError("Select a date.");
      return;
    }

    setLoading(true);

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

    const { error: insertError } =
      await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type,
          amount: numericAmount,
          category,
          description:
            description.trim() || null,
          transaction_date: date,
        });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    await onTransactionAdded();

    setLoading(false);

    if (addAnother) {
      clearForm();
      return;
    }

    onClose();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    await saveTransaction(false);
  }

  function handleClose() {
    if (loading) {
      return;
    }

    onClose();
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <button
        type="button"
        aria-label="Close modal"
        onClick={handleClose}
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
      />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p
              className={`text-xs font-semibold uppercase tracking-[0.12em] ${
                type === "income"
                  ? "text-emerald-700"
                  : "text-[#B94A48]"
              }`}
            >
              {type === "income"
                ? "Income"
                : "Expense"}
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-slate-900">
              Add {type}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {type === "income"
                ? "Record money you received."
                : "Record money you spent."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6"
        >
          <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() =>
                changeType("expense")
              }
              className={`h-10 rounded-md text-sm font-semibold transition ${
                type === "expense"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Expense
            </button>

            <button
              type="button"
              onClick={() =>
                changeType("income")
              }
              className={`h-10 rounded-md text-sm font-semibold transition ${
                type === "income"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Income
            </button>
          </div>

          <div className="mt-6">
            <label
              htmlFor="amount"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Amount
            </label>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                {getCurrencySymbol(currency)}
              </span>

              <input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) =>
                  setAmount(
                    event.target.value
                  )
                }
                placeholder="0.00"
                autoFocus
                className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-lg font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-300 focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="category"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Category
              </label>

              <select
                id="category"
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value
                  )
                }
                className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-600"
              >
                {categories.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="date"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Date
              </label>

              <input
                id="date"
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(
                    event.target.value
                  )
                }
                className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="mt-5">
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Description

              <span className="ml-1 font-normal text-slate-400">
                optional
              </span>
            </label>

            <input
              id="description"
              type="text"
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder={
                type === "income"
                  ? "e.g. September salary"
                  : "e.g. Weekly groceries"
              }
              maxLength={120}
              className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600"
            />
          </div>

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                saveTransaction(true)
              }
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Save & add another
            </button>

            <button
              type="submit"
              disabled={loading}
              className="h-10 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Saving..."
                : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}