import { useMemo, useRef, useState } from "react";
import { useStore, type FieldErrors } from "../lib/store";
import { addDays, fmtDate, programsRequiringDoc, todayISO } from "../lib/calc";
import { DOC_CATEGORY, DOC_CATEGORY_LABEL, STATUS, STATUS_LABEL, newId, type Doc } from "../lib/types";
import { CheckField, ConfirmButton, Empty, ExtLink, FormErrors, Modal, MultiCheck, PageHeader, Panel, Pill, SearchBox, SelectField, TextArea, TextField } from "../components/ui";
import { programOptions, shortUni, useDraft } from "../components/forms";
import { FilterSelect } from "./Tasks";

export function submissionState(doc: Doc, programId: string): { label: string; tone: "good" | "warn" | "bad" | "neutral" } {
  const sub = doc.submissions.find((s) => s.programId === programId);
  if (!sub) return { label: "Not submitted", tone: "neutral" };
  if (doc.versions.length && doc.finalVersionId && sub.versionId !== doc.finalVersionId) return { label: "Older version submitted", tone: "bad" };
  return { label: `Submitted${sub.submittedOn ? ` ${fmtDate(sub.submittedOn, false)}` : ""}`, tone: "good" };
}

export default function Documents() {
  const { state, patch } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<Doc | "new" | null>(null);

  const docs = useMemo(
    () =>
      state.documents.filter(
        (d) =>
          (!cat || d.category === cat) &&
          (!status || d.status === status) &&
          (!q || `${d.name} ${d.notes} ${d.language}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [state.documents, q, cat, status],
  );
  const soon = addDays(todayISO(), 180);

  return (
    <div className="page">
      <PageHeader title="Documents" sub="What each application needs, what is ready, and which version went where.">
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
          Add document
        </button>
      </PageHeader>

      <div className="banner banner-info">
        <strong>Keep sensitive data out of notes.</strong> Do not type passport or ID numbers here; store only expiry dates. Files you attach are stored with this page:
        private to you unless you share the page with editors. For passport scans, prefer a file path on your own computer.
      </div>

      <Panel>
        <div className="toolbar">
          <SearchBox id="doc-q" value={q} onChange={setQ} placeholder="Search documents" />
          <FilterSelect id="doc-cat" label="Category" value={cat} onChange={setCat} options={[{ value: "", label: "All categories" }, ...DOC_CATEGORY.map((c) => ({ value: c, label: DOC_CATEGORY_LABEL[c] }))]} />
          <FilterSelect id="doc-st" label="Status" value={status} onChange={setStatus} options={[{ value: "", label: "Any status" }, ...STATUS.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]} />
        </div>
        {docs.length === 0 ? (
          <Empty title="No documents match" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Status</th>
                  <th>Dates</th>
                  <th>Language / translation</th>
                  <th>Required by → submitted?</th>
                  <th>File</th>
                  <th>
                    <span className="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => {
                  const req = programsRequiringDoc(state, d.id);
                  const expired = d.expiryDate && d.expiryDate < todayISO();
                  return (
                    <tr key={d.id} className={d.status === "not_applicable" ? "is-muted" : ""}>
                      <td>
                        <strong>{d.name}</strong>
                        <div className="small muted">{DOC_CATEGORY_LABEL[d.category]}</div>
                        {d.versions.length > 0 && (
                          <a className="small" href="#workspace">
                            {d.versions.length} version{d.versions.length > 1 ? "s" : ""}
                            {d.finalVersionId ? " · final chosen" : ""}
                          </a>
                        )}
                      </td>
                      <td>
                        <label className="sr-only" htmlFor={`ds-${d.id}`}>
                          Status of {d.name}
                        </label>
                        <select id={`ds-${d.id}`} className={`status-select st-${d.status}`} value={d.status} onChange={(e) => patch("documents", d.id, { status: e.target.value as Doc["status"] })}>
                          {STATUS.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="small">
                        {d.issueDate && <div>Issued {fmtDate(d.issueDate)}</div>}
                        {d.expiryDate && (
                          <div className={expired ? "bad-text" : d.expiryDate < soon ? "warn-text" : ""}>
                            {expired ? "Expired " : "Expires "}
                            {fmtDate(d.expiryDate)}
                          </div>
                        )}
                        {!d.issueDate && !d.expiryDate && <span className="muted">—</span>}
                      </td>
                      <td className="small">
                        {d.language || "—"}
                        {(d.translationRequired || d.notarizationRequired) && (
                          <div>
                            {d.translationRequired && <Pill tone="warn">Translation</Pill>} {d.notarizationRequired && <Pill tone="warn">Notarization</Pill>}
                          </div>
                        )}
                      </td>
                      <td>
                        {req.length === 0 ? (
                          <span className="muted small">Not linked to a requirement</span>
                        ) : (
                          <ul className="req-by">
                            {req.map((p) => {
                              const s = submissionState(d, p.id);
                              return (
                                <li key={p.id}>
                                  <span>{shortUni(state, p.id)}</span> <Pill tone={s.tone}>{s.label}</Pill>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </td>
                      <td className="small">
                        <FileCell doc={d} />
                      </td>
                      <td>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(d)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {editing && <DocForm doc={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function FileCell({ doc }: { doc: Doc }) {
  const { backend } = useStore();
  if (doc.assetId && backend?.files)
    return (
      <a href={backend.files.url(doc.assetId)} target="_blank" rel="noopener noreferrer">
        {doc.assetName || "Attached file"} ↗
      </a>
    );
  if (doc.assetId) return <span className="muted">{doc.assetName || "Attached file"} (open in claude.ai)</span>;
  if (doc.fileLink) return <ExtLink href={doc.fileLink}>Linked file</ExtLink>;
  if (doc.filePath) return <code className="path">{doc.filePath}</code>;
  return <span className="muted">—</span>;
}

function DocForm({ doc, onClose }: { doc?: Doc; onClose: () => void }) {
  const { state, upsert, remove, backend } = useStore();
  const blank: Doc = {
    id: newId("d"),
    name: "",
    category: "other",
    status: "not_started",
    issueDate: null,
    expiryDate: null,
    language: "English",
    translationRequired: false,
    notarizationRequired: false,
    translationNote: "",
    programIds: [],
    filePath: "",
    fileLink: "",
    assetId: "",
    assetName: "",
    notes: "",
    versions: [],
    finalVersionId: null,
    submissions: [],
  };
  const { draft, set, setDraft } = useDraft<Doc>(doc ?? blank);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const linkedBy = doc ? programsRequiringDoc(state, doc.id).map((p) => p.id) : [];
  const relevant = Array.from(new Set([...linkedBy, ...draft.programIds]));

  const upload = async (f: File) => {
    if (!backend?.files) return;
    if (f.size > 20 * 1024 * 1024) return setErrors({ file: "Files must be 20 MB or smaller." });
    if (!/^(application\/pdf|image\/|text\/)/.test(f.type)) return setErrors({ file: "Attach a PDF, image or text file. For Word files, save as PDF first or store a file path." });
    setUploading(true);
    try {
      const r = await backend.files.upload(f);
      setDraft((d) => ({ ...d, assetId: r.id, assetName: f.name }));
      setErrors({});
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      setErrors({ file: code === "quota_exceeded" ? "Storage is full. Remove an old file first." : "Upload failed. Try again, or store a file path instead." });
    } finally {
      setUploading(false);
    }
  };

  const setSubmission = (programId: string, patchObj: { versionId?: string | null; submittedOn?: string | null; remove?: boolean }) => {
    setDraft((d) => {
      const others = d.submissions.filter((s) => s.programId !== programId);
      if (patchObj.remove) return { ...d, submissions: others };
      const cur = d.submissions.find((s) => s.programId === programId) ?? { programId, versionId: d.finalVersionId, submittedOn: todayISO() };
      return { ...d, submissions: [...others, { ...cur, ...patchObj }] };
    });
  };

  return (
    <Modal title={doc ? `Edit ${doc.name}` : "Add document"} onClose={onClose} wide>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          if (/\b[A-Z]?\d{8,9}\b/.test(draft.notes)) return setErrors({ notes: "This looks like an ID or passport number. Remove it; store only what you need." });
          const r = upsert("documents", draft);
          if (!r.ok) return setErrors(r.errors);
          onClose();
        }}
      >
        <FormErrors errors={errors} />
        <TextField id="df-name" label="Document name" value={draft.name} onChange={set("name")} error={errors.name} className="span-2" />
        <SelectField id="df-cat" label="Category" value={draft.category} onChange={set("category")} options={DOC_CATEGORY.map((c) => ({ value: c, label: DOC_CATEGORY_LABEL[c] }))} />
        <SelectField id="df-status" label="Status" value={draft.status} onChange={set("status")} options={STATUS.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
        <TextField id="df-issue" label="Issue date" type="date" value={draft.issueDate ?? ""} onChange={(v) => set("issueDate")(v || null)} error={errors.issueDate} />
        <TextField id="df-exp" label="Expiry date (if any)" type="date" value={draft.expiryDate ?? ""} onChange={(v) => set("expiryDate")(v || null)} error={errors.expiryDate} />
        <TextField id="df-lang" label="Language" value={draft.language} onChange={set("language")} />
        <div className="field">
          <span className="field-label">Formalities</span>
          <CheckField id="df-tr" label="Translation required" checked={draft.translationRequired} onChange={set("translationRequired")} />
          <CheckField id="df-no" label="Notarization required" checked={draft.notarizationRequired} onChange={set("notarizationRequired")} />
        </div>
        <TextField id="df-trn" label="Translation / notarization details" value={draft.translationNote} onChange={set("translationNote")} className="span-2" />
        <MultiCheck id="df-progs" label="Also needed by (beyond linked requirements)" options={programOptions(state)} value={draft.programIds} onChange={set("programIds")} />
        {linkedBy.length > 0 && <p className="small muted span-2">Linked from requirement rows of: {linkedBy.map((p) => shortUni(state, p)).join(", ")}.</p>}

        <h3 className="span-2 form-section">File</h3>
        {backend?.files ? (
          <div className="field span-2">
            <span className="field-label">Attached file</span>
            <div className="row">
              {draft.assetId ? (
                <>
                  <a href={backend.files.url(draft.assetId)} target="_blank" rel="noopener noreferrer">
                    {draft.assetName || "Attached file"} ↗
                  </a>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft((d) => ({ ...d, assetId: "", assetName: "" }))}>
                    Detach
                  </button>
                </>
              ) : (
                <span className="muted">None</span>
              )}
              <button type="button" className="btn btn-sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? "Uploading…" : draft.assetId ? "Replace file" : "Attach PDF or image"}
              </button>
              <input ref={fileRef} type="file" hidden accept="application/pdf,image/*,text/plain" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </div>
            {errors.file && <div className="field-error">{errors.file}</div>}
            <div className="field-hint">Up to 20 MB. Stored privately with this page; anyone you add as an editor could open it.</div>
          </div>
        ) : (
          <p className="small muted span-2">File attachments are available when this page is opened in claude.ai as its owner. You can still record where the file lives.</p>
        )}
        <TextField id="df-path" label="File path on my computer" value={draft.filePath} onChange={set("filePath")} placeholder="e.g. ~/Documents/Applications/transcript_en.pdf" />
        <TextField id="df-link" label="Link (Drive, OneDrive…)" value={draft.fileLink} onChange={set("fileLink")} error={errors.fileLink} />

        {relevant.length > 0 && (
          <>
            <h3 className="span-2 form-section">Submissions</h3>
            <div className="span-2 sub-table">
              {relevant.map((pid) => {
                const sub = draft.submissions.find((s) => s.programId === pid);
                return (
                  <div key={pid} className="sub-row">
                    <strong>{shortUni(state, pid)}</strong>
                    {sub ? (
                      <>
                        {draft.versions.length > 0 && (
                          <select aria-label={`Version submitted to ${shortUni(state, pid)}`} value={sub.versionId ?? ""} onChange={(e) => setSubmission(pid, { versionId: e.target.value || null })}>
                            <option value="">Unknown version</option>
                            {draft.versions.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.label}
                                {v.id === draft.finalVersionId ? " (final)" : ""}
                              </option>
                            ))}
                          </select>
                        )}
                        <input type="date" aria-label={`Submission date for ${shortUni(state, pid)}`} value={sub.submittedOn ?? ""} onChange={(e) => setSubmission(pid, { submittedOn: e.target.value || null })} />
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSubmission(pid, { remove: true })}>
                          Undo
                        </button>
                      </>
                    ) : (
                      <button type="button" className="btn btn-sm" onClick={() => setSubmission(pid, {})}>
                        Mark submitted
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <TextArea id="df-notes" label="Notes" value={draft.notes} onChange={set("notes")} error={errors.notes} className="span-2" />
        <div className="form-actions span-2">
          {doc && (
            <ConfirmButton
              onConfirm={() => {
                remove("documents", doc.id);
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
