/**
 * A small in-memory stand-in for the backend, shaped by the documented
 * behaviours rather than by convenience: unverified accounts cannot sign in,
 * refresh tokens rotate and a reused one revokes its family, and
 * forgot-password answers identically for every address.
 */

export type MockUser = {
  id: string
  email: string
  password: string
  firstName: string
  lastName: string
  phoneNumber: string | null
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'LOCKED' | 'SUSPENDED' | 'DISABLED'
  emailVerified: boolean
  mfaEnabled: boolean
  permissions: string[]
  roles: string[]
  createdAt: string
  verificationToken: string | null
  resetToken: string | null
  failedAttempts: number
  lockedUntil: number | null
}

export type MockApplication = {
  id: string
  ownerId: string
  reference: string
  clientId: string
  visaDefinitionId: string
  status: string
  applicantNotes: string | null
  answers: Record<string, unknown>
  timeline: {
    id: string
    previousStatus: string | null
    status: string
    actorUserId: string | null
    timestamp: string
    reason: string | null
  }[]
  officerId: string | null
  priority: string
  dueAt: string | null
  createdAt: string
  updatedAt: string
}

type RegistrationStatus =
  | 'PENDING_EMAIL_VERIFICATION'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'

type VersionState = 'DRAFT' | 'ACTIVE' | 'INACTIVE'

export type MockClient = {
  id: string
  ownerId: string
  firstName: string
  middleName: string | null
  lastName: string
  dateOfBirth: string
  gender: 'FEMALE' | 'MALE' | 'UNSPECIFIED'
  nationality: string
  countryOfResidence: string
  email: string | null
  phoneNumber: string | null
  selfManaged: boolean
}

/** One list, so a registered account and a seeded one cannot drift apart. */
export const CUSTOMER_PERMISSIONS = [
  'CLIENT_CREATE',
  'CLIENT_READ',
  'CLIENT_UPDATE',
  'APPLICATION_CREATE',
  'APPLICATION_READ_OWN',
  'APPLICATION_UPDATE',
  'DOCUMENT_UPLOAD',
  'DOCUMENT_READ_OWN',
  // The seeded account doubles as staff so the queue is reachable in dev.
  'APPLICATION_READ_ALL',
  'APPLICATION_ASSIGN',
  'APPLICATION_UPDATE',
  'APPLICATION_CHANGE_STATUS',
  'APPLICATION_REQUEST_INFORMATION',
  'APPLICATION_NOTE_INTERNAL',
  'APPLICATION_CHECKLIST_UPDATE',
  'USER_READ',
  'USER_CREATE',
  'USER_UPDATE',
  'USER_DISABLE',
  'ROLE_CREATE',
  'ROLE_UPDATE',
  'PERMISSION_ASSIGN',
  'ORGANISATION_MANAGE',
  'VISA_CATALOGUE_MANAGE',
  // Deliberately included in dev so the review queue is reachable. In the real
  // backend this is a separate, sensitive grant — never implied by the rest.
  'TENANT_ACCESS_CROSS',
]

export function seedUsers(): MockUser[] {
  return [
    {
      id: 'usr_ada',
      email: 'ada@example.com',
      password: 'correct horse battery',
      firstName: 'Ada',
      lastName: 'Okafor',
      phoneNumber: '+2348000000000',
      status: 'ACTIVE',
      emailVerified: true,
      mfaEnabled: false,
      permissions: CUSTOMER_PERMISSIONS,
      roles: ['CUSTOMER', 'STAFF', 'PLATFORM_ADMIN'],
      createdAt: '2026-09-12T09:00:00.000Z',
      verificationToken: null,
      resetToken: null,
      failedAttempts: 0,
      lockedUntil: null,
    },
    {
      id: 'usr_chidi',
      email: 'chidi@example.com',
      password: 'correct horse battery',
      firstName: 'Chidi',
      lastName: 'Eze',
      phoneNumber: null,
      // Signing in as this one exercises the unverified refusal.
      status: 'PENDING_VERIFICATION',
      emailVerified: false,
      mfaEnabled: false,
      permissions: CUSTOMER_PERMISSIONS,
      roles: ['CUSTOMER'],
      createdAt: '2026-09-21T09:00:00.000Z',
      verificationToken: 'verify-chidi',
      resetToken: null,
      failedAttempts: 0,
      lockedUntil: null,
    },
  ]
}


/** Seeds the reset endpoint restores, so a test run starts from a known state. */
export function seedRegistrations() {
  return [

    { id: 'reg_1', applicantId: 'usr_applicant_1', code: 'MERIDIAN_VS', name: 'Meridian Visa Services', applicantName: 'Ngozi Umeh', applicantEmail: 'ops@meridianvisa.com', applicantVerified: true, status: 'PENDING_APPROVAL' as RegistrationStatus, submittedAt: '2026-09-08T09:14:00.000Z' },
    { id: 'reg_2', applicantId: 'usr_applicant_2', code: 'HARBOUR_LAW', name: 'Harbour Immigration Law', applicantName: 'Tunde Bakare', applicantEmail: 'admin@harbourlaw.ng', applicantVerified: true, status: 'PENDING_APPROVAL' as RegistrationStatus, submittedAt: '2026-09-19T11:02:00.000Z' },
    { id: 'reg_3', applicantId: 'usr_applicant_3', code: 'TRAILMARK', name: 'Trailmark Consulting', applicantName: 'Chidi Eze', applicantEmail: 'chidi@trailmark.io', applicantVerified: false, status: 'PENDING_EMAIL_VERIFICATION' as RegistrationStatus, submittedAt: '2026-09-21T15:40:00.000Z' },
  ]
}

export function seedVisaVersions() {
  return [

    { id: 'def_gb_visitor_v5', code: 'GB_VISITOR_STD', name: 'United Kingdom — Standard Visitor', version: 5, state: 'DRAFT' as VersionState, questionCount: 12, requirementCount: 5, applicationCount: 0, activatedAt: null as string | null },
    { id: 'def_gb_visitor_v4', code: 'GB_VISITOR_STD', name: 'United Kingdom — Standard Visitor', version: 4, state: 'ACTIVE' as VersionState, questionCount: 12, requirementCount: 5, applicationCount: 214, activatedAt: '2026-08-02T10:00:00.000Z' as string | null },
    { id: 'def_gb_visitor_v3', code: 'GB_VISITOR_STD', name: 'United Kingdom — Standard Visitor', version: 3, state: 'INACTIVE' as VersionState, questionCount: 11, requirementCount: 5, applicationCount: 41, activatedAt: '2026-03-14T10:00:00.000Z' as string | null },
    { id: 'def_ae_visit_v6', code: 'AE_VISIT_30', name: 'United Arab Emirates — 30-day Visit', version: 6, state: 'ACTIVE' as VersionState, questionCount: 3, requirementCount: 3, applicationCount: 88, activatedAt: '2026-05-01T10:00:00.000Z' as string | null },
  ]
}

export const db = {
  users: seedUsers(),

  clients: [] as MockClient[],

  applications: [] as MockApplication[],

  documents: [] as {
    id: string
    versionId: string
    documentId: string
    applicationId: string | null
    clientId: string | null
    categoryCode: string
    originalFilename: string
    filename: string
    contentType: string
    size: number
    sizeBytes: number
    current: boolean
    checksum: string | null
    versionNumber: number
    version: number
    issueDate: string | null
    expiryDate: string | null
    uploadedAt: string
  }[],

  roles: [
    { id: 'rol_customer', code: 'CUSTOMER', name: 'Customer', description: 'Applies for themselves and their family.', permissions: ['CLIENT_CREATE', 'CLIENT_READ', 'CLIENT_UPDATE', 'APPLICATION_CREATE', 'APPLICATION_READ_OWN', 'DOCUMENT_UPLOAD', 'DOCUMENT_READ_OWN'], memberCount: 0 },
    { id: 'rol_staff', code: 'STAFF', name: 'Staff', description: 'Works the processing queue.', permissions: ['APPLICATION_READ_ALL', 'APPLICATION_UPDATE', 'APPLICATION_ASSIGN', 'APPLICATION_NOTE_INTERNAL', 'APPLICATION_CHECKLIST_UPDATE'], memberCount: 0 },
    { id: 'rol_admin', code: 'PLATFORM_ADMIN', name: 'Platform administrator', description: 'Runs accounts, roles, organisations and the catalogue.', permissions: ['USER_READ', 'USER_CREATE', 'USER_DISABLE', 'PERMISSION_ASSIGN', 'ORGANISATION_MANAGE', 'VISA_CATALOGUE_MANAGE', 'TENANT_ACCESS_CROSS'], memberCount: 0 },
  ],

  organisationRoles: [
    { id: 'orl_officer', code: 'CASE_OFFICER', name: 'Case officer', description: null, permissions: ['CLIENT_READ', 'APPLICATION_READ_ALL', 'APPLICATION_UPDATE', 'APPLICATION_REQUEST_INFORMATION', 'APPLICATION_NOTE_INTERNAL'], memberCount: 2 },
    { id: 'orl_reviewer', code: 'REVIEWER', name: 'Reviewer', description: null, permissions: ['APPLICATION_READ_ALL', 'APPLICATION_REVIEW'], memberCount: 1 },
    { id: 'orl_admin', code: 'ORG_ADMIN', name: 'Administrator', description: null, permissions: ['CLIENT_READ', 'CLIENT_CREATE', 'APPLICATION_READ_ALL', 'APPLICATION_ASSIGN', 'ORGANISATION_MANAGE'], memberCount: 1 },
  ],

  memberships: [
    { membershipId: 'mem_1', userId: 'usr_ada', email: 'ada@example.com', active: true, roles: ['ORG_ADMIN'] },
    { membershipId: 'mem_2', userId: 'usr_kene', email: 'kene@adatravel.com', active: true, roles: ['CASE_OFFICER'] },
    { membershipId: 'mem_3', userId: 'usr_ife', email: 'ife@adatravel.com', active: false, roles: ['CASE_OFFICER', 'REVIEWER'] },
  ],

  registrations: seedRegistrations(),

  visaVersions: seedVisaVersions(),

  family: [] as {
    clientId: string
    ownerId: string
    relationship: string
    consentGrantedAt: string | null
    migratedAt: string | null
    invitation: {
      purpose: 'CONSENT' | 'MIGRATION'
      token: string
      sentTo: string
      expiresAt: string
    } | null
  }[],

  notes: [] as {
    id: string
    applicationId: string
    author: string
    createdAt: string
    note: string
  }[],

  checklist: [] as {
    applicationId: string
    code: string
    label: string
    completed: boolean
    completedBy: string | null
    completedAt: string | null
  }[],

  informationRequests: [] as {
    id: string
    applicationId: string
    message: string
    dueAt: string | null
    createdAt: string
    resolvedAt: string | null
  }[],

  /** userId -> the one refresh token currently valid for them. */
  refreshTokens: new Map<string, string>(),
  /** Tokens that have been spent. Re-using one kills the family. */
  spentRefreshTokens: new Set<string>(),
  /** accessToken -> { userId, issuedAt } */
  accessTokens: new Map<string, { userId: string; issuedAt: number }>(),
}

/** Short on purpose, so the refresh path actually runs during development. */
export const ACCESS_TOKEN_TTL_MS = 120_000

let counter = 0
export const nextId = (prefix: string) => `${prefix}_${++counter}_${Date.now().toString(36)}`

export function issueTokens(userId: string) {
  const accessToken = nextId('access')
  const refreshToken = nextId('refresh')
  db.accessTokens.set(accessToken, { userId, issuedAt: Date.now() })
  const previous = db.refreshTokens.get(userId)
  if (previous) db.spentRefreshTokens.add(previous)
  db.refreshTokens.set(userId, refreshToken)
  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
  }
}

export function userFromAuthHeader(header: string | null): MockUser | null {
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice(7)
  const entry = db.accessTokens.get(token)
  if (!entry) return null
  if (Date.now() - entry.issuedAt > ACCESS_TOKEN_TTL_MS) return null
  return db.users.find((u) => u.id === entry.userId) ?? null
}

export function findUserByEmail(email: string) {
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
}
