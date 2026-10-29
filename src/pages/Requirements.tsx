import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { activePrograms, programReadiness, requirementDone, todayISO } from "../lib/calc";
import { REQ_CATEGORY, REQ_CATEGORY_LABEL, STATUS_LABEL, type Requirement } from "../lib/types";
import { Empty, ExtLink, PageHeader, Panel, Progress, SearchBox, Tabs } from "../components/ui";
import { shortUni } from "../components/forms";

type View = "matrix" | "unverified";

const GLYPH: Record<string, string> = { complete: "✓", in_progress: "◐", not_started: "○", waiting: "⧗", needs_verification: "?", blocked: "⊘", not_applicable: "–" };

export default function Requirements() {
  const { state, patch } = useStore();
  const [view, setView] = useState<View>("matrix");
  const [q, setQ] = useState("");
  const progs = activePrograms(state);

  const titles = useMemo(() => {
    const seen = new Map<string, Requirement["category"]>();
    for (const r of state.requirements) if (!seen.has(r.title)) seen.set(r.title, r.category);
    return [...seen.entries()];
  }, [state.requirements]);

  const unverified = state.requirements
    .filter((r) => !r.verified && r.required !== "not_required" && r.myStatus !== "not_applicable" && progs.some((p) => p.id === r.programId))
    .filter((r) => !q || `${r.title} ${r.officialValue} ${shortUni(state, r.programId)}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="page">
      <PageHeader title="Requirements" sub="Every programme's checklist in one place. Open a programme to edit rows in full.">
        <Tabs<View>
          label="Requirements view"
          value={view}
          onChange={setView}
          items={[
            { value: "matrix", label: "Matrix" },
            { value: "unverified", label: "Needs verification", count: unverified.length },
          ]}
        />
      </PageHeader>

      <div className="card-grid card-grid-tight">
        {progs.map((p) => {
          const r = programReadiness(state, p.id);
          return (
            <a key={p.id} className="mini-card" href={`#program-${p.id}`}>
              <strong>{shortUni(state, p.id)}</strong>
              <Progress pct={r.pct} size="sm" label={`${shortUni(state, p.id)} readiness`} />
              <span className="small muted">{r.unverified} unverified</span>
            </a>
          );
        })}
      </div>

      {view === "matrix" ? (
        <Panel title="Matrix">
          <p className="small muted legend">
            {Object.entries(GLYPH).map(([k, g]) => (
              <span key={k}>
                <span className={`mx-glyph st-${k}`}>{g}</span> {STATUS_LABEL[k as keyof typeof STATUS_LABEL]}
              </span>
            ))}
            <span>
              <span className="mx-unv">dashed</span> = not verified
            </span>
          </p>
          <div className="table-wrap">
            <table className="table matrix">
              <thead>
                <tr>
                  <th>Requirement</th>
                  {progs.map((p) => (
                    <th key={p.id}>
                      <a href={`#program-${p.id}`}>{shortUni(state, p.id)}</a>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {REQ_CATEGORY.map((cat) => (
                  <MatrixGroup key={cat} cat={cat} titles={titles.filter(([, c]) => c === cat).map(([t]) => t)} progs={progs.map((p) => p.id)} />
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <Panel title="Rows that still need an official source" action={<SearchBox id="unv-q" value={q} onChange={setQ} placeholder="Filter" />}>
          {unverified.length === 0 ? (
            <Empty title="Nothing left to verify" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>University</th>
                    <th>Requirement</th>
                    <th>What is known</th>
                    <th>Source so far</th>
                    <th>
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {unverified.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <a href={`#program-${r.programId}`}>{shortUni(state, r.programId)}</a>
                      </td>
                      <td>
                        <strong>{r.title}</strong>
                        <div className="small muted">{REQ_CATEGORY_LABEL[r.category]}</div>
                      </td>
                      <td className="small">
                        {r.officialValue}
                        {r.notes && <div className="muted">{r.notes}</div>}
                      </td>
                      <td>{r.sourceUrl ? <ExtLink href={r.sourceUrl} /> : <span className="muted">—</span>}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={!r.sourceUrl}
                          title={r.sourceUrl ? "I confirmed this on the official source today" : "Add an official source on the programme page first"}
                          onClick={() => patch("requirements", r.id, { verified: true, verifiedOn: todayISO() })}
                        >
                          Mark verified
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

function MatrixGroup({ cat, titles, progs }: { cat: Requirement["category"]; titles: string[]; progs: string[] }) {
  const { state } = useStore();
  if (!titles.length) return null;
  return (
    <>
      <tr className="matrix-cat">
        <th colSpan={progs.length + 1}>{REQ_CATEGORY_LABEL[cat]}</th>
      </tr>
      {titles.map((title) => (
        <tr key={title}>
          <th scope="row" className="matrix-row">
            {title}
          </th>
          {progs.map((pid) => {
            const r = state.requirements.find((x) => x.programId === pid && x.title === title);
            if (!r) return <td key={pid} className="mx-cell muted">·</td>;
            const st = r.required === "not_required" ? "not_applicable" : r.myStatus;
            const label = `${shortUni(state, pid)} — ${title}: ${STATUS_LABEL[st]}${r.verified ? ", verified" : ", not verified"}. ${r.officialValue}`;
            return (
              <td key={pid} className="mx-cell">
                <a href={`#program-${pid}`} className={`mx-glyph st-${st}${r.verified ? "" : " is-unv"}${requirementDone(r) ? " is-done" : ""}`} title={label} aria-label={label}>
                  {GLYPH[st]}
                </a>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
