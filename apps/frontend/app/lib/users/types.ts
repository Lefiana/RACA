// File: apps/frontend/app/lib/users/types.ts
// Purpose: TypeScript interfaces for user management.

import type { IPaginatedResponse } from '../types';

// ── NEW: ApprovalGroup for Department Head users ────────────────────────────
export type ApprovalGroup =
  | 'IT_CPE'
  | 'ART_SCIENCE'
  | 'THM_BM'
  | 'ASST_PRINCIPAL'
  | 'GEN_ED';

export type UserRole =
  | 'REQUESTOR'
  | 'ADVISER'
  | 'DEPARTMENT_HEAD'
  | 'MIS'
  | 'BUILDING_ADMIN'
  | 'HRM_CUSTODIAN'
  | 'STUDENT_AFFAIRS'
  | 'ACADEMIC_HEAD'
  | 'SCHOOL_ADMIN'
  | 'SUPER_ADMIN';

// CHANGED: Added approvalGroup
export interface IUser {
  id:             string;
  name:           string;
  email:          string;
  username:       string | null;
  role:           UserRole;
  department:     string | null;
  // ── NEW ──────────────────────────────────────────────────────────────────
  approvalGroup:  ApprovalGroup | null;
  isActive:       boolean;
  image:          string | null;
  lastLoginAt:    string | null;
  createdAt:      string;
  updatedAt:      string;
}

// CHANGED: Added optional approvalGroup (required when role = DEPARTMENT_HEAD)
export interface IUpdateRoleDto {
  role:          UserRole;
  approvalGroup?: ApprovalGroup;
}

export interface ICreateUserDto {
  name:        string;
  email:       string;
  password:    string;
  username?:   string;
  department?: string;
  role:        UserRole;
}

export interface IUsersQuery {
  page?:   number;
  limit?:  number;
  role?:   UserRole;
  search?: string;
}

export type IUsersResponse = IPaginatedResponse<IUser>;