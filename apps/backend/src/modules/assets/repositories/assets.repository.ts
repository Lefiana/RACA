// File: apps/backend/src/modules/assets/repositories/assets.repository.ts
// CHANGED: inject PrismaService
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import {
  Prisma,
  AssetStatus,
  AssetCondition,
  AssetCustodian,
  CheckoutStatus,
} from '@repo/database';

@Injectable()
export class AssetsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.asset.findFirst({ where: { id, deletedAt: null } });
  }

  async findByIdWithHistory(id: string) {
    return this.prisma.asset.findFirst({
      where:   { id, deletedAt: null },
      include: {
        checkouts: {
          orderBy: { createdAt: 'desc' },
          take:    20,
          include: {
            request:   { select: { referenceNumber: true, activityTitle: true, activityStartAt: true } },
            handledBy: { select: { id: true, name: true } },
          },
        },
        maintenanceLogs: { orderBy: { startAt: 'desc' }, take: 10 },
      },
    });
  }

  async findByTag(assetTag: string) {
    return this.prisma.asset.findFirst({ where: { assetTag, deletedAt: null } });
  }

  async findMany(params: {
    skip:           number;
    take:           number;
    status?:        AssetStatus;
    category?:      string;
    search?:        string;
    custodianRole?: AssetCustodian;
  }) {
    const { skip, take, status, category, search, custodianRole } = params;

    const where: Prisma.AssetWhereInput = {
      deletedAt: null,
      ...(status        && { status        }),
      ...(category      && { category: { equals: category, mode: 'insensitive' } }),
      ...(custodianRole && { custodianRole }),
      ...(search && {
        OR: [
          { name:     { contains: search, mode: 'insensitive' } },
          { assetTag: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
          { brand:    { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({ where, skip, take, orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
      this.prisma.asset.count({ where }),
    ]);

    return { data, total };
  }

  async findCheckoutById(checkoutId: string) {
    return this.prisma.assetCheckout.findFirst({
      where:   { id: checkoutId },
      include: {
        asset:   true,
        request: { select: { id: true, referenceNumber: true, status: true } },
      },
    });
  }

  async findActiveCheckouts(custodianRole?: AssetCustodian) {
    return this.prisma.assetCheckout.findMany({
      where: {
        status: { in: [CheckoutStatus.ACTIVE, CheckoutStatus.OVERDUE] },
        ...(custodianRole && { asset: { is: { custodianRole } } }),
      },
      include: {
        asset:   { select: { id: true, name: true, assetTag: true } },
        request: { select: { referenceNumber: true, activityTitle: true, activityStartAt: true } },
      },
      orderBy: { dueAt: 'asc' },
    });
  }

  async create(data: Prisma.AssetCreateInput) {
    return this.prisma.asset.create({ data });
  }

  async update(id: string, data: Prisma.AssetUpdateInput) {
    return this.prisma.asset.update({ where: { id }, data });
  }

  async setStatus(id: string, status: AssetStatus) {
    return this.prisma.asset.update({ where: { id }, data: { status } });
  }

  async softDelete(id: string) {
    return this.prisma.asset.update({
      where: { id },
      data:  { deletedAt: new Date(), status: AssetStatus.DAMAGED },
    });
  }

  async processCheckout(checkoutId: string, handledById: string, condition: AssetCondition) {
    return this.prisma.$transaction(async (tx) => {
      const checkout = await tx.assetCheckout.update({
        where: { id: checkoutId },
        data: {
          status:         CheckoutStatus.ACTIVE,
          checkedOutAt:   new Date(),
          conditionOnOut: condition,
          handledById,
        },
        include: { asset: true },
      });
      await tx.asset.update({ where: { id: checkout.assetId }, data: { status: AssetStatus.CHECKED_OUT } });
      return checkout;
    });
  }

  async processReturn(checkoutId: string, handledById: string, condition: AssetCondition, notes?: string) {
    return this.prisma.$transaction(async (tx) => {
      const checkout = await tx.assetCheckout.update({
        where: { id: checkoutId },
        data: {
          status:            CheckoutStatus.RETURNED,
          returnedAt:        new Date(),
          conditionOnReturn: condition,
          damageNotes:       notes,
          handledById,
        },
        include: { asset: true },
      });
      const newAssetStatus = condition === AssetCondition.POOR ? AssetStatus.DAMAGED : AssetStatus.AVAILABLE;
      await tx.asset.update({ where: { id: checkout.assetId }, data: { status: newAssetStatus, condition } });
      return checkout;
    });
  }

  async upsertMany(assets: {
    assetTag:      string;
    name:          string;
    category:      string;
    brand?:        string;
    model?:        string;
    serialNumber?: string | null;
    location?:     string;
    condition?:    AssetCondition;
    custodianRole: AssetCustodian;
  }[]) {
    const results = { created: 0, updated: 0, errors: [] as { row: number; error: string }[] };

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      try {
        const existing = await this.prisma.asset.findFirst({ where: { assetTag: asset.assetTag } });

        if (existing) {
          await this.prisma.asset.update({
            where: { assetTag: asset.assetTag },
            data:  { ...asset, condition: asset.condition ?? AssetCondition.GOOD, deletedAt: null },
          });
          results.updated++;
        } else {
          await this.prisma.asset.create({
            data: { ...asset, condition: asset.condition ?? AssetCondition.GOOD, status: AssetStatus.AVAILABLE },
          });
          results.created++;
        }
      } catch (err: any) {
        results.errors.push({ row: i + 2, error: err.message });
      }
    }

    return results;
  }
}