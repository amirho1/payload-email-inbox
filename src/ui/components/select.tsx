/* Adapted from shadcn/ui new-york registry. Copyright (c) 2023 shadcn; MIT. */
'use client'

import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'

import { useMailSurface } from '../surface.js'
import { cn } from '../utils.js'

const Select = (props: React.ComponentProps<typeof SelectPrimitive.Root>) => (
  <SelectPrimitive.Root dir={useMailSurface().dir} {...props} />
)

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'pm:flex pm:min-h-11 pm:md:min-h-9 pm:w-full pm:items-center pm:justify-between pm:whitespace-nowrap pm:rounded-md pm:border pm:border-input pm:bg-transparent pm:px-3 pm:py-2 pm:text-base pm:md:text-sm pm:shadow-sm pm:ring-offset-background pm:data-[placeholder]:text-muted-foreground pm:focus:outline-none pm:focus:ring-1 pm:focus:ring-ring pm:disabled:cursor-not-allowed pm:disabled:opacity-50 pm:[&>span]:line-clamp-1',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="pm:h-4 pm:w-4 pm:opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn('pm:flex pm:cursor-default pm:items-center pm:justify-center pm:py-1', className)}
    {...props}
  >
    <ChevronUp className="pm:h-4 pm:w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn('pm:flex pm:cursor-default pm:items-center pm:justify-center pm:py-1', className)}
    {...props}
  >
    <ChevronDown className="pm:h-4 pm:w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal container={useMailSurface().container}>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'pm:relative pm:z-50 pm:max-h-[--radix-select-content-available-height] pm:min-w-[8rem] pm:overflow-y-auto pm:overflow-x-hidden pm:rounded-md pm:border pm:bg-popover pm:text-popover-foreground pm:shadow-md pm:data-[state=open]:animate-in pm:data-[state=closed]:animate-out pm:data-[state=closed]:fade-out-0 pm:data-[state=open]:fade-in-0 pm:data-[state=closed]:zoom-out-95 pm:data-[state=open]:zoom-in-95 pm:data-[side=bottom]:slide-in-from-top-2 pm:data-[side=left]:slide-in-from-right-2 pm:data-[side=right]:slide-in-from-left-2 pm:data-[side=top]:slide-in-from-bottom-2 pm:origin-[--radix-select-content-transform-origin]',
        position === 'popper' &&
          'pm:data-[side=bottom]:translate-y-1 pm:data-[side=left]:-translate-x-1 pm:data-[side=right]:translate-x-1 pm:data-[side=top]:-translate-y-1',
        className,
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'pm:p-1',
          position === 'popper' &&
            'pm:h-[var(--radix-select-trigger-height)] pm:w-full pm:min-w-[var(--radix-select-trigger-width)]',
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('pm:px-2 pm:py-1.5 pm:text-base pm:md:text-sm pm:font-semibold', className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'pm:relative pm:flex pm:w-full pm:cursor-default pm:select-none pm:items-center pm:rounded-sm pm:py-1.5 pm:ps-2 pm:pe-8 pm:text-base pm:md:text-sm pm:outline-none pm:focus:bg-accent pm:focus:text-accent-foreground pm:data-[disabled]:pointer-events-none pm:data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="pm:absolute pm:end-2 pm:flex pm:h-3.5 pm:w-3.5 pm:items-center pm:justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="pm:h-4 pm:w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('pm:-mx-1 pm:my-1 pm:h-px pm:bg-muted', className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
