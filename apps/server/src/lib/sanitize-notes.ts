import sanitizeHtml from 'sanitize-html'

/** Locked TipTap subset (D-14) — anything else, including <script>/event handlers, is stripped. */
const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'h2', 'h3']

/**
 * Sanitize TipTap-authored property/unit notes HTML before persisting (D-15).
 * Never trust client HTML — this must run on every create/update that touches notes.
 */
export function sanitizeNotesHtml(dirty: string): string {
  if (!dirty) return ''
  return sanitizeHtml(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  })
}
