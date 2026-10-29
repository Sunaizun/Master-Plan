import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ZodTypeAny } from "zod";
import { todayISO } from "./calc";
import { buildSeed } from "./seed";
import { type Backend, describeDbError, detectBackend, localBackend } from "./storage";
import {
  type AppState,
  type CollectionKey,
  type SingletonKey,
  COLLECTION_SCHEMAS,
  SINGLETON_SCHEMAS,
  emptyState,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const SCHEMA_VERSION = 1;
const COLLECTIONS = Object.keys(COLLECTION_SCHEMAS) as CollectionKey[];
const SINGLETONS = Object.keys(SINGLETON_SCHEMAS) as SingletonKey[];

export type SaveState = "idle" | "saving" | "saved" | "error";
export type FieldErrors = Record<string, string>;
export type Result<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

type ItemOf<K extends CollectionKey> = AppState[K][number];

/* ------------------------------------------------------------------ */
/* Serialisation: state <-> storage documents                          */
/* ------------------------------------------------------------------ */

function toDocs(s: AppState): Record<string, any> {
  const docs: Record<string, any> = { meta: { initialized: s.initialized, schemaVersion: SCHEMA_VERSION } };
  for (const k of SINGLETONS) docs[k] = s[k];
  for (const k of COLLECTIONS) {
    if (k === "requirements") continue;
    docs[k] = { items: s[k] };
  }
  const byProgram: Record<string, any[]> = {};
  for (const r of s.requirements) (byProgram[r.programId] ??= []).push(r);
  for (const [pid, items] of Object.entries(byProgram)) docs[`req.${pid}`] = { items };
  return docs;
}

function safeParseList(schema: ZodTypeAny, items: unknown): any[] {
  if (!Array.isArray(items)) return [];
  const out: any[] = [];
  for (const it of items) {
    const r = schema.safeParse(it);
    if (r.success) out.push(r.data);
  }
  return out;
}

function fromDocs(docs: Record<string, any>, texts: Record<string, string>): AppState {
  const s = emptyState();
  s.initialized = !!docs.meta?.initialized;
  for (const k of SINGLETONS) {
    const r = (SINGLETON_SCHEMAS[k] as ZodTypeAny).safeParse(docs[k] ?? {});
    if (r.success) (s as any)[k] = r.data;
  }
  for (const k of COLLECTIONS) {
    if (k === "requirements") continue;
    (s as any)[k] = safeParseList(COLLECTION_SCHEMAS[k], docs[k]?.items);
  }
  const reqItems: any[] = [];
  for (const [key, val] of Object.entries(docs)) if (key.startsWith("req.")) reqItems.push(...(val?.items ?? []));
  s.requirements = safeParseList(COLLECTION_SCHEMAS.requirements, reqItems).sort((a, b) => a.order - b.order);
  s.texts = { ...texts };
  return s;
}

function zodErrors(err: any): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err?.issues ?? []) {
    const k = issue.path?.join(".") || "_";
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

interface Store {
  state: AppState;
  ready: boolean;
  backend: Backend | null;
  saveState: SaveState;
  saveError: string;
  loadError: string;
  /** Low-level: replace state with fn(state). Persists the parts that changed. */
  mutate(fn: (s: AppState) => AppState): void;
  upsert<K extends CollectionKey>(key: K, item: any): Result<ItemOf<K>>;
  patch<K extends CollectionKey>(key: K, id: string, partial: Partial<ItemOf<K>>): Result<ItemOf<K>>;
  remove(key: CollectionKey, id: string): void;
  setSingleton<K extends SingletonKey>(key: K, partial: Partial<AppState[K]>): Result<AppState[K]>;
  setText(versionId: string, text: string): void;
  seed(): void;
  startEmpty(): void;
  replaceAll(next: AppState): void;
  retrySave(): void;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}

/** Side effects that keep related records consistent. */
function applyTaskEffects(prev: AppState, next: AppState): AppState {
  let changed = false;
  const reqs = next.requirements.slice();
  const tasks = next.tasks.map((t) => {
    const old = prev.tasks.find((o) => o.id === t.id);
    if (t.status === "complete" && old?.status !== "complete") {
      if (t.requirementId) {
        const i = reqs.findIndex((r) => r.id === t.requirementId);
        if (i >= 0) {
          if (t.linkAction === "complete") reqs[i] = { ...reqs[i], myStatus: "complete" };
          if (t.linkAction === "verify") reqs[i] = { ...reqs[i], verified: true, verifiedOn: todayISO() };
          changed = true;
        }
      }
      if (!t.completedAt) {
        changed = true;
        return { ...t, completedAt: todayISO() };
      }
    }
    if (t.status !== "complete" && old?.status === "complete" && t.completedAt) {
      changed = true;
      return { ...t, completedAt: null };
    }
    return t;
  });
  return changed ? { ...next, tasks, requirements: reqs } : next;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [ready, setReady] = useState(false);
  const [backend, setBackend] = useState<Backend | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [loadError, setLoadError] = useState("");

  const stateRef = useRef(state);
  stateRef.current = state;
  const backendRef = useRef<Backend | null>(null);
  const lastDocs = useRef<Record<string, string>>({});
  const lastTexts = useRef<Record<string, string>>({});
  const pending = useRef<Map<string, { kind: "doc" | "text"; value: any; del?: boolean }>>(new Map());
  const timer = useRef<number | null>(null);
  const flushing = useRef(false);

  /* ---------- load ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      let b: Backend;
      try {
        b = await detectBackend();
      } catch {
        b = localBackend();
      }
      let loaded: { docs: Record<string, any>; texts: Record<string, string> } = { docs: {}, texts: {} };
      try {
        loaded = await b.loadAll();
      } catch (e: any) {
        setLoadError(`Could not load your saved data (${describeDbError(e)}). Using this browser's copy instead.`);
        b = localBackend();
        loaded = await b.loadAll();
      }
      if (!alive) return;
      const s = fromDocs(loaded.docs, loaded.texts);
      const docs = toDocs(s);
      lastDocs.current = Object.fromEntries(Object.entries(docs).map(([k, v]) => [k, JSON.stringify(v)]));
      // req chunks present in storage but now empty must be remembered for deletion
      for (const k of Object.keys(loaded.docs)) if (!(k in lastDocs.current)) lastDocs.current[k] = "__stale__";
      lastTexts.current = { ...loaded.texts };
      backendRef.current = b;
      setBackend(b);
      setState(s);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ---------- save ---------- */
  const flush = useCallback(async () => {
    const b = backendRef.current;
    if (!b || flushing.current) return;
    flushing.current = true;
    setSaveState("saving");
    try {
      while (pending.current.size) {
        const [key, job] = pending.current.entries().next().value as [string, { kind: "doc" | "text"; value: any; del?: boolean }];
        pending.current.delete(key);
        if (job.kind === "doc") {
          if (job.del) await b.remove(key);
          else await b.save(key, job.value);
        } else {
          const textId = key.slice(2); // text jobs are keyed "t:<versionId>"
          if (job.del) await b.removeText(textId);
          else await b.saveText(textId, job.value);
        }
      }
      setSaveState("saved");
      setSaveError("");
    } catch (e: any) {
      setSaveState("error");
      setSaveError(describeDbError(e));
      // put everything back so a retry resends the latest state
      queueDiff(stateRef.current, true);
    } finally {
      flushing.current = false;
    }
  }, []);

  const schedule = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      void flush().then(() => {
        if (pending.current.size) schedule();
      });
    }, 700);
  }, [flush]);

  function queueDiff(s: AppState, force = false) {
    const docs = toDocs(s);
    const seen = new Set<string>();
    for (const [k, v] of Object.entries(docs)) {
      seen.add(k);
      const json = JSON.stringify(v);
      if (force || lastDocs.current[k] !== json) {
        lastDocs.current[k] = json;
        pending.current.set(k, { kind: "doc", value: v });
      }
    }
    for (const k of Object.keys(lastDocs.current)) {
      if (!seen.has(k)) {
        delete lastDocs.current[k];
        pending.current.set(k, { kind: "doc", value: null, del: true });
      }
    }
    for (const [id, text] of Object.entries(s.texts)) {
      if (force || lastTexts.current[id] !== text) {
        lastTexts.current[id] = text;
        pending.current.set("t:" + id, { kind: "text", value: text });
      }
    }
    for (const id of Object.keys(lastTexts.current)) {
      if (!(id in s.texts)) {
        delete lastTexts.current[id];
        pending.current.set("t:" + id, { kind: "text", value: null, del: true });
      }
    }
  }

  const mutate = useCallback(
    (fn: (s: AppState) => AppState) => {
      const prev = stateRef.current;
      let next = fn(prev);
      if (next === prev) return;
      next = applyTaskEffects(prev, next);
      stateRef.current = next;
      setState(next);
      if (!next.initialized) return;
      queueDiff(next);
      schedule();
    },
    [schedule],
  );

  /* ---------- CRUD ---------- */
  const upsert = useCallback(
    <K extends CollectionKey>(key: K, item: any): Result<ItemOf<K>> => {
      const r = (COLLECTION_SCHEMAS[key] as ZodTypeAny).safeParse(item);
      if (!r.success) return { ok: false, errors: zodErrors(r.error) };
      const value = r.data as ItemOf<K>;
      mutate((s) => {
        const list = s[key] as any[];
        const i = list.findIndex((x) => x.id === (value as any).id);
        const nextList = i >= 0 ? list.map((x, j) => (j === i ? value : x)) : [...list, value];
        return { ...s, [key]: nextList };
      });
      return { ok: true, value };
    },
    [mutate],
  );

  const patch = useCallback(
    <K extends CollectionKey>(key: K, id: string, partial: Partial<ItemOf<K>>): Result<ItemOf<K>> => {
      const cur = (stateRef.current[key] as any[]).find((x) => x.id === id);
      if (!cur) return { ok: false, errors: { _: "That record no longer exists." } };
      return upsert(key, { ...cur, ...partial });
    },
    [upsert],
  );

  const remove = useCallback(
    (key: CollectionKey, id: string) => {
      mutate((s) => {
        let n: AppState = { ...s, [key]: (s[key] as any[]).filter((x) => x.id !== id) };
        if (key === "programs") {
          n = {
            ...n,
            requirements: n.requirements.filter((r) => r.programId !== id),
            recRequests: n.recRequests.filter((r) => r.programId !== id),
            tasks: n.tasks.map((t) => (t.programIds.includes(id) ? { ...t, programIds: t.programIds.filter((p) => p !== id) } : t)),
            documents: n.documents.map((d) =>
              d.programIds.includes(id) || d.submissions.some((x) => x.programId === id)
                ? { ...d, programIds: d.programIds.filter((p) => p !== id), submissions: d.submissions.filter((x) => x.programId !== id) }
                : d,
            ),
            expenses: n.expenses.map((e) => (e.programId === id ? { ...e, programId: null } : e)),
            sources: n.sources.map((x) => (x.programId === id ? { ...x, programId: null } : x)),
            notes: n.notes.map((x) => (x.programId === id ? { ...x, programId: null } : x)),
          };
        }
        if (key === "universities") {
          const pids = new Set(s.programs.filter((p) => p.universityId === id).map((p) => p.id));
          n = {
            ...n,
            programs: n.programs.filter((p) => !pids.has(p.id)),
            requirements: n.requirements.filter((r) => !pids.has(r.programId)),
            recRequests: n.recRequests.filter((r) => !pids.has(r.programId)),
            tasks: n.tasks.map((t) => ({ ...t, programIds: t.programIds.filter((p) => !pids.has(p)) })),
          };
        }
        if (key === "tasks") n = { ...n, tasks: n.tasks.map((t) => (t.dependsOn.includes(id) ? { ...t, dependsOn: t.dependsOn.filter((d) => d !== id) } : t)) };
        if (key === "requirements") n = { ...n, tasks: n.tasks.map((t) => (t.requirementId === id ? { ...t, requirementId: null, linkAction: "none" } : t)) };
        if (key === "documents") {
          const doc = s.documents.find((d) => d.id === id);
          const texts = { ...n.texts };
          for (const v of doc?.versions ?? []) delete texts[v.id];
          n = {
            ...n,
            texts,
            requirements: n.requirements.map((r) => (r.documentId === id ? { ...r, documentId: null } : r)),
            scholarRules: n.scholarRules.map((r) => (r.documentId === id ? { ...r, documentId: null } : r)),
          };
        }
        if (key === "recommenders") n = { ...n, recRequests: n.recRequests.filter((r) => r.recommenderId !== id) };
        return n;
      });
    },
    [mutate],
  );

  const setSingleton = useCallback(
    <K extends SingletonKey>(key: K, partial: Partial<AppState[K]>): Result<AppState[K]> => {
      const r = (SINGLETON_SCHEMAS[key] as ZodTypeAny).safeParse({ ...stateRef.current[key], ...partial });
      if (!r.success) return { ok: false, errors: zodErrors(r.error) };
      mutate((s) => ({ ...s, [key]: r.data }));
      return { ok: true, value: r.data };
    },
    [mutate],
  );

  const setText = useCallback(
    (versionId: string, text: string) => mutate((s) => ({ ...s, texts: { ...s.texts, [versionId]: text } })),
    [mutate],
  );

  const replaceAll = useCallback(
    (next: AppState) => {
      const s = { ...next, initialized: true };
      stateRef.current = s;
      setState(s);
      queueDiff(s);
      schedule();
    },
    [schedule],
  );

  const seed = useCallback(() => replaceAll(buildSeed()), [replaceAll]);
  const startEmpty = useCallback(() => replaceAll({ ...emptyState(), initialized: true }), [replaceAll]);
  const retrySave = useCallback(() => {
    queueDiff(stateRef.current, true);
    schedule();
  }, [schedule]);

  // Warn before closing with unsaved work.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (pending.current.size || flushing.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  const value = useMemo<Store>(
    () => ({ state, ready, backend, saveState, saveError, loadError, mutate, upsert, patch, remove, setSingleton, setText, seed, startEmpty, replaceAll, retrySave }),
    [state, ready, backend, saveState, saveError, loadError, mutate, upsert, patch, remove, setSingleton, setText, seed, startEmpty, replaceAll, retrySave],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ------------------------------------------------------------------ */
/* Backup                                                              */
/* ------------------------------------------------------------------ */

export function exportBackup(s: AppState): string {
  return JSON.stringify({ app: "masters-application-os", schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), docs: toDocs(s), texts: s.texts }, null, 2);
}

export function parseBackup(json: string): Result<AppState> {
  try {
    const raw = JSON.parse(json);
    if (raw?.app !== "masters-application-os" || typeof raw.docs !== "object") return { ok: false, errors: { _: "This file is not a Master's Application OS backup." } };
    const s = fromDocs(raw.docs, raw.texts ?? {});
    s.initialized = true;
    return { ok: true, value: s };
  } catch {
    return { ok: false, errors: { _: "The file could not be read as JSON." } };
  }
}
