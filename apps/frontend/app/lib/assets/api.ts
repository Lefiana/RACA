// File: apps/frontend/lib/assets/api.ts
// Purpose: Asset management API calls including CSV import.
// Dependencies: apiClient, assets/types

import { apiClient } from '../axios';
import type {
  IAsset,
  IAssetCheckout,
  IAssetsQuery,
  IAssetsResponse,
  ICreateAssetDto,
  IProcessCheckoutDto,
  ISetAssetStatusDto,
  IUpdateAssetDto,
} from './types';

export async function getAssets(query?: IAssetsQuery): Promise<IAssetsResponse> {
  const res = await apiClient.get<IAssetsResponse>('/assets', { params: query });
  return res.data;
}

export async function getAssetById(id: string): Promise<IAsset> {
  const res = await apiClient.get<IAsset>(`/assets/${id}`);
  return res.data;
}

export async function getActiveCheckouts(): Promise<IAssetCheckout[]> {
  const res = await apiClient.get<IAssetCheckout[]>('/assets/checkouts/active');
  return res.data;
}

export async function createAsset(dto: ICreateAssetDto): Promise<IAsset> {
  const res = await apiClient.post<IAsset>('/assets', dto);
  return res.data;
}

export async function updateAsset(
  id: string, dto: IUpdateAssetDto,
): Promise<IAsset> {
  const res = await apiClient.patch<IAsset>(`/assets/${id}`, dto);
  return res.data;
}

export async function setAssetStatus(
  id: string, dto: ISetAssetStatusDto,
): Promise<IAsset> {
  const res = await apiClient.patch<IAsset>(`/assets/${id}/status`, dto);
  return res.data;
}

export async function deleteAsset(id: string): Promise<void> {
  await apiClient.delete(`/assets/${id}`);
}

export async function processCheckout(
  checkoutId: string, dto: IProcessCheckoutDto,
): Promise<IAssetCheckout> {
  const res = await apiClient.post<IAssetCheckout>(
    `/assets/checkout/${checkoutId}/process`, dto,
  );
  return res.data;
}

export async function processReturn(
  checkoutId: string, dto: IProcessCheckoutDto,
): Promise<IAssetCheckout> {
  const res = await apiClient.post<IAssetCheckout>(
    `/assets/checkout/${checkoutId}/return`, dto,
  );
  return res.data;
}

export async function importAssetsCsv(
  file: File,
): Promise<{ created: number; updated: number; skipped: number; errors: any[] }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post('/assets/import/csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export function getAssetCsvTemplateUrl(): string {
  return `${apiClient.defaults.baseURL}/assets/import/template`;
}