// File: apps/api/prisma/seed.ts
// Purpose: Seeds SystemConfig rows, a default Super Admin account,
//          initial venues, and sample assets for development
// Dependencies: @prisma/client, bcrypt

import { PrismaClient, UserRole, VenueStatus, AssetStatus, AssetCondition } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─────────────────────────────────────────────
  // SYSTEM CONFIG
  // These are the only place institutional names
  // and tunable values live — never in code.
  // ─────────────────────────────────────────────

  const configs = [
    { key: 'school_admin_name',       value: 'Ms. Kimberly U. Bantad',  description: 'Displayed name of the School Administrator on approval forms' },
    { key: 'school_admin_title',      value: 'School Administrator',    description: 'Title label for School Administrator' },
    { key: 'building_admin_name',     value: 'Genovia, Joseph Marco M.',  description: 'Displayed name of the current Building Administrator' },
    { key: 'building_admin_title',    value: 'Building Administrator',  description: 'Title label for Building Administrator' },
    { key: 'institution_name',        value: 'STI Academic Center Cubao', description: 'Full institution name displayed on forms and reports' },
    { key: 'institution_address',     value: '5th Ave. Corner P. Tuazon Blvd., Quezon City', description: 'Institution address for form headers' },
    { key: 'institution_tel',         value: '412-10-29',               description: 'Institution telephone number' },
    { key: 'max_upload_size_mb',      value: '50',                      description: 'Maximum file upload size in megabytes' },
    { key: 'allowed_mime_types',      value: 'application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document', description: 'Comma-separated allowed MIME types for attachments' },
    { key: 'reservation_buffer_min',  value: '30',                      description: 'Buffer time in minutes added before and after venue reservations' },
    { key: 'approval_sla_hours',      value: '24',                      description: 'Hours before an approval step is flagged as overdue' },
    { key: 'reference_number_prefix', value: 'RACA',                    description: 'Prefix used when generating request reference numbers' },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value, description: config.description },
      create: config,
    });
  }

  console.log(`  ✓ ${configs.length} system config rows seeded`);

// ─────────────────────────────────────────────
  // SUPER ADMIN USER (Better Auth Compliant)
  // ─────────────────────────────────────────────

  // 1. Create the base User identity profile
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@sti-cubao.edu.ph' },
    update: {},
    create: {
      email:         'admin@sti-cubao.edu.ph',
      name:          'Super Administrator',
      emailVerified: true,
      role:          UserRole.SUPER_ADMIN, // Ensure this enum exists on your updated User model
    },
  });

  // 2. Link the encrypted password credential to the Account model
  const superAdminPassword = await bcrypt.hash('ChangeMe@123', 12);

  await prisma.account.upsert({
    where: {
      // Better Auth uses a compound ID, but for seeding we can look up by a unique composite/id
      id: `identity_credential_${superAdmin.id}`,
    },
    update: {},
    create: {
      id:           `identity_credential_${superAdmin.id}`,
      userId:       superAdmin.id,
      providerId:   'credential', // Replaces AuthProvider.LOCAL
      accountId:    superAdmin.id, // Better Auth uses this to track internal IDs
      password:     superAdminPassword, // Replaces passwordHash
    },
  });

  console.log(`  ✓ Super admin seeded (username: superadmin)`);

  // ─────────────────────────────────────────────
  // VENUES
  // ─────────────────────────────────────────────

  const venues = [
    // --- Computer Laboratories ---
    { name: 'Computer Laboratory 101', description: 'Computer Lab 101 description', building: 'Main Building', floor: '1st Floor', capacity: 40, features: ['computers', 'projector', 'aircon'] },
    { name: 'Computer Laboratory 504', description: 'Computer Lab 504 description', building: 'Main Building', floor: '5th Floor', capacity: 40, features: ['computers', 'projector', 'aircon'] },
    { name: 'Computer Laboratory 505', description: 'Computer Lab 505 description', building: 'Main Building', floor: '5th Floor', capacity: 40, features: ['computers', 'projector', 'aircon'] },
    { name: 'Computer Laboratory 506', description: 'Computer Lab 506 description', building: 'Main Building', floor: '5th Floor', capacity: 40, features: ['computers', 'projector', 'aircon'] },
    { name: 'Computer Laboratory 507', description: 'Computer Lab 507 description', building: 'Main Building', floor: '5th Floor', capacity: 40, features: ['computers', 'projector', 'aircon'] },

    // --- Specialized 5th Floor Rooms ---
    { name: 'Room 501', description: 'Photography Room', building: 'Main Building', floor: '5th Floor', capacity: 30, features: ['aircon', 'photography_equipment'] },
    { name: 'Room 502', description: 'Broadcasting Room', building: 'Main Building', floor: '5th Floor', capacity: 30, features: ['aircon', 'sound_system', 'broadcasting_gear'] },
    { name: 'Room 503', description: 'Bar and Dining Room', building: 'Main Building', floor: '5th Floor', capacity: 40, features: ['aircon', 'dining_setup'] },
    { name: 'Room 508', description: 'THM Room', building: 'Main Building', floor: '5th Floor', capacity: 40, features: ['aircon'] },

    // --- General Amenities & High Floors ---
    { name: 'Lobby', description: 'Main entrance lobby area', building: 'Main Building', floor: 'Ground Floor', capacity: 100, features: ['open_space'] },
    { name: 'Kitchen', description: 'Culinary arts/kitchen laboratory', building: 'Main Building', floor: 'Ground Floor', capacity: 30, features: ['kitchen_equipment'] },
    { name: 'Multi Purpose Hall', description: '7th Floor Multi Purpose Hall', building: 'Main Building', floor: '7th Floor', capacity: 300, features: ['aircon', 'sound_system', 'stage'] },
    { name: 'Court', description: '8th Floor Sports Court', building: 'Main Building', floor: '8th Floor', capacity: 500, features: ['open_space', 'bleachers'] },
    { name: 'Parking', description: 'Institutional parking slots', building: 'Main Building', floor: 'Ground Floor', capacity: 50, features: ['open_space'] },
  ];

  // Programmatically generate standard classrooms (201-211, 301-311, 401-411)
  const floorLayers = [
    { floorNum: 2, floorLabel: '2nd Floor' },
    { floorNum: 3, floorLabel: '3rd Floor' },
    { floorNum: 4, floorLabel: '4th Floor' },
  ];

  for (const layer of floorLayers) {
    for (let roomNum = 1; roomNum <= 11; roomNum++) {
      // Formats numbers properly (e.g., 201, 211)
      const roomString = `${layer.floorNum}${roomNum.toString().padStart(2, '0')}`;
      venues.push({
        name: `Room ${roomString}`,
        description: `Standard Classroom ${roomString}`,
        building: 'Main Building',
        floor: layer.floorLabel,
        capacity: 45,
        features: ['aircon', 'whiteboard', 'projector'],
      });
    }
  }

  for (const venue of venues) {
    await prisma.venue.upsert({
      where: { name: venue.name },
      update: {},
      create: { ...venue, status: VenueStatus.AVAILABLE },
    });
  }

  console.log(`  ✓ ${venues.length} venues seeded`);

  // ─────────────────────────────────────────────
  // ASSETS
  // ─────────────────────────────────────────────

  const assets = [
    { assetTag: 'CUB-PRJ-001', name: 'Projector Unit 1',      category: 'Projector',  brand: 'Epson',  model: 'EB-X41',    serialNumber: 'EPS-001' },
    { assetTag: 'CUB-PRJ-002', name: 'Projector Unit 2',      category: 'Projector',  brand: 'Epson',  model: 'EB-X41',    serialNumber: 'EPS-002' },
    { assetTag: 'CUB-MIC-001', name: 'Wireless Microphone 1', category: 'Microphone', brand: 'Shure',  model: 'PGX14',     serialNumber: 'SHR-001' },
    { assetTag: 'CUB-MIC-002', name: 'Wireless Microphone 2', category: 'Microphone', brand: 'Shure',  model: 'PGX14',     serialNumber: 'SHR-002' },
    { assetTag: 'CUB-MIC-003', name: 'Wired Microphone 1',    category: 'Microphone', brand: 'Shure',  model: 'SM58',      serialNumber: 'SHR-003' },
    { assetTag: 'CUB-AUXSPK-001', name: 'Aux Speaker System 1',      category: 'Speaker',    brand: 'Kevler',    model: 'EON615',    serialNumber: 'KVL-001' },
    { assetTag: 'CUB-AUXSPK-002', name: 'Aux Speaker System 2',      category: 'Speaker',    brand: 'Kevler',    model: 'EON615',    serialNumber: 'KVL-002' },
    { assetTag: 'CUB-MVSPK-003', name: 'Movable Speaker System 1',      category: 'Speaker',    brand: 'Kevler',    model: 'EON615',    serialNumber: 'KVL-003' },
    { assetTag: 'CUB-LPT-001', name: 'Laptop Unit 1',         category: 'Laptop',     brand: 'Dell',   model: 'Latitude',  serialNumber: 'DEL-001' },
    { assetTag: 'CUB-LPT-002', name: 'Laptop Unit 2',         category: 'Laptop',     brand: 'Dell',   model: 'Latitude',  serialNumber: 'DEL-002' },
    { assetTag: 'CUB-EXT-001', name: 'Extension Cord 1 (5m)', category: 'Extension Cord', brand: 'Generic', model: '5m',   serialNumber: null },
    { assetTag: 'CUB-EXT-002', name: 'Extension Cord 2 (5m)', category: 'Extension Cord', brand: 'Generic', model: '5m',   serialNumber: null },
    { assetTag: 'CUB-CAM-001', name: 'DSLR Camera',           category: 'Camera',     brand: 'Canon',  model: 'EOS 2000D', serialNumber: 'CAN-001' },
    { assetTag: 'CUB-HDCAM-001', name: 'HD Camera',           category: 'Camera',     brand: 'Canon',  model: 'EOS 2000D', serialNumber: 'HDCAN-001' },
    { assetTag: 'CUB-HDM-001', name: 'HDMI Cable (3m)',        category: 'Cable',      brand: 'Generic', model: 'HDMI 3m', serialNumber: null },
    { assetTag: 'CUB-HDM-002', name: 'HDMI Cable (5m)',        category: 'Cable',      brand: 'Generic', model: 'HDMI 5m', serialNumber: null },
  ];

  for (const asset of assets) {
    await prisma.asset.upsert({
      where: { assetTag: asset.assetTag },
      update: {},
      create: {
        ...asset,
        status:    AssetStatus.AVAILABLE,
        condition: AssetCondition.GOOD,
        location:  'MIS Office — Storage Room',
      },
    });
  }

  console.log(`  ✓ ${assets.length} assets seeded`);

  console.log('\n✅ Seeding complete.');
  console.log('   ⚠  Change the super admin password on first login.');
  console.log('   ⚠  Update building_admin_name in SystemConfig via the admin panel.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });