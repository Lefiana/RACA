// File: apps/backend/src/modules/assets/services/assets.service.ts
// Purpose: Business logic for asset inventory management, checkout/return
//          processing, and CSV bulk import.
//          Enforces custodian-scoped access — each role only sees/manages their own assets.
// Dependencies: AssetsRepository, CsvImportService, EventEmitter2, @repo/database

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AssetCondition,
  AssetCustodian,
  AssetStatus,
  CheckoutStatus,
  UserRole,
} from '@repo/database';

import { AssetsRepository }  from '../repositories/assets.repository';
import { CsvImportService }  from './csv-import.service';
import { CreateAssetDto }    from '../dto/create-asset.dto';
import { UpdateAssetDto, QueryAssetDto, SetAssetStatusDto, ProcessCheckoutDto } from '../dto/assets.dto';

// Maps UserRole to AssetCustodian for scoping queries
const ROLE_TO_CUSTODIAN: Partial<Record<UserRole, AssetCustodian>> = {
  [UserRole.MIS]:            AssetCustodian.MIS,
  [UserRole.BUILDING_ADMIN]: AssetCustodian.BUILDING_ADMIN,
  [UserRole.HRM_CUSTODIAN]:  AssetCustodian.HRM_CUSTODIAN,
};

// Roles that can write assets
const ASSET_WRITE_ROLES = new Set<UserRole>([
  UserRole.MIS,
  UserRole.BUILDING_ADMIN,
  UserRole.HRM_CUSTODIAN,
  UserRole.SUPER_ADMIN,
]);

// Roles that can read all assets regardless of custodian
const ASSET_READ_ALL_ROLES = new Set<UserRole>([
  UserRole.SCHOOL_ADMIN,
  UserRole.SUPER_ADMIN,
]);

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    private readonly assetsRepo:      AssetsRepository,
    private readonly csvImportService: CsvImportService,
    private readonly eventEmitter:     EventEmitter2,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────────

  async create(userId: string, userRole: UserRole, dto: CreateAssetDto) {
    this.assertWriteAccess(userRole);

    const existing = await this.assetsRepo.findByTag(dto.assetTag);
    if (existing) {
      throw new BadRequestException(`Asset tag "${dto.assetTag}" is already in use`);
    }

    // Custodian is stamped from session role unless SUPER_ADMIN explicitly sets it
    const custodianRole = userRole === UserRole.SUPER_ADMIN
      ? (dto.custodianRole ?? AssetCustodian.MIS)
      : ROLE_TO_CUSTODIAN[userRole]!;

    const asset = await this.assetsRepo.create({
      assetTag:      dto.assetTag,
      name:          dto.name,
      description:   dto.description,
      category:      dto.category,
      brand:         dto.brand,
      model:         dto.model,
      serialNumber:  dto.serialNumber,
      location:      dto.location,
      condition:     dto.condition ?? AssetCondition.GOOD,
      status:        AssetStatus.AVAILABLE,
      custodianRole,
    });

    this.logger.log(`[AssetsService] created asset: ${asset.assetTag}`);
    return asset;
  }

  // ── Find many (custodian-scoped) ──────────────────────────────────────────

  async findMany(userRole: UserRole, query: QueryAssetDto) {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;

    // Determine custodian scope
    // SUPER_ADMIN/SCHOOL_ADMIN can see all or filter by custodianRole query param
    // Custodian roles are always scoped to their own assets
    const custodianRole = ASSET_READ_ALL_ROLES.has(userRole)
      ? query.custodianRole
      : ROLE_TO_CUSTODIAN[userRole];

    const { data, total } = await this.assetsRepo.findMany({
      skip:   (page - 1) * limit,
      take:   limit,
      status: query.status,
      category:      query.category,
      search:        query.search,
      custodianRole: custodianRole as AssetCustodian | undefined,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages:  Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  // ── Find one ──────────────────────────────────────────────────────────────

  async findOne(id: string, userRole: UserRole) {
    const asset = await this.assetsRepo.findByIdWithHistory(id);
    if (!asset) throw new NotFoundException('Asset not found');

    this.assertCustodianAccess(userRole, asset.custodianRole);
    return asset;
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(id: string, userRole: UserRole, dto: UpdateAssetDto) {
    this.assertWriteAccess(userRole);

    const asset = await this.assetsRepo.findById(id);
    if (!asset) throw new NotFoundException('Asset not found');

    this.assertCustodianAccess(userRole, asset.custodianRole);

    // Prevent tag collision on rename
    if (dto.assetTag && dto.assetTag !== asset.assetTag) {
      const existing = await this.assetsRepo.findByTag(dto.assetTag);
      if (existing) {
        throw new BadRequestException(`Asset tag "${dto.assetTag}" is already in use`);
      }
    }

    const updated = await this.assetsRepo.update(id, {
      ...(dto.assetTag     !== undefined && { assetTag:     dto.assetTag     }),
      ...(dto.name         !== undefined && { name:         dto.name         }),
      ...(dto.description  !== undefined && { description:  dto.description  }),
      ...(dto.category     !== undefined && { category:     dto.category     }),
      ...(dto.brand        !== undefined && { brand:        dto.brand        }),
      ...(dto.model        !== undefined && { model:        dto.model        }),
      ...(dto.serialNumber !== undefined && { serialNumber: dto.serialNumber }),
      ...(dto.location     !== undefined && { location:     dto.location     }),
      ...(dto.condition    !== undefined && { condition:    dto.condition    }),
    });

    this.logger.log(`[AssetsService] updated asset: ${id}`);
    return updated;
  }

  // ── Set status ────────────────────────────────────────────────────────────

  async setStatus(id: string, userRole: UserRole, dto: SetAssetStatusDto) {
    this.assertWriteAccess(userRole);

    const asset = await this.assetsRepo.findById(id);
    if (!asset) throw new NotFoundException('Asset not found');

    this.assertCustodianAccess(userRole, asset.custodianRole);

    await this.assetsRepo.setStatus(id, dto.status);
    this.logger.log(`[AssetsService] asset ${id} status → ${dto.status}`);
    return this.assetsRepo.findById(id);
  }

  // ── Soft delete ───────────────────────────────────────────────────────────

  async remove(id: string, userRole: UserRole) {
    this.assertWriteAccess(userRole);

    const asset = await this.assetsRepo.findById(id);
    if (!asset) throw new NotFoundException('Asset not found');

    this.assertCustodianAccess(userRole, asset.custodianRole);
    await this.assetsRepo.softDelete(id);
    this.logger.log(`[AssetsService] soft deleted asset: ${id}`);
  }

  // ── Process checkout ──────────────────────────────────────────────────────

  async processCheckout(checkoutId: string, userId: string, userRole: UserRole, dto: ProcessCheckoutDto) {
    const checkout = await this.assetsRepo.findCheckoutById(checkoutId);
    if (!checkout) throw new NotFoundException('Checkout record not found');

    this.assertCustodianAccess(userRole, checkout.asset.custodianRole);

    if (checkout.status !== CheckoutStatus.ACTIVE || checkout.checkedOutAt) {
      throw new BadRequestException('This item has already been checked out');
    }

    if (checkout.request.status !== 'APPROVED') {
      throw new BadRequestException(
        'Assets can only be checked out once the request is fully approved',
      );
    }

    const result = await this.assetsRepo.processCheckout(
      checkoutId,
      userId,
      dto.condition ?? AssetCondition.GOOD,
    );

    this.eventEmitter.emit('asset.checked_out', {
      assetId:    checkout.assetId,
      checkoutId,
      requestId:  checkout.requestId,
      handledById: userId,
    });

    this.logger.log(`[AssetsService] checked out: ${checkout.asset.assetTag}`);
    return result;
  }

  // ── Process return ────────────────────────────────────────────────────────

  async processReturn(checkoutId: string, userId: string, userRole: UserRole, dto: ProcessCheckoutDto) {
    const checkout = await this.assetsRepo.findCheckoutById(checkoutId);
    if (!checkout) throw new NotFoundException('Checkout record not found');

    this.assertCustodianAccess(userRole, checkout.asset.custodianRole);

    if (checkout.status === CheckoutStatus.RETURNED) {
      throw new BadRequestException('This item has already been returned');
    }

    if (!checkout.checkedOutAt) {
      throw new BadRequestException('This item has not been checked out yet');
    }

    const result = await this.assetsRepo.processReturn(
      checkoutId,
      userId,
      dto.condition ?? AssetCondition.GOOD,
      dto.notes,
    );

    this.eventEmitter.emit('asset.returned', {
      assetId:     checkout.assetId,
      checkoutId,
      requestId:   checkout.requestId,
      handledById: userId,
      condition:   dto.condition,
    });

    this.logger.log(`[AssetsService] returned: ${checkout.asset.assetTag}`);
    return result;
  }

  // ── CSV import ────────────────────────────────────────────────────────────

  async importCsv(userId: string, userRole: UserRole, fileBuffer: Buffer) {
    this.assertWriteAccess(userRole);

    const custodianRole = userRole === UserRole.SUPER_ADMIN
      ? AssetCustodian.MIS // SUPER_ADMIN defaults to MIS; can be a query param later
      : ROLE_TO_CUSTODIAN[userRole]!;

    const { rows, errors } = this.csvImportService.parse(fileBuffer, custodianRole);

    if (rows.length === 0 && errors.length > 0) {
      throw new BadRequestException({
        message: 'All rows failed validation',
        errors,
      });
    }

    const importResult = await this.assetsRepo.upsertMany(rows);

    this.logger.log(
      `[AssetsService] CSV import by ${userId}: ` +
      `created=${importResult.created}, updated=${importResult.updated}, ` +
      `errors=${importResult.errors.length + errors.length}`,
    );

    return {
      created: importResult.created,
      updated: importResult.updated,
      skipped: errors.length + importResult.errors.length,
      errors:  [...errors, ...importResult.errors],
    };
  }

  // ── CSV template ──────────────────────────────────────────────────────────

  getCsvTemplate(userRole: UserRole): { content: string; filename: string } {
    const custodianRole = ASSET_READ_ALL_ROLES.has(userRole)
      ? AssetCustodian.MIS
      : ROLE_TO_CUSTODIAN[userRole] ?? AssetCustodian.MIS;

    const content  = this.csvImportService.generateTemplate(custodianRole);
    const filename = `asset-import-template-${custodianRole.toLowerCase()}.csv`;

    return { content, filename };
  }

  // ── Active checkouts dashboard ────────────────────────────────────────────

  async findActiveCheckouts(userRole: UserRole) {
    const custodianRole = ASSET_READ_ALL_ROLES.has(userRole)
      ? undefined
      : ROLE_TO_CUSTODIAN[userRole];

    return this.assetsRepo.findActiveCheckouts(custodianRole as AssetCustodian | undefined);
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  private assertWriteAccess(userRole: UserRole) {
    if (!ASSET_WRITE_ROLES.has(userRole)) {
      throw new ForbiddenException('You do not have permission to manage assets');
    }
  }

  // Custodians can only touch their own assets.
  // SUPER_ADMIN and SCHOOL_ADMIN bypass this check.
  private assertCustodianAccess(userRole: UserRole, assetCustodian: AssetCustodian) {
    if (ASSET_READ_ALL_ROLES.has(userRole)) return;

    const userCustodian = ROLE_TO_CUSTODIAN[userRole];
    if (userCustodian && userCustodian !== assetCustodian) {
      throw new ForbiddenException(
        `You can only manage assets assigned to your department`,
      );
    }
  }
}
