"use client"

import { EmptyState, Page } from "@villuh/ui"
import { SettingsSection } from "@/modules/properties/components/settings/section"

/**
 * Placeholder for per-property team access. Membership is organization-wide
 * today (roles live on the Better Auth `member` row, with no property scoping),
 * so there is nothing property-specific to list yet.
 */
export function PropertySettingsTeamTemplate() {
  return (
    <Page.Content className="gap-10">
      <SettingsSection
        title="Property access"
        icon="IconTeam"
        description="Who can see and manage this property, and what each of them is allowed to do."
        className="grid-cols-1 sm:grid-cols-1"
      >
        <EmptyState
          icon="IconTeam"
          title="Per-property access coming soon"
          description="Everyone in your organization can currently reach every property. Assigning specific people to this property will land here."
          className="rounded-2xl border border-dashed border-border py-12"
        />
      </SettingsSection>

      <SettingsSection
        title="Invitations"
        icon="IconBell2"
        description="Pending invites for people who should have access to this property."
        className="grid-cols-1 sm:grid-cols-1"
      >
        <EmptyState
          icon="IconInboxEmpty"
          title="No property invitations"
          description="Invitations are sent at the organization level for now."
          className="rounded-2xl border border-dashed border-border py-12"
        />
      </SettingsSection>
    </Page.Content>
  )
}
