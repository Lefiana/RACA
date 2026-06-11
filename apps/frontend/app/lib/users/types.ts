// File: apps/frontend/lib/users/types.ts
// Purpose: TypeScript interfaces for user management.

import type { IPaginatedResponse } from '../types';

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

export interface IUser {
  id:          string;
  name:        string;
  email:       string;
  username:    string | null;
  role:        UserRole;
  department:  string | null;
  isActive:    boolean;
  image:       string | null;
  lastLoginAt: string | null;
  createdAt:   string;
  updatedAt:   string;
}

export interface IUpdateRoleDto {
  role: UserRole;
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