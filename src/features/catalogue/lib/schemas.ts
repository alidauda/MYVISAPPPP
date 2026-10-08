import { z } from 'zod'

/*
 * Shapes transcribed from the live OpenAPI document at /api-docs, not from
 * the prose reference. Where the two disagreed, the contract won.
 */

export const questionTypeSchema = z.enum([
  'TEXT',
  'TEXTAREA',
  'BOOLEAN',
  'NUMBER',
  'DATE',
  'SELECT',
  'MULTI_SELECT',
])
export type QuestionType = z.infer<typeof questionTypeSchema>

/** An option carries both a `code` and a `value`; the value is what is stored. */
export const questionOptionSchema = z.object({
  code: z.string().nullish(),
  label: z.string(),
  value: z.string(),
  displayOrder: z.number().nullish(),
})
export type QuestionOption = z.infer<typeof questionOptionSchema>

/**
 * A conditional rule. `DISPLAY` decides whether the question is asked at all,
 * `REQUIRE` whether an answer is mandatory once it is.
 */
export const questionRuleSchema = z.object({
  sourceQuestionCode: z.string(),
  operator: z.enum(['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'NOT_CONTAINS']),
  effect: z.enum(['DISPLAY', 'REQUIRE']),
  expectedValue: z.string().nullish(),
})
export type QuestionRule = z.infer<typeof questionRuleSchema>

/** Shared by the catalogue's `QuestionResponse` and an application's own. */
const questionBase = {
  code: z.string(),
  label: z.string(),
  helpText: z.string().nullish(),
  type: questionTypeSchema,
  required: z.boolean(),
  displayOrder: z.number().nullish(),
  /** Bounds the server enforces; the form mirrors them so it fails earlier. */
  minimumLength: z.number().nullish(),
  maximumLength: z.number().nullish(),
  minimumValue: z.number().nullish(),
  maximumValue: z.number().nullish(),
  options: z.array(questionOptionSchema).nullish(),
  rules: z.array(questionRuleSchema).nullish(),
}

export const questionSchema = z.object(questionBase)
export type Question = z.infer<typeof questionSchema>

export const requirementSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  required: z.boolean(),
  displayOrder: z.number().nullish(),
})
export type Requirement = z.infer<typeof requirementSchema>

export const visaSummarySchema = z.object({
  id: z.string(),
  destinationCountry: z.string(),
  code: z.string(),
  name: z.string(),
  visaCategory: z.string(),
  description: z.string().nullish(),
  version: z.number(),
})
export type VisaSummary = z.infer<typeof visaSummarySchema>

export const visaDefinitionSchema = visaSummarySchema.extend({
  active: z.boolean().nullish(),
  processingDaysMin: z.number().nullish(),
  processingDaysMax: z.number().nullish(),
  processingInformation: z.string().nullish(),
  requirements: z.array(requirementSchema).nullish().transform((v) => v ?? []),
  questions: z.array(questionSchema).nullish().transform((v) => v ?? []),
})
export type VisaDefinition = z.infer<typeof visaDefinitionSchema>

export { questionBase }
