import { RoleEditor } from '@/features/admin/components/role-editor'

export function AdminRolesView() {
  return (
    <RoleEditor
      scope="global"
      title="Global roles"
      lede="These apply across the whole platform, unlike organisation roles, which only mean something inside their own organisation."
    />
  )
}
