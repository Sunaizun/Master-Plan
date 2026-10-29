import { useStore } from "../lib/store";
import { activePrograms, convert, fmtMoney, programReadiness, requirementDone, countsTowardReadiness } from "../lib/calc";
import type { Program } from "../lib/types";
import { DateCell, PageHeader, Panel, Pill, Progress, StatusBadge } from "../components/ui";
import { BOL_LABEL, DECISION_LABEL, ELIG_LABEL, FIT_LABEL, SUBMISSION_LABEL } from "./Universities";

export default function Applications() {
  const { state, patch } = useStore();
  const progs = activePrograms(state);
  const cur = state.settings.displayCurrency;

  const effort = (p: Program) => {
    const openReqs = state.requirements.filter((r) => r.programId === p.id && countsTowardReadiness(r) && !requirementDone(r)).length;
    const openTasks = state.tasks.filter((t) => t.programIds.includes(p.id) && t.status !== "complete" && t.status !== "not_applicable");
    const hours = openTasks.reduce((a, t) => a + (t.estHours ?? 0), 0);
    return { openReqs, openTasks: openTasks.length, hours };
  };
  const docsRequired = (p: Program) =>
    state.requirements.filter((r) => r.programId === p.id && r.category === "materials" && (r.required === "required" || r.required === "conditional") && r.myStatus !== "not_applicable").length;

  const rows: { label: string; render: (p: Program) => React.ReactNode }[] = [
    { label: "Programme", render: (p) => <span>{p.name}</span> },
    {
      label: "Fit for ML / SWE (my score)",
      render: (p) => (
        <span aria-label={`${p.fitScore} out of 5`}>
          <span className="dots" aria-hidden="true">
            {"●".repeat(p.fitScore)}
            <span className="muted">{"○".repeat(5 - p.fitScore)}</span>
          </span>{" "}
          {p.fitScore}/5
        </span>
      ),
    },
    { label: "Academic eligibility", render: (p) => <Pill tone={p.eligibility === "meets" ? "good" : p.eligibility === "below" ? "bad" : p.eligibility === "borderline" ? "warn" : "neutral"}>{ELIG_LABEL[p.eligibility]}</Pill> },
    { label: "IELTS requirement", render: (p) => <span className="small">{p.ieltsReq || "—"}</span> },
    { label: "GPA requirement", render: (p) => <span className="small">{p.gpaReq || "—"}</span> },
    { label: "Prerequisites", render: (p) => <span className="small">{p.prerequisites || "—"}</span> },
    {
      label: `Tuition (≈ ${cur})`,
      render: (p) => {
        if (p.tuition === null) return <StatusBadge status="needs_verification" small />;
        const conv = convert(p.tuition, p.tuitionCurrency, cur, state.settings);
        return (
          <span>
            {fmtMoney(p.tuition, p.tuitionCurrency)}
            {p.tuitionCurrency !== cur && <div className="small muted">{conv === null ? "add rate to convert" : `≈ ${fmtMoney(conv, cur)}`}</div>}
          </span>
        );
      },
    },
    {
      label: "Living costs / year",
      render: (p) => (p.livingEstimate === null ? <span className="muted small">Not estimated</span> : fmtMoney(p.livingEstimate, p.tuitionCurrency)),
    },
    {
      label: "Official deadline",
      render: (p) => (
        <span>
          {p.deadline ? <DateCell date={p.deadline} done={p.submission === "submitted"} /> : <StatusBadge status="needs_verification" small />}
          <div className="small muted">{p.deadlineType}</div>
        </span>
      ),
    },
    { label: "Required documents", render: (p) => <span>{docsRequired(p)} items</span> },
    { label: "Funding options", render: (p) => <span className="small">{p.funding || "—"}</span> },
    { label: "Bolashak list", render: (p) => <Pill tone={p.bolashakList === "listed" ? "good" : p.bolashakList === "not_listed" ? "bad" : "warn"}>{BOL_LABEL[p.bolashakList]}</Pill> },
    {
      label: "Remaining effort",
      render: (p) => {
        const e = effort(p);
        return (
          <span className="small">
            {e.openReqs} open requirements · {e.openTasks} open tasks{e.hours ? ` · ~${e.hours} h` : ""}
          </span>
        );
      },
    },
  ];

  return (
    <div className="page">
      <PageHeader title="Applications" sub="Side-by-side comparison and the five separate statuses for each programme. Probabilities of admission are deliberately not estimated." />

      <Panel title="Comparison">
        <div className="table-wrap">
          <table className="table compare">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Criterion</span>
                </th>
                {progs.map((p) => (
                  <th key={p.id} scope="col">
                    <a href={`#program-${p.id}`}>{state.universities.find((u) => u.id === p.universityId)?.name}</a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {progs.map((p) => (
                    <td key={p.id}>{row.render(p)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Status by stage">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>University</th>
                <th>1. Academic eligibility</th>
                <th>2. Application completeness</th>
                <th>3. Admissions submission</th>
                <th>4. Admission decision</th>
                <th>5. Bolashak readiness</th>
              </tr>
            </thead>
            <tbody>
              {progs.map((p) => {
                const r = programReadiness(state, p.id);
                const bolReady =
                  p.bolashakList === "not_applicable"
                    ? "Not a Bolashak route"
                    : p.bolashakList !== "listed"
                      ? "University eligibility unconfirmed"
                      : p.decision === "unconditional_offer" || p.decision === "accepted"
                        ? "Has unconditional offer"
                        : "Needs unconditional offer";
                const uname = state.universities.find((u) => u.id === p.universityId)?.name;
                return (
                  <tr key={p.id}>
                    <td>
                      <a href={`#program-${p.id}`}>
                        <strong>{uname}</strong>
                      </a>
                    </td>
                    <td>{ELIG_LABEL[p.eligibility]}</td>
                    <td style={{ minWidth: 140 }}>
                      <Progress pct={r.pct} size="sm" label={`${uname} completeness`} />
                    </td>
                    <td>
                      <label className="sr-only" htmlFor={`sub-${p.id}`}>
                        Submission status for {uname}
                      </label>
                      <select id={`sub-${p.id}`} value={p.submission} onChange={(e) => patch("programs", p.id, { submission: e.target.value as Program["submission"], submittedOn: e.target.value === "submitted" ? p.submittedOn ?? new Date().toISOString().slice(0, 10) : p.submittedOn })}>
                        {Object.entries(SUBMISSION_LABEL).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <label className="sr-only" htmlFor={`dec-${p.id}`}>
                        Decision for {uname}
                      </label>
                      <select id={`dec-${p.id}`} value={p.decision} onChange={(e) => patch("programs", p.id, { decision: e.target.value as Program["decision"] })}>
                        {Object.entries(DECISION_LABEL).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="small">{bolReady}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Classification and evidence">
        <p className="small muted">Three categories only: stronger fit based on verified requirements, competitive/ambitious, or unclear pending verification. Change them in each programme's record as you learn more.</p>
        <div className="evidence-grid">
          {(["stronger", "ambitious", "unclear"] as const).map((fit) => (
            <div key={fit} className={`evidence-col fit-${fit}`}>
              <h3>{FIT_LABEL[fit]}</h3>
              {progs.filter((p) => p.fit === fit).length === 0 && <p className="small muted">None</p>}
              {progs
                .filter((p) => p.fit === fit)
                .map((p) => (
                  <div key={p.id} className="evidence-item">
                    <a href={`#program-${p.id}`}>
                      <strong>{state.universities.find((u) => u.id === p.universityId)?.name}</strong>
                    </a>
                    <p className="small">{p.fitEvidence || "No evidence recorded yet."}</p>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
