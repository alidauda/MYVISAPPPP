/**
 * Validates a REAL backend against the Zod schemas the app parses with, as
 * every role the app serves. Read-only: the only write is signing in.
 *
 * The OpenAPI document is not enough on its own — several of its response
 * schemas are wrong (see docs/openapi.json and the backend notes) — so this
 * reads real responses and reports the exact path of every mismatch.
 *
 *   VITE_API_ORIGIN=https://… CONTRACT_PASSWORD=… npx tsx scripts/check-contract.ts
 *
 * Accounts default to the backend's demo seed; override with
 * CONTRACT_ACCOUNTS="admin=a@x.test,customer=b@x.test,…" (same password).
 */
import { z } from 'zod'
import { apiErrorSchema, apiSuccess, customPage, springPage } from '../src/api/envelope'
import { accountSchema, tokenPairSchema } from '../src/features/auth/lib/schemas'
import { clientSchema } from '../src/features/travellers/lib/schemas'
import {
  applicationQuestionsSchema,
  applicationSchema,
  informationRequestSchema,
  timelineEntrySchema,
} from '../src/features/applications/lib/schemas'
import { visaDefinitionSchema, visaSummarySchema } from '../src/features/catalogue/lib/schemas'
import {
  checklistItemSchema,
  internalNoteSchema,
  queueRowSchema,
} from '../src/features/processing/lib/schemas'
import {
  adminUserSchema,
  managedUserSchema,
  membershipSchema,
  organisationRegistrationReviewSchema,
  organisationSchema,
  permissionSchema,
  roleSchema,
} from '../src/features/admin/lib/schemas'
import { familyRelationshipSchema } from '../src/features/family/lib/schemas'

const origin = (process.env.VITE_API_ORIGIN ?? 'http://localhost:8080').replace(/\/$/, '')
const base = `${origin}${process.env.VITE_API_PREFIX ?? '/api/v1'}`
const password = process.env.CONTRACT_PASSWORD

const DEMO = 'demo.myvisapp.test'
const accounts: Record<string, string> = process.env.CONTRACT_ACCOUNTS
  ? Object.fromEntries(process.env.CONTRACT_ACCOUNTS.split(',').map((pair) => pair.split('=')))
  : {
      admin: `admin@${DEMO}`,
      customer: `ada@${DEMO}`,
      officer: `officer@${DEMO}`,
      reviewer: `reviewer@${DEMO}`,
      orgAdmin: `orgadmin@${DEMO}`,
      otherOrgAdmin: `otherorg@${DEMO}`,
      orgApplicant: `applicant@${DEMO}`,
      familyAdult: `adult@${DEMO}`,
      migrated: `migrated@${DEMO}`,
      unverified: `pending@${DEMO}`,
      suspended: `suspended@${DEMO}`,
    }

let passed = 0
let failed = 0
/** Backend faults (5xx) are reported apart from schema mismatches: the fix is not ours. */
const backendFaults: string[] = []

function ok(name: string) {
  passed++
  console.log(`  ✔ ${name}`)
}
function fail(name: string, lines: string[]) {
  failed++
  console.log(`  ✖ ${name}`)
  for (const line of lines) console.log(`      ${line}`)
}

async function call(path: string, token: string | null, init: RequestInit = {}) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  return { status: response.status, body: await response.json().catch(() => null) }
}

/** A read that should succeed and match `schema`. Returns the parsed data or null. */
async function read<T extends z.ZodTypeAny>(
  name: string,
  path: string,
  schema: T,
  token: string | null,
): Promise<z.infer<T> | null> {
  const { status, body } = await call(path, token)
  if (status >= 500) {
    backendFaults.push(`${name} → ${status}`)
    fail(name, [`HTTP ${status} — backend fault`])
    return null
  }
  if (status >= 400) {
    fail(name, [`HTTP ${status} ${(body as { code?: string } | null)?.code ?? ''}`])
    return null
  }
  const parsed = apiSuccess(schema).safeParse(body)
  if (!parsed.success) {
    fail(
      name,
      parsed.error.issues.slice(0, 8).map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    )
    return null
  }
  ok(name)
  return parsed.data.data
}

/** A read that must be refused — tenant isolation and permission boundaries. */
async function refused(name: string, path: string, token: string | null, allowed: number[]) {
  const { status, body } = await call(path, token)
  if (allowed.includes(status) && apiErrorSchema.safeParse(body).success) ok(name)
  else fail(name, [`expected ${allowed.join(' or ')} with an error envelope, got HTTP ${status}`])
}

async function signIn(role: string): Promise<string | null> {
  const email = accounts[role]
  if (!email) return null
  const { status, body } = await call('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  const parsed = apiSuccess(tokenPairSchema).safeParse(body)
  if (status !== 200 || !parsed.success) {
    fail(`sign in as ${role}`, [`HTTP ${status}`])
    return null
  }
  ok(`sign in as ${role}`)
  return parsed.data.data.accessToken
}

const caseReads = async (label: string, applicationId: string, token: string) => {
  await read(`${label}: application`, `/applications/${applicationId}`, applicationSchema, token)
  await read(
    `${label}: questions`,
    `/applications/${applicationId}/questions`,
    applicationQuestionsSchema,
    token,
  )
  await read(
    `${label}: timeline`,
    `/applications/${applicationId}/timeline`,
    z.array(timelineEntrySchema),
    token,
  )
}

console.log(`Checking ${base}\n`)

console.log('Public')
const catalogue = await read('catalogue', '/visa-catalogue', z.array(visaSummarySchema), null)
for (const offering of catalogue ?? []) {
  await read(`catalogue/${offering.code}`, `/visa-catalogue/${offering.code}`, visaDefinitionSchema, null)
}

if (!password) {
  console.log('\nSet CONTRACT_PASSWORD to check the signed-in half.')
  process.exit(failed > 0 ? 1 : 0)
}

console.log('\nBlocked accounts')
for (const role of ['unverified', 'suspended']) {
  if (!accounts[role]) continue
  const { status, body } = await call('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ email: accounts[role], password }),
  })
  if ((status === 401 || status === 403) && apiErrorSchema.safeParse(body).success) {
    ok(`${role} is refused (${status} ${(body as { code: string }).code})`)
  } else fail(`${role} is refused`, [`got HTTP ${status}`])
}

console.log('\nAdmin')
const admin = await signIn('admin')
const organisationIds: string[] = []
if (admin) {
  await read('me', '/users/me', accountSchema, admin)
  const clients = await read('travellers', '/clients?page=0&size=100', customPage(clientSchema), admin)
  const apps = await read(
    'applications',
    '/applications?page=0&size=100',
    customPage(applicationSchema),
    admin,
  )
  for (const record of [...(apps?.content ?? []), ...(clients?.content ?? [])]) {
    if (record.managingOrganisationId && !organisationIds.includes(record.managingOrganisationId)) {
      organisationIds.push(record.managingOrganisationId)
    }
  }
  const first = apps?.content[0]
  if (first) {
    await caseReads('case', first.id, admin)
    await read('case: notes', `/internal/applications/${first.id}/notes`, springPage(internalNoteSchema), admin)
    await read('case: checklist', `/internal/applications/${first.id}/checklist`, z.array(checklistItemSchema), admin)
    await read(
      'case: information requests',
      `/applications/${first.id}/information-requests`,
      springPage(informationRequestSchema),
      admin,
    )
  }
  await read('queue', '/internal/applications?page=0&size=20', springPage(queueRowSchema), admin)
  const users = await read('accounts', '/users?page=0&size=20', springPage(adminUserSchema), admin)
  if (users?.content[0]) {
    await read('account by id', `/users/${users.content[0].id}`, managedUserSchema, admin)
  }
  await read('global roles', '/roles', z.array(roleSchema), admin)
  await read('permissions', '/roles/permissions', z.array(permissionSchema), admin)
  for (const id of organisationIds) {
    const org = await read(`organisation ${id.slice(-4)}`, `/organisations/${id}`, organisationSchema, admin)
    await read(`${org?.name ?? id}: members`, `/organisations/${id}/members`, z.array(membershipSchema), admin)
    await read(`${org?.name ?? id}: roles`, `/organisations/${id}/roles`, z.array(roleSchema), admin)
  }
  const review = await read(
    'registration review',
    '/organisation-registrations?reviewQueue=true&page=0',
    springPage(organisationRegistrationReviewSchema),
    admin,
  )
  const applicantId = review?.content.find((r) => r.applicantId)?.applicantId
  if (applicantId) await read('registration applicant', `/users/${applicantId}`, managedUserSchema, admin)
  const live = catalogue?.[0]
  if (live) {
    await read('catalogue version by id', `/admin/visa-definitions/${live.id}`, visaDefinitionSchema, admin)
  }
}

console.log('\nCustomer')
const customer = await signIn('customer')
if (customer) {
  await read('me', '/users/me', accountSchema, customer)
  const clients = await read('travellers', '/clients?page=0&size=100', customPage(clientSchema), customer)
  for (const client of clients?.content ?? []) {
    // 200 for family the customer manages, 404 for their own record.
    const { status, body } = await call(`/family-members/${client.id}`, customer)
    const label = `family lookup: ${client.firstName}`
    if (status === 404) ok(`${label} (no relationship)`)
    else if (status === 200 && apiSuccess(familyRelationshipSchema).safeParse(body).success) {
      ok(`${label} (${(body as { data: { relationship: string } }).data.relationship})`)
    } else fail(label, [`HTTP ${status}`])
  }
  const apps = await read(
    'applications',
    '/applications?page=0&size=100',
    customPage(applicationSchema),
    customer,
  )
  if (apps?.content[0]) await caseReads('own application', apps.content[0].id, customer)
  for (const app of apps?.content ?? []) {
    await read(
      `information requests: ${app.reference}`,
      `/applications/${app.id}/information-requests?page=0&size=20`,
      springPage(informationRequestSchema),
      customer,
    )
  }
  await refused('cannot read the queue', '/internal/applications?page=0', customer, [403])
  await refused('cannot list accounts', '/users?page=0', customer, [403])
}

for (const role of ['officer', 'reviewer']) {
  console.log(`\n${role[0].toUpperCase()}${role.slice(1)}`)
  const token = await signIn(role)
  if (!token) continue
  await read('me', '/users/me', accountSchema, token)
  const apps = await read(
    'applications',
    '/applications?page=0&size=100',
    customPage(applicationSchema),
    token,
  )
  const first = apps?.content[0]
  if (first) {
    await caseReads('case', first.id, token)
    await read('case: notes', `/internal/applications/${first.id}/notes`, springPage(internalNoteSchema), token)
    await read('case: checklist', `/internal/applications/${first.id}/checklist`, z.array(checklistItemSchema), token)
    if (first.managingOrganisationId) {
      await read(
        'assignable members',
        `/organisations/${first.managingOrganisationId}/members`,
        z.array(membershipSchema),
        token,
      )
    }
  }
}

for (const role of ['orgAdmin', 'otherOrgAdmin']) {
  console.log(`\n${role === 'orgAdmin' ? 'Organisation admin' : 'Other organisation admin'}`)
  const token = await signIn(role)
  if (!token) continue
  const me = await read('me', '/users/me', accountSchema, token)
  if (me && me.permissions.length === 0) {
    fail('has permissions to drive the UI', [
      '/users/me lists no permissions, so every guarded screen stays hidden',
    ])
  }
  // Which organisation is theirs is not exposed; try each and expect exactly one.
  const reachable: string[] = []
  for (const id of organisationIds) {
    const { status } = await call(`/organisations/${id}/members`, token)
    if (status === 200) reachable.push(id)
  }
  if (reachable.length === 1) ok(`reaches exactly one organisation (${reachable[0].slice(-4)})`)
  else fail('reaches exactly one organisation', [`reached ${reachable.length}`])
  for (const id of organisationIds.filter((o) => !reachable.includes(o))) {
    await refused(`cannot read organisation ${id.slice(-4)}`, `/organisations/${id}/members`, token, [403, 404])
  }
}

for (const role of ['orgApplicant', 'familyAdult', 'migrated']) {
  console.log(`\n${role}`)
  const token = await signIn(role)
  if (!token) continue
  await read('me', '/users/me', accountSchema, token)
  await read('travellers', '/clients?page=0&size=100', customPage(clientSchema), token)
  await read('applications', '/applications?page=0&size=100', customPage(applicationSchema), token)
}

console.log(`\n${passed} passed, ${failed} failed.`)
if (backendFaults.length) {
  console.log(`\nBackend faults (5xx — not fixable here):\n  ${backendFaults.join('\n  ')}`)
}
process.exit(failed > 0 ? 1 : 0)
