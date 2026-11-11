'use client'
/* Adapted from shadcn/ui new-york registry. Copyright (c) 2023 shadcn; MIT. */
import * as React from 'react'

import { cn } from '../utils.js'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'pm:flex pm:min-h-11 pm:md:min-h-9 pm:w-full pm:rounded-md pm:border pm:border-input pm:bg-transparent pm:px-3 pm:py-1 pm:text-base pm:shadow-sm pm:transition-colors pm:placeholder:text-muted-foreground pm:focus-visible:outline-none pm:focus-visible:ring-1 pm:focus-visible:ring-ring pm:disabled:cursor-not-allowed pm:disabled:opacity-50 pm:md:text-sm',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
