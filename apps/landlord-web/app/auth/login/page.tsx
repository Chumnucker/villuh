import { LoginForm, safeCallbackPath } from "@villuh/auth"

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams
  const callbackURL = safeCallbackPath(next) ?? undefined

  return <LoginForm callbackURL={callbackURL} />
}
