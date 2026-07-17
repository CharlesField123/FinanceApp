"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Plus, Trash2, WalletCards } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type TransactionType = "income" | "expense";

type Transaction = {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: TransactionType;
  date: string;
};

const seedTransactions: Transaction[] = [
  { id: "1", description: "Salary", amount: 4200, category: "Income", type: "income", date: "2026-07-01" },
  { id: "2", description: "Apartment rent", amount: 1450, category: "Housing", type: "expense", date: "2026-07-02" },
  { id: "3", description: "Groceries", amount: 186.42, category: "Food", type: "expense", date: "2026-07-06" },
  { id: "4", description: "Freelance project", amount: 850, category: "Income", type: "income", date: "2026-07-09" },
  { id: "5", description: "Internet and phone", amount: 112.3, category: "Utilities", type: "expense", date: "2026-07-11" },
];

const categoryColors = ["#38bdf8", "#818cf8", "#f472b6", "#fb923c", "#4ade80", "#facc15"];
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>(seedTransactions);
  const [budget, setBudget] = useState(3200);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedTransactions = localStorage.getItem("finance-app-transactions");
    const savedBudget = localStorage.getItem("finance-app-budget");
    if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
    if (savedBudget) setBudget(Number(savedBudget));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("finance-app-transactions", JSON.stringify(transactions));
    localStorage.setItem("finance-app-budget", String(budget));
  }, [transactions, budget, ready]);

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

  function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));
    if (!amount || amount <= 0) return;
    setTransactions((current) => [{
      id: crypto.randomUUID(),
      description: String(form.get("description")),
      amount,
      category: String(form.get("category")),
      type: String(form.get("type")) as TransactionType,
      date: String(form.get("date")),
    }, ...current]);
    event.currentTarget.reset();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sky-400"><WalletCards size={22} /><span className="font-semibold">FinanceApp</span></div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your money, clearly organized.</h1>
            <p className="mt-2 text-slate-400">Track cash flow, spending, and your monthly budget in one place.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 shadow-card">
            <p className="text-sm text-slate-400">Available balance</p>
            <p className="mt-1 text-3xl font-bold">{currency.format(totals.balance)}</p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Income" value={currency.format(totals.income)} icon={<ArrowUpRight />} detail="Total recorded" />
          <StatCard label="Expenses" value={currency.format(totals.expenses)} icon={<ArrowDownRight />} detail="Total recorded" />
          <StatCard label="Savings rate" value={`${totals.savingsRate.toFixed(1)}%`} icon={<WalletCards />} detail="Income retained" />
          <StatCard label="Budget remaining" value={currency.format(Math.max(budget - totals.expenses, 0))} icon={<Plus />} detail={`${Math.min((totals.expenses / budget) * 100, 100).toFixed(0)}% used`} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-card sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div><h2 className="text-xl font-semibold">Recent transactions</h2><p className="text-sm text-slate-400">Your latest income and expenses</p></div>
            </div>
            <div className="space-y-3">
              {transactions.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className={`grid h-10 w-10 place-items-center rounded-xl ${item.type === "income" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                    {item.type === "income" ? <ArrowUpRight size={19} /> : <ArrowDownRight size={19} />}
                  </div>
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{item.description}</p><p className="text-sm text-slate-500">{item.category} · {item.date}</p></div>
                  <p className={`font-semibold ${item.type === "income" ? "text-emerald-400" : "text-slate-100"}`}>{item.type === "income" ? "+" : "-"}{currency.format(item.amount)}</p>
                  <button aria-label={`Delete ${item.description}`} onClick={() => setTransactions((current) => current.filter((transaction) => transaction.id !== item.id))} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-rose-400"><Trash2 size={17} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-card sm:p-6">
              <h2 className="text-xl font-semibold">Spending by category</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={categories} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={4}>{categories.map((entry, index) => <Cell key={entry.name} fill={categoryColors[index % categoryColors.length]} />)}</Pie><Tooltip formatter={(value) => currency.format(Number(value))} /></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">{categories.map((item, index) => <div key={item.name} className="flex items-center justify-between rounded-xl bg-slate-950/60 px-3 py-2"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryColors[index % categoryColors.length] }} />{item.name}</span><span>{currency.format(item.value)}</span></div>)}</div>
            </div>

            <form onSubmit={addTransaction} className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-card sm:p-6">
              <h2 className="text-xl font-semibold">Add transaction</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input required name="description" placeholder="Description" className="field sm:col-span-2" />
                <input required name="amount" type="number" min="0.01" step="0.01" placeholder="Amount" className="field" />
                <input required name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="field" />
                <select name="type" className="field"><option value="expense">Expense</option><option value="income">Income</option></select>
                <select name="category" className="field"><option>Food</option><option>Housing</option><option>Transportation</option><option>Utilities</option><option>Entertainment</option><option>Health</option><option>Income</option><option>Other</option></select>
              </div>
              <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-400"><Plus size={18} />Add transaction</button>
            </form>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-card sm:p-6">
              <div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold">Monthly budget</h2><p className="text-sm text-slate-400">Adjust your spending target</p></div><input aria-label="Monthly budget" type="number" min="1" value={budget} onChange={(event) => setBudget(Number(event.target.value))} className="field w-32 text-right" /></div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${Math.min((totals.expenses / budget) * 100, 100)}%` }} /></div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value, icon, detail }: { label: string; value: string; icon: React.ReactNode; detail: string }) {
  return <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-card"><div className="flex items-center justify-between text-slate-400"><span className="text-sm">{label}</span><span className="text-sky-400">{icon}</span></div><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></article>;
}
