'use client'
/* Adapted from shadcn/ui new-york registry. Copyright (c) 2023 shadcn; MIT. */
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../utils.js'

const buttonVariants = cva(
  'pm:inline-flex pm:items-center pm:justify-center pm:gap-2 pm:whitespace-nowrap pm:rounded-md pm:text-sm pm:font-medium pm:transition-colors pm:focus-visible:outline-none pm:focus-visible:ring-1 pm:focus-visible:ring-ring pm:disabled:pointer-events-none pm:disabled:opacity-50 pm:[&_svg]:pointer-events-none pm:[&_svg]:size-4 pm:[&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'pm:bg-primary pm:text-primary-foreground pm:shadow pm:hover:bg-primary/90',
        outline:
          'pm:border pm:border-input pm:bg-background pm:shadow-sm pm:hover:bg-accent pm:hover:text-accent-foreground',
        secondary:
          'pm:bg-secondary pm:text-secondary-foreground pm:shadow-sm pm:hover:bg-secondary/80',
        ghost: 'pm:hover:bg-accent pm:hover:text-accent-foreground',
      },
      size: {
        default: 'pm:min-h-11 pm:px-4 pm:py-2 pm:md:min-h-9',
        sm: 'pm:min-h-11 pm:md:min-h-8 pm:rounded-md pm:px-3 pm:text-xs',
        icon: 'pm:size-11 pm:md:size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
