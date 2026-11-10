'use client'
// Adapted from shadcn/ui's MIT Button primitive; see THIRD_PARTY_NOTICES.md.
import React from 'react'

export const button = 'pm:min-h-11 pm:px-4 pm:py-2 pm:text-base pm:break-words'

/** Small native subset of shadcn Button: preserve host theme and 44px touch/focus behavior. */
export function Button({
  className = '',
  type = 'button',
  ...props
}: React.ComponentProps<'button'>) {
  return (
    <button
      data-slot="button"
      type={type}
      className={`pm:font-medium pm:transition-colors pm:motion-reduce:transition-none pm:disabled:pointer-events-none pm:disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}
