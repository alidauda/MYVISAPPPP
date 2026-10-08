import type { z } from 'zod'
import { apiSuccess } from './envelope'
import { ApiProblem } from './problem'
import { http } from './http'

export { setSessionEndedHandler } from './http'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type RequestOptions<T extends z.ZodTypeAny> = {
  method?: Method
  /** JSON body. Multipart uploads use `requestMultipart` instead. */
  body?: unknown
  /** Shape of `data` inside the success envelope. */
  schema: T
  /** Send the access token. Public auth endpoints pass false. */
  auth?: boolean
  signal?: AbortSignal
}

/** The envelope is validated here so no caller ever handles a raw response. */
function unwrap<T extends z.ZodTypeAny>(payload: unknown, schema: T, status: number): z.infer<T> {
  const parsed = apiSuccess(schema).safeParse(payload)
  if (!parsed.success) {
    // The screen only says something went wrong; the developer needs to know
    // which field the backend disagreed on. Paths and messages, never values.
    if (import.meta.env.DEV) {
      console.warn(
        '[api] response did not match its schema',
        parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      )
    }
    throw new ApiProblem({
      status,
      code: 'UNEXPECTED_RESPONSE',
      message: 'Something went wrong. Please try again.',
    })
  }
  return parsed.data.data
}

export async function request<T extends z.ZodTypeAny>(
  path: string,
  options: RequestOptions<T>,
): Promise<z.infer<T>> {
  const { method = 'GET', body, schema, auth = true, signal } = options

  const response = await http.request({
    url: path,
    method,
    data: body,
    signal,
    skipAuth: !auth,
  })

  if (response.status === 204) return undefined as z.infer<T>
  return unwrap(response.data, schema, response.status)
}

/**
 * Multipart upload. We never set Content-Type ourselves — axios lets the
 * runtime generate the boundary, and setting the header by hand omits it.
 */
export async function requestMultipart<T extends z.ZodTypeAny>(
  path: string,
  form: FormData,
  schema: T,
  onProgress?: (percent: number) => void,
): Promise<z.infer<T>> {
  const response = await http.post(path, form, {
    onUploadProgress(event) {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    },
  })
  return unwrap(response.data, schema, response.status)
}

/** Binary download. Returns the blob and the filename the server chose. */
export async function requestBlob(path: string): Promise<{ blob: Blob; filename: string }> {
  const response = await http.get<Blob>(path, { responseType: 'blob' })

  const disposition = String(response.headers['content-disposition'] ?? '')
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
  return {
    blob: response.data,
    filename: match ? decodeURIComponent(match[1]) : 'document',
  }
}
