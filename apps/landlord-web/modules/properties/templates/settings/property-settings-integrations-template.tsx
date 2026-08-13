"use client"

import { Page } from "@villuh/ui"
import {
  IntegrationCard,
  type Integration,
} from "@/modules/properties/components/settings/integration-card"
import { SettingsSection } from "@/modules/properties/components/settings/section"

const INTEGRATIONS: Integration[] = [
  {
    key: "docusign",
    name: "DocuSign",
    icon: "IconFileText",
    description:
      "Send leases for signature and file the executed copy against this property automatically.",
  },
  {
    key: "stripe",
    name: "Stripe Connect",
    icon: "IconCreditCard1",
    description:
      "Collect deposits and rent from residents, paid out to the account you connect.",
  },
  {
    key: "twilio",
    name: "Twilio",
    icon: "IconPhone",
    description:
      "Text residents at this property about rent reminders, maintenance, and lease events.",
  },
  {
    key: "mapbox",
    name: "Mapbox",
    icon: "IconMapPin",
    description:
      "Address autofill and map previews for this property and its units.",
  },
]

export function PropertySettingsIntegrationsTemplate() {
  return (
    <Page.Content>
      <SettingsSection
        title="Connected services"
        icon="IconChainLink1"
        description="Third-party services this property can hand work off to. None are available yet."
      >
        {INTEGRATIONS.map((integration) => (
          <IntegrationCard key={integration.key} integration={integration} />
        ))}
      </SettingsSection>
    </Page.Content>
  )
}
