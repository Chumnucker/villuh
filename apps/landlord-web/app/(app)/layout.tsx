import { UserProvider } from "@/modules/app/providers/me-provider"
import { LayoutTemplate } from "@/modules/app/templates/layout-template"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <LayoutTemplate>{children}</LayoutTemplate>
    </UserProvider>
  )
}
