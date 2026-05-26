// File: apps/frontend/lib/schedules/types.ts
// Purpose: TypeScript interfaces matching the GraphQL ObjectTypes.

export interface IScheduleFilterInput {
  from:       string;
  to:         string;
  venueId?:   string;
  assetId?:   string;
  requestId?: string;
}

export interface IVenueEvent {
  id:              string;
  venueId:         string;
  venueName:       string;
  requestId:       string;
  referenceNumber: string;
  activityTitle:   string;
  startAt:         string;
  endAt:           string;
  bufferStartAt:   string;
  bufferEndAt:     string;
  isLocked:        boolean;
  confirmedAt:     string | null;
  requestStatus:   string;
  requestedBy:     { name: string; department: string | null } | null;
}

export interface IAssetEvent {
  id:              string;
  assetId:         string;
  assetTag:        string;
  assetName:       string;
  category:        string;
  requestId:       string;
  referenceNumber: string;
  activityTitle:   string;
  status:          string;
  quantity:        number;
  checkedOutAt:    string | null;
  dueAt:           string | null;
  returnedAt:      string | null;
}

export interface IMaintenanceEvent {
  id:          string;
  entityType:  'VENUE' | 'ASSET';
  entityId:    string;
  entityName:  string;
  title:       string;
  description: string | null;
  startAt:     string;
  endAt:       string | null;
  resolvedAt:  string | null;
}

export interface ICalendarDay {
  date:               string;
  venueEventCount:    number;
  assetEventCount:    number;
  maintenanceCount:   number;
  venueEvents:        IVenueEvent[];
  assetEvents:        IAssetEvent[];
  maintenanceEvents:  IMaintenanceEvent[];
}