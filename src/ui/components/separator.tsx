/* Adapted from shadcn/ui new-york registry. Copyright (c) 2023 shadcn; MIT. */
'use client'

import * as React from 'react'
import * as SeparatorPrimitive from '@radix-ui/react-separator'

import { cn } from '../utils.js'

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      'pm:shrink-0 pm:bg-border',
      orientation === 'horizontal' ? 'pm:h-[1px] pm:w-full' : 'pm:h-full pm:w-[1px]',
      className,
    )}
    {...props}
  />
))
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }
