import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ApiProblem } from '@/api/problem'
import { applicationsApi } from '@/features/applications/api/applications-api'
import { travellersApi } from '@/features/travellers/api/travellers-api'
import { adminApi } from '../api/admin-api'
import type { Organisation } from '../lib/schemas'

const STORAGE_KEY = 'myvisapp.organisation'

/** A refusal or a missing record means "not one of yours", not a failure. */
function orNull<T>(promise: Promise<T>) {
  return promise.catch((error: unknown) => {
    if (error instanceof ApiProblem && error.status < 500) return null
    throw error
  })
}

/**
 * The backend has no "my organisations" endpoint, so the organisations a
 * person works in are read off the records they can see. An organisation
 * with no traveller or application yet will not appear until it has one.
 */
async function discoverOrganisations(): Promise<Organisation[]> {
  const [applications, travellers] = await Promise.all([
    orNull(applicationsApi.list({ size: 100 })),
    orNull(travellersApi.list({ size: 100 })),
  ])
  const ids = new Set(
    [...(applications?.content ?? []), ...(travellers?.content ?? [])]
      .map((record) => record.managingOrganisationId)
      .filter((id): id is string => Boolean(id)),
  )
  const found = await Promise.all([...ids].map((id) => orNull(adminApi.organisation(id))))
  return found
    .filter((organisation): organisation is Organisation => organisation !== null)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function useOrganisations() {
  return useQuery({
    queryKey: ['my-organisations'],
    queryFn: discoverOrganisations,
    staleTime: 5 * 60_000,
  })
}

/**
 * The organisation the organisation screens are looking at. Choosing one only
 * narrows the view — the backend decides access on every request regardless.
 */
export function useSelectedOrganisation() {
  const organisations = useOrganisations()
  const [chosenId, setChosenId] = useState(() => localStorage.getItem(STORAGE_KEY))
  const list = organisations.data ?? []
  const current = list.find((o) => o.id === chosenId) ?? list[0] ?? null

  const select = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id)
    setChosenId(id)
  }

  return { organisations, current, select }
}

export function useOrganisationMembers(organisationId: string | null | undefined) {
  return useQuery({
    queryKey: ['org-members', organisationId],
    queryFn: () => adminApi.members(organisationId!),
    enabled: Boolean(organisationId),
  })
}
