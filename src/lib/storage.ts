/**
 * Persistence backends.
 *
 * cloud  – the claude.ai Artifact `db` capability. Everything lives under
 *          data/users/<viewer id>/, a subtree only that signed-in viewer can
 *          read or write (not even people the page is shared with).
 * local  – this browser's localStorage (standalone file, or when the cloud
 *          store is unavailable).
 *
 * Layout (one JSON document per key, so a single write never rewrites
 * everything):  meta, profile, settings, ieltsSettings, bolashak, tasks,
 * programs, ..., req.<programId> (requirements chunked per programme),
 * and text bodies at texts/v/<versionId>.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type BackendKind = "cloud" | "local";

export interface FileRef {
  id: string;
  url: string;
}

export interface Backend {
  kind: BackendKind;
  /** Short explanation shown in Settings. */
  description: string;
  loadAll(): Promise<{ docs: Record<string, any>; texts: Record<string, string> }>;
  save(key: string, value: any): Promise<void>;
  remove(key: string): Promise<void>;
  saveText(id: string, text: string): Promise<void>;
  removeText(id: string): Promise<void>;
  /** File storage (cloud only, editors only). */
  files: null | {
    upload(file: File): Promise<FileRef>;
    remove(id: string): Promise<void>;
    url(id: string): string;
  };
  /** Offer a generated file to the viewer. Returns false if unavailable/declined. */
  download(filename: string, data: string): Promise<boolean>;
}

const LS_PREFIX = "masters-os:v1:";

function lsGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function lsSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch (e) {
    throw new Error("This browser blocked local storage, so changes cannot be saved here.");
  }
}
function lsRemove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function localBackend(reason = ""): Backend {
  return {
    kind: "local",
    description:
      "Saved in this browser only." + (reason ? ` ${reason}` : "") + " Export a backup regularly from Settings.",
    async loadAll() {
      const docs: Record<string, any> = {};
      const texts: Record<string, string> = {};
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (!k || !k.startsWith(LS_PREFIX)) continue;
          const sub = k.slice(LS_PREFIX.length);
          const raw = lsGet(k);
          if (raw === null) continue;
          if (sub.startsWith("text:")) texts[sub.slice(5)] = raw;
          else docs[sub] = JSON.parse(raw);
        }
      } catch {
        /* storage blocked: start empty */
      }
      return { docs, texts };
    },
    async save(key, value) {
      lsSet(LS_PREFIX + key, JSON.stringify(value));
    },
    async remove(key) {
      lsRemove(LS_PREFIX + key);
    },
    async saveText(id, text) {
      lsSet(LS_PREFIX + "text:" + id, text);
    },
    async removeText(id) {
      lsRemove(LS_PREFIX + "text:" + id);
    },
    files: null,
    async download(filename, data) {
      // Works in a normal browser tab (standalone file). Inside sandboxed frames it is inert.
      try {
        const blob = new Blob([data], { type: "application/octet-stream" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(a.href);
          a.remove();
        }, 500);
        return window.top === window.self;
      } catch {
        return false;
      }
    },
  };
}

type ClaudeGlobal = { use: (name: string) => Promise<any> };

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

/** Segment-safe key for db paths. */
function seg(key: string) {
  return key.replace(/[^A-Za-z0-9_\-.~:@+]/g, "_");
}

export async function detectBackend(): Promise<Backend> {
  const forceLocal = (import.meta as any).env?.VITE_FORCE_LOCAL_STORAGE === "true";
  const claude: ClaudeGlobal | undefined = (window as any).claude;
  if (forceLocal || !claude || typeof claude.use !== "function") return localBackend();

  const [db, user, assets, downloads] = await Promise.all([
    withTimeout(claude.use("db"), 11000),
    withTimeout(claude.use("user"), 11000),
    withTimeout(claude.use("assets"), 11000),
    withTimeout(claude.use("downloads"), 11000),
  ]);
  const downloadFn = async (filename: string, data: string) => {
    if (!downloads) return false;
    try {
      const res = await downloads.save({ filename, data });
      return !!res && res.saved !== false;
    } catch {
      return false;
    }
  };

  if (!db || !user) {
    const b = localBackend("Sign in to claude.ai to sync across devices.");
    b.download = downloadFn;
    return b;
  }
  let uid: string | null = null;
  try {
    uid = await user.id();
  } catch {
    uid = null;
  }
  if (!uid) {
    const b = localBackend("Your claude.ai account could not be identified for private storage.");
    b.download = downloadFn;
    return b;
  }
  const base = `data/users/${uid}`;
  const textCol = () => db.doc(`${base}/texts`).collection("v");

  async function call<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e: any) {
      if (e?.code === "unavailable") {
        await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
        return fn();
      }
      throw e;
    }
  }

  return {
    kind: "cloud",
    description:
      "Synced to your claude.ai account. Stored in a private area of this page that only you can read, even if you share the page.",
    async loadAll() {
      const docs: Record<string, any> = {};
      const texts: Record<string, string> = {};
      const snap = await call(() => db.collection(base).get());
      for (const d of (snap as any).docs) {
        if (d.id === "texts") continue;
        docs[d.data().__key ?? d.id] = d.data().value;
      }
      const ts = await call(() => textCol().get());
      for (const d of (ts as any).docs) texts[d.id] = String(d.data().text ?? "");
      return { docs, texts };
    },
    async save(key, value) {
      await call(() => db.doc(`${base}/${seg(key)}`).set({ __key: key, value }));
    },
    async remove(key) {
      await call(() => db.doc(`${base}/${seg(key)}`).delete());
    },
    async saveText(id, text) {
      await call(() => textCol().doc(seg(id)).set({ text }));
    },
    async removeText(id) {
      await call(() => textCol().doc(seg(id)).delete());
    },
    files: assets
      ? {
          async upload(file: File) {
            const r = await assets.upload(file);
            return { id: r.id, url: r.url };
          },
          async remove(id: string) {
            await assets.delete(id);
          },
          url(id: string) {
            return "/_blob/" + id;
          },
        }
      : null,
    download: downloadFn,
  };
}

export function describeDbError(e: any): string {
  switch (e?.code) {
    case "quota_exceeded":
      return "Storage is full. Delete old practice logs or document versions, then try again.";
    case "resource_exhausted":
      return "Too many saves at once. Your changes will retry in a moment.";
    case "invalid_argument":
      return "A record was too large to save (over 256 KB). Shorten long notes or split them.";
    case "revoked":
    case "not_granted":
      return "Access to storage was withdrawn for this view. Reload the page.";
    default:
      return e?.message || "Saving failed. Check your connection; changes will retry.";
  }
}
