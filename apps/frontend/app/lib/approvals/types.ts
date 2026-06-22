// File: apps/frontend/app/lib/approvals/types.ts
// Purpose: TypeScript interfaces for the approval chain.

import type { IPaginatedResponse } from '../types';

// CHANGED: Added REVISION_REQUESTED, SUSPENDED
export type ApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SKIPPED'
  | 'REVISION_REQUESTED'  // ← NEW
  | 'SUSPENDED';           // ← NEW

export type ApprovalStage =
  | 'STAGE_1_ADVISER'
  | 'STAGE_1_DEPT_HEAD'
  | 'STAGE_2_MIS'
  | 'STAGE_2_BUILDING'
  | 'STAGE_2_HEAD_OF_STUDENT_AFFAIRS'
  | 'STAGE_2_ACADEMIC_HEAD'
  | 'STAGE_3_SCHOOL_ADMIN';

// ── NEW: RevisionType ───────────────────────────────────────────────────────
export type RevisionType = 'REVISION_RESUME' | 'REVISION_RESTART';

export interface IApprovalStep {
  id:              string;
  requestId:       string;
  stage:           ApprovalStage;
  stepOrder:       number;
  approverId:      string | null;
  approverName:    string | null;
  approverRole:    string | null;
  approverTitle:   string | null;
  status:          ApprovalStatus;
  remarks:         string | null;
  rejectionReason: string | null;
  decidedAt:       string | null;
  // ── NEW ──────────────────────────────────────────────────────────────────
  revisionType:    RevisionType | null;
  createdAt:       string;
  updatedAt:       string;
  request?: {
    id:              string;
    referenceNumber: string;
    activityTitle:   string;
    status:          string;
    activityStartAt: string;
    activityEndAt:   string;
    requestedBy: {
      id:    string;
      name:  string;
      email: string;
    };
  };
}

export interface IDecideApprovalDto {
  remarks?:         string;
  rejectionReason?: string;
}

// ── NEW: Request Revision DTO ───────────────────────────────────────────────
export interface IRequestRevisionDto {
  revisionType: RevisionType;
  remarks:      string;
}

export interface IApprovalsQuery {
  page?:   number;
  limit?:  number;
  status?: ApprovalStatus;
}

export type IApprovalsResponse = IPaginatedResponse<IApprovalStep>;