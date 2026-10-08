import type { Control } from 'react-hook-form'
import type { AnswersForm } from '../lib/answers'
import type { ApplicationQuestion } from '../lib/schemas'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { cn } from '@/lib/utils'

/**
 * One question from the catalogue, rendered as the control its type asks for.
 *
 * Nothing here knows which visa this is. Every label, option and code comes
 * from the definition the application was started on — that is the whole
 * point: adding a country must never mean shipping frontend code.
 */
export function QuestionField({
  question,
  control,
  required,
  conditional,
}: {
  question: ApplicationQuestion
  control: Control<AnswersForm>
  required: boolean
  /** True when a rule, not the definition, is what made this appear. */
  conditional?: boolean
}) {
  return (
    <FormField
      control={control}
      name={question.code}
      render={({ field }) => (
        <FormItem className={cn(conditional && 'border-l-2 border-primary pl-4.5')}>
          {conditional ? (
            <span className="flex items-center gap-2 text-xs text-primary">
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3">
                <path
                  d="M8 3.2v9.6M4.4 9.2L8 12.8l3.6-3.6"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Shown because of an earlier answer
            </span>
          ) : null}

          <div className="flex items-baseline justify-between gap-3">
            <FormLabel>
              {question.label}
              {required ? null : (
                <span className="font-normal text-muted-foreground"> (optional)</span>
              )}
            </FormLabel>
            {/* Codes are stable identifiers; staff quote them back to you. */}
            <span className="code shrink-0 text-[10.5px] text-muted-foreground/70">
              {question.code} · {question.type}
            </span>
          </div>

          <FormControl>{renderControl(question, field)}</FormControl>

          {question.helpText ? <FormDescription>{question.helpText}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

type FieldApi = {
  value: unknown
  onChange: (value: unknown) => void
  onBlur: () => void
  name: string
  ref: React.Ref<never>
}

function renderControl(question: ApplicationQuestion, field: FieldApi) {
  const options = question.options ?? []

  switch (question.type) {
    case 'TEXTAREA':
      return <Textarea rows={3} {...field} value={(field.value as string) ?? ''} />

    case 'NUMBER':
      return (
        <Input
          type="number"
          inputMode="decimal"
          {...field}
          value={(field.value as string | number) ?? ''}
        />
      )

    case 'DATE':
      return <Input type="date" {...field} value={(field.value as string) ?? ''} />

    case 'BOOLEAN':
      return (
        <RadioGroup
          onValueChange={(value) => field.onChange(value === 'true')}
          value={field.value === undefined ? undefined : String(field.value)}
          className="flex gap-2.5"
        >
          {[
            { value: 'true', label: 'Yes' },
            { value: 'false', label: 'No' },
          ].map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex h-11 cursor-pointer items-center gap-2.5 rounded-md border px-5 text-[15px]',
                String(field.value) === option.value
                  ? 'border-primary bg-accent font-semibold text-primary'
                  : 'border-input text-label',
              )}
            >
              <RadioGroupItem value={option.value} />
              {option.label}
            </label>
          ))}
        </RadioGroup>
      )

    case 'SELECT':
      return (
        <Select onValueChange={field.onChange} value={(field.value as string) || undefined}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose one" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case 'MULTI_SELECT': {
      const selected = (field.value as string[] | undefined) ?? []
      return (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const checked = selected.includes(option.value)
            return (
              <label
                key={option.value}
                className={cn(
                  'flex h-10 cursor-pointer items-center gap-2.5 rounded-md border px-3.5 text-sm',
                  checked ? 'border-primary bg-accent text-primary' : 'border-input text-label',
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(next) =>
                    field.onChange(
                      next
                        ? [...selected, option.value]
                        : selected.filter((v) => v !== option.value),
                    )
                  }
                />
                {option.label}
              </label>
            )
          })}
        </div>
      )
    }

    default:
      return <Input {...field} value={(field.value as string) ?? ''} />
  }
}
