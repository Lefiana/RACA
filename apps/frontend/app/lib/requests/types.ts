// File: apps/frontend/app/lib/requests/types.ts
// Purpose: All TypeScript interfaces for the requests module.
// Dependencies: ../types

import type { IPaginatedResponse } from '../types';

// ── NEW: ApprovalGroup enum ─────────────────────────────────────────────────
export type ApprovalGroup =
  | 'IT_CPE'
  | 'ART_SCIENCE'
  | 'THM_BM'
  | 'ASST_PRINCIPAL'
  | 'GEN_ED';

// CHANGED: Added REVISION_REQUESTED
export type RequestStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'STAGE1_REVIEW'
  | 'STAGE2_REVIEW'
  | 'PENDING_FINAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'REVISION_REQUESTED';  // ← NEW

export type ApprovalStage =
  | 'STAGE_1_ADVISER'
  | 'STAGE_1_DEPT_HEAD'
  | 'STAGE_2_ACADEMIC_HEAD'
  | 'STAGE_2_HEAD_OF_STUDENT_AFFAIRS'
  | 'STAGE_2_MIS'
  | 'STAGE_2_BUILDING'
  | 'STAGE_3_SCHOOL_ADMIN';

// CHANGED: Added REVISION_REQUESTED, SUSPENDED
export type ApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SKIPPED'
  | 'REVISION_REQUESTED'  // ← NEW
  | 'SUSPENDED';           // ← NEW

export interface IRequestApprovalStep {
  id:              string;
  stage:           ApprovalStage;
  stepOrder:       number;
  status:          ApprovalStatus;
  approverId:      string | null;
  approverName:    string | null;
  approverRole:    string | null;
  approverTitle:   string | null;
  remarks:         string | null;
  rejectionReason: string | null;
  decidedAt:       string | null;
  // ── NEW ──────────────────────────────────────────────────────────────────
  revisionType:    'REVISION_RESUME' | 'REVISION_RESTART' | null;
}

export interface IRequestVenueBooking {
  id:       string;
  venueId:  string;
  startAt:  string;
  endAt:    string;
  isLocked: boolean;
  venue?: {
    id:   string;
    name: string;
  };
}

export interface IRequestAssetCheckout {
  id:       string;
  assetId:  string;
  quantity: number;
  asset?: {
    id:       string;
    name:     string;
    assetTag: string;
    category: string;
  };
}

export interface IRequestedBy {
  id:         string;
  name:       string;
  email:      string | null;
  username:   string | null;
  department: string | null;
}

// CHANGED: Added approvalGroup, revisionCount, revisedAt, previousStatus
export interface IRequest {
  id:                    string;
  referenceNumber:       string;
  requestedById:         string;
  activityTitle:         string;
  theme:                 string | null;
  objectives:            string;
  activityStartAt:       string;
  activityEndAt:         string;
  venueDescription:      string | null;
  equipmentDescription:  string | null;
  speakers:              ISpeaker[];
  expectedAudience:      string | null;
  expectedHeadcount:     number | null;
  remarks:               string | null;
  status:                RequestStatus;
  submittedAt:           string | null;
  completedAt:           string | null;
  // ── NEW ──────────────────────────────────────────────────────────────────
  approvalGroup:         ApprovalGroup | null;
  revisionCount:         number;
  revisedAt:             string | null;
  previousStatus:        RequestStatus | null;
  createdAt:             string;
  updatedAt:             string;
  requestedBy?:          IRequestedBy;
  venueBookings?:        IRequestVenueBooking[];
  assetCheckouts?:       IRequestAssetCheckout[];
  approvalSteps?:        IRequestApprovalStep[];
}

export interface ISpeaker {
  name:          string;
  position?:     string;
  organization?: string;
}

export interface IVenueSelection {
  venueId: string;
}

export interface IAssetSelection {
  assetId:  string;
  quantity: number;
}

// CHANGED: Added approvalGroup
export interface ICreateRequestDto {
  activityTitle:         string;
  theme?:                string;
  objectives:            string;
  activityStartAt:       string;
  activityEndAt:         string;
  venueDescription?:     string;
  equipmentDescription?: string;
  venues?:               IVenueSelection[];
  assets?:               IAssetSelection[];
  speakers?:             ISpeaker[];
  expectedAudience?:     string;
  expectedHeadcount?:    number;
  remarks?:              string;
  // ── NEW ──────────────────────────────────────────────────────────────────
  approvalGroup:         ApprovalGroup;
}

export type IUpdateRequestDto = Partial<ICreateRequestDto>;

export interface ISubmitRequestDto {
  adviserId: string;
}

// ── NEW: Resubmit DTO (empty body) ──────────────────────────────────────
export interface IResubmitRequestDto {}

// CHANGED: viewMode added — controls backend scoping for list queries
export interface IGetRequestsParams {
  page?:      number;
  limit?:     number;
  status?:    RequestStatus;
  dateFrom?:  string;
  dateTo?:    string;
  search?:    string;
  viewMode?:  'my_requests' | 'for_my_review';
}

export type IRequestsResponse = IPaginatedResponse<IRequest>;