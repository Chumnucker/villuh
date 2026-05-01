import { Suspense } from "react"
import { ResetPasswordForm } from "@/modules/auth/components/reset-password-form"

export const metadata = { title: "Reset password — Villuh" }

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
