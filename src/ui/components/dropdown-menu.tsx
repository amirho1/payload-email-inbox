/* Adapted from shadcn/ui new-york registry. Copyright (c) 2023 shadcn; MIT. */
'use client'

import * as React from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'

import { useMailSurface } from '../surface.js'
import { cn } from '../utils.js'

const DropdownMenu = (props: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) => (
  <DropdownMenuPrimitive.Root dir={useMailSurface().dir} {...props} />
)

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal container={useMailSurface().container}>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'pm:z-50 pm:max-h-[var(--radix-dropdown-menu-content-available-height)] pm:min-w-[8rem] pm:overflow-y-auto pm:overflow-x-hidden pm:rounded-md pm:border pm:bg-popover pm:p-1 pm:text-popover-foreground pm:shadow-md',
        'pm:data-[state=open]:animate-in pm:data-[state=closed]:animate-out pm:data-[state=closed]:fade-out-0 pm:data-[state=open]:fade-in-0 pm:data-[state=closed]:zoom-out-95 pm:data-[state=open]:zoom-in-95 pm:data-[side=bottom]:slide-in-from-top-2 pm:data-[side=left]:slide-in-from-right-2 pm:data-[side=right]:slide-in-from-left-2 pm:data-[side=top]:slide-in-from-bottom-2 pm:origin-[--radix-dropdown-menu-content-transform-origin]',
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'pm:relative pm:flex pm:cursor-default pm:select-none pm:items-center pm:gap-2 pm:rounded-sm pm:px-2 pm:py-1.5 pm:text-sm pm:outline-none pm:transition-colors pm:focus:bg-accent pm:focus:text-accent-foreground pm:data-[disabled]:pointer-events-none pm:data-[disabled]:opacity-50 pm:[&>svg]:size-4 pm:[&>svg]:shrink-0',
      inset && 'pm:ps-8',
      className,
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem }
