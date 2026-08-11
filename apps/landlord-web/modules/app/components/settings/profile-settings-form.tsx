"use client"

import { useForm } from "@tanstack/react-form"
import { toast } from "sonner"
import { Button, Field, FieldError, FieldLabel, Input } from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import { updateProfileInputSchema } from "@villuh/server/schemas/account"
import { useUser } from "@/modules/app/providers/me-provider"

/**
 * Pattern sample: shared Zod schema → TanStack Form → tRPC mutation → invalidate.
 * Schema lives with the procedure: `@villuh/server/schemas/account`.
 */
export function ProfileSettingsForm() {
  const { user: me } = useUser()
  const utils = trpc.useUtils()

  const updateProfile = trpc.account.updateProfile.useMutation({
    onSuccess: async () => {
      await invalidateQueries(utils, [(u) => u.me.get])
      toast.success("Profile updated")
    },
    onError: (err) => {
      toast.error(err.message || "Could not update profile")
    },
  })

  const form = useForm({
    defaultValues: {
      name: me.user.name,
    },
    validators: {
      onSubmit: updateProfileInputSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = updateProfileInputSchema.parse(value)
      await updateProfile.mutateAsync(parsed)
      form.reset(parsed)
    },
  })

  return (
    <form
      className="flex max-w-md flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <form.Field
        name="name"
        validators={{
          onChange: updateProfileInputSchema.shape.name,
          onBlur: updateProfileInputSchema.shape.name,
        }}
      >
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid

          return (
            <Field data-invalid={isInvalid || undefined}>
              <FieldLabel htmlFor={field.name}>Display name</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                maxLength={120}
                autoComplete="name"
                aria-invalid={isInvalid || undefined}
              />
              {isInvalid ? (
                <FieldError
                  errors={field.state.meta.errors.map((err) =>
                    typeof err === "string"
                      ? { message: err }
                      : { message: err?.message }
                  )}
                />
              ) : null}
            </Field>
          )
        }}
      </form.Field>

      <form.Subscribe
        selector={(state) =>
          [state.canSubmit, state.isSubmitting, state.values.name] as const
        }
      >
        {([canSubmit, isSubmitting, name]) => (
          <Button
            type="submit"
            disabled={
              !canSubmit ||
              isSubmitting ||
              updateProfile.isPending ||
              name.trim() === me.user.name
            }
          >
            {isSubmitting || updateProfile.isPending ? "Saving…" : "Save"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
