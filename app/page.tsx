"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, LogOut, Plus, Trash2, WalletCards } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type TransactionType = "income" | "expense";
type Transaction = { id: string; description: string; amount: number; category: string; type: TransactionType; date: string };

const categoryColors = ["#38bdf8", "#818cf8", "#f472b6", "#fb923c", "#4ade80", "#facc15"];
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budget, setBudget] = useState(3200);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setTransactions([]); return; }
    void loadData(user.id);
  }, [user]);

  async function loadData(userId: string) {
    setLoading(true);
    const [{ data: rows, error }, { data: budgetRow }] = await Promise.all([
      supabase.from("transactions").select("id,description,amount,category,type,transaction_date").order("transaction_date", { ascending: false }),
      supabase.from("budgets").select("monthly_amount").maybeSingle(),
    ]);
    if (error) setMessage(error.message);
    setTransactions((rows ?? []).map((row) => ({ ...row, amount: Number(row.amount), date: row.transaction_date })) as Transaction[]);
    if (budgetRow) setBudget(Number(budgetRow.monthly_amount));
    else await supabase.from("budgets").insert({ user_id: userId, monthly_amount: 3200 });
    setLoading(false);
  }

  const totals = useMemo(() => {
    const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
    const expenses = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
    return { income, expenses, balance: income - expenses, savingsRate: income ? ((income - expenses) / income) * 100 : 0 };
  }, [transactions]);

  const categories = useMemo(() => {
    const grouped = new Map<string, number>();
    transactions.filter((item) => item.type === "expense").forEach((item) => grouped.set(item.category, (grouped.get(item.category) ?? 0) + item.amount));
    return Array.from(grouped, ([name, value]) => ({ name, value }));
  }, [transactions]);

  async function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const amount = Number(form.get("amount"));
    const payload = {
      user_id: user.id,
      description: String(form.get("description")),
      amount,
      category: String(form.get("category")),
      type: String(form.get("type")) as TransactionType,
      transaction_date: String(form.get("date")),
    };
    const { data, error } = await supabase.from("transactions").insert(payload).select().single();
    if (error) return setMessage(error.message);
    setTransactions((current) => [{ id: data.id, description: data.description, amount: Number(data.amount), category: data.category, type: data.type, date: data.transaction_date }, ...current]);
    formElement.reset();
  }

  async function deleteTransaction(id: string) {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) return setMessage(error.message);
    setTransactions((current) => current.filter((item) => item.id !== id));
  }

  async function saveBudget(value: number) {
    setBudget(value);
    if (user && value > 0) await supabase.from("budgets").upsert({ user_id: user.id, monthly_amount: value });
  }

  if (loading) return <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">Loading FinanceApp…</main>;
  if (!user) return <AuthScreen message={message} setMessage={setMessage} />;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="mb-2 flex items-center gap-2 text-sky-400"><WalletCards size={22} /><span className="font-semibold">FinanceApp</span></div><h1 className="text-3xl font-bold">Your money, clearly organized.</h1><p className="mt-2 text-slate-400">Signed in as {user.email}</p></div>
          <div className="flex items-center gap-3"><div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4"><p className="text-sm text-slate-400">Available balance</p><p className="mt-1 text-3xl font-bold">{currency.format(totals.balance)}</p></div><button onClick={() => supabase.auth.signOut()} className="rounded-xl border border-slate-700 p-3 text-slate-300 hover:bg-slate-800" aria-label="Sign out"><LogOut /></button></div>
        </header>
        {message && <p className="mb-4 rounded-xl border border-amber-700/50 bg-amber-950/40 p-3 text-sm text-amber-200">{message}</p>}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Income" value={currency.format(totals.income)} icon={<ArrowUpRight />} detail="Total recorded" />
          <StatCard label="Expenses" value={currency.format(totals.expenses)} icon={<ArrowDownRight />} detail="Total recorded" />
          <StatCard label="Savings rate" value={`${totals.savingsRate.toFixed(1)}%`} icon={<WalletCards />} detail="Income retained" />
          <StatCard label="Budget remaining" value={currency.format(Math.max(budget - totals.expenses, 0))} icon={<Plus />} detail={`${budget ? Math.min((totals.expenses / budget) * 100, 100).toFixed(0) : 0}% used`} />
        </section>
        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6"><h2 className="mb-5 text-xl font-semibold">Recent transactions</h2><div className="space-y-3">{transactions.length === 0 && <p className="text-slate-400">No transactions yet.</p>}{transactions.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><div className={`grid h-10 w-10 place-items-center rounded-xl ${item.type === "income" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>{item.type === "income" ? <ArrowUpRight size={19} /> : <ArrowDownRight size={19} />}</div><div className="min-w-0 flex-1"><p className="truncate font-medium">{item.description}</p><p className="text-sm text-slate-500">{item.category} · {item.date}</p></div><p className={`font-semibold ${item.type === "income" ? "text-emerald-400" : "text-slate-100"}`}>{item.type === "income" ? "+" : "-"}{currency.format(item.amount)}</p><button onClick={() => deleteTransaction(item.id)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-rose-400"><Trash2 size={17} /></button></div>)}</div></div>
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6"><h2 className="text-xl font-semibold">Spending by category</h2><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categories} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={4}>{categories.map((entry, index) => <Cell key={entry.name} fill={categoryColors[index % categoryColors.length]} />)}</Pie><Tooltip formatter={(value) => currency.format(Number(value))} /></PieChart></ResponsiveContainer></div></div>
            <form onSubmit={addTransaction} className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6"><h2 className="text-xl font-semibold">Add transaction</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><input required name="description" placeholder="Description" className="field sm:col-span-2" /><input required name="amount" type="number" min="0.01" step="0.01" placeholder="Amount" className="field" /><input required name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="field" /><select name="type" className="field"><option value="expense">Expense</option><option value="income">Income</option></select><select name="category" className="field"><option>Food</option><option>Housing</option><option>Transportation</option><option>Utilities</option><option>Entertainment</option><option>Health</option><option>Income</option><option>Other</option></select></div><button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 hover:bg-sky-400"><Plus size={18} />Add transaction</button></form>
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold">Monthly budget</h2><p className="text-sm text-slate-400">Saved in Supabase</p></div><input aria-label="Monthly budget" type="number" min="1" value={budget} onChange={(event) => void saveBudget(Number(event.target.value))} className="field w-32 text-right" /></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-sky-500" style={{ width: `${budget ? Math.min((totals.expenses / budget) * 100, 100) : 0}%` }} /></div></div>
          </div>
        </section>
      </div>
    </main>
  );
}

function AuthScreen({ message, setMessage }: { message: string; setMessage: (value: string) => void }) {
  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const mode = String(form.get("mode"));
    const result = mode === "signup" ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password });
    setMessage(result.error?.message ?? (mode === "signup" ? "Account created. Check your email if confirmation is enabled." : "Signed in."));
  }
  return <main className="grid min-h-screen place-items-center bg-slate-950 p-5 text-slate-100"><form onSubmit={authenticate} className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-7"><div className="mb-6 flex items-center gap-2 text-sky-400"><WalletCards /><span className="font-semibold">FinanceApp</span></div><h1 className="text-3xl font-bold">Sign in to your dashboard</h1><p className="mt-2 text-slate-400">Your transactions are protected by Supabase Row Level Security.</p>{message && <p className="mt-4 rounded-xl bg-slate-950 p-3 text-sm text-slate-300">{message}</p>}<div className="mt-6 space-y-3"><input required name="email" type="email" placeholder="Email" className="field w-full" /><input required name="password" type="password" minLength={6} placeholder="Password" className="field w-full" /><select name="mode" className="field w-full"><option value="signin">Sign in</option><option value="signup">Create account</option></select></div><button className="mt-4 w-full rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 hover:bg-sky-400">Continue</button></form></main>;
}

function StatCard({ label, value, icon, detail }: { label: string; value: string; icon: React.ReactNode; detail: string }) {
  return <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center justify-between text-slate-400"><span className="text-sm">{label}</span><span className="text-sky-400">{icon}</span></div><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></article>;
}
