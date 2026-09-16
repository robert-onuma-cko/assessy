# Assessy

CKO request intake and AI triage. Requesters tell **Scout** (the bee) what they need; Scout structures the facts, asks clarifying questions, and drafts a triage brief — **humans confirm every routing decision** (recommend-only v1).

Design: [CKO-Intake-Triage-MVP-Design.md](CKO-Intake-Triage-MVP-Design.md). UI follows [design.md](design.md) (cloned from the Hive prototype and treated as source of truth). Conventions: [AGENTS.md](AGENTS.md).

## Run locally

```bash
npm install
docker compose -f docker-compose.dev.yml up -d   # Postgres on 5433 (Hive owns 5432)
cp .env.example .env                              # then fill in your email
npm run db:migrate
npm run db:seed                                   # mirrors the MCAP v1 domain catalogue
npm run dev                                       # http://localhost:3005
```

Dev identity comes from `ASSESSY_DEV_EMAIL` (or the in-app dev user switcher, top right). Triage leads are configured via `ASSESSY_TRIAGE_LEADS`; `ASSESSY_DEV_PILOT_OWNER` gives the Finance/FEX pilot domains a placeholder approval owner so `/my-work` is exercisable before the real DomainPOC export lands.

## Checks

```bash
make preflight   # typecheck + lint + test + build
npm test         # Vitest
```

## Build status (per the design's phased roadmap)

- **Phase 1 (done):** app shell per design.md, Prisma schema (§6 data model), domain catalogue + initiative list imported from a dated Hive snapshot (`prisma/data`), capture stage 0 (submission → immutable record → Scout acknowledgement), queues rendering.
- **Phase 2 (done):** submission flow depth (date picker, multiple evidence links with Hive's document extractors), the record as a chat thread, Scout-guided manual triage and domain decisions (classify, route, flag, ask, send to domain, re-route, record outcome) with audit + reason codes, triage queue with recent decisions.
- Phase 3: `lib/ai.ts` (provider-swappable + mock), extraction + classification, eval harness.
- Phase 4: retrieval, domain recommendation, matching, streaming brief.
- Phase 5: readiness gate, clarification loop, Scout conversational UI.
- Phase 6: notifications UI + nudges, corrections review, scenario suite.
