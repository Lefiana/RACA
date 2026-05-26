// File: apps/frontend/lib/venues/types.ts
// Purpose: TypeScript interfaces for venue management.

import type { IPaginatedResponse } from '../types';

export type VenueStatus = 'AVAILABLE' | 'RESERVED' | 'MAINTENANCE' | 'BLOCKED';

export interface IVenue {
  id:          string;
  name:        string;
  description: string | null;
  building:    string | null;
  floor:       string | null;
  capacity:    number;
  status:      VenueStatus;
  features:    string[];
  imageUrl:    string | null;
  createdAt:   string;
  updatedAt:   string;
}

export interface IVenueAvailability {
  venue:    { id: string; name: string; status: VenueStatus };
  bookings: IVenueBooking[];
}

export interface IVenueBooking {
  id:            string;
  requestId:     string;
  startAt:       string;
  endAt:         string;
  bufferStartAt: string;
  bufferEndAt:   string;
  isLocked:      boolean;
  confirmedAt:   string | null;
  request: {
    id:              string;
    referenceNumber: string;
    activityTitle:   string;
    status:          string;
    activityStartAt: string;
    activityEndAt:   string;
  };
}

export interface ICreateVenueDto {
  name:         string;
  description?: string;
  building?:    string;
  floor?:       string;
  capacity:     number;
  features?:    string[];
  imageUrl?:    string;
}

export type IUpdateVenueDto = Partial<ICreateVenueDto>;

export interface ISetVenueStatusDto {
  status: VenueStatus;
  reason?: string;
}

export interface IVenuesQuery {
  page?:   number;
  limit?:  number;
  status?: VenueStatus;
  search?: string;
}

export type IVenuesResponse = IPaginatedResponse<IVenue>;