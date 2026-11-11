'use client'
import React, { useEffect, useState } from 'react'
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ArrowRight,
  Mail,
  Menu,
  MessageSquarePlus,
  RefreshCw,
  Reply,
  ReplyAll,
  Forward,
  MailOpen,
} from 'lucide-react'
import type { Language, MailRecord } from '../types.js'
import { useMail, type Conversation } from './use-mail.js'
import { MailSurface } from './surface.js'
import { MailNavigation } from './navigation.js'
import { MailList } from './message-list.js'
import { MailSettings } from './settings.js'
import { Composer } from './composer.js'
import { Message } from './message.js'
import { IconButton } from './controls.js'
import { Button } from './components/button.js'
import { Separator } from './components/separator.js'
import { ScrollArea } from './components/scroll-area.js'
import { TooltipProvider } from './components/tooltip.js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './components/dialog.js'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './components/sheet.js'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './components/resizable.js'
import { cn } from './utils.js'

/** Three real mail panes on desktop, one active pane and a navigation sheet on phones. */
export function MailInbox({
  apiPath,
  initialLanguage,
}: {
  apiPath: string
  initialLanguage?: Language
}) {
  const s = useMail({ apiPath, initialLanguage })
  const { t } = s
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const [desktop, setDesktop] = useState(false)
  const [navigationOpen, setNavigationOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const change = () => setDesktop(media.matches)
    change()
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  const select = async (row: Conversation) => {
    setSettingsOpen(false)
    s.setSelectedItem(String(row.id))
    const detail = await s.open(row.conversationId || row.id)
    if (detail && s.query.folder === 'drafts' && row.state === 'draft') {
      const draft = detail.messages.docs.find(
        (message) => String(message.id) === String(row.messageId),
      )
      if (draft) s.act('compose', draft)
    }
  }
  const latest = s.detail?.messages.docs
    .filter((message) => message.kind !== 'note' && message.state !== 'draft')
    .at(-1)
  const inline = !!s.seed && !!s.detail && ['reply', 'replyAll'].includes(s.seed.action)
  const title =
    s.seed?.kind === 'note'
      ? t.note
      : s.seed?.action === 'reply'
        ? t.reply
        : s.seed?.action === 'replyAll'
          ? t.replyAll
          : s.seed?.action === 'forward'
            ? t.forward
            : t.compose
  const providerInspection = !!s.settings?.providers?.find(
    (provider) =>
      provider.key ===
      s.settings?.mailboxes.find((box) => box.key === s.detail?.conversation.mailbox)?.provider,
  )?.inspect
  const composer = s.seed && s.settings && (
    <Composer
      key={`${s.seed.id ?? 'new'}:${s.seed.action}:${s.seed.replyToMessage ?? ''}:${s.seed.kind}`}
      seed={s.seed}
      boxes={s.settings.mailboxes}
      apiPath={apiPath}
      language={s.language}
      limits={s.settings.limits}
      existingAttachments={s.detail?.attachments}
      compact={inline}
      onDone={s.refresh}
      onCancel={() => s.setSeed(undefined)}
    />
  )
  const messageAction = (
    action: 'reply' | 'replyAll' | 'forward' | 'compose',
    message: MailRecord,
  ) => s.act(action, message)
  const detail = (
    <section aria-label={t.details} className="pm:flex pm:h-full pm:min-w-0 pm:flex-col">
      <header className="pm:flex pm:min-h-14 pm:shrink-0 pm:flex-wrap pm:items-center pm:justify-between pm:gap-1 pm:border-b pm:px-3 pm:py-1">
        <div className="pm:flex pm:items-center pm:gap-1">
          {!desktop && (
            <IconButton
              icon={s.language === 'fa' ? ArrowRight : ArrowLeft}
              label={t.back}
              onClick={s.back}
            />
          )}
          <IconButton
            icon={s.detail?.conversation.status === 'closed' ? ArchiveRestore : Archive}
            label={s.detail?.conversation.status === 'closed' ? t.reopen : t.archive}
            disabled={!s.detail}
            onClick={() =>
              void s.changeConversation({
                status: s.detail?.conversation.status === 'closed' ? 'open' : 'closed',
              })
            }
          />
          <IconButton
            icon={MailOpen}
            label={t.markUnread}
            disabled={!s.detail}
            onClick={() => void s.changeConversation({ unread: true })}
          />
          <IconButton
            icon={MessageSquarePlus}
            label={t.addNote}
            disabled={!s.detail}
            onClick={s.addNote}
          />
          <Separator orientation="vertical" className="pm:mx-1 pm:h-5" />
          <IconButton
            icon={RefreshCw}
            label={t.refresh}
            disabled={!s.detail || s.loading}
            onClick={() => void s.refresh().catch(s.fail)}
          />
        </div>
        <div className="pm:flex pm:gap-1">
          <IconButton
            icon={Reply}
            label={t.reply}
            disabled={!latest}
            onClick={() => latest && s.act('reply', latest)}
          />
          <IconButton
            icon={ReplyAll}
            label={t.replyAll}
            disabled={!latest}
            onClick={() => latest && s.act('replyAll', latest)}
          />
          <IconButton
            icon={Forward}
            label={t.forward}
            disabled={!latest}
            onClick={() => latest && s.act('forward', latest)}
          />
        </div>
      </header>
      {s.detail ? (
        <>
          <div className="pm:grid pm:shrink-0 pm:gap-1 pm:border-b pm:px-4 pm:py-3">
            <h2 dir="auto" className="pm:break-words pm:text-base pm:font-semibold">
              {s.detail.conversation.subject || t.noSubject}
            </h2>
            <p className="pm:break-words pm:text-xs pm:text-muted-foreground">
              {t.participants}: <bdi dir="ltr">{s.detail.conversation.participants.join(', ')}</bdi>
            </p>
          </div>
          <ScrollArea className="pm:min-h-0 pm:flex-1">
            {s.detail.messages.docs.map((message) => (
              <Message
                key={message.id}
                message={message}
                files={s.detail!.attachments.filter((file) =>
                  message.data.attachments.map(String).includes(String(file.id)),
                )}
                apiPath={apiPath}
                language={s.language}
                formatDate={s.date}
                act={messageAction}
                retry={s.retry}
                providerInspection={providerInspection}
              />
            ))}
            {(s.detail.messages.hasNextPage || s.detail.messages.hasPrevPage) && (
              <nav aria-label={t.more} className="pm:flex pm:justify-between pm:gap-2 pm:p-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!s.detail.messages.hasPrevPage}
                  onClick={() =>
                    void s.open(s.detail!.conversation.id, s.detail!.messages.page - 1)
                  }
                >
                  {t.previous}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!s.detail.messages.hasNextPage}
                  onClick={() =>
                    void s.open(s.detail!.conversation.id, s.detail!.messages.page + 1)
                  }
                >
                  {t.next}
                </Button>
              </nav>
            )}
          </ScrollArea>
          {inline ? (
            <div className="pm:max-h-[55dvh] pm:shrink-0 pm:overflow-y-auto pm:border-t pm:p-4">
              {composer}
            </div>
          ) : (
            latest && (
              <footer className="pm:grid pm:shrink-0 pm:gap-3 pm:border-t pm:p-4">
                <Button
                  variant="outline"
                  className="pm:justify-start pm:text-muted-foreground"
                  onClick={() => s.act('reply', latest)}
                >
                  <Reply className="pm:size-4" aria-hidden="true" />
                  {t.replyPlaceholder}
                </Button>
                <p className="pm:text-xs pm:text-muted-foreground">{t.sendHelp}</p>
              </footer>
            )
          )}
        </>
      ) : (
        <div className="pm:flex pm:flex-1 pm:flex-col pm:items-center pm:justify-center pm:gap-3 pm:p-6 pm:text-center pm:text-muted-foreground">
          <Mail className="pm:size-10 pm:stroke-1" aria-hidden="true" />
          <h2 className="pm:text-base pm:font-medium pm:text-foreground">{t.selectConversation}</h2>
          <p className="pm:max-w-64 pm:text-sm">{t.selectHelp}</p>
        </div>
      )}
    </section>
  )
  const navigation = (
    <MailNavigation
      state={s}
      settingsOpen={settingsOpen}
      onSettings={() => {
        s.back()
        setSettingsOpen(true)
      }}
      onNavigate={() => {
        setNavigationOpen(false)
      }}
      onFolder={() => setSettingsOpen(false)}
    />
  )
  // The resizer uses physical LTR coordinates. Reverse keyed panes for RTL,
  // restoring each pane's text direction and preserving editor identity on resize.
  const panels = [
    <ResizablePanel
      key="navigation"
      id="navigation"
      dir={s.language === 'fa' ? 'rtl' : 'ltr'}
      defaultSize="18%"
      minSize={desktop ? 140 : 0}
      maxSize={desktop ? '25%' : '100%'}
      className={!desktop ? 'pm:hidden!' : undefined}
    >
      {navigation}
    </ResizablePanel>,
    <ResizableHandle
      key="navigation-handle"
      withHandle
      aria-label={t.resizeNavigation}
      className={!desktop ? 'pm:hidden!' : undefined}
    />,
    ...(settingsOpen
      ? [
          <ResizablePanel
            key="settings"
            id="settings"
            dir={s.language === 'fa' ? 'rtl' : 'ltr'}
            defaultSize="82%"
            minSize={desktop ? 320 : 0}
            className={!desktop ? 'pm:h-full! pm:w-full!' : undefined}
          >
            <MailSettings state={s} />
          </ResizablePanel>,
        ]
      : [
          <ResizablePanel
            key="messages"
            id="messages"
            dir={s.language === 'fa' ? 'rtl' : 'ltr'}
            defaultSize="32%"
            minSize={desktop ? 240 : 0}
            className={!desktop ? (s.detail ? 'pm:hidden!' : 'pm:h-full! pm:w-full!') : undefined}
          >
            <MailList state={s} onSelect={(row) => void select(row)} />
          </ResizablePanel>,
          <ResizableHandle
            key="messages-handle"
            withHandle
            aria-label={t.resizeMessages}
            className={!desktop ? 'pm:hidden!' : undefined}
          />,
          <ResizablePanel
            key="detail"
            id="detail"
            dir={s.language === 'fa' ? 'rtl' : 'ltr'}
            defaultSize="50%"
            minSize={desktop ? 260 : 0}
            className={!desktop ? (s.detail ? 'pm:h-full! pm:w-full!' : 'pm:hidden!') : undefined}
          >
            {detail}
          </ResizablePanel>,
        ]),
  ]
  return (
    <MailSurface.Provider
      value={{ container, dir: s.language === 'fa' ? 'rtl' : 'ltr', closeLabel: t.closeLabel }}
    >
      <TooltipProvider delayDuration={350}>
        <main
          ref={setContainer}
          className="payload-mail pm:my-3 pm:flex pm:h-[calc(100dvh-8rem)] pm:min-h-[36rem] pm:w-full pm:min-w-0 pm:flex-col pm:overflow-hidden pm:rounded-lg pm:border pm:text-sm"
          dir={s.language === 'fa' ? 'rtl' : 'ltr'}
          lang={s.language}
        >
          {!desktop && (
            <header className="pm:flex pm:h-14 pm:shrink-0 pm:items-center pm:gap-3 pm:border-b pm:px-3">
              <Sheet open={navigationOpen} onOpenChange={setNavigationOpen}>
                <SheetTrigger asChild>
                  <IconButton icon={Menu} label={t.navigation} />
                </SheetTrigger>
                <SheetContent
                  side={s.language === 'fa' ? 'right' : 'left'}
                  className="pm:flex pm:w-[min(18rem,90vw)] pm:flex-col pm:gap-0 pm:p-0"
                >
                  <SheetHeader className="pm:shrink-0 pm:border-b pm:px-4 pm:py-4 pm:pe-16 pm:text-start">
                    <SheetTitle>{t.navigation}</SheetTitle>
                    <SheetDescription className="pm:sr-only">{t.selectMailbox}</SheetDescription>
                  </SheetHeader>
                  {navigation}
                </SheetContent>
              </Sheet>
              <span className="pm:font-semibold">{t.title}</span>
              {settingsOpen && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="pm:ms-auto"
                  onClick={() => setSettingsOpen(false)}
                >
                  {t.back}
                </Button>
              )}
            </header>
          )}
          <div className="pm:min-h-0 pm:flex-1">
            <ResizablePanelGroup
              orientation="horizontal"
              dir="ltr"
              disabled={!desktop}
              className={cn('pm:min-w-0', !desktop && 'pm:block!')}
            >
              {s.language === 'fa' ? [...panels].reverse() : panels}
            </ResizablePanelGroup>
          </div>
          <Dialog
            open={!!s.seed && !inline}
            onOpenChange={(open) => {
              if (!open) s.setSeed(undefined)
            }}
          >
            <DialogContent className="pm:max-h-[90dvh] pm:w-[calc(100%-2rem)] pm:max-w-2xl pm:overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>
                  {s.seed?.kind === 'note' ? t.note : t.sendHelp}
                </DialogDescription>
              </DialogHeader>
              {!inline && composer}
            </DialogContent>
          </Dialog>
        </main>
      </TooltipProvider>
    </MailSurface.Provider>
  )
}
