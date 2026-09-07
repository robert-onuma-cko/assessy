-- CreateEnum
CREATE TYPE "RequestState" AS ENUM ('SUBMITTED', 'CLARIFYING', 'READY_FOR_REVIEW', 'REQUESTER_CONFIRMED', 'AWAITING_DOMAIN_DECISION', 'RESOLVED_SELF_SERVICE', 'LINKED_TO_INITIATIVE', 'RETURNED_FOR_INFO', 'REJECTED_REDIRECTED', 'ACCEPTED_TO_BACKLOG', 'ADVANCED_TO_MCAP', 'ROUTED_TO_INCIDENT', 'BACKLOG_CANDIDATE');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('BAU', 'SMALL_TASK', 'SERVICE_REQUEST', 'INCIDENT_BUG', 'IMPROVEMENT_IDEA', 'INITIATIVE_DEPENDENCY', 'PROJECT_REQUEST', 'INITIATIVE_MAJOR_CHANGE');

-- CreateEnum
CREATE TYPE "EngagementLevel" AS ENUM ('INFORM', 'CONSULT', 'ASSESS', 'CONTRIBUTE', 'DELIVER', 'APPROVE');

-- CreateEnum
CREATE TYPE "EngagementStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'DECLINED');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('REQUESTER', 'SCOUT', 'TRIAGE');

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'app',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "originalSubmission" TEXT NOT NULL,
    "structuredFacts" JSONB,
    "suggestedType" "RequestType",
    "suggestedDomainKey" TEXT,
    "validatedFinalType" "RequestType",
    "state" "RequestState" NOT NULL DEFAULT 'SUBMITTED',
    "decisionReason" TEXT,
    "decidedByEmail" TEXT,
    "decidedAt" TIMESTAMP(3),
    "routingUrl" TEXT,
    "capacityOutcome" TEXT,
    "displacedInitiative" TEXT,
    "receivingDomainKey" TEXT,
    "activeDisruption" BOOLEAN NOT NULL DEFAULT false,
    "initiativeIndicatorFlag" BOOLEAN NOT NULL DEFAULT false,
    "linkedInitiativeRef" TEXT,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestMessage" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriageRecommendation" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "recommendedType" "RequestType" NOT NULL,
    "receivingDomainKey" TEXT,
    "engagements" JSONB,
    "confidence" "Confidence" NOT NULL,
    "rationale" TEXT NOT NULL,
    "sources" JSONB,
    "indicatorChecklist" JSONB,
    "taxonomyVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TriageRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestDomainEngagement" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "domainKey" TEXT NOT NULL,
    "level" "EngagementLevel" NOT NULL,
    "setBy" TEXT NOT NULL,
    "status" "EngagementStatus" NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestDomainEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainCatalogue" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL,
    "pillar" TEXT,
    "approvalOwnerEmail" TEXT,
    "delegateEmail" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "DomainCatalogue_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "KbEntry" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "domainKey" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KbEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InitiativeSnapshot" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "ownerEmail" TEXT,
    "sourceUrl" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InitiativeSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "requestId" TEXT,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "reasonCode" TEXT,
    "field" TEXT,
    "fromValue" TEXT,
    "toValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Request_state_idx" ON "Request"("state");

-- CreateIndex
CREATE INDEX "Request_receivingDomainKey_idx" ON "Request"("receivingDomainKey");

-- CreateIndex
CREATE INDEX "Request_requesterEmail_idx" ON "Request"("requesterEmail");

-- CreateIndex
CREATE INDEX "RequestMessage_requestId_createdAt_idx" ON "RequestMessage"("requestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TriageRecommendation_requestId_version_key" ON "TriageRecommendation"("requestId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "RequestDomainEngagement_requestId_domainKey_key" ON "RequestDomainEngagement"("requestId", "domainKey");

-- CreateIndex
CREATE UNIQUE INDEX "KbEntry_slug_key" ON "KbEntry"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "InitiativeSnapshot_ref_key" ON "InitiativeSnapshot"("ref");

-- CreateIndex
CREATE INDEX "AuditLog_requestId_createdAt_idx" ON "AuditLog"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientEmail_createdAt_idx" ON "Notification"("recipientEmail", "createdAt");

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_receivingDomainKey_fkey" FOREIGN KEY ("receivingDomainKey") REFERENCES "DomainCatalogue"("key") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestMessage" ADD CONSTRAINT "RequestMessage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriageRecommendation" ADD CONSTRAINT "TriageRecommendation_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestDomainEngagement" ADD CONSTRAINT "RequestDomainEngagement_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestDomainEngagement" ADD CONSTRAINT "RequestDomainEngagement_domainKey_fkey" FOREIGN KEY ("domainKey") REFERENCES "DomainCatalogue"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
