# Data model

All entities are validated with Zod (`src/lib/types.ts`). IDs are strings; relationships are by ID.

```
UserProfile (singleton)
University 1─* Program 1─* Requirement *─0..1 Document
                    │  1─* RecommendationRequest *─1 Recommender
                    │  *─* Task (task.programIds)      Task *─* Task (dependsOn)
                    │                                  Task *─0..1 Requirement (+ linkAction)
                    │  1─* Source (verification log)
                    │  0..1─* Expense
Document 1─* DocVersion (text stored separately, keyed by version id)
Document 1─* DocSubmission (programId, versionId, date)
IeltsSettings (singleton) · IeltsAttempt · PracticeLog
BolashakSettings (singleton) · ScholarshipRule *─0..1 Document
WeeklyReview (id = week start) · Note · Settings (singleton: currency, FX rates, budget)
```

Program holds the per-university application record (dates, fees, requirement summaries) and its application state: `eligibility`, `submission`, `decision`, `bolashakList`, `fit` + `fitEvidence`. Application completeness is derived from Requirements.

A shared document (e.g. the IELTS result) is a single Document linked from many Requirement rows, so "which universities need this?" is a query, not duplicated data.

## Storage documents

| Key | Content |
|---|---|
| `meta` | `{initialized, schemaVersion}` |
| `profile`, `settings`, `ieltsSettings`, `bolashak` | singleton objects |
| `programs`, `tasks`, `documents`, … | `{items: [...]}` |
| `req.<programId>` | that programme's requirements |
| `texts/v/<versionId>` | `{text}` for SOP/CV versions |

In the cloud backend each key lives at `data/users/<viewer id>/<key>`, a path only that signed-in viewer can access. Documents are capped at 256 KB; very long practice logs or notes should be pruned or exported.

See `postgres-schema.sql` for the equivalent relational schema with row-level security.
