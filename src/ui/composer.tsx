'use client'
import React, { useRef, useState } from 'react'
import { toast } from '@payloadcms/ui'
import { Code2, Paperclip, Save, Send, X } from 'lucide-react'
import type { Language, Mailbox, MailRecord, MailID, Limits } from '../types.js'
import { en, fa } from './translations.js'
import { mailRequest } from './api.js'
import { Button } from './components/button.js'
import { Input } from './components/input.js'
import { Textarea } from './components/textarea.js'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/tabs.js'
import { Badge } from './components/badge.js'
import { Choice, IconButton } from './controls.js'

export type ComposeSeed = {
  mailbox: string
  conversation?: MailID
  kind: 'outgoing' | 'note'
  action: 'compose' | 'reply' | 'replyAll' | 'forward'
  replyToMessage?: MailID
  to: string[]
  cc: string[]
  bcc: string[]
  from: string
  subject: string
  text: string
  html?: string
  attachments: MailID[]
  id?: MailID
}

/** Shared inline/modal composer: persisted draft identity and uploaded IDs survive retries. */
export function Composer({
  seed,
  boxes,
  apiPath,
  language,
  onDone,
  onCancel,
  compact = false,
  limits,
  existingAttachments = [],
}: {
  seed: ComposeSeed
  boxes: Mailbox[]
  apiPath: string
  language: Language
  onDone: () => Promise<void>
  onCancel: () => void
  compact?: boolean
  limits?: Pick<Limits, 'attachmentBytes' | 'attachmentCount' | 'textBytes'>
  existingAttachments?: { id: MailID; filename: string }[]
}) {
  const t = language === 'fa' ? fa : en
  const [draft, setDraft] = useState(seed)
  const [recipientText, setRecipientText] = useState({
    to: seed.to.join(', '),
    cc: seed.cc.join(', '),
    bcc: seed.bcc.join(', '),
  })
  const [id, setId] = useState(seed.id)
  const [expanded, setExpanded] = useState(!compact)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState(false)
  const [preview, setPreview] = useState<string>()
  const [files, setFiles] = useState<File[]>([])
  const fileInput = useRef<HTMLInputElement>(null)
  const uploaded = useRef(new Map<File, MailID>())
  const key = useRef(crypto.randomUUID())
  const lock = useRef(false)
  const box = boxes.find((box) => box.key === draft.mailbox)!
  const update = (name: string, value: unknown) =>
    setDraft((current) => ({ ...current, [name]: value }))

  async function save(send: boolean, htmlPreview = false) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError(false)
    setNotice('')
    try {
      if (
        files.length + draft.attachments.length > (limits?.attachmentCount ?? 5) ||
        files.some((file) => file.size > (limits?.attachmentBytes ?? 4 * 1024 * 1024))
      )
        throw new Error('attachmentLimit')
      const attachments = [...draft.attachments]
      for (const file of files) {
        let attachmentId = uploaded.current.get(file)
        if (!attachmentId) {
          const bytes = new Uint8Array(await file.arrayBuffer())
          let binary = ''
          for (const byte of bytes) binary += String.fromCharCode(byte)
          attachmentId = (
            await mailRequest<{ id: MailID }>(`${apiPath}/attachment`, {
              mailbox: draft.mailbox,
              filename: file.name,
              contentType: file.type || 'application/octet-stream',
              data: btoa(binary),
            })
          ).id
          uploaded.current.set(file, attachmentId)
        }
        if (!attachments.some((id) => String(id) === String(attachmentId)))
          attachments.push(attachmentId)
      }
      const body = {
        mailbox: draft.mailbox,
        conversation: draft.conversation,
        kind: draft.kind,
        action: draft.action,
        replyToMessage: draft.replyToMessage,
        from: draft.from,
        to: draft.to,
        cc: draft.cc,
        bcc: draft.bcc,
        subject: draft.subject,
        text: draft.text,
        html: draft.html,
      }
      const saved = await mailRequest<MailRecord>(
        `${apiPath}/draft${id ? `/${id}` : ''}`,
        { ...body, attachments },
        key.current,
      )
      setId(saved.id)
      setDraft((current) => ({ ...current, attachments }))
      setFiles([])
      uploaded.current.clear()
      if (fileInput.current) fileInput.current.value = ''
      if (send && draft.kind === 'outgoing') await mailRequest(`${apiPath}/send/${saved.id}`, {})
      if (htmlPreview)
        setPreview((await mailRequest<{ html: string }>(`${apiPath}/html/${saved.id}`)).html)
      const message = send ? t.queued : t.saved
      setNotice(message)
      toast.success(message)
      await onDone()
      if (send) onCancel()
    } catch (error) {
      const message = t[(error as Error).message as keyof typeof t] || t.error
      setError(true)
      setNotice(message)
      toast.error(message)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  return (
    <form
      aria-label={draft.kind === 'note' ? t.note : t.compose}
      className="pm:grid pm:min-w-0 pm:gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void save(false)
      }}
    >
      {draft.kind === 'note' && (
        <Badge variant="secondary" className="pm:w-fit">
          {t.note}
        </Badge>
      )}
      {compact && (
        <Button
          type="button"
          variant="ghost"
          className="pm:h-auto pm:justify-start pm:whitespace-normal pm:px-0 pm:py-1 pm:text-xs pm:text-muted-foreground"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {t.envelope}:{' '}
          <bdi dir="ltr" className="pm:break-all">
            {recipientText.to}
          </bdi>
        </Button>
      )}
      {expanded && (
        <div className="pm:grid pm:gap-3">
          <Choice
            label={t.selectMailbox}
            value={draft.mailbox}
            disabled={!!draft.conversation || !!id}
            onChange={(value) => {
              const selected = boxes.find((box) => box.key === value)!
              setDraft((current) => ({ ...current, mailbox: value, from: selected.address }))
            }}
            options={boxes.map((box) => ({ value: box.key, label: box.name }))}
          />
          {draft.kind !== 'note' && (
            <>
              <Choice
                label={t.from}
                value={draft.from}
                onChange={(value) => update('from', value)}
                options={[box.address, ...(box.allowedFrom || [])].map((value) => ({
                  value,
                  label: value,
                }))}
              />
              {(['to', 'cc', 'bcc'] as const).map((name) => (
                <label key={name} className="pm:grid pm:gap-1.5 pm:text-sm">
                  {t[name]}
                  <Input
                    dir="ltr"
                    value={recipientText[name]}
                    autoComplete="off"
                    onChange={(event) => {
                      const value = event.target.value
                      setRecipientText((current) => ({ ...current, [name]: value }))
                      update(
                        name,
                        value
                          .split(',')
                          .map((value) => value.trim())
                          .filter(Boolean),
                      )
                    }}
                  />
                </label>
              ))}
              <label className="pm:grid pm:gap-1.5 pm:text-sm">
                {t.subject}
                <Input
                  dir="auto"
                  value={draft.subject}
                  maxLength={998}
                  onChange={(event) => update('subject', event.target.value)}
                />
              </label>
            </>
          )}
        </div>
      )}
      <Tabs defaultValue="text" className="pm:min-w-0">
        <TabsList className={compact || draft.kind === 'note' ? 'pm:sr-only' : ''}>
          <TabsTrigger value="text">{t.plain}</TabsTrigger>
          {draft.kind !== 'note' && (
            <TabsTrigger value="html">
              <Code2 className="pm:me-2 pm:size-3.5" aria-hidden="true" />
              {t.htmlSource}
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="text">
          <label className="pm:grid pm:gap-2">
            <span className={compact ? 'pm:sr-only' : 'pm:text-sm'}>{t.text}</span>
            <Textarea
              dir="auto"
              aria-label={t.text}
              placeholder={compact ? t.replyPlaceholder : undefined}
              autoFocus={compact}
              className={compact ? 'pm:min-h-28' : 'pm:min-h-48'}
              value={draft.text}
              maxLength={limits?.textBytes ?? 256 * 1024}
              onChange={(event) => update('text', event.target.value)}
            />
          </label>
        </TabsContent>
        {draft.kind !== 'note' && (
          <TabsContent value="html" className="pm:grid pm:gap-3">
            <p className="pm:text-xs pm:text-muted-foreground">{t.htmlHelp}</p>
            <label className="pm:grid pm:gap-2">
              <span className="pm:text-sm">{t.htmlSource}</span>
              <Textarea
                dir="ltr"
                aria-label={t.htmlSource}
                className="pm:min-h-48 pm:font-mono"
                value={draft.html || ''}
                maxLength={limits?.textBytes ?? 256 * 1024}
                onChange={(event) => update('html', event.target.value)}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              disabled={busy || !draft.html}
              onClick={() => void save(false, true)}
            >
              {t.savePreview}
            </Button>
            {preview && (
              <iframe title={t.preview} sandbox="" referrerPolicy="no-referrer" srcDoc={preview} />
            )}
          </TabsContent>
        )}
      </Tabs>
      <Input
        ref={fileInput}
        type="file"
        multiple
        hidden
        aria-label={t.attach}
        className="pm:sr-only"
        onChange={(event) => {
          const selected = Array.from(event.target.files || [])
          if (
            selected.length + draft.attachments.length > (limits?.attachmentCount ?? 5) ||
            selected.some((file) => file.size > (limits?.attachmentBytes ?? 4 * 1024 * 1024))
          ) {
            setError(true)
            setNotice(t.attachmentLimit)
            event.target.value = ''
            return
          }
          setFiles(selected)
          setError(false)
          setNotice('')
        }}
      />
      {(files.length > 0 || draft.attachments.length > 0) && (
        <ul aria-label={t.attachments} className="pm:grid pm:gap-2">
          {draft.attachments.map((attachmentId) => (
            <li
              key={String(attachmentId)}
              className="pm:flex pm:min-w-0 pm:items-center pm:gap-2 pm:rounded-md pm:border pm:px-3 pm:py-1"
            >
              <Paperclip className="pm:size-3.5 pm:shrink-0" aria-hidden="true" />
              <span dir="auto" className="pm:min-w-0 pm:flex-1 pm:truncate pm:text-xs">
                {existingAttachments.find((file) => String(file.id) === String(attachmentId))
                  ?.filename || `${t.attachments} ${attachmentId}`}
              </span>
              <IconButton
                icon={X}
                label={t.removeAttachment}
                disabled={busy}
                onClick={() =>
                  update(
                    'attachments',
                    draft.attachments.filter((id) => String(id) !== String(attachmentId)),
                  )
                }
              />
            </li>
          ))}
          {files.map((file) => (
            <li
              key={`${file.name}:${file.lastModified}`}
              className="pm:flex pm:min-w-0 pm:items-center pm:gap-2 pm:rounded-md pm:border pm:px-3 pm:py-1"
            >
              <Paperclip className="pm:size-3.5 pm:shrink-0" aria-hidden="true" />
              <span dir="auto" className="pm:min-w-0 pm:flex-1 pm:truncate pm:text-xs">
                {file.name}
              </span>
              <span className="pm:text-xs pm:text-muted-foreground">
                {file.size} {t.bytes}
              </span>
              <IconButton
                icon={X}
                label={t.removeAttachment}
                disabled={busy}
                onClick={() => setFiles((current) => current.filter((item) => item !== file))}
              />
            </li>
          ))}
        </ul>
      )}
      <div className="pm:flex pm:flex-wrap pm:items-center pm:justify-between pm:gap-2">
        <div className="pm:flex pm:items-center pm:gap-1">
          <IconButton
            icon={Paperclip}
            label={t.attach}
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          />
          <Button type="button" variant="ghost" disabled={busy} onClick={() => void save(false)}>
            <Save className="pm:size-4" aria-hidden="true" />
            {t.save}
          </Button>
        </div>
        <div className="pm:flex pm:gap-2">
          <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
            {t.cancel}
          </Button>
          {draft.kind !== 'note' && (
            <Button
              type="button"
              disabled={busy || !draft.to.length || (!draft.text.trim() && !draft.html?.trim())}
              onClick={() => void save(true)}
            >
              <Send className="pm:size-4 pm:rtl:rotate-180" aria-hidden="true" />
              {busy ? t.loading : t.send}
            </Button>
          )}
        </div>
      </div>
      {notice && (
        <p role={error ? 'alert' : 'status'} className="pm:text-sm">
          {notice}
        </p>
      )}
      {draft.kind !== 'note' && !compact && (
        <p className="pm:text-xs pm:text-muted-foreground">{t.sendHelp}</p>
      )}
    </form>
  )
}
