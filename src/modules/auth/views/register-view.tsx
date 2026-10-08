import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Circle } from 'lucide-react'
import { registerSchema, type RegisterInput } from '@/features/auth/lib/schemas'
import { useRegister } from '@/features/auth/hooks/use-session'
import { applyServerErrors } from '@/lib/form'
import { AuthLayout } from '@/features/auth/components/auth-layout'
import { Notice } from '@/components/shared/notice'
import { PasswordField } from '@/features/auth/components/password-field'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

export function RegisterView() {
  const navigate = useNavigate()
  const register = useRegister()
  const [banner, setBanner] = useState<string | null>(null)

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      password: '',
      acceptedTerms: false,
    },
  })

  const password = form.watch('password')

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    try {
      await register.mutateAsync({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        // Optional in the contract; omit it rather than send an empty string.
        phoneNumber: values.phoneNumber || undefined,
      })
      // 201 does not sign anyone in. Verification comes first.
      await navigate({ to: '/check-email', search: { email: values.email }, replace: true })
    } catch (error) {
      setBanner(
        applyServerErrors(error, form.setError, [
          'firstName',
          'lastName',
          'email',
          'phoneNumber',
          'password',
        ]),
      )
    }
  })

  return (
    <AuthLayout
      headline="One account, every traveller you look after."
      lede="Your sign-in account and the people you travel for are kept as separate records — so a family, or a caseload, stays legible."
      stamp="Applicant"
      topRight={
        <span className="flex items-center gap-4">
          Already registered?
          <Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <h1 className="mb-2 text-[32px]">Create an account</h1>
      <p className="mb-6 text-[15px] leading-[1.55] text-muted-foreground">
        Use a name that matches your travel document. You can add other travellers after your own
        profile exists.
      </p>

      {banner ? (
        <Notice tone="danger" title={banner} className="mb-6" />
      ) : null}

      <Form {...form}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4.5" noValidate>
          <div className="flex flex-col gap-4.5 sm:flex-row">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input autoComplete="given-name" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Last name</FormLabel>
                  <FormControl>
                    <Input autoComplete="family-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormDescription>
                  We send the verification link here. It can be used once.
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
                  <Input type="tel" autoComplete="tel" placeholder="+234 800 000 0000" {...field} />
                </FormControl>
                <FormDescription>Include the country code.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordField autoComplete="new-password" {...field} />
                </FormControl>
                <div className="flex flex-wrap gap-4 pt-1">
                  <Requirement met={password.length >= 12}>12 characters or more</Requirement>
                  <Requirement met={false}>Not used on another site</Requirement>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="acceptedTerms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-2.5 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="mt-0.5"
                  />
                </FormControl>
                <div>
                  <FormLabel className="text-[13.5px] leading-[1.5] font-normal text-label">
                    I accept the Terms of Use and the Privacy Notice, including how my documents are
                    stored.
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <Button type="submit" size="lg" disabled={form.formState.isSubmitting} className="w-full">
            {form.formState.isSubmitting ? 'Creating your account…' : 'Create account'}
          </Button>
        </form>
      </Form>

      <p className="mt-4 text-[12.5px] leading-[1.5] text-muted-foreground">
        Creating an account does not sign you in. Verify your email address first.
      </p>
    </AuthLayout>
  )
}

/** Guidance, not gatekeeping — the server's policy is the one that counts. */
function Requirement({ met, children }: { met: boolean; children: string }) {
  const Icon = met ? Check : Circle
  return (
    <span
      className={`flex items-center gap-1.5 text-[12.5px] ${met ? 'text-success' : 'text-muted-foreground'}`}
    >
      <Icon className="size-3" aria-hidden="true" />
      {children}
    </span>
  )
}
