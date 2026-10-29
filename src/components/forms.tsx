import { useMemo, useState } from "react";
import { useStore, type FieldErrors } from "../lib/store";
import { PRIORITY, STATUS, STATUS_LABEL, TASK_CATEGORY, TASK_CATEGORY_LABEL, newId, type Task } from "../lib/types";
import { addDays, todayISO } from "../lib/calc";
import { FormErrors, Modal, MultiCheck, SelectField, TextArea, TextField } from "./ui";

/** Small helper: a draft object plus a typed setter. */
export function useDraft<T extends object>(initial: T) {
  const [draft, setDraft] = useState<T>(initial);
  const set = <K extends keyof T>(k: K) => (v: T[K]) => setDraft((d) => ({ ...d, [k]: v }));
  return { draft, setDraft, set };
}

export function programOptions(state: ReturnType<typeof useStore>["state"]) {
  return state.programs
    .filter((p) => !p.archived)
    .map((p) => ({ value: p.id, label: `${state.universities.find((u) => u.id === p.universityId)?.name ?? "?"} — ${p.name}` }));
}

export function shortUni(state: ReturnType<typeof useStore>["state"], programId: string) {
  const p = state.programs.find((x) => x.id === programId);
  const u = p && state.universities.find((x) => x.id === p.universityId);
  return u?.name.replace("University of ", "").replace(" University", "").replace(" (SUNY)", "") ?? "—";
}

/* ------------------------------------------------------------------ */
/* Fast task entry                                                     */
/* ------------------------------------------------------------------ */

export function QuickTask({ onClose, onSaved, presetProgram }: { onClose: () => void; onSaved: (title: string) => void; presetProgram?: string }) {
  const { state, upsert } = useStore();
  const { draft, set } = useDraft({ title: "", deadline: addDays(todayISO(), 7), priority: "medium" as Task["priority"], programId: presetProgram ?? "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = upsert("tasks", { id: newId("t"), title: draft.title, deadline: draft.deadline, priority: draft.priority, programIds: draft.programId ? [draft.programId] : [], category: draft.programId ? "application" : "other" });
    if (!r.ok) return setErrors(r.errors);
    onSaved(draft.title);
  };
  return (
    <Modal title="Add a task" onClose={onClose}>
      <form onSubmit={submit} className="form-grid">
        <TextField id="qt-title" label="What needs doing?" value={draft.title} onChange={set("title")} error={errors.title} className="span-2" placeholder="e.g. Email ASU about prerequisites" />
        <TextField id="qt-deadline" label="Deadline" type="date" value={draft.deadline} onChange={set("deadline")} error={errors.deadline} />
        <SelectField id="qt-priority" label="Priority" value={draft.priority} onChange={set("priority")} options={PRIORITY.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }))} />
        <SelectField id="qt-program" label="University (optional)" className="span-2" value={draft.programId} onChange={set("programId")} options={[{ value: "", label: "None" }, ...programOptions(state)]} />
        <div className="form-actions span-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Add task
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Full task editor                                                    */
/* ------------------------------------------------------------------ */

export function TaskForm({ task, onClose }: { task?: Task; onClose: () => void }) {
  const { state, upsert } = useStore();
  const blank: Task = {
    id: newId("t"),
    title: "",
    description: "",
    programIds: [],
    category: "other",
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
  };
  const { draft, set } = useDraft<Task>(task ?? blank);
  const [errors, setErrors] = useState<FieldErrors>({});
  const reqOptions = useMemo(
    () =>
      state.requirements
        .filter((r) => draft.programIds.length === 0 || draft.programIds.includes(r.programId))
        .map((r) => ({ value: r.id, label: `${shortUni(state, r.programId)} · ${r.title}` })),
    [state, draft.programIds],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (draft.dependsOn.includes(draft.id)) return setErrors({ dependsOn: "A task cannot depend on itself." });
    const r = upsert("tasks", draft);
    if (!r.ok) return setErrors(r.errors);
    onClose();
  };

  return (
    <Modal title={task ? "Edit task" : "New task"} onClose={onClose} wide>
      <form onSubmit={submit} className="form-grid">
        <FormErrors errors={errors} />
        <TextField id="tf-title" label="Title" value={draft.title} onChange={set("title")} error={errors.title} className="span-2" />
        <TextArea id="tf-desc" label="Description" value={draft.description} onChange={set("description")} className="span-2" />
        <SelectField id="tf-cat" label="Category" value={draft.category} onChange={set("category")} options={TASK_CATEGORY.map((c) => ({ value: c, label: TASK_CATEGORY_LABEL[c] }))} />
        <SelectField id="tf-pri" label="Priority" value={draft.priority} onChange={set("priority")} options={PRIORITY.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }))} />
        <SelectField id="tf-status" label="Status" value={draft.status} onChange={set("status")} options={STATUS.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
        <TextField id="tf-est" label="Estimated hours" type="number" inputMode="decimal" step="0.5" value={draft.estHours ?? ""} onChange={(v) => set("estHours")(v === "" ? null : Number(v))} error={errors.estHours} />
        <TextField id="tf-start" label="Start date" type="date" value={draft.startDate ?? ""} onChange={(v) => set("startDate")(v || null)} error={errors.startDate} />
        <TextField id="tf-deadline" label="Deadline" type="date" value={draft.deadline ?? ""} onChange={(v) => set("deadline")(v || null)} error={errors.deadline} />
        {draft.status === "complete" && <TextField id="tf-done" label="Completed on" type="date" value={draft.completedAt ?? ""} onChange={(v) => set("completedAt")(v || null)} />}
        <MultiCheck id="tf-programs" label="Universities" options={programOptions(state)} value={draft.programIds} onChange={set("programIds")} />
        <div className="field span-2">
          <label className="field-label" htmlFor="tf-deps">
            Depends on (finish these first)
          </label>
          <select
            id="tf-deps"
            multiple
            size={Math.min(6, Math.max(3, state.tasks.length - 1))}
            value={draft.dependsOn}
            onChange={(e) => set("dependsOn")(Array.from(e.target.selectedOptions).map((o) => o.value))}
          >
            {state.tasks
              .filter((t) => t.id !== draft.id)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
          </select>
          <div className="field-hint">Hold Ctrl/⌘ to pick several. A task with unfinished dependencies shows as Blocked.</div>
          {errors.dependsOn && <div className="field-error">{errors.dependsOn}</div>}
        </div>
        <SelectField id="tf-req" label="Linked requirement" value={draft.requirementId ?? ""} onChange={(v) => set("requirementId")(v || null)} options={[{ value: "", label: "None" }, ...reqOptions]} />
        <SelectField
          id="tf-action"
          label="When I complete this task"
          value={draft.linkAction}
          onChange={set("linkAction")}
          options={[
            { value: "none", label: "Do nothing to the requirement" },
            { value: "complete", label: "Mark the requirement complete" },
            { value: "verify", label: "Mark the requirement verified" },
          ]}
        />
        <TextField id="tf-link" label="Official page or file link" value={draft.link} onChange={set("link")} error={errors.link} className="span-2" placeholder="https://" />
        <TextArea id="tf-notes" label="Notes" value={draft.notes} onChange={set("notes")} className="span-2" />
        <div className="form-actions span-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save task
          </button>
        </div>
      </form>
    </Modal>
  );
}
