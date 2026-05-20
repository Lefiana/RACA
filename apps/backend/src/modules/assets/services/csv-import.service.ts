// File: apps/backend/src/modules/assets/services/csv-import.service.ts
// Purpose: Parses and validates a CSV buffer for asset bulk import.
//          Isolated to single responsibility — only parsing and row validation.
//          The actual DB upsert is delegated to AssetsRepository.upsertMany().
//
// Expected CSV columns (case-insensitive headers):
//   assetTag, name, category, brand, model, serialNumber, location, condition
//
// Dependencies: papaparse, @nestjs/common, @repo/database

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as Papa from 'papaparse';
import { AssetCondition, AssetCustodian } from '@repo/database';

// Required columns — all others are optional
const REQUIRED_COLUMNS = ['assettag', 'name', 'category'];

// Valid condition values (case-insensitive input mapped to enum)
const CONDITION_MAP: Record<string, AssetCondition> = {
  excellent: AssetCondition.EXCELLENT,
  good:      AssetCondition.GOOD,
  fair:      AssetCondition.FAIR,
  poor:      AssetCondition.POOR,
};

export interface ParsedAssetRow {
  assetTag:      string;
  name:          string;
  category:      string;
  brand?:        string;
  model?:        string;
  serialNumber?: string | null;
  location?:     string;
  condition?:    AssetCondition;
  custodianRole: AssetCustodian; // stamped from session, not from CSV
}

export interface CsvParseResult {
  rows:   ParsedAssetRow[];
  errors: { row: number; error: string }[];
}

@Injectable()
export class CsvImportService {
  private readonly logger = new Logger(CsvImportService.name);

  // Parses a CSV buffer into validated asset rows.
  // custodianRole is passed in from the calling service (stamped from session user).
  parse(buffer: Buffer, custodianRole: AssetCustodian): CsvParseResult {
    const csvString = buffer.toString('utf-8');

    const parsed = Papa.parse<Record<string, string>>(csvString, {
      header:           true,
      skipEmptyLines:   true,
      transformHeader:  (h) => h.trim().toLowerCase().replace(/\s+/g, ''),
    });

    if (parsed.errors.length > 0) {
      const firstError = parsed.errors[0];
      throw new BadRequestException(
        `CSV parse error at row ${firstError.row}: ${firstError.message}`,
      );
    }

    // Validate required columns exist in the header
    const headers = Object.keys(parsed.data[0] ?? {});
    for (const col of REQUIRED_COLUMNS) {
      if (!headers.includes(col)) {
        throw new BadRequestException(
          `CSV is missing required column: "${col}". ` +
          `Required columns: assetTag, name, category`,
        );
      }
    }

    const rows:   ParsedAssetRow[]                  = [];
    const errors: { row: number; error: string }[]  = [];

    for (let i = 0; i < parsed.data.length; i++) {
      const raw     = parsed.data[i];
      const rowNum  = i + 2; // +2: header row + 1-indexed

      try {
        const assetTag = raw['assettag']?.trim();
        const name     = raw['name']?.trim();
        const category = raw['category']?.trim();

        if (!assetTag) { errors.push({ row: rowNum, error: 'assetTag is required' }); continue; }
        if (!name)     { errors.push({ row: rowNum, error: 'name is required'     }); continue; }
        if (!category) { errors.push({ row: rowNum, error: 'category is required' }); continue; }

        // Validate and map condition if provided
        let condition: AssetCondition | undefined;
        const conditionRaw = raw['condition']?.trim().toLowerCase();
        if (conditionRaw) {
          condition = CONDITION_MAP[conditionRaw];
          if (!condition) {
            errors.push({
              row: rowNum,
              error: `Invalid condition "${conditionRaw}". Valid values: excellent, good, fair, poor`,
            });
            continue;
          }
        }

        rows.push({
          assetTag,
          name,
          category,
          brand:        raw['brand']?.trim()        || undefined,
          model:        raw['model']?.trim()        || undefined,
          serialNumber: raw['serialnumber']?.trim() || null,
          location:     raw['location']?.trim()     || undefined,
          condition,
          custodianRole, // always stamped from session — not from CSV
        });
      } catch (err: any) {
        errors.push({ row: rowNum, error: err.message });
      }
    }

    this.logger.log(
      `[CsvImportService] parsed ${rows.length} valid rows, ${errors.length} errors`,
    );

    return { rows, errors };
  }

  // Generates a CSV template string for download.
  // Includes headers and one sample row matching the custodian's typical assets.
  generateTemplate(custodianRole: AssetCustodian): string {
    const sampleRows: Record<AssetCustodian, string> = {
      [AssetCustodian.MIS]: [
        'CUB-PRJ-099',
        'Projector Unit 99',
        'Projector',
        'Epson',
        'EB-X41',
        'EPS-099',
        'MIS Office — Storage Room',
        'good',
      ].join(','),

      [AssetCustodian.BUILDING_ADMIN]: [
        'CUB-CHR-099',
        'Monobloc Chair Set (10)',
        'Chair',
        'Generic',
        '',
        '',
        'Storage Room — Ground Floor',
        'good',
      ].join(','),

      [AssetCustodian.HRM_CUSTODIAN]: [
        'CUB-TWR-099',
        'Dinner Plate Set (12)',
        'Tableware',
        'Generic',
        '',
        '',
        'Kitchen Lab — Cabinet A',
        'good',
      ].join(','),
    };

    const header = 'assetTag,name,category,brand,model,serialNumber,location,condition';
    return `${header}\n${sampleRows[custodianRole]}\n`;
  }
}
