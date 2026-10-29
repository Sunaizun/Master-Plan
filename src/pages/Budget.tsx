import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStore, type FieldErrors } from "../lib/store";
import { addDays, convert, fmtDate, fmtMoney, sumIn, todayISO } from "../lib/calc";
import { CURRENCIES, EXPENSE_CATEGORY, EXPENSE_CATEGORY_LABEL, STUDY_COST_CATEGORIES, newId, type Currency, type Expense } from "../lib/types";
import { CheckField, ConfirmButton, DateCell, Empty, ExtLink, FormErrors, Modal, PageHeader, Panel, Pill, SelectField, Tabs, TextArea, TextField } from "../components/ui";
import { programOptions, shortUni, useDraft } from "../components/forms";

type View = "application" | "study" | "all";
const PAY_LABEL = { planned: "Planned", due: "Due", paid: "Paid", refunded: "Refunded", cancelled: "Cancelled" } as const;

export default function Budget() {
  const { state, patch, setSingleton } = useStore();
  const s = state.settings;
  const cur = s.displayCurrency;
  const [view, setView] = useState<View>("application");
  const [edit, setEdit] = useState<Expense | "new" | null>(null);
  const [rateErr, setRateErr] = useState<FieldErrors>({});

  const appItems = state.expenses.filter((e) => !STUDY_COST_CATEGORIES.has(e.category) && e.paymentStatus !== "cancelled");
  const est = sumIn(appItems.map((e) => ({ amount: e.estimated ?? e.actual ?? 0, currency: e.currency })), cur, s);
  const spent = sumIn(state.expenses.filter((e) => e.actual !== null && e.paymentStatus !== "refunded").map((e) => ({ amount: e.actual as number, currency: e.currency })), cur, s);
  const unpaidApp = sumIn(appItems.filter((e) => e.paymentStatus !== "paid" && e.paymentStatus !== "refunded").map((e) => ({ amount: e.estimated ?? 0, currency: e.currency })), cur, s);
  const horizon = addDays(todayISO(), 60);
  const upcoming = state.expenses
    .filter((e) => e.dueDate && e.dueDate >= todayISO() && e.dueDate <= horizon && e.paymentStatus !== "paid" && e.paymentStatus !== "cancelled")
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  const budgetInCur = s.applicationBudgetKzt === null ? null : convert(s.applicationBudgetKzt, "KZT", cur, s);
  const remaining = budgetInCur === null ? null : budgetInCur - spent.total - unpaidApp.total;
  const missingRate = (!s.kztPerUsd && state.expenses.some((e) => e.currency === "USD")) || (!s.kztPerGbp && state.expenses.some((e) => e.currency === "GBP"));

  const list = state.expenses.filter((e) => (view === "all" ? true : view === "study" ? STUDY_COST_CATEGORIES.has(e.category) : !STUDY_COST_CATEGORIES.has(e.category)));

  const byCat = useMemo(() => {
    const out: { cat: string; amount: number }[] = [];
    for (const c of EXPENSE_CATEGORY) {
      if (STUDY_COST_CATEGORIES.has(c)) continue;
      const items = state.expenses.filter((e) => e.category === c && e.paymentStatus !== "cancelled");
      const { total } = sumIn(items.map((e) => ({ amount: e.actual ?? e.estimated ?? 0, currency: e.currency })), cur, s);
      if (total > 0) out.push({ cat: EXPENSE_CATEGORY_LABEL[c].split(" ")[0], amount: Math.round(total) });
    }
    return out;
  }, [state.expenses, cur, s]);

  const Unconv = ({ u }: { u: Partial<Record<Currency, number>> }) =>
    Object.keys(u).length ? (
      <div className="small">
        {Object.entries(u).map(([c, a]) => (
          <div key={c}>+ {fmtMoney(a as number, c as Currency)} not converted</div>
        ))}
      </div>
    ) : null;

  return (
    <div className="page">
      <PageHeader title="Budget" sub="Application costs first; tuition and living costs are tracked separately as estimates.">
        <button type="button" className="btn btn-primary" onClick={() => setEdit("new")}>
          Add cost
        </button>
      </PageHeader>

      {missingRate && (
        <div className="banner banner-info">
          Some costs are in USD or GBP. Enter today's exchange rates below to combine totals; rates are never filled in automatically.
        </div>
      )}

      <div className="hero-grid">
        <div className="stat">
          <span className="stat-label">Estimated application costs</span>
          <span className="stat-big">{fmtMoney(est.total, cur)}</span>
          <Unconv u={est.unconverted} />
          <span className="stat-sub">{appItems.filter((e) => e.estimated === null && e.actual === null).length} items have no amount yet</span>
        </div>
        <div className="stat">
          <span className="stat-label">Actually spent</span>
          <span className="stat-big">{fmtMoney(spent.total, cur)}</span>
          <Unconv u={spent.unconverted} />
        </div>
        <div className="stat">
          <span className="stat-label">Due in the next 60 days</span>
          <span className="stat-big">{upcoming.length}</span>
          <span className="stat-sub">{upcoming.slice(0, 2).map((e) => `${e.title} (${fmtDate(e.dueDate, false)})`).join(", ") || "Nothing scheduled"}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Estimated remaining budget</span>
          <span className={`stat-big${remaining !== null && remaining < 0 ? " bad-text" : ""}`}>{remaining === null ? "—" : fmtMoney(remaining, cur)}</span>
          <span className="stat-sub">{s.applicationBudgetKzt === null ? "Set your application budget below." : "Budget − spent − unpaid application costs"}</span>
        </div>
      </div>

      <div className="grid-2">
        <Panel title="Exchange rates & budget">
          <form
            className="form-grid"
            onSubmit={(e) => e.preventDefault()}
          >
            <SelectField id="bg-cur" label="Show totals in" value={cur} onChange={(v) => setSingleton("settings", { displayCurrency: v })} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
            <CommitNumber id="bg-budget" label="Application budget (KZT)" value={s.applicationBudgetKzt} error={rateErr.applicationBudgetKzt} onCommit={(v) => { const r = setSingleton("settings", { applicationBudgetKzt: v }); setRateErr(r.ok ? {} : r.errors); }} />
            <CommitNumber id="bg-usd" label="KZT per 1 USD" value={s.kztPerUsd} error={rateErr.kztPerUsd} onCommit={(v) => { const r = setSingleton("settings", { kztPerUsd: v, ratesUpdatedOn: todayISO() }); setRateErr(r.ok ? {} : r.errors); }} />
            <CommitNumber id="bg-gbp" label="KZT per 1 GBP" value={s.kztPerGbp} error={rateErr.kztPerGbp} onCommit={(v) => { const r = setSingleton("settings", { kztPerGbp: v, ratesUpdatedOn: todayISO() }); setRateErr(r.ok ? {} : r.errors); }} />
            <TextField id="bg-src" label="Rate source" value={s.ratesSource} onChange={(v) => setSingleton("settings", { ratesSource: v })} placeholder="e.g. National Bank of Kazakhstan" className="span-2" />
          </form>
          <p className="small muted">
            Rates last updated {s.ratesUpdatedOn ? fmtDate(s.ratesUpdatedOn) : "never"}. Official KZT rates: <ExtLink href="https://nationalbank.kz/en/exchangerates/ezhednevnye-oficialnye-rynochnye-kursy-valyut">National Bank of Kazakhstan</ExtLink>
          </p>
        </Panel>
        <Panel title={`Application costs by category (${cur})`}>
          {byCat.length ? (
            <div className="chart" role="img" aria-label="Bar chart of application costs by category">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byCat} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="var(--grid)" vertical={false} />
                  <XAxis dataKey="cat" tick={{ fill: "var(--muted)", fontSize: 11 }} stroke="var(--line)" />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} stroke="var(--line)" width={70} tickFormatter={(v: number) => v.toLocaleString("en-US")} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--fg)", borderRadius: 8 }} formatter={(v: number) => [fmtMoney(v, cur), "Amount"]} />
                  <Bar dataKey="amount" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty title="No convertible amounts yet">Add amounts, and exchange rates for foreign currencies.</Empty>
          )}
        </Panel>
      </div>

      <Panel
        title="Costs"
        action={
          <Tabs<View>
            label="Cost type"
            value={view}
            onChange={setView}
            items={[
              { value: "application", label: "Application" },
              { value: "study", label: "Tuition & living" },
              { value: "all", label: "All" },
            ]}
          />
        }
      >
        {list.length === 0 ? (
          <Empty title="No costs here yet" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Cost</th>
                  <th>University</th>
                  <th className="num">Estimated</th>
                  <th className="num">Actual</th>
                  <th className="num">≈ {cur}</th>
                  <th>Due</th>
                  <th>Payment</th>
                  <th>Refundable</th>
                  <th>
                    <span className="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => {
                  const base = e.actual ?? e.estimated;
                  const conv = base === null ? null : convert(base, e.currency, cur, s);
                  return (
                    <tr key={e.id}>
                      <td>
                        <strong>{e.title}</strong>
                        <div className="small muted">
                          {EXPENSE_CATEGORY_LABEL[e.category]} {e.verified ? <Pill tone="good">Verified</Pill> : <Pill tone="warn">Unverified</Pill>}
                        </div>
                      </td>
                      <td className="small">{e.programId ? shortUni(state, e.programId) : "—"}</td>
                      <td className="num">{e.estimated === null ? <span className="muted">?</span> : fmtMoney(e.estimated, e.currency)}</td>
                      <td className="num">{e.actual === null ? <span className="muted">—</span> : fmtMoney(e.actual, e.currency)}</td>
                      <td className="num small">{conv === null ? <span className="muted">{base === null ? "—" : "no rate"}</span> : fmtMoney(conv, cur)}</td>
                      <td>
                        <DateCell date={e.dueDate} done={e.paymentStatus === "paid"} />
                      </td>
                      <td>
                        <label className="sr-only" htmlFor={`pay-${e.id}`}>
                          Payment status
                        </label>
                        <select id={`pay-${e.id}`} value={e.paymentStatus} onChange={(ev) => patch("expenses", e.id, { paymentStatus: ev.target.value as Expense["paymentStatus"] })}>
                          {Object.entries(PAY_LABEL).map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="small">{e.refundable === "unknown" ? <span className="muted">Unknown</span> : e.refundable}</td>
                      <td>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit(e)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {edit && <ExpenseForm expense={edit === "new" ? undefined : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function ExpenseForm({ expense, onClose }: { expense?: Expense; onClose: () => void }) {
  const { state, upsert, remove } = useStore();
  const blank: Expense = { id: newId("e"), title: "", category: "application_fee", programId: null, currency: "KZT", estimated: null, actual: null, dueDate: null, paymentStatus: "planned", refundable: "unknown", verified: false, sourceUrl: "", notes: "" };
  const { draft, set } = useDraft<Expense>(expense ?? blank);
  const [errors, setErrors] = useState<FieldErrors>({});
  return (
    <Modal title={expense ? "Edit cost" : "Add cost"} onClose={onClose} wide>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          const r = upsert("expenses", draft);
          if (!r.ok) return setErrors(r.errors);
          onClose();
        }}
      >
        <FormErrors errors={errors} />
        <TextField id="ex-title" label="What is it?" value={draft.title} onChange={set("title")} error={errors.title} className="span-2" />
        <SelectField id="ex-cat" label="Category" value={draft.category} onChange={set("category")} options={EXPENSE_CATEGORY.map((c) => ({ value: c, label: EXPENSE_CATEGORY_LABEL[c] }))} />
        <SelectField id="ex-prog" label="University (optional)" value={draft.programId ?? ""} onChange={(v) => set("programId")(v || null)} options={[{ value: "", label: "None" }, ...programOptions(state)]} />
        <SelectField id="ex-cur" label="Currency" value={draft.currency} onChange={set("currency")} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
        <TextField id="ex-due" label="Due date" type="date" value={draft.dueDate ?? ""} onChange={(v) => set("dueDate")(v || null)} error={errors.dueDate} />
        <TextField id="ex-est" label="Estimated amount" type="number" inputMode="decimal" value={draft.estimated ?? ""} onChange={(v) => set("estimated")(v === "" ? null : (v as unknown as number))} error={errors.estimated} />
        <TextField id="ex-act" label="Actual amount paid" type="number" inputMode="decimal" value={draft.actual ?? ""} onChange={(v) => set("actual")(v === "" ? null : (v as unknown as number))} error={errors.actual} />
        <SelectField id="ex-pay" label="Payment status" value={draft.paymentStatus} onChange={set("paymentStatus")} options={Object.entries(PAY_LABEL).map(([value, label]) => ({ value: value as Expense["paymentStatus"], label }))} />
        <SelectField
          id="ex-ref"
          label="Refundable?"
          value={draft.refundable}
          onChange={set("refundable")}
          options={[
            { value: "unknown", label: "Unknown" },
            { value: "yes", label: "Yes" },
            { value: "partial", label: "Partly" },
            { value: "no", label: "No" },
          ]}
        />
        <TextField id="ex-src" label="Source URL" value={draft.sourceUrl} onChange={set("sourceUrl")} error={errors.sourceUrl} />
        <CheckField id="ex-ver" label="Amount verified on an official source" checked={draft.verified} onChange={set("verified")} />
        <TextArea id="ex-notes" label="Notes" value={draft.notes} onChange={set("notes")} className="span-2" />
        <div className="form-actions span-2">
          {expense && (
            <ConfirmButton
              onConfirm={() => {
                remove("expenses", expense.id);
                onClose();
              }}
            />
          )}
          <span className="spacer" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Number input that keeps what you type and saves on blur / Enter. */
function CommitNumber({ id, label, value, onCommit, error }: { id: string; label: string; value: number | null; onCommit: (v: number | null) => void; error?: string }) {
  const [text, setText] = useState(value === null ? "" : String(value));
  const commit = () => {
    const t = text.trim().replace(/[ ,]/g, "");
    if (t === "") return onCommit(null);
    const n = Number(t);
    if (Number.isFinite(n) && n >= 0) onCommit(n);
    else onCommit(NaN);
  };
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input id={id} type="text" inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()} />
      {error ? <div className="field-error">{error}</div> : <div className="field-hint">Saved when you leave the field.</div>}
    </div>
  );
}
