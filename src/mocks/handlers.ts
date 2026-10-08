import { http, HttpResponse } from 'msw'
import { mockCatalogue } from './catalogue'
import {
  CUSTOMER_PERMISSIONS,
  db,
  seedRegistrations,
  seedUsers,
  seedVisaVersions,
  findUserByEmail,
  issueTokens,
  nextId,
  userFromAuthHeader,
  type MockUser,
} from './db'

const PREFIX = ''

const now = () => new Date().toISOString()

function ok<T>(data: T, message?: string, status = 200) {
  return HttpResponse.json({ success: true, message, data, timestamp: now() }, { status })
}

function fail(
  status: number,
  code: string,
  message: string,
  extra: { path?: string; validationErrors?: { field: string; code?: string; message: string }[] } = {},
) {
  return HttpResponse.json(
    {
      success: false,
      code,
      message,
      status,
      path: extra.path,
      validationErrors: extra.validationErrors,
      timestamp: now(),
      traceId: nextId('trace'),
    },
    { status },
  )
}

function accountOf(user: MockUser) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    status: user.status,
    emailVerified: user.emailVerified,
    mfaEnabled: user.mfaEnabled,
    permissions: user.permissions,
  }
}

function requireUser(request: Request) {
  return userFromAuthHeader(request.headers.get('Authorization'))
}

export const handlers = [
  /**
   * Probed at boot. If this does not answer, the service worker is not
   * controlling the page and every other call falls through to Vite and comes
   * back as a 404 — which looks like an app bug and is not one.
   */
  http.get(`${PREFIX}/__mock_health__`, () => ok({ ok: true })),

  /** Wipe the fixture back to its seeds without restarting the dev server. */
  http.post(`${PREFIX}/__mock_reset__`, () => {
    db.clients.length = 0
    db.applications.length = 0
    db.users.length = 0
    db.users.push(...seedUsers())
    db.documents.length = 0
    db.notes.length = 0
    db.checklist.length = 0
    db.informationRequests.length = 0
    db.family.length = 0
    db.registrations.length = 0
    db.registrations.push(...seedRegistrations())
    db.visaVersions.length = 0
    db.visaVersions.push(...seedVisaVersions())
    db.refreshTokens.clear()
    db.spentRefreshTokens.clear()
    db.accessTokens.clear()
    return ok({ reset: true })
  }),

  /* ------------------------------ auth ------------------------------ */

  http.post(`${PREFIX}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as Record<string, string>

    if (findUserByEmail(body.email)) {
      return fail(409, 'EMAIL_ALREADY_REGISTERED', 'That email address is already registered.')
    }

    const user: MockUser = {
      id: nextId('usr'),
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
      phoneNumber: body.phoneNumber ?? null,
      status: 'PENDING_VERIFICATION',
      emailVerified: false,
      mfaEnabled: false,
      permissions: CUSTOMER_PERMISSIONS,
      roles: ['CUSTOMER'],
      createdAt: new Date().toISOString(),
      verificationToken: nextId('verify'),
      resetToken: null,
      failedAttempts: 0,
      lockedUntil: null,
    }
    db.users.push(user)

    // The real backend emails this. Here it goes to the console so the flow
    // can be walked end to end without a mail server.
    console.info(
      `%c[mock] verification link → /verify-email?token=${user.verificationToken}`,
      'color:#4416c4;font-weight:600',
    )

    // 201, and deliberately no tokens: registration does not authenticate.
    return ok({ id: user.id, email: user.email, status: user.status }, 'Check your email.', 201)
  }),

  http.post(`${PREFIX}/auth/login`, async ({ request }) => {
    const { email, password } = (await request.json()) as { email: string; password: string }
    const user = findUserByEmail(email)

    if (!user || user.password !== password) {
      if (user) {
        user.failedAttempts += 1
        if (user.failedAttempts >= 5) user.lockedUntil = Date.now() + 15 * 60_000
      }
      return fail(401, 'INVALID_CREDENTIALS', 'That email address and password do not match.')
    }
    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      return fail(
        423,
        'ACCOUNT_LOCKED',
        'Too many failed attempts. This account is locked for 15 minutes.',
      )
    }
    if (!user.emailVerified) {
      return fail(403, 'EMAIL_NOT_VERIFIED', 'Verify your email address before signing in.')
    }
    if (user.status === 'SUSPENDED' || user.status === 'DISABLED') {
      return fail(403, 'ACCOUNT_UNAVAILABLE', 'This account cannot sign in.')
    }

    user.failedAttempts = 0
    user.lockedUntil = null
    return ok(issueTokens(user.id))
  }),

  http.post(`${PREFIX}/auth/refresh`, async ({ request }) => {
    const { refreshToken } = (await request.json()) as { refreshToken: string }

    // Reuse of a spent token revokes the whole family, exactly as documented.
    if (db.spentRefreshTokens.has(refreshToken)) {
      for (const [userId, current] of db.refreshTokens) {
        if (current === refreshToken) db.refreshTokens.delete(userId)
      }
      return fail(401, 'REFRESH_TOKEN_REUSED', 'Your session has ended. Sign in again.')
    }

    const entry = [...db.refreshTokens.entries()].find(([, token]) => token === refreshToken)
    if (!entry) return fail(401, 'REFRESH_TOKEN_INVALID', 'Your session has ended. Sign in again.')

    return ok(issueTokens(entry[0]))
  }),

  http.post(`${PREFIX}/auth/logout`, async ({ request }) => {
    const { refreshToken } = (await request.json()) as { refreshToken: string }
    for (const [userId, token] of db.refreshTokens) {
      if (token === refreshToken) {
        db.refreshTokens.delete(userId)
        db.spentRefreshTokens.add(token)
      }
    }
    // An unknown but non-blank token is ignored, not an error.
    return ok(null, 'Signed out.')
  }),

  http.post(`${PREFIX}/auth/resend-verification`, async ({ request }) => {
    const { email } = (await request.json()) as { email: string }
    const user = findUserByEmail(email)
    if (user && !user.emailVerified) {
      user.verificationToken = nextId('verify')
      console.info(
        `%c[mock] verification link → /verify-email?token=${user.verificationToken}`,
        'color:#4416c4;font-weight:600',
      )
    }
    // Same answer either way, like forgot-password.
    return ok(null, 'If that address needs verifying, a link is on its way.')
  }),

  http.post(`${PREFIX}/auth/verify-email`, async ({ request }) => {
    const { token } = (await request.json()) as { token: string }
    const user = db.users.find((u) => u.verificationToken === token)
    if (!user) {
      return fail(400, 'VERIFICATION_TOKEN_INVALID', 'This link is no longer valid.')
    }
    user.emailVerified = true
    user.status = 'ACTIVE'
    user.verificationToken = null // single use
    return ok(null, 'Email verified.')
  }),

  http.post(`${PREFIX}/auth/forgot-password`, async ({ request }) => {
    const { email } = (await request.json()) as { email: string }
    const user = findUserByEmail(email)
    if (user) {
      user.resetToken = nextId('reset')
      console.info(
        `%c[mock] reset link → /reset-password?token=${user.resetToken}`,
        'color:#4416c4;font-weight:600',
      )
    }
    // Identical answer either way — never reveal whether the account exists.
    return ok(null, 'If that address has an account, a reset link is on its way.')
  }),

  http.post(`${PREFIX}/auth/reset-password`, async ({ request }) => {
    const { token, newPassword } = (await request.json()) as {
      token: string
      newPassword?: string
    }
    // Mirror the contract exactly, including which field is required.
    if (!newPassword?.trim()) {
      return fail(400, 'VALIDATION_FAILED', 'One or more fields are invalid', {
        path: '/api/v1/auth/reset-password',
        validationErrors: [{ field: 'newPassword', code: 'NotBlank', message: 'Invalid value' }],
      })
    }
    const user = db.users.find((u) => u.resetToken === token)
    if (!user) return fail(400, 'RESET_TOKEN_INVALID', 'This link is no longer valid.')

    user.password = newPassword
    user.resetToken = null
    // Every refresh token for the account is revoked.
    const current = db.refreshTokens.get(user.id)
    if (current) db.spentRefreshTokens.add(current)
    db.refreshTokens.delete(user.id)
    return ok(null, 'Password updated. Sign in again.')
  }),

  /* ----------------------------- account ---------------------------- */

  http.get(`${PREFIX}/users/me`, ({ request }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    return ok(accountOf(user))
  }),

  /* ---------------------------- travellers -------------------------- */

  http.post(`${PREFIX}/clients`, async ({ request }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    if (!user.permissions.includes('CLIENT_CREATE')) {
      return fail(403, 'FORBIDDEN', 'You do not have access to this.')
    }

    const body = (await request.json()) as Record<string, string | boolean | null>

    if (typeof body.dateOfBirth !== 'string' || Number.isNaN(Date.parse(body.dateOfBirth))) {
      return fail(400, 'VALIDATION_FAILED', 'One or more fields are invalid.', {
        path: '/api/v1/clients',
        validationErrors: [
          { field: 'dateOfBirth', code: 'Date', message: 'Enter a real date in the format YYYY-MM-DD.' },
        ],
      })
    }

    const client = {
      id: nextId('cli'),
      ownerId: user.id,
      firstName: String(body.firstName),
      middleName: (body.middleName as string | null) ?? null,
      lastName: String(body.lastName),
      dateOfBirth: String(body.dateOfBirth),
      gender: body.gender as 'FEMALE' | 'MALE' | 'UNSPECIFIED',
      nationality: String(body.nationality),
      countryOfResidence: String(body.countryOfResidence),
      email: (body.email as string | null) ?? null,
      phoneNumber: (body.phoneNumber as string | null) ?? null,
      selfManaged: true,
    }
    db.clients.push(client)
    return ok(client, 'Traveller saved.', 201)
  }),

  http.get(`${PREFIX}/clients`, ({ request }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')

    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 0)
    const size = Math.min(Number(url.searchParams.get('size') ?? 20), 100)

    const mine = db.clients.filter((c) => c.ownerId === user.id)
    const slice = mine.slice(page * size, page * size + size)

    return ok({
      content: slice,
      page,
      size,
      totalElements: mine.length,
      totalPages: Math.max(1, Math.ceil(mine.length / size)),
    })
  }),

  http.get(`${PREFIX}/clients/:id`, ({ request, params }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    const client = db.clients.find((c) => c.id === params.id && c.ownerId === user.id)
    // A record owned by someone else is hidden, not refused: 404, never 403.
    if (!client) return fail(404, 'NOT_FOUND', 'We could not find that.')
    return ok(client)
  }),

  /* ---------------------------- catalogue --------------------------- */

  // Public: no bearer token, and no server-side filtering to offer.
  http.get(`${PREFIX}/visa-catalogue`, () =>
    ok(
      mockCatalogue.map(({ requirements: _r, questions: _q, processingInformation: _p, ...rest }) => rest),
    ),
  ),

  http.get(`${PREFIX}/visa-catalogue/:code`, ({ params }) => {
    const offering = mockCatalogue.find((o) => o.code === params.code)
    if (!offering) return fail(404, 'NOT_FOUND', 'We could not find that offering.')
    return ok(offering)
  }),

  /* --------------------------- applications ------------------------- */

  http.post(`${PREFIX}/applications`, async ({ request }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')

    const body = (await request.json()) as { clientId: string; visaDefinitionId: string }
    const client = db.clients.find((c) => c.id === body.clientId && c.ownerId === user.id)
    if (!client) return fail(404, 'NOT_FOUND', 'We could not find that traveller.')

    const definition = mockCatalogue.find((o) => o.id === body.visaDefinitionId)
    if (!definition) {
      return fail(400, 'VALIDATION_FAILED', 'One or more fields are invalid.', {
        validationErrors: [
          { field: 'visaDefinitionId', message: 'That offering has no active version.' },
        ],
      })
    }

    const now = new Date().toISOString()
    const application = {
      id: nextId('app'),
      ownerId: user.id,
      reference: `VIS-2026-${String(db.applications.length + 4180).padStart(6, '0')}`,
      clientId: client.id,
      visaDefinitionId: definition.id,
      status: 'DRAFT',
      applicantNotes: null,
      answers: {},
      timeline: [
        { id: nextId('tl'), previousStatus: null, status: 'DRAFT', actorUserId: user.id, timestamp: now, reason: null },
      ],
      officerId: null,
      priority: 'NORMAL',
      dueAt: null,
      createdAt: now,
      updatedAt: now,
    }
    db.applications.push(application)
    return ok(shapeApplication(application), 'Draft created.', 201)
  }),

  http.get(`${PREFIX}/applications`, ({ request }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')

    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 0)
    const size = Math.min(Number(url.searchParams.get('size') ?? 20), 100)
    const status = url.searchParams.get('status')

    const mine = db.applications
      .filter((a) => a.ownerId === user.id)
      .filter((a) => !status || a.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return ok({
      content: mine.slice(page * size, page * size + size).map(shapeApplication),
      page,
      size,
      totalElements: mine.length,
      totalPages: Math.max(1, Math.ceil(mine.length / size)),
    })
  }),

  http.get(`${PREFIX}/applications/:id`, ({ request, params }) => {
    const application = ownedApplication(request, params.id as string)
    if (!application) return fail(404, 'NOT_FOUND', 'We could not find that.')
    return ok(shapeApplication(application))
  }),

  http.get(`${PREFIX}/applications/:id/questions`, ({ request, params }) => {
    const application = ownedApplication(request, params.id as string)
    if (!application) return fail(404, 'NOT_FOUND', 'We could not find that.')

    const definition = mockCatalogue.find((o) => o.id === application.visaDefinitionId)!
    const answers = application.answers as Record<string, unknown>
    return ok({
      applicationId: application.id,
      visaDefinitionId: definition.id,
      visaCode: definition.code,
      // The version the application was started on, not the current one.
      visaDefinitionVersion: definition.version,
      questions: definition.questions.map((question, index) => ({
        ...question,
        displayOrder: index,
        // The server evaluates rules too; the client re-evaluates for speed.
        visible: (question.rules ?? [])
          .filter((r: { effect: string }) => r.effect === 'DISPLAY')
          .every(
            (r: { sourceQuestionCode: string; expectedValue: string }) =>
              String(answers[r.sourceQuestionCode] ?? '') === r.expectedValue,
          ),
        currentAnswer: answers[question.code] ?? null,
      })),
    })
  }),

  http.put(`${PREFIX}/applications/:id/answers`, async ({ request, params }) => {
    const application = ownedApplication(request, params.id as string)
    if (!application) return fail(404, 'NOT_FOUND', 'We could not find that.')

    if (!['DRAFT', 'CORRECTION_REQUIRED'].includes(application.status)) {
      return fail(409, 'ANSWERS_LOCKED', 'Answers can only be edited in a draft or a correction.')
    }

    const body = (await request.json()) as {
      answers: { questionCode: string; value: unknown }[]
    }
    // Replaces the whole set — omitted answers are superseded, not merged.
    application.answers = Object.fromEntries(
      (body.answers ?? []).map((a) => [a.questionCode, a.value]),
    )
    application.updatedAt = new Date().toISOString()
    return ok({ saved: Object.keys(application.answers).length })
  }),

  /* -------------------------- administration ------------------------ */

  http.get(`${PREFIX}/users`, ({ request }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    if (!user.permissions.includes('USER_READ')) {
      return fail(403, 'FORBIDDEN', 'You do not have access to this.')
    }
    const rows = db.users.map(shapeAdminUser)
    return ok({
      content: rows,
      number: 0,
      size: 20,
      totalElements: rows.length,
      totalPages: 1,
    })
  }),

  http.get(`${PREFIX}/users/:id`, ({ request, params }) => {
    const actor = requireUser(request)
    if (!actor) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    if (!actor.permissions.includes('USER_READ')) {
      return fail(403, 'FORBIDDEN', 'You do not have access to this.')
    }
    const user = db.users.find((u) => u.id === params.id)
    if (user) return ok(shapeManagedUser(user))
    // Registration applicants live on the registration in this mock.
    const registration = db.registrations.find((r) => r.applicantId === params.id)
    if (!registration) return fail(404, 'NOT_FOUND', 'We could not find that account.')
    const [firstName, ...rest] = registration.applicantName.split(' ')
    return ok({
      id: registration.applicantId,
      email: registration.applicantEmail,
      firstName,
      lastName: rest.join(' '),
      phoneNumber: null,
      status: registration.applicantVerified ? 'ACTIVE' : 'PENDING_VERIFICATION',
      emailVerifiedAt: registration.applicantVerified ? registration.submittedAt : null,
      mfaEnabled: false,
      roles: ['CUSTOMER'],
    })
  }),

  http.post(`${PREFIX}/users/:id/:action`, ({ request, params }) => {
    const actor = requireUser(request)
    if (!actor) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    if (!actor.permissions.includes('USER_DISABLE')) {
      return fail(403, 'FORBIDDEN', 'You do not have access to this.')
    }
    const target = db.users.find((u) => u.id === params.id)
    if (!target) return fail(404, 'NOT_FOUND', 'We could not find that account.')
    // Administrators cannot lock themselves out.
    if (target.id === actor.id && params.action !== 'activate') {
      return fail(409, 'SELF_ACTION', 'You cannot do that to your own account.')
    }
    if (params.action === 'suspend') target.status = 'SUSPENDED'
    else if (params.action === 'disable') target.status = 'DISABLED'
    else if (params.action === 'activate') {
      // Verification is a prerequisite; this does not verify on their behalf.
      if (!target.emailVerified) {
        return fail(409, 'EMAIL_NOT_VERIFIED', 'That address has not been verified yet.')
      }
      target.status = 'ACTIVE'
      target.failedAttempts = 0
      target.lockedUntil = null
    } else return fail(404, 'NOT_FOUND', 'We could not find that.')
    return ok(shapeManagedUser(target))
  }),

  http.get(`${PREFIX}/roles`, ({ request }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    return ok(db.roles.map((r) => ({ ...r, memberCount: db.users.filter((u) => u.roles?.includes(r.code)).length })))
  }),

  http.get(`${PREFIX}/roles/permissions`, ({ request }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    return ok([...ALL_PERMISSIONS].sort((a, b) => a.code.localeCompare(b.code)))
  }),

  http.put(`${PREFIX}/roles/:roleId/permissions/:permissionId`, ({ params }) => {
    const role = db.roles.find((r) => r.id === params.roleId)
    const permission = ALL_PERMISSIONS.find((p) => p.id === params.permissionId)
    if (!role || !permission) return fail(404, 'NOT_FOUND', 'We could not find that.')
    if (!role.permissions.includes(permission.code)) role.permissions.push(permission.code)
    return ok(role)
  }),

  http.delete(`${PREFIX}/roles/:roleId/permissions/:permissionId`, ({ params }) => {
    const role = db.roles.find((r) => r.id === params.roleId)
    const permission = ALL_PERMISSIONS.find((p) => p.id === params.permissionId)
    if (!role || !permission) return fail(404, 'NOT_FOUND', 'We could not find that.')
    role.permissions = role.permissions.filter((code) => code !== permission.code)
    return ok(role)
  }),

  http.get(`${PREFIX}/organisations/:id`, ({ request, params }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    // Another organisation is not hidden, it does not exist for this account.
    if (params.id !== MOCK_ORGANISATION.id) return fail(404, 'NOT_FOUND', 'We could not find that.')
    return ok(MOCK_ORGANISATION)
  }),

  http.get(`${PREFIX}/organisations/:id/members`, ({ request }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    if (!user.permissions.includes('ORGANISATION_MANAGE')) {
      return fail(403, 'FORBIDDEN', 'You do not have access to this.')
    }
    return ok(db.memberships)
  }),

  http.post(`${PREFIX}/organisations/:id/members`, async ({ request }) => {
    const actor = requireUser(request)
    if (!actor) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    const { userId, roleIds } = (await request.json()) as { userId: string; roleIds?: string[] }
    const target = db.users.find((u) => u.id === userId)
    const roleCodes = (roleIds ?? []).flatMap((id) => {
      const role = db.organisationRoles.find((r) => r.id === id)
      return role ? [role.code] : []
    })
    // Adding a member never creates an account.
    if (!target) return fail(404, 'NOT_FOUND', 'No account exists for that address.')

    const existing = db.memberships.find((m) => m.userId === target.id)
    if (existing) {
      // Reactivating keeps the roles the membership already had.
      existing.active = true
      for (const code of roleCodes ?? []) {
        if (!existing.roles.includes(code)) existing.roles.push(code)
      }
      return ok(existing)
    }
    const membership = {
      membershipId: nextId('mem'),
      userId: target.id,
      email: target.email,
      active: true,
      roles: roleCodes ?? [],
    }
    db.memberships.push(membership)
    return ok(membership, 'Member added.', 201)
  }),

  http.delete(`${PREFIX}/organisations/:id/members/:membershipId`, ({ request, params }) => {
    const actor = requireUser(request)
    if (!actor) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    const membership = db.memberships.find((m) => m.membershipId === params.membershipId)
    if (!membership) return fail(404, 'NOT_FOUND', 'We could not find that membership.')
    if (membership.userId === actor.id) {
      return fail(409, 'SELF_ACTION', 'You cannot deactivate your own membership.')
    }
    membership.active = false
    return ok(null, 'Membership deactivated.')
  }),

  http.get(`${PREFIX}/organisations/:id/roles`, ({ request }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    return ok(db.organisationRoles)
  }),

  http.put(
    `${PREFIX}/organisations/:id/roles/:roleId/permissions/:permissionId`,
    ({ params }) => {
      const role = db.organisationRoles.find((r) => r.id === params.roleId)
      const permission = ALL_PERMISSIONS.find((p) => p.id === params.permissionId)
      if (!role || !permission) return fail(404, 'NOT_FOUND', 'We could not find that.')
      if (permission.code === 'TENANT_ACCESS_CROSS') {
        return fail(403, 'FORBIDDEN', 'Cross-tenant access is never granted by an organisation role.')
      }
      if (!role.permissions.includes(permission.code)) role.permissions.push(permission.code)
      return ok(role)
    },
  ),

  http.delete(
    `${PREFIX}/organisations/:id/roles/:roleId/permissions/:permissionId`,
    ({ params }) => {
      const role = db.organisationRoles.find((r) => r.id === params.roleId)
      const permission = ALL_PERMISSIONS.find((p) => p.id === params.permissionId)
      if (!role || !permission) return fail(404, 'NOT_FOUND', 'We could not find that.')
      role.permissions = role.permissions.filter((code) => code !== permission.code)
      return ok(role)
    },
  ),

  http.get(`${PREFIX}/organisation-registrations`, ({ request }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    const url = new URL(request.url)

    if (url.searchParams.get('reviewQueue') === 'true') {
      // Both authorities, not one.
      if (
        !user.permissions.includes('ORGANISATION_MANAGE') ||
        !user.permissions.includes('TENANT_ACCESS_CROSS')
      ) {
        return fail(403, 'FORBIDDEN', 'Reviewing registrations needs cross-tenant access.')
      }
      const rows = db.registrations
        .filter((r) => r.status === 'PENDING_APPROVAL' || !r.applicantVerified)
        .map(shapeRegistration)
      return ok({ content: rows, number: 0, size: 25, totalElements: rows.length, totalPages: 1 })
    }

    const mine = db.registrations.filter((r) => r.applicantEmail === user.email).map(shapeRegistration)
    return ok({ content: mine, number: 0, size: 25, totalElements: mine.length, totalPages: 1 })
  }),

  http.post(`${PREFIX}/organisation-registrations/:id/approve`, ({ request, params }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    if (!user.permissions.includes('TENANT_ACCESS_CROSS')) {
      return fail(403, 'FORBIDDEN', 'Reviewing registrations needs cross-tenant access.')
    }
    const registration = db.registrations.find((r) => r.id === params.id)
    if (!registration) return fail(404, 'NOT_FOUND', 'We could not find that.')
    if (registration.status !== 'PENDING_APPROVAL') {
      return fail(409, 'ALREADY_REVIEWED', 'That registration has already been reviewed.')
    }
    if (!registration.applicantVerified) {
      return fail(409, 'EMAIL_NOT_VERIFIED', 'The applicant has not verified their address.')
    }
    registration.status = 'APPROVED'
    return ok(null, 'Organisation created and the applicant made its administrator.')
  }),

  http.post(`${PREFIX}/organisation-registrations/:id/reject`, async ({ request, params }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    const { reason } = (await request.json()) as { reason?: string }
    if (!reason?.trim()) {
      return fail(400, 'VALIDATION_FAILED', 'One or more fields are invalid.', {
        validationErrors: [{ field: 'reason', message: 'Give a reason the applicant can read.' }],
      })
    }
    const registration = db.registrations.find((r) => r.id === params.id)
    if (!registration) return fail(404, 'NOT_FOUND', 'We could not find that.')
    if (registration.status !== 'PENDING_APPROVAL') {
      return fail(409, 'ALREADY_REVIEWED', 'That registration has already been reviewed.')
    }
    registration.status = 'REJECTED'
    return ok(null, 'Rejected.')
  }),

  http.get(`${PREFIX}/admin/visa-definitions/:id`, ({ request, params }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    if (!user.permissions.includes('VISA_CATALOGUE_MANAGE')) {
      return fail(403, 'FORBIDDEN', 'You do not have access to the catalogue.')
    }
    const version = db.visaVersions.find((v) => v.id === params.id)
    if (!version) return fail(404, 'NOT_FOUND', 'We could not find that version.')
    return ok(shapeDefinition(version))
  }),

  http.post(`${PREFIX}/admin/visa-definitions/:id/activate`, ({ request, params }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    const version = db.visaVersions.find((v) => v.id === params.id)
    if (!version) return fail(404, 'NOT_FOUND', 'We could not find that version.')
    if (version.state === 'ACTIVE') {
      return fail(409, 'ALREADY_ACTIVE', 'That version is already live.')
    }
    // Activating deactivates the active version of the same code.
    for (const other of db.visaVersions) {
      if (other.code === version.code && other.state === 'ACTIVE') other.state = 'INACTIVE'
    }
    version.state = 'ACTIVE'
    version.activatedAt = new Date().toISOString()
    return ok(shapeDefinition(version))
  }),

  /* ---------------------------- family ------------------------------ */

  http.post(`${PREFIX}/family-members`, async ({ request }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')

    const body = (await request.json()) as {
      relationship: string
      traveller: Record<string, string | null>
    }
    const t = body.traveller

    if (t.email && String(t.email).toLowerCase() === user.email.toLowerCase()) {
      return fail(400, 'VALIDATION_FAILED', 'One or more fields are invalid.', {
        validationErrors: [
          { field: 'email', message: 'Use their own address, not yours.' },
        ],
      })
    }

    const client = {
      id: nextId('cli'),
      ownerId: user.id,
      firstName: String(t.firstName),
      middleName: null,
      lastName: String(t.lastName),
      dateOfBirth: String(t.dateOfBirth),
      gender: t.gender as 'FEMALE' | 'MALE' | 'UNSPECIFIED',
      nationality: String(t.nationality),
      countryOfResidence: String(t.countryOfResidence),
      email: (t.email as string | null) || null,
      phoneNumber: null,
      // The creator manages the traveller whatever the nested value says.
      selfManaged: false,
    }
    db.clients.push(client)
    const record = {
      clientId: client.id,
      ownerId: user.id,
      relationship: body.relationship,
      consentGrantedAt: null,
      migratedAt: null,
      invitation: null,
    }
    db.family.push(record)
    return ok(
      {
        clientId: record.clientId,
        relationship: record.relationship,
        consentGrantedAt: record.consentGrantedAt,
        migratedAt: record.migratedAt,
      },
      'Traveller added.',
      201,
    )
  }),

  http.get(`${PREFIX}/family-members/:clientId`, ({ request, params }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    const record = db.family.find((f) => f.clientId === params.clientId && f.ownerId === user.id)
    // Only the current owner reads this; after migration they are not it.
    if (!record) return fail(404, 'NOT_FOUND', 'We could not find that.')
    return ok(record)
  }),

  http.post(`${PREFIX}/family-members/:clientId/invitations`, async ({ request, params }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    const record = db.family.find((f) => f.clientId === params.clientId && f.ownerId === user.id)
    const client = db.clients.find((c) => c.id === params.clientId)
    if (!record || !client) return fail(404, 'NOT_FOUND', 'We could not find that.')

    const age = Math.floor(
      (Date.now() - new Date(client.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    )
    if (age < 18) return fail(409, 'NOT_AN_ADULT', 'Only an adult traveller can be invited.')
    if (!client.email) {
      return fail(409, 'NO_EMAIL', "Add the traveller's own email address first.")
    }

    const { purpose } = (await request.json()) as { purpose: 'CONSENT' | 'MIGRATION' }
    const token = nextId(purpose === 'CONSENT' ? 'consent' : 'migrate')
    // A new invitation replaces the previous one — there is only ever one.
    record.invitation = {
      purpose,
      token,
      sentTo: client.email,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    }
    const path = purpose === 'CONSENT' ? 'family-consent' : 'family-migration'
    console.info(`[mock] ${purpose} link → /${path}?token=${token}`)
    // The raw token is never returned to the manager.
    return ok({ purpose, sentTo: client.email, expiresAt: record.invitation.expiresAt }, 'Sent.', 201)
  }),

  http.delete(`${PREFIX}/family-members/:clientId/invitations`, ({ request, params }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    const record = db.family.find((f) => f.clientId === params.clientId && f.ownerId === user.id)
    if (!record) return fail(404, 'NOT_FOUND', 'We could not find that.')
    record.invitation = null
    return ok(null, 'Invitation cancelled.')
  }),

  http.post(`${PREFIX}/auth/family-consent`, async ({ request }) => {
    const { token, granted } = (await request.json()) as { token: string; granted: boolean }
    const record = db.family.find((f) => f.invitation?.token === token)
    if (!record?.invitation || record.invitation.purpose !== 'CONSENT') {
      return fail(400, 'INVITATION_INVALID', 'This link is no longer valid.')
    }
    record.consentGrantedAt = granted ? new Date().toISOString() : null
    record.invitation = null // single use
    return ok(null, granted ? 'Consent recorded.' : 'Refusal recorded.')
  }),

  http.post(`${PREFIX}/family-members/accept-migration`, async ({ request }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    const { token } = (await request.json()) as { token: string }

    const record = db.family.find((f) => f.invitation?.token === token)
    if (!record?.invitation || record.invitation.purpose !== 'MIGRATION') {
      return fail(400, 'INVITATION_INVALID', 'This link is no longer valid.')
    }
    if (record.invitation.sentTo.toLowerCase() !== user.email.toLowerCase()) {
      return fail(403, 'EMAIL_MISMATCH', 'This invitation was sent to a different address.')
    }
    if (!user.emailVerified) {
      return fail(403, 'EMAIL_NOT_VERIFIED', 'Verify your email address first.')
    }

    // The client and the applications the manager owns move across; IDs and
    // document links are preserved. Other parties keep what they own.
    const client = db.clients.find((c) => c.id === record.clientId)
    if (client) {
      client.ownerId = user.id
      client.selfManaged = true
    }
    for (const application of db.applications) {
      if (application.clientId === record.clientId && application.ownerId === record.ownerId) {
        application.ownerId = user.id
      }
    }
    record.migratedAt = new Date().toISOString()
    record.ownerId = user.id
    record.invitation = null
    return ok(null, 'The record is yours.')
  }),

  /* ------------------------ internal processing --------------------- */

  http.get(`${PREFIX}/internal/officers`, ({ request }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    return ok(OFFICERS)
  }),

  http.get(`${PREFIX}/internal/applications`, ({ request }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    if (!user.permissions.includes('APPLICATION_READ_ALL')) {
      return fail(403, 'FORBIDDEN', 'You do not have access to the processing queue.')
    }

    const url = new URL(request.url)
    const get = (key: string) => url.searchParams.get(key) || undefined
    const page = Number(get('page') ?? 0)
    const size = Math.min(Number(get('size') ?? 20), 100)

    let rows = db.applications.map(shapeQueueRow)

    const status = get('status')
    if (status) rows = rows.filter((r) => r.status === status)
    const country = get('country')
    if (country) rows = rows.filter((r) => r.country === country)
    const visaType = get('visaType')
    if (visaType) rows = rows.filter((r) => r.visaType === visaType)
    const priority = get('priority')
    if (priority) rows = rows.filter((r) => r.priority === priority)
    const officer = get('officer')
    if (officer) {
      rows = rows.filter((r) => (officer === 'UNASSIGNED' ? !r.officerId : r.officerId === officer))
    }
    if (get('overdue') === 'true') {
      rows = rows.filter((r) => r.dueAt && new Date(r.dueAt).getTime() < Date.now())
    }
    const from = get('submittedFrom')
    if (from) rows = rows.filter((r) => (r.submittedAt ?? '') >= from)
    const to = get('submittedTo')
    // submittedTo is exclusive, as the endpoint documents.
    if (to) rows = rows.filter((r) => (r.submittedAt ?? '') < `${to}T23:59:59.999Z`)

    rows.sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))

    return ok({
      content: rows.slice(page * size, page * size + size),
      number: page,
      size,
      totalElements: rows.length,
      totalPages: Math.max(1, Math.ceil(rows.length / size)),
    })
  }),

  http.put(`${PREFIX}/internal/applications/:id/officer`, async ({ request, params }) => {
    const application = db.applications.find((a) => a.id === params.id)
    if (!application) return fail(404, 'NOT_FOUND', 'We could not find that.')
    const body = (await request.json()) as { userId: string }
    const officer = OFFICERS.find((o) => o.id === body.userId)
    if (!officer) return fail(400, 'VALIDATION_FAILED', 'That is not an active user.')
    application.officerId = officer.id
    return ok(shapeQueueRow(application))
  }),

  http.put(`${PREFIX}/internal/applications/:id/schedule`, async ({ request, params }) => {
    const application = db.applications.find((a) => a.id === params.id)
    if (!application) return fail(404, 'NOT_FOUND', 'We could not find that.')
    const body = (await request.json()) as { priority?: string; dueAt?: string | null }
    if (body.priority) application.priority = body.priority
    application.dueAt = body.dueAt ?? null
    return ok(shapeQueueRow(application))
  }),

  http.get(`${PREFIX}/internal/applications/:id/notes`, ({ params }) => {
    const notes = db.notes.filter((n) => n.applicationId === params.id)
    return ok({
      content: [...notes].reverse().map((n) => ({ note: n.note })),
      number: 0,
      size: 20,
      totalElements: notes.length,
      totalPages: 1,
    })
  }),

  http.post(`${PREFIX}/internal/applications/:id/notes`, async ({ request, params }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    const body = (await request.json()) as { note?: string; body?: string }
    if (!body.note?.trim()) {
      return fail(400, 'VALIDATION_FAILED', 'One or more fields are invalid', {
        validationErrors: [{ field: 'note', code: 'NotBlank', message: 'Invalid value' }],
      })
    }
    const note = {
      id: nextId('note'),
      applicationId: params.id as string,
      author: `${user.firstName} ${user.lastName}`,
      createdAt: new Date().toISOString(),
      note: body.note ?? body.body ?? '',
    }
    db.notes.push(note)
    // The contract returns only the text.
    return ok({ note: note.note }, 'Note added.', 201)
  }),

  http.get(`${PREFIX}/internal/applications/:id/checklist`, ({ params }) => {
    const existing = db.checklist.filter((c) => c.applicationId === params.id)
    if (existing.length > 0) {
      return ok(existing.map((c) => ({ code: c.code, label: c.label, completed: c.completed })))
    }
    // The queue seeds a standard list the first time a case is opened.
    const seeded = DEFAULT_CHECKLIST.map((item) => ({
      applicationId: params.id as string,
      ...item,
      completed: false,
      completedBy: null as string | null,
      completedAt: null as string | null,
    }))
    db.checklist.push(...seeded)
    return ok(seeded.map((c) => ({ code: c.code, label: c.label, completed: c.completed })))
  }),

  http.put(`${PREFIX}/internal/applications/:id/checklist`, async ({ request, params }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    const body = (await request.json()) as { code: string; label?: string; completed: boolean }
    if (!body.label?.trim()) {
      return fail(400, 'VALIDATION_FAILED', 'One or more fields are invalid', {
        validationErrors: [{ field: 'label', code: 'NotBlank', message: 'Invalid value' }],
      })
    }
    let item = db.checklist.find((c) => c.applicationId === params.id && c.code === body.code)
    if (!item) {
      item = {
        applicationId: params.id as string,
        code: body.code,
        // An existing label is retained; only a new item takes one.
        label: body.label ?? body.code,
        completed: false,
        completedBy: null,
        completedAt: null,
      }
      db.checklist.push(item)
    }
    item.completed = body.completed
    item.completedBy = body.completed ? `${user.firstName} ${user.lastName}` : null
    item.completedAt = body.completed ? new Date().toISOString() : null
    return ok({ code: item.code, label: item.label, completed: item.completed })
  }),

  http.post(
    `${PREFIX}/internal/applications/:id/information-requests`,
    async ({ request, params }) => {
      const user = requireUser(request)
      if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
      const application = db.applications.find((a) => a.id === params.id)
      if (!application) return fail(404, 'NOT_FOUND', 'We could not find that.')

      const body = (await request.json()) as { message: string; dueAt?: string }
      if (!body.message?.trim()) {
        return fail(400, 'VALIDATION_FAILED', 'One or more fields are invalid.', {
          validationErrors: [{ field: 'message', message: 'Say what you need.' }],
        })
      }

      const created = {
        id: nextId('ir'),
        applicationId: application.id,
        message: body.message,
        dueAt: body.dueAt ?? null,
        createdAt: new Date().toISOString(),
        resolvedAt: null as string | null,
      }
      db.informationRequests.push(created)

      // Also moves the case, when the workflow permits it.
      if (['IN_PROGRESS', 'UNDER_REVIEW', 'INITIAL_DOCUMENTS_SUBMITTED'].includes(application.status)) {
        const previousStatus = application.status
        application.status = 'AWAITING_ADDITIONAL_INFORMATION'
        application.timeline.push({
          id: nextId('tl'),
          previousStatus,
          status: application.status,
          actorUserId: user.id,
          timestamp: created.createdAt,
          reason: null,
        })
      }
      return ok(created, 'Request sent.', 201)
    },
  ),

  http.get(`${PREFIX}/applications/:id/information-requests`, ({ request, params }) => {
    const application = ownedApplication(request, params.id as string)
    if (!application) return fail(404, 'NOT_FOUND', 'We could not find that.')
    const rows = db.informationRequests
      .filter((r) => r.applicationId === application.id)
      .map((r) => ({ ...r, status: r.resolvedAt ? 'CLOSED' : 'OPEN' }))
    // A Spring page, as the real endpoint serialises it.
    return ok({
      content: [...rows].reverse(),
      number: 0,
      size: 20,
      totalElements: rows.length,
      totalPages: 1,
    })
  }),

  http.post(`${PREFIX}/applications/:id/status`, async ({ request, params }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    const application = db.applications.find((a) => a.id === params.id)
    if (!application) return fail(404, 'NOT_FOUND', 'We could not find that.')

    const body = (await request.json()) as { status: string; reason?: string }
    // Arbitrary jumps are rejected; the policy lives server-side.
    if (!(ALLOWED_TRANSITIONS[application.status] ?? []).includes(body.status)) {
      return fail(
        409,
        'TRANSITION_NOT_ALLOWED',
        `${application.status} cannot move to ${body.status}.`,
      )
    }

    const previousStatus = application.status
    application.status = body.status
    application.updatedAt = new Date().toISOString()
    application.timeline.push({
      id: nextId('tl'),
      previousStatus: previousStatus,
      status: body.status,
      actorUserId: user.id,
      timestamp: application.updatedAt,
      reason: body.reason ?? null,
    })
    return ok(shapeApplication(application))
  }),

  /* ----------------------------- documents -------------------------- */

  http.post(`${PREFIX}/applications/:id/documents`, async ({ request, params }) => {
    const application = ownedApplication(request, params.id as string)
    if (!application) return fail(404, 'NOT_FOUND', 'We could not find that.')

    const url = new URL(request.url)
    const categoryCode = url.searchParams.get('categoryCode') ?? 'OTHER'
    const form = await request.formData()
    const file = form.get('file')

    if (!(file instanceof File) || file.size === 0) {
      return fail(400, 'VALIDATION_FAILED', 'One or more fields are invalid.', {
        validationErrors: [{ field: 'file', message: 'Attach a file.' }],
      })
    }
    if (file.size > 10 * 1024 * 1024) {
      return fail(413, 'FILE_TOO_LARGE', 'That file is larger than the 10 MB limit.')
    }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      return fail(415, 'UNSUPPORTED_TYPE', 'Upload a PDF, JPEG or PNG.')
    }

    // A replacement is a new version, never an overwrite.
    const previous = db.documents.filter(
      (d) => d.applicationId === application.id && d.categoryCode === categoryCode,
    )
    const version = {
      id: nextId('ver'),
      versionId: nextId('ver'),
      documentId: previous[0]?.documentId ?? nextId('doc'),
      applicationId: application.id,
      clientId: null as string | null,
      categoryCode,
      originalFilename: file.name,
      filename: file.name,
      contentType: file.type,
      size: file.size,
      sizeBytes: file.size,
      current: true,
      checksum: null as string | null,
      versionNumber: previous.length + 1,
      version: previous.length + 1,
      issueDate: url.searchParams.get('issueDate'),
      expiryDate: url.searchParams.get('expiryDate'),
      uploadedAt: new Date().toISOString(),
    }
    db.documents.push(version)
    return ok(version, 'Uploaded.', 201)
  }),

  http.post(`${PREFIX}/clients/:clientId/documents`, async ({ request, params }) => {
    const user = requireUser(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Your session has ended.')
    const client = db.clients.find((c) => c.id === params.clientId && c.ownerId === user.id)
    if (!client) return fail(404, 'NOT_FOUND', 'We could not find that traveller.')

    const url = new URL(request.url)
    const categoryCode = url.searchParams.get('categoryCode') ?? 'OTHER'
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return fail(400, 'VALIDATION_FAILED', 'Attach a file.')
    }

    const previous = db.documents.filter(
      (d) => d.clientId === client.id && d.categoryCode === categoryCode,
    )
    const version = {
      id: nextId('ver'),
      versionId: nextId('ver'),
      documentId: previous[0]?.documentId ?? nextId('doc'),
      applicationId: null as string | null,
      clientId: client.id,
      categoryCode,
      originalFilename: file.name,
      filename: file.name,
      contentType: file.type,
      size: file.size,
      sizeBytes: file.size,
      current: true,
      checksum: null as string | null,
      versionNumber: previous.length + 1,
      version: previous.length + 1,
      issueDate: url.searchParams.get('issueDate'),
      expiryDate: url.searchParams.get('expiryDate'),
      uploadedAt: new Date().toISOString(),
    }
    db.documents.push(version)
    return ok(version, 'Uploaded.', 201)
  }),

  /** Pins an exact reusable version to an application. No body. */
  http.post(`${PREFIX}/applications/:id/documents/:versionId/attach`, ({ request, params }) => {
    const application = ownedApplication(request, params.id as string)
    if (!application) return fail(404, 'NOT_FOUND', 'We could not find that.')
    const version = db.documents.find((d) => d.versionId === params.versionId)
    if (!version) return fail(404, 'NOT_FOUND', 'We could not find that document version.')
    db.documents.push({ ...version, versionId: nextId('ver'), applicationId: application.id })
    return ok(version, 'Attached.')
  }),

  /* ---------------------------- timeline ---------------------------- */

  http.get(`${PREFIX}/applications/:id/timeline`, ({ request, params }) => {
    const application = ownedApplication(request, params.id as string)
    if (!application) return fail(404, 'NOT_FOUND', 'We could not find that.')
    // Recorded history, newest first — never derived from the current status.
    return ok([...application.timeline].reverse())
  }),

  http.post(`${PREFIX}/applications/:id/submit-initial`, ({ request, params }) => {
    const user = requireUser(request)
    const application = ownedApplication(request, params.id as string)
    if (!application) return fail(404, 'NOT_FOUND', 'We could not find that.')

    // One approved stage per call. Completeness is deliberately not checked
    // here, mirroring the backend: the frontend is what warns the applicant.
    const next: Record<string, string> = {
      DRAFT: 'INITIAL_INFORMATION_SUBMITTED',
      INITIAL_INFORMATION_SUBMITTED: 'INITIAL_DOCUMENTS_SUBMITTED',
    }
    const advanced = next[application.status]
    if (!advanced) {
      return fail(409, 'TRANSITION_NOT_ALLOWED', 'This application has already been submitted.')
    }

    application.status = advanced
    application.updatedAt = new Date().toISOString()
    application.timeline.push({
      id: nextId('tl'),
      previousStatus: application.timeline.at(-1)?.status ?? null,
      status: advanced,
      actorUserId: user?.id ?? null,
      timestamp: application.updatedAt,
      reason: null,
    })
    return ok(shapeApplication(application), 'Submitted.')
  }),
]

function shapeAdminUser(user: (typeof db.users)[number]) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status,
    emailVerified: user.emailVerified,
  }
}

function shapeManagedUser(user: (typeof db.users)[number]) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber ?? null,
    status: user.status,
    emailVerifiedAt: user.emailVerified ? (user.createdAt ?? null) : null,
    mfaEnabled: false,
    roles: user.roles ?? [],
  }
}

const ALL_PERMISSIONS = [
  ['CLIENT_CREATE', 'Add traveller records'],
  ['CLIENT_READ', 'See traveller records'],
  ['CLIENT_UPDATE', 'Correct traveller details'],
  ['CLIENT_MANAGE_ALL', 'Manage staff-owned traveller records'],
  ['APPLICATION_CREATE', 'Start applications'],
  ['APPLICATION_READ_OWN', 'Read their own applications'],
  ['APPLICATION_READ_ALL', 'Open the processing queue'],
  ['APPLICATION_UPDATE', 'Priority, due dates and notes'],
  ['APPLICATION_ASSIGN', 'Assign officers'],
  ['APPLICATION_REVIEW', 'Act as a reviewer'],
  ['APPLICATION_CHANGE_STATUS', 'Move a case between states'],
  ['APPLICATION_REQUEST_INFORMATION', 'Ask applicants for more'],
  ['APPLICATION_NOTE_INTERNAL', 'Read and write staff notes'],
  ['APPLICATION_CHECKLIST_UPDATE', 'Tick checklist items'],
  ['DOCUMENT_UPLOAD', 'Upload documents'],
  ['DOCUMENT_READ_OWN', 'Download their own documents'],
  ['DOCUMENT_READ_ALL', 'Download any document in scope'],
  ['VISA_CATALOGUE_MANAGE', 'Write and activate offerings'],
  ['USER_READ', 'List and open accounts'],
  ['USER_CREATE', 'Create accounts'],
  ['USER_UPDATE', 'Edit account profiles'],
  ['USER_DISABLE', 'Suspend or disable accounts'],
  ['ROLE_CREATE', 'Create global roles'],
  ['ROLE_UPDATE', 'Edit global roles'],
  ['PERMISSION_ASSIGN', 'Grant roles and permissions'],
  ['ORGANISATION_MANAGE', 'Provision and review organisations'],
  ['TENANT_ACCESS_CROSS', 'Read and act across every organisation'],
].map(([code, name], index) => ({
  id: `perm_${index}`,
  code,
  name,
  description: null as string | null,
}))

const OFFICERS = [
  { id: 'usr_kene', name: 'Kene Nwosu' },
  { id: 'usr_ife', name: 'Ife Adeyemi' },
  { id: 'usr_ada', name: 'Ada Okafor' },
]

const DEFAULT_CHECKLIST = [
  { code: 'PASSPORT_VALID', label: 'Passport valid for the whole stay' },
  { code: 'PHOTO_SPEC', label: 'Photograph meets the spec' },
  { code: 'FUNDS_COVER', label: 'Funds cover the stated trip' },
  { code: 'HISTORY_EXPLAINED', label: 'Travel history explained' },
]

/** What the backend's transition policy allows, mirrored for the fixture. */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  INITIAL_DOCUMENTS_SUBMITTED: ['IN_PROGRESS', 'CORRECTION_REQUIRED', 'CANCELLED'],
  IN_PROGRESS: ['UNDER_REVIEW', 'AWAITING_ADDITIONAL_INFORMATION', 'CORRECTION_REQUIRED', 'CANCELLED'],
  UNDER_REVIEW: ['READY_FOR_SUBMISSION', 'CORRECTION_REQUIRED', 'REJECTED'],
  AWAITING_ADDITIONAL_INFORMATION: ['IN_PROGRESS', 'CANCELLED'],
  CORRECTION_REQUIRED: ['IN_PROGRESS'],
  READY_FOR_SUBMISSION: ['SUBMITTED_TO_AUTHORITY'],
  SUBMITTED_TO_AUTHORITY: ['DECISION_RECEIVED'],
  DECISION_RECEIVED: ['APPROVED', 'REJECTED'],
  APPROVED: ['COMPLETED'],
}

const MOCK_ORGANISATION = {
  id: 'org_ada_travel',
  code: 'ADA_TRAVEL',
  name: 'Ada Travel',
  status: 'ACTIVE',
}

function shapeRegistration(registration: (typeof db.registrations)[number]) {
  return {
    id: registration.id,
    code: registration.code,
    name: registration.name,
    applicantId: registration.applicantId,
    status: registration.status,
    organisationId: registration.status === 'APPROVED' ? MOCK_ORGANISATION.id : null,
    reviewedBy: null,
    reviewedAt: null,
    reviewReason: null,
  }
}

/** `VisaDefinitionResponse`, with counts stood in for by empty lists. */
function shapeDefinition(version: (typeof db.visaVersions)[number]) {
  return {
    id: version.id,
    destinationCountry: version.code.slice(0, 2),
    code: version.code,
    name: version.name,
    visaCategory: 'Visitor',
    description: null,
    version: version.version,
    active: version.state === 'ACTIVE',
    requirements: [],
    questions: [],
  }
}

function shapeQueueRow(application: (typeof db.applications)[number]) {
  const definition = mockCatalogue.find((o) => o.id === application.visaDefinitionId)!
  return {
    id: application.id,
    reference: application.reference,
    status: application.status,
    country: definition.destinationCountry,
    visaType: definition.visaCategory,
    officerId: application.officerId,
    reviewerId: null,
    organisationId: MOCK_ORGANISATION.id,
    priority: application.priority,
    dueAt: application.dueAt,
    submittedAt: application.createdAt,
  }
}

function ownedApplication(request: Request, id: string) {
  const user = requireUser(request)
  if (!user) return null
  return db.applications.find((a) => a.id === id && a.ownerId === user.id) ?? null
}

function shapeApplication(application: (typeof db.applications)[number]) {
  const definition = mockCatalogue.find((o) => o.id === application.visaDefinitionId)!
  return {
    id: application.id,
    reference: application.reference,
    clientId: application.clientId,
    visaDefinitionId: definition.id,
    visaCode: definition.code,
    // The catalogue version, kept distinct from the record's own lock counter.
    visaDefinitionVersion: definition.version,
    ownerUserId: application.ownerId,
    assignedToUserId: application.officerId,
    managingOrganisationId: MOCK_ORGANISATION.id,
    status: application.status,
    applicantNotes: application.applicantNotes,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    version: 0,
  }
}
