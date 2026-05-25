/*
  Warnings:

  - The values [APPROVAL_REQUIRED,CONFLICT_DETECTED] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('REQUEST_SUBMITTED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'STAGE_ADVANCED', 'STEP_APPROVED', 'STEP_REJECTED', 'ASSET_CHECKED_OUT', 'ASSET_RETURNED', 'ASSET_DUE', 'ASSET_OVERDUE', 'SYSTEM');
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "NotificationType_old";
COMMIT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "stepId" TEXT;
