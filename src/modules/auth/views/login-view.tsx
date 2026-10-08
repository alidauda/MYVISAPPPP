import { useState } from 'react'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ApiProblem } from '@/api/problem'
import { loginSchema, type LoginInput } from '@/features/auth/lib/schemas'
import { useLogin } from '@/features/auth/hooks/use-session'
import { applyServerErrors } from '@/lib/form'
import { AuthLayout, PanelList } from '@/features/auth/components/auth-layout'
import { Notice } from '@/components/shared/notice'
import { PasswordField } from '@/features/auth/components/password-field'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {

  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const route = getRouteApi('/_auth/login')

type Banner = { tone: 'danger' | 'warning'; title: string; detail?: string } | null

/**
 * Sign-in refusals are deliberately vague about *which* account is in what
 * state, but they must still tell the person what to do next. The server's own
 * message is shown; the code only decides the tone and the follow-up action.
 */
function bannerFor(error: unknown): Banner {
  if (!(error instanceof ApiProblem)) {
    return { tone: 'danger', title: 'We could not reach MyVisApp.', detail: 'Check your connection and try again.' }
  }
  if (error.code.includes('VERIF')) {
    return { tone: 'warning', title: error.message, detail: 'We sent a link when you registered.' }
  }
  // The backend uses one code for unverified and disabled accounts alike; its
  // message says which, so the detail has to cover both.
  if (error.code === 'ACCOUNT_UNAVAILABLE') {
    return {
      tone: 'warning',
      title: error.message,
      detail: 'If you registered recently, open the verification link we emailed you. Otherwise contact support.',
    }
  }
  if (error.code.includes('LOCK')) {
    return { tone: 'danger', title: error.message, detail: 'Try again shortly, or reset your password.' }
  }
  return { tone: 'danger', title: error.message }
}

export function LoginView() {
  const navigate = useNavigate()
  const { redirect } = route.useSearch()
  const login = useLogin()
  const [banner, setBanner] = useState<Banner>(null)

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', staySignedIn: false },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    try {
      await login.mutateAsync({ email: values.email, password: values.password })
      await navigate({ to: redirect ?? '/applications', replace: true })
    } catch (error) {
      const leftover = applyServerErrors(error, form.setError, ['email', 'password'])
      setBanner(leftover ? bannerFor(error) : null)
    }
  })

  return (
    <AuthLayout
      headline="A clear record of every visa application."
      lede="Travellers and the teams acting for them work from one versioned file — answers, documents and decisions, each with its own trail."
      stamp="Verified"
      aside={
        <PanelList
          items={[
            'Documents are encrypted at rest and pinned to the exact version you submitted.',
            'What you can see comes from your permissions, never from a job title.',
            'Every status change is written to a timeline you can read back.',
          ]}
        />
      }
      topRight={
        <span className="flex items-center gap-4">
          New to MyVisApp?
          <Link to="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
            Create an account
          </Link>
        </span>
      }
    >
      <h1 className="mb-2 text-[34px]">Sign in</h1>
      <p className="mb-8 text-[15px] leading-[1.55] text-muted-foreground">
        Use the email address you registered with.
      </p>

      {banner ? (
        <Notice tone={banner.tone} title={banner.title} className="mb-6">
          {banner.detail}
        </Notice>
      ) : null}

      <Form {...form}>
        <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" autoFocus {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-baseline justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link
                    to="/forgot-password"
                    className="text-[13px] text-primary underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <PasswordField autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="staySignedIn"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2.5 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal text-label">Stay signed in on this device</FormLabel>
              </FormItem>
            )}
          />

          <Button type="submit" size="lg" disabled={form.formState.isSubmitting} className="w-full">
            {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Form>

      <p className="mt-4.5 text-[12.5px] leading-[1.5] text-muted-foreground">
        MyVisApp will never ask for your password by email, and never asks you to forward a
        verification link.
      </p>
    </AuthLayout>
  )
}
