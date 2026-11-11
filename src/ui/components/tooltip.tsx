/* Adapted from shadcn/ui new-york registry. Copyright (c) 2023 shadcn; MIT. */
'use client'

import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

import { useMailSurface } from '../surface.js'
import { cn } from '../utils.js'

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal container={useMailSurface().container}>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'pm:z-50 pm:overflow-hidden pm:rounded-md pm:bg-primary pm:px-3 pm:py-1.5 pm:text-xs pm:text-primary-foreground pm:animate-in pm:fade-in-0 pm:zoom-in-95 pm:data-[state=closed]:animate-out pm:data-[state=closed]:fade-out-0 pm:data-[state=closed]:zoom-out-95 pm:data-[side=bottom]:slide-in-from-top-2 pm:data-[side=left]:slide-in-from-right-2 pm:data-[side=right]:slide-in-from-left-2 pm:data-[side=top]:slide-in-from-bottom-2 pm:origin-[--radix-tooltip-content-transform-origin]',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
