'use client'
/* Adapted from shadcn/ui new-york registry. Copyright (c) 2023 shadcn; MIT. */
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../utils.js'

const badgeVariants = cva(
  'pm:inline-flex pm:items-center pm:rounded-md pm:border pm:px-2.5 pm:py-0.5 pm:text-xs pm:font-semibold pm:transition-colors pm:focus:outline-none pm:focus:ring-2 pm:focus:ring-ring pm:focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'pm:border-transparent pm:bg-primary pm:text-primary-foreground pm:shadow pm:hover:bg-primary/80',
        secondary:
          'pm:border-transparent pm:bg-secondary pm:text-secondary-foreground pm:hover:bg-secondary/80',
        destructive:
          'pm:border-transparent pm:bg-destructive pm:text-destructive-foreground pm:shadow pm:hover:bg-destructive/80',
        outline: 'pm:text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
