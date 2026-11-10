'use client'
import React, { useRef, useState } from 'react'
import type { Language, Mailbox, MailRecord, MailID } from '../types.js'
import { en, fa } from './translations.js'
import { mailRequest } from './api.js'

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
  attachments: MailID[]
  id?: MailID
}
const field = 'pm:w-full pm:min-h-11 pm:px-3 pm:py-2 pm:text-base'
export { button } from './button.js'
import { Button, button } from './button.js'

/** Plain-text composer keeps draft identity stable across retries and rapid clicks. */
export function Composer({
  seed,
  boxes,
  apiPath,
  language,
  onDone,
  onCancel,
}: {
  seed: ComposeSeed
  boxes: Mailbox[]
  apiPath: string
  language: Language
  onDone: () => Promise<void>
  onCancel: () => void
}) {
  const t = language === 'fa' ? fa : en
  const [draft, setDraft] = useState(seed)
  const [recipientText, setRecipientText] = useState({
    to: seed.to.join(', '),
    cc: seed.cc.join(', '),
    bcc: seed.bcc.join(', '),
  })
  const [id, setId] = useState(seed.id)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const key = useRef(crypto.randomUUID())
  const lock = useRef(false)
  const [files, setFiles] = useState<File[]>([])
  const box = boxes.find((b) => b.key === draft.mailbox)!
  const update = (name: string, value: unknown) => setDraft((d) => ({ ...d, [name]: value }))

  async function save(send: boolean) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setNotice('')
    try {
      const attachments = [...draft.attachments]
      for (const file of files) {
        const buffer = new Uint8Array(await file.arrayBuffer())
        let binary = ''
        for (const b of buffer) binary += String.fromCharCode(b)
        attachments.push(
          (
            await mailRequest<{ id: MailID }>(`${apiPath}/attachment`, {
              mailbox: draft.mailbox,
              filename: file.name,
              contentType: file.type || 'application/octet-stream',
              data: btoa(binary),
            })
          ).id,
        )
      }
      setFiles([])
      setDraft((d) => ({ ...d, attachments }))
      const { id: _id, ...body } = draft
      void _id
      const saved = await mailRequest<MailRecord>(
        `${apiPath}/draft${id ? `/${id}` : ''}`,
        { ...body, attachments },
        key.current,
      )
      setId(saved.id)
      if (send && draft.kind === 'outgoing') await mailRequest(`${apiPath}/send/${saved.id}`, {})
      setNotice(send ? t.queued : t.saved)
      await onDone()
      if (send) onCancel()
    } catch (error) {
      setNotice(t[(error as Error).message as keyof typeof t] ?? t.error)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  return (
    <form
      aria-label={draft.kind === 'note' ? t.note : t.compose}
      className="pm:grid pm:gap-4 pm:rounded-xl pm:border pm:border-solid pm:border-current pm:p-4"
      onSubmit={(event) => {
        event.preventDefault()
        void save(false)
      }}
    >
      <h2 className="pm:m-0 pm:text-xl">{draft.kind === 'note' ? t.note : t.compose}</h2>
      <label>
        {t.all}
        <select
          className={field}
          value={draft.mailbox}
          disabled={!!draft.conversation || !!id}
          onChange={(e) => {
            const b = boxes.find((b) => b.key === e.target.value)!
            setDraft((d) => ({ ...d, mailbox: b.key, from: b.address }))
          }}
        >
          {boxes.map((b) => (
            <option key={b.key} value={b.key}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      {draft.kind !== 'note' && (
        <>
          <label>
            {t.from}
            <select
              dir="ltr"
              className={field}
              value={draft.from}
              onChange={(e) => update('from', e.target.value)}
            >
              {[box.address, ...(box.allowedFrom ?? [])].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          {(['to', 'cc', 'bcc'] as const).map((name) => (
            <label key={name}>
              {t[name]}
              <input
                className={field}
                dir="ltr"
                value={recipientText[name]}
                onChange={(e) => {
                  setRecipientText((value) => ({ ...value, [name]: e.target.value }))
                  update(
                    name,
                    e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }}
                autoComplete="off"
              />
            </label>
          ))}
          <label>
            {t.subject}
            <input
              className={field}
              dir="auto"
              maxLength={998}
              value={draft.subject}
              onChange={(e) => update('subject', e.target.value)}
            />
          </label>
        </>
      )}
      <label>
        {t.text}
        <textarea
          aria-label={t.text}
          className={`${field} pm:min-h-48 pm:resize-y`}
          dir="auto"
          value={draft.text}
          onChange={(e) => update('text', e.target.value)}
          required
        />
      </label>
      <label>
        {t.attach}
        <input
          className={field}
          type="file"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
      </label>
      <div className="pm:flex pm:flex-wrap pm:gap-2">
        <Button className={button} type="submit" disabled={busy}>
          {t.save}
        </Button>
        {draft.kind !== 'note' && (
          <Button className={button} type="button" disabled={busy} onClick={() => void save(true)}>
            {t.send}
          </Button>
        )}
        <Button className={button} type="button" disabled={busy} onClick={onCancel}>
          {t.cancel}
        </Button>
      </div>
      <p role="status" aria-live="polite">
        {notice || (busy ? t.loading : draft.kind !== 'note' ? t.sendHelp : t.note)}
      </p>
    </form>
  )
}
