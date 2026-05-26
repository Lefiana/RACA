// File: apps/frontend/lib/schedules/hooks.ts

'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getAssetSchedule, getCalendarSummary,
  getMaintenanceSchedule, getVenueSchedule,
} from './api';
import type { IScheduleFilterInput } from './types';

export const scheduleKeys = {
  venue:       (f: IScheduleFilterInput) => ['schedules', 'venue', f]       as const,
  asset:       (f: IScheduleFilterInput) => ['schedules', 'asset', f]       as const,
  maintenance: (f: IScheduleFilterInput) => ['schedules', 'maintenance', f] as const,
  calendar:    (f: IScheduleFilterInput) => ['schedules', 'calendar', f]    as const,
};

export function useVenueSchedule(filter: IScheduleFilterInput) {
  return useQuery({
    queryKey: scheduleKeys.venue(filter),
    queryFn:  () => getVenueSchedule(filter),
    enabled:  !!filter.from && !!filter.to,
  });
}

export function useAssetSchedule(filter: IScheduleFilterInput) {
  return useQuery({
    queryKey: scheduleKeys.asset(filter),
    queryFn:  () => getAssetSchedule(filter),
    enabled:  !!filter.from && !!filter.to,
  });
}

export function useMaintenanceSchedule(filter: IScheduleFilterInput) {
  return useQuery({
    queryKey: scheduleKeys.maintenance(filter),
    queryFn:  () => getMaintenanceSchedule(filter),
    enabled:  !!filter.from && !!filter.to,
  });
}

export function useCalendarSummary(filter: IScheduleFilterInput) {
  return useQuery({
    queryKey: scheduleKeys.calendar(filter),
    queryFn:  () => getCalendarSummary(filter),
    enabled:  !!filter.from && !!filter.to,
    // Calendar data changes infrequently — cache for 2 minutes
    staleTime: 2 * 60 * 1000,
  });
}