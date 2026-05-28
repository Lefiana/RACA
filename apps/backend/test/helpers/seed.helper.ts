// File: apps/backend/test/helpers/seed.helper.ts
// Purpose: Seeds the minimum data required for specific test suites.
//          System config keys are always seeded — other modules depend on them.
//          Venue and asset seeds are optional per suite.
// Dependencies: @repo/database

import { prisma } from '@repo/database';

// Seeds the four protected system config keys.
// Called in beforeAll of any suite that touches Requests or Attachments.
export async function seedSystemConfig(): Promise<void> {
  const configs = [
    {
      key:   'reservation_buffer_min',
      value: '30',
      description: 'Buffer minutes around venue bookings',
    },
    {
      key:   'reference_number_prefix',
      value: 'RACA',
      description: 'Reference number prefix',
    },
    {
      key:   'allowed_mime_types',
      value: 'application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      description: 'Allowed MIME types for uploads',
    },
    {
      key:   'max_upload_size_mb',
      value: '10',
      description: 'Max upload size in MB',
    },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where:  { key: config.key },
      update: {},
      create: config,
    });
  }
}

// Seeds a test venue — returns the created venue
export async function seedVenue(overrides?: {
  name?:     string;
  capacity?: number;
}) {
  return prisma.venue.create({
    data: {
      name:     overrides?.name     ?? 'Test Venue',
      capacity: overrides?.capacity ?? 100,
      status:   'AVAILABLE',
      features: [],
    },
  });
}

// Seeds a test asset — returns the created asset
export async function seedAsset(overrides?: {
  assetTag?:     string;
  name?:         string;
  custodianRole?: 'MIS' | 'BUILDING_ADMIN' | 'HRM_CUSTODIAN';
}) {
  return prisma.asset.create({
    data: {
      assetTag:      overrides?.assetTag      ?? `TEST-${Date.now()}`,
      name:          overrides?.name          ?? 'Test Asset',
      category:      'Test',
      custodianRole: overrides?.custodianRole ?? 'MIS',
      status:        'AVAILABLE',
      condition:     'GOOD',
    },
  });
}