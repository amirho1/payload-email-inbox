'use client'
import { createContext, useContext } from 'react'

/** Portals inherit this mail surface's scoped theme, language and writing direction. */
export const MailSurface = createContext<{
  container: HTMLElement | null
  dir: 'ltr' | 'rtl'
  closeLabel: string
}>({ container: null, dir: 'ltr', closeLabel: 'Close' })

export function useMailSurface() {
  return useContext(MailSurface)
}
