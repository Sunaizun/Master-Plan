/* Unit tests for the pure logic: readiness, IELTS rounding, money, alerts, seed integrity. */
import assert from "node:assert/strict";
import {
  allEvents,
  alerts,
  convert,
  ieltsOverall,
  nextImportantDeadline,
  overallReadiness,
  programReadiness,
  readinessOf,
  scholarshipProgress,
  setToday,
  sumIn,
  taskDisplayStatus,
  topTasksNextDays,
  toICS,
  wordCount,
} from "../src/lib/calc";
import { buildSeed } from "../src/lib/seed";
import { COLLECTION_SCHEMAS, RequirementSchema, SettingsSchema, type AppState } from "../src/lib/types";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

setToday("2026-10-29");

test("IELTS overall uses official half-band rounding", () => {
  assert.equal(ieltsOverall(6.5, 6.5, 5, 7), 6.5); // 6.25 → 6.5
  assert.equal(ieltsOverall(6.5, 6.5, 5.5, 7), 6.5); // 6.375 → 6.5
  assert.equal(ieltsOverall(7, 7, 6.5, 7), 7); // 6.875 → 7.0
  assert.equal(ieltsOverall(6, 6, 6, 6.5), 6); // 6.125 → 6.0
  assert.equal(ieltsOverall(8, 8, 7.5, 7), 7.5); // 7.625 → 7.5
  assert.equal(ieltsOverall(6, null, 6, 6), null);
});

test("unverified completed requirements never count toward readiness", () => {
  const base = RequirementSchema.parse({ id: "r1", programId: "p", category: "academic", title: "x", required: "required" });
  const r = readinessOf([
    { ...base, id: "a", myStatus: "complete", verified: true },
    { ...base, id: "b", myStatus: "complete", verified: false },
    { ...base, id: "c", myStatus: "not_started", verified: true },
    { ...base, id: "d", required: "not_required", myStatus: "complete", verified: true },
    { ...base, id: "e", required: "optional", myStatus: "not_started" },
    { ...base, id: "f", myStatus: "not_applicable" },
  ]);
  assert.equal(r.total, 3);
  assert.equal(r.done, 1);
  assert.equal(r.pct, 33);
  assert.equal(r.completeButUnverified, 1);
});

test("money conversion refuses to guess missing rates", () => {
  const s = SettingsSchema.parse({});
  assert.equal(convert(100, "USD", "KZT", s), null);
  const s2 = SettingsSchema.parse({ kztPerUsd: 500, kztPerGbp: 650 });
  assert.equal(convert(100, "USD", "KZT", s2), 50000);
  assert.equal(convert(650, "KZT", "GBP", s2), 1);
  const sum = sumIn([{ amount: 100, currency: "USD" }, { amount: 1000, currency: "KZT" }], "KZT", s);
  assert.equal(sum.total, 1000);
  assert.deepEqual(sum.unconverted, { USD: 100 });
});

test("seed data passes its own schemas and links are consistent", () => {
  const s: AppState = buildSeed();
  for (const [k, schema] of Object.entries(COLLECTION_SCHEMAS)) {
    for (const item of (s as any)[k]) assert.ok(schema.safeParse(item).success, `${k} ${item.id} invalid`);
  }
  assert.equal(s.programs.length, 6);
  const ids = new Set(s.requirements.map((r) => r.id));
  assert.equal(ids.size, s.requirements.length, "requirement ids unique");
  for (const t of s.tasks) {
    if (t.requirementId) assert.ok(ids.has(t.requirementId), `task ${t.id} links missing requirement ${t.requirementId}`);
    for (const d of t.dependsOn) assert.ok(s.tasks.some((x) => x.id === d), `task ${t.id} depends on missing ${d}`);
    for (const p of t.programIds) assert.ok(s.programs.some((x) => x.id === p));
  }
  for (const r of s.requirements) {
    if (r.documentId) assert.ok(s.documents.some((d) => d.id === r.documentId), `req ${r.id} doc missing`);
    if (r.verified) assert.ok(r.sourceUrl, `verified req ${r.id} lacks a source`);
  }
  for (const r of s.scholarRules) {
    assert.ok(r.sourceUrl, `rule ${r.id} lacks a source`);
    if (r.verified) assert.ok(r.lastVerified, `rule ${r.id} lacks last-verified date`);
  }
});

test("Cardiff GPA row is the only seeded complete+verified GPA", () => {
  const s = buildSeed();
  const gpaDone = s.requirements.filter((r) => r.title.startsWith("Minimum GPA") && r.myStatus === "complete" && r.verified);
  assert.deepEqual(gpaDone.map((r) => r.programId), ["p_card"]);
});

test("dashboard calculations work on seed", () => {
  const s = buildSeed();
  const o = overallReadiness(s);
  assert.ok(o >= 0 && o < 100);
  const next = nextImportantDeadline(s);
  assert.ok(next, "has a next deadline");
  assert.equal(next!.date, "2026-11-03"); // Manchester eligibility check task (high priority)
  assert.ok(programReadiness(s, "p_card").pct > programReadiness(s, "p_man").pct);
  const top = topTasksNextDays(s);
  assert.equal(top.length, 3);
  assert.ok(top.every((t) => t.dependsOn.length === 0 || t.dependsOn.every((d) => s.tasks.find((x) => x.id === d)?.status === "complete")));
  assert.ok(scholarshipProgress(s).unverified > 0);
});

test("dependencies show as blocked; completion unblocks", () => {
  const s = buildSeed();
  const book = s.tasks.find((t) => t.id === "t_ielts_book")!;
  assert.equal(taskDisplayStatus(book, s.tasks), "blocked");
  const tasks = s.tasks.map((t) => (t.id === "t_ielts_diag" ? { ...t, status: "complete" as const } : t));
  assert.equal(taskDisplayStatus(book, tasks), "not_started");
});

test("alerts include upcoming Manchester stage deadline and missing docs", () => {
  const s = buildSeed();
  const a = alerts(s);
  assert.ok(a.some((x) => x.title.includes("Manchester")), "Manchester alert");
  assert.ok(a.some((x) => x.id === "missing-docs"));
  assert.ok(a.some((x) => x.id === "ielts-date"));
  setToday("2026-11-20");
  assert.ok(alerts(s).some((x) => x.level === "critical" && x.title.startsWith("Overdue")));
  setToday("2026-10-29");
});

test("ICS export produces valid all-day events", () => {
  const s = buildSeed();
  const ics = toICS(allEvents(s).slice(0, 3));
  assert.ok(ics.startsWith("BEGIN:VCALENDAR"));
  assert.ok(ics.includes("DTSTART;VALUE=DATE:"));
  assert.ok(ics.trim().endsWith("END:VCALENDAR"));
});

test("word count", () => {
  assert.equal(wordCount("  I want to study\nmachine learning. "), 6);
  assert.equal(wordCount(""), 0);
});

console.log(`\n${passed} tests passed`);
