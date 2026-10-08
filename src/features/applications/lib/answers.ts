import { z } from 'zod'
import type { ApplicationQuestion, AnswerValue } from './schemas'

export type AnswersForm = Record<string, AnswerValue | undefined>

/**
 * The server evaluates rules too, and sends its own `visible`. We re-evaluate
 * while the person types so a field appears the moment it becomes relevant —
 * but the server's judgement is the one that decides what is valid.
 */
function ruleMatches(
  rule: NonNullable<ApplicationQuestion['rules']>[number],
  answers: AnswersForm,
): boolean {
  const actual = answers[rule.sourceQuestionCode]
  const expected = rule.expectedValue ?? ''

  switch (rule.operator) {
    case 'EQUALS':
      return String(actual ?? '') === expected
    case 'NOT_EQUALS':
      return String(actual ?? '') !== expected
    case 'CONTAINS':
      return Array.isArray(actual)
        ? actual.includes(expected)
        : String(actual ?? '').includes(expected)
    case 'NOT_CONTAINS':
      return Array.isArray(actual)
        ? !actual.includes(expected)
        : !String(actual ?? '').includes(expected)
  }
}

export function isVisible(question: ApplicationQuestion, answers: AnswersForm): boolean {
  const display = (question.rules ?? []).filter((r) => r.effect === 'DISPLAY')
  return display.length === 0 || display.every((r) => ruleMatches(r, answers))
}

export function isRequired(question: ApplicationQuestion, answers: AnswersForm): boolean {
  if (question.required) return true
  const require = (question.rules ?? []).filter((r) => r.effect === 'REQUIRE')
  return require.length > 0 && require.every((r) => ruleMatches(r, answers))
}

export function emptyValue(question: ApplicationQuestion): AnswerValue | undefined {
  if (question.type === 'MULTI_SELECT') return []
  if (question.type === 'BOOLEAN') return undefined
  return ''
}

/** Each question carries its own stored answer; there is no map to merge. */
export function toDefaultValues(questions: ApplicationQuestion[]): AnswersForm {
  const values: AnswersForm = {}
  for (const question of questions) {
    const stored = question.currentAnswer
    values[question.code] = stored === undefined || stored === null ? emptyValue(question) : stored
  }
  return values
}

function fieldSchema(question: ApplicationQuestion, required: boolean): z.ZodTypeAny {
  const missing = 'Answer this question to continue.'

  switch (question.type) {
    case 'BOOLEAN':
      return required
        ? z.boolean({ required_error: missing, invalid_type_error: missing })
        : z.boolean().optional()

    case 'NUMBER': {
      let base: z.ZodTypeAny = z
        .string()
        .or(z.number())
        .transform((v) => (v === '' || v === null ? undefined : Number(v)))
        .refine((v) => v === undefined || Number.isFinite(v), 'Enter a number.')
      // Bounds come from the definition, so a new offering tightens them
      // without a frontend change.
      if (question.minimumValue != null) {
        base = base.refine(
          (v) => v === undefined || v >= question.minimumValue!,
          `Enter ${question.minimumValue} or more.`,
        )
      }
      if (question.maximumValue != null) {
        base = base.refine(
          (v) => v === undefined || v <= question.maximumValue!,
          `Enter ${question.maximumValue} or less.`,
        )
      }
      return required ? base.refine((v) => v !== undefined, missing) : base
    }

    case 'DATE': {
      const base = z
        .string()
        .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Use the format YYYY-MM-DD.')
      return required ? base.refine((v) => v !== '', missing) : base
    }

    case 'MULTI_SELECT': {
      const base = z.array(z.string())
      return required ? base.min(1, missing) : base
    }

    default: {
      let base: z.ZodTypeAny = z.string()
      if (question.minimumLength != null) {
        const min = question.minimumLength
        base = base.refine(
          (v: string) => v === '' || v.length >= min,
          `Use at least ${min} characters.`,
        )
      }
      if (question.maximumLength != null) {
        const max = question.maximumLength
        base = base.refine((v: string) => v.length <= max, `Keep it under ${max} characters.`)
      }
      return required ? base.refine((v: string) => v.trim().length > 0, missing) : base
    }
  }
}

/**
 * Built from the questions the server sent, for the answers currently in the
 * form — visibility and conditional requirement both depend on those, so the
 * schema is rebuilt on every validation pass rather than created once.
 */
export function buildAnswersSchema(questions: ApplicationQuestion[], answers: AnswersForm) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const question of questions) {
    // A hidden question is not validated; its stored answer is left alone.
    if (!isVisible(question, answers)) continue
    shape[question.code] = fieldSchema(question, isRequired(question, answers))
  }
  return z.object(shape)
}

/**
 * `PUT /answers` takes an **array** of `{questionCode, value}`, not a map, and
 * replaces the whole set — so this sends every visible question. Hidden ones
 * are omitted deliberately: an answer that no longer applies should not
 * survive.
 */
export function toAnswerPayload(questions: ApplicationQuestion[], values: AnswersForm) {
  const answers: { questionCode: string; value: AnswerValue }[] = []

  for (const question of questions) {
    if (!isVisible(question, values)) continue
    const value = values[question.code]

    if (value === undefined || value === '') continue
    if (Array.isArray(value) && value.length === 0) continue

    answers.push({
      questionCode: question.code,
      value: question.type === 'NUMBER' && typeof value === 'string' ? Number(value) : value,
    })
  }

  return answers
}

export function countOutstanding(questions: ApplicationQuestion[], values: AnswersForm) {
  return questions.filter((question) => {
    if (!isVisible(question, values)) return false
    if (!isRequired(question, values)) return false
    const value = values[question.code]
    if (value === undefined || value === '' || value === null) return true
    return Array.isArray(value) && value.length === 0
  }).length
}

/**
 * The contract has no section field, so questions are grouped by nothing and
 * ordered by `displayOrder` — the only ordering the definition gives us.
 */
export function inDisplayOrder<T extends { displayOrder?: number | null }>(questions: T[]): T[] {
  return [...questions].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
}
