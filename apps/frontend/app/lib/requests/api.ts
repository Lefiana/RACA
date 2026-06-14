// File: apps/frontend/lib/requests/api.ts
// Purpose: All HTTP calls for the request lifecycle.
// Dependencies: apiClient (../axios), types

import { apiClient } from '../axios';
import type {
  IRequest,
  ICreateRequestDto,
  IUpdateRequestDto,
  ISubmitRequestDto,
  IGetRequestsParams,
  IRequestsResponse,
} from './types';

export async function getRequests(
  params: IGetRequestsParams = {},
): Promise<IRequestsResponse> {
  const res = await apiClient.get<IRequestsResponse>('/requests', {
    params,
  });
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

export async function updateRequest(
  id:  string,
  dto: IUpdateRequestDto,
): Promise<IRequest> {
  const res = await apiClient.patch<IRequest>(`/requests/${id}`, dto);
  return res.data;
}

// CHANGED: Accepts adviserId wrapped in ISubmitRequestDto body per updated layout requirements
export async function submitRequest(
  id:  string,
  dto: ISubmitRequestDto,
): Promise<IRequest> {
  const res = await apiClient.post<IRequest>(`/requests/${id}/submit`, dto);
  return res.data;
}

export async function cancelRequest(id: string): Promise<void> {
  await apiClient.delete(`/requests/${id}`);
}