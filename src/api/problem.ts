import type { ValidationError } from './envelope'

/**
 * A failed request, normalised. Program logic branches on `status` and `code`;
 * `message` is the only part ever shown to a person.
 */
export class ApiProblem extends Error {
  readonly status: number
  readonly code: string
  readonly validationErrors: ValidationError[]
  readonly traceId?: string
  /** The request path, kept so a 404 can say what was missing. */
  readonly path?: string

  constructor(init: {
    status: number
    code: string
    message: string
    validationErrors?: ValidationError[] | null
    traceId?: string | null
    path?: string | null
  }) {
    super(init.message)
    this.name = 'ApiProblem'
    this.status = init.status
    this.code = init.code
    this.validationErrors = init.validationErrors ?? []
    this.traceId = init.traceId ?? undefined
    this.path = init.path ?? undefined
  }

  get isValidation() {
    return this.status === 400 && this.validationErrors.length > 0
  }
  get isUnauthorized() {
    return this.status === 401
  }
  get isForbidden() {
    return this.status === 403
  }
  get isNotFound() {
    return this.status === 404
  }
  get isConflict() {
    return this.status === 409
  }
  get isTooLarge() {
    return this.status === 413
  }
}

/** The network never answered at all. */
export class NetworkProblem extends Error {
  constructor(cause?: unknown) {
    super('We could not reach MyVisApp. Check your connection and try again.')
    this.name = 'NetworkProblem'
    this.cause = cause
  }
}

/**
 * One place that decides what a person reads for a given status, so no screen
 * invents its own wording. Screens may still override for their own context.
 */
export function humanMessage(error: unknown): string {
  if (error instanceof NetworkProblem) return error.message
  if (!(error instanceof ApiProblem)) {
    return 'Something went wrong. Please try again.'
  }
  switch (error.status) {
    case 403:
      return 'You do not have access to this.'
    case 404:
      // In development, name it: a bare "not found" sends people hunting
      // through the UI for a problem that lives in one request.
      return import.meta.env.DEV && error.path
        ? `We could not find that. (404 ${error.path})`
        : 'We could not find that.'
    case 409:
      return 'Someone changed this while you were working. We have reloaded it.'
    case 413:
      return 'That file is too large. The limit is 10 MB.'
    case 500:
    case 502:
    case 503:
      return error.traceId
        ? `Something broke at our end. If you contact support, quote ${error.traceId}.`
        : 'Something broke at our end. Try again in a moment.'
    default:
      return error.message
  }
}
