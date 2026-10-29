/**
 * Starter workspace for the owner's master's application journey.
 *
 * Every requirement value below is either:
 *   - verified: read on an official page on VERIFIED_ON (source URL attached), or
 *   - verified: false: unknown, conflicting, or only seen on a third-party site.
 * Unverified rows never count toward readiness.
 *
 * Planning dates (target submission dates, task deadlines) are internal
 * choices, not official facts, and are labelled that way in the UI.
 */
import {
  type AppState,
  type Doc,
  type Expense,
  type Program,
  type Recommender,
  type RecRequest,
  type Requirement,
  type ScholarRule,
  type Source,
  type Task,
  type University,
  BolashakSettingsSchema,
  DocumentSchema,
  ExpenseSchema,
  IeltsSettingsSchema,
  ProfileSchema,
  ProgramSchema,
  RequirementSchema,
  SettingsSchema,
  TaskSchema,
  emptyState,
} from "./types";

export const VERIFIED_ON = "2026-10-29";

const SRC = {
  nuProgram: "https://scai.nu.edu.kz/msc-cs",
  nuAdmissions: "https://admissions.nu.edu.kz",
  nuCycle:
    "https://nu.edu.kz/announcement/online-application-for-the-nu-masters-programs-and-doctor-of-medicine-program-for-the-2026-2027-academic-year-is-open/",
  nuPolicy:
    "https://regulations.nu.edu.kz/bitstream/123456789/1213/1/Admission%20Policy%20and%20Procedures%20to%20Master%e2%80%99s%20programs%20at%20the%20autonomous%20organization%20of%20education%20Nazarbayev%20University.pdf",
  ubProgram: "https://engineering.buffalo.edu/computer-science-engineering/graduate/degrees-and-programs/ms-in-computer-science-and-engineering",
  ubAdmissions: "https://engineering.buffalo.edu/computer-science-engineering/graduate/admissions.html",
  ubMaterials: "https://engineering.buffalo.edu/computer-science-engineering/graduate/admissions/application-materials.html",
  ubAggregator: "https://www.mastersportal.com/studies/138433/computer-science-and-engineering.html",
  asuAdmissions: "https://scai.engineering.asu.edu/graduate-admissions/",
  asuHandbook: "https://scai.engineering.asu.edu/wp-content/uploads/sites/31/2026/06/AI-MS-Handbook-2026-2027.pdf",
  sotonProgram: "https://www.southampton.ac.uk/courses/machine-learning-masters-msc",
  sotonKz: "https://www.southampton.ac.uk/international/entry-qualification-equivalencies/kazakhstan",
  manProgram: "https://www.manchester.ac.uk/study/masters/courses/list/21576/msc-machine-learning/",
  manEntry: "https://www.manchester.ac.uk/study/masters/courses/list/21576/msc-machine-learning/entry-requirements/",
  manKz: "https://www.manchester.ac.uk/study/international/country-specific-information/kazakhstan/entry-requirements/",
  cardProgram: "https://www.cardiff.ac.uk/study/postgraduate/taught/courses/course/ai-plus-data-science-msc",
  cardKz: "https://www.cardiff.ac.uk/study/international/your-country/asia/kazakhstan/entry-requirements",
  cardKzCampus: "https://www.cardiff.ac.uk/kazakhstan/courses/ai-data-science-msc",
  bolRules: "https://bolashak.gov.kz/en/pretendentu/pravila",
  bolList: "https://www.bolashak.gov.kz/storage/app/media/pretendentu--vuzy/vuzy_bolashak_2026_rus.pdf",
  bolWindow2026: "https://digitalbusiness.kz/2026-03-16/v-kazahstane-nachalsya-priem-zayavok-na-bolashak-skolko-stipendiy-videlyat-v-2026-godu/",
  egovService: "https://egov.kz/cms/ru/services/higher_education/184pass_mon",
};

/* ------------------------------------------------------------------ */
/* Universities & programs                                             */
/* ------------------------------------------------------------------ */

const universities: University[] = [
  { id: "u_nu", name: "Nazarbayev University", country: "Kazakhstan", city: "Astana", website: "https://nu.edu.kz", notes: "Backup option at home. Not a Bolashak route (Bolashak funds study abroad); funding is through NU's own grants." },
  { id: "u_ub", name: "University at Buffalo (SUNY)", country: "United States", city: "Buffalo, NY", website: "https://www.buffalo.edu", notes: "" },
  { id: "u_asu", name: "Arizona State University", country: "United States", city: "Tempe, AZ", website: "https://www.asu.edu", notes: "" },
  { id: "u_soton", name: "University of Southampton", country: "United Kingdom", city: "Southampton", website: "https://www.southampton.ac.uk", notes: "" },
  { id: "u_man", name: "University of Manchester", country: "United Kingdom", city: "Manchester", website: "https://www.manchester.ac.uk", notes: "" },
  { id: "u_card", name: "Cardiff University", country: "United Kingdom", city: "Cardiff", website: "https://www.cardiff.ac.uk", notes: "Cardiff also runs a part-time AI + Data Science MSc at its Kazakhstan campus (different programme and fees)." },
];

const P = (p: Partial<Program> & Pick<Program, "id" | "universityId" | "name">): Program => ProgramSchema.parse(p);

const programs: Program[] = [
  P({
    id: "p_nu",
    universityId: "u_nu",
    name: "MSc in Computer Science",
    programUrl: SRC.nuProgram,
    admissionsUrl: SRC.nuAdmissions,
    intake: "Fall 2027 (August)",
    duration: "2 years, 96 ECTS, full-time, in English",
    openingDate: null,
    openingNote: "Needs verification. The 2026–27 cycle was announced open on 7 Nov 2025, so the 2027–28 cycle may open around November 2026.",
    deadline: null,
    deadlineType: "unknown",
    deadlineNote: "Needs verification. For 2026–27, grant applicants had to apply by 13 Feb 2026 (2 pm Astana).",
    targetDate: "2027-01-31",
    appFee: 15000,
    appFeeCurrency: "KZT",
    appFeeNote: "15,000 KZT regular / 45,000 KZT late in the 2026–27 cycle. Confirm for 2027–28.",
    tuition: null,
    tuitionCurrency: "KZT",
    tuitionNote: "Needs verification. Grant (state-funded) places exist; amounts not published on the programme page.",
    ieltsReq: "Set in the programme's Minimum Admission Requirements (MAR). Needs verification. Only in-person IELTS (not IELTS Online) is accepted.",
    gpaReq: "Not stated in the general policy. Check the CS programme MAR.",
    prerequisites: "Needs verification.",
    greReq: "Not mentioned in the general policy. Check the CS programme MAR.",
    documentsReq: "Documents listed in the programme MAR; final transcript and diploma verified by an approved method. Final-year students can be admitted conditionally.",
    lorReq: "Needs verification.",
    sopReq: "Needs verification.",
    cvReq: "Needs verification.",
    funding: "NU grants for master's applicants (separate, earlier deadline in 2026–27).",
    fit: "unclear",
    fitScore: 3,
    fitEvidence: "Programme-specific requirements (MAR) were not found online. NU's policy (effective 5 Mar 2026) allows conditional admission for final-year students, which suits a June 2027 graduation.",
    eligibility: "unknown",
    eligibilityNote: "Final-year students may apply (policy clause 3.1.2).",
    bolashakList: "not_applicable",
    bolashakNote: "Not on the Bolashak 2024–2026 list of recommended universities. Bolashak funds study abroad.",
  }),
  P({
    id: "p_ub",
    universityId: "u_ub",
    name: "MS in Computer Science and Engineering",
    programUrl: SRC.ubProgram,
    admissionsUrl: SRC.ubAdmissions,
    intake: "Fall 2027 (late August)",
    duration: "Needs verification",
    deadline: "2026-12-15",
    deadlineType: "priority",
    deadlineNote: "15 Dec = priority consideration for Fall; 1 May listed for international applicants; rolling. The page does not state the year: confirm these apply to Fall 2027.",
    targetDate: "2026-12-12",
    appFee: 100,
    appFeeCurrency: "USD",
    appFeeNote: "Non-refundable; official page says $100 for Spring 2025 or later.",
    tuition: 25740,
    tuitionCurrency: "USD",
    tuitionNote: "Third-party estimate (Mastersportal) for non-residents. Needs verification on buffalo.edu.",
    ieltsReq: "IELTS 6.5 overall. No band minimums listed. Results must be within two years of the admission date.",
    gpaReq: "Not stated on the official CSE pages. A third-party site lists 3.0. Needs verification.",
    prerequisites: "Needs verification.",
    greReq: "Not required.",
    documentsReq: "Online application, $100 fee, resume/CV, statement of purpose, unofficial transcripts for review (official on offer), two recommendation letters, English test.",
    lorReq: "Two letters.",
    sopReq: "Required. No word limit.",
    cvReq: "Required (education, employment, internships, research).",
    funding: "Needs verification. MS funding is typically limited; ask the department.",
    sopWordLimit: null,
    fit: "unclear",
    fitScore: 4,
    fitEvidence: "IELTS 6.5 and no GRE are confirmed on official pages. The GPA minimum is not published officially, and the Bolashak list placement (#406) sits in a section whose category could not be confirmed.",
    eligibility: "unknown",
    bolashakList: "listed_check",
    bolashakNote: "Listed as No. 406 in the Bolashak 2024–2026 list. Entries from No. 271 onward may be in a section restricted to certain specialties. Confirm that Computer Science qualifies.",
  }),
  P({
    id: "p_asu",
    universityId: "u_asu",
    name: "MS in Artificial Intelligence",
    programUrl: SRC.asuHandbook,
    admissionsUrl: SRC.asuAdmissions,
    intake: "Fall 2027 (August)",
    duration: "30 credit hours",
    deadline: "2026-12-15",
    deadlineType: "final",
    deadlineNote: "15 Dec for Fall in the 2026–27 handbook and SCAI admissions page. Confirm for Fall 2027.",
    targetDate: "2026-12-12",
    appFee: null,
    appFeeCurrency: "USD",
    appFeeNote: "Amount not stated on SCAI pages; non-refundable. Needs verification.",
    tuition: null,
    tuitionCurrency: "USD",
    tuitionNote: "Needs verification.",
    ieltsReq: "Conflicting: handbook says 6.5; SCAI FAQ says an average of 7. Needs verification. Scores valid two years from start date.",
    gpaReq: "3.25 minimum in the last 60 hours of the bachelor's degree.",
    prerequisites: "CSE 310 Data Structures & Algorithms; linear algebra (MAT 242/342/343); Calculus II (MAT 266/271). Missing ones become deficiency courses (grade B or higher, not counted toward the degree).",
    greReq: "Not required; considered if submitted.",
    documentsReq: "Official transcripts, statement of purpose (1–2 pages), recommendation letters (number unclear), resume optional.",
    lorReq: "Unclear: one SCAI section says letters are PhD-only, another FAQ says three. Needs verification.",
    sopReq: "1–2 pages; focus on intended area and academic background.",
    cvReq: "Optional; encouraged if seeking an RA position.",
    funding: "Fee waivers only for PhD. Ask about RA/TA positions.",
    fit: "ambitious",
    fitScore: 5,
    fitEvidence: "Best ML/AI fit on paper. Your 3.27 cumulative GPA is only just above the 3.25 threshold, which applies to the last 60 hours (not yet calculated). IELTS requirement is inconsistent across official pages.",
    eligibility: "borderline",
    eligibilityNote: "Calculate GPA over your last 60 credit hours.",
    bolashakList: "listed",
    bolashakNote: "Listed as No. 214 in the Bolashak 2024–2026 list (first section, all specialties).",
  }),
  P({
    id: "p_soton",
    universityId: "u_soton",
    name: "MSc Machine Learning",
    programUrl: SRC.sotonProgram,
    admissionsUrl: SRC.sotonProgram,
    intake: "September 2027",
    duration: "1 year, full-time (Highfield campus)",
    deadline: "2027-08-18",
    deadlineType: "final",
    deadlineNote: "International deadline midday UK time; may close earlier if places fill.",
    targetDate: "2027-02-28",
    appFee: 0,
    appFeeCurrency: "GBP",
    appFeeNote: "No application fee for postgraduate courses starting in 2027.",
    tuition: 36800,
    tuitionCurrency: "GBP",
    tuitionNote: "International fee for 2027–28, plus a £2,000 deposit.",
    ieltsReq: "IELTS 6.5 overall with 6.0 in reading, writing, speaking and listening.",
    gpaReq: "UK 2:1 or equivalent. The Kazakhstan equivalence table uses a scale that does not map clearly to a 4.00 GPA. Needs verification.",
    prerequisites: "Computing, maths, physics, engineering or related degree. Linear algebra and calculus; programming experience, ideally Python.",
    greReq: "Not mentioned.",
    documentsReq: "Personal statement, two academic references, degree paperwork, IELTS.",
    lorReq: "Two academic references.",
    sopReq: "Personal statement required. Word limit not stated.",
    cvReq: "Not mentioned.",
    funding: "Spärck AI Scholarship (11 places: full tuition + £20,780 living allowance); Dean of FEPS Global Talent Award (up to 5 × £10,000).",
    fit: "unclear",
    fitScore: 5,
    fitEvidence: "Strong ML fit; IELTS 6.5/6.0 is reachable from your current preparation. The only open question is how AITU's 3.27/4.00 maps to a 2:1.",
    eligibility: "unknown",
    bolashakList: "listed",
    bolashakNote: "Listed as No. 53 in the Bolashak 2024–2026 list.",
  }),
  P({
    id: "p_man",
    universityId: "u_man",
    name: "MSc Machine Learning",
    programUrl: SRC.manProgram,
    admissionsUrl: SRC.manProgram,
    intake: "September 2027",
    duration: "12 months, full-time",
    deadline: "2026-11-06",
    deadlineType: "staged",
    deadlineNote: "Staged: 6 Nov 2026 (decision by 8 Jan), 1 Jan 2027 (by 5 Mar), 26 Feb 2027 (by 30 Apr), 21 May 2027 (by 18 Jun). Later applications only if places remain.",
    targetDate: "2026-12-28",
    appFee: 0,
    appFeeCurrency: "GBP",
    appFeeNote: "No application fee for this programme.",
    tuition: 41400,
    tuitionCurrency: "GBP",
    tuitionNote: "International fee for entry in September 2027.",
    ieltsReq: "IELTS 7.0 overall, no sub-test below 6.5 (read on the 2025-entry requirements page; confirm for 2027).",
    gpaReq: "First-class honours (70%) in Computer Science with at least 50% CS content. Kazakhstan page lists minimum GPAs of 3.4/4.0 (varies by discipline).",
    prerequisites: "Strong CS background: solid programming and software development skills.",
    greReq: "Not mentioned.",
    documentsReq: "Official transcripts; degree certificate if graduated. No references or personal statement required. CV only if graduated more than three years ago.",
    lorReq: "Not required.",
    sopReq: "Not required.",
    cvReq: "Not required for recent graduates.",
    funding: "Manchester Master's Bursaries (underrepresented groups); merit scholarships for international students.",
    fit: "ambitious",
    fitScore: 5,
    fitEvidence: "The MSc ML asks for a First (70%), and Manchester's Kazakhstan page lists 3.4/4.0 as a minimum GPA. Your 3.27 is below both published figures, so treat this as ambitious unless admissions confirms otherwise.",
    eligibility: "below",
    eligibilityNote: "3.27 < 3.4/4.0 published minimum. Ask pgt.compsci@manchester.ac.uk, or consider MSc Advanced Computer Science.",
    bolashakList: "listed",
    bolashakNote: "Listed as No. 48 in the Bolashak 2024–2026 list.",
  }),
  P({
    id: "p_card",
    universityId: "u_card",
    name: "AI + Data Science (MSc)",
    programUrl: SRC.cardProgram,
    admissionsUrl: SRC.cardProgram,
    intake: "September 2027",
    duration: "1 year, full-time (Cardiff campus)",
    deadline: "2027-08-31",
    deadlineType: "rolling",
    deadlineNote: "Applications normally close at the end of August; places allocated first-come, first-served and may close sooner.",
    targetDate: "2027-02-28",
    appFee: null,
    appFeeCurrency: "GBP",
    appFeeNote: "Not stated. Needs verification.",
    tuition: 33200,
    tuitionCurrency: "GBP",
    tuitionNote: "Overseas fee for 2026 entry (year one), plus £2,500 deposit. 2027 fee needs verification.",
    ieltsReq: "IELTS 6.5 overall with 5.5 in all subskills.",
    gpaReq: "2:2 honours degree in any subject (or relevant experience). Cardiff's Kazakhstan page: GPA 3.2/4.0 for postgraduate taught courses.",
    prerequisites: "Non-science degrees need Year 12/13 maths. A CS degree meets this.",
    greReq: "Not mentioned.",
    documentsReq: "Degree certificate and transcripts; IELTS certificate (or expected test date if pending).",
    lorReq: "Not mentioned. Needs verification.",
    sopReq: "Not mentioned. Needs verification.",
    cvReq: "Not mentioned.",
    funding: "Check Cardiff international scholarships (Vice-Chancellor's International Scholarship lists exist).",
    fit: "stronger",
    fitScore: 4,
    fitEvidence: "Your 3.27/4.00 meets Cardiff's published 3.2/4.0 threshold for Kazakhstan, the programme asks for a 2:2, and IELTS 6.5 (5.5 per skill) is the lowest bar among the UK options.",
    eligibility: "meets",
    eligibilityNote: "3.27 ≥ 3.2/4.0 (Cardiff Kazakhstan page).",
    bolashakList: "listed",
    bolashakNote: "Listed as No. 28 in the Bolashak 2024–2026 list. The Kazakhstan-campus part-time version is a different programme and is unlikely to be a Bolashak route.",
  }),
];

/* ------------------------------------------------------------------ */
/* Documents (created before requirements so rows can link to them)    */
/* ------------------------------------------------------------------ */

const D = (d: Partial<Doc> & Pick<Doc, "id" | "name" | "category">): Doc => DocumentSchema.parse(d);

const documents: Doc[] = [
  D({ id: "d_passport", name: "Passport", category: "passport", status: "needs_verification", language: "Kazakh / English", notes: "Store only the expiry date here, never the passport number. Check that validity covers your studies." }),
  D({ id: "d_transcript", name: "AITU transcript (English, official)", category: "transcript", status: "not_started", language: "English", notes: "Ask the AITU registrar for an official English transcript. US schools may need a sealed copy or evaluation; check each portal." }),
  D({ id: "d_gradletter", name: "Expected-graduation letter (AITU)", category: "graduation_letter", status: "not_started", language: "English", notes: "Confirms expected graduation in June 2027." }),
  D({ id: "d_diploma", name: "Bachelor's diploma (AITU)", category: "diploma", status: "blocked", issueDate: null, language: "Kazakh / Russian / English", notes: "Issued after graduation (June 2027). Needed for unconditional offers and for Bolashak.", translationRequired: true, notarizationRequired: true, translationNote: "Bolashak and some universities need notarized translations." }),
  D({ id: "d_ielts_old", name: "IELTS Academic result 2023 (5.5)", category: "ielts", status: "not_applicable", issueDate: "2023-10-28", expiryDate: "2025-10-28", language: "English", notes: "Most universities accept results for two years, so this result is no longer usable. Kept for history." }),
  D({ id: "d_ielts", name: "IELTS Academic result (new)", category: "ielts", status: "not_started", language: "English", notes: "Take the test in person (NU does not accept IELTS Online)." }),
  D({ id: "d_cv", name: "CV / résumé", category: "cv", status: "not_started", language: "English", notes: "Include AITU CS degree, JBNU mobility semester, Stem Academia production-practice website." }),
  D({ id: "d_sop_master", name: "Statement of Purpose — master draft", category: "sop", status: "not_started", language: "English", notes: "Base draft to tailor per programme in the SOP & CV workspace." }),
  D({ id: "d_lor", name: "Recommendation letters", category: "recommendation", status: "not_started", language: "English", notes: "Track each letter on the Recommendations page." }),
  D({ id: "d_portfolio", name: "Portfolio / GitHub", category: "portfolio", status: "not_started", language: "English", notes: "Clean up repositories; add a README for the Stem Academia project if you are allowed to share it." }),
  D({ id: "d_kaztest", name: "KAZTEST / Qazaq Resmi Test certificate (B1+)", category: "scholarship", status: "not_started", language: "Kazakh", notes: "Required for Bolashak." }),
  D({ id: "d_072u", name: "Medical certificate (form 072/u)", category: "scholarship", status: "not_started", language: "Kazakh / Russian", notes: "Required for Bolashak. Get it close to the application date." }),
  D({ id: "d_bol_motivation", name: "Bolashak motivation letter (≤500 words, KZ/RU)", category: "scholarship", status: "not_started", language: "Kazakh or Russian", notes: "Dated and signed. Used in the Independent Expert Commission interview." }),
];

/* ------------------------------------------------------------------ */
/* Requirements                                                        */
/* ------------------------------------------------------------------ */

type RS = Partial<Requirement> & { v?: boolean; src?: string };
let order = 0;
function R(programId: string, category: Requirement["category"], key: string, title: string, o: RS): Requirement {
  const { v, src, ...rest } = o;
  order += 1;
  return RequirementSchema.parse({
    id: `r_${programId.slice(2)}_${key}`,
    programId,
    category,
    title,
    order,
    verified: !!v,
    verifiedOn: v ? VERIFIED_ON : null,
    sourceUrl: src ?? "",
    ...rest,
  });
}

type Spec = Record<string, RS>;
/** Standard checklist; each programme overrides what it knows. */
function checklist(pid: string, s: Spec): Requirement[] {
  const g = (k: string): RS => s[k] ?? { required: "unknown", officialValue: "Needs verification" };
  return [
    R(pid, "academic", "bachelor", "Bachelor's degree eligibility", { documentId: "d_gradletter", ...g("bachelor") }),
    R(pid, "academic", "gpa", "Minimum GPA or degree classification", g("gpa")),
    R(pid, "academic", "courses", "Relevant undergraduate courses", g("courses")),
    R(pid, "academic", "math", "Mathematics prerequisites", g("math")),
    R(pid, "academic", "programming", "Programming prerequisites", g("programming")),
    R(pid, "academic", "experience", "Research or work experience", g("experience")),
    R(pid, "english", "ielts", "IELTS Academic overall minimum", { documentId: "d_ielts", ...g("ielts") }),
    R(pid, "english", "bands", "Minimum score for each component", g("bands")),
    R(pid, "english", "alt", "TOEFL or other accepted tests", g("alt")),
    R(pid, "english", "later", "Can IELTS be submitted after applying?", g("later")),
    R(pid, "english", "validity", "English-test validity period", g("validity")),
    R(pid, "english", "waiver", "English waiver eligibility", g("waiver")),
    R(pid, "materials", "transcript", "Official transcript", { documentId: "d_transcript", ...g("transcript") }),
    R(pid, "materials", "degree", "Degree certificate or expected-graduation letter", { documentId: "d_gradletter", ...g("degree") }),
    R(pid, "materials", "cv", "CV / résumé", { documentId: "d_cv", ...g("cv") }),
    R(pid, "materials", "sop", "Statement of Purpose", { documentId: "d_sop_master", ...g("sop") }),
    R(pid, "materials", "ps", "Personal statement (if separate)", g("ps")),
    R(pid, "materials", "lor", "Recommendation letters", { documentId: "d_lor", ...g("lor") }),
    R(pid, "materials", "passport", "Passport", { documentId: "d_passport", required: "required", officialValue: "Copy of passport bio page for the application and visa.", ...s["passport"] }),
    R(pid, "materials", "portfolio", "Portfolio / GitHub", { documentId: "d_portfolio", required: "optional", officialValue: "Not requested; useful to link in CV.", ...s["portfolio"] }),
    R(pid, "materials", "writing", "Writing sample or research proposal", g("writing")),
    R(pid, "materials", "fee", "Application fee", g("fee")),
    R(pid, "materials", "other", "Other programme-specific documents", g("other")),
    R(pid, "financial", "tuition", "Tuition estimate", g("tuition")),
    R(pid, "financial", "living", "Living-cost estimate", g("living")),
    R(pid, "financial", "funding", "Funding & assistantships", g("funding")),
    R(pid, "financial", "compat", "Scholarship compatibility", g("compat")),
    R(pid, "financial", "bolashak", "Bolashak list & documentation", g("bolashak")),
    R(pid, "financial", "deposit", "Deposit / payment deadlines", g("deposit")),
    R(pid, "financial", "funds", "Proof of funds", g("funds")),
  ];
}

const DONE_GPA = (value: string, src: string, notes = ""): RS => ({ required: "required", officialValue: value, myStatus: "complete", v: true, src, evidence: "AITU GPA 3.27/4.00", notes });

const requirements: Requirement[] = [
  ...checklist("p_nu", {
    bachelor: { required: "required", officialValue: "Final-year students or graduates may apply; conditional admission possible until the diploma is issued (≤1 year).", v: true, src: SRC.nuPolicy, myStatus: "in_progress", evidence: "AITU, graduating June 2027" },
    ielts: { required: "required", officialValue: "Set in the programme MAR. Needs verification.", src: SRC.nuPolicy, notes: "Only in-person IELTS/TOEFL (not IELTS Online / TOEFL Home Edition)." },
    alt: { required: "conditional", officialValue: "TOEFL accepted (not Home Edition), institution code 6762.", v: true, src: SRC.nuCycle },
    validity: { required: "required", officialValue: "Only valid certificates are considered.", v: true, src: SRC.nuPolicy },
    waiver: { required: "conditional", officialValue: "Exempt: degrees from English-speaking countries, English-taught degrees, NU graduates.", v: true, src: SRC.nuPolicy, notes: "Check whether AITU's English-medium instruction qualifies." },
    transcript: { required: "required", officialValue: "Final transcript verified by an approved method (e.g. sent directly by post).", v: true, src: SRC.nuPolicy },
    degree: { required: "required", officialValue: "Diploma verified by an approved method; evidence of expected completion for conditional admission.", v: true, src: SRC.nuPolicy },
    fee: { required: "required", officialValue: "15,000 KZT regular; 45,000 KZT late (2026–27 cycle).", src: SRC.nuCycle, notes: "Confirm for 2027–28." },
    other: { required: "conditional", officialValue: "Interview at the school's discretion.", v: true, src: SRC.nuPolicy },
    bolashak: { required: "not_required", officialValue: "Not on the Bolashak list; Bolashak funds study abroad.", v: true, src: SRC.bolList, myStatus: "not_applicable" },
    compat: { required: "conditional", officialValue: "NU grants for master's applicants (earlier deadline in 2026–27).", src: SRC.nuCycle },
    funds: { required: "not_required", officialValue: "Not applicable for a domestic programme.", myStatus: "not_applicable" },
    passport: { required: "conditional", officialValue: "ID card / passport for identity.", myStatus: "not_started" },
  }),
  ...checklist("p_ub", {
    bachelor: { required: "required", officialValue: "Needs verification (bachelor's in a related field expected)." },
    gpa: { required: "required", officialValue: "Not stated on official CSE pages. Third-party listing: 3.0.", src: SRC.ubAggregator, notes: "Ask easgrad-enroll@buffalo.edu." },
    ielts: { required: "required", officialValue: "6.5 overall", v: true, src: SRC.ubMaterials },
    bands: { required: "not_required", officialValue: "No individual band minimums listed.", v: true, src: SRC.ubMaterials, myStatus: "not_applicable" },
    alt: { required: "conditional", officialValue: "TOEFL iBT 79, PTE 55, Duolingo 120, CAE/CPE 185.", v: true, src: SRC.ubMaterials },
    validity: { required: "required", officialValue: "Within two years of the proposed admission date.", v: true, src: SRC.ubMaterials },
    transcript: { required: "required", officialValue: "Unofficial copies for review; official transcripts on admission.", v: true, src: SRC.ubMaterials },
    cv: { required: "required", officialValue: "Education, employment, internships, research.", v: true, src: SRC.ubMaterials },
    sop: { required: "required", officialValue: "No required length or word limit.", v: true, src: SRC.ubMaterials },
    ps: { required: "not_required", officialValue: "Only a statement of purpose is listed.", v: true, src: SRC.ubMaterials, myStatus: "not_applicable" },
    lor: { required: "required", officialValue: "Two letters.", v: true, src: SRC.ubMaterials },
    writing: { required: "not_required", officialValue: "Not listed.", v: true, src: SRC.ubMaterials, myStatus: "not_applicable" },
    fee: { required: "required", officialValue: "$100, non-refundable.", v: true, src: SRC.ubMaterials },
    other: { required: "not_required", officialValue: "GRE not required.", v: true, src: SRC.ubMaterials, myStatus: "not_applicable" },
    tuition: { required: "required", officialValue: "~$25,740/yr non-resident (third-party). Needs verification.", src: SRC.ubAggregator },
    bolashak: { required: "required", officialValue: "Listed No. 406 (2024–2026 list); section category unconfirmed.", src: SRC.bolList },
    funds: { required: "required", officialValue: "US student visa (I-20) normally needs proof of funds. Needs verification." },
  }),
  ...checklist("p_asu", {
    bachelor: { required: "required", officialValue: "CS, computer/electrical/software/mechanical engineering, math, computational biology or closely related.", v: true, src: SRC.asuHandbook, myStatus: "in_progress", evidence: "BSc Computer Science (AITU)" },
    gpa: { required: "required", officialValue: "3.25 in the last 60 hours of the first bachelor's degree.", v: true, src: SRC.asuHandbook, myStatus: "needs_verification", notes: "Cumulative is 3.27. Calculate your last-60-hours GPA." },
    courses: { required: "required", officialValue: "CSE 310 Data Structures & Algorithms (or equivalent).", v: true, src: SRC.asuHandbook },
    math: { required: "required", officialValue: "Linear algebra (MAT 242/342/343) and Calculus II (MAT 266/271).", v: true, src: SRC.asuHandbook },
    programming: { required: "unknown", officialValue: "Not listed separately in the handbook." },
    ielts: { required: "required", officialValue: "6.5 (handbook) vs average 7 (SCAI FAQ): conflicting.", src: SRC.asuHandbook, notes: "Email SCAI to confirm which applies for Fall 2027." },
    alt: { required: "conditional", officialValue: "TOEFL iBT 80 (or 4 on new scale), Duolingo 105 (handbook).", v: true, src: SRC.asuHandbook },
    validity: { required: "required", officialValue: "Valid two years from the start date.", v: true, src: SRC.asuAdmissions },
    transcript: { required: "required", officialValue: "Official transcripts from every institution attended (include JBNU).", v: true, src: SRC.asuAdmissions, notes: "JBNU mobility transcript may be needed too." },
    cv: { required: "optional", officialValue: "Not required; encouraged if seeking an RA position.", v: true, src: SRC.asuAdmissions },
    sop: { required: "required", officialValue: "About 1–2 pages: intended area and background.", v: true, src: SRC.asuHandbook },
    lor: { required: "unknown", officialValue: "Conflicting: PhD-only in one section, three letters in an FAQ.", src: SRC.asuAdmissions },
    fee: { required: "required", officialValue: "Non-refundable; amount not stated on SCAI pages.", src: SRC.asuAdmissions },
    other: { required: "not_required", officialValue: "GRE not required (considered if submitted; at-home GRE not accepted).", v: true, src: SRC.asuHandbook, myStatus: "not_applicable" },
    funding: { required: "optional", officialValue: "Fee waivers only for PhD; ask about RA/TA.", v: true, src: SRC.asuAdmissions },
    bolashak: { required: "required", officialValue: "Listed No. 214 (2024–2026 list).", v: true, src: SRC.bolList, myStatus: "in_progress" },
    funds: { required: "required", officialValue: "US student visa (I-20) normally needs proof of funds. Needs verification." },
  }),
  ...checklist("p_soton", {
    bachelor: { required: "required", officialValue: "Computing, maths, physics, engineering or related.", v: true, src: SRC.sotonProgram, myStatus: "in_progress", evidence: "BSc Computer Science (AITU)" },
    gpa: { required: "required", officialValue: "2:1 or equivalent. Kazakhstan table: 2:1 = grade 2.0–2.5 on an unnamed scale.", src: SRC.sotonKz, myStatus: "needs_verification", notes: "Ask the International Office how 3.27/4.00 maps." },
    math: { required: "required", officialValue: "Linear algebra and calculus.", v: true, src: SRC.sotonProgram },
    programming: { required: "required", officialValue: "Programming experience, ideally Python.", v: true, src: SRC.sotonProgram },
    ielts: { required: "required", officialValue: "6.5 overall", v: true, src: SRC.sotonProgram },
    bands: { required: "required", officialValue: "6.0 in each of reading, writing, speaking, listening.", v: true, src: SRC.sotonProgram },
    alt: { required: "conditional", officialValue: "Pre-sessional English programmes accepted.", v: true, src: SRC.sotonProgram },
    ps: { required: "required", officialValue: "Personal statement (word limit not stated).", v: true, src: SRC.sotonProgram },
    sop: { required: "not_required", officialValue: "A personal statement is used instead.", v: true, src: SRC.sotonProgram, myStatus: "not_applicable" },
    lor: { required: "required", officialValue: "Two academic references.", v: true, src: SRC.sotonProgram },
    degree: { required: "required", officialValue: "Paperwork showing your first degree.", v: true, src: SRC.sotonProgram },
    fee: { required: "not_required", officialValue: "No application fee for 2027 entry.", v: true, src: SRC.sotonProgram, myStatus: "not_applicable" },
    tuition: { required: "required", officialValue: "£36,800 (2027–28, international).", v: true, src: SRC.sotonProgram },
    funding: { required: "optional", officialValue: "Spärck AI Scholarship; FEPS Global Talent Award £10,000.", v: true, src: SRC.sotonProgram },
    deposit: { required: "required", officialValue: "£2,000 deposit (international full-time).", v: true, src: SRC.sotonProgram },
    bolashak: { required: "required", officialValue: "Listed No. 53 (2024–2026 list).", v: true, src: SRC.bolList, myStatus: "in_progress" },
    funds: { required: "required", officialValue: "UK Student visa normally needs evidence of funds. Needs verification." },
  }),
  ...checklist("p_man", {
    bachelor: { required: "required", officialValue: "Computer Science with ≥50% CS content.", v: true, src: SRC.manEntry, myStatus: "in_progress", evidence: "BSc Computer Science (AITU)" },
    gpa: { required: "required", officialValue: "First-class (70%) or equivalent; Kazakhstan minimum GPA 3.4/4.0 (varies by discipline).", v: true, src: SRC.manKz, myStatus: "blocked", evidence: "3.27/4.00 is below 3.4", notes: "Ask admissions whether 3.27 can be considered, or look at MSc Advanced Computer Science." },
    programming: { required: "required", officialValue: "Solid programming and software development skills.", v: true, src: SRC.manEntry },
    ielts: { required: "required", officialValue: "7.0 overall", src: SRC.manEntry, notes: "Read on the 2025-entry page; confirm for 2027." },
    bands: { required: "required", officialValue: "No sub-test below 6.5.", src: SRC.manEntry },
    alt: { required: "conditional", officialValue: "TOEFL iBT 100 (no sub-test <22); PTE 76 (no sub-test <70).", src: SRC.manEntry },
    validity: { required: "required", officialValue: "Report must be valid on the course start date.", src: SRC.manEntry },
    transcript: { required: "required", officialValue: "Official bachelor's transcripts.", v: true, src: SRC.manProgram },
    degree: { required: "conditional", officialValue: "Degree certificate if already graduated.", v: true, src: SRC.manProgram },
    cv: { required: "not_required", officialValue: "Only if graduated more than three years ago.", v: true, src: SRC.manProgram, myStatus: "not_applicable" },
    sop: { required: "not_required", officialValue: "Personal statements not required.", v: true, src: SRC.manProgram, myStatus: "not_applicable" },
    ps: { required: "not_required", officialValue: "Not required.", v: true, src: SRC.manProgram, myStatus: "not_applicable" },
    lor: { required: "not_required", officialValue: "References not required.", v: true, src: SRC.manProgram, myStatus: "not_applicable" },
    fee: { required: "not_required", officialValue: "No application fee.", v: true, src: SRC.manProgram, myStatus: "not_applicable" },
    tuition: { required: "required", officialValue: "£41,400 per year (Sept 2027, international).", v: true, src: SRC.manProgram },
    bolashak: { required: "required", officialValue: "Listed No. 48 (2024–2026 list).", v: true, src: SRC.bolList, myStatus: "in_progress" },
    funds: { required: "required", officialValue: "UK Student visa normally needs evidence of funds. Needs verification." },
  }),
  ...checklist("p_card", {
    bachelor: { required: "required", officialValue: "2:2 honours degree in any subject, or relevant professional experience.", v: true, src: SRC.cardProgram, myStatus: "in_progress", evidence: "BSc Computer Science (AITU)" },
    gpa: DONE_GPA("Kazakhstan: GPA 3.2/4.0 (3.46/4.33, 4.0/5.0) for postgraduate taught.", SRC.cardKz),
    math: { required: "not_required", officialValue: "Year 12/13 maths only needed for non-science degrees.", v: true, src: SRC.cardProgram, myStatus: "not_applicable" },
    ielts: { required: "required", officialValue: "6.5 overall", v: true, src: SRC.cardProgram },
    bands: { required: "required", officialValue: "5.5 in all subskills.", v: true, src: SRC.cardProgram },
    later: { required: "conditional", officialValue: "If the test is pending, give the expected test date.", v: true, src: SRC.cardProgram },
    transcript: { required: "required", officialValue: "Degree certificate and transcripts.", v: true, src: SRC.cardProgram },
    degree: { required: "required", officialValue: "Degree certificate (on completion).", v: true, src: SRC.cardProgram },
    tuition: { required: "required", officialValue: "£33,200 overseas (2026 entry). Confirm 2027.", src: SRC.cardProgram },
    deposit: { required: "required", officialValue: "£2,500 deposit (2026 entry).", src: SRC.cardProgram },
    bolashak: { required: "required", officialValue: "Listed No. 28 (2024–2026 list).", v: true, src: SRC.bolList, myStatus: "in_progress" },
    funds: { required: "required", officialValue: "UK Student visa normally needs evidence of funds. Needs verification." },
  }),
];

/* ------------------------------------------------------------------ */
/* Tasks (dates are planning choices, not official deadlines)          */
/* ------------------------------------------------------------------ */

const T = (t: Partial<Task> & Pick<Task, "id" | "title">): Task => TaskSchema.parse(t);

const tasks: Task[] = [
  T({ id: "t_man_decide", title: "Decide: Manchester Stage 1 (6 Nov) or Stage 2 (1 Jan)", category: "application", priority: "high", programIds: ["p_man"], deadline: "2026-11-04", description: "Stage 1 closes 6 Nov 2026. Without a new IELTS and with GPA below the published minimum, Stage 2 (1 Jan 2027) is probably more realistic.", link: SRC.manProgram }),
  T({ id: "t_man_gpa", title: "Confirm Manchester's academic eligibility for a 3.27 GPA", category: "verification", priority: "high", programIds: ["p_man"], deadline: "2026-11-03", description: "Email pgt.compsci@manchester.ac.uk: is 3.27/4.00 from AITU considered for MSc ML? Ask about MSc Advanced Computer Science.", requirementId: "r_man_gpa", linkAction: "none", link: SRC.manKz }),
  T({ id: "t_ielts_diag", title: "Take a full IELTS Academic diagnostic test", category: "ielts", priority: "high", deadline: "2026-11-08", estHours: 3, description: "Timed, all four sections. Log it on the IELTS page." }),
  T({ id: "t_ielts_book", title: "Choose and book an official IELTS date", category: "ielts", priority: "high", deadline: "2026-11-15", dependsOn: ["t_ielts_diag"], description: "In-person test (NU does not accept IELTS Online). Allow time for results before the 15 Dec US deadlines, or plan for later deadlines." }),
  T({ id: "t_ielts_listen", title: "Complete IELTS Listening practice (4 full tests)", category: "ielts", priority: "medium", startDate: "2026-11-01", deadline: "2026-11-22", estHours: 4 }),
  T({ id: "t_ub_verify", title: "Verify University at Buffalo's Fall 2027 deadline and GPA minimum", category: "verification", priority: "high", programIds: ["p_ub"], deadline: "2026-11-12", description: "Email easgrad-enroll@buffalo.edu. Confirm 15 Dec priority / 1 May international apply to Fall 2027, and the GPA minimum.", requirementId: "r_ub_gpa", linkAction: "verify", link: SRC.ubAdmissions }),
  T({ id: "t_asu_courses", title: "Check whether ASU accepts my coursework", category: "verification", priority: "high", programIds: ["p_asu"], deadline: "2026-11-14", description: "Map AITU courses to CSE 310, linear algebra (MAT 242/342/343) and Calculus II. Ask SCAI which IELTS minimum applies (6.5 or 7.0) and how many letters are needed.", requirementId: "r_asu_courses", linkAction: "verify", link: SRC.asuHandbook }),
  T({ id: "t_asu_gpa60", title: "Calculate GPA over my last 60 credit hours (ASU)", category: "verification", priority: "high", programIds: ["p_asu"], deadline: "2026-11-10", estHours: 1, requirementId: "r_asu_gpa", linkAction: "complete" }),
  T({ id: "t_soton_gpa", title: "Ask Southampton how AITU 3.27/4.00 maps to a 2:1", category: "verification", priority: "medium", programIds: ["p_soton"], deadline: "2026-11-20", link: SRC.sotonKz, requirementId: "r_soton_gpa", linkAction: "verify" }),
  T({ id: "t_nu_check", title: "Check NU's 2027–28 master's admissions and the CS programme requirements", category: "verification", priority: "high", programIds: ["p_nu"], deadline: "2026-11-15", description: "Find the opening date, grant deadline, IELTS minimum (MAR), documents and fee.", requirementId: "r_nu_ielts", linkAction: "verify", link: SRC.nuAdmissions }),
  T({ id: "t_bol_rules", title: "Check current Bolashak rules and eligible-university list for 2027", category: "scholarship", priority: "medium", deadline: "2026-12-01", link: SRC.bolRules, description: "Confirm the 2027 window, the master's category, and whether UB's list section covers Computer Science." }),
  T({ id: "t_cv", title: "Update CV (Stem Academia project, JBNU mobility)", category: "documents", priority: "medium", deadline: "2026-11-20", estHours: 3 }),
  T({ id: "t_sop", title: "Draft Statement of Purpose (master version)", category: "documents", priority: "high", startDate: "2026-11-10", deadline: "2026-11-30", estHours: 10 }),
  T({ id: "t_lor1", title: "Request recommendation letter from an AITU professor", category: "recommendations", priority: "high", deadline: "2026-11-18", programIds: ["p_ub", "p_soton"], description: "Ask in person or by email with CV, transcript, SOP draft and deadlines." }),
  T({ id: "t_lor2", title: "Request a second recommendation letter", category: "recommendations", priority: "high", deadline: "2026-11-18", programIds: ["p_ub", "p_soton"], description: "A second professor, or the Stem Academia project supervisor if a professional reference is accepted." }),
  T({ id: "t_transcript", title: "Obtain official English transcript from AITU", category: "documents", priority: "medium", deadline: "2026-11-25" }),
  T({ id: "t_gradletter", title: "Request expected-graduation letter from AITU", category: "documents", priority: "medium", deadline: "2026-11-25" }),
  T({ id: "t_sub_ub", title: "Submit University at Buffalo application", category: "application", priority: "high", programIds: ["p_ub"], deadline: "2026-12-12", dependsOn: ["t_ub_verify", "t_sop", "t_lor1", "t_lor2"] }),
  T({ id: "t_sub_asu", title: "Submit Arizona State University application", category: "application", priority: "high", programIds: ["p_asu"], deadline: "2026-12-12", dependsOn: ["t_asu_courses", "t_sop"] }),
  T({ id: "t_sub_man", title: "Submit Manchester application (Stage 2)", category: "application", priority: "high", programIds: ["p_man"], deadline: "2026-12-28", dependsOn: ["t_man_gpa", "t_transcript"] }),
  T({ id: "t_sub_nu", title: "Submit Nazarbayev University application", category: "application", priority: "medium", programIds: ["p_nu"], deadline: "2027-01-31", dependsOn: ["t_nu_check"], description: "Planning date. Replace with NU's official 2027–28 deadline once published." }),
  T({ id: "t_sub_soton", title: "Submit Southampton application", category: "application", priority: "medium", programIds: ["p_soton"], deadline: "2027-02-28", dependsOn: ["t_sop", "t_lor1", "t_lor2"] }),
  T({ id: "t_sub_card", title: "Submit Cardiff application", category: "application", priority: "medium", programIds: ["p_card"], deadline: "2027-02-28", dependsOn: ["t_transcript"] }),
  T({ id: "t_spark", title: "Check Spärck AI Scholarship application process (Southampton)", category: "finance", priority: "medium", programIds: ["p_soton"], deadline: "2026-12-15", link: SRC.sotonProgram }),
  T({ id: "t_kaztest", title: "Take KAZTEST or Qazaq Resmi Test (B1 or higher)", category: "scholarship", priority: "medium", deadline: "2027-04-30" }),
  T({ id: "t_decisions", title: "Track admission decisions", category: "application", priority: "low", deadline: "2027-04-30" }),
  T({ id: "t_bol_docs", title: "Prepare Bolashak documents (motivation letter, 072/u, translations)", category: "scholarship", priority: "medium", deadline: "2027-06-30", dependsOn: ["t_bol_rules"] }),
  T({ id: "t_aitu", title: "Keep AITU fall-semester grades on track", category: "academics", priority: "high", deadline: "2026-12-20", description: "Your final-year grades feed into GPA and into conditional offers." }),
];

/* ------------------------------------------------------------------ */
/* Recommenders (placeholders: replace with real names)                */
/* ------------------------------------------------------------------ */

const recommenders: Recommender[] = [
  { id: "rec_1", name: "AITU professor #1 (to choose)", position: "Professor / Senior Lecturer", institution: "Astana IT University", relationship: "Course instructor (choose someone who knows your work well)", email: "", phone: "", notes: "Placeholder. Replace with a real name." },
  { id: "rec_2", name: "Second referee (to choose)", position: "", institution: "AITU or Stem Academia", relationship: "Professor, thesis supervisor, or production-practice supervisor", email: "", phone: "", notes: "Placeholder. Check whether each programme accepts a professional referee." },
];

const recRequests: RecRequest[] = [
  { id: "rr_1", recommenderId: "rec_1", programId: "p_ub", status: "not_requested", requestDate: null, deadline: "2026-12-12", followUpDate: null, confirmedOn: null, notes: "" },
  { id: "rr_2", recommenderId: "rec_2", programId: "p_ub", status: "not_requested", requestDate: null, deadline: "2026-12-12", followUpDate: null, confirmedOn: null, notes: "" },
  { id: "rr_3", recommenderId: "rec_1", programId: "p_soton", status: "not_requested", requestDate: null, deadline: "2027-02-28", followUpDate: null, confirmedOn: null, notes: "Two academic references required." },
  { id: "rr_4", recommenderId: "rec_2", programId: "p_soton", status: "not_requested", requestDate: null, deadline: "2027-02-28", followUpDate: null, confirmedOn: null, notes: "Must be academic for Southampton." },
];

/* ------------------------------------------------------------------ */
/* Bolashak                                                            */
/* ------------------------------------------------------------------ */

const S = (r: Omit<ScholarRule, "lastVerified"> & { lastVerified?: string | null }): ScholarRule => ({ lastVerified: r.verified ? VERIFIED_ON : null, ...r });

const scholarRules: ScholarRule[] = [
  S({ id: "s_category", area: "eligibility", rule: "Applicable scholarship category", officialValue: "General master's track assumed. Special categories (rural, engineering, medical, civil servant, nuclear) have extra criteria.", verified: false, sourceUrl: SRC.bolRules, myStatus: "needs_verification", deadline: null, documentId: null, notes: "Confirm which category fits a CS/AI master's in 2027." }),
  S({ id: "s_citizen", area: "eligibility", rule: "Citizenship and age rules", officialValue: "Not stated on the requirements page.", verified: false, sourceUrl: SRC.bolRules, myStatus: "needs_verification", deadline: null, documentId: null, notes: "" }),
  S({ id: "s_degree", area: "eligibility", rule: "Eligible degree level", officialValue: "Master's (academic) studies at a recommended foreign university.", verified: true, sourceUrl: SRC.bolRules, myStatus: "in_progress", deadline: null, documentId: null, notes: "" }),
  S({ id: "s_list", area: "universities", rule: "University must be on the List of Recommended Universities", officialValue: "2024–2026 list: Cardiff #28, Manchester #48, Southampton #53, ASU #214, UB #406 (section unconfirmed). NU not listed.", verified: true, sourceUrl: SRC.bolList, myStatus: "in_progress", deadline: null, documentId: null, notes: "The list may change for 2027. Re-check before applying." }),
  S({ id: "s_offer", area: "admission", rule: "Unconditional offer", officialValue: "Unconditional invitation (financial conditions may remain) with notarized Kazakh or Russian translation.", verified: true, sourceUrl: SRC.bolRules, myStatus: "blocked", deadline: null, documentId: null, notes: "Blocked until IELTS and diploma conditions are met (diploma June 2027)." }),
  S({ id: "s_kaz", area: "language", rule: "State language certificate", officialValue: "KAZTEST or Qazaq Resmi Test, B1 or higher.", verified: true, sourceUrl: SRC.bolRules, myStatus: "not_started", deadline: "2027-04-30", documentId: "d_kaztest", notes: "" }),
  S({ id: "s_ielts", area: "language", rule: "Foreign language evidence", officialValue: "No IELTS level stated for the general master's track; the university's requirement is met through the unconditional offer.", verified: false, sourceUrl: SRC.bolRules, myStatus: "needs_verification", deadline: null, documentId: "d_ielts", notes: "Confirm whether a separate IELTS threshold applies in 2027." }),
  S({ id: "s_gpa", area: "academic", rule: "GPA / work experience", officialValue: "Not stated for the general track. Special categories: GPA ≥ 3.00/4.00 and work experience.", verified: true, sourceUrl: SRC.bolRules, myStatus: "complete", deadline: null, documentId: null, notes: "3.27 would also meet the 3.00 threshold of special categories." }),
  S({ id: "s_docs", area: "documents", rule: "Document package", officialValue: "ID + passport; unconditional offer (notarized KZ/RU translation); diploma + transcript; Kazakh certificate; form 072/u; motivation letter.", verified: true, sourceUrl: SRC.bolRules, myStatus: "not_started", deadline: null, documentId: null, notes: "" }),
  S({ id: "s_motivation", area: "documents", rule: "Motivation letter", officialValue: "Up to 500 words, Kazakh or Russian, dated and signed.", verified: true, sourceUrl: SRC.bolRules, myStatus: "not_started", deadline: null, documentId: "d_bol_motivation", notes: "" }),
  S({ id: "s_window", area: "dates", rule: "Application window", officialValue: "2026 window was 16 Mar – 16 Oct 2026 (via egov.kz). 2027 window not yet published.", verified: false, sourceUrl: SRC.bolWindow2026, myStatus: "needs_verification", deadline: null, documentId: null, notes: "Secondary source (news). Check bolashak.gov.kz / egov.kz." }),
  S({ id: "s_timing", area: "dates", rule: "Timing risk: offer for Sept 2027 vs selection calendar", officialValue: "Selection ran 13 Apr – 31 Dec in 2026. An unconditional offer is only possible after graduation in June 2027.", verified: false, sourceUrl: SRC.bolWindow2026, myStatus: "needs_verification", deadline: null, documentId: null, notes: "Ask whether a deferred start (e.g. January or September 2028) is allowed if selection ends after September 2027." }),
  S({ id: "s_testing", area: "selection", rule: "Comprehensive testing", officialValue: "Verbal and numerical tests plus personality questionnaire; recorded; one attempt; qualifying threshold.", verified: true, sourceUrl: SRC.bolRules, myStatus: "not_started", deadline: null, documentId: null, notes: "" }),
  S({ id: "s_iec", area: "selection", rule: "Independent Expert Commission interview", officialValue: "Anonymous interview on professional knowledge and competencies, partly based on the motivation letter.", verified: true, sourceUrl: SRC.bolRules, myStatus: "not_started", deadline: null, documentId: null, notes: "" }),
  S({ id: "s_commission", area: "selection", rule: "Republican Commission decision", officialValue: "Final decision published on the administrator's website.", verified: true, sourceUrl: SRC.bolRules, myStatus: "not_started", deadline: null, documentId: null, notes: "" }),
  S({ id: "s_medical", area: "medical", rule: "Medical certificate", officialValue: "Form 072/u for travel abroad.", verified: true, sourceUrl: SRC.bolRules, myStatus: "not_started", deadline: null, documentId: "d_072u", notes: "" }),
  S({ id: "s_contract", area: "obligations", rule: "Training and guarantee agreements", officialValue: "Sign within 90 calendar days of the award with the Center for International Programs, or lose scholarship status.", verified: true, sourceUrl: SRC.bolRules, myStatus: "not_started", deadline: null, documentId: null, notes: "" }),
  S({ id: "s_workback", area: "obligations", rule: "Work-back obligation and collateral", officialValue: "Not stated on the requirements page.", verified: false, sourceUrl: SRC.bolRules, myStatus: "needs_verification", deadline: null, documentId: null, notes: "Find the current obligation period and guarantee/collateral rules." }),
];

/* ------------------------------------------------------------------ */
/* Budget                                                              */
/* ------------------------------------------------------------------ */

const E = (e: Partial<Expense> & Pick<Expense, "id" | "title">): Expense => ExpenseSchema.parse(e);
const expenses: Expense[] = [
  E({ id: "e_ub_fee", title: "UB application fee", category: "application_fee", programId: "p_ub", currency: "USD", estimated: 100, dueDate: "2026-12-12", refundable: "no", verified: true, sourceUrl: SRC.ubMaterials }),
  E({ id: "e_asu_fee", title: "ASU application fee", category: "application_fee", programId: "p_asu", currency: "USD", estimated: null, dueDate: "2026-12-12", refundable: "no", notes: "Amount needs verification.", sourceUrl: SRC.asuAdmissions }),
  E({ id: "e_nu_fee", title: "NU application fee", category: "application_fee", programId: "p_nu", currency: "KZT", estimated: 15000, dueDate: "2027-01-31", refundable: "no", notes: "2026–27 regular fee; confirm for 2027–28.", sourceUrl: SRC.nuCycle }),
  E({ id: "e_soton_fee", title: "Southampton application fee", category: "application_fee", programId: "p_soton", currency: "GBP", estimated: 0, refundable: "unknown", verified: true, sourceUrl: SRC.sotonProgram, notes: "No fee for 2027 entry." }),
  E({ id: "e_man_fee", title: "Manchester application fee", category: "application_fee", programId: "p_man", currency: "GBP", estimated: 0, refundable: "unknown", verified: true, sourceUrl: SRC.manProgram }),
  E({ id: "e_card_fee", title: "Cardiff application fee", category: "application_fee", programId: "p_card", currency: "GBP", estimated: null, refundable: "unknown", notes: "Not stated. Needs verification." }),
  E({ id: "e_ielts", title: "IELTS Academic registration", category: "ielts", currency: "KZT", estimated: null, dueDate: "2026-11-15", notes: "Check the current fee with the test centre." }),
  E({ id: "e_transcript", title: "Official transcripts & courier", category: "documents", currency: "KZT", estimated: null }),
  E({ id: "e_translation", title: "Notarized translations (offer, diploma) for Bolashak", category: "translation", currency: "KZT", estimated: null, dueDate: "2027-07-15" }),
  E({ id: "e_kaztest", title: "KAZTEST / Qazaq Resmi Test", category: "scholarship", currency: "KZT", estimated: null }),
  E({ id: "e_soton_dep", title: "Southampton deposit", category: "deposit", programId: "p_soton", currency: "GBP", estimated: 2000, refundable: "unknown", verified: true, sourceUrl: SRC.sotonProgram }),
  E({ id: "e_card_dep", title: "Cardiff deposit", category: "deposit", programId: "p_card", currency: "GBP", estimated: 2500, refundable: "unknown", sourceUrl: SRC.cardProgram, notes: "2026-entry figure." }),
  E({ id: "e_soton_tuition", title: "Southampton tuition 2027–28", category: "tuition", programId: "p_soton", currency: "GBP", estimated: 36800, verified: true, sourceUrl: SRC.sotonProgram }),
  E({ id: "e_man_tuition", title: "Manchester tuition 2027–28", category: "tuition", programId: "p_man", currency: "GBP", estimated: 41400, verified: true, sourceUrl: SRC.manProgram }),
  E({ id: "e_card_tuition", title: "Cardiff tuition (2026 entry figure)", category: "tuition", programId: "p_card", currency: "GBP", estimated: 33200, sourceUrl: SRC.cardProgram }),
  E({ id: "e_ub_tuition", title: "UB tuition (third-party estimate)", category: "tuition", programId: "p_ub", currency: "USD", estimated: 25740, sourceUrl: SRC.ubAggregator, notes: "Needs verification on buffalo.edu." }),
];

const sources: Source[] = [
  { id: "src_1", programId: "p_man", label: "Manchester MSc ML: 2027 deadlines, fee, documents", url: SRC.manProgram, checkedOn: VERIFIED_ON, finding: "Staged deadlines 6 Nov / 1 Jan / 26 Feb / 21 May; £41,400; no fee; no refs or PS." },
  { id: "src_2", programId: "p_man", label: "Manchester Kazakhstan entry requirements", url: SRC.manKz, checkedOn: VERIFIED_ON, finding: "Minimum GPA 3.4/4.0 (3.7/4.33, 4.25/5.0), varies by discipline." },
  { id: "src_3", programId: "p_soton", label: "Southampton MSc ML (2027–28)", url: SRC.sotonProgram, checkedOn: VERIFIED_ON, finding: "2:1; IELTS 6.5/6.0; £36,800; deadline 18 Aug 2027 (intl); no fee." },
  { id: "src_4", programId: "p_card", label: "Cardiff AI + Data Science MSc", url: SRC.cardProgram, checkedOn: VERIFIED_ON, finding: "2:2; IELTS 6.5/5.5; £33,200 (2026 entry); closes end of August." },
  { id: "src_5", programId: "p_card", label: "Cardiff Kazakhstan entry requirements", url: SRC.cardKz, checkedOn: VERIFIED_ON, finding: "PGT: GPA 3.2/4.0." },
  { id: "src_6", programId: "p_ub", label: "UB CSE application materials", url: SRC.ubMaterials, checkedOn: VERIFIED_ON, finding: "$100 fee; 2 letters; GRE not required; IELTS 6.5." },
  { id: "src_7", programId: "p_ub", label: "UB CSE graduate admissions", url: SRC.ubAdmissions, checkedOn: VERIFIED_ON, finding: "Fall priority 15 Dec; international 1 May; rolling. Year not stated." },
  { id: "src_8", programId: "p_asu", label: "ASU MS AI handbook 2026–27", url: SRC.asuHandbook, checkedOn: VERIFIED_ON, finding: "GPA 3.25 last 60 hrs; IELTS 6.5; prerequisites; 15 Dec Fall." },
  { id: "src_9", programId: "p_asu", label: "ASU SCAI graduate admissions", url: SRC.asuAdmissions, checkedOn: VERIFIED_ON, finding: "IELTS average 7 in FAQ (conflicts with handbook); letters unclear." },
  { id: "src_10", programId: "p_nu", label: "NU admission policy (effective 5 Mar 2026)", url: SRC.nuPolicy, checkedOn: VERIFIED_ON, finding: "Final-year students eligible; conditional admission; in-person IELTS only." },
  { id: "src_11", programId: "p_nu", label: "NU 2026–27 master's cycle announcement", url: SRC.nuCycle, checkedOn: VERIFIED_ON, finding: "Grant deadline 13 Feb 2026; fee 15,000 KZT." },
  { id: "src_12", programId: null, label: "Bolashak requirements for applicants", url: SRC.bolRules, checkedOn: VERIFIED_ON, finding: "Unconditional offer; KAZTEST B1; documents; 3-stage selection." },
  { id: "src_13", programId: null, label: "Bolashak 2024–2026 recommended universities", url: SRC.bolList, checkedOn: VERIFIED_ON, finding: "Cardiff 28, Manchester 48, Southampton 53, ASU 214, UB 406; NU absent." },
];

/* ------------------------------------------------------------------ */

export function buildSeed(): AppState {
  order = 0;
  const s = emptyState();
  s.initialized = true;
  s.profile = ProfileSchema.parse({
    university: "Astana IT University (AITU), Kazakhstan",
    degree: "Bachelor's in Computer Science",
    graduation: "June 2027 (expected)",
    gpa: "3.27 / 4.00",
    mobility: "One-semester academic mobility at Jeonbuk National University (JBNU), South Korea",
    experience: "Production practice: built a website for Stem Academia",
    projects: "Stem Academia website (production practice)",
    skills: "",
    interests: "Machine Learning Engineering, Artificial Intelligence, Software Engineering, Computer Science",
    goals: "",
    destinations: "1. United States  2. United Kingdom  Backup: Nazarbayev University",
    sequence:
      "1. Prepare and take IELTS\n2. Research and apply to master's programmes\n3. Obtain admission offers\n4. Verify Bolashak eligibility and apply\n5. Complete scholarship interviews, documents, medical and formalities\n6. Plan enrolment and departure",
  });
  s.universities = universities.map((u) => ({ ...u }));
  s.programs = programs.map((p) => ({ ...p }));
  s.requirements = requirements.map((r) => ({ ...r }));
  s.tasks = tasks.map((t) => ({ ...t }));
  s.documents = documents.map((d) => ({ ...d }));
  s.recommenders = recommenders.map((r) => ({ ...r }));
  s.recRequests = recRequests.map((r) => ({ ...r }));
  s.scholarRules = scholarRules.map((r) => ({ ...r }));
  s.expenses = expenses.map((e) => ({ ...e }));
  s.sources = sources.map((x) => ({ ...x }));
  s.ieltsSettings = IeltsSettingsSchema.parse({
    targetOverall: 8,
    targetL: 8.5,
    targetR: 8.5,
    targetW: 7.5,
    targetS: 7.5,
    minimumNeeded: 7,
    plannedDate: null,
    registration: "not_booked",
    notes: "8.0+ is the practical target; 9.0 is the ceiling, not a requirement. Programme minimums on the shortlist range from 6.5 to 7.0.",
  });
  s.ieltsAttempts = [
    { id: "ia_2023", date: "2023-10-28", kind: "official", provider: "IELTS Academic (official)", L: null, R: null, W: null, S: null, overall: 5.5, writingFeedback: "", speakingFeedback: "", weaknesses: "", notes: "Previous official result. Band scores not recorded; add them if you have the TRF." },
  ];
  s.bolashak = BolashakSettingsSchema.parse({
    category: "General master's (to confirm)",
    intendedCycle: "2027 competition (after June 2027 graduation)",
    windowOpen: null,
    windowClose: null,
    windowNote: "2026 window was 16 Mar – 16 Oct. 2027 dates needed.",
    applicationStatus: "researching",
  });
  s.settings = SettingsSchema.parse({ displayCurrency: "KZT" });
  return s;
}
