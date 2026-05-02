"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button, LinkButton } from "@/modules/common/ui/button"
import { Input, PasswordInput } from "@/modules/common/ui/input"
import { Field, FieldLabel } from "@/modules/common/ui/field"
import { authClient } from "@/lib/auth-client"
import { ROUTES } from "@/app/routes"
import { toast } from "sonner"
import { GoogleButton } from "./google-button"
import { AuthCard } from "./auth-card"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  return (
    <AuthCard
      title="Welcome back"
      footer={
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <LinkButton href={ROUTES.auth.register} variant="link">Sign up</LinkButton>
        </p>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setLoading(true)
          const { error } = await authClient.signIn.email({ email, password })
          setLoading(false)
          if (error) {
            toast.error("Incorrect email or password. Please try again.")
            return
          }
          router.push(ROUTES.home)
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
        <Field>
          <FieldLabel>Password</FieldLabel>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <div className="flex justify-end">
            <LinkButton
              href={ROUTES.auth.forgotPassword}
              variant="link"
              className="h-auto px-0 text-xs"
            >
              Forgot password?
            </LinkButton>
          </div>
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          Sign in
        </Button>
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>
        <GoogleButton callbackURL="/" />
      </form>
    </AuthCard>
  )
}
