import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-client'
import { catalogueApi } from '../api/catalogue-api'

export function useCatalogue() {
  return useQuery({
    queryKey: queryKeys.catalogue(),
    queryFn: catalogueApi.list,
    // The catalogue changes when an operator activates a version, not often.
    staleTime: 5 * 60_000,
  })
}

export function useOffering(code: string) {
  return useQuery({
    queryKey: [...queryKeys.catalogue(), code],
    queryFn: () => catalogueApi.get(code),
    staleTime: 5 * 60_000,
  })
}
