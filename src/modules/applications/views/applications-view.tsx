import { useMemo } from 'react'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { tableFeatures, useTable, type ColumnDef } from '@tanstack/react-table'
import { humanMessage } from '@/api/problem'
import { useApplications } from '@/features/applications/hooks/use-applications'
import { STATUS_GROUPS, type Application } from '@/features/applications/lib/schemas'
import { PageBody } from '@/components/shared/app-shell'
import { Notice } from '@/components/shared/notice'
import { StatusBadge, statusTone } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const route = getRouteApi('/_app/applications/')

/**
 * TanStack Table v9 stitches features in statically. This list paginates and
 * filters on the server, so it needs none of them — only the core.
 */
const features = tableFeatures({})

/** Grouping is for reading the list, not for deciding what the backend allows. */
const GROUPS = [
  { key: 'all', label: 'All' },
  { key: 'needsYou', label: 'Needs you' },
  { key: 'processing', label: 'Being processed' },
  { key: 'decided', label: 'Decided' },
] as const

export function ApplicationsView() {
  const { page = 0, group = 'all' } = route.useSearch()
  const navigate = useNavigate()
  const query = useApplications({ page, size: 20 })

  const rows = useMemo(() => {
    const all = query.data?.content ?? []
    if (group === 'all') return all
    const allowed = STATUS_GROUPS[group] as readonly string[]
    return all.filter((application) => allowed.includes(application.status))
  }, [query.data, group])

  const columns = useMemo<ColumnDef<typeof features, Application>[]>(
    () => [
      {
        accessorKey: 'reference',
        header: 'Reference',
        cell: ({ row }) => (
          <span className="code text-[12.5px] text-code-accent">{row.original.reference}</span>
        ),
      },
      {
        accessorKey: 'visaCode',
        header: 'Offering',
        cell: ({ row }) => (
          <span>
            <span className="block text-sm font-semibold">{row.original.visaCode}</span>
            <span className="block pt-0.5 text-[12.5px] text-muted-foreground">
              {/* The response carries identifiers, not names. */}
              definition v{row.original.visaDefinitionVersion}
            </span>
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge code={row.original.status} tone={statusTone(row.original.status)} />
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: 'Updated',
        cell: ({ row }) => (
          <span className="text-[13px] text-muted-foreground">
            {new Date(row.original.updatedAt).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Link
            to="/applications/$applicationId/questions"
            params={{ applicationId: row.original.id }}
            className="text-[13.5px] font-medium text-primary underline-offset-4 hover:underline"
          >
            Open
          </Link>
        ),
      },
    ],
    [],
  )

  const table = useTable({ features, columns, data: rows })

  const totalPages = query.data?.totalPages ?? 1

  return (
    <PageBody className="max-w-[1000px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1.5 text-[30px]">Your applications</h1>
          <p className="text-sm text-muted-foreground">
            {query.data ? `${query.data.totalElements} in total` : 'Loading…'}
          </p>
        </div>
        <Button asChild>
          <Link to="/catalogue">Start an application</Link>
        </Button>
      </div>

      {/* Filter state lives in the URL, so a filtered list is a shareable link. */}
      <div className="mb-4.5 flex flex-wrap gap-2">
        {GROUPS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() =>
              void navigate({ to: '/applications', search: { page: 0, group: option.key } })
            }
            className={`h-9 rounded-full border px-3.5 text-[13px] transition-colors ${
              group === option.key
                ? 'border-primary bg-primary font-semibold text-primary-foreground'
                : 'border-input bg-card text-label hover:bg-muted'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {query.isError ? (
        <Notice tone="danger" title={humanMessage(query.error)} />
      ) : query.isPending ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-input bg-card p-10 text-center">
          <h2 className="mb-2 text-[19px]">
            {group === 'all' ? 'No applications yet' : 'Nothing in this group'}
          </h2>
          <p className="mx-auto mb-5 max-w-[420px] text-[13.5px] leading-[1.55] text-muted-foreground">
            {group === 'all'
              ? 'Pick the visa you need from the catalogue and we will build the form from it.'
              : 'Try another group, or clear the filter to see everything.'}
          </p>
          <Button asChild>
            <Link to="/catalogue">Browse the catalogue</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-border bg-muted">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="code px-5 py-3 text-left text-[10px] tracking-[0.12em] text-muted-foreground uppercase"
                    >
                      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-border/70 last:border-0">
                  {row.getAllCells().map((cell) => (
                    <td key={cell.id} className="px-5 py-3.5 align-middle">
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
        <span className="text-[12.5px] text-muted-foreground">
          Newest first. The groups above are a way of reading backend statuses, not a filter the
          server applies.
        </span>
        <div className="flex items-center gap-2.5">
          <span className="code text-[11px] text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page === 0}
            onClick={() => void navigate({ to: '/applications', search: { page: page - 1, group } })}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page + 1 >= totalPages}
            onClick={() => void navigate({ to: '/applications', search: { page: page + 1, group } })}
          >
            Next
          </Button>
        </div>
      </div>
    </PageBody>
  )
}
