import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const merge = extendTailwindMerge({ prefix: 'pm' })

/** Merge only the plugin's prefixed Tailwind utilities. */
export function cn(...values: ClassValue[]) {
  return merge(clsx(values))
}
