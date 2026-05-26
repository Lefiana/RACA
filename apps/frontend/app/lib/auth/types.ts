// File: apps/frontend/lib/auth/types.ts
// Purpose: TypeScript interfaces for auth and session data.

export interface IUser {
  id:           string;
  name:         string;
  email:        string;
  username:     string | null;
  role:         string;
  department:   string | null;
  isActive:     boolean;
  image:        string | null;
  lastLoginAt:  string | null;
  createdAt:    string;
  updatedAt:    string;
}

export interface ISession {
  user:    IUser;
  session: {
    id:        string;
    expiresAt: string;
    token:     string;
  };
}

export interface ISignInDto {
  email:    string;
  password: string;
}

export interface ISignUpDto {
  name:        string;
  email:       string;
  password:    string;
  username?:   string;
  department?: string;
}

export interface IAuthResponse {
  user:  IUser;
  token: string;
}