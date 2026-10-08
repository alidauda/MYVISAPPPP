import { Notice } from '@/components/shared/notice'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Organisation } from '../lib/schemas'

/** Only shown when there is a choice to make; one organisation is just a name. */
export function OrganisationPicker({
  organisations,
  current,
  onSelect,
}: {
  organisations: Organisation[]
  current: Organisation
  onSelect: (id: string) => void
}) {
  if (organisations.length < 2) return null
  return (
    <div className="mb-5 flex max-w-[360px] flex-col gap-1.5">
      <Label htmlFor="organisation">Organisation</Label>
      <Select value={current.id} onValueChange={onSelect}>
        <SelectTrigger id="organisation" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {organisations.map((organisation) => (
            <SelectItem key={organisation.id} value={organisation.id}>
              {organisation.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function NoOrganisation() {
  return (
    <Notice tone="info" title="No organisation to show yet">
      Organisations are found through the travellers and applications they manage, because the
      backend does not yet say which organisations you belong to. One will appear here once it
      manages at least one record you can see.
    </Notice>
  )
}
