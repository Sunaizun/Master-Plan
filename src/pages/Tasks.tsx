import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { addDays, allEvents, fmtDate, fmtMonth, parseISO, taskDisplayStatus, taskScore, toICS, toISO, todayISO, type CalEvent, type EventKind } from "../lib/calc";
import { PRIORITY, STATUS, STATUS_LABEL, TASK_CATEGORY, TASK_CATEGORY_LABEL, type Task } from "../lib/types";
import { CopyBox, Empty, Modal, PageHeader, Panel, SearchBox, Tabs } from "../components/ui";
import { TaskRow } from "../components/TaskRow";
import { TaskForm, programOptions } from "../components/forms";

type View = "list" | "calendar" | "timeline";

const KIND_LABEL: Record<EventKind, string> = {
  program: "Official deadline",
  target: "My target",
  task: "Task",
  ielts: "IELTS",
  recommendation: "Recommendation",
  payment: "Payment",
  scholarship: "Bolashak",
  requirement: "Requirement",
  opening: "Applications open",
};

export default function Tasks() {
  const { state, backend } = useStore();
  const [view, setView] = useState<View>("list");
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const [icsText, setIcsText] = useState<string | null>(null);
  const [icsMsg, setIcsMsg] = useState("");

  const exportIcs = async () => {
    const ics = toICS(allEvents(state).filter((e) => !e.done && e.date >= todayISO()));
    const ok = backend ? await backend.download("masters-deadlines.ics", ics) : false;
    if (ok) setIcsMsg("Calendar file saved. Import it into Google Calendar, Outlook or Apple Calendar to get reminders.");
    else setIcsText(ics);
  };

  return (
    <div className="page">
      <PageHeader title="Tasks & Calendar" sub="Central task manager plus every deadline from universities, IELTS, letters, payments and Bolashak.">
        <Tabs<View>
          label="View"
          value={view}
          onChange={setView}
          items={[
            { value: "list", label: "Tasks", count: state.tasks.filter((t) => t.status !== "complete" && t.status !== "not_applicable").length },
            { value: "calendar", label: "Calendar" },
            { value: "timeline", label: "Timeline" },
          ]}
        />
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
          New task
        </button>
        <button type="button" className="btn" onClick={exportIcs}>
          Export to calendar (.ics)
        </button>
      </PageHeader>
      {icsMsg && <div className="banner banner-good">{icsMsg}</div>}
      {view === "list" && <TaskList onEdit={setEditing} />}
      {view === "calendar" && <CalendarView />}
      {view === "timeline" && <TimelineView />}
      {editing && <TaskForm task={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      {icsText !== null && (
        <Modal title="Calendar export" onClose={() => setIcsText(null)}>
          <p className="small">This view cannot save files directly. Copy the text below into a new file named <code>deadlines.ics</code>, then import it into your calendar app.</p>
          <CopyBox id="ics-copy" text={icsText} label="iCalendar data" />
        </Modal>
      )}
    </div>
  );
}

function TaskList({ onEdit }: { onEdit: (t: Task) => void }) {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [program, setProgram] = useState("");
  const [sort, setSort] = useState<"deadline" | "priority" | "smart">("deadline");

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    let ts = state.tasks.filter((t) => {
      const ds = taskDisplayStatus(t, state.tasks);
      if (status === "open" && (t.status === "complete" || t.status === "not_applicable")) return false;
      if (status && status !== "open" && ds !== status && t.status !== status) return false;
      if (priority && t.priority !== priority) return false;
      if (category && t.category !== category) return false;
      if (program && !t.programIds.includes(program)) return false;
      if (query && !`${t.title} ${t.description} ${t.notes}`.toLowerCase().includes(query)) return false;
      return true;
    });
    const pw = { high: 0, medium: 1, low: 2 };
    ts = ts.slice().sort((a, b) =>
      sort === "priority"
        ? pw[a.priority] - pw[b.priority] || (a.deadline ?? "9").localeCompare(b.deadline ?? "9")
        : sort === "smart"
          ? taskScore(b) - taskScore(a)
          : (a.deadline ?? "9").localeCompare(b.deadline ?? "9") || pw[a.priority] - pw[b.priority],
    );
    return ts;
  }, [state.tasks, q, status, priority, category, program, sort]);

  return (
    <Panel>
      <div className="toolbar">
        <SearchBox id="task-q" value={q} onChange={setQ} placeholder="Search tasks" />
        <FilterSelect id="f-status" label="Status" value={status} onChange={setStatus} options={[{ value: "open", label: "Open" }, { value: "", label: "All" }, { value: "overdue", label: "Overdue" }, ...STATUS.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]} />
        <FilterSelect id="f-pri" label="Priority" value={priority} onChange={setPriority} options={[{ value: "", label: "Any priority" }, ...PRIORITY.map((p) => ({ value: p, label: p }))]} />
        <FilterSelect id="f-cat" label="Category" value={category} onChange={setCategory} options={[{ value: "", label: "Any category" }, ...TASK_CATEGORY.map((c) => ({ value: c, label: TASK_CATEGORY_LABEL[c] }))]} />
        <FilterSelect id="f-prog" label="University" value={program} onChange={setProgram} options={[{ value: "", label: "Any university" }, ...programOptions(state)]} />
        <FilterSelect
          id="f-sort"
          label="Sort"
          value={sort}
          onChange={(v) => setSort(v as typeof sort)}
          options={[
            { value: "deadline", label: "Sort: deadline" },
            { value: "priority", label: "Sort: priority" },
            { value: "smart", label: "Sort: do next" },
          ]}
        />
      </div>
      {list.length ? (
        <ul className="task-list">
          {list.map((t) => (
            <TaskRow key={t.id} task={t} onEdit={onEdit} />
          ))}
        </ul>
      ) : (
        <Empty title="No tasks match these filters" />
      )}
    </Panel>
  );
}

export function FilterSelect({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="filter" htmlFor={id}>
      <span className="sr-only">{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CalendarView() {
  const { state } = useStore();
  const [month, setMonth] = useState(() => todayISO().slice(0, 7) + "-01");
  const [selected, setSelected] = useState<string | null>(todayISO());
  const events = useMemo(() => allEvents(state), [state]);
  const byDate = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of events) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  }, [events]);

  const first = parseISO(month);
  const offset = (first.getDay() + 6) % 7; // Monday first
  const gridStart = addDays(month, -offset);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const shift = (n: number) => {
    const d = parseISO(month);
    d.setMonth(d.getMonth() + n);
    setMonth(toISO(d).slice(0, 7) + "-01");
  };
  const t = todayISO();
  const sel = selected ? byDate.get(selected) ?? [] : [];

  return (
    <div className="cal-layout">
      <Panel
        title={fmtMonth(month)}
        action={
          <div className="row">
            <button type="button" className="btn btn-sm" onClick={() => shift(-1)} aria-label="Previous month">
              ←
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setMonth(t.slice(0, 7) + "-01")}>
              Today
            </button>
            <button type="button" className="btn btn-sm" onClick={() => shift(1)} aria-label="Next month">
              →
            </button>
          </div>
        }
      >
        <div className="cal-grid" role="grid" aria-label={`Calendar for ${fmtMonth(month)}`}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="cal-dow" role="columnheader">
              {d}
            </div>
          ))}
          {days.map((d) => {
            const evs = byDate.get(d) ?? [];
            const inMonth = d.slice(0, 7) === month.slice(0, 7);
            return (
              <button
                key={d}
                type="button"
                role="gridcell"
                className={`cal-day${inMonth ? "" : " is-out"}${d === t ? " is-today" : ""}${d === selected ? " is-sel" : ""}`}
                onClick={() => setSelected(d)}
                aria-label={`${fmtDate(d)}: ${evs.length} item${evs.length === 1 ? "" : "s"}`}
              >
                <span className="cal-num">{parseISO(d).getDate()}</span>
                <span className="cal-evs">
                  {evs.slice(0, 3).map((e) => (
                    <span key={e.id} className={`cal-ev kind-${e.kind}${e.done ? " is-done" : ""}${e.important ? " is-key" : ""}`}>
                      {e.title}
                    </span>
                  ))}
                  {evs.length > 3 && <span className="cal-more">+{evs.length - 3} more</span>}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>
      <Panel title={selected ? fmtDate(selected) : "Pick a day"}>
        {sel.length ? <EventList events={sel} /> : <Empty title="Nothing on this day" />}
      </Panel>
    </div>
  );
}

function EventList({ events }: { events: CalEvent[] }) {
  return (
    <ul className="event-list">
      {events.map((e) => (
        <li key={e.id} className={e.done ? "is-done" : ""}>
          <span className={`mt-kind kind-${e.kind}`}>{KIND_LABEL[e.kind]}</span>
          <a href={`#${e.route}`}>
            <strong>{e.title}</strong>
          </a>
          {e.detail && <span className="small muted">{e.detail}</span>}
          {e.done && <span className="small muted">Done</span>}
        </li>
      ))}
    </ul>
  );
}

function TimelineView() {
  const { state } = useStore();
  const [showPast, setShowPast] = useState(false);
  const [kinds, setKinds] = useState<Set<EventKind>>(new Set(Object.keys(KIND_LABEL) as EventKind[]));
  const t = todayISO();
  const events = allEvents(state).filter((e) => kinds.has(e.kind) && (showPast || e.date >= t));
  const groups = new Map<string, CalEvent[]>();
  for (const e of events) groups.set(e.date.slice(0, 7), [...(groups.get(e.date.slice(0, 7)) ?? []), e]);

  return (
    <Panel>
      <div className="toolbar wrap">
        {(Object.keys(KIND_LABEL) as EventKind[]).map((k) => (
          <label key={k} className={`chip-check${kinds.has(k) ? " is-on" : ""}`} htmlFor={`tk-${k}`}>
            <input
              id={`tk-${k}`}
              type="checkbox"
              checked={kinds.has(k)}
              onChange={(e) => {
                const n = new Set(kinds);
                if (e.target.checked) n.add(k);
                else n.delete(k);
                setKinds(n);
              }}
            />
            {KIND_LABEL[k]}
          </label>
        ))}
        <label className="check-inline" htmlFor="tl-past">
          <input id="tl-past" type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> Include past
        </label>
      </div>
      {groups.size === 0 && <Empty title="No milestones for these filters" />}
      <div className="timeline">
        {[...groups.entries()].map(([m, evs]) => (
          <section key={m} className="tl-month">
            <h3>{fmtMonth(m + "-01")}</h3>
            <ol>
              {evs.map((e) => (
                <li key={e.id} className={`tl-item${e.done ? " is-done" : ""}${e.important ? " is-key" : ""}${e.date < t && !e.done ? " is-late" : ""}`}>
                  <span className="tl-date mono">{fmtDate(e.date, false)}</span>
                  <span className={`mt-kind kind-${e.kind}`}>{KIND_LABEL[e.kind]}</span>
                  <a href={`#${e.route}`} className="tl-title">
                    {e.title}
                  </a>
                  {e.detail && <span className="small muted tl-detail">{e.detail}</span>}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </Panel>
  );
}
