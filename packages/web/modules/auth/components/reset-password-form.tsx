"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button, LinkButton } from "@/modules/common/ui/button"
import { PasswordInput } from "@/modules/common/ui/input"
import { Field, FieldLabel, FieldError } from "@/modules/common/ui/field"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import { AuthCard } from "./auth-card"

export function ResetPasswordForm() {
  const params = useSearchParams()
  const token = params.get("token") ?? ""
  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [mismatch, setMismatch] = useState(false)
  const [done, setDone] = useState(false)
  const [expired, setExpired] = useState(false)
  const [loading, setLoading] = useState(false)

  if (done) {
    return (
      <AuthCard
        title="Password updated"
        description="You can now sign in with your new password."
      >
        <LinkButton href="/login" variant="default" className="w-full">
          Sign in
        </LinkButton>
      </AuthCard>
    )
  }

  if (expired) {
    return (
      <AuthCard
        title="Link expired"
        description="This reset link has expired or already been used."
      >
        <LinkButton href="/forgot-password" variant="link">
          Request a new one
        </LinkButton>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Set a new password">
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          if (newPassword !== confirm) {
            setMismatch(true)
            return
          }
          setMismatch(false)
          setLoading(true)
          const { error } = await authClient.resetPassword({ newPassword, token })
          setLoading(false)
          if (error) {
            const msg = (error.message ?? "").toLowerCase()
            if (msg.includes("expired") || msg.includes("invalid")) {
              setExpired(true)
              return
            }
            toast.error("Something went wrong. Please try again.")
            return
          }
          setDone(true)
        }}
      >
        <Field>
          <FieldLabel>New password</FieldLabel>
          <PasswordInput
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </Field>
        <Field>
          <FieldLabel>Confirm password</FieldLabel>
          <PasswordInput
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            aria-invalid={mismatch || undefined}
          />
          {mismatch && <FieldError>Passwords do not match</FieldError>}
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          Set new password
        </Button>
      </form>
    </AuthCard>
  )
}
