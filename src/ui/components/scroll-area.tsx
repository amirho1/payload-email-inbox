/* Adapted from shadcn/ui new-york registry. Copyright (c) 2023 shadcn; MIT. */
'use client'

import * as React from 'react'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'

import { useMailSurface } from '../surface.js'
import { cn } from '../utils.js'

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    dir={useMailSurface().dir}
    ref={ref}
    className={cn('pm:relative pm:overflow-hidden', className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="pm:h-full pm:w-full pm:rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      'pm:flex pm:touch-none pm:select-none pm:transition-colors',
      orientation === 'vertical' &&
        'pm:h-full pm:w-2.5 pm:border-s pm:border-s-transparent pm:p-[1px]',
      orientation === 'horizontal' &&
        'pm:h-2.5 pm:flex-col pm:border-t pm:border-t-transparent pm:p-[1px]',
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="pm:relative pm:flex-1 pm:rounded-full pm:bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
