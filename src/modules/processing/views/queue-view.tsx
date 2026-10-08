import { useMemo } from 'react'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { tableFeatures, useTable, type ColumnDef } from '@tanstack/react-table'
import { humanMessage } from '@/api/problem'
import { useOfficers, useQueue } from '@/features/processing/hooks/use-queue'
import { isOverdue, type QueueRow } from '@/features/processing/lib/schemas'
import { PageBody } from '@/components/shared/app-shell'
import { Notice } from '@/components/shared/notice'
import { Legend } from '@/components/shared/legend'
import { StatusBadge, statusTone } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const route = getRouteApi('/_app/queue/')
const features = tableFeatures({})
const ANY = '__any__'

const STATUSES = [
  'INITIAL_DOCUMENTS_SUBMITTED',
  'IN_PROGRESS',
  'UNDER_REVIEW',
  'AWAITING_ADDITIONAL_INFORMATION',
  'READY_FOR_SUBMISSION',
]

export function QueueView() {
  const filters = route.useSearch()
  const navigate = useNavigate()
  const queue = useQueue(filters)
  const officers = useOfficers((queue.data?.content ?? []).map((row) => row.organisationId))
  const degraded = queue.data?.degraded ?? false

  /** Every change is a navigation, so the URL is always the truth. */
  const setFilter = (patch: Record<string, unknown>) =>
    void navigate({ to: '/queue', search: { ...filters, ...patch, page: 0 } })

  const officerNames = new Map(officers.data.map((o) => [o.id, o.name]))

  const columns = useMemo<ColumnDef<typeof features, QueueRow>[]>(
    () => [
      {
        accessorKey: 'reference',
        header: 'Reference',
        cell: ({ row }) => (
          <span className="code text-[12px] text-code-accent">{row.original.reference}</span>
        ),
      },
      {
        accessorKey: 'visaType',
        header: 'Offering',
        cell: ({ row }) => (
          <span>
            <span className="block text-sm font-semibold">{row.original.visaType ?? '—'}</span>
            <span className="block pt-0.5 text-[12.5px] text-muted-foreground">
              {/* The queue is identifiers and scheduling; it carries no names. */}
              {row.original.country ?? '—'}
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
        accessorKey: 'officerId',
        header: 'Officer',
        cell: ({ row }) =>
          row.original.officerId ? (
            <span className="code text-[12px] wrap-anywhere">
              {officerNames.get(row.original.officerId) ?? row.original.officerId.slice(0, 8)}
            </span>
          ) : (
            <span className="text-[13px] font-semibold text-danger">Unassigned</span>
          ),
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => {
          const priority = row.original.priority
          if (!priority) return <span className="text-[12.5px] text-muted-foreground">—</span>
          return (
            <span
              className={`text-[12.5px] ${
                priority === 'HIGH' || priority === 'URGENT'
                  ? 'font-semibold text-danger'
                  : 'text-label'
              }`}
            >
              {priority.charAt(0) + priority.slice(1).toLowerCase()}
            </span>
          )
        },
      },
      {
        accessorKey: 'dueAt',
        header: 'Due',
        cell: ({ row }) => {
          if (!row.original.dueAt) return <span className="text-[12.5px] text-muted-foreground">—</span>
          const late = isOverdue(row.original)
          return (
            <span className={`text-[12.5px] ${late ? 'font-semibold text-danger' : 'text-muted-foreground'}`}>
              {late ? 'Overdue · ' : ''}
              {new Date(row.original.dueAt).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [officers.data],
  )

  const rows = queue.data?.content ?? []
  const table = useTable({ features, columns, data: rows })
  const page = filters.page ?? 0
  const totalPages = queue.data?.totalPages ?? 1
  const lateCount = rows.filter(isOverdue).length

  return (
    <PageBody className="max-w-[1400px]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 rounded-lg border border-border bg-card p-5 lg:w-[256px]">
          <div className="mb-5 flex items-baseline justify-between">
            <Legend>Filters</Legend>
            <button
              type="button"
              onClick={() => void navigate({ to: '/queue', search: {} })}
              className="text-[12.5px] text-primary underline-offset-4 hover:underline"
            >
              Clear
            </button>
          </div>

          <fieldset className="m-0 mb-5 border-0 p-0">
            <legend className="mb-2.5 text-[13px] font-semibold text-label">Status</legend>
            <div className="flex flex-col gap-2.5">
              {STATUSES.map((status) => (
                <label key={status} className="flex items-start gap-2.5">
                  <Checkbox
                    checked={filters.status === status}
                    onCheckedChange={(checked) => setFilter({ status: checked ? status : undefined })}
                  />
                  <span className="code text-[11px] leading-[1.3] text-label">{status}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <Picker
            id="f-officer"
            label="Officer"
            value={filters.officer ?? ANY}
            onChange={(value) => setFilter({ officer: value === ANY ? undefined : value })}
            anyLabel="Anyone"
            options={[
              { value: 'UNASSIGNED', label: 'Unassigned' },
              ...officers.data.map((o) => ({ value: o.id, label: o.name })),
            ]}
          />

          <Picker
            id="f-country"
            label="Destination"
            value={filters.country ?? ANY}
            onChange={(value) => setFilter({ country: value === ANY ? undefined : value })}
            anyLabel="Any"
            options={['GB', 'AE', 'CA'].map((c) => ({ value: c, label: c }))}
          />

          <div className="mb-4">
            <span className="mb-2 block text-[13px] font-semibold text-label">Priority</span>
            <div className="flex gap-1.5">
              {(['LOW', 'NORMAL', 'HIGH'] as const).map((priority) => (
                <Button
                  key={priority}
                  size="sm"
                  variant={filters.priority === priority ? 'default' : 'outline'}
                  className="flex-1 px-2 text-[12.5px]"
                  onClick={() =>
                    setFilter({ priority: filters.priority === priority ? undefined : priority })
                  }
                >
                  {priority.charAt(0) + priority.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>
          </div>

          <label className="mb-4 flex items-start gap-2.5 rounded-md border border-danger-border bg-danger-surface p-3">
            <Checkbox
              checked={filters.overdue ?? false}
              onCheckedChange={(checked) => setFilter({ overdue: checked ? true : undefined })}
            />
            <span className="text-[13px] leading-[1.45] text-danger">Past its due date only</span>
          </label>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-from">Created between</Label>
            <Input
              id="f-from"
              type="date"
              value={filters.submittedFrom ?? ''}
              onChange={(event) => setFilter({ submittedFrom: event.target.value || undefined })}
            />
            <Input
              type="date"
              aria-label="Created before"
              value={filters.submittedTo ?? ''}
              onChange={(event) => setFilter({ submittedTo: event.target.value || undefined })}
            />
            <span className="text-xs leading-[1.5] text-muted-foreground">
              Dates filter on when the application was created.
            </span>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="mb-1.5 text-[28px]">Processing queue</h1>
              <p className="text-sm text-muted-foreground">
                {queue.data
                  ? `${rows.length} of ${queue.data.totalElements} shown${lateCount ? ` · ${lateCount} past due` : ''}`
                  : 'Loading…'}
              </p>
            </div>
          </div>

          {degraded ? (
            <Notice tone="warning" title="Showing the plain application list" className="mb-4">
              The processing queue is unavailable right now, so these rows come from the application
              list instead. Only the status filter applies, and priority and due dates are not
              shown.
            </Notice>
          ) : null}

          {queue.isError ? (
            <Notice tone="danger" title={humanMessage(queue.error)} />
          ) : queue.isPending ? (
            <Skeleton className="h-80 w-full rounded-lg" />
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-input bg-card p-10 text-center">
              <h2 className="mb-2 text-[19px]">Nothing matches those filters</h2>
              <p className="text-[13.5px] text-muted-foreground">
                Clear one and the queue will widen.
              </p>
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
                    <tr
                      key={row.id}
                      className={`border-b border-border/70 last:border-0 ${
                        isOverdue(row.original) ? 'bg-danger-surface/40' : ''
                      }`}
                    >
                      {row.getAllCells().map((cell) => (
                        <td key={cell.id} className="px-5 py-3.5 align-middle">
                          <Link
                            to="/queue/$applicationId"
                            params={{ applicationId: row.original.id }}
                            className="block no-underline"
                            style={{ color: 'inherit' }}
                          >
                            <table.FlexRender cell={cell} />
                          </Link>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
            <span className="text-[12.5px] leading-[1.5] text-muted-foreground">
              Only applications inside organisations you belong to. Records elsewhere are not hidden
              rows — they do not exist for this account.
            </span>
            <div className="flex items-center gap-2.5">
              <span className="code text-[11px] text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => void navigate({ to: '/queue', search: { ...filters, page: page - 1 } })}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page + 1 >= totalPages}
                onClick={() => void navigate({ to: '/queue', search: { ...filters, page: page + 1 } })}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageBody>
  )
}

function Picker({
  id,
  label,
  value,
  onChange,
  options,
  anyLabel,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  anyLabel: string
}) {
  return (
    <div className="mb-4 flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{anyLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
