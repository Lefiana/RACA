// File: apps/frontend/lib/requests/types.ts
// Purpose: TypeScript interfaces for the RACA request lifecycle.

import type { IPaginatedResponse } from '../types';

export type RequestStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'STAGE1_REVIEW'
  | 'STAGE2_REVIEW'
  | 'PENDING_FINAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED';

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

export interface IRequestVenue {
  id:      string;
  venueId: string;
  startAt: string;
  endAt:   string;
  isLocked: boolean;
  venue?: { id: string; name: string };
}

export interface IRequestApprovalStep {
  id:              string;
  stage:           string;
  stepOrder:       number;
  approverId:      string | null;
  status:          string;
  approverName:    string | null;
  approverRole:    string | null;
  approverTitle:   string | null;
  remarks:         string | null;
  rejectionReason: string | null;
  decidedAt:       string | null;
}

export interface IRequest {
  id:                   string;
  referenceNumber:      string;
  requestedById:        string;
  activityTitle:        string;
  theme:                string | null;
  objectives:           string;
  activityStartAt:      string;
  activityEndAt:        string;
  venueDescription:     string | null;
  equipmentDescription: string | null;
  speakers:             ISpeaker[];
  expectedAudience:     string | null;
  expectedHeadcount:    number | null;
  remarks:              string | null;
  status:               RequestStatus;
  submittedAt:          string | null;
  completedAt:          string | null;
  createdAt:            string;
  updatedAt:            string;
  requestedBy?: {
    id:         string;
    name:       string;
    department: string | null;
  };
  venueBookings?:  IRequestVenue[];
  approvalSteps?:  IRequestApprovalStep[];
}

export interface ICreateRequestDto {
  activityTitle:        string;
  theme?:               string;
  objectives:           string;
  activityStartAt:      string;
  activityEndAt:        string;
  venueDescription?:    string;
  equipmentDescription?: string;
  venues?:              IVenueSelection[];
  assets?:              IAssetSelection[];
  speakers?:            ISpeaker[];
  expectedAudience?:    string;
  expectedHeadcount?:   number;
  remarks?:             string;
}

export type IUpdateRequestDto = Partial<ICreateRequestDto>;

export interface IRequestsQuery {
  page?:     number;
  limit?:    number;
  status?:   RequestStatus;
  dateFrom?: string;
  dateTo?:   string;
  search?:   string;
  viewAs?:   'owner' | 'approver'; // CHANGED: added
}

export type IRequestsResponse = IPaginatedResponse<IRequest>;