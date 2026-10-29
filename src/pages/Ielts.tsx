import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from "recharts";
import { useStore, type FieldErrors } from "../lib/store";
import { addDays, attemptOverall, daysUntil, fmtDate, highestIeltsMinimum, ieltsOverall, ieltsProgress, startOfWeek, todayISO } from "../lib/calc";
import { IELTS_SECTION, newId, type IeltsAttempt, type IeltsSettings, type PracticeLog } from "../lib/types";
import { ConfirmButton, Empty, FormErrors, Modal, PageHeader, Panel, Pill, Progress, SelectField, TextArea, TextField } from "../components/ui";
import { useDraft } from "../components/forms";
import { FilterSelect } from "./Tasks";

const REG_LABEL = { not_booked: "Not booked", booked: "Booked", taken: "Test taken", result_received: "Result received" } as const;
const SECTION_LABEL: Record<(typeof IELTS_SECTION)[number], string> = { listening: "Listening", reading: "Reading", writing: "Writing", speaking: "Speaking", vocabulary: "Vocabulary", grammar: "Grammar", full: "Full test" };

export default function Ielts() {
  const { state } = useStore();
  const s = state.ieltsSettings;
  const prog = ieltsProgress(state);
  const minNeeded = highestIeltsMinimum(state);
  const days = daysUntil(s.plannedDate);
  const [editSettings, setEditSettings] = useState(false);
  const [attempt, setAttempt] = useState<IeltsAttempt | "new" | null>(null);
  const [log, setLog] = useState<PracticeLog | "new" | null>(null);
  const [section, setSection] = useState("");

  const attempts = useMemo(() => [...state.ieltsAttempts].sort((a, b) => a.date.localeCompare(b.date)), [state.ieltsAttempts]);
  const chartData = attempts.map((a) => ({ date: fmtDate(a.date, true), Overall: attemptOverall(a), Listening: a.L, Reading: a.R, Writing: a.W, Speaking: a.S, kind: a.kind }));

  const weekly = useMemo(() => {
    const weeks: { week: string; hours: number }[] = [];
    const start = startOfWeek(addDays(todayISO(), -7 * 7));
    for (let i = 0; i < 8; i++) {
      const ws = addDays(start, i * 7);
      const we = addDays(ws, 6);
      const mins = state.practiceLogs.filter((l) => l.date >= ws && l.date <= we).reduce((a, l) => a + l.minutes, 0);
      weeks.push({ week: fmtDate(ws, false), hours: Math.round((mins / 60) * 10) / 10 });
    }
    return weeks;
  }, [state.practiceLogs]);

  const logs = [...state.practiceLogs].sort((a, b) => b.date.localeCompare(a.date)).filter((l) => !section || l.section === section);
  const bySection = IELTS_SECTION.map((sec) => ({ sec, mins: state.practiceLogs.filter((l) => l.section === sec).reduce((a, l) => a + l.minutes, 0) })).filter((x) => x.mins > 0);
  const recentMistakes = [...state.practiceLogs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((l) => l.mistakes.trim())
    .slice(0, 6);
  const latestWeak = [...attempts].reverse().find((a) => a.weaknesses.trim());

  const targets: [string, number | null][] = [
    ["Listening", s.targetL],
    ["Reading", s.targetR],
    ["Writing", s.targetW],
    ["Speaking", s.targetS],
  ];
  const latest = prog.latestAttempt;
  const latestBands: Record<string, number | null> = { Listening: latest?.L ?? null, Reading: latest?.R ?? null, Writing: latest?.W ?? null, Speaking: latest?.S ?? null };

  return (
    <div className="page">
      <PageHeader title="IELTS Academic" sub="Practical target 8.0+, with 9.0 as the ceiling. A score meets a programme's English requirement; it does not guarantee admission.">
        <button type="button" className="btn" onClick={() => setEditSettings(true)}>
          Edit targets & test date
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setAttempt("new")}>
          Add test result
        </button>
      </PageHeader>

      <div className="hero-grid">
        <div className="stat stat-countdown">
          <span className="stat-label">Official test</span>
          {s.plannedDate ? (
            <>
              <span className="countdown">
                <strong>{days !== null && days >= 0 ? days : "—"}</strong>
                <span>{days !== null && days >= 0 ? (days === 1 ? "day" : "days") : "date passed"}</span>
              </span>
              <span className="stat-title">{fmtDate(s.plannedDate)}</span>
              <span className="stat-sub">
                {REG_LABEL[s.registration]}
                {s.testCentre ? ` · ${s.testCentre}` : ""}
              </span>
            </>
          ) : (
            <>
              <span className="stat-title">No date set</span>
              <button type="button" className="btn btn-sm" onClick={() => setEditSettings(true)}>
                Set test date
              </button>
            </>
          )}
        </div>
        <div className="stat">
          <span className="stat-label">Latest overall</span>
          <span className="stat-big">
            {prog.latest ?? "—"}
            <span className="stat-of"> / target {prog.target}</span>
          </span>
          <Progress pct={prog.pct} size="sm" label="Progress from first result to target" />
          <span className="stat-sub">Measured from your first recorded result ({prog.baseline ?? "—"}).</span>
        </div>
        <div className="stat">
          <span className="stat-label">Highest minimum on your shortlist</span>
          <span className="stat-big">{minNeeded?.value ?? "—"}</span>
          <span className="stat-sub">{minNeeded ? minNeeded.program : "Add IELTS rows to programmes"} · check per-band minimums too</span>
        </div>
        <div className="stat">
          <span className="stat-label">Practice time</span>
          <span className="stat-big">
            {Math.round((prog.minutesWeek / 60) * 10) / 10}
            <span className="stat-of"> h this week</span>
          </span>
          <span className="stat-sub">{Math.round((prog.minutesTotal / 60) * 10) / 10} h logged in total</span>
        </div>
      </div>

      <Panel title="Band targets">
        <div className="band-grid">
          {targets.map(([name, t]) => (
            <div key={name} className="band">
              <span className="stat-label">{name}</span>
              <strong className="num">{latestBands[name] ?? "—"}</strong>
              <span className="small muted">target {t ?? "—"}</span>
              {latestBands[name] !== null && t !== null && <Pill tone={(latestBands[name] as number) >= t ? "good" : "warn"}>{(latestBands[name] as number) >= t ? "On target" : `${(t - (latestBands[name] as number)).toFixed(1)} to go`}</Pill>}
            </div>
          ))}
        </div>
        {(s.retakeDecision || s.notes) && (
          <div className="small">
            {s.retakeDecision && (
              <p>
                <strong>Retake decision:</strong> {s.retakeDecision}
              </p>
            )}
            {s.notes && <p className="muted">{s.notes}</p>}
          </div>
        )}
      </Panel>

      <div className="grid-2">
        <Panel title="Scores over time">
          {chartData.length ? (
            <div className="chart" role="img" aria-label="Line chart of IELTS overall and section scores by test date">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke="var(--grid)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 11 }} stroke="var(--line)" />
                  <YAxis domain={[4, 9]} ticks={[4, 5, 6, 7, 8, 9]} tick={{ fill: "var(--muted)", fontSize: 11 }} stroke="var(--line)" />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--fg)", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted)" }} />
                  {s.targetOverall && <ReferenceLine y={s.targetOverall} stroke="var(--accent)" strokeDasharray="4 4" label={{ value: `target ${s.targetOverall}`, fill: "var(--accent)", fontSize: 11, position: "insideTopRight" }} />}
                  <Line type="monotone" dataKey="Overall" stroke="var(--accent)" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                  <Line type="monotone" dataKey="Listening" stroke="var(--c1)" strokeWidth={1.5} dot={{ r: 2 }} connectNulls />
                  <Line type="monotone" dataKey="Reading" stroke="var(--c2)" strokeWidth={1.5} dot={{ r: 2 }} connectNulls />
                  <Line type="monotone" dataKey="Writing" stroke="var(--c3)" strokeWidth={1.5} dot={{ r: 2 }} connectNulls />
                  <Line type="monotone" dataKey="Speaking" stroke="var(--c4)" strokeWidth={1.5} dot={{ r: 2 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty title="No results yet" />
          )}
        </Panel>
        <Panel title="Practice hours per week">
          <div className="chart" role="img" aria-label="Bar chart of practice hours for the last eight weeks">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weekly} margin={{ top: 10, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: "var(--muted)", fontSize: 11 }} stroke="var(--line)" />
                <YAxis allowDecimals tick={{ fill: "var(--muted)", fontSize: 11 }} stroke="var(--line)" />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--fg)", borderRadius: 8 }} formatter={(v: number) => [`${v} h`, "Practice"]} />
                <Bar dataKey="hours" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {bySection.length > 0 && (
            <p className="small muted">
              By section:{" "}
              {bySection.map((x) => `${SECTION_LABEL[x.sec]} ${Math.round((x.mins / 60) * 10) / 10} h`).join(" · ")}
            </p>
          )}
        </Panel>
      </div>

      <Panel title="Test results" action={<button type="button" className="btn btn-sm" onClick={() => setAttempt("new")}>+ Result</button>}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Source</th>
                <th className="num">L</th>
                <th className="num">R</th>
                <th className="num">W</th>
                <th className="num">S</th>
                <th className="num">Overall</th>
                <th>Weaknesses</th>
                <th>
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {[...attempts].reverse().map((a) => (
                <tr key={a.id}>
                  <td className="mono">{fmtDate(a.date)}</td>
                  <td>
                    <Pill tone={a.kind === "official" ? "accent" : "neutral"}>{a.kind === "official" ? "Official" : "Mock"}</Pill>
                  </td>
                  <td className="small">{a.provider || "—"}</td>
                  <td className="num">{a.L ?? "—"}</td>
                  <td className="num">{a.R ?? "—"}</td>
                  <td className="num">{a.W ?? "—"}</td>
                  <td className="num">{a.S ?? "—"}</td>
                  <td className="num">
                    <strong>{attemptOverall(a) ?? "—"}</strong>
                  </td>
                  <td className="small">{a.weaknesses || a.notes || "—"}</td>
                  <td>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAttempt(a)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid-2">
        <Panel title="Recurring weaknesses">
          {latestWeak && (
            <p className="small">
              <strong>From your latest test ({fmtDate(latestWeak.date)}):</strong> {latestWeak.weaknesses}
            </p>
          )}
          {recentMistakes.length ? (
            <ul className="plain-list">
              {recentMistakes.map((l) => (
                <li key={l.id}>
                  <Pill tone="neutral">{SECTION_LABEL[l.section]}</Pill> {l.mistakes} <span className="small muted">· {fmtDate(l.date, false)}</span>
                </li>
              ))}
            </ul>
          ) : (
            !latestWeak && <Empty title="No mistakes logged yet">Record mistakes in the practice log to see patterns here.</Empty>
          )}
        </Panel>
        <Panel title="Writing & speaking feedback">
          {attempts.filter((a) => a.writingFeedback || a.speakingFeedback).length ? (
            <ul className="plain-list">
              {[...attempts]
                .reverse()
                .filter((a) => a.writingFeedback || a.speakingFeedback)
                .slice(0, 4)
                .map((a) => (
                  <li key={a.id}>
                    <strong className="mono small">{fmtDate(a.date)}</strong>
                    {a.writingFeedback && <div className="small">Writing: {a.writingFeedback}</div>}
                    {a.speakingFeedback && <div className="small">Speaking: {a.speakingFeedback}</div>}
                  </li>
                ))}
            </ul>
          ) : (
            <Empty title="No feedback recorded">Add examiner or tutor feedback when you log a result.</Empty>
          )}
        </Panel>
      </div>

      <Panel
        title="Practice log"
        action={
          <div className="row">
            <FilterSelect id="log-sec" label="Section" value={section} onChange={setSection} options={[{ value: "", label: "All sections" }, ...IELTS_SECTION.map((x) => ({ value: x, label: SECTION_LABEL[x] }))]} />
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setLog("new")}>
              + Log practice
            </button>
          </div>
        }
      >
        {logs.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Exercise</th>
                  <th>Section</th>
                  <th>Score</th>
                  <th className="num">Minutes</th>
                  <th>Mistakes</th>
                  <th>Lesson</th>
                  <th>Next action</th>
                  <th>
                    <span className="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="mono">{fmtDate(l.date, false)}</td>
                    <td>{l.activity}</td>
                    <td>{SECTION_LABEL[l.section]}</td>
                    <td className="mono">{l.score || "—"}</td>
                    <td className="num">{l.minutes}</td>
                    <td className="small">{l.mistakes || "—"}</td>
                    <td className="small">{l.lessons || "—"}</td>
                    <td className="small">{l.nextAction || "—"}</td>
                    <td>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLog(l)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No practice logged yet" action={<button type="button" className="btn btn-sm" onClick={() => setLog("new")}>Log your first session</button>}>
            Each entry records the exercise, score, time, mistakes, lesson and next action.
          </Empty>
        )}
      </Panel>

      {editSettings && <SettingsForm settings={s} onClose={() => setEditSettings(false)} />}
      {attempt && <AttemptForm attempt={attempt === "new" ? undefined : attempt} onClose={() => setAttempt(null)} />}
      {log && <LogForm log={log === "new" ? undefined : log} onClose={() => setLog(null)} />}
    </div>
  );
}

const bandStr = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));

function SettingsForm({ settings, onClose }: { settings: IeltsSettings; onClose: () => void }) {
  const { setSingleton } = useStore();
  const { draft, set } = useDraft<Record<string, unknown>>({ ...settings });
  const [errors, setErrors] = useState<FieldErrors>({});
  const b = (k: string) => (
    <TextField id={`is-${k}`} label={{ targetOverall: "Overall target", targetL: "Listening", targetR: "Reading", targetW: "Writing", targetS: "Speaking", minimumNeeded: "Minimum I need" }[k] as string} type="number" step="0.5" inputMode="decimal" value={bandStr(draft[k] as number | null)} onChange={(v) => set(k)(v)} error={errors[k]} />
  );
  return (
    <Modal title="IELTS targets & test" onClose={onClose} wide>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          const r = setSingleton("ieltsSettings", draft as Partial<IeltsSettings>);
          if (!r.ok) return setErrors(r.errors);
          onClose();
        }}
      >
        <FormErrors errors={errors} />
        {b("targetOverall")}
        {b("minimumNeeded")}
        {b("targetL")}
        {b("targetR")}
        {b("targetW")}
        {b("targetS")}
        <TextField id="is-date" label="Planned / booked test date" type="date" value={(draft.plannedDate as string) ?? ""} onChange={(v) => set("plannedDate")(v || null)} error={errors.plannedDate} />
        <SelectField id="is-reg" label="Registration" value={draft.registration as IeltsSettings["registration"]} onChange={(v) => set("registration")(v)} options={Object.entries(REG_LABEL).map(([value, label]) => ({ value: value as IeltsSettings["registration"], label }))} />
        <TextField id="is-centre" label="Test centre / provider" value={draft.testCentre as string} onChange={(v) => set("testCentre")(v)} />
        <TextField id="is-result" label="Result release date" type="date" value={(draft.resultDate as string) ?? ""} onChange={(v) => set("resultDate")(v || null)} error={errors.resultDate} />
        <TextArea id="is-retake" label="Retake decision" value={draft.retakeDecision as string} onChange={(v) => set("retakeDecision")(v)} className="span-2" rows={2} />
        <TextArea id="is-notes" label="Notes" value={draft.notes as string} onChange={(v) => set("notes")(v)} className="span-2" rows={2} />
        <div className="form-actions span-2">
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

function AttemptForm({ attempt, onClose }: { attempt?: IeltsAttempt; onClose: () => void }) {
  const { upsert, remove } = useStore();
  const blank: IeltsAttempt = { id: newId("ia"), date: todayISO(), kind: "mock", provider: "", L: null, R: null, W: null, S: null, overall: null, writingFeedback: "", speakingFeedback: "", weaknesses: "", notes: "" };
  const { draft, set } = useDraft<Record<string, unknown>>({ ...(attempt ?? blank) });
  const [errors, setErrors] = useState<FieldErrors>({});
  const num = (v: unknown) => (v === "" || v === null || v === undefined ? null : Number(v));
  const computed = ieltsOverall(num(draft.L), num(draft.R), num(draft.W), num(draft.S));
  const band = (k: string, label: string) => <TextField id={`ia-${k}`} label={label} type="number" step="0.5" inputMode="decimal" value={bandStr(draft[k] as number | null)} onChange={(v) => set(k)(v)} error={errors[k]} />;
  return (
    <Modal title={attempt ? "Edit result" : "Add a result"} onClose={onClose} wide>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          const r = upsert("ieltsAttempts", { ...draft, overall: computed ?? draft.overall });
          if (!r.ok) return setErrors(r.errors);
          onClose();
        }}
      >
        <FormErrors errors={errors} />
        <TextField id="ia-date" label="Date" type="date" value={draft.date as string} onChange={(v) => set("date")(v)} error={errors.date} />
        <SelectField id="ia-kind" label="Type" value={draft.kind as "mock" | "official"} onChange={(v) => set("kind")(v)} options={[{ value: "mock", label: "Mock / practice test" }, { value: "official", label: "Official IELTS" }]} />
        <TextField id="ia-provider" label="Provider or source" value={draft.provider as string} onChange={(v) => set("provider")(v)} className="span-2" placeholder="e.g. Cambridge IELTS 18 Test 2" />
        {band("L", "Listening")}
        {band("R", "Reading")}
        {band("W", "Writing")}
        {band("S", "Speaking")}
        <TextField
          id="ia-overall"
          label="Overall"
          type="number"
          step="0.5"
          inputMode="decimal"
          value={computed !== null ? String(computed) : bandStr(draft.overall as number | null)}
          onChange={(v) => set("overall")(v)}
          error={errors.overall}
          hint={computed !== null ? "Calculated from the four bands using IELTS rounding." : "Enter manually if you only know the overall."}
        />
        <TextArea id="ia-weak" label="Errors and recurring weaknesses" value={draft.weaknesses as string} onChange={(v) => set("weaknesses")(v)} className="span-2" rows={2} />
        <TextArea id="ia-wfb" label="Writing feedback" value={draft.writingFeedback as string} onChange={(v) => set("writingFeedback")(v)} rows={3} />
        <TextArea id="ia-sfb" label="Speaking feedback" value={draft.speakingFeedback as string} onChange={(v) => set("speakingFeedback")(v)} rows={3} />
        <TextArea id="ia-notes" label="Notes" value={draft.notes as string} onChange={(v) => set("notes")(v)} className="span-2" rows={2} />
        <div className="form-actions span-2">
          {attempt && (
            <ConfirmButton
              onConfirm={() => {
                remove("ieltsAttempts", attempt.id);
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

function LogForm({ log, onClose }: { log?: PracticeLog; onClose: () => void }) {
  const { upsert, remove } = useStore();
  const blank: PracticeLog = { id: newId("pl"), date: todayISO(), activity: "", section: "listening", score: "", minutes: 30, mistakes: "", lessons: "", nextAction: "" };
  const { draft, set } = useDraft<PracticeLog>(log ?? blank);
  const [errors, setErrors] = useState<FieldErrors>({});
  return (
    <Modal title={log ? "Edit practice" : "Log practice"} onClose={onClose} wide>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          const r = upsert("practiceLogs", draft);
          if (!r.ok) return setErrors(r.errors);
          onClose();
        }}
      >
        <TextField id="pl-date" label="Date" type="date" value={draft.date} onChange={set("date")} error={errors.date} />
        <SelectField id="pl-sec" label="Section" value={draft.section} onChange={set("section")} options={IELTS_SECTION.map((x) => ({ value: x, label: SECTION_LABEL[x] }))} />
        <TextField id="pl-act" label="Test or exercise completed" value={draft.activity} onChange={set("activity")} error={errors.activity} className="span-2" placeholder="e.g. Cambridge 17 Test 1, Listening Part 3–4" />
        <TextField id="pl-score" label="Score" value={draft.score} onChange={set("score")} placeholder="e.g. 32/40 or 7.0" />
        <TextField id="pl-min" label="Time spent (minutes)" type="number" inputMode="numeric" value={draft.minutes} onChange={(v) => set("minutes")(Number(v) || 0)} error={errors.minutes} />
        <TextArea id="pl-mis" label="Mistakes" value={draft.mistakes} onChange={set("mistakes")} className="span-2" rows={2} />
        <TextArea id="pl-les" label="Lessons learned" value={draft.lessons} onChange={set("lessons")} rows={2} />
        <TextArea id="pl-next" label="Next action" value={draft.nextAction} onChange={set("nextAction")} rows={2} />
        <div className="form-actions span-2">
          {log && (
            <ConfirmButton
              onConfirm={() => {
                remove("practiceLogs", log.id);
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
