import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border font-semibold transition-colors text-xs px-2.5 py-0.5',
  {
    variants: {
      variant: {
        default:   'border-gray-200 bg-gray-100 text-gray-700',
        confusing: 'border-red-200 bg-red-50 text-red-700',
        dense:     'border-amber-200 bg-amber-50 text-amber-700',
        easy:      'border-green-200 bg-green-50 text-green-700',
        engaging:  'border-blue-200 bg-blue-50 text-blue-700',
        review:    'border-orange-200 bg-orange-50 text-orange-700',
        mock:      'border-gray-200 bg-gray-50 text-gray-500',
        real:      'border-green-200 bg-green-50 text-green-600',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
