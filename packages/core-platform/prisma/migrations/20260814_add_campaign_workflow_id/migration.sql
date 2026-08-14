-- AlterTable
ALTER TABLE "adm_campaigns" ADD COLUMN "workflowId" TEXT;

-- AddForeignKey
ALTER TABLE "adm_campaigns" ADD CONSTRAINT "adm_campaigns_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "adm_workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE;
