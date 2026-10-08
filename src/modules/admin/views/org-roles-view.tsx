import { humanMessage } from '@/api/problem'
import {
  NoOrganisation,
  OrganisationPicker,
} from '@/features/admin/components/organisation-picker'
import { RoleEditor } from '@/features/admin/components/role-editor'
import { useSelectedOrganisation } from '@/features/admin/hooks/use-organisations'
import { PageBody } from '@/components/shared/app-shell'
import { Notice } from '@/components/shared/notice'
import { Skeleton } from '@/components/ui/skeleton'

export function OrgRolesView() {
  const { organisations, current, select } = useSelectedOrganisation()

  if (organisations.isError || organisations.isPending || !current) {
    return (
      <PageBody className="max-w-[1100px]">
        <h1 className="mb-6 text-[28px]">Roles in this organisation</h1>
        {organisations.isError ? (
          <Notice tone="danger" title={humanMessage(organisations.error)} />
        ) : organisations.isPending ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : (
          <NoOrganisation />
        )}
      </PageBody>
    )
  }

  return (
    <RoleEditor
      key={current.id}
      scope="organisation"
      organisationId={current.id}
      title={`Roles in ${current.name}`}
      lede={`A role is a named bundle of permissions. These belong to ${current.name} and mean nothing anywhere else.`}
      picker={
        <OrganisationPicker
          organisations={organisations.data}
          current={current}
          onSelect={select}
        />
      }
    />
  )
}
