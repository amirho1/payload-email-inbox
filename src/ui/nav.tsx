'use client'
import React from 'react'
import { useTranslation } from '@payloadcms/ui'

/** Keep the global admin navigation entry independent of inbox/composer client code. */
export function MailNav({ href }: { href: string }) {
  const { i18n } = useTranslation()
  return <a href={href}>{i18n.language === 'fa' ? 'نامه‌ها' : 'Mail'}</a>
}
