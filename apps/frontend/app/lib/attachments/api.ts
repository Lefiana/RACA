// File: apps/frontend/lib/attachments/api.ts
// Purpose: Attachment upload, list, download, and delete calls.
// Dependencies: apiClient, attachments/types

import { apiClient } from '../axios';
import type { IAttachment, IUploadAttachmentDto } from './types';

export async function getAttachmentsByRequest(
  requestId: string,
  label?:    string,
): Promise<IAttachment[]> {
  const res = await apiClient.get<IAttachment[]>(
    `/attachments/request/${requestId}`,
    { params: label ? { label } : undefined },
  );
  return res.data;
}

export async function uploadToRequest(
  requestId: string,
  file:      File,
  dto?:      IUploadAttachmentDto,
): Promise<IAttachment> {
  const formData = new FormData();
  formData.append('file', file);
  if (dto?.label) formData.append('label', dto.label);

  const res = await apiClient.post<IAttachment>(
    `/attachments/request/${requestId}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data;
}

export async function uploadToStep(
  stepId: string,
  file:   File,
  dto?:   IUploadAttachmentDto,
): Promise<IAttachment> {
  const formData = new FormData();
  formData.append('file', file);
  if (dto?.label) formData.append('label', dto.label);

  const res = await apiClient.post<IAttachment>(
    `/attachments/step/${stepId}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data;
}

// Returns the direct download URL — use as an <a href> or window.open()
export function getDownloadUrl(id: string): string {
  return `${apiClient.defaults.baseURL}/attachments/${id}/download`;
}

export async function deleteAttachment(id: string): Promise<void> {
  await apiClient.delete(`/attachments/${id}`);
}