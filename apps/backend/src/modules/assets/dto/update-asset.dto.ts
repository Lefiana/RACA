// File: apps/backend/src/modules/assets/dto/update-asset.dto.ts
// Purpose: Partial update DTO — all fields optional.
// Dependencies: @nestjs/swagger, create-asset.dto.ts

import { PartialType } from '@nestjs/swagger';
import { CreateAssetDto } from './create-asset.dto';

export class UpdateAssetDto extends PartialType(CreateAssetDto) {}
