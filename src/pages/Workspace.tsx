import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { fmtDate, todayISO, wordCount } from "../lib/calc";
import { newId, type Doc, type DocVersion, type Profile } from "../lib/types";
import { ConfirmButton, Empty, PageHeader, Panel, Pill, SelectField, TextArea, TextField } from "../components/ui";
import { shortUni } from "../components/forms";
import { submissionState } from "./Documents";

const STAGE_LABEL = { draft: "Draft", review: "Out for feedback", revised: "Revised", final: "Final" } as const;

type Sel = { kind: "master" } | { kind: "cv" } | { kind: "program"; id: string } | { kind: "profile" };

export default function Workspace() {
  const { state } = useStore();
  const [sel, setSel] = useState<Sel>({ kind: "profile" });
  const programs = state.programs.filter((p) => !p.archived);

  const docFor = (s: Sel): Doc | undefined => {
    if (s.kind === "cv") return state.documents.find((d) => d.category === "cv");
    if (s.kind === "master") return state.documents.find((d) => d.id === "d_sop_master") ?? state.documents.find((d) => d.category === "sop" && d.programIds.length === 0);
    if (s.kind === "program") return state.documents.find((d) => d.category === "sop" && d.programIds.length === 1 && d.programIds[0] === s.id);
    return undefined;
  };

  const isSel = (s: Sel) => JSON.stringify(s) === JSON.stringify(sel);

  return (
    <div className="page">
      <PageHeader title="SOP & CV" sub="Draft, version and track your statements and CV. Nothing here is generated for you; write only what is true about your experience." />
      <div className="ws-layout">
        <nav className="ws-nav" aria-label="Documents to edit">
          <button type="button" className={isSel({ kind: "profile" }) ? "ws-item is-on" : "ws-item"} onClick={() => setSel({ kind: "profile" })}>
            My profile
            <span className="small muted">Reusable facts</span>
          </button>
          <button type="button" className={isSel({ kind: "cv" }) ? "ws-item is-on" : "ws-item"} onClick={() => setSel({ kind: "cv" })}>
            CV / résumé
            <span className="small muted">{docFor({ kind: "cv" })?.versions.length ?? 0} versions</span>
          </button>
          <button type="button" className={isSel({ kind: "master" }) ? "ws-item is-on" : "ws-item"} onClick={() => setSel({ kind: "master" })}>
            Master SOP
            <span className="small muted">{docFor({ kind: "master" })?.versions.length ?? 0} versions</span>
          </button>
          <div className="ws-sep">Per programme</div>
          {programs.map((p) => {
            const d = docFor({ kind: "program", id: p.id });
            return (
              <button key={p.id} type="button" className={isSel({ kind: "program", id: p.id }) ? "ws-item is-on" : "ws-item"} onClick={() => setSel({ kind: "program", id: p.id })}>
                {shortUni(state, p.id)}
                <span className="small muted">{d ? `${d.versions.length} versions` : "Not started"}</span>
              </button>
            );
          })}
        </nav>
        <div className="ws-main">
          {sel.kind === "profile" ? <ProfileEditor /> : <DocEditor key={JSON.stringify(sel)} sel={sel} doc={docFor(sel)} />}
        </div>
      </div>
    </div>
  );
}

function ProfileEditor() {
  const { state, setSingleton } = useStore();
  const p = state.profile;
  const field = (k: keyof Profile, label: string, rows = 2, hint?: string) => (
    <TextArea id={`pr-${k}`} label={label} value={p[k]} rows={rows} hint={hint} onChange={(v) => setSingleton("profile", { [k]: v } as Partial<Profile>)} />
  );
  return (
    <Panel title="My profile" action={<span className="small muted">Saves as you type</span>}>
      <p className="small muted">Facts you reuse across SOPs, CVs and forms. Keep them accurate; add achievements only when they are real and you can evidence them.</p>
      <div className="form-grid">
        <TextField id="pr-fullName" label="Full name (as in passport)" value={p.fullName} onChange={(v) => setSingleton("profile", { fullName: v })} />
        <TextField id="pr-gpa" label="GPA" value={p.gpa} onChange={(v) => setSingleton("profile", { gpa: v })} />
        {field("university", "University")}
        {field("degree", "Degree")}
        {field("graduation", "Expected graduation")}
        {field("mobility", "International academic experience")}
        {field("experience", "Experience", 3)}
        {field("projects", "Projects", 3, "Name, your role, tech used, what it does, measurable result if you have one.")}
        {field("skills", "Technical skills", 3, "Languages, frameworks, ML tools — only those you can discuss in an interview.")}
        {field("interests", "Career interests")}
        {field("goals", "Career goals", 3)}
        {field("destinations", "Destinations")}
        <div className="span-2">{field("sequence", "My plan", 6)}</div>
      </div>
    </Panel>
  );
}

function DocEditor({ sel, doc }: { sel: Exclude<Sel, { kind: "profile" }>; doc?: Doc }) {
  const { state, upsert, patch, setText } = useStore();
  const program = sel.kind === "program" ? state.programs.find((p) => p.id === sel.id) : undefined;
  const [activeId, setActiveId] = useState<string | null>(doc?.finalVersionId ?? doc?.versions[doc.versions.length - 1]?.id ?? null);
  const active = doc?.versions.find((v) => v.id === activeId) ?? null;
  const text = active ? state.texts[active.id] ?? "" : "";
  const wc = wordCount(text);
  const limit = program?.sopWordLimit ?? null;
  const masterDoc = state.documents.find((d) => d.id === "d_sop_master");
  const masterFinalText = masterDoc?.finalVersionId ? state.texts[masterDoc.finalVersionId] : masterDoc?.versions.length ? state.texts[masterDoc.versions[masterDoc.versions.length - 1].id] : "";

  const title = sel.kind === "cv" ? "CV / résumé" : sel.kind === "master" ? "Master Statement of Purpose" : `SOP — ${shortUni(state, sel.id)}`;

  const create = (copyMaster: boolean) => {
    const vId = newId("v");
    const version: DocVersion = { id: vId, label: "v1", createdAt: todayISO(), stage: "draft", wordCount: 0, feedback: "", notes: "" };
    const initialText = copyMaster ? masterFinalText ?? "" : "";
    const d: Doc = {
      id: newId("d"),
      name: sel.kind === "program" ? `Statement of Purpose — ${shortUni(state, sel.id)}` : sel.kind === "cv" ? "CV / résumé" : "Statement of Purpose — master draft",
      category: sel.kind === "cv" ? "cv" : "sop",
      status: "in_progress",
      issueDate: null,
      expiryDate: null,
      language: "English",
      translationRequired: false,
      notarizationRequired: false,
      translationNote: "",
      programIds: sel.kind === "program" ? [sel.id] : [],
      filePath: "",
      fileLink: "",
      assetId: "",
      assetName: "",
      notes: "",
      versions: [{ ...version, wordCount: wordCount(initialText) }],
      finalVersionId: null,
      submissions: [],
    };
    upsert("documents", d);
    setText(vId, initialText);
    setActiveId(vId);
    // point the programme's SOP requirement at this document
    if (sel.kind === "program") {
      const req = state.requirements.find((r) => r.programId === sel.id && (r.title === "Statement of Purpose" || r.title.startsWith("Personal statement")) && r.required !== "not_required");
      if (req) patch("requirements", req.id, { documentId: d.id, myStatus: req.myStatus === "not_started" ? "in_progress" : req.myStatus });
    }
  };

  const addVersionToExisting = () => {
    if (!doc) return;
    const vId = newId("v");
    const n = doc.versions.length + 1;
    const v: DocVersion = { id: vId, label: `v${n}`, createdAt: todayISO(), stage: "draft", wordCount: wc, feedback: "", notes: "" };
    patch("documents", doc.id, { versions: [...doc.versions, v], status: doc.status === "not_started" ? "in_progress" : doc.status });
    setText(vId, text);
    setActiveId(vId);
  };

  const updateVersion = (partial: Partial<DocVersion>) => {
    if (!doc || !active) return;
    patch("documents", doc.id, { versions: doc.versions.map((v) => (v.id === active.id ? { ...v, ...partial } : v)) });
  };

  const onText = (v: string) => {
    if (!active || !doc) return;
    setText(active.id, v);
  };
  const syncWordCount = () => {
    if (active && active.wordCount !== wc) updateVersion({ wordCount: wc });
  };

  const relevantPrograms = useMemo(() => {
    if (!doc) return [];
    if (sel.kind === "program") return [sel.id];
    const linked = state.requirements.filter((r) => r.documentId === doc.id && r.required !== "not_required" && r.myStatus !== "not_applicable").map((r) => r.programId);
    return Array.from(new Set(linked)).filter((pid) => state.programs.some((p) => p.id === pid && !p.archived));
  }, [doc, sel, state.requirements, state.programs]);

  if (!doc || doc.versions.length === 0) {
    return (
      <Panel title={title}>
        <Empty
          title="No drafts yet"
          action={
            <div className="row">
              {doc ? (
                <button type="button" className="btn btn-primary" onClick={addVersionToExisting}>
                  Start version 1
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => create(false)}>
                  Start a blank draft
                </button>
              )}
              {!doc && sel.kind === "program" && masterFinalText && (
                <button type="button" className="btn" onClick={() => create(true)}>
                  Start from my master SOP
                </button>
              )}
            </div>
          }
        >
          {program && (
            <>
              Requirement: {program.sopReq || "check the programme page"}. {limit ? `Word limit ${limit}.` : "No word limit recorded."}
            </>
          )}
        </Empty>
      </Panel>
    );
  }

  return (
    <>
      <Panel
        title={title}
        action={
          <div className="row">
            <label className="sr-only" htmlFor="ws-ver">
              Version
            </label>
            <select id="ws-ver" value={active?.id ?? ""} onChange={(e) => setActiveId(e.target.value)}>
              {doc.versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} · {STAGE_LABEL[v.stage]}
                  {v.id === doc.finalVersionId ? " · final" : ""}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-sm" onClick={addVersionToExisting}>
              Save as new version
            </button>
          </div>
        }
      >
        {program && (
          <div className="ws-meta">
            <span className="small">{program.sopReq || "Requirement not recorded."}</span>
            <TextField
              id="ws-limit"
              label="Word limit"
              type="number"
              inputMode="numeric"
              value={program.sopWordLimit ?? ""}
              onChange={(v) => patch("programs", program.id, { sopWordLimit: v === "" ? null : Number(v) })}
            />
          </div>
        )}
        {active && (
          <>
            <label className="sr-only" htmlFor="ws-text">
              {title} text
            </label>
            <textarea id="ws-text" className="editor" value={text} onChange={(e) => onText(e.target.value)} onBlur={syncWordCount} placeholder="Write here. Your text saves automatically." />
            <div className="editor-foot">
              <span className={`mono${limit && wc > limit ? " bad-text" : ""}`}>
                {wc} words{limit ? ` / ${limit}` : ""}
              </span>
              {limit && wc > limit && <Pill tone="bad">Over the limit by {wc - limit}</Pill>}
              <span className="small muted">Created {fmtDate(active.createdAt)}</span>
            </div>
          </>
        )}
      </Panel>

      {active && (
        <div className="grid-2">
          <Panel title="This version">
            <div className="form-grid">
              <TextField id="ws-label" label="Label" value={active.label} onChange={(v) => updateVersion({ label: v || active.label })} />
              <SelectField id="ws-stage" label="Editing status" value={active.stage} onChange={(v) => updateVersion({ stage: v })} options={Object.entries(STAGE_LABEL).map(([value, label]) => ({ value: value as DocVersion["stage"], label }))} />
              <TextArea id="ws-fb" label="Feedback received" value={active.feedback} onChange={(v) => updateVersion({ feedback: v })} className="span-2" rows={4} />
              <TextArea id="ws-vnotes" label="Notes" value={active.notes} onChange={(v) => updateVersion({ notes: v })} className="span-2" rows={2} />
            </div>
            <div className="row">
              {doc.finalVersionId === active.id ? (
                <Pill tone="good">This is the final version</Pill>
              ) : (
                <button type="button" className="btn btn-sm" onClick={() => patch("documents", doc.id, { finalVersionId: active.id, status: "complete", versions: doc.versions.map((v) => (v.id === active.id ? { ...v, stage: "final" as const, wordCount: wc } : v)) })}>
                  Mark as final
                </button>
              )}
              {doc.versions.length > 1 && (
                <ConfirmButton
                  label="Delete version"
                  confirmLabel="Delete this version"
                  onConfirm={() => {
                    const rest = doc.versions.filter((v) => v.id !== active.id);
                    patch("documents", doc.id, { versions: rest, finalVersionId: doc.finalVersionId === active.id ? null : doc.finalVersionId });
                    setActiveId(rest[rest.length - 1].id);
                  }}
                />
              )}
            </div>
          </Panel>
          <Panel title="Linked applications">
            {relevantPrograms.length === 0 ? (
              <Empty title="Not linked to an application yet">Link this document from a requirement row on a programme page.</Empty>
            ) : (
              <ul className="plain-list">
                {relevantPrograms.map((pid) => {
                  const s = submissionState(doc, pid);
                  const sub = doc.submissions.find((x) => x.programId === pid);
                  return (
                    <li key={pid} className="row-between">
                      <span>
                        <strong>{shortUni(state, pid)}</strong> <Pill tone={s.tone}>{s.label}</Pill>
                      </span>
                      {sub ? (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => patch("documents", doc.id, { submissions: doc.submissions.filter((x) => x.programId !== pid) })}>
                          Undo
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={!doc.finalVersionId}
                          title={doc.finalVersionId ? "Record that the final version was submitted today" : "Mark a version as final first"}
                          onClick={() => patch("documents", doc.id, { submissions: [...doc.submissions, { programId: pid, versionId: doc.finalVersionId, submittedOn: todayISO() }] })}
                        >
                          Mark final submitted
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}
