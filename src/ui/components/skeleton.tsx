'use client'
/* Adapted from shadcn/ui new-york registry. Copyright (c) 2023 shadcn; MIT. */
import { cn } from '../utils.js'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('pm:animate-pulse pm:rounded-md pm:bg-primary/10', className)} {...props} />
  )
}

export { Skeleton }
