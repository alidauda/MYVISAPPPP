import { Notice } from '@/components/shared/notice'
import { useInformationRequests } from '../hooks/use-applications'

/**
 * What the case officer is waiting on. There is no reply endpoint and the
 * answers stay locked while a request is open, so this can only say clearly
 * what was asked and by when.
 */
export function InformationRequests({ applicationId }: { applicationId: string }) {
  const requests = useInformationRequests(applicationId)
  const open = (requests.data?.content ?? []).filter((r) => !r.status || r.status === 'OPEN')
  if (open.length === 0) return null

  return (
    <div className="mb-6 flex flex-col gap-3">
      {open.map((request, index) => (
        <Notice
          key={request.id ?? index}
          tone="warning"
          title="Your case officer needs more information"
        >
          <span className="block text-foreground">{request.message}</span>
          {request.dueAt ? (
            <span className="mt-1.5 block">
              Due {new Date(request.dueAt).toLocaleDateString(undefined, { dateStyle: 'long' })}.
            </span>
          ) : null}
          <span className="mt-1.5 block">
            Replies cannot be sent from here yet — contact the organisation handling your
            application.
          </span>
        </Notice>
      ))}
    </div>
  )
}
