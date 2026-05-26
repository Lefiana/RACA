// File: apps/frontend/lib/schedules/api.ts
// Purpose: GraphQL queries sent via Axios POST to /graphql.
//          No GraphQL client library — plain POST with query string and variables.
// Dependencies: apiClient, schedules/types

import { apiClient }           from '../axios';
import type {
  IAssetEvent, ICalendarDay, IMaintenanceEvent,
  IScheduleFilterInput, IVenueEvent,
} from './types';

// Helper — sends a GraphQL query and returns the data field
async function gql<T>(
  query:     string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await apiClient.post<{ data: T; errors?: any[] }>(
    // GraphQL sits at /graphql not /api/v1/graphql
    // so we call the base origin directly
    `${apiClient.defaults.baseURL!.replace('/api/v1', '')}/graphql`,
    { query, variables },
  );
  if (res.data.errors?.length) {
    throw new Error(res.data.errors[0].message);
  }
  return res.data.data;
}

export async function getVenueSchedule(
  filter: IScheduleFilterInput,
): Promise<IVenueEvent[]> {
  const data = await gql<{ venueSchedule: IVenueEvent[] }>(
    `query VenueSchedule($filter: ScheduleFilterInput!) {
      venueSchedule(filter: $filter) {
        id venueId venueName requestId referenceNumber activityTitle
        startAt endAt bufferStartAt bufferEndAt isLocked confirmedAt
        requestStatus requestedBy { name department }
      }
    }`,
    { filter },
  );
  return data.venueSchedule;
}

export async function getAssetSchedule(
  filter: IScheduleFilterInput,
): Promise<IAssetEvent[]> {
  const data = await gql<{ assetSchedule: IAssetEvent[] }>(
    `query AssetSchedule($filter: ScheduleFilterInput!) {
      assetSchedule(filter: $filter) {
        id assetId assetTag assetName category
        requestId referenceNumber activityTitle
        status quantity checkedOutAt dueAt returnedAt
      }
    }`,
    { filter },
  );
  return data.assetSchedule;
}

export async function getMaintenanceSchedule(
  filter: IScheduleFilterInput,
): Promise<IMaintenanceEvent[]> {
  const data = await gql<{ maintenanceSchedule: IMaintenanceEvent[] }>(
    `query MaintenanceSchedule($filter: ScheduleFilterInput!) {
      maintenanceSchedule(filter: $filter) {
        id entityType entityId entityName
        title description startAt endAt resolvedAt
      }
    }`,
    { filter },
  );
  return data.maintenanceSchedule;
}

export async function getCalendarSummary(
  filter: IScheduleFilterInput,
): Promise<ICalendarDay[]> {
  const data = await gql<{ calendarSummary: ICalendarDay[] }>(
    `query CalendarSummary($filter: ScheduleFilterInput!) {
      calendarSummary(filter: $filter) {
        date venueEventCount assetEventCount maintenanceCount
        venueEvents {
          id venueId venueName requestId referenceNumber
          activityTitle startAt endAt isLocked requestStatus
        }
        assetEvents {
          id assetId assetTag assetName requestId
          referenceNumber activityTitle status quantity
        }
        maintenanceEvents {
          id entityType entityName title startAt endAt
        }
      }
    }`,
    { filter },
  );
  return data.calendarSummary;
}