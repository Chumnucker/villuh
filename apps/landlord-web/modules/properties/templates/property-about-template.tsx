"use client"

import { Card, EmptyState, MetricKpiCard, Page } from "@villuh/ui"
import { PropertyDetailsCard } from "@/modules/properties/components/view/about/property-details-card"

// Hero backdrop now lives in `PropertyDetailHeader` (mounted once in
// `(detail)/layout.tsx`) so it spans every tab instead of just About.
export function PropertyAboutTemplate() {
  return (
    <Page.Content className="gap-8">
      {/* <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricKpiCard
            icon="IconCurrencyDollar"
            label="Revenue"
            defaultLabel="No data yet"
            value={0}
            pctChange={0}
            sparkline={[]}
            comingSoon
          />
          <MetricKpiCard
            icon="IconTeam"
            label="Tenants"
            defaultLabel="No data yet"
            value={0}
            pctChange={0}
            sparkline={[]}
            comingSoon
          />
          <MetricKpiCard
            icon="IconHomeDoor"
            label="Occupancy rate"
            defaultLabel="No data yet"
            value={0}
            pctChange={0}
            sparkline={[]}
            comingSoon
          />
        </div> */}

        <PropertyDetailsCard />

        {/* {property.notes ? (
          <Card className="gap-4 p-5">
            <h2 className="text-sm font-semibold text-foreground">Notes</h2>
            <div
              className="prose prose-sm prose-p:my-1.5 prose-headings:text-foreground max-w-none text-sm text-foreground"
              // Notes are sanitized server-side (sanitizeNotesHtml) before persistence.
              dangerouslySetInnerHTML={{ __html: property.notes }}
            />
          </Card>
        ) : null}

        <Card className="gap-2 p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Recent activity
          </h2>
          <EmptyState
            icon="IconClipboard2"
            title="Activity feed coming soon"
            description="Updates, edits, and lease events for this property will show up here."
          />
        </Card> */}
    </Page.Content>
  )
}
