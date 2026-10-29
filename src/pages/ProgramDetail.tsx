import { useMemo, useState } from "react";
import { useStore, type FieldErrors } from "../lib/store";
import { fmtDate, fmtMoney, programReadiness, programTaskProgress, readinessOf, displayStatus, todayISO } from "../lib/calc";
import { REQ_CATEGORY, REQ_CATEGORY_LABEL, REQUIRED, REQUIRED_LABEL, STATUS, STATUS_LABEL, newId, type Requirement, type Source, type Task } from "../lib/types";
import {
  CheckField,
  ConfirmButton,
  DateCell,
  Empty,
  ExtLink,
  FormErrors,
  Modal,
  PageHeader,
  Panel,
  Pill,
  Progress,
  SelectField,
  StatusBadge,
  Tabs,
  TextArea,
  TextField,
  VerifiedMark,
} from "../components/ui";
import { TaskForm, useDraft } from "../components/forms";
import { TaskRow } from "../components/TaskRow";
import { BOL_LABEL, DECISION_LABEL, ELIG_LABEL, FIT_LABEL, ProgramForm, SUBMISSION_LABEL } from "./Universities";

type Filter = "all" | "open" | "unverified";

export default function ProgramDetail({ programId }: { programId: string }) {
  const { state, patch, remove } = useStore();
  const program = state.programs.find((p) => p.id === programId);
  const [editing, setEditing] = useState(false);
  const [editReq, setEditReq] = useState<Requirement | null>(null);
  const [newReqCat, setNewReqCat] = useState<Requirement["category"] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [taskEdit, setTaskEdit] = useState<Task | null | "new">(null);
  const [srcEdit, setSrcEdit] = useState<Source | null | "new">(null);

  const reqs = useMemo(() => state.requirements.filter((r) => r.programId === programId), [state.requirements, programId]);
  if (!program) {
    return (
      <div className="page">
        <Empty title="Programme not found" action={<a href="#universities">Back to universities</a>}>
          It may have been deleted.
        </Empty>
      </div>
    );
  }
  const uni = state.universities.find((u) => u.id === program.universityId);
  const r = programReadiness(state, program.id);
  const tp = programTaskProgress(state, program.id);
  const tasks = state.tasks.filter((t) => t.programIds.includes(program.id));
  const sources = state.sources.filter((s) => s.programId === program.id);
  const recs = state.recRequests.filter((x) => x.programId === program.id);

  const visible = reqs.filter((x) => (filter === "open" ? !(x.myStatus === "complete" && x.verified) && x.myStatus !== "not_applicable" : filter === "unverified" ? !x.verified : true));

  return (
    <div className="page">
      <a href="#universities" className="back">
        ← Universities
      </a>
      <PageHeader
        eyebrow={`${uni?.country ?? ""}${uni?.city ? ` · ${uni.city}` : ""}`}
        title={uni?.name ?? "University"}
        sub={
          <>
            {program.name} · {program.intake}
            {program.archived && <Pill tone="neutral"> Archived</Pill>}
          </>
        }
      >
        <button type="button" className="btn" onClick={() => setEditing(true)}>
          Edit record
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => patch("programs", program.id, { archived: !program.archived })}>
          {program.archived ? "Restore" : "Archive"}
        </button>
        <ConfirmButton
          label="Delete"
          confirmLabel="Delete programme and its checklist"
          onConfirm={() => {
            remove("programs", program.id);
            window.location.hash = "universities";
          }}
        />
      </PageHeader>

      <div className="summary-strip">
        <div className="summary-cell wide">
          <span className="stat-label">Readiness</span>
          <Progress pct={r.pct} label="Programme readiness" />
          <span className="small muted">
            {r.done} of {r.total} counted requirements complete and verified
            {r.completeButUnverified > 0 && ` · ${r.completeButUnverified} complete but unverified`}
          </span>
        </div>
        <div className="summary-cell">
          <span className="stat-label">Official deadline</span>
          {program.deadline ? <DateCell date={program.deadline} done={program.submission === "submitted"} /> : <StatusBadge status="needs_verification" small />}
          <span className="small muted">{program.deadlineType}</span>
        </div>
        <div className="summary-cell">
          <span className="stat-label">My target</span>
          <DateCell date={program.targetDate} done={program.submission === "submitted"} />
          <span className="small muted">internal plan</span>
        </div>
        <div className="summary-cell">
          <span className="stat-label">Application fee</span>
          <span>{program.appFee === null ? <StatusBadge status="needs_verification" small /> : fmtMoney(program.appFee, program.appFeeCurrency)}</span>
        </div>
        <div className="summary-cell">
          <span className="stat-label">Tuition / year</span>
          <span>{program.tuition === null ? <StatusBadge status="needs_verification" small /> : fmtMoney(program.tuition, program.tuitionCurrency)}</span>
        </div>
        <div className="summary-cell">
          <span className="stat-label">Tasks</span>
          <span>
            {tp.done}/{tp.total} done
          </span>
        </div>
      </div>

      <div className="status-row">
        <StatusChip label="Academic eligibility" value={ELIG_LABEL[program.eligibility]} tone={program.eligibility === "meets" ? "good" : program.eligibility === "below" ? "bad" : "warn"} />
        <StatusChip label="Application completeness" value={`${r.pct}%`} tone={r.pct >= 100 ? "good" : "neutral"} />
        <StatusChip label="Submission" value={SUBMISSION_LABEL[program.submission]} tone={program.submission === "submitted" ? "good" : "neutral"} />
        <StatusChip label="Decision" value={DECISION_LABEL[program.decision]} tone={program.decision.includes("offer") || program.decision === "accepted" ? "good" : program.decision === "rejected" ? "bad" : "neutral"} />
        <StatusChip label="Bolashak" value={BOL_LABEL[program.bolashakList]} tone={program.bolashakList === "listed" ? "good" : program.bolashakList === "not_listed" ? "bad" : "warn"} />
      </div>

      <div className="grid-2">
        <Panel title="Classification">
          <Pill tone={program.fit === "stronger" ? "good" : program.fit === "ambitious" ? "warn" : "neutral"}>{FIT_LABEL[program.fit]}</Pill>
          <p>{program.fitEvidence || "Add the evidence behind this classification in Edit record."}</p>
          {program.eligibilityNote && <p className="small muted">Eligibility: {program.eligibilityNote}</p>}
          {program.bolashakNote && <p className="small muted">Bolashak: {program.bolashakNote}</p>}
        </Panel>
        <Panel title="Key facts">
          <dl className="kv kv-wide">
            <dt>Deadline details</dt>
            <dd>{program.deadlineNote || "—"}</dd>
            {program.openingNote && (
              <>
                <dt>Opening</dt>
                <dd>{program.openingDate ? fmtDate(program.openingDate) + " · " : ""}{program.openingNote}</dd>
              </>
            )}
            <dt>Duration</dt>
            <dd>{program.duration || "—"}</dd>
            <dt>Funding</dt>
            <dd>{program.funding || "—"}</dd>
            <dt>Links</dt>
            <dd className="row-wrap">
              <ExtLink href={program.programUrl}>Programme page</ExtLink>
              <ExtLink href={program.admissionsUrl}>Admissions</ExtLink>
              {program.portalUrl && <ExtLink href={program.portalUrl}>Application portal</ExtLink>}
            </dd>
          </dl>
        </Panel>
      </div>

      <Panel
        title="Requirements checklist"
        action={
          <Tabs<Filter>
            label="Filter requirements"
            value={filter}
            onChange={setFilter}
            items={[
              { value: "all", label: "All", count: reqs.length },
              { value: "open", label: "Open", count: reqs.filter((x) => !(x.myStatus === "complete" && x.verified) && x.myStatus !== "not_applicable").length },
              { value: "unverified", label: "Unverified", count: reqs.filter((x) => !x.verified).length },
            ]}
          />
        }
      >
        <p className="small muted">
          A row counts toward readiness only when it is <strong>Complete</strong> and its official value is <strong>Verified</strong>. Optional and Not required rows are excluded.
        </p>
        {REQ_CATEGORY.map((cat) => {
          const rows = visible.filter((x) => x.category === cat);
          const catR = readinessOf(reqs.filter((x) => x.category === cat));
          return (
            <div key={cat} className="req-group">
              <div className="req-group-head">
                <h3>{REQ_CATEGORY_LABEL[cat]}</h3>
                <span className="small muted">
                  {catR.done}/{catR.total} ready
                </span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNewReqCat(cat)}>
                  + Add row
                </button>
              </div>
              {rows.length === 0 ? (
                <p className="small muted">No rows in this view.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table req-table">
                    <thead>
                      <tr>
                        <th>Requirement</th>
                        <th>Required?</th>
                        <th>My status</th>
                        <th>Deadline</th>
                        <th>Evidence / file</th>
                        <th>Official source</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <ReqRow key={row.id} row={row} onEdit={() => setEditReq(row)} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </Panel>

      <div className="grid-2">
        <Panel
          title="Tasks for this programme"
          action={
            <button type="button" className="btn btn-sm" onClick={() => setTaskEdit("new")}>
              + Task
            </button>
          }
        >
          {tasks.length ? (
            <ul className="task-list">
              {tasks
                .slice()
                .sort((a, b) => (a.deadline ?? "9").localeCompare(b.deadline ?? "9"))
                .map((t) => (
                  <TaskRow key={t.id} task={t} onEdit={setTaskEdit} compact />
                ))}
            </ul>
          ) : (
            <Empty title="No tasks linked yet" />
          )}
        </Panel>
        <Panel
          title="Sources & verification log"
          action={
            <button type="button" className="btn btn-sm" onClick={() => setSrcEdit("new")}>
              + Source
            </button>
          }
        >
          {sources.length ? (
            <ul className="source-list">
              {sources.map((s) => (
                <li key={s.id}>
                  <div className="row-between">
                    <strong>{s.label}</strong>
                    <span className="small mono">{fmtDate(s.checkedOn)}</span>
                  </div>
                  <div className="small">{s.finding}</div>
                  <div className="row-between">
                    <ExtLink href={s.url} />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSrcEdit(s)}>
                      Edit
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No sources logged">Log each official page you check, with the date.</Empty>
          )}
          {recs.length > 0 && (
            <>
              <h3 className="sub-h">Recommendation letters</h3>
              <ul className="plain-list">
                {recs.map((x) => (
                  <li key={x.id}>
                    {state.recommenders.find((rr) => rr.id === x.recommenderId)?.name} · <span className="muted">{x.status.replace("_", " ")}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>

      {program.notes && (
        <Panel title="Notes">
          <p className="prewrap">{program.notes}</p>
        </Panel>
      )}

      {editing && <ProgramForm program={program} onClose={() => setEditing(false)} />}
      {editReq && <RequirementForm requirement={editReq} onClose={() => setEditReq(null)} />}
      {newReqCat && (
        <RequirementForm
          requirement={{
            id: newId("r"),
            programId: program.id,
            category: newReqCat,
            title: "",
            required: "required",
            officialValue: "",
            myStatus: "not_started",
            verified: false,
            verifiedOn: null,
            deadline: null,
            documentId: null,
            evidence: "",
            sourceUrl: "",
            notes: "",
            order: Math.max(0, ...reqs.map((x) => x.order)) + 1,
          }}
          isNew
          onClose={() => setNewReqCat(null)}
        />
      )}
      {taskEdit && (
        <TaskForm
          task={
            taskEdit === "new"
              ? {
                  id: newId("t"),
                  title: "",
                  description: "",
                  programIds: [program.id],
                  category: "application",
                  priority: "medium",
                  status: "not_started",
                  startDate: null,
                  deadline: null,
                  estHours: null,
                  completedAt: null,
                  dependsOn: [],
                  requirementId: null,
                  linkAction: "none",
                  notes: "",
                  link: "",
                }
              : taskEdit
          }
          onClose={() => setTaskEdit(null)}
        />
      )}
      {srcEdit && <SourceForm source={srcEdit === "new" ? { id: newId("src"), programId: program.id, label: "", url: "", checkedOn: todayISO(), finding: "" } : srcEdit} onClose={() => setSrcEdit(null)} />}
    </div>
  );
}

function StatusChip({ label, value, tone }: { label: string; value: string; tone: "good" | "bad" | "warn" | "neutral" }) {
  return (
    <div className={`status-chip tone-${tone}`}>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ReqRow({ row, onEdit }: { row: Requirement; onEdit: () => void }) {
  const { state, patch } = useStore();
  const doc = row.documentId ? state.documents.find((d) => d.id === row.documentId) : null;
  const ds = displayStatus(row.myStatus, row.deadline);
  const unverifiedComplete = row.myStatus === "complete" && !row.verified;
  return (
    <tr className={row.required === "not_required" || row.myStatus === "not_applicable" ? "is-muted" : ""}>
      <td className="req-title">
        <strong>{row.title}</strong>
        <div className="small">{row.officialValue || <span className="muted">No official value recorded</span>}</div>
        <VerifiedMark verified={row.verified} date={row.verifiedOn} />
        <div className="row-actions req-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => patch("requirements", row.id, row.verified ? { verified: false, verifiedOn: null } : { verified: true, verifiedOn: todayISO() })}
          title={row.verified ? "Mark as needing verification" : "I confirmed this on an official source today"}
        >
          {row.verified ? "Unverify" : "Verify"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>
          Edit
        </button>
        </div>
      </td>
      <td>
        <label className="sr-only" htmlFor={`rq-req-${row.id}`}>
          Required?
        </label>
        <select id={`rq-req-${row.id}`} value={row.required} onChange={(e) => patch("requirements", row.id, { required: e.target.value as Requirement["required"] })}>
          {REQUIRED.map((x) => (
            <option key={x} value={x}>
              {REQUIRED_LABEL[x]}
            </option>
          ))}
        </select>
      </td>
      <td>
        <label className="sr-only" htmlFor={`rq-st-${row.id}`}>
          My status
        </label>
        <select id={`rq-st-${row.id}`} className={`status-select st-${row.myStatus}`} value={row.myStatus} onChange={(e) => patch("requirements", row.id, { myStatus: e.target.value as Requirement["myStatus"] })}>
          {STATUS.map((x) => (
            <option key={x} value={x}>
              {STATUS_LABEL[x]}
            </option>
          ))}
        </select>
        {ds === "overdue" && <StatusBadge status="overdue" small />}
        {unverifiedComplete && <div className="small warn-text">Not counted until verified</div>}
      </td>
      <td>
        <label className="sr-only" htmlFor={`rq-dl-${row.id}`}>
          Deadline
        </label>
        <input id={`rq-dl-${row.id}`} type="date" value={row.deadline ?? ""} onChange={(e) => patch("requirements", row.id, { deadline: e.target.value || null })} />
      </td>
      <td>
        {doc ? (
          <a href="#documents" className="small">
            {doc.name}
            <br />
            <StatusBadge status={doc.status} small />
          </a>
        ) : null}
        {row.evidence && <div className="small">{row.evidence}</div>}
        {!doc && !row.evidence && <span className="muted">—</span>}
      </td>
      <td>{row.sourceUrl ? <ExtLink href={row.sourceUrl} /> : <span className="muted">—</span>}</td>
      <td className="req-notes small">{row.notes || <span className="muted">—</span>}</td>
    </tr>
  );
}

function RequirementForm({ requirement, onClose, isNew }: { requirement: Requirement; onClose: () => void; isNew?: boolean }) {
  const { state, upsert, remove } = useStore();
  const { draft, set } = useDraft<Requirement>(requirement);
  const [errors, setErrors] = useState<FieldErrors>({});
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (draft.verified && !draft.sourceUrl) return setErrors({ sourceUrl: "Add the official source before marking this verified." });
    const r = upsert("requirements", { ...draft, verifiedOn: draft.verified ? draft.verifiedOn ?? todayISO() : null });
    if (!r.ok) return setErrors(r.errors);
    onClose();
  };
  return (
    <Modal title={isNew ? "Add requirement" : "Edit requirement"} onClose={onClose} wide>
      <form className="form-grid" onSubmit={submit}>
        <FormErrors errors={errors} />
        <TextField id="rf-title" label="Requirement" value={draft.title} onChange={set("title")} error={errors.title} className="span-2" />
        <SelectField id="rf-cat" label="Category" value={draft.category} onChange={set("category")} options={REQ_CATEGORY.map((c) => ({ value: c, label: REQ_CATEGORY_LABEL[c] }))} />
        <SelectField id="rf-req" label="Required?" value={draft.required} onChange={set("required")} options={REQUIRED.map((x) => ({ value: x, label: REQUIRED_LABEL[x] }))} />
        <TextArea id="rf-val" label="Official requirement (as published)" value={draft.officialValue} onChange={set("officialValue")} className="span-2" rows={2} />
        <TextField id="rf-src" label="Official source URL" value={draft.sourceUrl} onChange={set("sourceUrl")} error={errors.sourceUrl} className="span-2" placeholder="https://" />
        <CheckField id="rf-ver" label="Verified on an official source" checked={draft.verified} onChange={set("verified")} />
        <TextField id="rf-veron" label="Verified on" type="date" value={draft.verifiedOn ?? ""} onChange={(v) => set("verifiedOn")(v || null)} />
        <SelectField id="rf-status" label="My status" value={draft.myStatus} onChange={set("myStatus")} options={STATUS.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
        <TextField id="rf-dl" label="Deadline" type="date" value={draft.deadline ?? ""} onChange={(v) => set("deadline")(v || null)} error={errors.deadline} />
        <SelectField
          id="rf-doc"
          label="Evidence document"
          value={draft.documentId ?? ""}
          onChange={(v) => set("documentId")(v || null)}
          options={[{ value: "", label: "None" }, ...state.documents.map((d) => ({ value: d.id, label: d.name }))]}
        />
        <TextField id="rf-ev" label="Evidence note" value={draft.evidence} onChange={set("evidence")} />
        <TextArea id="rf-notes" label="Notes" value={draft.notes} onChange={set("notes")} className="span-2" />
        <div className="form-actions span-2">
          {!isNew && (
            <ConfirmButton
              onConfirm={() => {
                remove("requirements", draft.id);
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

function SourceForm({ source, onClose }: { source: Source; onClose: () => void }) {
  const { upsert, remove, state } = useStore();
  const { draft, set } = useDraft<Source>(source);
  const [errors, setErrors] = useState<FieldErrors>({});
  const exists = state.sources.some((s) => s.id === source.id);
  return (
    <Modal title={exists ? "Edit source" : "Log a source"} onClose={onClose}>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          const r = upsert("sources", draft);
          if (!r.ok) return setErrors(r.errors);
          onClose();
        }}
      >
        <TextField id="sf-label" label="What was checked" value={draft.label} onChange={set("label")} error={errors.label} className="span-2" />
        <TextField id="sf-url" label="URL" value={draft.url} onChange={set("url")} error={errors.url} className="span-2" />
        <TextField id="sf-date" label="Checked on" type="date" value={draft.checkedOn ?? ""} onChange={(v) => set("checkedOn")(v || null)} />
        <TextArea id="sf-find" label="What it said" value={draft.finding} onChange={set("finding")} className="span-2" />
        <div className="form-actions span-2">
          {exists && (
            <ConfirmButton
              onConfirm={() => {
                remove("sources", draft.id);
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
