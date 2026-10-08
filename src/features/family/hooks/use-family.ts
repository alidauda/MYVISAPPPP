import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-client'
import { familyApi } from '../api/family-api'

export function useFamilyRelationship(clientId: string, enabled = true) {
  return useQuery({
    queryKey: ['family', clientId],
    queryFn: () => familyApi.get(clientId),
    enabled,
    // A traveller you manage yourself has no relationship record.
    retry: false,
  })
}

export function useFamilyMutations(clientId?: string) {
  const queryClient = useQueryClient()
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['clients'] })
    if (clientId) void queryClient.invalidateQueries({ queryKey: ['family', clientId] })
  }

  return {
    create: useMutation({
      mutationFn: familyApi.create,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.clients(null, {}) }),
    }),
    invite: useMutation({
      mutationFn: (purpose: 'CONSENT' | 'MIGRATION') => familyApi.invite(clientId!, purpose),
      onSuccess: refresh,
    }),
    cancelInvitation: useMutation({
      mutationFn: () => familyApi.cancelInvitation(clientId!),
      onSuccess: refresh,
    }),
    recordConsent: useMutation({
      mutationFn: ({ token, granted }: { token: string; granted: boolean }) =>
        familyApi.recordConsent(token, granted),
    }),
    acceptMigration: useMutation({ mutationFn: familyApi.acceptMigration }),
  }
}
