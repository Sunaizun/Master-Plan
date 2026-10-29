import type {
  AppState,
  Currency,
  DisplayStatus,
  Doc,
  IeltsAttempt,
  Program,
  Requirement,
  Settings,
  Status,
  Task,
} from "./types";

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

let fixedToday: string | null = null;
/** Tests can pin "today". */
export function setToday(iso: string | null) {
  fixedToday = iso;
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return fixedToday ?? toISO(new Date());
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Whole days from today to `iso` (negative = past). */
export function daysUntil(iso: string | null | undefined, from = todayISO()): number | null {
  if (!iso) return null;
  const ms = parseISO(iso).getTime() - parseISO(from).getTime();
  return Math.round(ms / 86_400_000);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDate(iso: string | null | undefined, withYear = true): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ""}`;
}
export function fmtMonth(iso: string): string {
  const d = parseISO(iso);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function relDays(iso: string | null | undefined): string {
  const n = daysUntil(iso);
  if (n === null) return "";
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

export function startOfWeek(iso: string, mondayFirst = true): string {
  const d = parseISO(iso);
  const dow = d.getDay(); // 0 = Sun
  const diff = mondayFirst ? (dow + 6) % 7 : dow;
  d.setDate(d.getDate() - diff);
  return toISO(d);
}

/* ------------------------------------------------------------------ */
/* Status helpers                                                      */
/* ------------------------------------------------------------------ */

export function displayStatus(status: Status, deadline: string | null | undefined): DisplayStatus {
  if (status === "complete" || status === "not_applicable") return status;
  const n = daysUntil(deadline);
  if (n !== null && n < 0) return "overdue";
  return status;
}

/** Task status with dependency blocking applied. */
export function taskDisplayStatus(task: Task, all: Task[]): DisplayStatus {
  if (task.status !== "complete" && task.status !== "not_applicable") {
    const blockers = openDependencies(task, all);
    if (blockers.length && task.status !== "blocked") {
      const ds = displayStatus(task.status, task.deadline);
      return ds === "overdue" ? "overdue" : "blocked";
    }
  }
  return displayStatus(task.status, task.deadline);
}

export function openDependencies(task: Task, all: Task[]): Task[] {
  return task.dependsOn
    .map((id) => all.find((t) => t.id === id))
    .filter((t): t is Task => !!t && t.status !== "complete" && t.status !== "not_applicable");
}

/* ------------------------------------------------------------------ */
/* Readiness                                                           */
/* ------------------------------------------------------------------ */

export function countsTowardReadiness(r: Requirement): boolean {
  return r.required !== "not_required" && r.required !== "optional" && r.myStatus !== "not_applicable";
}

/** A requirement counts as done only when I have completed it AND its official value was verified. */
export function requirementDone(r: Requirement): boolean {
  return r.myStatus === "complete" && r.verified;
}

export interface Readiness {
  done: number;
  total: number;
  pct: number;
  unverified: number;
  completeButUnverified: number;
  blocked: number;
}

export function readinessOf(reqs: Requirement[]): Readiness {
  const counted = reqs.filter(countsTowardReadiness);
  const done = counted.filter(requirementDone).length;
  return {
    done,
    total: counted.length,
    pct: counted.length ? Math.round((done / counted.length) * 100) : 0,
    unverified: counted.filter((r) => !r.verified).length,
    completeButUnverified: counted.filter((r) => r.myStatus === "complete" && !r.verified).length,
    blocked: counted.filter((r) => r.myStatus === "blocked").length,
  };
}

export function programReadiness(state: AppState, programId: string): Readiness {
  return readinessOf(state.requirements.filter((r) => r.programId === programId));
}

export function activePrograms(state: AppState): Program[] {
  return state.programs.filter((p) => !p.archived && p.submission !== "withdrawn");
}

export function overallReadiness(state: AppState): number {
  const ps = activePrograms(state);
  if (!ps.length) return 0;
  const sum = ps.reduce((acc, p) => acc + programReadiness(state, p.id).pct, 0);
  return Math.round(sum / ps.length);
}

export function programTaskProgress(state: AppState, programId: string) {
  const ts = state.tasks.filter((t) => t.programIds.includes(programId) && t.status !== "not_applicable");
  const done = ts.filter((t) => t.status === "complete").length;
  return { done, total: ts.length, pct: ts.length ? Math.round((done / ts.length) * 100) : 0 };
}

export function scholarshipProgress(state: AppState) {
  const rules = state.scholarRules.filter((r) => r.myStatus !== "not_applicable");
  const done = rules.filter((r) => r.myStatus === "complete" && r.verified).length;
  return {
    done,
    total: rules.length,
    pct: rules.length ? Math.round((done / rules.length) * 100) : 0,
    unverified: rules.filter((r) => !r.verified).length,
  };
}

/* ------------------------------------------------------------------ */
/* IELTS                                                               */
/* ------------------------------------------------------------------ */

/** Official IELTS rounding: mean of four bands to nearest half band; .25 and .75 round up. */
export function ieltsOverall(L?: number | null, R?: number | null, W?: number | null, S?: number | null): number | null {
  const xs = [L, R, W, S];
  if (xs.some((x) => x === null || x === undefined)) return null;
  const mean = (xs as number[]).reduce((a, b) => a + b, 0) / 4;
  return Math.floor(mean * 2 + 0.5) / 2;
}

export function attemptOverall(a: IeltsAttempt): number | null {
  return ieltsOverall(a.L, a.R, a.W, a.S) ?? a.overall ?? null;
}

export function ieltsProgress(state: AppState) {
  const attempts = [...state.ieltsAttempts].sort((a, b) => a.date.localeCompare(b.date));
  const scored = attempts.map((a) => ({ a, o: attemptOverall(a) })).filter((x) => x.o !== null) as {
    a: IeltsAttempt;
    o: number;
  }[];
  const baseline = scored.length ? scored[0].o : null;
  const latest = scored.length ? scored[scored.length - 1] : null;
  const target = state.ieltsSettings.targetOverall ?? 8;
  let pct = 0;
  if (baseline !== null && latest && target > baseline) {
    pct = Math.max(0, Math.min(100, Math.round(((latest.o - baseline) / (target - baseline)) * 100)));
  } else if (latest && latest.o >= target) pct = 100;
  const weekStart = addDays(todayISO(), -6);
  const minutesWeek = state.practiceLogs.filter((l) => l.date >= weekStart).reduce((a, l) => a + l.minutes, 0);
  const minutesTotal = state.practiceLogs.reduce((a, l) => a + l.minutes, 0);
  return { baseline, latest: latest?.o ?? null, latestAttempt: latest?.a ?? null, target, pct, minutesWeek, minutesTotal };
}

/** The highest IELTS requirement among active programs, parsed from their requirement rows. */
export function highestIeltsMinimum(state: AppState): { value: number; program: string } | null {
  let best: { value: number; program: string } | null = null;
  for (const p of activePrograms(state)) {
    const r = state.requirements.find((x) => x.programId === p.id && x.title.startsWith("IELTS Academic overall"));
    const m = r?.officialValue.match(/(\d(?:\.\d)?)/);
    if (m) {
      const v = Number(m[1]);
      if (!best || v > best.value) best = { value: v, program: p.name };
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

/** Programs whose requirement rows link to this document. */
export function programsRequiringDoc(state: AppState, docId: string): Program[] {
  const ids = new Set(
    state.requirements
      .filter((r) => r.documentId === docId && r.required !== "not_required" && r.myStatus !== "not_applicable")
      .map((r) => r.programId),
  );
  for (const pid of state.documents.find((d) => d.id === docId)?.programIds ?? []) ids.add(pid);
  return state.programs.filter((p) => ids.has(p.id) && !p.archived);
}

export function docStats(state: AppState) {
  const needed = state.documents.filter((d) => d.status !== "not_applicable");
  const complete = needed.filter((d) => d.status === "complete");
  const missing = needed.filter((d) => d.status !== "complete");
  return { total: needed.length, complete: complete.length, missing };
}

export function expiresSoon(d: Doc, beforeIso: string): boolean {
  return !!d.expiryDate && d.expiryDate <= beforeIso;
}

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

export function toKzt(amount: number, cur: Currency, s: Settings): number | null {
  if (cur === "KZT") return amount;
  const rate = cur === "USD" ? s.kztPerUsd : s.kztPerGbp;
  return rate ? amount * rate : null;
}

export function convert(amount: number, from: Currency, to: Currency, s: Settings): number | null {
  if (from === to) return amount;
  const kzt = toKzt(amount, from, s);
  if (kzt === null) return null;
  if (to === "KZT") return kzt;
  const rate = to === "USD" ? s.kztPerUsd : s.kztPerGbp;
  return rate ? kzt / rate : null;
}

const SYMBOL: Record<Currency, string> = { KZT: "₸", USD: "$", GBP: "£" };
export function fmtMoney(amount: number | null | undefined, cur: Currency): string {
  if (amount === null || amount === undefined) return "—";
  const digits = cur === "KZT" ? 0 : amount % 1 ? 2 : 0;
  const n = amount.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return cur === "KZT" ? `${n} ₸` : `${SYMBOL[cur]}${n}`;
}

/** Sum a list of amounts in a target currency; reports which currencies could not be converted. */
export function sumIn(items: { amount: number; currency: Currency }[], to: Currency, s: Settings) {
  let total = 0;
  const unconverted: Partial<Record<Currency, number>> = {};
  for (const it of items) {
    const v = convert(it.amount, it.currency, to, s);
    if (v === null) unconverted[it.currency] = (unconverted[it.currency] ?? 0) + it.amount;
    else total += v;
  }
  return { total, unconverted };
}

/* ------------------------------------------------------------------ */
/* Calendar events                                                     */
/* ------------------------------------------------------------------ */

export type EventKind = "program" | "target" | "task" | "ielts" | "recommendation" | "payment" | "scholarship" | "requirement" | "opening";
export interface CalEvent {
  id: string;
  date: string;
  kind: EventKind;
  title: string;
  detail: string;
  important: boolean;
  done: boolean;
  route: string;
}

export function allEvents(state: AppState): CalEvent[] {
  const ev: CalEvent[] = [];
  const uniName = (p: Program) => state.universities.find((u) => u.id === p.universityId)?.name ?? "";
  for (const p of state.programs.filter((x) => !x.archived)) {
    const submitted = p.submission === "submitted" || p.submission === "withdrawn";
    if (p.deadline)
      ev.push({
        id: `pd-${p.id}`,
        date: p.deadline,
        kind: "program",
        title: `${uniName(p)} deadline`,
        detail: `${p.name} · ${p.deadlineType}${p.deadlineNote ? ` · ${p.deadlineNote}` : ""}`,
        important: true,
        done: submitted,
        route: `program-${p.id}`,
      });
    if (p.targetDate)
      ev.push({
        id: `pt-${p.id}`,
        date: p.targetDate,
        kind: "target",
        title: `Submit ${uniName(p)} (my target)`,
        detail: p.name,
        important: true,
        done: submitted,
        route: `program-${p.id}`,
      });
    if (p.openingDate)
      ev.push({
        id: `po-${p.id}`,
        date: p.openingDate,
        kind: "opening",
        title: `${uniName(p)} applications open`,
        detail: p.name,
        important: false,
        done: false,
        route: `program-${p.id}`,
      });
  }
  for (const r of state.requirements) {
    if (!r.deadline) continue;
    const p = state.programs.find((x) => x.id === r.programId);
    if (!p || p.archived) continue;
    ev.push({
      id: `rq-${r.id}`,
      date: r.deadline,
      kind: "requirement",
      title: r.title,
      detail: uniName(p),
      important: false,
      done: r.myStatus === "complete",
      route: `program-${p.id}`,
    });
  }
  for (const t of state.tasks) {
    if (!t.deadline) continue;
    ev.push({
      id: `t-${t.id}`,
      date: t.deadline,
      kind: "task",
      title: t.title,
      detail: `${t.priority} priority`,
      important: t.priority === "high",
      done: t.status === "complete" || t.status === "not_applicable",
      route: "tasks",
    });
  }
  const s = state.ieltsSettings;
  if (s.plannedDate)
    ev.push({ id: "ielts-test", date: s.plannedDate, kind: "ielts", title: "IELTS Academic test", detail: s.testCentre || s.registration.replace("_", " "), important: true, done: s.registration === "taken" || s.registration === "result_received", route: "ielts" });
  if (s.resultDate)
    ev.push({ id: "ielts-result", date: s.resultDate, kind: "ielts", title: "IELTS results released", detail: "", important: false, done: s.registration === "result_received", route: "ielts" });
  for (const rq of state.recRequests) {
    const rec = state.recommenders.find((r) => r.id === rq.recommenderId);
    const p = state.programs.find((x) => x.id === rq.programId);
    const done = rq.status === "submitted" || rq.status === "confirmed" || rq.status === "declined";
    if (rq.deadline)
      ev.push({ id: `rd-${rq.id}`, date: rq.deadline, kind: "recommendation", title: `Letter due: ${rec?.name ?? "Recommender"}`, detail: p ? uniName(p) : "", important: true, done, route: "recommendations" });
    if (rq.followUpDate && !done)
      ev.push({ id: `rf-${rq.id}`, date: rq.followUpDate, kind: "recommendation", title: `Follow up with ${rec?.name ?? "recommender"}`, detail: p ? uniName(p) : "", important: false, done: false, route: "recommendations" });
  }
  for (const e of state.expenses) {
    if (!e.dueDate) continue;
    ev.push({ id: `e-${e.id}`, date: e.dueDate, kind: "payment", title: `Payment: ${e.title}`, detail: e.currency, important: false, done: e.paymentStatus === "paid" || e.paymentStatus === "cancelled" || e.paymentStatus === "refunded", route: "budget" });
  }
  const b = state.bolashak;
  if (b.windowOpen) ev.push({ id: "bol-open", date: b.windowOpen, kind: "scholarship", title: "Bolashak applications open", detail: b.windowNote, important: true, done: false, route: "bolashak" });
  if (b.windowClose) ev.push({ id: "bol-close", date: b.windowClose, kind: "scholarship", title: "Bolashak application deadline", detail: b.windowNote, important: true, done: b.applicationStatus !== "researching" && b.applicationStatus !== "preparing", route: "bolashak" });
  for (const r of state.scholarRules) {
    if (r.deadline) ev.push({ id: `sr-${r.id}`, date: r.deadline, kind: "scholarship", title: r.rule, detail: "Bolashak", important: false, done: r.myStatus === "complete", route: "bolashak" });
  }
  return ev.sort((a, b) => a.date.localeCompare(b.date));
}

export function nextImportantDeadline(state: AppState): CalEvent | null {
  const t = todayISO();
  return allEvents(state).find((e) => e.important && !e.done && e.date >= t) ?? null;
}

/* ------------------------------------------------------------------ */
/* Alerts & priorities                                                 */
/* ------------------------------------------------------------------ */

export interface Alert {
  id: string;
  level: "critical" | "warning" | "info";
  title: string;
  detail: string;
  route: string;
}

const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 } as const;

/** Higher = do sooner. Combines priority, deadline proximity and overdue state. */
export function taskScore(t: Task): number {
  const n = daysUntil(t.deadline);
  let s = PRIORITY_WEIGHT[t.priority] * 10;
  if (n === null) s += 0;
  else if (n < 0) s += 40;
  else s += Math.max(0, 30 - n * 2);
  if (t.status === "in_progress") s += 3;
  return s;
}

export function openTasks(state: AppState): Task[] {
  return state.tasks.filter((t) => t.status !== "complete" && t.status !== "not_applicable");
}

/** The n most urgent actionable tasks due within `days`; if fewer exist, fill with the next ones due. */
export function topTasksNextDays(state: AppState, days = 7, n = 3): Task[] {
  const limit = addDays(todayISO(), days);
  const actionable = openTasks(state).filter((t) => openDependencies(t, state.tasks).length === 0);
  const inWindow = actionable.filter((t) => t.deadline && t.deadline <= limit).sort((a, b) => taskScore(b) - taskScore(a));
  if (inWindow.length >= n) return inWindow.slice(0, n);
  const later = actionable
    .filter((t) => !inWindow.includes(t))
    .sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999") || taskScore(b) - taskScore(a));
  return [...inWindow, ...later].slice(0, n);
}

export function upcomingTasks(state: AppState, n = 5): Task[] {
  const t = todayISO();
  return openTasks(state)
    .filter((x) => x.deadline && x.deadline >= t)
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? "") || taskScore(b) - taskScore(a))
    .slice(0, n);
}

export function overdueTasks(state: AppState): Task[] {
  const t = todayISO();
  return openTasks(state).filter((x) => x.deadline && x.deadline < t);
}

export function alerts(state: AppState): Alert[] {
  const out: Alert[] = [];
  const warn = state.settings.warnDays;
  const t = todayISO();
  const horizon = addDays(t, warn);

  for (const task of overdueTasks(state))
    out.push({ id: `od-${task.id}`, level: "critical", title: `Overdue: ${task.title}`, detail: `Was due ${fmtDate(task.deadline)} (${relDays(task.deadline)})`, route: "tasks" });

  for (const e of allEvents(state)) {
    if (e.done || e.kind === "task" || !e.important) continue;
    if (e.date >= t && e.date <= horizon)
      out.push({ id: `up-${e.id}`, level: daysUntil(e.date)! <= 7 ? "critical" : "warning", title: e.title, detail: `${fmtDate(e.date)} · ${relDays(e.date)}${e.detail ? ` · ${e.detail}` : ""}`, route: e.route });
  }

  const startPlan = "2027-09-01";
  for (const d of state.documents) {
    if (d.status === "not_applicable") continue;
    if (d.expiryDate && d.expiryDate < t)
      out.push({ id: `ex-${d.id}`, level: "warning", title: `${d.name} has expired`, detail: `Expired ${fmtDate(d.expiryDate)}. Replace it before you rely on it.`, route: "documents" });
    else if (d.category === "passport" && d.expiryDate && d.expiryDate < addDays(startPlan, 365))
      out.push({ id: `px-${d.id}`, level: "warning", title: "Passport expires during your planned studies", detail: `Expiry ${fmtDate(d.expiryDate)}. Visas usually need validity well beyond your course; check the rules for each country.`, route: "documents" });
  }

  const missingRequired = state.documents.filter((d) => d.status !== "complete" && d.status !== "not_applicable" && programsRequiringDoc(state, d.id).length > 0);
  if (missingRequired.length)
    out.push({ id: "missing-docs", level: "warning", title: `${missingRequired.length} required document${missingRequired.length > 1 ? "s" : ""} not ready`, detail: missingRequired.slice(0, 4).map((d) => d.name).join(", ") + (missingRequired.length > 4 ? "…" : ""), route: "documents" });

  const unverifiedPrograms = activePrograms(state).filter((p) => programReadiness(state, p.id).unverified > 0);
  if (unverifiedPrograms.length)
    out.push({ id: "unverified", level: "info", title: `${unverifiedPrograms.length} program${unverifiedPrograms.length > 1 ? "s have" : " has"} unverified requirements`, detail: "Unverified rows never count toward readiness. Check the official pages.", route: "requirements" });

  for (const rq of state.recRequests) {
    if (rq.followUpDate && rq.followUpDate <= t && !["submitted", "confirmed", "declined"].includes(rq.status)) {
      const rec = state.recommenders.find((r) => r.id === rq.recommenderId);
      out.push({ id: `fu-${rq.id}`, level: "warning", title: `Follow up with ${rec?.name ?? "recommender"}`, detail: `Follow-up date ${fmtDate(rq.followUpDate)}`, route: "recommendations" });
    }
  }

  if (!state.ieltsSettings.plannedDate)
    out.push({ id: "ielts-date", level: "info", title: "No IELTS test date set", detail: "Pick a date so the countdown and deadline checks can work.", route: "ielts" });

  const order = { critical: 0, warning: 1, info: 2 } as const;
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

/* ------------------------------------------------------------------ */
/* ICS export                                                          */
/* ------------------------------------------------------------------ */

function icsEscape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function toICS(events: CalEvent[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Masters Application OS//EN", "CALSCALE:GREGORIAN"];
  for (const e of events) {
    const d = e.date.replace(/-/g, "");
    const next = addDays(e.date, 1).replace(/-/g, "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@masters-os`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d}`,
      `DTEND;VALUE=DATE:${next}`,
      `SUMMARY:${icsEscape(e.title)}`,
      `DESCRIPTION:${icsEscape(e.detail)}`,
      ...(e.important ? ["BEGIN:VALARM", "TRIGGER:-P7D", "ACTION:DISPLAY", `DESCRIPTION:${icsEscape(e.title)}`, "END:VALARM"] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function wordCount(text: string): number {
  const m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
}
