import { requestBlob, request, requestMultipart } from '@/api/client'
import { documentVersionSchema } from '../lib/schemas'

function form(file: File, categoryCode: string, dates: { issueDate?: string; expiryDate?: string }) {
  const body = new FormData()
  body.append('file', file)
  body.append('categoryCode', categoryCode)
  if (dates.issueDate) body.append('issueDate', dates.issueDate)
  if (dates.expiryDate) body.append('expiryDate', dates.expiryDate)
  return body
}

export const documentsApi = {
  /** Reusable across every application for this traveller. */
  uploadForTraveller: (
    clientId: string,
    file: File,
    categoryCode: string,
    dates: { issueDate?: string; expiryDate?: string } = {},
    onProgress?: (percent: number) => void,
  ) =>
    requestMultipart(
      `/clients/${clientId}/documents?categoryCode=${encodeURIComponent(categoryCode)}`,
      form(file, categoryCode, dates),
      documentVersionSchema,
      onProgress,
    ),

  /** Specific to one application — bank statements, bookings. */
  uploadForApplication: (
    applicationId: string,
    file: File,
    categoryCode: string,
    dates: { issueDate?: string; expiryDate?: string } = {},
    onProgress?: (percent: number) => void,
  ) =>
    requestMultipart(
      `/applications/${applicationId}/documents?categoryCode=${encodeURIComponent(categoryCode)}`,
      form(file, categoryCode, dates),
      documentVersionSchema,
      onProgress,
    ),

  /**
   * Pins an exact reusable version to an application, so a future passport
   * replacement cannot alter an application already under review.
   */
  attach: (applicationId: string, versionId: string) =>
    request(`/applications/${applicationId}/documents/${versionId}/attach`, {
      method: 'POST',
      schema: documentVersionSchema,
    }),

  /** Returns bytes, not the envelope. The filename comes from the server. */
  download: (applicationId: string, versionId: string) =>
    requestBlob(`/applications/${applicationId}/documents/${versionId}`),
}
