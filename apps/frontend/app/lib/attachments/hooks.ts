// File: apps/frontend/lib/attachments/hooks.ts

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteAttachment, getAttachmentsByRequest,
  uploadToRequest, uploadToStep,
} from './api';
import type { IUploadAttachmentDto } from './types';

export const attachmentKeys = {
  byRequest: (requestId: string) =>
    ['attachments', 'request', requestId] as const,
};

export function useAttachmentsByRequest(requestId: string, label?: string) {
  return useQuery({
    queryKey: [...attachmentKeys.byRequest(requestId), label],
    queryFn:  () => getAttachmentsByRequest(requestId, label),
    enabled:  !!requestId,
  });
}

export function useUploadToRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId, file, dto,
    }: { requestId: string; file: File; dto?: IUploadAttachmentDto }) =>
      uploadToRequest(requestId, file, dto),
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({
        queryKey: attachmentKeys.byRequest(requestId),
      });
    },
  });
}

export function useUploadToStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      stepId, file, dto,
    }: { stepId: string; file: File; dto?: IUploadAttachmentDto }) =>
      uploadToStep(stepId, file, dto),
  });
}

export function useDeleteAttachment(requestId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAttachment(id),
    onSuccess: () => {
      if (requestId) {
        queryClient.invalidateQueries({
          queryKey: attachmentKeys.byRequest(requestId),
        });
      }
    },
  });
}