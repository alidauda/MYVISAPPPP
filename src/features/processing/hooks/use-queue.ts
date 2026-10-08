import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/features/admin/api/admin-api'
import { processingApi } from '../api/processing-api'
import type { QueueFilters } from '../lib/schemas'

export function useQueue(filters: QueueFilters) {
  return useQuery({
    queryKey: ['internal-queue', filters],
    queryFn: () => processingApi.queue(filters),
    // Staff work a moving list; stale rows cause double-handling.
    staleTime: 10_000,
  })
}

/**
 * There is no officer directory, so the people a case can go to are the
 * active members of the organisations involved, named by email — the
 * membership carries no display name.
 */
export function useOfficers(organisationIds: (string | null | undefined)[]) {
  const ids = [...new Set(organisationIds.filter((id): id is string => Boolean(id)))].sort()
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ['org-members', id],
      queryFn: () => adminApi.members(id),
      staleTime: 5 * 60_000,
    })),
    combine: (results) => {
      const seen = new Map<string, { id: string; name: string }>()
      for (const result of results) {
        for (const member of result.data ?? []) {
          if (member.active) seen.set(member.userId, { id: member.userId, name: member.email })
        }
      }
      return {
        data: [...seen.values()].sort((a, b) => a.name.localeCompare(b.name)),
        isPending: results.some((r) => r.isPending),
        isError: results.length > 0 && results.every((r) => r.isError),
      }
    },
  })
}

export function useCaseNotes(id: string) {
  return useQuery({ queryKey: ['case-notes', id], queryFn: () => processingApi.notes(id) })
}

export function useCaseChecklist(id: string) {
  return useQuery({ queryKey: ['case-checklist', id], queryFn: () => processingApi.checklist(id) })
}

export function useCaseMutations(id: string) {
  const queryClient = useQueryClient()
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['internal-queue'] })
    void queryClient.invalidateQueries({ queryKey: ['application', null, id] })
  }

  return {
    assign: useMutation({
      mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
        processingApi.assignOfficer(id, userId, reason),
      onSuccess: refresh,
    }),
    schedule: useMutation({
      mutationFn: (body: { priority: string; dueAt: string | null }) =>
        processingApi.schedule(id, body),
      onSuccess: refresh,
    }),
    addNote: useMutation({
      mutationFn: (body: string) => processingApi.addNote(id, body),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['case-notes', id] }),
    }),
    toggleChecklist: useMutation({
      mutationFn: ({ code, label, completed }: { code: string; label: string; completed: boolean }) =>
        processingApi.updateChecklist(id, code, label, completed),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['case-checklist', id] }),
    }),
    requestInformation: useMutation({
      mutationFn: (body: { message: string; dueAt?: string }) =>
        processingApi.requestInformation(id, body),
      onSuccess: refresh,
    }),
    changeStatus: useMutation({
      mutationFn: ({ status, reason }: { status: string; reason?: string }) =>
        processingApi.changeStatus(id, status, reason),
      onSuccess: refresh,
    }),
  }
}
