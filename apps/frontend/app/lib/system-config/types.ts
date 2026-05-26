// File: apps/frontend/lib/system-config/types.ts

import type { IPaginatedResponse } from '../types';

export interface ISystemConfig {
  id:          string;
  key:         string;
  value:       string;
  description: string | null;
  updatedBy:   string | null;
  updatedAt:   string;
  createdAt:   string;
  isProtected: boolean;
}

export interface IUpsertSystemConfigDto {
  key:          string;
  value:        string;
  description?: string;
}

export interface IUpdateSystemConfigDto {
  value:        string;
  description?: string;
}

export interface ISystemConfigQuery {
  page?:   number;
  limit?:  number;
  search?: string;
}

export type ISystemConfigResponse = IPaginatedResponse<ISystemConfig>;