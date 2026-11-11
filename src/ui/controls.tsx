'use client'
import React from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from './components/button.js'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/select.js'
import { Tooltip, TooltipContent, TooltipTrigger } from './components/tooltip.js'

/** One accessible name serves keyboard users, screen readers and the visible tooltip. */
export function IconButton({
  icon: Icon,
  label,
  ...props
}: React.ComponentProps<typeof Button> & { icon: LucideIcon; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={label} {...props}>
          <Icon className="pm:size-4" aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** A shared shadcn Select keeps account, language and filter controls consistent in both directions. */
export function Choice({
  label,
  value,
  onChange,
  options,
  disabled,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
  className?: string
}) {
  return (
    <Select
      value={value || '__all__'}
      onValueChange={(next) => onChange(next === '__all__' ? '' : next)}
      disabled={disabled}
    >
      <SelectTrigger aria-label={label} className={className}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value || '__all__'} value={option.value || '__all__'}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
