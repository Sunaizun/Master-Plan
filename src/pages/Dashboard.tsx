import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import {
  activePrograms,
  addDays,
  allEvents,
  alerts,
  daysUntil,
  docStats,
  fmtDate,
  fmtMoney,
  ieltsProgress,
  nextImportantDeadline,
  overallReadiness,
  overdueTasks,
  programReadiness,
  programsRequiringDoc,
  scholarshipProgress,
  sumIn,
  todayISO,
  upcomingTasks,
} from "../lib/calc";
import { STATUS_LABEL, STUDY_COST_CATEGORIES as STUDY_CATS, type Task } from "../lib/types";
import { DateCell, Empty, PageHeader, Panel, Pill, Progress, Ring, StatusBadge } from "../components/ui";
import { TaskRow } from "../components/TaskRow";
import { TaskForm } from "../components/forms";

const FIT_LABEL = { stronger: "Stronger fit", ambitious: "Competitive / ambitious", unclear: "Unclear pending verification" } as const;

export default function Dashboard() {
  const { state } = useStore();
  const [editing, setEditing] = useState<Task | null>(null);
  const next = nextImportantDeadline(state);
  const nextDays = next ? daysUntil(next.date) : null;
  const overall = overallReadiness(state);
  const ielts = ieltsProgress(state);
  const sch = scholarshipProgress(state);
  const docs = docStats(state);
  const overdue = overdueTasks(state);
  const upcoming = upcomingTasks(state, 5);
  const progs = activePrograms(state);
  const alertList = alerts(state);
  const ieltsDays = daysUntil(state.ieltsSettings.plannedDate);

  const outstandingLetters = state.recRequests.filter((r) => !["submitted", "confirmed", "declined"].includes(r.status));
  const unverifiedProgs = progs
    .map((p) => ({ p, r: programReadiness(state, p.id) }))
    .filter((x) => x.r.unverified > 0)
    .sort((a, b) => b.r.unverified - a.r.unverified);

  const appCosts = useMemo(() => {
    const items = state.expenses
      .filter((e) => !STUDY_CATS.has(e.category) && e.paymentStatus !== "cancelled")
      .map((e) => ({ amount: e.estimated ?? e.actual ?? 0, currency: e.currency }));
    const unknown = state.expenses.filter((e) => !STUDY_CATS.has(e.category) && e.estimated === null && e.actual === null).length;
    return { ...sumIn(items, state.settings.displayCurrency, state.settings), unknown };
  }, [state.expenses, state.settings]);

  const milestones = useMemo(() => {
    const t = todayISO();
    const end = addDays(t, 75);
    return allEvents(state).filter((e) => !e.done && e.date >= t && e.date <= end && e.kind !== "requirement");
  }, [state]);

  return (
    <div className="page">
      <PageHeader eyebrow={fmtDate(todayISO())} title="Dashboard" sub={`${progs.length} active programmes · ${alertList.filter((a) => a.level !== "info").length} alerts need attention`} />

      <div className="hero-grid">
        <a className="stat stat-countdown" href={next ? `#${next.route}` : "#tasks"}>
          <span className="stat-label">Next important deadline</span>
          {next ? (
            <>
              <span className="countdown">
                <strong>{nextDays}</strong>
                <span>{nextDays === 1 ? "day" : "days"}</span>
              </span>
              <span className="stat-title">{next.title}</span>
              <span className="stat-sub mono">{fmtDate(next.date)}</span>
            </>
          ) : (
            <span className="stat-title">No upcoming deadlines</span>
          )}
        </a>
        <a className="stat stat-ring" href="#applications">
          <Ring pct={overall} label="Overall application readiness" />
          <span className="stat-col">
            <span className="stat-label">Application readiness</span>
            <span className="stat-sub">Average of verified, completed requirements across active programmes.</span>
          </span>
        </a>
        <a className="stat" href="#ielts">
          <span className="stat-label">IELTS</span>
          <span className="stat-big">
            {ielts.latest ?? "—"}
            <span className="stat-of"> → {ielts.target}</span>
          </span>
          <Progress pct={ielts.pct} label="IELTS progress toward target" size="sm" />
          <span className="stat-sub">
            {state.ieltsSettings.plannedDate ? `Test ${fmtDate(state.ieltsSettings.plannedDate)} · ${ieltsDays !== null && ieltsDays >= 0 ? `${ieltsDays} days` : "date passed"}` : "Test date not set"} · {Math.round(ielts.minutesWeek / 60 * 10) / 10} h practice this week
          </span>
        </a>
        <a className="stat" href="#bolashak">
          <span className="stat-label">Bolashak preparation</span>
          <span className="stat-big">
            {sch.done}
            <span className="stat-of"> / {sch.total}</span>
          </span>
          <Progress pct={sch.pct} label="Bolashak preparation" size="sm" />
          <span className="stat-sub">{sch.unverified} rules still need verification</span>
        </a>
      </div>

      {overdue.length > 0 && (
        <div className="banner banner-bad">
          <strong>
            <span aria-hidden="true">! </span>
            {overdue.length} overdue task{overdue.length > 1 ? "s" : ""}.
          </strong>{" "}
          {overdue
            .slice(0, 3)
            .map((t) => t.title)
            .join(" · ")}{" "}
          <a href="#tasks">Open tasks</a>
        </div>
      )}

      <div className="grid-2">
        <Panel title="Next five tasks" action={<a href="#tasks">All tasks</a>}>
          {upcoming.length ? (
            <ul className="task-list">
              {upcoming.map((t) => (
                <TaskRow key={t.id} task={t} onEdit={setEditing} />
              ))}
            </ul>
          ) : (
            <Empty title="No upcoming tasks">Add a task with the + Task button.</Empty>
          )}
        </Panel>

        <Panel title="Upcoming milestones" action={<a href="#tasks">Calendar</a>}>
          {milestones.length ? (
            <ol className="mini-timeline">
              {milestones.slice(0, 9).map((e) => (
                <li key={e.id} className={e.important ? "is-key" : ""}>
                  <span className="mt-date mono">{fmtDate(e.date, false)}</span>
                  <span className={`mt-kind kind-${e.kind}`}>{e.kind}</span>
                  <a href={`#${e.route}`} className="mt-title">
                    {e.title}
                  </a>
                </li>
              ))}
            </ol>
          ) : (
            <Empty title="Nothing in the next 75 days" />
          )}
        </Panel>
      </div>

      <Panel title="Progress by programme" action={<a href="#applications">Compare</a>}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>University</th>
                <th>Readiness</th>
                <th>Unverified</th>
                <th>Official deadline</th>
                <th>My target</th>
                <th>Classification</th>
              </tr>
            </thead>
            <tbody>
              {progs.map((p) => {
                const r = programReadiness(state, p.id);
                const u = state.universities.find((x) => x.id === p.universityId);
                return (
                  <tr key={p.id}>
                    <td>
                      <a href={`#program-${p.id}`}>
                        <strong>{u?.name}</strong>
                      </a>
                      <div className="small muted">{p.name}</div>
                    </td>
                    <td style={{ minWidth: 140 }}>
                      <Progress pct={r.pct} size="sm" label={`${u?.name} readiness`} />
                      <div className="small muted">
                        {r.done}/{r.total} done
                      </div>
                    </td>
                    <td>{r.unverified ? <Pill tone="warn">{r.unverified} to verify</Pill> : <Pill tone="good">All verified</Pill>}</td>
                    <td>
                      {p.deadline ? <DateCell date={p.deadline} done={p.submission === "submitted"} /> : <StatusBadge status="needs_verification" small />}
                      <div className="small muted">{p.deadlineType !== "unknown" ? p.deadlineType : ""}</div>
                    </td>
                    <td>
                      <DateCell date={p.targetDate} done={p.submission === "submitted"} />
                    </td>
                    <td>
                      <Pill tone={p.fit === "stronger" ? "good" : p.fit === "ambitious" ? "warn" : "neutral"}>{FIT_LABEL[p.fit]}</Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid-3">
        <Panel title="Documents" action={<a href="#documents">Vault</a>}>
          <div className="split-stat">
            <div>
              <strong className="num">{docs.complete}</strong>
              <span>complete</span>
            </div>
            <div>
              <strong className="num">{docs.missing.length}</strong>
              <span>still needed</span>
            </div>
          </div>
          <ul className="plain-list">
            {docs.missing.slice(0, 6).map((d) => (
              <li key={d.id}>
                <StatusBadge status={d.status} small /> {d.name}
                {programsRequiringDoc(state, d.id).length > 0 && <span className="small muted"> · {programsRequiringDoc(state, d.id).length} programmes</span>}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Recommendation letters" action={<a href="#recommendations">Manage</a>}>
          {outstandingLetters.length ? (
            <ul className="plain-list">
              {outstandingLetters.slice(0, 6).map((r) => {
                const rec = state.recommenders.find((x) => x.id === r.recommenderId);
                const p = state.programs.find((x) => x.id === r.programId);
                const u = p && state.universities.find((x) => x.id === p.universityId);
                return (
                  <li key={r.id}>
                    <strong>{rec?.name}</strong>
                    <span className="small muted">
                      {" "}
                      · {u?.name} · {r.status.replace("_", " ")}
                      {r.deadline ? ` · due ${fmtDate(r.deadline, false)}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty title="No outstanding letters" />
          )}
        </Panel>

        <Panel title="Estimated application costs" action={<a href="#budget">Budget</a>}>
          <div className="stat-big">{fmtMoney(appCosts.total, state.settings.displayCurrency)}</div>
          {Object.entries(appCosts.unconverted).map(([cur, amt]) => (
            <div key={cur} className="small">
              + {fmtMoney(amt as number, cur as never)} <span className="muted">(add an exchange rate in Settings to combine)</span>
            </div>
          ))}
          <p className="small muted">Excludes tuition and living costs. {appCosts.unknown > 0 && `${appCosts.unknown} costs still have no amount.`}</p>
        </Panel>
      </div>

      <div className="grid-2">
        <Panel title="Requirements still unverified" action={<a href="#requirements">Review</a>}>
          {unverifiedProgs.length ? (
            <ul className="plain-list">
              {unverifiedProgs.map(({ p, r }) => (
                <li key={p.id}>
                  <a href={`#program-${p.id}`}>{state.universities.find((u) => u.id === p.universityId)?.name}</a>
                  <span className="small muted">
                    {" "}
                    · {r.unverified} of {r.total} rows need an official source
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Everything is verified" />
          )}
        </Panel>
        <Panel title="Overdue" action={<a href="#tasks">Tasks</a>}>
          {overdue.length ? (
            <ul className="task-list">
              {overdue.map((t) => (
                <TaskRow key={t.id} task={t} onEdit={setEditing} compact />
              ))}
            </ul>
          ) : (
            <Empty title="Nothing overdue">{STATUS_LABEL.complete} or on schedule.</Empty>
          )}
        </Panel>
      </div>

      {editing && <TaskForm task={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
