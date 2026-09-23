"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
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

type Debt = {
  id: string;
  user_id: string;
  name: string;
  total_amount: number | string;
  remaining_amount: number | string;
  minimum_payment: number | string;
  due_date: string | null;
  created_at: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(date: string | null) {
  if (!date) {
    return "No due date";
  }

  return dateFormatter.format(
    new Date(`${date}T12:00:00`)
  );
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("EUR");

  const [debtModalOpen, setDebtModalOpen] =
    useState(false);

  const [editingDebt, setEditingDebt] =
    useState<Debt | null>(null);

  const [name, setName] = useState("");
  const [totalAmount, setTotalAmount] =
    useState("");
  const [remainingAmount, setRemainingAmount] =
    useState("");
  const [minimumPayment, setMinimumPayment] =
    useState("");
  const [dueDate, setDueDate] = useState("");

  const [formError, setFormError] =
    useState("");
  const [saving, setSaving] =
    useState(false);

  const [menuOpen, setMenuOpen] =
    useState<string | null>(null);

  const [paymentDebt, setPaymentDebt] =
    useState<Debt | null>(null);

  const [paymentAmount, setPaymentAmount] =
    useState("");
  const [paymentError, setPaymentError] =
    useState("");
  const [paying, setPaying] =
    useState(false);

  const [deleteDebt, setDeleteDebt] =
    useState<Debt | null>(null);

  const [deleteError, setDeleteError] =
    useState("");
  const [deleting, setDeleting] =
    useState(false);

  const loadDebts = useCallback(async () => {
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

    const { data, error: loadError } =
      await supabase
        .from("debts")
        .select(
          "id, user_id, name, total_amount, remaining_amount, minimum_payment, due_date, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

    if (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }

    setDebts((data ?? []) as Debt[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  useEffect(() => {
    const modalOpen =
      debtModalOpen ||
      !!paymentDebt ||
      !!deleteDebt;

    if (!modalOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [
    debtModalOpen,
    paymentDebt,
    deleteDebt,
  ]);

  const totalDebt = useMemo(() => {
    return debts.reduce(
      (total, debt) =>
        total + Number(debt.total_amount),
      0
    );
  }, [debts]);

  const totalRemaining = useMemo(() => {
    return debts.reduce(
      (total, debt) =>
        total + Number(debt.remaining_amount),
      0
    );
  }, [debts]);

  const totalPaid = Math.max(
    totalDebt - totalRemaining,
    0
  );

  const overallProgress =
    totalDebt > 0
      ? Math.min(
          (totalPaid / totalDebt) * 100,
          100
        )
      : 0;

  function openNewDebt() {
    setEditingDebt(null);
    setName("");
    setTotalAmount("");
    setRemainingAmount("");
    setMinimumPayment("");
    setDueDate("");
    setFormError("");
    setDebtModalOpen(true);
  }

  function openEditDebt(debt: Debt) {
    setMenuOpen(null);

    setEditingDebt(debt);
    setName(debt.name);
    setTotalAmount(
      String(debt.total_amount)
    );
    setRemainingAmount(
      String(debt.remaining_amount)
    );
    setMinimumPayment(
      String(debt.minimum_payment)
    );
    setDueDate(debt.due_date ?? "");
    setFormError("");
    setDebtModalOpen(true);
  }

  function closeDebtModal() {
    if (saving) {
      return;
    }

    setDebtModalOpen(false);
    setEditingDebt(null);
    setFormError("");
  }

  async function handleDebtSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setFormError("");

    const numericTotal =
      Number(totalAmount);

    const numericRemaining =
      Number(remainingAmount);

    const numericMinimum =
      Number(minimumPayment || 0);

    if (!name.trim()) {
      setFormError(
        "Enter a name for the debt."
      );
      return;
    }

    if (
      !totalAmount ||
      Number.isNaN(numericTotal) ||
      numericTotal <= 0
    ) {
      setFormError(
        "Enter a valid total amount."
      );
      return;
    }

    if (
      !remainingAmount ||
      Number.isNaN(numericRemaining) ||
      numericRemaining < 0
    ) {
      setFormError(
        "Enter a valid remaining amount."
      );
      return;
    }

    if (numericRemaining > numericTotal) {
      setFormError(
        "Remaining amount cannot be greater than total debt."
      );
      return;
    }

    if (
      Number.isNaN(numericMinimum) ||
      numericMinimum < 0
    ) {
      setFormError(
        "Enter a valid minimum payment."
      );
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

    if (editingDebt) {
      const { error: updateError } =
        await supabase
          .from("debts")
          .update({
            name: name.trim(),
            total_amount: numericTotal,
            remaining_amount:
              numericRemaining,
            minimum_payment:
              numericMinimum,
            due_date: dueDate || null,
          })
          .eq("id", editingDebt.id)
          .eq("user_id", user.id);

      if (updateError) {
        setFormError(
          updateError.message
        );
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } =
        await supabase
          .from("debts")
          .insert({
            user_id: user.id,
            name: name.trim(),
            total_amount: numericTotal,
            remaining_amount:
              numericRemaining,
            minimum_payment:
              numericMinimum,
            due_date: dueDate || null,
          });

      if (insertError) {
        setFormError(
          insertError.message
        );
        setSaving(false);
        return;
      }
    }

    await loadDebts();

    setSaving(false);
    setDebtModalOpen(false);
    setEditingDebt(null);
  }

  function openPayment(debt: Debt) {
    setMenuOpen(null);
    setPaymentDebt(debt);
    setPaymentAmount("");
    setPaymentError("");
  }

  function closePayment() {
    if (paying) {
      return;
    }

    setPaymentDebt(null);
    setPaymentAmount("");
    setPaymentError("");
  }

  async function handlePayment(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!paymentDebt) {
      return;
    }

    setPaymentError("");

    const numericPayment =
      Number(paymentAmount);

    const remaining =
      Number(
        paymentDebt.remaining_amount
      );

    if (
      !paymentAmount ||
      Number.isNaN(numericPayment) ||
      numericPayment <= 0
    ) {
      setPaymentError(
        "Enter a valid payment amount."
      );
      return;
    }

    if (numericPayment > remaining) {
      setPaymentError(
        `The payment cannot be greater than ${formatMoney(remaining, currency)}.`
      );
      return;
    }

    setPaying(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setPaymentError(
        "Your session has expired. Please sign in again."
      );
      setPaying(false);
      return;
    }

    const newRemaining = Math.max(
      remaining - numericPayment,
      0
    );

    const today = new Date();
    const transactionDate = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    const {
      data: createdTransaction,
      error: transactionError,
    } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        type: "expense",
        amount: numericPayment,
        category: "Debt Payment",
        description: `${paymentDebt.name} payment`,
        transaction_date: transactionDate,
      })
      .select("id")
      .single();

    if (transactionError || !createdTransaction) {
      setPaymentError(
        transactionError?.message ??
          "Could not record the debt payment as an expense."
      );
      setPaying(false);
      return;
    }

    const { error: updateError } =
      await supabase
        .from("debts")
        .update({
          remaining_amount:
            newRemaining,
        })
        .eq("id", paymentDebt.id)
        .eq("user_id", user.id);

    if (updateError) {
      await supabase
        .from("transactions")
        .delete()
        .eq("id", createdTransaction.id)
        .eq("user_id", user.id);

      setPaymentError(
        updateError.message
      );
      setPaying(false);
      return;
    }

    await loadDebts();

    setPaying(false);
    setPaymentDebt(null);
    setPaymentAmount("");
  }

  function openDeleteDebt(debt: Debt) {
    setMenuOpen(null);
    setDeleteDebt(debt);
    setDeleteError("");
  }

  function closeDeleteDebt() {
    if (deleting) {
      return;
    }

    setDeleteDebt(null);
    setDeleteError("");
  }

  async function handleDeleteDebt() {
    if (!deleteDebt) {
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

    const { error: removeError } =
      await supabase
        .from("debts")
        .delete()
        .eq("id", deleteDebt.id)
        .eq("user_id", user.id);

    if (removeError) {
      setDeleteError(
        removeError.message
      );
      setDeleting(false);
      return;
    }

    await loadDebts();

    setDeleting(false);
    setDeleteDebt(null);
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
                  Debt payoff
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-slate-900">
                  Debts
                </h1>

                <p className="mt-1.5 text-sm text-slate-500">
                  Track balances and stay on top of your repayments.
                </p>
              </div>

              <button
                type="button"
                onClick={openNewDebt}
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                <Plus size={17} />
                Add debt
              </button>
            </header>

            {error && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-[#174E3B] p-5 text-white">
                <p className="text-sm text-emerald-100">
                  Remaining debt
                </p>

                <p className="mt-3 text-3xl font-semibold tracking-tight">
                  {formatMoney(totalRemaining, currency)}
                </p>

                <p className="mt-5 text-xs text-emerald-100">
                  Across {debts.length}{" "}
                  {debts.length === 1
                    ? "debt"
                    : "debts"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">
                  Paid off
                </p>

                <p className="mt-3 text-2xl font-semibold text-emerald-700">
                  {formatMoney(totalPaid, currency)}
                </p>

                <p className="mt-5 text-xs text-slate-400">
                  From{" "}
                  {formatMoney(totalDebt, currency)}{" "}
                  total
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">
                  Payoff progress
                </p>

                <p className="mt-3 text-2xl font-semibold text-slate-900">
                  {overallProgress.toFixed(
                    1
                  )}
                  %
                </p>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all"
                    style={{
                      width: `${overallProgress}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5">
              {loading ? (
                <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-400">
                  Loading debts...
                </div>
              ) : debts.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
                  <CreditCard
                    size={30}
                    strokeWidth={1.5}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-4 text-sm font-semibold text-slate-700">
                    No debts added
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Add a loan or other debt to start tracking repayments.
                  </p>

                  <button
                    type="button"
                    onClick={openNewDebt}
                    className="mt-5 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    + Add your first debt
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {debts.map((debt) => {
                    const total = Number(
                      debt.total_amount
                    );

                    const remaining =
                      Number(
                        debt.remaining_amount
                      );

                    const paid = Math.max(
                      total - remaining,
                      0
                    );

                    const progress =
                      total > 0
                        ? Math.min(
                            (paid / total) *
                              100,
                            100
                          )
                        : 0;

                    const complete =
                      remaining <= 0;

                    return (
                      <div
                        key={debt.id}
                        className="relative rounded-xl border border-slate-200 bg-white p-6"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                                complete
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {complete ? (
                                <CheckCircle2
                                  size={19}
                                />
                              ) : (
                                <CreditCard
                                  size={19}
                                />
                              )}
                            </div>

                            <div className="min-w-0">
                              <h2 className="truncate font-semibold text-slate-900">
                                {debt.name}
                              </h2>

                              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                                <CalendarDays
                                  size={13}
                                />
                                {formatDate(
                                  debt.due_date
                                )}
                              </div>
                            </div>
                          </div>

                          <div
                            className="relative"
                            onClick={(event) =>
                              event.stopPropagation()
                            }
                          >
                            <button
                              type="button"
                              aria-label="Debt options"
                              onClick={() =>
                                setMenuOpen(
                                  menuOpen ===
                                    debt.id
                                    ? null
                                    : debt.id
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                              <MoreHorizontal
                                size={18}
                              />
                            </button>

                            {menuOpen ===
                              debt.id && (
                              <div className="absolute right-0 top-9 z-30 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                {!complete && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openPayment(
                                        debt
                                      )
                                    }
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                  >
                                    <CircleDollarSign
                                      size={15}
                                    />
                                    Make payment
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditDebt(
                                      debt
                                    )
                                  }
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                >
                                  <Pencil
                                    size={15}
                                  />
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openDeleteDebt(
                                      debt
                                    )
                                  }
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                                >
                                  <Trash2
                                    size={15}
                                  />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-slate-400">
                              Remaining
                            </p>

                            <p className="mt-1 text-xl font-semibold text-slate-900">
                              {formatMoney(remaining, currency)}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-xs text-slate-400">
                              Original debt
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-600">
                              {formatMoney(total, currency)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-600 transition-all"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs">
                          <span
                            className={
                              complete
                                ? "font-semibold text-emerald-700"
                                : "text-slate-400"
                            }
                          >
                            {complete
                              ? "Debt paid off"
                              : `Minimum payment ${formatMoney(Number(debt.minimum_payment), currency)}`}
                          </span>

                          <span className="font-semibold text-slate-600">
                            {progress.toFixed(
                              1
                            )}
                            % paid
                          </span>
                        </div>

                        {!complete && (
                          <button
                            type="button"
                            onClick={() =>
                              openPayment(debt)
                            }
                            className="mt-5 flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                          >
                            <CircleDollarSign
                              size={15}
                            />
                            Make payment
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Add / Edit Debt */}
        {debtModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
            <button
              type="button"
              aria-label="Close"
              onClick={closeDebtModal}
              className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
            />

            <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                    Debt tracking
                  </p>

                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-slate-900">
                    {editingDebt
                      ? "Edit debt"
                      : "Add debt"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Enter the balance and repayment details.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeDebtModal}
                  disabled={saving}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  <X size={19} />
                </button>
              </div>

              <form
                onSubmit={handleDebtSubmit}
                className="p-6"
              >
                <div>
                  <label
                    htmlFor="debt-name"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Debt name
                  </label>

                  <input
                    id="debt-name"
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target.value
                      )
                    }
                    placeholder="e.g. Car loan"
                    maxLength={80}
                    autoFocus
                    className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-600"
                  />
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="total-amount"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Original amount
                    </label>

                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        {getCurrencySymbol(currency)}
                      </span>

                      <input
                        id="total-amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={totalAmount}
                        onChange={(event) =>
                          setTotalAmount(
                            event.target
                              .value
                          )
                        }
                        placeholder="0.00"
                        className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="remaining-amount"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Remaining
                    </label>

                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        {getCurrencySymbol(currency)}
                      </span>

                      <input
                        id="remaining-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          remainingAmount
                        }
                        onChange={(event) =>
                          setRemainingAmount(
                            event.target
                              .value
                          )
                        }
                        placeholder="0.00"
                        className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="minimum-payment"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Minimum payment
                    </label>

                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        {getCurrencySymbol(currency)}
                      </span>

                      <input
                        id="minimum-payment"
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          minimumPayment
                        }
                        onChange={(event) =>
                          setMinimumPayment(
                            event.target
                              .value
                          )
                        }
                        placeholder="0.00"
                        className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="due-date"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Due date
                      <span className="ml-1 font-normal text-slate-400">
                        optional
                      </span>
                    </label>

                    <input
                      id="due-date"
                      type="date"
                      value={dueDate}
                      onChange={(event) =>
                        setDueDate(
                          event.target.value
                        )
                      }
                      className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-emerald-600"
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
                    onClick={closeDebtModal}
                    disabled={saving}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="h-10 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : editingDebt
                      ? "Save changes"
                      : "Add debt"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Make Payment */}
        {paymentDebt && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <button
              type="button"
              aria-label="Close"
              onClick={closePayment}
              className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
            />

            <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                    {paymentDebt.name}
                  </p>

                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    Make payment
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Remaining balance:{" "}
                    {formatMoney(Number(paymentDebt.remaining_amount), currency)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closePayment}
                  disabled={paying}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={handlePayment}
                className="mt-6"
              >
                <label
                  htmlFor="payment-amount"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Payment amount
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    {getCurrencySymbol(currency)}
                  </span>

                  <input
                    id="payment-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(event) =>
                      setPaymentAmount(
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                    autoFocus
                    className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-lg font-semibold text-slate-900 outline-none placeholder:text-slate-300 focus:border-emerald-600"
                  />
                </div>

                {Number(
                  paymentDebt.minimum_payment
                ) > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setPaymentAmount(
                        String(
                          Math.min(
                            Number(
                              paymentDebt.minimum_payment
                            ),
                            Number(
                              paymentDebt.remaining_amount
                            )
                          )
                        )
                      )
                    }
                    className="mt-3 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    Use minimum payment (
                    {formatMoney(Math.min(Number(paymentDebt.minimum_payment), Number(paymentDebt.remaining_amount)), currency)}
                    )
                  </button>
                )}

                {paymentError && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {paymentError}
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closePayment}
                    disabled={paying}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={paying}
                    className="h-10 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                  >
                    {paying
                      ? "Processing..."
                      : "Record payment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Debt */}
        {deleteDebt && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
            <button
              type="button"
              aria-label="Close"
              onClick={closeDeleteDebt}
              className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
            />

            <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Delete debt?
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    <span className="font-medium text-slate-700">
                      {deleteDebt.name}
                    </span>{" "}
                    will be permanently removed.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeDeleteDebt}
                  disabled={deleting}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Remaining balance
                  </span>

                  <span className="text-sm font-semibold text-slate-900">
                    {formatMoney(Number(deleteDebt.remaining_amount), currency)}
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
                  onClick={closeDeleteDebt}
                  disabled={deleting}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDeleteDebt}
                  disabled={deleting}
                  className="h-10 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
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