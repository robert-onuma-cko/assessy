# AGENTS.md — how to work in this repo

Assessy clones the Hive prototype's conventions (`../hive`) so the module can merge into Hive later. When in doubt, look at how Hive does it.

## Architecture rules

- **Dependency direction:** `app/` → `components/` → `lib/`. `lib/` never imports upward and stays framework-agnostic (no React in `lib/`, except server-only Next APIs where noted).
- **Server Components by default.** `'use client'` only for interactivity. Fetch in RSCs via `lib/`; refresh with `revalidatePath`. No client state libraries.
- **All writes go through `lib/services/*`.** Server actions in `lib/actions.ts` are thin: `requireActor()` → permission check → service call → `revalidatePath`. Never write Prisma from a route or component.
- **Every write appends an `AuditLog` row** in the same transaction. Corrections to Scout-populated fields carry a reason code (`wrong-domain | wrong-type | kb-gap-or-stale | taxonomy-ambiguity | requester-info-wrong | scope-changed`).
- **Server actions are public HTTP endpoints.** Each authenticates and authorizes independently via `lib/permissions.ts` predicates; the UI uses the same predicates only to show/hide.
- **Never edit `Request.originalSubmission`** after creation, and never update a `TriageRecommendation` — new AI passes create new versions. AI recommendation and human decision are separate records, always.
- **People are emails**, resolved against `lib/people-directory.ts` and rendered with `displayPerson`/`PersonPicker`. Never free-text a person.
- **The domain catalogue is a mirror.** Hive's DomainPOC register is authoritative; rows here carry `source` + `effectiveDate` and change only via import/seed.

## UI rules

- `design.md` is the source of truth (copied from Hive, verbatim). Semantic tokens only — a raw hex or `bg-green-50` is a defect. The two sanctioned exceptions: `/public` assets and `components/ScoutMark.tsx` (a brand mark, documented in the globals.css addendum).
- Every lifecycle state renders through `Badge`'s five semantic variants, mapped in `lib/taxonomy.ts`.
- Forms use `ValidatedForm`/`Field`/`OptionalTag` (`components/FormField.tsx`): every field is required unless marked `Optional`; the primary is never disabled for incompleteness.
- Lists use `ListSection`/`ListRow` with shared `tracks`; pages use `PageContainer` + `PageHeader`.
- Scout's persona stays on requester surfaces; triage and domain views are instrument-plain. Scout's flutter animates only as feedback (thinking/streaming) and respects `prefers-reduced-motion`.

## Testing & preflight

- **TDD**: write the test first for behavior changes; Vitest (`npm test`), config in `vitest.config.ts` (node env by default; `// @vitest-environment jsdom` per component test file).
- Before pushing: `make preflight` (typecheck, lint, test, build) must be green.

## Local dev

Postgres via `docker compose -f docker-compose.dev.yml up -d` (port **5433** — Hive owns 5432). Identity: `ASSESSY_DEV_EMAIL` or the in-app dev switcher (dev-only; dead code in production builds). Server: `npm run dev` → port 3005.
