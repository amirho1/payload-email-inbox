'use client'
import { Button } from './button.js'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '@payloadcms/ui'
import type { Language, Mailbox, MailID, MailRecord } from '../types.js'
import { en, fa } from './translations.js'
import { mailRequest } from './api.js'
import { Composer, button, type ComposeSeed } from './composer.js'
import { Message } from './message.js'

type Conversation = {
  id: MailID
  mailbox: string
  subject: string
  sender: string
  unread: boolean
  status: 'open' | 'closed'
  participants: string[]
}
type Page<T> = {
  docs: T[]
  page: number
  hasNextPage: boolean
  hasPrevPage: boolean
  totalDocs: number
}
type Detail = {
  conversation: Conversation
  messages: Page<MailRecord>
  attachments: { id: MailID; filename: string }[]
}
type Settings = {
  mailboxes: Mailbox[]
  limits: { pollingMs: number }
  language: Language
  timeZone: string
  calendar: string
  numberingSystem: string
}

/** A route-local inbox using Payload's language/session and bounded, hidden-tab-aware polling. */
export function MailInbox({
  apiPath,
  initialLanguage,
}: {
  apiPath: string
  initialLanguage?: Language
}) {
  const { i18n, switchLanguage } = useTranslation()
  const hostLanguage: Language = i18n.language === 'fa' ? 'fa' : 'en'
  const [language, setLanguage] = useState<Language>(initialLanguage ?? hostLanguage)
  const lastHostLanguage = useRef(hostLanguage)
  useEffect(() => {
    if (lastHostLanguage.current !== hostLanguage) {
      lastHostLanguage.current = hostLanguage
      setLanguage(hostLanguage)
    }
  }, [hostLanguage])
  const t = language === 'fa' ? fa : en
  const [settings, setSettings] = useState<Settings>()
  const [settingsError, setSettingsError] = useState('')
  const settingsRequest = useRef(0)
  const [inbox, setInbox] = useState<Page<Conversation>>()
  const [detail, setDetail] = useState<Detail>()
  const [seed, setSeed] = useState<ComposeSeed>()
  const [query, setQuery] = useState({
    search: '',
    mailbox: '',
    status: '',
    unread: false,
    page: 1,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const fail = useCallback(
    (e: unknown) => setError(t[(e as Error).message as keyof typeof t] ?? t.error),
    [t],
  )
  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const p = new URLSearchParams({
        ...query,
        unread: String(query.unread),
        page: String(query.page),
      })
      setInbox(await mailRequest<Page<Conversation>>(`${apiPath}/inbox?${p}`))
    } catch (e) {
      fail(e)
    } finally {
      setLoading(false)
    }
  }, [apiPath, query, fail])
  const loadSettings = useCallback(async () => {
    const request = ++settingsRequest.current
    setSettingsError('')
    try {
      const next = await mailRequest<Settings>(`${apiPath}/config`)
      if (request !== settingsRequest.current) return
      setSettings(next)
      setSettingsError('')
    } catch (e) {
      if (request === settingsRequest.current)
        setSettingsError(t[(e as Error).message as keyof typeof t] ?? t.error)
    }
  }, [apiPath, t])
  useEffect(() => {
    void loadSettings()
  }, [loadSettings])
  useEffect(() => {
    const timer = setTimeout(() => void load(), 250)
    return () => clearTimeout(timer)
  }, [load])
  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      if (!document.hidden && !stopped) {
        await load()
        if (detail)
          try {
            setDetail(
              await mailRequest<Detail>(
                `${apiPath}/conversation/${detail.conversation.id}?page=${detail.messages.page}`,
              ),
            )
          } catch (e) {
            fail(e)
          }
      }
      if (!stopped) timer = setTimeout(() => void poll(), settings?.limits.pollingMs ?? 30000)
    }
    timer = setTimeout(() => void poll(), settings?.limits.pollingMs ?? 30000)
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [
    load,
    apiPath,
    detail?.conversation.id,
    detail?.messages.page,
    settings?.limits.pollingMs,
    fail,
  ])

  const open = async (id: MailID, page = 1) => {
    try {
      const d = await mailRequest<Detail>(`${apiPath}/conversation/${id}?page=${page}`)
      await mailRequest(`${apiPath}/conversation/${id}`, { unread: false })
      setDetail(d)
      setSeed(undefined)
      await load()
      heading.current?.focus()
    } catch (e) {
      fail(e)
    }
  }
  const refresh = async () => {
    if (!settings) await loadSettings()
    await load()
    if (detail)
      setDetail(
        await mailRequest<Detail>(
          `${apiPath}/conversation/${detail.conversation.id}?page=${detail.messages.page}`,
        ),
      )
  }
  const newDraft = () => {
    const box = settings?.mailboxes[0]
    if (!box) return
    setSeed({
      mailbox: box.key,
      kind: 'outgoing',
      action: 'compose',
      from: box.address,
      to: [],
      cc: [],
      bcc: [],
      subject: '',
      text: '',
      attachments: [],
    })
  }
  const act = (action: 'reply' | 'replyAll' | 'forward' | 'compose', m: MailRecord) => {
    const box = settings!.mailboxes.find((b) => b.key === m.mailbox)!
    if (action === 'compose') {
      setSeed({
        ...m.data,
        mailbox: m.mailbox,
        conversation: m.conversation,
        kind: m.kind === 'note' ? 'note' : 'outgoing',
        action: 'compose',
        id: m.id,
      })
      return
    }
    const own = [box.address, ...(box.allowedFrom ?? [])]
    const targets = own.includes(m.data.from) ? m.data.to : [m.data.replyTo || m.data.from]
    setSeed({
      mailbox: box.key,
      conversation: m.conversation,
      kind: 'outgoing',
      action,
      replyToMessage: m.id,
      from: box.address,
      to: action === 'forward' ? [] : targets.filter((a) => !own.includes(a)),
      cc:
        action === 'replyAll'
          ? [...new Set([...m.data.to, ...m.data.cc])].filter(
              (a) => !own.includes(a) && !targets.includes(a),
            )
          : [],
      bcc: [],
      subject: `${action === 'forward' ? 'Fwd:' : 'Re:'} ${m.data.subject}`,
      text:
        action === 'forward'
          ? `---------- ${t.forwarded} ----------\n${m.data.from}\n${m.data.subject}\n\n${m.data.text}`
          : '',
      attachments: action === 'forward' ? m.data.attachments : [],
    })
  }
  const changeConversation = async (patch: object) => {
    if (!detail) return
    try {
      await mailRequest(`${apiPath}/conversation/${detail.conversation.id}`, patch)
      await refresh()
    } catch (e) {
      fail(e)
    }
  }
  const retry = async (id: MailID) => {
    try {
      await mailRequest(`${apiPath}/send/${id}`, {})
      await refresh()
    } catch (e) {
      fail(e)
    }
  }
  const date = (value: string) =>
    new Intl.DateTimeFormat(language, {
      timeZone: settings?.timeZone ?? 'UTC',
      calendar: settings?.calendar ?? 'gregory',
      numberingSystem: settings?.numberingSystem ?? 'latn',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  return (
    <main
      className="payload-mail pm:mx-auto pm:grid pm:w-full pm:max-w-6xl pm:gap-5 pm:p-3 pm:sm:p-6"
      dir={language === 'fa' ? 'rtl' : 'ltr'}
      lang={language}
    >
      <header className="pm:flex pm:flex-wrap pm:items-center pm:justify-between pm:gap-3">
        <h1 ref={heading} tabIndex={-1} className="pm:m-0 pm:text-3xl">
          {t.title}
        </h1>
        <label>
          {t.language}
          <select
            className={button}
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value as Language)
              void switchLanguage?.(e.target.value as Language)
            }}
          >
            <option value="en">English</option>
            <option value="fa">فارسی</option>
          </select>
        </label>
        <Button className={button} onClick={newDraft} disabled={!settings?.mailboxes.length}>
          {t.compose}
        </Button>
      </header>
      {error && <p role="alert">{error}</p>}
      {settingsError && <p role="alert">{settingsError}</p>}
      <div role="status" aria-live="polite">
        {loading || (!settings && !settingsError) ? t.loading : ''}
      </div>
      {!detail && (
        <>
          <form
            className="pm:grid pm:gap-3 pm:sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              void refresh()
            }}
          >
            <label>
              {t.search}
              <input
                className="pm:min-h-11 pm:w-full pm:px-3 pm:text-base"
                value={query.search}
                onChange={(e) => setQuery({ ...query, search: e.target.value, page: 1 })}
              />
            </label>
            <label>
              {t.all}
              <select
                className="pm:min-h-11 pm:w-full pm:px-3 pm:text-base"
                value={query.mailbox}
                onChange={(e) => setQuery({ ...query, mailbox: e.target.value, page: 1 })}
              >
                <option value="">{t.all}</option>
                {settings?.mailboxes.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.status}
              <select
                className={button}
                value={query.status}
                onChange={(e) => setQuery({ ...query, status: e.target.value, page: 1 })}
              >
                <option value="">{t.all}</option>
                <option value="open">{t.open}</option>
                <option value="closed">{t.closed}</option>
              </select>
            </label>
            <label className="pm:flex pm:min-h-11 pm:items-center pm:gap-2">
              <input
                type="checkbox"
                checked={query.unread}
                onChange={(e) => setQuery({ ...query, unread: e.target.checked, page: 1 })}
              />
              {t.unread}
            </label>
            <Button className={button} type="submit">
              {t.refresh}
            </Button>
          </form>
          <section aria-label={t.inbox} className="pm:grid pm:gap-3">
            {inbox?.docs.length === 0 && <p>{t.empty}</p>}
            {inbox?.docs.map((c) => (
              <Button
                key={c.id}
                className={`${button} pm:grid pm:w-full pm:gap-2 pm:p-4 pm:text-start`}
                disabled={!settings}
                onClick={() => void open(c.id)}
              >
                <strong dir="auto">{c.subject || t.noSubject}</strong>
                <bdi dir="ltr" className="pm:break-all">
                  {c.sender}
                </bdi>
                <span>
                  {c.unread ? t.unread : t.read} · {t[c.status]}
                </span>
              </Button>
            ))}
          </section>
          <nav aria-label={t.page} className="pm:flex pm:gap-3">
            <Button
              className={button}
              disabled={!inbox?.hasPrevPage}
              onClick={() => setQuery({ ...query, page: query.page - 1 })}
            >
              {t.previous}
            </Button>
            <span>
              {t.page} {inbox?.page ?? 1}
            </span>
            <Button
              className={button}
              disabled={!inbox?.hasNextPage}
              onClick={() => setQuery({ ...query, page: query.page + 1 })}
            >
              {t.next}
            </Button>
          </nav>
        </>
      )}
      {detail && (
        <>
          <div className="pm:flex pm:flex-wrap pm:gap-2">
            <Button
              className={button}
              onClick={() => {
                setDetail(undefined)
                setSeed(undefined)
              }}
            >
              {t.back}
            </Button>
            <Button
              className={button}
              onClick={() =>
                void changeConversation({
                  status: detail.conversation.status === 'open' ? 'closed' : 'open',
                })
              }
            >
              {detail.conversation.status === 'open' ? t.close : t.reopen}
            </Button>
            <Button className={button} onClick={() => void changeConversation({ unread: true })}>
              {t.markUnread}
            </Button>
            <Button
              className={button}
              onClick={() => {
                const box = settings!.mailboxes.find((b) => b.key === detail.conversation.mailbox)!
                setSeed({
                  mailbox: box.key,
                  conversation: detail.conversation.id,
                  kind: 'note',
                  action: 'compose',
                  from: box.address,
                  to: [],
                  cc: [],
                  bcc: [],
                  subject: detail.conversation.subject,
                  text: '',
                  attachments: [],
                })
              }}
            >
              {t.addNote}
            </Button>
          </div>
          <h2 dir="auto" className="pm:m-0 pm:break-words pm:text-2xl">
            {detail.conversation.subject}
          </h2>
          <p>
            {t.participants}:{' '}
            <bdi dir="ltr" className="pm:break-all">
              {detail.conversation.participants.join(', ')}
            </bdi>
          </p>
          {detail.messages.docs.map((m) => (
            <Message
              key={m.id}
              message={m}
              files={detail.attachments.filter((a) =>
                m.data.attachments.map(String).includes(String(a.id)),
              )}
              apiPath={apiPath}
              language={language}
              formatDate={date}
              act={act}
              retry={retry}
            />
          ))}
          <nav aria-label={t.more} className="pm:flex pm:gap-3">
            <Button
              className={button}
              disabled={!detail.messages.hasPrevPage}
              onClick={() => void open(detail.conversation.id, detail.messages.page - 1)}
            >
              {t.previous}
            </Button>
            <Button
              className={button}
              disabled={!detail.messages.hasNextPage}
              onClick={() => void open(detail.conversation.id, detail.messages.page + 1)}
            >
              {t.next}
            </Button>
          </nav>
        </>
      )}
      {seed && settings && (
        <Composer
          key={`${seed.id ?? 'new'}:${seed.action}:${seed.replyToMessage ?? ''}:${seed.kind}`}
          seed={seed}
          boxes={settings.mailboxes}
          apiPath={apiPath}
          language={language}
          onDone={refresh}
          onCancel={() => setSeed(undefined)}
        />
      )}
    </main>
  )
}
