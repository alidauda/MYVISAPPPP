import { useState } from 'react'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check } from 'lucide-react'
import { resetPasswordSchema, type ResetPasswordInput } from '@/features/auth/lib/schemas'
import { useResetPassword } from '@/features/auth/hooks/use-session'
import { applyServerErrors } from '@/lib/form'
import { AuthLayout } from '@/features/auth/components/auth-layout'
import { Notice } from '@/components/shared/notice'
import { PasswordField } from '@/features/auth/components/password-field'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

const route = getRouteApi('/_auth/reset-password')

export function ResetPasswordView() {
  const { token } = route.useSearch()
  const navigate = useNavigate()
  const reset = useResetPassword()
  const [banner, setBanner] = useState<string | null>(null)

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: token ?? '', password: '', confirmPassword: '' },
  })

  const password = form.watch('password')

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    try {
      await reset.mutateAsync({ token: values.token, newPassword: values.password })
      // Every refresh token is revoked, so there is no session to return to.
      await navigate({ to: '/login', replace: true })
    } catch (error) {
      setBanner(
        applyServerErrors(error, form.setError, ['password', 'confirmPassword'], {
          // The server names the wire field; the form calls it `password`.
          newPassword: 'password',
        }),
      )
    }
  })

  if (!token) {
    return (
      <AuthLayout
        headline="A reset closes every open session."
        lede="That is the point of it: if anyone else had your password, finishing this removes them from the account on every device."
      >
        <h1 className="mb-3 text-[32px]">This link is missing its token</h1>
        <p className="mb-7 text-[15.5px] leading-[1.6] text-label">
          Open the reset link from your email on this device, or ask for a new one.
        </p>
        <Button asChild size="lg" className="w-full">
          <Link to="/forgot-password">Request a new link</Link>
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      headline="A reset closes every open session."
      lede="That is the point of it: if anyone else had your password, finishing this removes them from the account on every device."
      stamp="Single use"
    >
      <h1 className="mb-2.5 text-[34px]">Set a new password</h1>
      <p className="mb-7 text-[15px] leading-[1.6] text-muted-foreground">
        Choose something you do not use anywhere else.
      </p>

      {banner ? <Notice tone="danger" title={banner} className="mb-6" /> : null}

      <Form {...form}>
        <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <PasswordField autoComplete="new-password" autoFocus {...field} />
                </FormControl>
                <div className="flex flex-wrap gap-4 pt-1">
                  <span
                    className={`flex items-center gap-1.5 text-[12.5px] ${password.length >= 12 ? 'text-success' : 'text-muted-foreground'}`}
                  >
                    <Check className="size-3" aria-hidden="true" />
                    12 characters or more
                  </span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm new password</FormLabel>
                <FormControl>
                  <PasswordField autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Notice tone="warning">
            Saving this signs you out on every device, including the mobile app. Sign in again with
            the new password.
          </Notice>

          <Button type="submit" size="lg" disabled={form.formState.isSubmitting} className="w-full">
            {form.formState.isSubmitting ? 'Saving…' : 'Set new password'}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  )
}
