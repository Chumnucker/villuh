export { authClient } from "./client"
export type { Session } from "./client"

export { auth } from "./server"
export type { Session as ServerSession } from "./server"

export { useSession } from "./hooks/use-session"
export { ROUTES as AUTH_ROUTES, ROUTES } from "./routes"

export { AuthCard } from "./components/auth-card"
export { LoginForm } from "./components/login-form"
export { RegisterForm } from "./components/register-form"
export { ForgotPasswordForm } from "./components/forgot-password-form"
export { ResetPasswordForm } from "./components/reset-password-form"
export { GoogleButton } from "./components/google-button"
