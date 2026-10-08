import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { humanMessage } from '@/api/problem'
import { useCatalogue } from '@/features/catalogue/hooks/use-catalogue'
import { PageBody } from '@/components/shared/app-shell'
import { Notice } from '@/components/shared/notice'
import { Button } from '@/components/ui/button'
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

const ANY = '__any__'

export function CatalogueView() {
  const catalogue = useCatalogue()
  const [search, setSearch] = useState('')
  const [destination, setDestination] = useState(ANY)
  const [category, setCategory] = useState(ANY)

  const offerings = catalogue.data ?? []

  // The backend exposes no server-side catalogue filter, so the whole list
  // arrives and narrowing happens here.
  const { destinations, categories } = useMemo(
    () => ({
      destinations: [...new Set(offerings.map((o) => o.destinationCountry))].sort(),
      categories: [...new Set(offerings.map((o) => o.visaCategory))].sort(),
    }),
    [offerings],
  )

  const filtered = offerings.filter((offering) => {
    if (destination !== ANY && offering.destinationCountry !== destination) return false
    if (category !== ANY && offering.visaCategory !== category) return false
    if (!search.trim()) return true
    const haystack = `${offering.name} ${offering.code}`.toLowerCase()
    return haystack.includes(search.trim().toLowerCase())
  })

  return (
    <PageBody className="max-w-[1100px]">
      <h1 className="mb-2 text-[30px]">Visa catalogue</h1>
      <p className="mb-6 max-w-[640px] text-[15px] leading-[1.55] text-muted-foreground">
        Every offering here is configured and versioned by the operator. The version you start with
        stays attached to your application, even if the offering changes later.
      </p>

      {catalogue.isError ? (
        <Notice tone="danger" title={humanMessage(catalogue.error)} />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-end gap-3.5 border-b border-border pb-5">
            <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
              <Label htmlFor="cat-search">Search</Label>
              <Input
                id="cat-search"
                type="search"
                placeholder="Offering name or code"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Filter
              id="cat-destination"
              label="Destination"
              value={destination}
              onChange={setDestination}
              options={destinations}
              anyLabel="All destinations"
            />
            <Filter
              id="cat-category"
              label="Category"
              value={category}
              onChange={setCategory}
              options={categories}
              anyLabel="All categories"
            />
            <span className="pb-3 text-[13px] text-muted-foreground">
              {catalogue.isPending ? '—' : `${filtered.length} offerings`}
            </span>
          </div>

          {catalogue.isPending ? (
            <div className="grid gap-4.5 sm:grid-cols-2">
              <Skeleton className="h-52 rounded-lg" />
              <Skeleton className="h-52 rounded-lg" />
            </div>
          ) : filtered.length === 0 ? (
            <Notice tone="info" title="Nothing matches those filters">
              Clear the search or widen the destination to see the rest of the catalogue.
            </Notice>
          ) : (
            <div className="grid gap-4.5 sm:grid-cols-2">
              {filtered.map((offering) => (
                <article
                  key={offering.code}
                  className="flex flex-col gap-3.5 rounded-lg border border-border bg-card p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="code mb-1.5 text-[11px] text-code-accent">{offering.code}</div>
                      <h2 className="text-[19px] leading-[1.3]">{offering.name}</h2>
                    </div>
                    <span className="code shrink-0 rounded-[3px] border border-success-border bg-success-surface px-2 py-1 text-[10px] text-success">
                      v{offering.version} ACTIVE
                    </span>
                  </div>

                  <div className="flex gap-1.5">
                    <Tag>{offering.destinationCountry}</Tag>
                    <Tag>{offering.visaCategory}</Tag>
                  </div>

                  {offering.description ? (
                    <p className="text-[13.5px] leading-[1.55] text-muted-foreground">
                      {offering.description}
                    </p>
                  ) : null}

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/70 pt-3.5">
                    <Link
                      to="/catalogue/$code"
                      params={{ code: offering.code }}
                      className="text-[13.5px] font-medium text-primary underline-offset-4 hover:underline"
                    >
                      See what it asks for
                    </Link>
                    <Button asChild size="sm">
                      <Link to="/catalogue/$code" params={{ code: offering.code }}>
                        Start application
                      </Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      <p className="mt-6 text-[12.5px] leading-[1.55] text-muted-foreground">
        Codes, categories and destinations are configured records, not a fixed list. Nothing in this
        screen is hard-coded per country.
      </p>
    </PageBody>
  )
}

function Tag({ children }: { children: string }) {
  return (
    <span className="rounded-[3px] bg-background px-2.5 py-1 text-xs text-label">{children}</span>
  )
}

function Filter({
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
  options: string[]
  anyLabel: string
}) {
  return (
    <div className="flex w-[200px] flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{anyLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
