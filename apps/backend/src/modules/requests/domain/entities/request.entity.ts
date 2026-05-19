// File: apps/backend/src/modules/requests/domain/entities/request.entity.ts
// Purpose: Typed domain representation of a Request.
//          The repository maps raw Prisma results to this shape before
//          returning to the service layer. Prisma types never leak past
//          the repository boundary.
// Dependencies: @repo/database (enums only)

import { RequestStatus, ApprovalStatus, ApprovalStage } from '@repo/database';

export class RequestEntity {
  id:              string;
  referenceNumber: string;
  requestedById:   string;

  // Section I
  activityTitle: string;
  theme:         string | null;

  // Section II
  objectives: string;

  // Section III
  activityStartAt: Date;
  activityEndAt:   Date;

  // Section IV
  venueDescription:     string | null;
  equipmentDescription: string | null;

  // Section V — [{ name, position, organization }]
  speakers: SpeakerEntry[];

  // Section VI
  expectedAudience:  string | null;
  expectedHeadcount: number | null;

  remarks:     string | null;
  status:      RequestStatus;
  submittedAt: Date | null;
  completedAt: Date | null;
  createdAt:   Date;
  updatedAt:   Date;

  // Populated relations (optional — only present when explicitly included)
  requestedBy?:   RequestUserSnapshot;
  venueBookings?: RequestVenueBooking[];
  approvalSteps?: RequestApprovalStep[];
}

export interface SpeakerEntry {
  name:         string;
  position:     string;
  organization: string;
}

export interface RequestUserSnapshot {
  id:         string;
  name:       string;
  email:      string | null;
  username:   string | null;
  department: string | null;
}

export interface RequestVenueBooking {
  id:       string;
  venueId:  string;
  startAt:  Date;
  endAt:    Date;
  isLocked: boolean;
  venue?: {
    id:   string;
    name: string;
  };
}

export interface RequestApprovalStep {
  id:             string;
  stage:          ApprovalStage;
  stepOrder:      number;
  status:         ApprovalStatus;
  approverName:   string | null;
  approverRole:   string | null;
  approverTitle:  string | null;
  remarks:        string | null;
  rejectionReason: string | null;
  decidedAt:      Date | null;
}
