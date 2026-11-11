'use client'
/* Adapted from shadcn/ui new-york registry. Copyright (c) 2023 shadcn; MIT. */
import * as React from 'react'

import { cn } from '../utils.js'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'pm:flex pm:min-h-[60px] pm:w-full pm:rounded-md pm:border pm:border-input pm:bg-transparent pm:px-3 pm:py-2 pm:text-base pm:shadow-sm pm:placeholder:text-muted-foreground pm:focus-visible:outline-none pm:focus-visible:ring-1 pm:focus-visible:ring-ring pm:disabled:cursor-not-allowed pm:disabled:opacity-50 pm:md:text-sm',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Textarea.displayName = 'Textarea'

export { Textarea }
