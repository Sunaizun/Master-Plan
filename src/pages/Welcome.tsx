import { useRef, useState } from "react";
import { parseBackup, useStore } from "../lib/store";

export default function Welcome() {
  const { seed, startEmpty, replaceAll, backend } = useStore();
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="welcome">
      <div className="welcome-card">
        <div className="eyebrow">Master's Application OS</div>
        <h1>Your workspace is empty</h1>
        <p>
          Start with the prepared workspace: your AITU profile, six shortlisted programmes, a requirements checklist for each one, Bolashak rules, deadlines and a first set of
          tasks. Requirements were checked on official university and Bolashak pages on 29 Oct 2026; anything that could not be confirmed is marked <strong>Needs verification</strong>.
        </p>
        <div className="welcome-actions">
          <button type="button" className="btn btn-primary btn-lg" onClick={seed}>
            Load my starter workspace
          </button>
          <button type="button" className="btn btn-lg" onClick={startEmpty}>
            Start blank
          </button>
          <button type="button" className="btn btn-ghost btn-lg" onClick={() => fileRef.current?.click()}>
            Restore a backup…
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const r = parseBackup(await f.text());
              if (r.ok) replaceAll(r.value);
              else setErr(r.errors._);
            }}
          />
        </div>
        {err && <p className="field-error" role="alert">{err}</p>}
        <p className="muted small">{backend?.description}</p>
      </div>
    </div>
  );
}
