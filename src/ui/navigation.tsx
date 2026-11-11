'use client'
import React from 'react'
import {
  Archive,
  CircleAlert,
  Clock3,
  FilePenLine,
  Inbox,
  Mail,
  Pencil,
  Send,
  Settings2,
} from 'lucide-react'
import type { MailFolder } from '../types.js'
import type { useMail } from './use-mail.js'
import { Button } from './components/button.js'
import { Separator } from './components/separator.js'
import { Badge } from './components/badge.js'
import { Choice } from './controls.js'
import { cn } from './utils.js'

export type MailState = ReturnType<typeof useMail>

/** Navigation refers exclusively to persisted application folders with actual counts. */
export function MailNavigation({
  state: s,
  settingsOpen,
  onSettings,
  onNavigate,
  onFolder,
}: {
  state: MailState
  settingsOpen: boolean
  onSettings: () => void
  onNavigate?: () => void
  onFolder?: () => void
}) {
  const { t } = s
  const folders = [
    { key: 'inbox', label: t.inbox, icon: Inbox },
    { key: 'drafts', label: t.drafts, icon: FilePenLine },
    { key: 'sent', label: t.sent, icon: Send },
    { key: 'queued', label: t.queue, icon: Clock3 },
    { key: 'failed', label: t.failed, icon: CircleAlert },
    { key: 'archived', label: t.archive, icon: Archive },
    { key: 'all', label: t.allMail, icon: Mail },
  ] as const
  return (
    <aside aria-label={t.navigation} className="pm:flex pm:h-full pm:min-w-0 pm:flex-col">
      <div className="pm:flex pm:h-14 pm:shrink-0 pm:items-center pm:border-b pm:px-3">
        <Choice
          label={t.selectMailbox}
          value={s.query.mailbox}
          onChange={(mailbox) => {
            s.back()
            s.setQuery((q) => ({ ...q, mailbox, page: 1 }))
          }}
          options={[
            { value: '', label: t.all },
            ...(s.settings?.mailboxes.map((box) => ({ value: box.key, label: box.name })) || []),
          ]}
          className="pm:w-full"
        />
      </div>
      <div className="pm:p-3">
        <Button
          className="pm:w-full pm:justify-start"
          disabled={!s.settings?.mailboxes.length}
          onClick={() => {
            s.newDraft()
            onNavigate?.()
          }}
        >
          <Pencil className="pm:size-4" aria-hidden="true" />
          {t.compose}
        </Button>
      </div>
      <nav className="pm:grid pm:gap-1 pm:px-3 pm:pb-3">
        {folders.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={!settingsOpen && s.query.folder === key ? 'secondary' : 'ghost'}
            className={cn(
              'pm:w-full pm:justify-start pm:gap-3 pm:px-3',
              !settingsOpen && s.query.folder === key && 'pm:font-semibold',
            )}
            aria-current={!settingsOpen && s.query.folder === key ? 'page' : undefined}
            onClick={() => {
              s.back()
              s.setQuery((q) => ({ ...q, folder: key as MailFolder, page: 1, unread: false }))
              onFolder?.()
              onNavigate?.()
            }}
          >
            <Icon className="pm:size-4 pm:shrink-0" aria-hidden="true" />
            <span className="pm:truncate">{label}</span>
            {s.counts && (
              <Badge
                variant="outline"
                className="pm:ms-auto pm:border-0 pm:px-0 pm:font-normal pm:tabular-nums"
              >
                {new Intl.NumberFormat(s.language, {
                  numberingSystem: s.settings?.numberingSystem ?? 'latn',
                }).format(key === 'inbox' ? s.counts.unread : s.counts[key])}
              </Badge>
            )}
          </Button>
        ))}
      </nav>
      <Separator />
      <div className="pm:p-3">
        <Button
          variant={settingsOpen ? 'secondary' : 'ghost'}
          className="pm:w-full pm:justify-start pm:gap-3"
          onClick={() => {
            onSettings()
            onNavigate?.()
          }}
        >
          <Settings2 className="pm:size-4" aria-hidden="true" />
          {t.settings}
        </Button>
      </div>
      <div className="pm:mt-auto pm:grid pm:gap-2 pm:border-t pm:p-3">
        <Choice
          label={t.language}
          value={s.language}
          onChange={(language) => s.changeLanguage(language === 'fa' ? 'fa' : 'en')}
          options={[
            { value: 'en', label: 'English' },
            { value: 'fa', label: 'فارسی' },
          ]}
        />
      </div>
    </aside>
  )
}
