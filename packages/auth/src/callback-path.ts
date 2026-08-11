/** Only allow same-origin relative paths (blocks open redirects). */
export function safeCallbackPath(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith("/") || value.startsWith("//")) return null
  return value
}
