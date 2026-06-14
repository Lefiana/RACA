-- CreateEnum
CREATE TYPE "ApprovalGroup" AS ENUM ('IT_CPE', 'ART_SCIENCE', 'THM_BM', 'ASST_PRINCIPAL', 'GEN_ED');

-- CreateEnum
CREATE TYPE "RevisionType" AS ENUM ('REVISION_RESUME', 'REVISION_RESTART');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ApprovalStatus" ADD VALUE 'REVISION_REQUESTED';
ALTER TYPE "ApprovalStatus" ADD VALUE 'SUSPENDED';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REVISION_REQUESTED';

-- AlterEnum
ALTER TYPE "RequestStatus" ADD VALUE 'REVISION_REQUESTED';

-- AlterTable
ALTER TABLE "approval_steps" ADD COLUMN     "revisionType" "RevisionType";

-- AlterTable
ALTER TABLE "requests" ADD COLUMN     "approvalGroup" "ApprovalGroup",
ADD COLUMN     "previousStatus" "RequestStatus",
ADD COLUMN     "revisedAt" TIMESTAMP(3),
ADD COLUMN     "revisionCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "approvalGroup" "ApprovalGroup";

-- CreateIndex
CREATE INDEX "requests_approvalGroup_idx" ON "requests"("approvalGroup");

-- CreateIndex
CREATE INDEX "user_approvalGroup_idx" ON "user"("approvalGroup");
