// File: apps/backend/src/modules/assets/repositories/assets.repository.ts
// Purpose: All Prisma queries for asset CRUD, checkout/return processing,
//          and custodian-scoped reads. Service never calls prisma directly.
// Dependencies: @repo/database, @nestjs/common

import { Injectable } from '@nestjs/common';
import {
  prisma,
  Prisma,
  AssetStatus,
  AssetCondition,
  AssetCustodian,
  CheckoutStatus,
} from '@repo/database';

@Injectable()
export class AssetsRepository {

  // ── Reads ─────────────────────────────────────────────────────────────────

  async findById(id: string) {
    return prisma.asset.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByIdWithHistory(id: string) {
    return prisma.asset.findFirst({
      where:   { id, deletedAt: null },
      include: {
        checkouts: {
          orderBy: { createdAt: 'desc' },
          take:    20,
          include: {
            request: {
              select: {
                referenceNumber: true,
                activityTitle:   true,
                activityStartAt: true,
              },
            },
            handledBy: {
              select: { id: true, name: true },
            },
          },
        },
        maintenanceLogs: {
          orderBy: { startAt: 'desc' },
          take:    10,
        },
      },
    });
  }

  async findByTag(assetTag: string) {
    return prisma.asset.findFirst({
      where: { assetTag, deletedAt: null },
    });
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

    const [data, total] = await prisma.$transaction([
      prisma.asset.findMany({
        where,
        skip,
        take,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      }),
      prisma.asset.count({ where }),
    ]);

    return { data, total };
  }

  // Finds an active checkout row for a request — used for checkout/return processing
  async findCheckoutById(checkoutId: string) {
    return prisma.assetCheckout.findFirst({
      where:   { id: checkoutId },
      include: {
        asset: true,
        request: {
          select: {
            id:             true,
            referenceNumber: true,
            status:         true,
          },
        },
      },
    });
  }

  // All active/overdue checkouts — for the custodian dashboard
  async findActiveCheckouts(custodianRole?: AssetCustodian) {
    return prisma.assetCheckout.findMany({
      where: {
        status: { in: [CheckoutStatus.ACTIVE, CheckoutStatus.OVERDUE] },
        ...(custodianRole && {
          asset: { custodianRole },
        }),
      },
      include: {
        asset:   { select: { id: true, name: true, assetTag: true, custodianRole: true } },
        request: { select: { referenceNumber: true, activityTitle: true, activityStartAt: true } },
      },
      orderBy: { dueAt: 'asc' },
    });
  }

  // ── Writes ────────────────────────────────────────────────────────────────

  async create(data: Prisma.AssetCreateInput) {
    return prisma.asset.create({ data });
  }

  async update(id: string, data: Prisma.AssetUpdateInput) {
    return prisma.asset.update({ where: { id }, data });
  }

  async setStatus(id: string, status: AssetStatus) {
    return prisma.asset.update({
      where: { id },
      data:  { status },
    });
  }

  async softDelete(id: string) {
    return prisma.asset.update({
      where: { id },
      data:  { deletedAt: new Date(), status: AssetStatus.DAMAGED },
    });
  }

  // Process checkout — stamps checkedOutAt and transitions asset to CHECKED_OUT
  async processCheckout(checkoutId: string, handledById: string, condition: AssetCondition) {
    return prisma.$transaction(async (tx) => {
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

      await tx.asset.update({
        where: { id: checkout.assetId },
        data:  { status: AssetStatus.CHECKED_OUT },
      });

      return checkout;
    });
  }

  // Process return — stamps returnedAt, records condition, transitions asset back
  async processReturn(
    checkoutId:  string,
    handledById: string,
    condition:   AssetCondition,
    notes?:      string,
  ) {
    return prisma.$transaction(async (tx) => {
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

      // If returned in poor/damaged condition → mark asset DAMAGED
      // Otherwise restore to AVAILABLE
      const newAssetStatus =
        condition === AssetCondition.POOR
          ? AssetStatus.DAMAGED
          : AssetStatus.AVAILABLE;

      await tx.asset.update({
        where: { id: checkout.assetId },
        data:  { status: newAssetStatus, condition },
      });

      return checkout;
    });
  }

  // Bulk upsert used by CSV import — upserts on assetTag
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
        const existing = await prisma.asset.findFirst({
          where: { assetTag: asset.assetTag },
        });

        if (existing) {
          await prisma.asset.update({
            where: { assetTag: asset.assetTag },
            data: {
              name:          asset.name,
              category:      asset.category,
              brand:         asset.brand,
              model:         asset.model,
              serialNumber:  asset.serialNumber,
              location:      asset.location,
              condition:     asset.condition ?? AssetCondition.GOOD,
              custodianRole: asset.custodianRole,
              deletedAt:     null, // restore if previously soft-deleted
            },
          });
          results.updated++;
        } else {
          await prisma.asset.create({
            data: {
              assetTag:      asset.assetTag,
              name:          asset.name,
              category:      asset.category,
              brand:         asset.brand,
              model:         asset.model,
              serialNumber:  asset.serialNumber,
              location:      asset.location,
              condition:     asset.condition ?? AssetCondition.GOOD,
              custodianRole: asset.custodianRole,
              status:        AssetStatus.AVAILABLE,
            },
          });
          results.created++;
        }
      } catch (err: any) {
        results.errors.push({ row: i + 2, error: err.message }); // +2: header + 1-index
      }
    }

    return results;
  }
}
