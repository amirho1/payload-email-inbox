/* Adapted from shadcn/ui new-york registry. Copyright (c) 2023 shadcn; MIT. */
'use client'

import * as React from 'react'
import * as SheetPrimitive from '@radix-ui/react-dialog'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'

import { useMailSurface } from '../surface.js'
import { cn } from '../utils.js'

const Sheet = SheetPrimitive.Root

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = (props: React.ComponentProps<typeof SheetPrimitive.Portal>) => (
  <SheetPrimitive.Portal container={useMailSurface().container} {...props} />
)

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      'pm:fixed pm:inset-0 pm:z-50 pm:bg-black/80 pm:data-[state=open]:animate-in pm:data-[state=closed]:animate-out pm:data-[state=closed]:fade-out-0 pm:data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  'pm:fixed pm:z-50 pm:gap-4 pm:bg-background pm:p-6 pm:shadow-lg pm:transition pm:ease-in-out pm:data-[state=closed]:duration-300 pm:data-[state=open]:duration-500 pm:data-[state=open]:animate-in pm:data-[state=closed]:animate-out',
  {
    variants: {
      side: {
        left: 'pm:inset-y-0 pm:left-0 pm:h-full pm:w-3/4 pm:border-r pm:data-[state=closed]:slide-out-to-left pm:data-[state=open]:slide-in-from-left pm:sm:max-w-sm',
        right:
          'pm:inset-y-0 pm:right-0 pm:h-full pm:w-3/4 pm:border-l pm:data-[state=closed]:slide-out-to-right pm:data-[state=open]:slide-in-from-right pm:sm:max-w-sm',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  },
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = 'right', className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content ref={ref} className={cn(sheetVariants({ side }), className)} {...props}>
      <SheetPrimitive.Close className="pm:absolute pm:end-2 pm:top-2 pm:grid pm:size-11 pm:place-items-center pm:rounded-sm pm:opacity-70 pm:ring-offset-background pm:transition-opacity pm:hover:opacity-100 pm:focus:outline-none pm:focus:ring-2 pm:focus:ring-ring pm:focus:ring-offset-2 pm:disabled:pointer-events-none pm:data-[state=open]:bg-secondary">
        <X className="pm:h-4 pm:w-4" />
        <span className="pm:sr-only">{useMailSurface().closeLabel}</span>
      </SheetPrimitive.Close>
      {children}
    </SheetPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('pm:flex pm:flex-col pm:space-y-2 pm:text-center pm:sm:text-start', className)}
    {...props}
  />
)
SheetHeader.displayName = 'SheetHeader'

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'pm:flex pm:flex-col-reverse pm:sm:flex-row pm:sm:justify-end pm:sm:space-x-2',
      className,
    )}
    {...props}
  />
)
SheetFooter.displayName = 'SheetFooter'

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn('pm:text-lg pm:font-semibold pm:text-foreground', className)}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn('pm:text-sm pm:text-muted-foreground', className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
