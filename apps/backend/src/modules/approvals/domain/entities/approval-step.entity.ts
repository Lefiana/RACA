// File: apps/backend/src/modules/approvals/domain/entities/approval-step.entity.ts
// Purpose: Typed domain representation of an ApprovalStep.
//          Also exports stage/role mapping constants used across the module.
// Dependencies: @repo/database (enums only)

import { ApprovalStage, ApprovalStatus } from '@repo/database';

export class ApprovalStepEntity {
  id:             string;
  requestId:      string;
  stage:          ApprovalStage;
  stepOrder:      number;

  // Live assignee — may be null if no user held this role at submit time
  approverId:     string | null;

  // Snapshot written at decision time — null until a decision is made
  approverName:   string | null;
  approverRole:   string | null;
  approverTitle:  string | null;

  status:          ApprovalStatus;
  remarks:         string | null;
  rejectionReason: string | null;
  decidedAt:       Date | null;

  createdAt: Date;
  updatedAt: Date;

  // Populated when fetched with request context
  request?: {
    id:              string;
    referenceNumber: string;
    activityTitle:   string;
    status:          string;
    requestedBy: {
      id:   string;
      name: string;
    };
  };
}

// Human-readable label for each stage — used in snapshots and notifications
export const STAGE_ROLE_LABEL: Record<ApprovalStage, string> = {
  [ApprovalStage.STAGE_1_ADVISER]:                 'Adviser',
  [ApprovalStage.STAGE_1_DEPT_HEAD]:               'Department Head',
  [ApprovalStage.STAGE_2_MIS]:                     'MIS',
  [ApprovalStage.STAGE_2_BUILDING]:                'Building Administrator',
  [ApprovalStage.STAGE_2_HEAD_OF_STUDENT_AFFAIRS]: 'Head of Student Affairs',
  [ApprovalStage.STAGE_2_ACADEMIC_HEAD]:           'Academic Head',
  [ApprovalStage.STAGE_3_SCHOOL_ADMIN]:            'School Administrator',
};

// Maps UserRole string to the ApprovalStage it can act on.
// Used for role-based fallback when approverId is null on a step.
export const ROLE_TO_STAGE: Record<string, ApprovalStage> = {
  ADVISER:          ApprovalStage.STAGE_1_ADVISER,
  DEPARTMENT_HEAD:  ApprovalStage.STAGE_1_DEPT_HEAD,
  MIS:              ApprovalStage.STAGE_2_MIS,
  BUILDING_ADMIN:   ApprovalStage.STAGE_2_BUILDING,
  STUDENT_AFFAIRS:  ApprovalStage.STAGE_2_HEAD_OF_STUDENT_AFFAIRS,
  ACADEMIC_HEAD:    ApprovalStage.STAGE_2_ACADEMIC_HEAD,
  SCHOOL_ADMIN:     ApprovalStage.STAGE_3_SCHOOL_ADMIN,
};

// All four parallel Stage 2 stages — used to check if all have approved
export const STAGE_2_STAGES = new Set<ApprovalStage>([
  ApprovalStage.STAGE_2_MIS,
  ApprovalStage.STAGE_2_BUILDING,
  ApprovalStage.STAGE_2_HEAD_OF_STUDENT_AFFAIRS,
  ApprovalStage.STAGE_2_ACADEMIC_HEAD,
]);
