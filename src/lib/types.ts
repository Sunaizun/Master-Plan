import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Shared enums                                                        */
/* ------------------------------------------------------------------ */

export const STATUS = [
  "not_started",
  "in_progress",
  "waiting",
  "needs_verification",
  "blocked",
  "complete",
  "not_applicable",
] as const;
export type Status = (typeof STATUS)[number];
/** Overdue is never stored; it is derived from a deadline + status. */
export type DisplayStatus = Status | "overdue";

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  waiting: "Waiting on others",
  needs_verification: "Needs verification",
  blocked: "Blocked",
  complete: "Complete",
  not_applicable: "Not applicable",
  overdue: "Overdue",
};

export const PRIORITY = ["high", "medium", "low"] as const;
export type Priority = (typeof PRIORITY)[number];

export const CURRENCIES = ["KZT", "USD", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
  .or(z.literal(""))
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

const url = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Enter a full link starting with https://")
  .optional()
  .default("");

const money = z
  .union([z.number(), z.string()])
  .nullable()
  .optional()
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/[ ,]/g, ""));
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a positive number" });
      return z.NEVER;
    }
    return n;
  });

const band = z
  .union([z.number(), z.string()])
  .nullable()
  .optional()
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 9 || Math.round(n * 2) !== n * 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "IELTS bands run 0–9 in steps of 0.5" });
      return z.NEVER;
    }
    return n;
  });

const id = z.string().min(1);
const req = (label: string) => z.string().trim().min(1, `${label} is required`);

/* ------------------------------------------------------------------ */
/* Entities                                                            */
/* ------------------------------------------------------------------ */

export const ProfileSchema = z.object({
  fullName: z.string().default(""),
  university: z.string().default(""),
  degree: z.string().default(""),
  graduation: z.string().default(""),
  gpa: z.string().default(""),
  mobility: z.string().default(""),
  experience: z.string().default(""),
  projects: z.string().default(""),
  skills: z.string().default(""),
  interests: z.string().default(""),
  goals: z.string().default(""),
  destinations: z.string().default(""),
  sequence: z.string().default(""),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const UniversitySchema = z.object({
  id,
  name: req("University name"),
  country: req("Country"),
  city: z.string().default(""),
  website: url,
  notes: z.string().default(""),
});
export type University = z.infer<typeof UniversitySchema>;

export const ELIGIBILITY = ["meets", "borderline", "below", "unknown"] as const;
export const SUBMISSION = ["not_started", "in_progress", "submitted", "withdrawn"] as const;
export const DECISION = [
  "none",
  "pending",
  "conditional_offer",
  "unconditional_offer",
  "waitlisted",
  "rejected",
  "accepted",
  "declined",
] as const;
export const BOLASHAK_LIST = ["listed", "listed_check", "not_listed", "not_applicable", "unknown"] as const;
export const FIT = ["stronger", "ambitious", "unclear"] as const;

export const ProgramSchema = z.object({
  id,
  universityId: id,
  name: req("Program name"),
  programUrl: url,
  admissionsUrl: url,
  intake: z.string().default(""),
  duration: z.string().default(""),
  openingDate: isoDate,
  openingNote: z.string().default(""),
  deadline: isoDate,
  deadlineType: z.enum(["final", "priority", "rolling", "staged", "unknown"]).default("unknown"),
  deadlineNote: z.string().default(""),
  targetDate: isoDate,
  appFee: money,
  appFeeCurrency: z.enum(CURRENCIES).default("USD"),
  appFeeNote: z.string().default(""),
  tuition: money,
  tuitionCurrency: z.enum(CURRENCIES).default("USD"),
  tuitionNote: z.string().default(""),
  livingEstimate: money,
  ieltsReq: z.string().default(""),
  gpaReq: z.string().default(""),
  prerequisites: z.string().default(""),
  greReq: z.string().default(""),
  documentsReq: z.string().default(""),
  lorReq: z.string().default(""),
  sopReq: z.string().default(""),
  cvReq: z.string().default(""),
  funding: z.string().default(""),
  sopWordLimit: z
    .union([z.number(), z.string()])
    .nullable()
    .optional()
    .transform((v) => (v === "" || v === null || v === undefined ? null : Math.max(0, Math.round(Number(v)) || 0))),
  fitScore: z.number().min(0).max(5).default(3),
  fit: z.enum(FIT).default("unclear"),
  fitEvidence: z.string().default(""),
  eligibility: z.enum(ELIGIBILITY).default("unknown"),
  eligibilityNote: z.string().default(""),
  submission: z.enum(SUBMISSION).default("not_started"),
  submittedOn: isoDate,
  decision: z.enum(DECISION).default("none"),
  decisionOn: isoDate,
  bolashakList: z.enum(BOLASHAK_LIST).default("unknown"),
  bolashakNote: z.string().default(""),
  portalUrl: url,
  notes: z.string().default(""),
  archived: z.boolean().default(false),
  lastReviewed: isoDate,
});
export type Program = z.infer<typeof ProgramSchema>;

export const REQ_CATEGORY = ["academic", "english", "materials", "financial"] as const;
export type ReqCategory = (typeof REQ_CATEGORY)[number];
export const REQ_CATEGORY_LABEL: Record<ReqCategory, string> = {
  academic: "Academic eligibility",
  english: "English proficiency",
  materials: "Application materials",
  financial: "Financial & scholarship",
};
export const REQUIRED = ["required", "conditional", "optional", "not_required", "unknown"] as const;
export const REQUIRED_LABEL: Record<(typeof REQUIRED)[number], string> = {
  required: "Required",
  conditional: "If applicable",
  optional: "Optional",
  not_required: "Not required",
  unknown: "Unknown",
};

export const RequirementSchema = z.object({
  id,
  programId: id,
  category: z.enum(REQ_CATEGORY),
  title: req("Requirement"),
  required: z.enum(REQUIRED).default("unknown"),
  officialValue: z.string().default(""),
  myStatus: z.enum(STATUS).default("not_started"),
  verified: z.boolean().default(false),
  verifiedOn: isoDate,
  deadline: isoDate,
  documentId: z.string().nullable().optional().transform((v) => v || null),
  evidence: z.string().default(""),
  sourceUrl: url,
  notes: z.string().default(""),
  order: z.number().default(0),
});
export type Requirement = z.infer<typeof RequirementSchema>;

export const TASK_CATEGORY = [
  "ielts",
  "application",
  "documents",
  "recommendations",
  "verification",
  "scholarship",
  "academics",
  "finance",
  "other",
] as const;
export const TASK_CATEGORY_LABEL: Record<(typeof TASK_CATEGORY)[number], string> = {
  ielts: "IELTS",
  application: "Application",
  documents: "Documents",
  recommendations: "Recommendations",
  verification: "Verification",
  scholarship: "Scholarship",
  academics: "AITU academics",
  finance: "Finance",
  other: "Other",
};

export const TaskSchema = z.object({
  id,
  title: req("Task title"),
  description: z.string().default(""),
  programIds: z.array(z.string()).default([]),
  category: z.enum(TASK_CATEGORY).default("other"),
  priority: z.enum(PRIORITY).default("medium"),
  status: z.enum(STATUS).default("not_started"),
  startDate: isoDate,
  deadline: isoDate,
  estHours: z
    .union([z.number(), z.string()])
    .nullable()
    .optional()
    .transform((v) => (v === "" || v === null || v === undefined ? null : Math.max(0, Number(v) || 0))),
  completedAt: isoDate,
  dependsOn: z.array(z.string()).default([]),
  requirementId: z.string().nullable().optional().transform((v) => v || null),
  linkAction: z.enum(["none", "complete", "verify"]).default("none"),
  notes: z.string().default(""),
  link: url,
});
export type Task = z.infer<typeof TaskSchema>;

export const IeltsSettingsSchema = z.object({
  targetOverall: band,
  targetL: band,
  targetR: band,
  targetW: band,
  targetS: band,
  minimumNeeded: band,
  plannedDate: isoDate,
  registration: z.enum(["not_booked", "booked", "taken", "result_received"]).default("not_booked"),
  testCentre: z.string().default(""),
  resultDate: isoDate,
  retakeDecision: z.string().default(""),
  notes: z.string().default(""),
});
export type IeltsSettings = z.infer<typeof IeltsSettingsSchema>;

export const IeltsAttemptSchema = z.object({
  id,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required"),
  kind: z.enum(["official", "mock"]).default("mock"),
  provider: z.string().default(""),
  L: band,
  R: band,
  W: band,
  S: band,
  overall: band,
  writingFeedback: z.string().default(""),
  speakingFeedback: z.string().default(""),
  weaknesses: z.string().default(""),
  notes: z.string().default(""),
});
export type IeltsAttempt = z.infer<typeof IeltsAttemptSchema>;

export const IELTS_SECTION = ["listening", "reading", "writing", "speaking", "vocabulary", "grammar", "full"] as const;
export const PracticeLogSchema = z.object({
  id,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required"),
  activity: req("Exercise"),
  section: z.enum(IELTS_SECTION).default("listening"),
  score: z.string().default(""),
  minutes: z
    .union([z.number(), z.string()])
    .transform((v) => Math.max(0, Math.round(Number(v) || 0))),
  mistakes: z.string().default(""),
  lessons: z.string().default(""),
  nextAction: z.string().default(""),
});
export type PracticeLog = z.infer<typeof PracticeLogSchema>;

export const DOC_CATEGORY = [
  "passport",
  "transcript",
  "graduation_letter",
  "diploma",
  "ielts",
  "cv",
  "sop",
  "recommendation",
  "portfolio",
  "confirmation",
  "offer",
  "scholarship",
  "other",
] as const;
export const DOC_CATEGORY_LABEL: Record<(typeof DOC_CATEGORY)[number], string> = {
  passport: "Passport",
  transcript: "AITU transcript",
  graduation_letter: "Expected-graduation letter",
  diploma: "Final diploma",
  ielts: "IELTS result",
  cv: "CV",
  sop: "Statement of Purpose",
  recommendation: "Recommendation letter",
  portfolio: "Portfolio",
  confirmation: "Application confirmation",
  offer: "Admission offer",
  scholarship: "Scholarship document",
  other: "Other evidence",
};

export const DocVersionSchema = z.object({
  id,
  label: req("Version label"),
  createdAt: z.string(),
  stage: z.enum(["draft", "review", "revised", "final"]).default("draft"),
  wordCount: z.number().default(0),
  feedback: z.string().default(""),
  notes: z.string().default(""),
});
export type DocVersion = z.infer<typeof DocVersionSchema>;

export const DocSubmissionSchema = z.object({
  programId: id,
  versionId: z.string().nullable().default(null),
  submittedOn: isoDate,
});

export const DocumentSchema = z.object({
  id,
  name: req("Document name"),
  category: z.enum(DOC_CATEGORY).default("other"),
  status: z.enum(STATUS).default("not_started"),
  issueDate: isoDate,
  expiryDate: isoDate,
  language: z.string().default(""),
  translationRequired: z.boolean().default(false),
  notarizationRequired: z.boolean().default(false),
  translationNote: z.string().default(""),
  programIds: z.array(z.string()).default([]),
  filePath: z.string().default(""),
  fileLink: url,
  assetId: z.string().default(""),
  assetName: z.string().default(""),
  notes: z.string().default(""),
  versions: z.array(DocVersionSchema).default([]),
  finalVersionId: z.string().nullable().default(null),
  submissions: z.array(DocSubmissionSchema).default([]),
});
export type Doc = z.infer<typeof DocumentSchema>;

export const RecommenderSchema = z.object({
  id,
  name: req("Name"),
  position: z.string().default(""),
  institution: z.string().default(""),
  relationship: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  notes: z.string().default(""),
});
export type Recommender = z.infer<typeof RecommenderSchema>;

export const REC_STATUS = [
  "not_requested",
  "requested",
  "agreed",
  "declined",
  "in_progress",
  "submitted",
  "confirmed",
] as const;
export const REC_STATUS_LABEL: Record<(typeof REC_STATUS)[number], string> = {
  not_requested: "Not requested",
  requested: "Requested",
  agreed: "Agreed",
  declined: "Declined",
  in_progress: "Writing",
  submitted: "Submitted",
  confirmed: "Submission confirmed",
};
export const RecRequestSchema = z.object({
  id,
  recommenderId: id,
  programId: id,
  status: z.enum(REC_STATUS).default("not_requested"),
  requestDate: isoDate,
  deadline: isoDate,
  followUpDate: isoDate,
  confirmedOn: isoDate,
  notes: z.string().default(""),
});
export type RecRequest = z.infer<typeof RecRequestSchema>;

export const BolashakSettingsSchema = z.object({
  category: z.string().default(""),
  intendedCycle: z.string().default(""),
  windowOpen: isoDate,
  windowClose: isoDate,
  windowNote: z.string().default(""),
  applicationStatus: z
    .enum(["researching", "preparing", "submitted", "testing", "interview", "commission", "awarded", "not_awarded", "paused"])
    .default("researching"),
  notes: z.string().default(""),
});
export type BolashakSettings = z.infer<typeof BolashakSettingsSchema>;

export const SCHOLAR_AREA = [
  "eligibility",
  "universities",
  "admission",
  "language",
  "academic",
  "documents",
  "dates",
  "selection",
  "medical",
  "obligations",
] as const;
export const SCHOLAR_AREA_LABEL: Record<(typeof SCHOLAR_AREA)[number], string> = {
  eligibility: "Eligibility & category",
  universities: "Eligible universities",
  admission: "Admission evidence",
  language: "Language evidence",
  academic: "Academic & professional",
  documents: "Required documents",
  dates: "Dates",
  selection: "Testing & interview",
  medical: "Medical & formalities",
  obligations: "Obligations after award",
};
export const ScholarRuleSchema = z.object({
  id,
  area: z.enum(SCHOLAR_AREA),
  rule: req("Rule"),
  officialValue: z.string().default(""),
  verified: z.boolean().default(false),
  lastVerified: isoDate,
  sourceUrl: url,
  myStatus: z.enum(STATUS).default("not_started"),
  deadline: isoDate,
  documentId: z.string().nullable().optional().transform((v) => v || null),
  notes: z.string().default(""),
});
export type ScholarRule = z.infer<typeof ScholarRuleSchema>;

export const EXPENSE_CATEGORY = [
  "application_fee",
  "ielts",
  "documents",
  "translation",
  "tests",
  "deposit",
  "tuition",
  "living",
  "scholarship",
  "travel",
  "other",
] as const;
export const EXPENSE_CATEGORY_LABEL: Record<(typeof EXPENSE_CATEGORY)[number], string> = {
  application_fee: "Application fee",
  ielts: "IELTS registration / retake",
  documents: "Transcripts & documents",
  translation: "Translation & notarization",
  tests: "GRE / other tests",
  deposit: "Deposit",
  tuition: "Tuition (estimate)",
  living: "Living costs (estimate)",
  scholarship: "Scholarship-related",
  travel: "Travel & visa",
  other: "Other",
};
export const STUDY_COST_CATEGORIES = new Set(["tuition", "living"]);

export const ExpenseSchema = z.object({
  id,
  title: req("Expense"),
  category: z.enum(EXPENSE_CATEGORY).default("other"),
  programId: z.string().nullable().optional().transform((v) => v || null),
  currency: z.enum(CURRENCIES).default("KZT"),
  estimated: money,
  actual: money,
  dueDate: isoDate,
  paymentStatus: z.enum(["planned", "due", "paid", "refunded", "cancelled"]).default("planned"),
  refundable: z.enum(["yes", "no", "partial", "unknown"]).default("unknown"),
  verified: z.boolean().default(false),
  sourceUrl: url,
  notes: z.string().default(""),
});
export type Expense = z.infer<typeof ExpenseSchema>;

export const NoteSchema = z.object({
  id,
  title: req("Title"),
  body: z.string().default(""),
  programId: z.string().nullable().optional().transform((v) => v || null),
  createdAt: z.string(),
});
export type Note = z.infer<typeof NoteSchema>;

export const SourceSchema = z.object({
  id,
  programId: z.string().nullable().optional().transform((v) => v || null),
  label: req("What was checked"),
  url,
  checkedOn: isoDate,
  finding: z.string().default(""),
});
export type Source = z.infer<typeof SourceSchema>;

export const WeeklyReviewSchema = z.object({
  id, // weekStart ISO
  wins: z.string().default(""),
  blockers: z.string().default(""),
  focus: z.string().default(""),
});
export type WeeklyReview = z.infer<typeof WeeklyReviewSchema>;

export const SettingsSchema = z.object({
  displayCurrency: z.enum(CURRENCIES).default("KZT"),
  kztPerUsd: money,
  kztPerGbp: money,
  ratesUpdatedOn: isoDate,
  ratesSource: z.string().default(""),
  applicationBudgetKzt: money,
  warnDays: z.number().min(1).max(90).default(14),
  weekStartsMonday: z.boolean().default(true),
});
export type Settings = z.infer<typeof SettingsSchema>;

/* ------------------------------------------------------------------ */
/* Whole state                                                         */
/* ------------------------------------------------------------------ */

export interface AppState {
  initialized: boolean;
  profile: Profile;
  universities: University[];
  programs: Program[];
  requirements: Requirement[];
  tasks: Task[];
  ieltsSettings: IeltsSettings;
  ieltsAttempts: IeltsAttempt[];
  practiceLogs: PracticeLog[];
  documents: Doc[];
  /** SOP / CV version bodies, keyed by version id (stored separately). */
  texts: Record<string, string>;
  recommenders: Recommender[];
  recRequests: RecRequest[];
  bolashak: BolashakSettings;
  scholarRules: ScholarRule[];
  expenses: Expense[];
  notes: Note[];
  sources: Source[];
  weeklyReviews: WeeklyReview[];
  settings: Settings;
}

export type CollectionKey =
  | "universities"
  | "programs"
  | "requirements"
  | "tasks"
  | "ieltsAttempts"
  | "practiceLogs"
  | "documents"
  | "recommenders"
  | "recRequests"
  | "scholarRules"
  | "expenses"
  | "notes"
  | "sources"
  | "weeklyReviews";

export type SingletonKey = "profile" | "ieltsSettings" | "bolashak" | "settings";

export const COLLECTION_SCHEMAS = {
  universities: UniversitySchema,
  programs: ProgramSchema,
  requirements: RequirementSchema,
  tasks: TaskSchema,
  ieltsAttempts: IeltsAttemptSchema,
  practiceLogs: PracticeLogSchema,
  documents: DocumentSchema,
  recommenders: RecommenderSchema,
  recRequests: RecRequestSchema,
  scholarRules: ScholarRuleSchema,
  expenses: ExpenseSchema,
  notes: NoteSchema,
  sources: SourceSchema,
  weeklyReviews: WeeklyReviewSchema,
} as const;

export const SINGLETON_SCHEMAS = {
  profile: ProfileSchema,
  ieltsSettings: IeltsSettingsSchema,
  bolashak: BolashakSettingsSchema,
  settings: SettingsSchema,
} as const;

export function emptyState(): AppState {
  return {
    initialized: false,
    profile: ProfileSchema.parse({}),
    universities: [],
    programs: [],
    requirements: [],
    tasks: [],
    ieltsSettings: IeltsSettingsSchema.parse({}),
    ieltsAttempts: [],
    practiceLogs: [],
    documents: [],
    texts: {},
    recommenders: [],
    recRequests: [],
    bolashak: BolashakSettingsSchema.parse({}),
    scholarRules: [],
    expenses: [],
    notes: [],
    sources: [],
    weeklyReviews: [],
    settings: SettingsSchema.parse({}),
  };
}

export function newId(prefix = "x"): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${rnd}`;
}
