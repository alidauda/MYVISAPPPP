import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * A password input with a Show toggle. The toggle is a real button so it is
 * reachable by keyboard, and it never submits the form.
 */
export function PasswordField({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className={cn('pr-[76px]', className)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        className="absolute top-1.5 right-1.5 h-8 bg-background px-3 text-[13px]"
      >
        {visible ? 'Hide' : 'Show'}
      </Button>
    </div>
  )
}
