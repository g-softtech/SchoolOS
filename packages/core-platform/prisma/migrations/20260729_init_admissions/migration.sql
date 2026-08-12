-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'DROPDOWN', 'DATE', 'FILE');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'WAIVED');
CREATE TYPE "DocVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "RecommendationStatus" AS ENUM ('APPROVE', 'REJECT', 'HOLD');

-- CreateTable
CREATE TABLE "adm_campaigns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "applicationFee" DECIMAL(65,30),
    "maxApplicants" INTEGER,
    "allowedClasses" JSONB NOT NULL,
    "portalVisibility" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "adm_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adm_workflows" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "adm_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adm_workflow_stages" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adm_workflow_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adm_forms" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "adm_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adm_fields" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL,
    "visibilityRule" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adm_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adm_field_options" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adm_field_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adm_required_documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "adm_required_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adm_applications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "admissionNumber" TEXT,
    "studentFirstName" TEXT NOT NULL,
    "studentLastName" TEXT NOT NULL,
    "studentDateOfBirth" TIMESTAMP(3) NOT NULL,
    "customFields" JSONB NOT NULL,
    "formVersion" INTEGER NOT NULL DEFAULT 1,
    "currentStageId" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "adm_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adm_documents" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "requiredDocumentId" TEXT,
    "fileUrl" TEXT NOT NULL,
    "verificationStatus" "DocVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adm_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adm_reviews" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "score" INTEGER,
    "comments" TEXT,
    "recommendation" "RecommendationStatus" NOT NULL DEFAULT 'HOLD',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "adm_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "adm_campaigns_tenantId_academicYearId_idx" ON "adm_campaigns"("tenantId", "academicYearId");

-- CreateIndex
CREATE INDEX "adm_workflows_tenantId_idx" ON "adm_workflows"("tenantId");

-- CreateIndex
CREATE INDEX "adm_workflow_stages_workflowId_orderIndex_idx" ON "adm_workflow_stages"("workflowId", "orderIndex");

-- CreateIndex
CREATE INDEX "adm_forms_tenantId_campaignId_idx" ON "adm_forms"("tenantId", "campaignId");

-- CreateIndex
CREATE INDEX "adm_fields_formId_idx" ON "adm_fields"("formId");

-- CreateIndex
CREATE INDEX "adm_field_options_fieldId_idx" ON "adm_field_options"("fieldId");

-- CreateIndex
CREATE INDEX "adm_required_documents_tenantId_idx" ON "adm_required_documents"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "adm_applications_admissionNumber_key" ON "adm_applications"("admissionNumber");

-- CreateIndex
CREATE INDEX "adm_applications_tenantId_campaignId_idx" ON "adm_applications"("tenantId", "campaignId");

-- CreateIndex
CREATE INDEX "adm_applications_tenantId_currentStageId_idx" ON "adm_applications"("tenantId", "currentStageId");

-- CreateIndex
CREATE INDEX "adm_documents_applicationId_idx" ON "adm_documents"("applicationId");

-- CreateIndex
CREATE INDEX "adm_reviews_applicationId_idx" ON "adm_reviews"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "adm_reviews_applicationId_reviewerId_stageId_key" ON "adm_reviews"("applicationId", "reviewerId", "stageId");

-- AddForeignKey
ALTER TABLE "adm_campaigns" ADD CONSTRAINT "adm_campaigns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "adm_campaigns" ADD CONSTRAINT "adm_campaigns_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_workflows" ADD CONSTRAINT "adm_workflows_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_workflow_stages" ADD CONSTRAINT "adm_workflow_stages_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "adm_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_forms" ADD CONSTRAINT "adm_forms_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "adm_forms" ADD CONSTRAINT "adm_forms_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "adm_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_fields" ADD CONSTRAINT "adm_fields_formId_fkey" FOREIGN KEY ("formId") REFERENCES "adm_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_field_options" ADD CONSTRAINT "adm_field_options_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "adm_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_required_documents" ADD CONSTRAINT "adm_required_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_applications" ADD CONSTRAINT "adm_applications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "adm_applications" ADD CONSTRAINT "adm_applications_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "adm_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "adm_applications" ADD CONSTRAINT "adm_applications_currentStageId_fkey" FOREIGN KEY ("currentStageId") REFERENCES "adm_workflow_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_documents" ADD CONSTRAINT "adm_documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "adm_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "adm_documents" ADD CONSTRAINT "adm_documents_requiredDocumentId_fkey" FOREIGN KEY ("requiredDocumentId") REFERENCES "adm_required_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_reviews" ADD CONSTRAINT "adm_reviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "adm_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "adm_reviews" ADD CONSTRAINT "adm_reviews_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "adm_workflow_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
