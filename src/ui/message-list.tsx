'use client'
import React, { useRef } from 'react'
import { ChevronLeft, ChevronRight, Paperclip, RefreshCw, Search } from 'lucide-react'
import type { Conversation } from './use-mail.js'
import type { MailState } from './navigation.js'
import { Button } from './components/button.js'
import { Badge } from './components/badge.js'
import { Input } from './components/input.js'
import { ScrollArea } from './components/scroll-area.js'
import { Skeleton } from './components/skeleton.js'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/tabs.js'
import { MailFilters } from './filters.js'
import { IconButton } from './controls.js'
import { cn } from './utils.js'

/** Real, paginated rows with a roving keyboard path and a stable selected conversation. */
export function MailList({
  state: s,
  onSelect,
}: {
  state: MailState
  onSelect: (row: Conversation) => void
}) {
  const list = useRef<HTMLDivElement>(null)
  const { t } = s
  const titles = {
    inbox: t.inbox,
    all: t.allMail,
    sent: t.sent,
    drafts: t.drafts,
    queued: t.queue,
    failed: t.failed,
    archived: t.archive,
  }
  return (
    <Tabs
      value={s.query.unread ? 'unread' : 'all'}
      onValueChange={(value) => s.setQuery((q) => ({ ...q, unread: value === 'unread', page: 1 }))}
      asChild
    >
      <section aria-label={t.inbox} className="pm:flex pm:h-full pm:min-w-0 pm:flex-col">
        <div className="pm:flex pm:min-h-14 pm:shrink-0 pm:flex-wrap pm:items-center pm:justify-between pm:gap-2 pm:border-b pm:px-4 pm:py-2">
          <h1
            ref={s.heading}
            tabIndex={-1}
            className="pm:text-xl pm:font-semibold pm:tracking-tight"
          >
            {titles[s.query.folder]}
          </h1>
          <TabsList>
            <TabsTrigger value="all">{t.allMail}</TabsTrigger>
            <TabsTrigger value="unread">{t.unread}</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent
          value={s.query.unread ? 'unread' : 'all'}
          className="pm:mt-0 pm:flex pm:min-h-0 pm:flex-1 pm:flex-col"
        >
          <div className="pm:flex pm:shrink-0 pm:items-center pm:gap-1 pm:p-3">
            <div className="pm:relative pm:min-w-0 pm:flex-1">
              <Search
                className="pm:pointer-events-none pm:absolute pm:start-3 pm:top-1/2 pm:size-4 pm:-translate-y-1/2 pm:text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                aria-label={t.search}
                placeholder={t.search}
                value={s.query.search}
                maxLength={120}
                onChange={(e) => s.setQuery((q) => ({ ...q, search: e.target.value, page: 1 }))}
                className="pm:ps-9"
              />
            </div>
            <MailFilters state={s} />
            <IconButton
              icon={RefreshCw}
              label={t.refresh}
              disabled={s.loading}
              onClick={() => void s.refresh().catch(s.fail)}
            />
          </div>
          {(s.error || s.settingsError) && (
            <p role="alert" className="pm:mx-3 pm:mb-3 pm:rounded-md pm:border pm:p-3 pm:text-sm">
              {s.error || s.settingsError}
            </p>
          )}
          <div role="status" aria-live="polite" className="pm:sr-only">
            {s.loading || (!s.settings && !s.settingsError) ? t.loading : ''}
          </div>
          <ScrollArea className="pm:min-h-0 pm:flex-1">
            <div
              ref={list}
              className="pm:grid pm:gap-2 pm:p-3 pm:pt-0"
              onKeyDown={(event) => {
                if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
                const rows = Array.from(
                  list.current?.querySelectorAll<HTMLButtonElement>('[data-mail-row]') || [],
                )
                const current = rows.indexOf(document.activeElement as HTMLButtonElement)
                if (current < 0) return
                event.preventDefault()
                const index =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? rows.length - 1
                      : Math.max(
                          0,
                          Math.min(rows.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)),
                        )
                rows[index]?.focus()
              }}
            >
              {!s.inbox &&
                s.loading &&
                Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="pm:h-32 pm:w-full pm:rounded-lg" />
                ))}
              {s.inbox?.docs.length === 0 && (
                <p className="pm:p-6 pm:text-center pm:text-sm pm:text-muted-foreground">
                  {t.empty}
                </p>
              )}
              {s.inbox?.docs.map((row) => (
                <Button
                  key={row.id}
                  data-mail-row
                  variant="ghost"
                  aria-current={
                    !!s.detail && s.selectedItem === String(row.id) ? 'true' : undefined
                  }
                  className={cn(
                    'pm:h-auto pm:min-w-0 pm:w-full pm:flex-col pm:items-stretch pm:gap-2 pm:whitespace-normal pm:rounded-lg pm:border pm:p-3 pm:text-start pm:font-normal pm:transition-colors',
                    !!s.detail && s.selectedItem === String(row.id) && 'pm:bg-muted',
                  )}
                  disabled={!s.settings || s.opening}
                  onClick={() => onSelect(row)}
                >
                  <div className="pm:flex pm:min-w-0 pm:items-start pm:justify-between pm:gap-2">
                    <span className="pm:flex pm:min-w-0 pm:items-center pm:gap-2">
                      <span dir="auto" className="pm:truncate pm:font-semibold">
                        {row.fromName || row.sender}
                      </span>
                      {row.unread && (
                        <span
                          aria-label={t.unread}
                          className="pm:size-2 pm:shrink-0 pm:rounded-full pm:bg-blue-500"
                        />
                      )}
                    </span>
                    <time
                      dateTime={row.timestamp}
                      title={s.date(row.timestamp)}
                      className="pm:shrink-0 pm:text-xs pm:text-muted-foreground"
                    >
                      {new Intl.DateTimeFormat(s.language, {
                        timeZone: s.settings?.timeZone || 'UTC',
                        calendar: s.settings?.calendar || 'gregory',
                        numberingSystem: s.settings?.numberingSystem || 'latn',
                        month: 'short',
                        day: 'numeric',
                      }).format(new Date(row.timestamp))}
                    </time>
                  </div>
                  <span dir="auto" className="pm:line-clamp-1 pm:text-xs pm:font-semibold">
                    {row.subject || t.noSubject}
                  </span>
                  <bdi dir="ltr" className="pm:truncate pm:text-xs pm:text-muted-foreground">
                    {row.recipient || row.sender}
                  </bdi>
                  <span
                    dir="auto"
                    className="pm:line-clamp-2 pm:break-words pm:text-xs pm:leading-relaxed pm:text-muted-foreground"
                  >
                    {row.preview}
                  </span>
                  <span className="pm:flex pm:flex-wrap pm:items-center pm:gap-2">
                    <Badge variant="secondary" className="pm:rounded-sm pm:px-1.5 pm:font-medium">
                      {row.state ? t[row.state] : t[row.status]}
                    </Badge>
                    {row.kind === 'note' && <Badge variant="outline">{t.note}</Badge>}
                    {row.hasAttachments && (
                      <Paperclip className="pm:size-3.5" aria-label={t.attachments} />
                    )}
                  </span>
                </Button>
              ))}
            </div>
          </ScrollArea>
          <nav
            aria-label={t.page}
            className="pm:flex pm:h-12 pm:shrink-0 pm:items-center pm:justify-between pm:gap-2 pm:border-t pm:px-3"
          >
            <IconButton
              icon={s.language === 'fa' ? ChevronRight : ChevronLeft}
              label={t.previous}
              disabled={!s.inbox?.hasPrevPage || s.loading}
              onClick={() => s.setQuery((q) => ({ ...q, page: q.page - 1 }))}
            />
            <span className="pm:text-xs pm:text-muted-foreground pm:tabular-nums">
              {t.page} {s.inbox?.page ?? 1}
            </span>
            <IconButton
              icon={s.language === 'fa' ? ChevronLeft : ChevronRight}
              label={t.next}
              disabled={!s.inbox?.hasNextPage || s.loading}
              onClick={() => s.setQuery((q) => ({ ...q, page: q.page + 1 }))}
            />
          </nav>
        </TabsContent>
        <TabsContent
          value={s.query.unread ? 'all' : 'unread'}
          forceMount
          hidden
          className="pm:hidden!"
        />
      </section>
    </Tabs>
  )
}
