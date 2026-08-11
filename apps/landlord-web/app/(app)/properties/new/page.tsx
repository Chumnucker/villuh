import { PropertyForm } from "@/modules/app/components/properties/property-form"

export default function NewPropertyPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-medium tracking-tight">Add property</h1>
        <p className="text-sm text-muted-foreground">
          Name it, set its address, and add anything else you want on file.
        </p>
      </div>
      <PropertyForm mode="create" />
    </div>
  )
}
