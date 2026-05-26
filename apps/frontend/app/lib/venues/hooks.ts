// File: apps/frontend/lib/venues/hooks.ts
// Purpose: TanStack Query hooks for venue management.

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createVenue,
  deleteVenue,
  getVenueAvailability,
  getVenueById,
  getVenues,
  setVenueStatus,
  updateVenue,
} from './api';
import type {
  ICreateVenueDto,
  ISetVenueStatusDto,
  IUpdateVenueDto,
  IVenuesQuery,
} from './types';

export const venueKeys = {
  all:          ['venues']                                          as const,
  lists:        () => [...venueKeys.all, 'list']                    as const,
  list:         (q: IVenuesQuery) => [...venueKeys.lists(), q]      as const,
  detail:       (id: string) => [...venueKeys.all, 'detail', id]    as const,
  availability: (id: string, from: string, to: string) =>
    [...venueKeys.all, 'availability', id, from, to]                as const,
};

export function useVenues(query?: IVenuesQuery) {
  return useQuery({
    queryKey: venueKeys.list(query ?? {}),
    queryFn:  () => getVenues(query),
  });
}

export function useVenue(id: string) {
  return useQuery({
    queryKey: venueKeys.detail(id),
    queryFn:  () => getVenueById(id),
    enabled:  !!id,
  });
}

export function useVenueAvailability(id: string, from: string, to: string) {
  return useQuery({
    queryKey: venueKeys.availability(id, from, to),
    queryFn:  () => getVenueAvailability(id, from, to),
    enabled:  !!id && !!from && !!to,
  });
}

export function useCreateVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateVenueDto) => createVenue(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: venueKeys.lists() });
    },
  });
}

export function useUpdateVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: IUpdateVenueDto }) =>
      updateVenue(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: venueKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: venueKeys.lists() });
    },
  });
}

export function useSetVenueStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ISetVenueStatusDto }) =>
      setVenueStatus(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: venueKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: venueKeys.lists() });
    },
  });
}

export function useDeleteVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVenue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: venueKeys.lists() });
    },
  });
}