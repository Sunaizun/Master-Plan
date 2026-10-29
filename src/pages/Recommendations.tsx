import { useState } from "react";
import { useStore, type FieldErrors } from "../lib/store";
import { addDays, daysUntil, fmtDate, todayISO } from "../lib/calc";
import { REC_STATUS, REC_STATUS_LABEL, newId, type RecRequest, type Recommender } from "../lib/types";
import { ConfirmButton, CopyBox, DateCell, Empty, Modal, PageHeader, Panel, Pill, SelectField, TextArea, TextField } from "../components/ui";
import { programOptions, shortUni, useDraft } from "../components/forms";

const DONE = new Set(["submitted", "confirmed", "declined"]);

export default function Recommendations() {
  const { state, patch } = useStore();
  const [editRec, setEditRec] = useState<Recommender | "new" | null>(null);
  const [editReq, setEditReq] = useState<RecRequest | null>(null);
  const [draftFor, setDraftFor] = useState<{ rec: Recommender; kind: "request" | "reminder" | "thanks" } | null>(null);

  return (
    <div className="page">
      <PageHeader title="Recommendations" sub="Who is writing for which programme, and when to follow up. Message drafts are suggestions for you to edit and send yourself; nothing is sent automatically.">
        <button type="button" className="btn btn-primary" onClick={() => setEditRec("new")}>
          Add recommender
        </button>
      </PageHeader>

      {state.recommenders.length === 0 && <Empty title="No recommenders yet">Add the people you plan to ask.</Empty>}

      {state.recommenders.map((rec) => {
        const reqs = state.recRequests.filter((r) => r.recommenderId === rec.id);
        const open = reqs.filter((r) => !DONE.has(r.status));
        const nextDl = open.map((r) => r.deadline).filter(Boolean).sort()[0] ?? null;
        const needsFollowUp = open.some((r) => r.followUpDate && r.followUpDate <= todayISO());
        return (
          <Panel
            key={rec.id}
            title={
              <span>
                {rec.name}
                {rec.notes.startsWith("Placeholder") && <Pill tone="warn"> Placeholder</Pill>}
              </span>
            }
            action={
              <div className="row">
                <button type="button" className="btn btn-sm" onClick={() => setDraftFor({ rec, kind: "request" })}>
                  Draft request
                </button>
                <button type="button" className="btn btn-sm" onClick={() => setDraftFor({ rec, kind: "reminder" })}>
                  Draft reminder
                </button>
                <button type="button" className="btn btn-sm" onClick={() => setDraftFor({ rec, kind: "thanks" })}>
                  Draft thank-you
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditRec(rec)}>
                  Edit
                </button>
              </div>
            }
          >
            <div className="rec-head">
              <div className="small">
                {[rec.position, rec.institution].filter(Boolean).join(", ") || "Position not set"}
                {rec.relationship && <div className="muted">{rec.relationship}</div>}
                {(rec.email || rec.phone) && (
                  <div className="muted">
                    {rec.email} {rec.phone}
                  </div>
                )}
              </div>
              <div className="row-wrap">
                <Pill tone="neutral">{open.length} open</Pill>
                {nextDl && <Pill tone={daysUntil(nextDl)! <= 14 ? "warn" : "neutral"}>Next due {fmtDate(nextDl, false)}</Pill>}
                {needsFollowUp && <Pill tone="bad">Follow up now</Pill>}
              </div>
            </div>
            {reqs.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>University</th>
                      <th>Status</th>
                      <th>Requested</th>
                      <th>Deadline</th>
                      <th>Follow up</th>
                      <th>Confirmed</th>
                      <th>
                        <span className="sr-only">Edit</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reqs.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <a href={`#program-${r.programId}`}>{shortUni(state, r.programId)}</a>
                        </td>
                        <td>
                          <label className="sr-only" htmlFor={`rs-${r.id}`}>
                            Status
                          </label>
                          <select
                            id={`rs-${r.id}`}
                            value={r.status}
                            onChange={(e) => {
                              const status = e.target.value as RecRequest["status"];
                              patch("recRequests", r.id, {
                                status,
                                requestDate: status === "requested" && !r.requestDate ? todayISO() : r.requestDate,
                                followUpDate: status === "requested" && !r.followUpDate ? suggestFollowUp(r.deadline) : r.followUpDate,
                                confirmedOn: status === "confirmed" && !r.confirmedOn ? todayISO() : r.confirmedOn,
                              });
                            }}
                          >
                            {REC_STATUS.map((s) => (
                              <option key={s} value={s}>
                                {REC_STATUS_LABEL[s]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="mono small">{fmtDate(r.requestDate)}</td>
                        <td>
                          <DateCell date={r.deadline} done={DONE.has(r.status)} />
                        </td>
                        <td>
                          <DateCell date={r.followUpDate} done={DONE.has(r.status)} />
                        </td>
                        <td className="small">{r.confirmedOn ? fmtDate(r.confirmedOn) : <span className="muted">—</span>}</td>
                        <td>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditReq(r)}>
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="small muted">No universities assigned yet.</p>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() =>
                setEditReq({ id: newId("rr"), recommenderId: rec.id, programId: state.programs.find((p) => !p.archived)?.id ?? "", status: "not_requested", requestDate: null, deadline: null, followUpDate: null, confirmedOn: null, notes: "" })
              }
            >
              + Assign a university
            </button>
          </Panel>
        );
      })}

      {editRec && <RecForm rec={editRec === "new" ? undefined : editRec} onClose={() => setEditRec(null)} />}
      {editReq && <ReqForm req={editReq} onClose={() => setEditReq(null)} />}
      {draftFor && <MessageDraft rec={draftFor.rec} kind={draftFor.kind} onClose={() => setDraftFor(null)} />}
    </div>
  );
}

/** Follow up ~10 days before the deadline, but never earlier than 7 days from today. */
function suggestFollowUp(deadline: string | null): string {
  const t = todayISO();
  if (!deadline) return addDays(t, 14);
  const d = addDays(deadline, -10);
  return d > addDays(t, 7) ? d : addDays(t, Math.max(1, Math.min(7, (daysUntil(deadline) ?? 7) - 2)));
}

function MessageDraft({ rec, kind, onClose }: { rec: Recommender; kind: "request" | "reminder" | "thanks"; onClose: () => void }) {
  const { state } = useStore();
  const reqs = state.recRequests.filter((r) => r.recommenderId === rec.id && (kind === "thanks" ? DONE.has(r.status) && r.status !== "declined" : !DONE.has(r.status)));
  const list = reqs.map((r) => `• ${shortUni(state, r.programId)} — ${state.programs.find((p) => p.id === r.programId)?.name ?? ""}${r.deadline ? ` (by ${fmtDate(r.deadline)})` : ""}`).join("\n");
  const first = rec.name.includes("(") ? "[Name]" : rec.name;
  const me = state.profile.fullName || "[Your name]";
  const text =
    kind === "request"
      ? `Dear ${first},\n\nI hope you are well. I am applying for master's programmes in machine learning and computer science for September 2027, and I would be very grateful if you would consider writing a recommendation letter for me.\n\nThe programmes and their deadlines are:\n${list || "• [programme — deadline]"}\n\nI can send my CV, transcript and a draft statement of purpose, plus a short summary of the work I did in your course. If it is easier, I am happy to meet to discuss.\n\nThank you for considering this. I understand if your schedule does not allow it.\n\nKind regards,\n${me}`
      : kind === "reminder"
        ? `Dear ${first},\n\nI hope your week is going well. A gentle reminder about the recommendation letter you kindly agreed to write. The upcoming deadlines are:\n${list || "• [programme — deadline]"}\n\nIf anything would help — my CV, a summary of my projects, or the submission links again — please let me know.\n\nThank you again for your support.\n\nKind regards,\n${me}`
        : `Dear ${first},\n\nThank you very much for writing my recommendation letter${reqs.length ? ` for ${reqs.map((r) => shortUni(state, r.programId)).join(", ")}` : ""}. I truly appreciate the time you took. I will let you know the outcome of my applications.\n\nWith gratitude,\n${me}`;
  return (
    <Modal title={kind === "request" ? "Request draft" : kind === "reminder" ? "Reminder draft" : "Thank-you draft"} onClose={onClose}>
      <p className="small muted">Edit before sending. Send it yourself from your email; this page cannot and will not send messages.</p>
      {rec.email && (
        <p className="small">
          To: <span className="mono selectable">{rec.email}</span>
        </p>
      )}
      <CopyBox id="msg-draft" text={text} label="Message" />
    </Modal>
  );
}

function RecForm({ rec, onClose }: { rec?: Recommender; onClose: () => void }) {
  const { upsert, remove } = useStore();
  const { draft, set } = useDraft<Recommender>(rec ?? { id: newId("rec"), name: "", position: "", institution: "", relationship: "", email: "", phone: "", notes: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  return (
    <Modal title={rec ? "Edit recommender" : "Add recommender"} onClose={onClose}>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          const r = upsert("recommenders", draft);
          if (!r.ok) return setErrors(r.errors);
          onClose();
        }}
      >
        <TextField id="rc-name" label="Name" value={draft.name} onChange={set("name")} error={errors.name} className="span-2" />
        <TextField id="rc-pos" label="Position" value={draft.position} onChange={set("position")} />
        <TextField id="rc-inst" label="Institution" value={draft.institution} onChange={set("institution")} />
        <TextField id="rc-rel" label="Relationship to me" value={draft.relationship} onChange={set("relationship")} className="span-2" />
        <TextField id="rc-email" label="Email (optional)" value={draft.email} onChange={set("email")} />
        <TextField id="rc-phone" label="Phone (optional)" value={draft.phone} onChange={set("phone")} />
        <TextArea id="rc-notes" label="Notes" value={draft.notes} onChange={set("notes")} className="span-2" />
        <div className="form-actions span-2">
          {rec && (
            <ConfirmButton
              confirmLabel="Delete recommender and requests"
              onConfirm={() => {
                remove("recommenders", rec.id);
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

function ReqForm({ req, onClose }: { req: RecRequest; onClose: () => void }) {
  const { state, upsert, remove } = useStore();
  const { draft, set } = useDraft<RecRequest>(req);
  const [errors, setErrors] = useState<FieldErrors>({});
  const exists = state.recRequests.some((r) => r.id === req.id);
  return (
    <Modal title={exists ? "Edit request" : "Assign a university"} onClose={onClose}>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.programId) return setErrors({ programId: "Choose a university" });
          const r = upsert("recRequests", draft);
          if (!r.ok) return setErrors(r.errors);
          onClose();
        }}
      >
        <SelectField id="rq-prog" label="University" value={draft.programId} onChange={set("programId")} options={programOptions(state)} error={errors.programId} className="span-2" />
        <SelectField id="rq-status" label="Status" value={draft.status} onChange={set("status")} options={REC_STATUS.map((s) => ({ value: s, label: REC_STATUS_LABEL[s] }))} />
        <TextField id="rq-req" label="Request date" type="date" value={draft.requestDate ?? ""} onChange={(v) => set("requestDate")(v || null)} />
        <TextField id="rq-dl" label="Submission deadline" type="date" value={draft.deadline ?? ""} onChange={(v) => set("deadline")(v || null)} />
        <TextField id="rq-fu" label="Follow-up date" type="date" value={draft.followUpDate ?? ""} onChange={(v) => set("followUpDate")(v || null)} hint={!draft.followUpDate ? `Suggested: ${fmtDate(suggestFollowUp(draft.deadline))}` : undefined} />
        <TextField id="rq-conf" label="Submission confirmed on" type="date" value={draft.confirmedOn ?? ""} onChange={(v) => set("confirmedOn")(v || null)} />
        <TextArea id="rq-notes" label="Notes" value={draft.notes} onChange={set("notes")} className="span-2" />
        <div className="form-actions span-2">
          {exists && (
            <ConfirmButton
              onConfirm={() => {
                remove("recRequests", req.id);
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
