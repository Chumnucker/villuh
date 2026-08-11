import { UserProvider } from "@/modules/app/providers/me-provider"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <UserProvider>{children}</UserProvider>
}
