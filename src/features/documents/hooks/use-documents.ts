import { useCallback, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { humanMessage } from '@/api/problem'
import { documentsApi } from '../api/documents-api'
import { rejectReason, type DocumentVersion } from '../lib/schemas'

export type UploadState = {
  categoryCode: string
  filename: string
  percent: number
  error?: string
}

/**
 * Uploads for one application, with per-file progress.
 *
 * The backend exposes no endpoint for *listing* an application's documents,
 * so what was uploaded this session is held here. A reload cannot show
 * documents the server will not enumerate — a gap worth closing backend-side
 * before this ships.
 */
export function useApplicationDocuments(applicationId: string) {
  const queryClient = useQueryClient()
  const [uploads, setUploads] = useState<Record<string, UploadState>>({})
  const [attached, setAttached] = useState<DocumentVersion[]>([])

  const upload = useMutation({
    mutationFn: ({ file, categoryCode }: { file: File; categoryCode: string }) =>
      documentsApi.uploadForApplication(applicationId, file, categoryCode, {}, (percent) =>
        setUploads((current) => ({
          ...current,
          [categoryCode]: { ...current[categoryCode], percent },
        })),
      ),
  })

  const start = useCallback(
    async (file: File, categoryCode: string) => {
      const reason = rejectReason(file)
      if (reason) {
        setUploads((c) => ({ ...c, [categoryCode]: { categoryCode, filename: file.name, percent: 0, error: reason } }))
        return
      }

      setUploads((c) => ({ ...c, [categoryCode]: { categoryCode, filename: file.name, percent: 0 } }))
      try {
        const version = await upload.mutateAsync({ file, categoryCode })
        setAttached((current) => [...current.filter((v) => v.categoryCode !== categoryCode), version])
        setUploads((c) => ({ ...c, [categoryCode]: { ...c[categoryCode], percent: 100 } }))
        void queryClient.invalidateQueries({ queryKey: ['application', null, applicationId] })
      } catch (error) {
        setUploads((c) => ({
          ...c,
          [categoryCode]: { ...c[categoryCode], error: humanMessage(error) },
        }))
      }
    },
    [applicationId, queryClient, upload],
  )

  return { uploads, attached, start, isUploading: upload.isPending }
}
