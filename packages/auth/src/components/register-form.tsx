"use client"

import { useState } from "react"
import { Button, LinkButton } from "@villuh/ui/button"
import { Input, PasswordInput } from "@villuh/ui/input"
import { Field, FieldLabel } from "@villuh/ui/field"
import { authClient } from "../client"
import { ROUTES } from "../routes"
import { toast } from "sonner"
import { GoogleButton } from "./google-button"
import { AuthCard } from "./auth-card"

export function RegisterForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  if (submitted) {
    return (
      <AuthCard
        title="Check your email"
        description={`We sent a verification link to ${email}. Click it to activate your account.`}
      >
        <p className="text-sm text-muted-foreground">
          Didn&apos;t get it? Check your spam folder, or{" "}
          <LinkButton href={ROUTES.auth.register} variant="link">try again</LinkButton>.
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Create your account"
      description="30 days free. No credit card required."
      footer={
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <LinkButton href={ROUTES.auth.login} variant="link">Sign in</LinkButton>
        </p>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setLoading(true)
          const { error } = await authClient.signUp.email({ email, password, name })
          setLoading(false)
          if (error) {
            if (error.message?.toLowerCase().includes("already")) {
              toast.error("An account with this email already exists.")
            } else {
              toast.error("Something went wrong. Please try again.")
            }
            return
          }
          setSubmitted(true)
        }}
      >
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </Field>
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
        <Field>
          <FieldLabel>Password</FieldLabel>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          Create account
        </Button>
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>
        <GoogleButton callbackURL="/onboarding" />
      </form>
    </AuthCard>
  )
}
