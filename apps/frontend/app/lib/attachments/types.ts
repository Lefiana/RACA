// File: apps/frontend/lib/attachments/types.ts

export interface IAttachment {
  id:           string;
  requestId:    string | null;
  approvalStepId: string | null;
  uploadedById: string;
  originalName: string;
  storedName:   string;
  mimeType:     string;
  sizeBytes:    number;
  label:        string | null;
  createdAt:    string;
  uploadedBy:   { id: string; name: string };
}

export interface IUploadAttachmentDto {
  label?: string;
}