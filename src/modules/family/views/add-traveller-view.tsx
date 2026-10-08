import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { familyMemberSchema, type FamilyMemberInput } from '@/features/family/lib/schemas'
import { useFamilyMutations } from '@/features/family/hooks/use-family'
import { applyServerErrors } from '@/lib/form'
import { countries } from '@/lib/countries'
import { PageBody } from '@/components/shared/app-shell'
import { Notice } from '@/components/shared/notice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const FIELDS = [
  'relationship',
  'firstName',
  'lastName',
  'dateOfBirth',
  'gender',
  'nationality',
  'countryOfResidence',
  'email',
] as const

export function AddTravellerView() {
  const navigate = useNavigate()
  const family = useFamilyMutations()
  const [banner, setBanner] = useState<string | null>(null)

  const form = useForm<FamilyMemberInput>({
    resolver: zodResolver(familyMemberSchema),
    defaultValues: {
      relationship: 'Child',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'UNSPECIFIED',
      nationality: 'NG',
      countryOfResidence: 'NG',
      email: '',
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    try {
      await family.create.mutateAsync(values)
      await navigate({ to: '/travellers' })
    } catch (error) {
      setBanner(applyServerErrors(error, form.setError, FIELDS))
    }
  })

  return (
    <PageBody>
      <h1 className="mb-2 text-[30px]">Add someone you travel for</h1>
      <p className="mb-6 max-w-[640px] text-[15px] leading-[1.6] text-muted-foreground">
        A child, a partner, a parent. They do not need an account of their own — you manage the
        record, the documents and the applications.
      </p>

      {banner ? <Notice tone="danger" title={banner} className="mb-5" /> : null}

      <Form {...form}>
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col gap-5 rounded-lg border border-border bg-card p-6 sm:p-8"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="relationship"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship to you</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {['Child', 'Spouse or partner', 'Parent', 'Sibling', 'Other'].map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Free text on the record; it does not change who manages it.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of birth</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="UNSPECIFIED">Unspecified</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nationality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nationality</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name} — {c.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="countryOfResidence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country of residence</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name} — {c.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Their own email <span className="font-normal text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Only for adults you may later invite" {...field} />
                  </FormControl>
                  <FormDescription>
                    Must differ from yours. Required before an 18+ traveller can be invited.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Notice tone="info">
            You will manage this traveller. No consent is needed and no account is created for them
            — children stay under a guardian, and adults can later be invited to consent or to take
            the record over.
          </Notice>

          <div className="flex items-center justify-end gap-3 border-t border-border/70 pt-5">
            <Button asChild variant="outline">
              <Link to="/travellers">Cancel</Link>
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Adding…' : 'Add traveller'}
            </Button>
          </div>
        </form>
      </Form>
    </PageBody>
  )
}
