import { useMemo, useState } from "react";
import { useStore, type FieldErrors } from "../lib/store";
import { programReadiness } from "../lib/calc";
import { CURRENCIES, ProgramSchema, REQ_CATEGORY, newId, type Program, type University } from "../lib/types";
import { DateCell, Empty, FormErrors, Modal, PageHeader, Pill, Progress, SearchBox, SelectField, StatusBadge, TextArea, TextField } from "../components/ui";
import { useDraft } from "../components/forms";

export const FIT_LABEL = { stronger: "Stronger fit", ambitious: "Competitive / ambitious", unclear: "Unclear pending verification" } as const;
export const SUBMISSION_LABEL = { not_started: "Not started", in_progress: "In progress", submitted: "Submitted", withdrawn: "Withdrawn" } as const;
export const DECISION_LABEL = {
  none: "No decision yet",
  pending: "Under review",
  conditional_offer: "Conditional offer",
  unconditional_offer: "Unconditional offer",
  waitlisted: "Waitlisted",
  rejected: "Rejected",
  accepted: "Offer accepted",
  declined: "Offer declined",
} as const;
export const ELIG_LABEL = { meets: "Meets published minimum", borderline: "Borderline", below: "Below published minimum", unknown: "Unknown" } as const;
export const BOL_LABEL = { listed: "On Bolashak list", listed_check: "Listed — check category", not_listed: "Not on list", not_applicable: "Not applicable", unknown: "Needs verification" } as const;

export default function Universities() {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [adding, setAdding] = useState(false);

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = state.programs.filter((p) => (showArchived ? true : !p.archived));
    const map = new Map<string, { u: University; ps: Program[] }[]>();
    for (const u of state.universities) {
      const ps = list.filter((p) => p.universityId === u.id && (!query || `${u.name} ${u.city} ${u.country} ${p.name}`.toLowerCase().includes(query)));
      if (!ps.length) continue;
      const arr = map.get(u.country) ?? [];
      arr.push({ u, ps });
      map.set(u.country, arr);
    }
    const order = ["United States", "United Kingdom", "Kazakhstan"];
    return [...map.entries()].sort((a, b) => (order.indexOf(a[0]) + 99) % 100 - (order.indexOf(b[0]) + 99) % 100);
  }, [state, q, showArchived]);

  return (
    <div className="page">
      <PageHeader title="Universities" sub="Preliminary shortlist. Open a programme to edit its record and requirements checklist.">
        <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
          Add programme
        </button>
      </PageHeader>
      <div className="toolbar">
        <SearchBox id="uni-search" value={q} onChange={setQ} placeholder="Search universities or programmes" />
        <label className="check-inline" htmlFor="uni-arch">
          <input id="uni-arch" type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived
        </label>
      </div>
      {groups.length === 0 && <Empty title="No programmes match">Clear the search or add a programme.</Empty>}
      {groups.map(([country, items]) => (
        <section key={country} className="country-group">
          <h2 className="group-title">{country}</h2>
          <div className="card-grid">
            {items.flatMap(({ u, ps }) =>
              ps.map((p) => {
                const r = programReadiness(state, p.id);
                return (
                  <a key={p.id} className={`uni-card${p.archived ? " is-archived" : ""}`} href={`#program-${p.id}`}>
                    <div className="uni-card-head">
                      <div>
                        <strong className="uni-name">{u.name}</strong>
                        <span className="small muted">{u.city}</span>
                      </div>
                      <Pill tone={p.fit === "stronger" ? "good" : p.fit === "ambitious" ? "warn" : "neutral"}>{FIT_LABEL[p.fit]}</Pill>
                    </div>
                    <div className="uni-prog">{p.name}</div>
                    <div className="small muted">{p.intake}</div>
                    <Progress pct={r.pct} size="sm" label={`${u.name} readiness`} />
                    <dl className="kv">
                      <dt>Deadline</dt>
                      <dd>{p.deadline ? <DateCell date={p.deadline} done={p.submission === "submitted"} /> : <StatusBadge status="needs_verification" small />}</dd>
                      <dt>IELTS</dt>
                      <dd className="clamp">{p.ieltsReq || "—"}</dd>
                      <dt>Status</dt>
                      <dd>
                        {SUBMISSION_LABEL[p.submission]} · {DECISION_LABEL[p.decision]}
                      </dd>
                      <dt>Bolashak</dt>
                      <dd>{BOL_LABEL[p.bolashakList]}</dd>
                    </dl>
                    {r.unverified > 0 && <div className="small warn-text">{r.unverified} requirement rows need verification</div>}
                  </a>
                );
              }),
            )}
          </div>
        </section>
      ))}
      {adding && <AddProgram onClose={() => setAdding(false)} />}
    </div>
  );
}

/** Creates a university (or reuses one) plus a programme with a blank standard checklist. */
function AddProgram({ onClose }: { onClose: () => void }) {
  const { state, mutate } = useStore();
  const { draft, set } = useDraft({ universityId: "__new", uniName: "", country: "", city: "", program: "", intake: "September 2027" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: FieldErrors = {};
    if (draft.universityId === "__new" && !draft.uniName.trim()) errs.uniName = "University name is required";
    if (draft.universityId === "__new" && !draft.country.trim()) errs.country = "Country is required";
    if (!draft.program.trim()) errs.program = "Programme name is required";
    if (Object.keys(errs).length) return setErrors(errs);
    const uid = draft.universityId === "__new" ? newId("u") : draft.universityId;
    const pid = newId("p");
    const program = ProgramSchema.parse({ id: pid, universityId: uid, name: draft.program.trim(), intake: draft.intake, fit: "unclear" });
    const blankReq = (cat: (typeof REQ_CATEGORY)[number], title: string, i: number) => ({
      id: newId("r"),
      programId: pid,
      category: cat,
      title,
      required: "unknown" as const,
      officialValue: "Needs verification",
      myStatus: "not_started" as const,
      verified: false,
      verifiedOn: null,
      deadline: null,
      documentId: null,
      evidence: "",
      sourceUrl: "",
      notes: "",
      order: 10_000 + i,
    });
    const titles: [(typeof REQ_CATEGORY)[number], string][] = [
      ["academic", "Bachelor's degree eligibility"],
      ["academic", "Minimum GPA or degree classification"],
      ["academic", "Relevant undergraduate courses"],
      ["academic", "Mathematics prerequisites"],
      ["academic", "Programming prerequisites"],
      ["english", "IELTS Academic overall minimum"],
      ["english", "Minimum score for each component"],
      ["english", "Can IELTS be submitted after applying?"],
      ["materials", "Official transcript"],
      ["materials", "CV / résumé"],
      ["materials", "Statement of Purpose"],
      ["materials", "Recommendation letters"],
      ["materials", "Application fee"],
      ["financial", "Tuition estimate"],
      ["financial", "Funding & assistantships"],
      ["financial", "Bolashak list & documentation"],
    ];
    mutate((s) => ({
      ...s,
      universities: draft.universityId === "__new" ? [...s.universities, { id: uid, name: draft.uniName.trim(), country: draft.country.trim(), city: draft.city.trim(), website: "", notes: "" }] : s.universities,
      programs: [...s.programs, program],
      requirements: [...s.requirements, ...titles.map(([c, t], i) => blankReq(c, t, i))],
    }));
    onClose();
    window.location.hash = `program-${pid}`;
  };
  return (
    <Modal title="Add a programme" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <SelectField
          id="ap-uni"
          label="University"
          className="span-2"
          value={draft.universityId}
          onChange={set("universityId")}
          options={[{ value: "__new", label: "New university…" }, ...state.universities.map((u) => ({ value: u.id, label: u.name }))]}
        />
        {draft.universityId === "__new" && (
          <>
            <TextField id="ap-name" label="University name" value={draft.uniName} onChange={set("uniName")} error={errors.uniName} className="span-2" />
            <TextField id="ap-country" label="Country" value={draft.country} onChange={set("country")} error={errors.country} />
            <TextField id="ap-city" label="City" value={draft.city} onChange={set("city")} />
          </>
        )}
        <TextField id="ap-prog" label="Exact programme name" value={draft.program} onChange={set("program")} error={errors.program} className="span-2" />
        <TextField id="ap-intake" label="Intended intake" value={draft.intake} onChange={set("intake")} className="span-2" />
        <p className="small muted span-2">A standard requirements checklist is created with every row marked Needs verification.</p>
        <div className="form-actions span-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Programme record editor (used on the programme page)                */
/* ------------------------------------------------------------------ */

export function ProgramForm({ program, onClose }: { program: Program; onClose: () => void }) {
  const { state, upsert, patch } = useStore();
  const uni = state.universities.find((u) => u.id === program.universityId)!;
  const { draft, set } = useDraft<Program>(program);
  const u = useDraft<University>(uni);
  const [errors, setErrors] = useState<FieldErrors>({});
  const curOpts = CURRENCIES.map((c) => ({ value: c, label: c }));
  const num = (v: string) => (v === "" ? null : Number(v));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const ru = patch("universities", uni.id, u.draft);
    if (!ru.ok) return setErrors(Object.fromEntries(Object.entries(ru.errors).map(([k, v]) => [`u.${k}`, v])));
    const r = upsert("programs", draft);
    if (!r.ok) return setErrors(r.errors);
    onClose();
  };

  return (
    <Modal title={`Edit ${uni.name}`} onClose={onClose} wide>
      <form className="form-grid" onSubmit={submit}>
        <FormErrors errors={errors} />
        <h3 className="span-2 form-section">University</h3>
        <TextField id="pf-uname" label="University name" value={u.draft.name} onChange={u.set("name")} error={errors["u.name"]} />
        <TextField id="pf-country" label="Country" value={u.draft.country} onChange={u.set("country")} error={errors["u.country"]} />
        <TextField id="pf-city" label="City" value={u.draft.city} onChange={u.set("city")} />
        <TextField id="pf-site" label="Website" value={u.draft.website} onChange={u.set("website")} error={errors["u.website"]} />

        <h3 className="span-2 form-section">Programme</h3>
        <TextField id="pf-name" label="Exact degree / programme name" value={draft.name} onChange={set("name")} error={errors.name} className="span-2" />
        <TextField id="pf-purl" label="Official programme URL" value={draft.programUrl} onChange={set("programUrl")} error={errors.programUrl} />
        <TextField id="pf-aurl" label="Official admissions URL" value={draft.admissionsUrl} onChange={set("admissionsUrl")} error={errors.admissionsUrl} />
        <TextField id="pf-intake" label="Intended intake" value={draft.intake} onChange={set("intake")} />
        <TextField id="pf-dur" label="Duration / format" value={draft.duration} onChange={set("duration")} />

        <h3 className="span-2 form-section">Dates</h3>
        <TextField id="pf-open" label="Application opening date" type="date" value={draft.openingDate ?? ""} onChange={(v) => set("openingDate")(v || null)} error={errors.openingDate} />
        <TextField id="pf-opennote" label="Opening note" value={draft.openingNote} onChange={set("openingNote")} />
        <TextField id="pf-dl" label="Official application deadline" type="date" value={draft.deadline ?? ""} onChange={(v) => set("deadline")(v || null)} error={errors.deadline} />
        <SelectField
          id="pf-dltype"
          label="Deadline type"
          value={draft.deadlineType}
          onChange={set("deadlineType")}
          options={[
            { value: "final", label: "Final" },
            { value: "priority", label: "Priority" },
            { value: "rolling", label: "Rolling" },
            { value: "staged", label: "Staged rounds" },
            { value: "unknown", label: "Unknown — needs verification" },
          ]}
        />
        <TextArea id="pf-dlnote" label="Deadline details" value={draft.deadlineNote} onChange={set("deadlineNote")} className="span-2" rows={2} />
        <TextField id="pf-target" label="My internal target submission date" type="date" value={draft.targetDate ?? ""} onChange={(v) => set("targetDate")(v || null)} error={errors.targetDate} />
        <TextField id="pf-reviewed" label="Record last reviewed" type="date" value={draft.lastReviewed ?? ""} onChange={(v) => set("lastReviewed")(v || null)} />

        <h3 className="span-2 form-section">Costs</h3>
        <TextField id="pf-fee" label="Application fee" type="number" inputMode="decimal" value={draft.appFee ?? ""} onChange={(v) => set("appFee")(num(v))} error={errors.appFee} />
        <SelectField id="pf-feecur" label="Fee currency" value={draft.appFeeCurrency} onChange={set("appFeeCurrency")} options={curOpts} />
        <TextField id="pf-feenote" label="Fee note" value={draft.appFeeNote} onChange={set("appFeeNote")} className="span-2" />
        <TextField id="pf-tuition" label="Tuition per year" type="number" inputMode="decimal" value={draft.tuition ?? ""} onChange={(v) => set("tuition")(num(v))} error={errors.tuition} />
        <SelectField id="pf-tuitcur" label="Tuition currency" value={draft.tuitionCurrency} onChange={set("tuitionCurrency")} options={curOpts} />
        <TextField id="pf-tuitnote" label="Tuition note" value={draft.tuitionNote} onChange={set("tuitionNote")} className="span-2" />
        <TextField id="pf-living" label={`Living estimate per year (${draft.tuitionCurrency})`} type="number" inputMode="decimal" value={draft.livingEstimate ?? ""} onChange={(v) => set("livingEstimate")(num(v))} />

        <h3 className="span-2 form-section">Requirements summary</h3>
        <TextArea id="pf-ielts" label="IELTS requirements" value={draft.ieltsReq} onChange={set("ieltsReq")} rows={2} />
        <TextArea id="pf-gpa" label="GPA / degree classification" value={draft.gpaReq} onChange={set("gpaReq")} rows={2} />
        <TextArea id="pf-prereq" label="Academic prerequisites" value={draft.prerequisites} onChange={set("prerequisites")} rows={2} />
        <TextArea id="pf-gre" label="GRE / GMAT" value={draft.greReq} onChange={set("greReq")} rows={2} />
        <TextArea id="pf-docs" label="Required documents" value={draft.documentsReq} onChange={set("documentsReq")} rows={2} />
        <TextArea id="pf-lor" label="Recommendation letters" value={draft.lorReq} onChange={set("lorReq")} rows={2} />
        <TextArea id="pf-sop" label="Statement of Purpose / personal statement" value={draft.sopReq} onChange={set("sopReq")} rows={2} />
        <TextArea id="pf-cv" label="CV / résumé" value={draft.cvReq} onChange={set("cvReq")} rows={2} />
        <TextField id="pf-wl" label="SOP word limit" type="number" inputMode="numeric" value={draft.sopWordLimit ?? ""} onChange={(v) => set("sopWordLimit")(v === "" ? null : Number(v))} />
        <TextArea id="pf-fund" label="Funding opportunities" value={draft.funding} onChange={set("funding")} rows={2} />

        <h3 className="span-2 form-section">Strategy & status</h3>
        <SelectField id="pf-fit" label="Classification" value={draft.fit} onChange={set("fit")} options={Object.entries(FIT_LABEL).map(([value, label]) => ({ value: value as Program["fit"], label }))} />
        <TextField id="pf-fitscore" label="Programme fit for ML/SWE (0–5, my judgement)" type="number" inputMode="numeric" value={draft.fitScore} onChange={(v) => set("fitScore")(Math.max(0, Math.min(5, Number(v) || 0)))} />
        <TextArea id="pf-fitev" label="Evidence for the classification" value={draft.fitEvidence} onChange={set("fitEvidence")} className="span-2" rows={3} />
        <SelectField id="pf-elig" label="Academic eligibility" value={draft.eligibility} onChange={set("eligibility")} options={Object.entries(ELIG_LABEL).map(([value, label]) => ({ value: value as Program["eligibility"], label }))} />
        <TextField id="pf-elignote" label="Eligibility note" value={draft.eligibilityNote} onChange={set("eligibilityNote")} />
        <SelectField id="pf-sub" label="Admissions submission" value={draft.submission} onChange={set("submission")} options={Object.entries(SUBMISSION_LABEL).map(([value, label]) => ({ value: value as Program["submission"], label }))} />
        <TextField id="pf-subon" label="Submitted on" type="date" value={draft.submittedOn ?? ""} onChange={(v) => set("submittedOn")(v || null)} />
        <SelectField id="pf-dec" label="Admission decision" value={draft.decision} onChange={set("decision")} options={Object.entries(DECISION_LABEL).map(([value, label]) => ({ value: value as Program["decision"], label }))} />
        <TextField id="pf-decon" label="Decision date" type="date" value={draft.decisionOn ?? ""} onChange={(v) => set("decisionOn")(v || null)} />
        <SelectField id="pf-bol" label="Bolashak list status" value={draft.bolashakList} onChange={set("bolashakList")} options={Object.entries(BOL_LABEL).map(([value, label]) => ({ value: value as Program["bolashakList"], label }))} />
        <TextField id="pf-bolnote" label="Bolashak note" value={draft.bolashakNote} onChange={set("bolashakNote")} />
        <TextField id="pf-portal" label="Application portal link" value={draft.portalUrl} onChange={set("portalUrl")} error={errors.portalUrl} className="span-2" />
        <TextArea id="pf-notes" label="Notes" value={draft.notes} onChange={set("notes")} className="span-2" />
        <div className="form-actions span-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save record
          </button>
        </div>
      </form>
    </Modal>
  );
}
