import { useState } from "react";
import { useStore } from "../lib/store";
import { addDays, allEvents, docStats, fmtDate, ieltsProgress, overdueTasks, programsRequiringDoc, startOfWeek, todayISO, topTasksNextDays } from "../lib/calc";
import type { Task, WeeklyReview } from "../lib/types";
import { Empty, PageHeader, Panel, StatusBadge, TextArea } from "../components/ui";
import { TaskRow } from "../components/TaskRow";
import { TaskForm, useDraft } from "../components/forms";

export default function Review() {
  const { state, upsert } = useStore();
  const [editing, setEditing] = useState<Task | null>(null);
  const t = todayISO();
  const weekStart = startOfWeek(t, state.settings.weekStartsMonday);
  const weekEnd = addDays(weekStart, 6);
  const top = topTasksNextDays(state, 7, 3);
  const overdue = overdueTasks(state);
  const doneThisWeek = state.tasks.filter((x) => x.completedAt && x.completedAt >= addDays(t, -6));
  const nextWeekEvents = allEvents(state).filter((e) => !e.done && e.date >= t && e.date <= addDays(t, 7) && e.kind !== "task");
  const ielts = ieltsProgress(state);
  const missing = docStats(state).missing.filter((d) => programsRequiringDoc(state, d.id).length > 0);
  const existing = state.weeklyReviews.find((w) => w.id === weekStart);
  const { draft, set } = useDraft<WeeklyReview>(existing ?? { id: weekStart, wins: "", blockers: "", focus: "" });
  const [saved, setSaved] = useState(false);
  const past = [...state.weeklyReviews].filter((w) => w.id !== weekStart).sort((a, b) => b.id.localeCompare(a.id));

  return (
    <div className="page">
      <PageHeader eyebrow={`Week of ${fmtDate(weekStart)} – ${fmtDate(weekEnd)}`} title="Weekly review" sub="Fifteen minutes each week: check what moved, pick three things, note what is in the way." />

      <Panel title="Top three for the next seven days">
        {top.length ? (
          <ol className="top3">
            {top.map((task, i) => (
              <li key={task.id}>
                <span className="top3-n" aria-hidden="true">
                  {i + 1}
                </span>
                <ul className="task-list">
                  <TaskRow task={task} onEdit={setEditing} />
                </ul>
              </li>
            ))}
          </ol>
        ) : (
          <Empty title="No open tasks due in the next seven days">Good moment to plan ahead: add tasks for the next deadline.</Empty>
        )}
        <p className="small muted">Ranked by priority and how close the deadline is. Tasks still waiting on dependencies are skipped.</p>
      </Panel>

      <div className="grid-2">
        <Panel title="Coming up this week">
          {nextWeekEvents.length ? (
            <ul className="event-list">
              {nextWeekEvents.map((e) => (
                <li key={e.id}>
                  <span className="mono small">{fmtDate(e.date, false)}</span>
                  <a href={`#${e.route}`}>
                    <strong>{e.title}</strong>
                  </a>
                  {e.detail && <span className="small muted">{e.detail}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No deadlines in the next seven days" />
          )}
        </Panel>
        <Panel title="Last seven days">
          <dl className="kv">
            <dt>Tasks completed</dt>
            <dd>{doneThisWeek.length}</dd>
            <dt>IELTS practice</dt>
            <dd>{Math.round((ielts.minutesWeek / 60) * 10) / 10} h</dd>
            <dt>Overdue now</dt>
            <dd>{overdue.length}</dd>
            <dt>Required documents not ready</dt>
            <dd>{missing.length}</dd>
          </dl>
          {doneThisWeek.length > 0 && (
            <ul className="plain-list">
              {doneThisWeek.map((x) => (
                <li key={x.id}>
                  <StatusBadge status="complete" small /> {x.title}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {(overdue.length > 0 || missing.length > 0) && (
        <div className="grid-2">
          <Panel title="Overdue">
            {overdue.length ? (
              <ul className="task-list">
                {overdue.map((x) => (
                  <TaskRow key={x.id} task={x} onEdit={setEditing} compact />
                ))}
              </ul>
            ) : (
              <Empty title="Nothing overdue" />
            )}
          </Panel>
          <Panel title="Missing documents">
            <ul className="plain-list">
              {missing.map((d) => (
                <li key={d.id}>
                  <StatusBadge status={d.status} small /> <a href="#documents">{d.name}</a>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      <Panel title="Reflection">
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            const r = upsert("weeklyReviews", draft);
            if (r.ok) setSaved(true);
          }}
        >
          <TextArea id="wr-wins" label="What moved forward" value={draft.wins} onChange={(v) => { set("wins")(v); setSaved(false); }} rows={3} />
          <TextArea id="wr-block" label="What is blocking me" value={draft.blockers} onChange={(v) => { set("blockers")(v); setSaved(false); }} rows={3} />
          <TextArea id="wr-focus" label="Focus for next week (AITU, IELTS, applications)" value={draft.focus} onChange={(v) => { set("focus")(v); setSaved(false); }} rows={3} className="span-2" />
          <div className="form-actions span-2">
            {saved && <span className="muted small">Saved.</span>}
            <button type="submit" className="btn btn-primary">
              Save review
            </button>
          </div>
        </form>
      </Panel>

      {past.length > 0 && (
        <Panel title="Earlier reviews">
          <ul className="past-reviews">
            {past.map((w) => (
              <li key={w.id}>
                <strong className="mono">{fmtDate(w.id)}</strong>
                {w.wins && <p className="small">Moved: {w.wins}</p>}
                {w.blockers && <p className="small">Blocked: {w.blockers}</p>}
                {w.focus && <p className="small">Focus: {w.focus}</p>}
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {editing && <TaskForm task={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
