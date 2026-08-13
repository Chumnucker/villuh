"use client"

import { useCallback, useRef, useState } from "react"
import { uploadPresignedPut } from "./uploads"

/**
 * Stateful wrapper around {@link uploadPresignedPut} for single-file UIs
 * that want progress + in-flight tracking. Multi-file flows can call the
 * util directly and manage their own pending list.
 *
 * Import from `@villuh/ui/utils/use-presigned-upload` (not the utils barrel)
 * so server components can still import pure utils like `cn` / `formatAddress`.
 */
export function usePresignedUpload() {
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const upload = useCallback(
    async (
      uploadUrl: string,
      file: Blob,
      contentType: string
    ): Promise<void> => {
      abort()
      const controller = new AbortController()
      abortRef.current = controller
      setIsUploading(true)
      setProgress(0)
      try {
        await uploadPresignedPut(uploadUrl, file, {
          contentType,
          signal: controller.signal,
          onProgress: setProgress,
        })
      } finally {
        if (abortRef.current === controller) abortRef.current = null
        setIsUploading(false)
      }
    },
    [abort]
  )

  return { upload, progress, isUploading, abort }
}
