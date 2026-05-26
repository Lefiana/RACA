// File: apps/frontend/lib/types.ts
// Purpose: Shared types used across all lib modules.
//          Import from here when a type is not module-specific.

export interface IPaginationMeta {
  total:       number;
  page:        number;
  limit:       number;
  totalPages:  number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface IPaginatedResponse<T> {
  data: T[];
  meta: IPaginationMeta;
}

// Standard API error shape returned by NestJS validation pipe
export interface IApiError {
  statusCode: number;
  message:    string | string[];
  error:      string;
}