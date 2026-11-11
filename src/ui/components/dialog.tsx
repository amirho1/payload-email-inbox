/* Adapted from shadcn/ui new-york registry. Copyright (c) 2023 shadcn; MIT. */
'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { useMailSurface } from '../surface.js'
import { cn } from '../utils.js'

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = (props: React.ComponentProps<typeof DialogPrimitive.Portal>) => (
  <DialogPrimitive.Portal container={useMailSurface().container} {...props} />
)

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'pm:fixed pm:inset-0 pm:z-50 pm:bg-black/80 pm:data-[state=open]:animate-in pm:data-[state=closed]:animate-out pm:data-[state=closed]:fade-out-0 pm:data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'pm:fixed pm:left-[50%] pm:top-[50%] pm:z-50 pm:grid pm:w-full pm:max-w-lg pm:translate-x-[-50%] pm:translate-y-[-50%] pm:gap-4 pm:border pm:bg-background pm:p-6 pm:shadow-lg pm:duration-200 pm:data-[state=open]:animate-in pm:data-[state=closed]:animate-out pm:data-[state=closed]:fade-out-0 pm:data-[state=open]:fade-in-0 pm:data-[state=closed]:zoom-out-95 pm:data-[state=open]:zoom-in-95 pm:data-[state=closed]:slide-out-to-left-1/2 pm:data-[state=closed]:slide-out-to-top-[48%] pm:data-[state=open]:slide-in-from-left-1/2 pm:data-[state=open]:slide-in-from-top-[48%] pm:sm:rounded-lg',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="pm:absolute pm:end-2 pm:top-2 pm:grid pm:size-11 pm:place-items-center pm:rounded-sm pm:opacity-70 pm:ring-offset-background pm:transition-opacity pm:hover:opacity-100 pm:focus:outline-none pm:focus:ring-2 pm:focus:ring-ring pm:focus:ring-offset-2 pm:disabled:pointer-events-none pm:data-[state=open]:bg-accent pm:data-[state=open]:text-muted-foreground">
        <X className="pm:h-4 pm:w-4" />
        <span className="pm:sr-only">{useMailSurface().closeLabel}</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('pm:flex pm:flex-col pm:space-y-1.5 pm:text-center pm:sm:text-start', className)}
    {...props}
  />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'pm:flex pm:flex-col-reverse pm:sm:flex-row pm:sm:justify-end pm:sm:space-x-2',
      className,
    )}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('pm:text-lg pm:font-semibold pm:leading-none pm:tracking-tight', className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('pm:text-sm pm:text-muted-foreground', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
