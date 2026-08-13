import { Page } from "@villuh/ui"
import { PropertyForm } from "@/modules/properties/components/form/property-form"

export function NewPropertyTemplate() {
  return (
    <Page.Shell centered>
      <Page.Header>
        <Page.Title>Add property</Page.Title>
        <Page.Description>
          Name it, set its address, and add anything else you want on file.
        </Page.Description>
      </Page.Header>

      <Page.Content>
        <PropertyForm />
      </Page.Content>
    </Page.Shell>
  )
}
