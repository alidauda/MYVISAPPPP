import { Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Clock, Info } from 'lucide-react'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/features/auth/lib/schemas'
import { useForgotPassword } from '@/features/auth/hooks/use-session'
import { AuthLayout } from '@/features/auth/components/auth-layout'
import { Notice } from '@/components/shared/notice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

export function ForgotPasswordView() {
  const forgot = useForgotPassword()
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    // The endpoint answers identically whether or not an account exists, so
    // there is nothing to branch on and nothing to leak: we always confirm.
    try {
      await forgot.mutateAsync(values.email)
    } catch {
      /* deliberately swallowed — see below */
    }
  })

  const submitted = forgot.isSuccess || forgot.isError

  return (
    <AuthLayout
      headline="Losing a password never loses the file."
      lede="Applications, uploaded documents and the decision history stay exactly as they were. Only the way you sign in changes."
      stamp="Reset"
      topRight={
        <Link to="/login" className="flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to sign in
        </Link>
      }
    >
      {submitted ? (
        <>
          <h1 className="mb-3 text-[32px]">Check your email</h1>
          <Notice tone="info" title={`If that address has an account, a reset link is on its way`} className="mb-6">
            The same message appears for every address, so nobody can learn who is registered here.
          </Notice>
          <p className="mb-7 text-[13.5px] leading-[1.6] text-muted-foreground">
            The link can be used once, and completing a reset signs the account out everywhere.
          </p>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </>
      ) : (
        <>
          <h1 className="mb-2.5 text-[34px]">Reset your password</h1>
          <p className="mb-7 text-[15px] leading-[1.6] text-muted-foreground">
            Enter the address on the account. We will send a link that lets you set a new password
            once.
          </p>

          <Form {...form}>
            <form onSubmit={onSubmit} className="flex flex-col gap-5.5" noValidate>
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
              <Button type="submit" size="lg" disabled={form.formState.isSubmitting} className="w-full">
                {form.formState.isSubmitting ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
          </Form>

          <div className="mt-7 flex flex-col gap-3 border-t border-border pt-5">
            <span className="flex gap-2.5 text-[13px] leading-[1.55] text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              You will see the same confirmation whether or not an account exists for the address.
              That is deliberate.
            </span>
            <span className="flex gap-2.5 text-[13px] leading-[1.55] text-muted-foreground">
              <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              The link can be used once, and completing a reset signs the account out everywhere.
            </span>
          </div>
        </>
      )}
    </AuthLayout>
  )
}
