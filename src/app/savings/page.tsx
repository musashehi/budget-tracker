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
  MoreHorizontal,
  Pencil,
  PiggyBank,
  Plus,
  Trash2,
  Wallet,
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

type Saving = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number | string;
  current_amount: number | string;
  target_date: string | null;
  created_at: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(date: string | null) {
  if (!date) {
    return "No target date";
  }

  return dateFormatter.format(
    new Date(`${date}T12:00:00`)
  );
}

export default function SavingsPage() {
  const [savings, setSavings] = useState<Saving[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("EUR");

  const [goalModalOpen, setGoalModalOpen] =
    useState(false);

  const [editingGoal, setEditingGoal] =
    useState<Saving | null>(null);

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] =
    useState("");
  const [currentAmount, setCurrentAmount] =
    useState("");
  const [targetDate, setTargetDate] =
    useState("");

  const [formError, setFormError] =
    useState("");
  const [saving, setSaving] =
    useState(false);

  const [menuOpen, setMenuOpen] =
    useState<string | null>(null);

  const [addMoneyGoal, setAddMoneyGoal] =
    useState<Saving | null>(null);

  const [moneyAmount, setMoneyAmount] =
    useState("");
  const [moneyError, setMoneyError] =
    useState("");
  const [addingMoney, setAddingMoney] =
    useState(false);

  const [deleteGoal, setDeleteGoal] =
    useState<Saving | null>(null);

  const [deleteError, setDeleteError] =
    useState("");
  const [deleting, setDeleting] =
    useState(false);

  const loadSavings = useCallback(async () => {
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
        .from("savings")
        .select(
          "id, user_id, name, target_amount, current_amount, target_date, created_at"
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

    setSavings((data ?? []) as Saving[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSavings();
  }, [loadSavings]);

  useEffect(() => {
    const modalIsOpen =
      goalModalOpen ||
      !!addMoneyGoal ||
      !!deleteGoal;

    if (!modalIsOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [
    goalModalOpen,
    addMoneyGoal,
    deleteGoal,
  ]);

  const totalTarget = useMemo(() => {
    return savings.reduce(
      (total, goal) =>
        total + Number(goal.target_amount),
      0
    );
  }, [savings]);

  const totalSaved = useMemo(() => {
    return savings.reduce(
      (total, goal) =>
        total + Number(goal.current_amount),
      0
    );
  }, [savings]);

  const totalRemaining = Math.max(
    totalTarget - totalSaved,
    0
  );

  const overallProgress =
    totalTarget > 0
      ? Math.min(
          (totalSaved / totalTarget) * 100,
          100
        )
      : 0;

  function openNewGoal() {
    setEditingGoal(null);
    setName("");
    setTargetAmount("");
    setCurrentAmount("0");
    setTargetDate("");
    setFormError("");
    setGoalModalOpen(true);
  }

  function openEditGoal(goal: Saving) {
    setMenuOpen(null);

    setEditingGoal(goal);
    setName(goal.name);
    setTargetAmount(
      String(goal.target_amount)
    );
    setCurrentAmount(
      String(goal.current_amount)
    );
    setTargetDate(goal.target_date ?? "");
    setFormError("");
    setGoalModalOpen(true);
  }

  function closeGoalModal() {
    if (saving) {
      return;
    }

    setGoalModalOpen(false);
    setEditingGoal(null);
    setFormError("");
  }

  async function handleGoalSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setFormError("");

    const numericTarget =
      Number(targetAmount);

    const numericCurrent =
      Number(currentAmount || 0);

    if (!name.trim()) {
      setFormError(
        "Enter a name for your savings goal."
      );
      return;
    }

    if (
      !targetAmount ||
      Number.isNaN(numericTarget) ||
      numericTarget <= 0
    ) {
      setFormError(
        "Enter a valid target amount."
      );
      return;
    }

    if (
      Number.isNaN(numericCurrent) ||
      numericCurrent < 0
    ) {
      setFormError(
        "Enter a valid current amount."
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

    if (editingGoal) {
      const { error: updateError } =
        await supabase
          .from("savings")
          .update({
            name: name.trim(),
            target_amount: numericTarget,
            current_amount: numericCurrent,
            target_date:
              targetDate || null,
          })
          .eq("id", editingGoal.id)
          .eq("user_id", user.id);

      if (updateError) {
        setFormError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } =
        await supabase
          .from("savings")
          .insert({
            user_id: user.id,
            name: name.trim(),
            target_amount: numericTarget,
            current_amount: numericCurrent,
            target_date:
              targetDate || null,
          });

      if (insertError) {
        setFormError(insertError.message);
        setSaving(false);
        return;
      }
    }

    await loadSavings();

    setSaving(false);
    setGoalModalOpen(false);
    setEditingGoal(null);
  }

  function openAddMoney(goal: Saving) {
    setMenuOpen(null);
    setAddMoneyGoal(goal);
    setMoneyAmount("");
    setMoneyError("");
  }

  function closeAddMoney() {
    if (addingMoney) {
      return;
    }

    setAddMoneyGoal(null);
    setMoneyAmount("");
    setMoneyError("");
  }

  async function handleAddMoney(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!addMoneyGoal) {
      return;
    }

    setMoneyError("");

    const numericAmount =
      Number(moneyAmount);

    if (
      !moneyAmount ||
      Number.isNaN(numericAmount) ||
      numericAmount <= 0
    ) {
      setMoneyError(
        "Enter a valid amount."
      );
      return;
    }

    setAddingMoney(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMoneyError(
        "Your session has expired. Please sign in again."
      );
      setAddingMoney(false);
      return;
    }

    const newAmount =
      Number(addMoneyGoal.current_amount) +
      numericAmount;

    const { error: updateError } =
      await supabase
        .from("savings")
        .update({
          current_amount: newAmount,
        })
        .eq("id", addMoneyGoal.id)
        .eq("user_id", user.id);

    if (updateError) {
      setMoneyError(updateError.message);
      setAddingMoney(false);
      return;
    }

    await loadSavings();

    setAddingMoney(false);
    setAddMoneyGoal(null);
    setMoneyAmount("");
  }

  function openDeleteGoal(goal: Saving) {
    setMenuOpen(null);
    setDeleteGoal(goal);
    setDeleteError("");
  }

  function closeDeleteGoal() {
    if (deleting) {
      return;
    }

    setDeleteGoal(null);
    setDeleteError("");
  }

  async function handleDeleteGoal() {
    if (!deleteGoal) {
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
        .from("savings")
        .delete()
        .eq("id", deleteGoal.id)
        .eq("user_id", user.id);

    if (removeError) {
      setDeleteError(removeError.message);
      setDeleting(false);
      return;
    }

    await loadSavings();

    setDeleting(false);
    setDeleteGoal(null);
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
                  Financial goals
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-slate-900">
                  Savings
                </h1>

                <p className="mt-1.5 text-sm text-slate-500">
                  Set goals and keep track of the money you are saving.
                </p>
              </div>

              <button
                type="button"
                onClick={openNewGoal}
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                <Plus size={17} />
                New goal
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
                  Total saved
                </p>

                <p className="mt-3 text-3xl font-semibold tracking-tight">
                  {formatMoney(totalSaved, currency)}
                </p>

                <p className="mt-5 text-xs text-emerald-100">
                  Across {savings.length}{" "}
                  {savings.length === 1
                    ? "goal"
                    : "goals"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">
                  Target
                </p>

                <p className="mt-3 text-2xl font-semibold text-slate-900">
                  {formatMoney(totalTarget, currency)}
                </p>

                <p className="mt-5 text-xs text-slate-400">
                  Combined target amount
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">
                  Remaining
                </p>

                <p className="mt-3 text-2xl font-semibold text-slate-900">
                  {formatMoney(totalRemaining, currency)}
                </p>

                <p className="mt-5 text-xs font-medium text-emerald-700">
                  {overallProgress.toFixed(1)}%
                  overall progress
                </p>
              </div>
            </div>

            <div className="mt-5">
              {loading ? (
                <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-400">
                  Loading savings...
                </div>
              ) : savings.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
                  <PiggyBank
                    size={30}
                    strokeWidth={1.5}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-4 text-sm font-semibold text-slate-700">
                    No savings goals yet
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Create your first goal and start tracking your progress.
                  </p>

                  <button
                    type="button"
                    onClick={openNewGoal}
                    className="mt-5 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    + Create your first goal
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {savings.map((goal) => {
                    const target = Number(
                      goal.target_amount
                    );

                    const current = Number(
                      goal.current_amount
                    );

                    const progress =
                      target > 0
                        ? Math.min(
                            (current / target) *
                              100,
                            100
                          )
                        : 0;

                    const remaining =
                      Math.max(
                        target - current,
                        0
                      );

                    const complete =
                      current >= target;

                    return (
                      <div
                        key={goal.id}
                        className="relative rounded-xl border border-slate-200 bg-white p-6"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                              {complete ? (
                                <CheckCircle2
                                  size={19}
                                />
                              ) : (
                                <PiggyBank
                                  size={19}
                                />
                              )}
                            </div>

                            <div className="min-w-0">
                              <h2 className="truncate font-semibold text-slate-900">
                                {goal.name}
                              </h2>

                              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                                <CalendarDays
                                  size={13}
                                />
                                {formatDate(
                                  goal.target_date
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
                              aria-label="Goal options"
                              onClick={() =>
                                setMenuOpen(
                                  menuOpen ===
                                    goal.id
                                    ? null
                                    : goal.id
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                              <MoreHorizontal
                                size={18}
                              />
                            </button>

                            {menuOpen ===
                              goal.id && (
                              <div className="absolute right-0 top-9 z-30 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openAddMoney(
                                      goal
                                    )
                                  }
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                >
                                  <Wallet
                                    size={15}
                                  />
                                  Add money
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditGoal(
                                      goal
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
                                    openDeleteGoal(
                                      goal
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

                        <div className="mt-6 flex items-end justify-between gap-4">
                          <div>
                            <p className="text-xs text-slate-400">
                              Saved
                            </p>

                            <p className="mt-1 text-xl font-semibold text-slate-900">
                              {formatMoney(current, currency)}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-xs text-slate-400">
                              Goal
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-600">
                              {formatMoney(target, currency)}
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
                              ? "Goal completed"
                              : `${formatMoney(remaining, currency)} remaining`}
                          </span>

                          <span className="font-semibold text-slate-600">
                            {progress.toFixed(
                              1
                            )}
                            %
                          </span>
                        </div>

                        {!complete && (
                          <button
                            type="button"
                            onClick={() =>
                              openAddMoney(goal)
                            }
                            className="mt-5 flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                          >
                            <Plus size={15} />
                            Add money
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

        {/* Create / Edit Goal */}
        {goalModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
            <button
              type="button"
              aria-label="Close"
              onClick={closeGoalModal}
              className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
            />

            <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                    Savings
                  </p>

                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-slate-900">
                    {editingGoal
                      ? "Edit savings goal"
                      : "New savings goal"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Define what you are saving for.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeGoalModal}
                  disabled={saving}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  <X size={19} />
                </button>
              </div>

              <form
                onSubmit={handleGoalSubmit}
                className="p-6"
              >
                <div>
                  <label
                    htmlFor="goal-name"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Goal name
                  </label>

                  <input
                    id="goal-name"
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target.value
                      )
                    }
                    placeholder="e.g. New car"
                    maxLength={80}
                    autoFocus
                    className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-600"
                  />
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="target-amount"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Target amount
                    </label>

                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                        {getCurrencySymbol(currency)}
                      </span>

                      <input
                        id="target-amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={
                          targetAmount
                        }
                        onChange={(event) =>
                          setTargetAmount(
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
                      htmlFor="current-amount"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Already saved
                    </label>

                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                        {getCurrencySymbol(currency)}
                      </span>

                      <input
                        id="current-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          currentAmount
                        }
                        onChange={(event) =>
                          setCurrentAmount(
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

                <div className="mt-5">
                  <label
                    htmlFor="target-date"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Target date
                    <span className="ml-1 font-normal text-slate-400">
                      optional
                    </span>
                  </label>

                  <input
                    id="target-date"
                    type="date"
                    value={targetDate}
                    onChange={(event) =>
                      setTargetDate(
                        event.target.value
                      )
                    }
                    className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-emerald-600"
                  />
                </div>

                {formError && (
                  <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}

                <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={closeGoalModal}
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
                      : editingGoal
                      ? "Save changes"
                      : "Create goal"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Money */}
        {addMoneyGoal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <button
              type="button"
              aria-label="Close"
              onClick={closeAddMoney}
              className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
            />

            <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                    {addMoneyGoal.name}
                  </p>

                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    Add money
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Current balance:{" "}
                    {formatMoney(Number(addMoneyGoal.current_amount), currency)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeAddMoney}
                  disabled={addingMoney}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={handleAddMoney}
                className="mt-6"
              >
                <label
                  htmlFor="money-amount"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Amount to add
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                    {getCurrencySymbol(currency)}
                  </span>

                  <input
                    id="money-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={moneyAmount}
                    onChange={(event) =>
                      setMoneyAmount(
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                    autoFocus
                    className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-lg font-semibold text-slate-900 outline-none placeholder:text-slate-300 focus:border-emerald-600"
                  />
                </div>

                {moneyError && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {moneyError}
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeAddMoney}
                    disabled={addingMoney}
                    className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={addingMoney}
                    className="h-10 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                  >
                    {addingMoney
                      ? "Adding..."
                      : "Add money"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Goal */}
        {deleteGoal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
            <button
              type="button"
              aria-label="Close"
              onClick={closeDeleteGoal}
              className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
            />

            <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Delete savings goal?
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    <span className="font-medium text-slate-700">
                      {deleteGoal.name}
                    </span>{" "}
                    and its saved balance will be removed.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeDeleteGoal}
                  disabled={deleting}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Saved
                  </span>

                  <span className="text-sm font-semibold text-slate-900">
                    {formatMoney(Number(deleteGoal.current_amount), currency)}
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
                  onClick={closeDeleteGoal}
                  disabled={deleting}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDeleteGoal}
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