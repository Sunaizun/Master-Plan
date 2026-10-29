import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { STATUS, STATUS_LABEL, type DisplayStatus, type Status } from "../lib/types";
import { fmtDate, relDays } from "../lib/calc";

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

/** Each status has its own glyph so state never depends on colour alone. */
const GLYPH: Record<DisplayStatus, string> = {
  complete: "✓",
  in_progress: "◐",
  not_started: "○",
  waiting: "⧗",
  needs_verification: "?",
  blocked: "⊘",
  overdue: "!",
  not_applicable: "–",
};

export function StatusBadge({ status, small }: { status: DisplayStatus; small?: boolean }) {
  return (
    <span className={`badge st-${status}${small ? " badge-sm" : ""}`}>
      <span className="badge-glyph" aria-hidden="true">
        {GLYPH[status]}
      </span>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Pill({ tone = "neutral", children, title }: { tone?: "neutral" | "good" | "warn" | "bad" | "info" | "accent"; children: ReactNode; title?: string }) {
  return (
    <span className={`pill tone-${tone}`} title={title}>
      {children}
    </span>
  );
}

export function VerifiedMark({ verified, date }: { verified: boolean; date?: string | null }) {
  return verified ? (
    <span className="vmark ok" title={date ? `Verified ${fmtDate(date)}` : "Verified from an official source"}>
      <span aria-hidden="true">✓</span> Verified{date ? ` ${fmtDate(date, false)}` : ""}
    </span>
  ) : (
    <span className="vmark no" title="Not confirmed from an official source">
      <span aria-hidden="true">?</span> Needs verification
    </span>
  );
}

export function StatusSelect({ id, value, onChange, label = "Status", hideLabel }: { id: string; value: Status; onChange: (s: Status) => void; label?: string; hideLabel?: boolean }) {
  return (
    <label className={hideLabel ? "inline-select" : "field"} htmlFor={id}>
      <span className={hideLabel ? "sr-only" : "field-label"}>{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as Status)} className={`status-select st-${value}`}>
        {STATUS.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

export function Progress({ pct, label, size = "md", tone }: { pct: number; label?: string; size?: "sm" | "md"; tone?: "accent" | "good" | "warn" }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className={`progress progress-${size}`}>
      <div className="progress-track" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Progress"}>
        <div className={`progress-fill tone-${tone ?? (clamped >= 100 ? "good" : "accent")}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="progress-num">{clamped}%</span>
    </div>
  );
}

export function Ring({ pct, size = 112, label }: { pct: number; size?: number; label: string }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${Math.round(clamped)}%`}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * c} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-label">
        <strong>{Math.round(clamped)}%</strong>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Layout bits                                                         */
/* ------------------------------------------------------------------ */

export function PageHeader({ title, eyebrow, children, sub }: { title: string; eyebrow?: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="page-head-text">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}

export function Panel({ title, action, children, className = "", id }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section className={`panel ${className}`} id={id}>
      {(title || action) && (
        <div className="panel-head">
          {title && <h2>{title}</h2>}
          {action && <div className="panel-action">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function DateCell({ date, done }: { date: string | null | undefined; done?: boolean }) {
  if (!date) return <span className="muted">—</span>;
  const rel = relDays(date);
  const past = !done && date < new Date().toISOString().slice(0, 10);
  return (
    <span className={`date-cell${past ? " is-past" : ""}`}>
      <span className="mono">{fmtDate(date)}</span>
      {!done && <span className="date-rel">{rel}</span>}
    </span>
  );
}

export function ExtLink({ href, children }: { href: string; children?: ReactNode }) {
  if (!href) return <span className="muted">—</span>;
  let host = href;
  try {
    host = new URL(href).hostname.replace(/^www\./, "");
  } catch {
    /* keep raw */
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="ext">
      {children ?? host}
      <span aria-hidden="true"> ↗</span>
    </a>
  );
}

export function Tabs<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[]; label: string }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {items.map((it) => (
        <button key={it.value} role="tab" type="button" aria-selected={value === it.value} className={value === it.value ? "tab is-on" : "tab"} onClick={() => onChange(it.value)}>
          {it.label}
          {it.count !== undefined && <span className="tab-count">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal & confirm (window.confirm is unavailable in artifacts)        */
/* ------------------------------------------------------------------ */

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const labelId = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>("input, select, textarea, button:not(.modal-x)");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const f = Array.from(ref.current.querySelectorAll<HTMLElement>("input, select, textarea, button, a[href]")).filter((x) => !x.hasAttribute("disabled"));
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
          e.preventDefault();
          f[0].focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? " modal-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={labelId} ref={ref}>
        <div className="modal-head">
          <h2 id={labelId}>{title}</h2>
          <button type="button" className="modal-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmButton({ onConfirm, label = "Delete", confirmLabel = "Confirm delete", className = "btn btn-ghost btn-danger btn-sm" }: { onConfirm: () => void; label?: string; confirmLabel?: string; className?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return armed ? (
    <span className="confirm-group">
      <button type="button" className="btn btn-danger btn-sm" onClick={onConfirm}>
        {confirmLabel}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setArmed(false)}>
        Cancel
      </button>
    </span>
  ) : (
    <button type="button" className={className} onClick={() => setArmed(true)}>
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Form fields                                                         */
/* ------------------------------------------------------------------ */

interface FieldBase {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
}

function Wrap({ id, label, error, hint, className = "", children }: FieldBase & { children: ReactNode }) {
  return (
    <div className={`field ${className}${error ? " has-error" : ""}`}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && !error && <div className="field-hint">{hint}</div>}
      {error && (
        <div className="field-error" id={`${id}-err`} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export function TextField(p: FieldBase & { value: string | number | null | undefined; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean; inputMode?: "decimal" | "numeric" | "text"; step?: string }) {
  return (
    <Wrap {...p}>
      <input
        id={p.id}
        type={p.type ?? "text"}
        value={p.value ?? ""}
        placeholder={p.placeholder}
        required={p.required}
        inputMode={p.inputMode}
        step={p.step}
        aria-invalid={!!p.error}
        aria-describedby={p.error ? `${p.id}-err` : undefined}
        onChange={(e) => p.onChange(e.target.value)}
      />
    </Wrap>
  );
}

export function TextArea(p: FieldBase & { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <Wrap {...p}>
      <textarea id={p.id} value={p.value} rows={p.rows ?? 3} placeholder={p.placeholder} aria-invalid={!!p.error} onChange={(e) => p.onChange(e.target.value)} />
    </Wrap>
  );
}

export function SelectField<T extends string>(p: FieldBase & { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <Wrap {...p}>
      <select id={p.id} value={p.value} onChange={(e) => p.onChange(e.target.value as T)}>
        {p.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrap>
  );
}

export function CheckField({ id, label, checked, onChange, hint }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="check-field">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>
        {label}
        {hint && <span className="field-hint"> {hint}</span>}
      </label>
    </div>
  );
}

export function MultiCheck({ id, label, options, value, onChange }: { id: string; label: string; options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset className="field multi">
      <legend className="field-label">{label}</legend>
      <div className="multi-opts">
        {options.length === 0 && <span className="muted">None yet</span>}
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <label key={o.value} className={`chip-check${on ? " is-on" : ""}`} htmlFor={`${id}-${o.value}`}>
              <input id={`${id}-${o.value}`} type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked ? [...value, o.value] : value.filter((v) => v !== o.value))} />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function FormErrors({ errors }: { errors: Record<string, string> }) {
  const general = errors._;
  if (!general) return null;
  return (
    <div className="form-error" role="alert">
      {general}
    </div>
  );
}

export function SearchBox({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="search" htmlFor={id}>
      <span className="sr-only">{placeholder}</span>
      <span aria-hidden="true" className="search-icon">
        ⌕
      </span>
      <input id={id} type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [message, onDone]);
  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}

/** Copy text with a selectable fallback (clipboard can be refused in artifacts). */
export function CopyBox({ id, text, label }: { id: string; text: string; label: string }) {
  const [state, setState] = useState<"" | "copied" | "select">("");
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="copybox">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <textarea id={id} ref={ref} readOnly value={text} rows={Math.min(10, text.split("\n").length + 1)} />
      <div className="row">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            navigator.clipboard
              ?.writeText(text)
              .then(() => setState("copied"))
              .catch(() => {
                ref.current?.select();
                setState("select");
              });
            if (!navigator.clipboard) {
              ref.current?.select();
              setState("select");
            }
          }}
        >
          Copy
        </button>
        {state === "copied" && <span className="muted">Copied.</span>}
        {state === "select" && <span className="muted">Text selected. Press Ctrl/⌘+C to copy.</span>}
      </div>
    </div>
  );
}
