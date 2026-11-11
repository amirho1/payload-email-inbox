'use client'
import React, { useRef, useState } from 'react'
import {
  FileCode2,
  Forward,
  MoreHorizontal,
  Paperclip,
  Reply,
  ReplyAll,
  RotateCcw,
} from 'lucide-react'
import type { Language, MailRecord, MailID } from '../types.js'
import { en, fa } from './translations.js'
import { mailRequest } from './api.js'
import { Avatar, AvatarFallback } from './components/avatar.js'
import { Badge } from './components/badge.js'
import { Button } from './components/button.js'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './components/dropdown-menu.js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './components/dialog.js'
import { IconButton } from './controls.js'
import { ProviderDetails } from './provider-details.js'

/** Every body uses escaped plaintext or the existing server-sanitized, isolated HTML endpoint. */
export function Message({
  message: m,
  files,
  apiPath,
  language,
  formatDate,
  act,
  retry,
  providerInspection = false,
}: {
  message: MailRecord
  files: { id: MailID; filename: string }[]
  apiPath: string
  language: Language
  formatDate: (date: string) => string
  act: (action: 'reply' | 'replyAll' | 'forward' | 'compose', message: MailRecord) => void
  retry: (id: MailID) => Promise<void>
  providerInspection?: boolean
}) {
  const t = language === 'fa' ? fa : en
  const [html, setHtml] = useState<string>()
  const [error, setError] = useState('')
  const [metadataOpen, setMetadataOpen] = useState(false)
  const moreButton = useRef<HTMLButtonElement>(null)
  async function showHtml(images = false) {
    try {
      setHtml(
        (
          await mailRequest<{ html: string }>(
            `${apiPath}/html/${m.id}${images ? '?images=true' : ''}`,
          )
        ).html,
      )
    } catch {
      setError(t.error)
    }
  }
  const initials = (m.data.fromName || m.data.from)
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join('')
    .toLocaleUpperCase(language)
  return (
    <article
      data-message-id={m.id}
      aria-label={m.kind === 'note' ? t.note : t[m.kind]}
      className={`pm:min-w-0 pm:border-b ${m.kind === 'note' ? 'pm:bg-muted/50' : ''}`}
    >
      <header className="pm:flex pm:items-start pm:gap-3 pm:p-4">
        <Avatar className="pm:size-9 pm:shrink-0">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="pm:grid pm:min-w-0 pm:flex-1 pm:gap-1">
          <div className="pm:flex pm:flex-wrap pm:items-start pm:justify-between pm:gap-2">
            <strong dir="auto" className="pm:break-words pm:text-sm">
              {m.kind === 'note' ? t.note : m.data.fromName || m.data.from}
            </strong>
            <time dateTime={m.createdAt} className="pm:text-xs pm:text-muted-foreground">
              {formatDate(m.createdAt)}
            </time>
          </div>
          {m.kind !== 'note' && (
            <>
              <bdi dir="ltr" className="pm:break-all pm:text-xs">
                {m.data.from}
              </bdi>
              <p className="pm:break-words pm:text-xs pm:text-muted-foreground">
                {t.to}: <bdi dir="ltr">{m.data.to.join(', ')}</bdi>
                {m.data.cc.length > 0 && (
                  <>
                    {' '}
                    · {t.cc}: <bdi dir="ltr">{m.data.cc.join(', ')}</bdi>
                  </>
                )}
              </p>
              <div className="pm:flex pm:flex-wrap pm:gap-2">
                <Badge variant="secondary" className="pm:rounded-sm pm:font-normal">
                  {t[m.state]}
                </Badge>
                <span className="pm:text-xs pm:text-muted-foreground">
                  {t.attempt}: {m.attempts ?? 0}
                </span>
              </div>
            </>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton ref={moreButton} icon={MoreHorizontal} label={t.details} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setMetadataOpen(true)}>{t.headers}</DropdownMenuItem>
            {m.state === 'draft' && (
              <DropdownMenuItem onSelect={() => act('compose', m)}>{t.draft}</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Dialog open={metadataOpen} onOpenChange={setMetadataOpen}>
          <DialogContent
            className="pm:max-h-[85dvh] pm:w-[calc(100%-2rem)] pm:overflow-y-auto"
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              moreButton.current?.focus()
            }}
          >
            <DialogHeader>
              <DialogTitle>{t.headers}</DialogTitle>
              <DialogDescription>{t.details}</DialogDescription>
            </DialogHeader>
            <dl className="pm:grid pm:gap-4 pm:text-sm">
              {[
                ['Message-ID', m.data.messageId],
                ['In-Reply-To', m.data.inReplyTo],
                ['References', m.data.references.join(' ')],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label}>
                    <dt dir="ltr" className="pm:font-mono pm:font-semibold">
                      {label}
                    </dt>
                    <dd
                      dir="ltr"
                      className="pm:m-0 pm:mt-1 pm:break-all pm:font-mono pm:text-muted-foreground"
                    >
                      {value}
                    </dd>
                  </div>
                ))}
            </dl>
          </DialogContent>
        </Dialog>
      </header>
      {(m.data.bounce || (m.data.autoSubmitted && m.data.autoSubmitted !== 'no')) && (
        <p className="pm:px-4 pm:pb-3 pm:text-xs pm:text-muted-foreground">{t.automatic}</p>
      )}
      <div className="pm:grid pm:min-w-0 pm:gap-4 pm:px-4 pm:pb-4">
        <pre dir="auto" className="pm:text-sm pm:leading-relaxed">
          {m.data.text}
        </pre>
        {m.data.html && (
          <div className="pm:flex pm:flex-wrap pm:gap-2">
            <Button variant="outline" size="sm" onClick={() => void showHtml()}>
              <FileCode2 className="pm:size-3.5" aria-hidden="true" />
              {t.html}
            </Button>
            {html && (
              <>
                <Button variant="outline" size="sm" onClick={() => void showHtml(true)}>
                  {t.images}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setHtml(undefined)}>
                  {t.plain}
                </Button>
              </>
            )}
          </div>
        )}
        {html && <iframe title={t.html} sandbox="" referrerPolicy="no-referrer" srcDoc={html} />}
        {error && <p role="alert">{error}</p>}
        {files.length > 0 && (
          <ul aria-label={t.attachments} className="pm:flex pm:flex-wrap pm:gap-2">
            {files.map((file) => (
              <li key={file.id} className="pm:min-w-0 pm:max-w-full">
                <Button asChild variant="outline" size="sm">
                  <a
                    href={`${apiPath}/attachment/${file.id}`}
                    download
                    className="pm:max-w-full pm:whitespace-normal pm:break-all"
                  >
                    <Paperclip className="pm:size-3.5 pm:shrink-0" aria-hidden="true" />
                    <bdi dir="auto">{file.filename}</bdi>
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="pm:flex pm:flex-wrap pm:items-center pm:gap-1">
          {m.kind !== 'note' && m.state !== 'draft' && (
            <>
              <IconButton icon={Reply} label={t.reply} onClick={() => act('reply', m)} />
              <IconButton icon={ReplyAll} label={t.replyAll} onClick={() => act('replyAll', m)} />
              <IconButton icon={Forward} label={t.forward} onClick={() => act('forward', m)} />
            </>
          )}
          {m.state === 'draft' && (
            <Button variant="outline" size="sm" onClick={() => act('compose', m)}>
              {t.draft}
            </Button>
          )}
          {m.state === 'failed' && m.kind === 'outgoing' && (
            <Button variant="outline" size="sm" onClick={() => void retry(m.id)}>
              <RotateCcw className="pm:size-3.5" aria-hidden="true" />
              {t.retry}
            </Button>
          )}
          {providerInspection &&
            m.kind !== 'note' &&
            !!(
              m.kind === 'incoming' ||
              m.data.activeProviderIds?.length ||
              m.providerIds?.length
            ) && (
              <ProviderDetails
                message={m}
                apiPath={apiPath}
                language={language}
                formatDate={formatDate}
              />
            )}
        </div>
        {m.state === 'ambiguous' && (
          <p role="alert" className="pm:rounded-md pm:border pm:p-3 pm:text-sm">
            {t.unknown}
          </p>
        )}
        {!!m.data.history?.length && (
          <details className="pm:text-xs">
            <summary className="pm:cursor-pointer pm:font-medium">{t.delivery}</summary>
            <ol className="pm:mt-2 pm:grid pm:gap-2">
              {m.data.history.map((history, index) => (
                <li key={index} className="pm:border-s pm:ps-3">
                  {formatDate(history.at)} · {t[history.state]}
                  {history.code && (
                    <span>
                      {' '}
                      ·{' '}
                      <bdi dir="ltr" className="pm:font-mono">
                        {history.code}
                      </bdi>
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </article>
  )
}
