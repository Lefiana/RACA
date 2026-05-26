// File: apps/frontend/lib/assets/types.ts
// Purpose: TypeScript interfaces for asset inventory management.

import type { IPaginatedResponse } from '../types';

export type AssetStatus =
  | 'AVAILABLE' | 'RESERVED' | 'CHECKED_OUT'
  | 'MAINTENANCE' | 'LOST' | 'DAMAGED';

export type AssetCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
export type AssetCustodian = 'MIS' | 'BUILDING_ADMIN' | 'HRM_CUSTODIAN';
export type CheckoutStatus =
  | 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'LOST' | 'DAMAGED_ON_RETURN';

export interface IAsset {
  id:           string;
  assetTag:     string;
  name:         string;
  description:  string | null;
  category:     string;
  serialNumber: string | null;
  brand:        string | null;
  model:        string | null;
  status:       AssetStatus;
  condition:    AssetCondition;
  custodianRole: AssetCustodian;
  location:     string | null;
  createdAt:    string;
  updatedAt:    string;
}

export interface IAssetCheckout {
  id:                string;
  requestId:         string;
  assetId:           string;
  quantity:          number;
  status:            CheckoutStatus;
  checkedOutAt:      string | null;
  dueAt:             string | null;
  returnedAt:        string | null;
  conditionOnOut:    AssetCondition | null;
  conditionOnReturn: AssetCondition | null;
  damageNotes:       string | null;
  asset: {
    id:       string;
    name:     string;
    assetTag: string;
  };
  request: {
    referenceNumber: string;
    activityTitle:   string;
    activityStartAt: string;
  };
}

export interface ICreateAssetDto {
  assetTag:      string;
  name:          string;
  description?:  string;
  category:      string;
  brand?:        string;
  model?:        string;
  serialNumber?: string;
  location?:     string;
  condition?:    AssetCondition;
  custodianRole?: AssetCustodian;
}

export type IUpdateAssetDto = Partial<ICreateAssetDto>;

export interface ISetAssetStatusDto {
  status:  AssetStatus;
  reason?: string;
}

export interface IProcessCheckoutDto {
  condition?: AssetCondition;
  notes?:     string;
}

export interface IAssetsQuery {
  page?:          number;
  limit?:         number;
  status?:        AssetStatus;
  category?:      string;
  search?:        string;
  custodianRole?: AssetCustodian;
}

export type IAssetsResponse = IPaginatedResponse<IAsset>;