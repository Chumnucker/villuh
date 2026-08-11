import { UserProvider } from "@/modules/app/providers/me-provider"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <UserProvider>{children}</UserProvider>
}
