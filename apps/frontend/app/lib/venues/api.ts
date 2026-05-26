// File: apps/frontend/lib/venues/api.ts
// Purpose: Venue management API calls.
// Dependencies: apiClient, venues/types

import { apiClient } from '../axios';
import type {
  ICreateVenueDto,
  ISetVenueStatusDto,
  IUpdateVenueDto,
  IVenue,
  IVenueAvailability,
  IVenuesQuery,
  IVenuesResponse,
} from './types';

export async function getVenues(query?: IVenuesQuery): Promise<IVenuesResponse> {
  const res = await apiClient.get<IVenuesResponse>('/venues', { params: query });
  return res.data;
}

export async function getVenueById(id: string): Promise<IVenue> {
  const res = await apiClient.get<IVenue>(`/venues/${id}`);
  return res.data;
}

export async function getVenueAvailability(
  id:   string,
  from: string,
  to:   string,
): Promise<IVenueAvailability> {
  const res = await apiClient.get<IVenueAvailability>(
    `/venues/${id}/availability`,
    { params: { from, to } },
  );
  return res.data;
}

export async function createVenue(dto: ICreateVenueDto): Promise<IVenue> {
  const res = await apiClient.post<IVenue>('/venues', dto);
  return res.data;
}

export async function updateVenue(
  id:  string,
  dto: IUpdateVenueDto,
): Promise<IVenue> {
  const res = await apiClient.patch<IVenue>(`/venues/${id}`, dto);
  return res.data;
}

export async function setVenueStatus(
  id:  string,
  dto: ISetVenueStatusDto,
): Promise<IVenue> {
  const res = await apiClient.patch<IVenue>(`/venues/${id}/status`, dto);
  return res.data;
}

export async function deleteVenue(id: string): Promise<void> {
  await apiClient.delete(`/venues/${id}`);
}