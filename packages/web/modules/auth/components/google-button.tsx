"use client"

import { useState } from "react"
import { Button } from "@/modules/common/ui/button"
import { PlatformIcon } from "@/modules/common/ui/icon"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"

export function GoogleButton({ callbackURL = "/" }: { callbackURL?: string }) {
  const [loading, setLoading] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        try {
          await authClient.signIn.social({ provider: "google", callbackURL })
        } catch {
          toast.error("Something went wrong. Please try again.")
          setLoading(false)
        }
      }}
    >
      <PlatformIcon icon="IconGoogle" size={18} strokeWidth={2} />
      Continue with Google
    </Button>
  )
}
