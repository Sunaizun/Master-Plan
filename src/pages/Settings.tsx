import { useRef, useState } from "react";
import { exportBackup, parseBackup, useStore } from "../lib/store";
import { buildSeed } from "../lib/seed";
import { emptyState, type AppState } from "../lib/types";
import { CheckField, ConfirmButton, CopyBox, Modal, PageHeader, Panel, TextField } from "../components/ui";

export default function SettingsPage() {
  const { state, backend, setSingleton, replaceAll } = useStore();
  const [copyText, setCopyText] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [pendingImport, setPendingImport] = useState<AppState | null>(null);
  const [importErr, setImportErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const counts = {
    programmes: state.programs.length,
    requirements: state.requirements.length,
    tasks: state.tasks.length,
    documents: state.documents.length,
    "practice logs": state.practiceLogs.length,
    costs: state.expenses.length,
  };

  const doExport = async () => {
    const json = exportBackup(state);
    const name = `masters-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const ok = backend ? await backend.download(name, json) : false;
    if (ok) setMsg("Backup saved.");
    else setCopyText(json);
  };

  return (
    <div className="page">
      <PageHeader title="Settings" />

      <Panel title="Where your data lives">
        <p>
          <strong>{backend?.kind === "cloud" ? "claude.ai account storage" : "This browser"}</strong>
        </p>
        <p className="small">{backend?.description}</p>
        <p className="small muted">
          {Object.entries(counts)
            .map(([k, v]) => `${v} ${k}`)
            .join(" · ")}
        </p>
      </Panel>

      <Panel title="Notifications">
        <p className="small">
          Warnings appear inside this page: the Alerts button, the dashboard and the weekly review. No email, push or calendar notifications are sent, because none are
          configured.
        </p>
        <p className="small">
          To get reminders on your phone, use <a href="#tasks">Tasks &amp; Calendar → Export to calendar (.ics)</a> and import the file into Google Calendar, Outlook or Apple
          Calendar. Important deadlines include a reminder seven days before. Re-export after changing dates.
        </p>
        <TextField
          id="set-warn"
          label="Warn me about deadlines this many days ahead"
          type="number"
          inputMode="numeric"
          value={state.settings.warnDays}
          onChange={(v) => setSingleton("settings", { warnDays: Math.max(1, Math.min(90, Number(v) || 14)) })}
        />
        <CheckField id="set-mon" label="Weeks start on Monday" checked={state.settings.weekStartsMonday} onChange={(v) => setSingleton("settings", { weekStartsMonday: v })} />
      </Panel>

      <Panel title="Backup">
        <p className="small">Export everything (including SOP drafts) as a JSON file. Keep a copy somewhere safe; restore it here or on another browser.</p>
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={doExport}>
            Export backup
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            Restore from backup…
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const r = parseBackup(await f.text());
              if (r.ok) {
                setPendingImport(r.value);
                setImportErr("");
              } else setImportErr(r.errors._);
            }}
          />
        </div>
        {msg && <p className="small muted">{msg}</p>}
        {importErr && <p className="field-error">{importErr}</p>}
        {pendingImport && (
          <div className="banner banner-warn">
            Replace all current data with the backup ({pendingImport.programs.length} programmes, {pendingImport.tasks.length} tasks)?{" "}
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => {
                replaceAll(pendingImport);
                setPendingImport(null);
                setMsg("Backup restored.");
              }}
            >
              Replace my data
            </button>{" "}
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setPendingImport(null)}>
              Cancel
            </button>
          </div>
        )}
      </Panel>

      <Panel title="Reset">
        <p className="small">Export a backup first. These cannot be undone.</p>
        <div className="row">
          <ConfirmButton
            label="Reload the starter workspace"
            confirmLabel="Replace everything with the starter workspace"
            className="btn btn-sm"
            onConfirm={() => {
              replaceAll(buildSeed());
              setMsg("Starter workspace loaded.");
            }}
          />
          <ConfirmButton
            label="Erase all data"
            confirmLabel="Erase everything"
            onConfirm={() => {
              replaceAll({ ...emptyState(), initialized: true });
              setMsg("All data erased.");
            }}
          />
        </div>
      </Panel>

      <Panel title="About the starter data">
        <p className="small">
          Requirements in the starter workspace were read from official university pages, the Bolashak administrator's site and the 2024–2026 recommended-universities list on 29
          October 2026. Rows that could not be confirmed, conflicted between official pages, or came only from third-party sites are marked Needs verification and never count
          toward readiness. Target submission dates and task deadlines are planning choices, not official dates.
        </p>
      </Panel>

      {copyText !== null && (
        <Modal title="Backup data" onClose={() => setCopyText(null)}>
          <p className="small">This view cannot save files directly. Copy the text into a file named <code>masters-os-backup.json</code>.</p>
          <CopyBox id="backup-copy" text={copyText} label="Backup JSON" />
        </Modal>
      )}
    </div>
  );
}
