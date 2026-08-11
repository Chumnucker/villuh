import { ProfileSettingsForm } from "@/modules/app/components/settings/profile-settings-form"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your account profile.
        </p>
      </div>
      <ProfileSettingsForm />
    </div>
  )
}
