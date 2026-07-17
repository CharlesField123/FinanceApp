"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Settings,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type TransactionType = "income" | "expense";
type Transaction = { id: string; description: string; amount: number; category: string; type: TransactionType; date: string };

const categoryColors = ["#6ee7b7", "#818cf8", "#f9a8d4", "#fbbf24", "#67e8f9", "#c4b5fd"];
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const navItems = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Transactions", icon: ReceiptText },
  { label: "Budgets", icon: Target },
  { label: "Accounts", icon: CreditCard },
];

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
    return Array.from(grouped, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  async function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      user_id: user.id,
      description: String(form.get("description")),
      amount: Number(form.get("amount")),
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

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthScreen message={message} setMessage={setMessage} />;

  const budgetUsed = budget ? Math.min((totals.expenses / budget) * 100, 100) : 0;
  const initials = user.email?.slice(0, 2).toUpperCase() ?? "FA";

  return (
    <main className="min-h-screen bg-[#f5f6f2] text-[#17221c]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-black/5 bg-[#f9faf7] px-5 py-7 lg:flex">
          <div className="flex items-center gap-3 px-2">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#183d2f] text-white shadow-sm"><WalletCards size={20} /></div>
            <div><p className="font-semibold tracking-tight">FinanceApp</p><p className="text-xs text-[#7c8981]">Personal finance</p></div>
          </div>
          <nav className="mt-10 space-y-1.5">
            {navItems.map(({ label, icon: Icon, active }) => (
              <button key={label} className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition ${active ? "bg-[#e4eee7] text-[#183d2f]" : "text-[#748078] hover:bg-black/[0.035] hover:text-[#24352b]"}`}>
                <Icon size={18} strokeWidth={active ? 2.4 : 2} />{label}
              </button>
            ))}
          </nav>
          <div className="mt-auto space-y-3">
            <div className="rounded-2xl bg-[#183d2f] p-4 text-white shadow-[0_18px_40px_rgba(24,61,47,.15)]">
              <div className="mb-5 grid h-9 w-9 place-items-center rounded-xl bg-white/10"><Sparkles size={17} /></div>
              <p className="font-medium">Stay on track</p>
              <p className="mt-1 text-xs leading-5 text-white/60">Review your spending each week and keep your goals moving.</p>
            </div>
            <button className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-[#748078] hover:bg-black/[0.035]"><Settings size={18} />Settings</button>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-black/5 bg-[#f9faf7]/80 px-5 py-4 backdrop-blur-xl sm:px-8 lg:px-10">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8b958f]">Overview</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">Good to see you.</h1>
            </div>
            <div className="flex items-center gap-2.5">
              <button className="grid h-10 w-10 place-items-center rounded-full border border-black/5 bg-white text-[#66736b] shadow-sm hover:text-[#183d2f]" aria-label="Notifications"><Bell size={18} /></button>
              <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 rounded-full border border-black/5 bg-white py-1.5 pl-1.5 pr-3 shadow-sm transition hover:shadow-md">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#d8e7dd] text-xs font-bold text-[#183d2f]">{initials}</span>
                <span className="hidden max-w-36 truncate text-sm font-medium sm:block">{user.email}</span><ChevronDown size={14} className="text-[#8a958e]" />
              </button>
            </div>
          </header>

          <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
            {message && <p className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</p>}

            <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
              <div className="overflow-hidden rounded-[28px] bg-[#183d2f] p-6 text-white shadow-[0_24px_60px_rgba(24,61,47,.16)] sm:p-8">
                <div className="flex items-start justify-between">
                  <div><p className="text-sm text-white/60">Total balance</p><p className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{currency.format(totals.balance)}</p></div>
                  <button className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white/70"><MoreHorizontal size={19} /></button>
                </div>
                <div className="mt-10 grid gap-3 sm:grid-cols-2">
                  <BalanceMetric label="Income" value={currency.format(totals.income)} icon={<ArrowUpRight size={17} />} positive />
                  <BalanceMetric label="Expenses" value={currency.format(totals.expenses)} icon={<ArrowDownRight size={17} />} />
                </div>
              </div>

              <div className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_16px_45px_rgba(46,61,52,.06)] sm:p-7">
                <div className="flex items-center justify-between"><div><p className="text-sm text-[#7c8981]">Monthly budget</p><p className="mt-2 text-3xl font-semibold tracking-tight">{currency.format(budget)}</p></div><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f0e8ff] text-[#7857a8]"><Target size={20} /></div></div>
                <div className="mt-8 flex items-end justify-between"><p className="text-sm text-[#7c8981]">Spent this month</p><p className="text-sm font-semibold">{budgetUsed.toFixed(0)}%</p></div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#edf0ec]"><div className="h-full rounded-full bg-[#9d7bd3] transition-all" style={{ width: `${budgetUsed}%` }} /></div>
                <div className="mt-5 flex items-center justify-between"><span className="text-sm text-[#7c8981]">Remaining</span><span className="font-semibold text-[#183d2f]">{currency.format(Math.max(budget - totals.expenses, 0))}</span></div>
                <input aria-label="Monthly budget" type="number" min="1" value={budget} onChange={(event) => void saveBudget(Number(event.target.value))} className="field mt-5 w-full" />
              </div>
            </section>

            <section className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Savings rate" value={`${totals.savingsRate.toFixed(1)}%`} detail="Of total income" icon={<TrendingUp size={19} />} tone="green" />
              <StatCard label="Transactions" value={String(transactions.length)} detail="Total recorded" icon={<ReceiptText size={19} />} tone="blue" />
              <StatCard label="Top category" value={categories[0]?.name ?? "None"} detail={categories[0] ? currency.format(categories[0].value) : "No spending yet"} icon={<CircleDollarSign size={19} />} tone="peach" />
              <StatCard label="Budget left" value={currency.format(Math.max(budget - totals.expenses, 0))} detail={`${budgetUsed.toFixed(0)}% used`} icon={<WalletCards size={19} />} tone="purple" />
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
              <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_16px_45px_rgba(46,61,52,.05)] sm:p-7">
                <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold tracking-tight">Recent transactions</h2><p className="mt-1 text-sm text-[#8a958e]">Your latest financial activity</p></div><button className="hidden items-center gap-1.5 text-sm font-medium text-[#2e654d] sm:flex">View all <ArrowRight size={15} /></button></div>
                <div className="mt-5 divide-y divide-black/5">
                  {transactions.length === 0 && <EmptyTransactions />}
                  {transactions.slice(0, 7).map((item) => (
                    <div key={item.id} className="group flex items-center gap-3 py-4 first:pt-1">
                      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${item.type === "income" ? "bg-[#e5f4eb] text-[#2f7d55]" : "bg-[#fff0ea] text-[#c26a49]"}`}>{item.type === "income" ? <ArrowUpRight size={19} /> : <ArrowDownRight size={19} />}</div>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.description}</p><p className="mt-1 text-xs text-[#929b95]">{item.category} · {item.date}</p></div>
                      <p className={`text-sm font-semibold ${item.type === "income" ? "text-[#2f7d55]" : "text-[#27372e]"}`}>{item.type === "income" ? "+" : "-"}{currency.format(item.amount)}</p>
                      <button onClick={() => deleteTransaction(item.id)} className="grid h-8 w-8 place-items-center rounded-lg text-[#a8afa9] opacity-0 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100" aria-label={`Delete ${item.description}`}><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_16px_45px_rgba(46,61,52,.05)] sm:p-7">
                <div><h2 className="text-lg font-semibold tracking-tight">Spending breakdown</h2><p className="mt-1 text-sm text-[#8a958e]">Expenses by category</p></div>
                {categories.length ? (
                  <>
                    <div className="relative mx-auto mt-3 h-56 max-w-xs"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categories} dataKey="value" nameKey="name" innerRadius={64} outerRadius={90} paddingAngle={5} stroke="none">{categories.map((entry, index) => <Cell key={entry.name} fill={categoryColors[index % categoryColors.length]} />)}</Pie><Tooltip formatter={(value) => currency.format(Number(value))} contentStyle={{ borderRadius: 14, border: "1px solid rgba(0,0,0,.06)", boxShadow: "0 12px 30px rgba(0,0,0,.08)" }} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="text-xs text-[#8a958e]">Total spent</p><p className="mt-1 font-semibold">{currency.format(totals.expenses)}</p></div></div></div>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">{categories.slice(0, 6).map((item, index) => <div key={item.name} className="flex items-center justify-between text-sm"><span className="flex min-w-0 items-center gap-2 text-[#68756d]"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryColors[index % categoryColors.length] }} /><span className="truncate">{item.name}</span></span><span className="ml-2 font-medium">{currency.format(item.value)}</span></div>)}</div>
                  </>
                ) : <div className="grid h-64 place-items-center text-center"><div><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f0f3ef] text-[#92a098]"><CircleDollarSign size={21} /></div><p className="mt-3 text-sm font-medium">No expense data yet</p><p className="mt-1 text-xs text-[#929b95]">Add an expense to see your breakdown.</p></div></div>}
              </div>
            </section>

            <form onSubmit={addTransaction} className="mt-5 rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_16px_45px_rgba(46,61,52,.05)] sm:p-7">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold tracking-tight">Add a transaction</h2><p className="mt-1 text-sm text-[#8a958e]">Keep your dashboard up to date.</p></div><div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#e4eee7] text-[#2e654d]"><Plus size={18} /></div></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><input required name="description" placeholder="Description" className="field xl:col-span-2" /><input required name="amount" type="number" min="0.01" step="0.01" placeholder="Amount" className="field" /><input required name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="field" /><select name="type" className="field"><option value="expense">Expense</option><option value="income">Income</option></select><select name="category" className="field sm:col-span-2 xl:col-span-2"><option>Food</option><option>Housing</option><option>Transportation</option><option>Utilities</option><option>Entertainment</option><option>Health</option><option>Income</option><option>Other</option></select><button className="flex items-center justify-center gap-2 rounded-xl bg-[#183d2f] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#23523f] xl:col-span-3"><Plus size={17} />Add transaction</button></div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function LoadingScreen() {
  return <main className="grid min-h-screen place-items-center bg-[#f5f6f2] text-[#183d2f]"><div className="text-center"><div className="mx-auto grid h-14 w-14 animate-pulse place-items-center rounded-2xl bg-[#183d2f] text-white"><WalletCards /></div><p className="mt-4 text-sm font-medium">Loading your finances…</p></div></main>;
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
  return <main className="relative grid min-h-screen overflow-hidden bg-[#f3f5f0] p-5 text-[#17221c]"><div className="absolute -left-20 -top-24 h-80 w-80 rounded-full bg-[#dcebe1] blur-3xl" /><div className="absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-[#e8ddf5] blur-3xl" /><div className="relative m-auto grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/70 bg-white/80 shadow-[0_30px_90px_rgba(40,58,47,.12)] backdrop-blur-xl lg:grid-cols-2"><div className="hidden bg-[#183d2f] p-10 text-white lg:flex lg:flex-col"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10"><WalletCards size={20} /></div><span className="font-semibold">FinanceApp</span></div><div className="my-auto"><p className="text-sm font-medium text-[#9bd1b4]">A clearer financial life</p><h1 className="mt-4 text-5xl font-semibold leading-[1.08] tracking-[-0.045em]">Make every dollar feel intentional.</h1><p className="mt-5 max-w-md text-sm leading-6 text-white/60">Track your spending, understand your habits, and build healthier money routines from one beautiful dashboard.</p></div><div className="flex items-center gap-2 text-xs text-white/45"><Sparkles size={14} />Private, secure, and powered by Supabase</div></div><form onSubmit={authenticate} className="p-7 sm:p-10 lg:p-12"><div className="flex items-center gap-3 lg:hidden"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#183d2f] text-white"><WalletCards size={20} /></div><span className="font-semibold">FinanceApp</span></div><p className="mt-10 text-sm font-medium text-[#2e654d] lg:mt-0">Welcome back</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">Sign in to your account</h2><p className="mt-3 text-sm leading-6 text-[#7c8981]">Enter your details to access your personal finance dashboard.</p>{message && <p className="mt-5 rounded-2xl bg-[#f3f5f1] p-3.5 text-sm text-[#5c6b62]">{message}</p>}<div className="mt-7 space-y-4"><label className="block text-sm font-medium">Email address<input required name="email" type="email" placeholder="you@example.com" className="field mt-2 w-full" /></label><label className="block text-sm font-medium">Password<input required name="password" type="password" minLength={6} placeholder="At least 6 characters" className="field mt-2 w-full" /></label><select name="mode" className="field w-full"><option value="signin">Sign in</option><option value="signup">Create account</option></select></div><button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#183d2f] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#23523f]">Continue <ArrowRight size={17} /></button></form></div></main>;
}

function BalanceMetric({ label, value, icon, positive }: { label: string; value: string; icon: React.ReactNode; positive?: boolean }) {
  return <div className="rounded-2xl bg-white/[0.08] p-4"><div className="flex items-center gap-2 text-xs text-white/55"><span className={`grid h-7 w-7 place-items-center rounded-lg ${positive ? "bg-[#76d6a1]/15 text-[#9be3b9]" : "bg-[#ffb29a]/15 text-[#ffc1ad]"}`}>{icon}</span>{label}</div><p className="mt-3 text-lg font-semibold">{value}</p></div>;
}

function StatCard({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: React.ReactNode; tone: "green" | "blue" | "peach" | "purple" }) {
  const tones = { green: "bg-[#e5f4eb] text-[#2f7d55]", blue: "bg-[#e8f2f8] text-[#467d9b]", peach: "bg-[#fff0e8] text-[#bf704d]", purple: "bg-[#f0e8ff] text-[#7857a8]" };
  return <article className="rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_12px_35px_rgba(46,61,52,.045)]"><div className="flex items-center justify-between"><p className="text-sm text-[#7c8981]">{label}</p><span className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`}>{icon}</span></div><p className="mt-5 truncate text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-[#99a19c]">{detail}</p></article>;
}

function EmptyTransactions() {
  return <div className="grid min-h-56 place-items-center text-center"><div><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e8f1eb] text-[#47735c]"><ReceiptText size={21} /></div><p className="mt-3 text-sm font-medium">No transactions yet</p><p className="mt-1 text-xs text-[#929b95]">Add your first transaction below.</p></div></div>;
}
