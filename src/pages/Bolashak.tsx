import { useState } from "react";
import { useStore, type FieldErrors } from "../lib/store";
import { daysUntil, fmtDate, scholarshipProgress, todayISO } from "../lib/calc";
import { SCHOLAR_AREA, SCHOLAR_AREA_LABEL, STATUS, STATUS_LABEL, newId, type BolashakSettings, type ScholarRule } from "../lib/types";
import { CheckField, ConfirmButton, DateCell, ExtLink, FormErrors, Modal, PageHeader, Panel, Pill, Progress, SelectField, StatusBadge, TextArea, TextField, VerifiedMark } from "../components/ui";
import { shortUni, useDraft } from "../components/forms";
import { BOL_LABEL, DECISION_LABEL } from "./Universities";

const APP_STATUS: Record<BolashakSettings["applicationStatus"], string> = {
  researching: "Researching rules",
  preparing: "Preparing documents",
  submitted: "Application submitted",
  testing: "Comprehensive testing",
  interview: "Expert commission interview",
  commission: "Awaiting Republican Commission",
  awarded: "Awarded",
  not_awarded: "Not awarded",
  paused: "Paused",
};

export default function Bolashak() {
  const { state, patch } = useStore();
  const b = state.bolashak;
  const prog = scholarshipProgress(state);
  const [editSettings, setEditSettings] = useState(false);
  const [editRule, setEditRule] = useState<ScholarRule | null>(null);
  const abroad = state.programs.filter((p) => !p.archived);
  const closeDays = daysUntil(b.windowClose);

  return (
    <div className="page">
      <PageHeader title="Bolashak" sub="Scholarship workflow, kept separate from admissions. An admission offer does not guarantee a scholarship; nothing here is an official eligibility decision.">
        <button type="button" className="btn" onClick={() => setEditSettings(true)}>
          Edit application details
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setEditRule({ id: newId("s"), area: "eligibility", rule: "", officialValue: "", verified: false, lastVerified: null, sourceUrl: "", myStatus: "not_started", deadline: null, documentId: null, notes: "" })}
        >
          Add rule
        </button>
      </PageHeader>

      <div className="hero-grid">
        <div className="stat">
          <span className="stat-label">Preparation</span>
          <span className="stat-big">
            {prog.done}
            <span className="stat-of"> / {prog.total} complete & verified</span>
          </span>
          <Progress pct={prog.pct} size="sm" label="Bolashak preparation" />
        </div>
        <div className="stat">
          <span className="stat-label">Application status</span>
          <span className="stat-title">{APP_STATUS[b.applicationStatus]}</span>
          <span className="stat-sub">{b.category || "Category not set"}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Application window</span>
          {b.windowOpen || b.windowClose ? (
            <>
              <span className="stat-title">
                {fmtDate(b.windowOpen)} – {fmtDate(b.windowClose)}
              </span>
              {closeDays !== null && closeDays >= 0 && <span className="stat-sub">Closes in {closeDays} days</span>}
            </>
          ) : (
            <>
              <StatusBadge status="needs_verification" />
              <span className="stat-sub">{b.windowNote}</span>
            </>
          )}
        </div>
        <div className="stat">
          <span className="stat-label">Rules needing verification</span>
          <span className="stat-big">{prog.unverified}</span>
          <span className="stat-sub">Each rule needs a source and a last-verified date.</span>
        </div>
      </div>

      <Panel title="Your programmes and the recommended-universities list">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>University</th>
                <th>List status</th>
                <th>Offer needed</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {abroad.map((p) => (
                <tr key={p.id}>
                  <td>
                    <a href={`#program-${p.id}`}>{shortUni(state, p.id)}</a>
                  </td>
                  <td>
                    <Pill tone={p.bolashakList === "listed" ? "good" : p.bolashakList === "not_listed" ? "bad" : "warn"}>{BOL_LABEL[p.bolashakList]}</Pill>
                  </td>
                  <td className="small">{p.bolashakList === "not_applicable" ? "—" : `Unconditional · now: ${DECISION_LABEL[p.decision]}`}</td>
                  <td className="small">{p.bolashakNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {SCHOLAR_AREA.map((area) => {
        const rules = state.scholarRules.filter((r) => r.area === area);
        if (!rules.length) return null;
        return (
          <Panel key={area} title={SCHOLAR_AREA_LABEL[area]}>
            <div className="table-wrap">
              <table className="table req-table">
                <thead>
                  <tr>
                    <th>Rule</th>
                    <th>Official source</th>
                    <th>My status</th>
                    <th>Deadline</th>
                    <th>Notes</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => {
                    const doc = r.documentId ? state.documents.find((d) => d.id === r.documentId) : null;
                    return (
                      <tr key={r.id}>
                        <td className="req-title">
                          <strong>{r.rule}</strong>
                          <div className="small">{r.officialValue}</div>
                          <VerifiedMark verified={r.verified} date={r.lastVerified} />
                        </td>
                        <td>{r.sourceUrl ? <ExtLink href={r.sourceUrl} /> : <span className="muted">No source</span>}</td>
                        <td>
                          <label className="sr-only" htmlFor={`br-${r.id}`}>
                            My status
                          </label>
                          <select id={`br-${r.id}`} className={`status-select st-${r.myStatus}`} value={r.myStatus} onChange={(e) => patch("scholarRules", r.id, { myStatus: e.target.value as ScholarRule["myStatus"] })}>
                            {STATUS.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABEL[s]}
                              </option>
                            ))}
                          </select>
                          {doc && (
                            <div className="small">
                              <a href="#documents">{doc.name}</a>
                            </div>
                          )}
                        </td>
                        <td>
                          <DateCell date={r.deadline} done={r.myStatus === "complete"} />
                        </td>
                        <td className="small req-notes">{r.notes || <span className="muted">—</span>}</td>
                        <td className="row-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={!r.verified && !r.sourceUrl}
                            onClick={() => patch("scholarRules", r.id, r.verified ? { verified: false, lastVerified: null } : { verified: true, lastVerified: todayISO() })}
                          >
                            {r.verified ? "Unverify" : "Verify"}
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditRule(r)}>
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        );
      })}

      {b.notes && (
        <Panel title="Notes">
          <p className="prewrap">{b.notes}</p>
        </Panel>
      )}

      {editSettings && <SettingsForm onClose={() => setEditSettings(false)} />}
      {editRule && <RuleForm rule={editRule} onClose={() => setEditRule(null)} />}
    </div>
  );
}

function SettingsForm({ onClose }: { onClose: () => void }) {
  const { state, setSingleton } = useStore();
  const { draft, set } = useDraft<BolashakSettings>(state.bolashak);
  const [errors, setErrors] = useState<FieldErrors>({});
  return (
    <Modal title="Bolashak application" onClose={onClose}>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          const r = setSingleton("bolashak", draft);
          if (!r.ok) return setErrors(r.errors);
          onClose();
        }}
      >
        <FormErrors errors={errors} />
        <TextField id="bs-cat" label="Applicable category" value={draft.category} onChange={set("category")} className="span-2" />
        <TextField id="bs-cycle" label="Intended competition / cycle" value={draft.intendedCycle} onChange={set("intendedCycle")} className="span-2" />
        <TextField id="bs-open" label="Window opens" type="date" value={draft.windowOpen ?? ""} onChange={(v) => set("windowOpen")(v || null)} error={errors.windowOpen} />
        <TextField id="bs-close" label="Window closes" type="date" value={draft.windowClose ?? ""} onChange={(v) => set("windowClose")(v || null)} error={errors.windowClose} />
        <TextField id="bs-wnote" label="Window note / source" value={draft.windowNote} onChange={set("windowNote")} className="span-2" />
        <SelectField id="bs-status" label="Application status" value={draft.applicationStatus} onChange={set("applicationStatus")} options={Object.entries(APP_STATUS).map(([value, label]) => ({ value: value as BolashakSettings["applicationStatus"], label }))} className="span-2" />
        <TextArea id="bs-notes" label="Notes" value={draft.notes} onChange={set("notes")} className="span-2" />
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

function RuleForm({ rule, onClose }: { rule: ScholarRule; onClose: () => void }) {
  const { state, upsert, remove } = useStore();
  const { draft, set } = useDraft<ScholarRule>(rule);
  const [errors, setErrors] = useState<FieldErrors>({});
  const exists = state.scholarRules.some((r) => r.id === rule.id);
  return (
    <Modal title={exists ? "Edit rule" : "Add rule"} onClose={onClose} wide>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.verified && !draft.sourceUrl) return setErrors({ sourceUrl: "A verified rule needs its official source." });
          const r = upsert("scholarRules", { ...draft, lastVerified: draft.verified ? draft.lastVerified ?? todayISO() : draft.lastVerified });
          if (!r.ok) return setErrors(r.errors);
          onClose();
        }}
      >
        <FormErrors errors={errors} />
        <TextField id="sr-rule" label="Rule" value={draft.rule} onChange={set("rule")} error={errors.rule} className="span-2" />
        <SelectField id="sr-area" label="Area" value={draft.area} onChange={set("area")} options={SCHOLAR_AREA.map((a) => ({ value: a, label: SCHOLAR_AREA_LABEL[a] }))} />
        <SelectField id="sr-status" label="My status" value={draft.myStatus} onChange={set("myStatus")} options={STATUS.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
        <TextArea id="sr-val" label="What the official source says" value={draft.officialValue} onChange={set("officialValue")} className="span-2" />
        <TextField id="sr-src" label="Official source URL" value={draft.sourceUrl} onChange={set("sourceUrl")} error={errors.sourceUrl} className="span-2" />
        <CheckField id="sr-ver" label="Verified on the official source" checked={draft.verified} onChange={set("verified")} />
        <TextField id="sr-last" label="Last verified" type="date" value={draft.lastVerified ?? ""} onChange={(v) => set("lastVerified")(v || null)} />
        <TextField id="sr-dl" label="Deadline" type="date" value={draft.deadline ?? ""} onChange={(v) => set("deadline")(v || null)} />
        <SelectField id="sr-doc" label="Related document" value={draft.documentId ?? ""} onChange={(v) => set("documentId")(v || null)} options={[{ value: "", label: "None" }, ...state.documents.map((d) => ({ value: d.id, label: d.name }))]} />
        <TextArea id="sr-notes" label="Notes" value={draft.notes} onChange={set("notes")} className="span-2" />
        <div className="form-actions span-2">
          {exists && (
            <ConfirmButton
              onConfirm={() => {
                remove("scholarRules", rule.id);
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
