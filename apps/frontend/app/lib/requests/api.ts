// File: apps/frontend/lib/requests/api.ts
// Purpose: Request lifecycle API calls.
// Dependencies: apiClient, requests/types

import { apiClient } from '../axios';
import type {
  IRequest,
  IRequestsQuery,
  IRequestsResponse,
  ICreateRequestDto,
  IUpdateRequestDto,
} from './types';

export async function getRequests(query?: IRequestsQuery): Promise<IRequestsResponse> {
  const res = await apiClient.get<IRequestsResponse>('/requests', { params: query });
  return res.data;
}

export async function getRequestById(id: string): Promise<IRequest> {
  const res = await apiClient.get<IRequest>(`/requests/${id}`);
  return res.data;
}

export async function createRequest(dto: ICreateRequestDto): Promise<IRequest> {
  const res = await apiClient.post<IRequest>('/requests', dto);
  return res.data;
}

export async function updateRequest(id: string, dto: IUpdateRequestDto): Promise<IRequest> {
  const res = await apiClient.patch<IRequest>(`/requests/${id}`, dto);
  return res.data;
}

export async function submitRequest(id: string): Promise<IRequest> {
  const res = await apiClient.post<IRequest>(`/requests/${id}/submit`);
  return res.data;
}

export async function cancelRequest(id: string): Promise<void> {
  await apiClient.delete(`/requests/${id}`);
}