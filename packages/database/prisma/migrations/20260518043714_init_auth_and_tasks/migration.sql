-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'MICROSOFT');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('REQUESTOR', 'ADVISER', 'DEPARTMENT_HEAD', 'MIS', 'BUILDING_ADMIN', 'STUDENT_AFFAIRS', 'ACADEMIC_HEAD', 'SCHOOL_ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('DRAFT', 'PENDING', 'STAGE1_REVIEW', 'STAGE2_REVIEW', 'PENDING_FINAL', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ApprovalStage" AS ENUM ('STAGE_1_ADVISER', 'STAGE_1_DEPT_HEAD', 'STAGE_2_MIS', 'STAGE_2_BUILDING', 'STAGE_2_HEAD_OF_STUDENT_AFFAIRS', 'STAGE_2_ACADEMIC_HEAD', 'STAGE_3_SCHOOL_ADMIN');

-- CreateEnum
CREATE TYPE "VenueStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'MAINTENANCE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'CHECKED_OUT', 'MAINTENANCE', 'LOST', 'DAMAGED');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "CheckoutStatus" AS ENUM ('ACTIVE', 'RETURNED', 'OVERDUE', 'LOST', 'DAMAGED_ON_RETURN');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REQUEST_SUBMITTED', 'APPROVAL_REQUIRED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'ASSET_DUE', 'ASSET_OVERDUE', 'CONFLICT_DETECTED', 'SYSTEM');

-- CreateTable
CREATE TABLE "system_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT,
    "email" TEXT,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT,
    "provider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
    "providerId" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'REQUESTOR',
    "department" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "activityTitle" TEXT NOT NULL,
    "theme" TEXT,
    "objectives" TEXT NOT NULL,
    "activityStartAt" TIMESTAMP(3) NOT NULL,
    "activityEndAt" TIMESTAMP(3) NOT NULL,
    "venueDescription" TEXT,
    "equipmentDescription" TEXT,
    "speakers" JSONB NOT NULL DEFAULT '[]',
    "expectedAudience" TEXT,
    "expectedHeadcount" INTEGER,
    "remarks" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_steps" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "stage" "ApprovalStage" NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "approverId" TEXT,
    "approverName" TEXT,
    "approverRole" TEXT,
    "approverTitle" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "rejectionReason" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "building" TEXT,
    "floor" TEXT,
    "capacity" INTEGER NOT NULL,
    "status" "VenueStatus" NOT NULL DEFAULT 'AVAILABLE',
    "features" TEXT[],
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venue_bookings" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "bufferStartAt" TIMESTAMP(3) NOT NULL,
    "bufferEndAt" TIMESTAMP(3) NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venue_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "serialNumber" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD',
    "location" TEXT,
    "qrCode" TEXT,
    "purchasedAt" TIMESTAMP(3),
    "warrantyUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_checkouts" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "handledById" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "CheckoutStatus" NOT NULL DEFAULT 'ACTIVE',
    "checkedOutAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "conditionOnOut" "AssetCondition",
    "conditionOnReturn" "AssetCondition",
    "damageNotes" TEXT,
    "penaltyNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_logs" (
    "id" TEXT NOT NULL,
    "venueId" TEXT,
    "assetId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "loggedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "requestId" TEXT,
    "approvalStepId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "performedById" TEXT,
    "requestId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "snapshot" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_key" ON "system_configs"("key");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "requests_referenceNumber_key" ON "requests"("referenceNumber");

-- CreateIndex
CREATE INDEX "requests_requestedById_idx" ON "requests"("requestedById");

-- CreateIndex
CREATE INDEX "requests_status_idx" ON "requests"("status");

-- CreateIndex
CREATE INDEX "requests_activityStartAt_idx" ON "requests"("activityStartAt");

-- CreateIndex
CREATE INDEX "requests_referenceNumber_idx" ON "requests"("referenceNumber");

-- CreateIndex
CREATE INDEX "requests_deletedAt_idx" ON "requests"("deletedAt");

-- CreateIndex
CREATE INDEX "approval_steps_requestId_idx" ON "approval_steps"("requestId");

-- CreateIndex
CREATE INDEX "approval_steps_approverId_idx" ON "approval_steps"("approverId");

-- CreateIndex
CREATE INDEX "approval_steps_status_idx" ON "approval_steps"("status");

-- CreateIndex
CREATE UNIQUE INDEX "approval_steps_requestId_stage_key" ON "approval_steps"("requestId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "venues_name_key" ON "venues"("name");

-- CreateIndex
CREATE INDEX "venues_status_idx" ON "venues"("status");

-- CreateIndex
CREATE INDEX "venues_deletedAt_idx" ON "venues"("deletedAt");

-- CreateIndex
CREATE INDEX "venue_bookings_venueId_startAt_endAt_idx" ON "venue_bookings"("venueId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "venue_bookings_requestId_idx" ON "venue_bookings"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "assets_assetTag_key" ON "assets"("assetTag");

-- CreateIndex
CREATE UNIQUE INDEX "assets_serialNumber_key" ON "assets"("serialNumber");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE INDEX "assets_category_idx" ON "assets"("category");

-- CreateIndex
CREATE INDEX "assets_assetTag_idx" ON "assets"("assetTag");

-- CreateIndex
CREATE INDEX "assets_deletedAt_idx" ON "assets"("deletedAt");

-- CreateIndex
CREATE INDEX "asset_checkouts_requestId_idx" ON "asset_checkouts"("requestId");

-- CreateIndex
CREATE INDEX "asset_checkouts_assetId_idx" ON "asset_checkouts"("assetId");

-- CreateIndex
CREATE INDEX "asset_checkouts_status_idx" ON "asset_checkouts"("status");

-- CreateIndex
CREATE INDEX "asset_checkouts_dueAt_idx" ON "asset_checkouts"("dueAt");

-- CreateIndex
CREATE INDEX "maintenance_logs_venueId_idx" ON "maintenance_logs"("venueId");

-- CreateIndex
CREATE INDEX "maintenance_logs_assetId_idx" ON "maintenance_logs"("assetId");

-- CreateIndex
CREATE INDEX "attachments_requestId_idx" ON "attachments"("requestId");

-- CreateIndex
CREATE INDEX "attachments_approvalStepId_idx" ON "attachments"("approvalStepId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_requestId_idx" ON "notifications"("requestId");

-- CreateIndex
CREATE INDEX "audit_logs_performedById_idx" ON "audit_logs"("performedById");

-- CreateIndex
CREATE INDEX "audit_logs_requestId_idx" ON "audit_logs"("requestId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_bookings" ADD CONSTRAINT "venue_bookings_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_bookings" ADD CONSTRAINT "venue_bookings_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_checkouts" ADD CONSTRAINT "asset_checkouts_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_checkouts" ADD CONSTRAINT "asset_checkouts_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_checkouts" ADD CONSTRAINT "asset_checkouts_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_approvalStepId_fkey" FOREIGN KEY ("approvalStepId") REFERENCES "approval_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
