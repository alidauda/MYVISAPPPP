import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Circle } from 'lucide-react'
import { travellersApi } from '@/features/travellers/api/travellers-api'
import { travellerProfileSchema, type TravellerProfileInput } from '@/features/travellers/lib/schemas'
import { useSession } from '@/features/auth/hooks/use-session'
import { applyServerErrors } from '@/lib/form'
import { countries } from '@/lib/countries'
import { PageBody } from '@/components/shared/app-shell'
import { Legend } from '@/components/shared/legend'
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
  'firstName',
  'middleName',
  'lastName',
  'dateOfBirth',
  'gender',
  'nationality',
  'countryOfResidence',
  'email',
  'phoneNumber',
] as const

export function TravellerProfileView() {
  const { account } = useSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [banner, setBanner] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: travellersApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  })

  const form = useForm<TravellerProfileInput>({
    resolver: zodResolver(travellerProfileSchema),
    defaultValues: {
      firstName: account?.firstName ?? '',
      middleName: '',
      lastName: account?.lastName ?? '',
      dateOfBirth: '',
      gender: 'UNSPECIFIED',
      nationality: 'NG',
      countryOfResidence: 'NG',
      email: account?.email ?? '',
      phoneNumber: account?.phoneNumber ?? '',
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    try {
      await create.mutateAsync(values)
      await navigate({ to: '/applications', replace: true })
    } catch (error) {
      setBanner(applyServerErrors(error, form.setError, FIELDS))
    }
  })

  return (
    <PageBody>
      <Steps />

      <h1 className="mb-2 text-[32px]">Who is travelling?</h1>
      <p className="mb-6 max-w-[600px] text-[15px] leading-[1.6] text-muted-foreground">
        Enter the details exactly as they appear in the passport. Your sign-in account and this
        traveller record are separate — you can add family travellers once your own profile exists.
      </p>

      {banner ? <Notice tone="danger" title={banner} className="mb-6" /> : null}

      <Form {...form}>
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col gap-6.5 rounded-lg border border-border bg-card p-6 sm:p-8"
        >
          <fieldset className="m-0 border-0 p-0">
            <Legend className="w-full border-b border-border/70 pb-3">Identity</Legend>
            <div className="grid grid-cols-1 gap-4 pt-4.5 sm:grid-cols-3">
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
                name="middleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Middle name <span className="font-normal text-muted-foreground">(optional)</span>
                    </FormLabel>
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
            </div>
          </fieldset>

          <fieldset className="m-0 border-0 p-0">
            <Legend className="w-full border-b border-border/70 pb-3">
              Nationality and residence
            </Legend>
            <div className="grid grid-cols-1 gap-4 pt-4.5 sm:grid-cols-2">
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
                    <FormDescription>As printed in the passport you will travel on.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                    <FormDescription>Where you live now, if it differs.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </fieldset>

          <fieldset className="m-0 border-0 p-0">
            <Legend className="w-full border-b border-border/70 pb-3">
              Contact for this traveller
            </Legend>
            <div className="grid grid-cols-1 gap-4 pt-4.5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormDescription>
                      Taken from your account. Change it if the traveller is someone else.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+234 800 000 0000" {...field} />
                    </FormControl>
                    <FormDescription>Include the country code.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </fieldset>

          <div className="flex flex-col gap-4 border-t border-border/70 pt-5.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="max-w-[340px] text-[13px] leading-[1.5] text-muted-foreground">
              Optional fields can be completed later, before you submit an application.
            </span>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => void navigate({ to: '/applications' })}>
                Save and finish later
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : 'Save profile'}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      <p className="mt-4.5 text-[13px] leading-[1.55] text-muted-foreground">
        Applying for someone else — a child, a partner, a parent? Add them as family travellers once
        this profile is saved. Each keeps its own documents and application history.
      </p>
    </PageBody>
  )
}

function Steps() {
  return (
    <ol className="mb-7 flex list-none flex-wrap items-center gap-3 p-0">
      <Step done>Account created</Step>
      <Separator />
      <Step done>Email verified</Step>
      <Separator />
      <Step current>Traveller profile</Step>
    </ol>
  )
}

function Separator() {
  return <li aria-hidden="true" className="h-px w-7 bg-input" />
}

function Step({ done, current, children }: { done?: boolean; current?: boolean; children: string }) {
  const Icon = done ? Check : Circle
  return (
    <li
      aria-current={current ? 'step' : undefined}
      className={`flex items-center gap-2 text-[13px] ${
        done ? 'text-success' : current ? 'font-semibold text-primary' : 'text-muted-foreground'
      }`}
    >
      <Icon className="size-4" aria-hidden="true" />
      {children}
    </li>
  )
}
