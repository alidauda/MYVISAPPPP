import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-client'
import { applicationsApi } from '../api/applications-api'
import type { AnswerValue } from '../lib/schemas'

export function useApplications(params: { page: number; size: number; status?: string }) {
  return useQuery({
    queryKey: queryKeys.applications(null, params),
    queryFn: () => applicationsApi.list(params),
  })
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: queryKeys.application(null, id),
    queryFn: () => applicationsApi.get(id),
  })
}

export function useApplicationQuestions(id: string) {
  return useQuery({
    queryKey: [...queryKeys.application(null, id), 'questions'],
    queryFn: () => applicationsApi.questions(id),
    // Answers are edited here; refetching under the form would fight the user.
    staleTime: Infinity,
  })
}

export function useInformationRequests(id: string) {
  return useQuery({
    queryKey: [...queryKeys.application(null, id), 'information-requests'],
    queryFn: () => applicationsApi.informationRequests(id),
  })
}

export function useCreateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: applicationsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['applications'] }),
  })
}

/**
 * Saving replaces the whole answer set, so two of these in flight at once
 * could resurrect a stale value. TanStack Query does not serialise mutations
 * for us — the view keeps one save in flight at a time.
 */
export function useSaveAnswers(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (answers: { questionCode: string; value: AnswerValue }[]) =>
      applicationsApi.saveAnswers(id, answers),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.application(null, id), 'questions'],
      }),
  })
}

export function useSubmitInitial(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (comment?: string) => applicationsApi.submitInitial(id, comment),
    onSuccess: () => {
      // Status drives what the whole screen allows — refetch, never predict.
      void queryClient.invalidateQueries({ queryKey: queryKeys.application(null, id) })
      void queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })
}
