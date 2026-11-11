/* Adapted from shadcn/ui new-york registry. Copyright (c) 2023 shadcn; MIT. */
'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { useMailSurface } from '../surface.js'
import { cn } from '../utils.js'

const Tabs = (props: React.ComponentProps<typeof TabsPrimitive.Root>) => (
  <TabsPrimitive.Root dir={useMailSurface().dir} {...props} />
)

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'pm:inline-flex pm:h-9 pm:items-center pm:justify-center pm:rounded-lg pm:bg-muted pm:p-1 pm:text-muted-foreground',
      className,
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'pm:inline-flex pm:items-center pm:justify-center pm:whitespace-nowrap pm:rounded-md pm:px-3 pm:py-1 pm:text-sm pm:font-medium pm:ring-offset-background pm:transition-all pm:focus-visible:outline-none pm:focus-visible:ring-2 pm:focus-visible:ring-ring pm:focus-visible:ring-offset-2 pm:disabled:pointer-events-none pm:disabled:opacity-50 pm:data-[state=active]:bg-background pm:data-[state=active]:text-foreground pm:data-[state=active]:shadow',
      className,
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'pm:mt-2 pm:ring-offset-background pm:focus-visible:outline-none pm:focus-visible:ring-2 pm:focus-visible:ring-ring pm:focus-visible:ring-offset-2',
      className,
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
