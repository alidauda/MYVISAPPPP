import type { UseFormSetError, FieldValues, Path } from 'react-hook-form'
import { ApiProblem } from '@/api/problem'
import { humanMessage } from '@/api/problem'

/**
 * Map a 400 with `validationErrors` onto the form's own fields, and return
 * whatever is left over for the form-level alert.
 *
 * A field the server names that this form does not have is not dropped — it
 * is surfaced at form level, so nothing a person needs to fix stays invisible.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly Path<T>[],
  /** Wire field name → the form's own name, where the two differ. */
  aliases: Record<string, string> = {},
): string | null {
  if (!(error instanceof ApiProblem) || !error.isValidation) {
    return humanMessage(error)
  }

  const known = new Set<string>(knownFields as readonly string[])
  const orphans: string[] = []

  for (const item of error.validationErrors) {
    const field = aliases[item.field] ?? item.field
    if (known.has(field)) {
      setError(field as Path<T>, { type: 'server', message: item.message })
    } else {
      // Never dropped: a field this form does not own still has to be seen.
      orphans.push(`${item.field}: ${item.message}`)
    }
  }

  return orphans.length > 0 ? orphans.join(' ') : null
}
