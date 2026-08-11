"use client"

import { useState } from "react"
import { Button, LinkButton } from "@villuh/ui/button"
import { Input } from "@villuh/ui/input"
import { Field, FieldLabel } from "@villuh/ui/field"
import { authClient } from "../client"
import { ROUTES } from "../routes"
import { toast } from "sonner"
import { AuthCard } from "./auth-card"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  if (submitted) {
    return (
      <AuthCard
        title="Reset link sent"
        description={`Check your inbox at ${email}. The link expires in 1 hour.`}
      >
        <LinkButton href={ROUTES.auth.login} variant="link">← Back to sign in</LinkButton>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your email and we'll send you a reset link."
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setLoading(true)
          const { error } = await authClient.requestPasswordReset({
            email,
            redirectTo: `${window.location.origin}${ROUTES.auth.resetPassword}`,
          })
          setLoading(false)
          if (error) {
            toast.error("Something went wrong. Please try again.")
            return
          }
          setSubmitted(true)
        }}
      >
        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          Send reset link
        </Button>
      </form>
    </AuthCard>
  )
}
