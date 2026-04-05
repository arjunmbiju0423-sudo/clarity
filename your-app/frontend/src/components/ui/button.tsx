import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default:  'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
        outline:  'border border-gray-200 bg-white text-gray-800 hover:bg-gray-50',
        ghost:    'text-gray-600 hover:bg-gray-100',
        danger:   'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        sm:  'px-3 py-1.5 text-sm',
        md:  'px-4 py-2 text-sm',
        lg:  'px-6 py-3 text-base',
        xl:  'px-8 py-4 text-lg',
        icon:'p-2',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
)
Button.displayName = 'Button'
