// File: apps/backend/src/modules/venues/dto/update-venue.dto.ts
// Purpose: Partial update DTO — all fields optional.
// Dependencies: @nestjs/swagger, create-venue.dto.ts

import { PartialType } from '@nestjs/swagger';
import { CreateVenueDto } from './create-venue.dto';

export class UpdateVenueDto extends PartialType(CreateVenueDto) {}
