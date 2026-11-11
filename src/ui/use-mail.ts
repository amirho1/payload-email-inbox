'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation, toast } from '@payloadcms/ui'
import type {
  Language,
  Mailbox,
  MailID,
  MailRecord,
  MailFolder,
  MailCounts,
  DeliveryState,
} from '../types.js'
import { en, fa } from './translations.js'
import { mailRequest } from './api.js'
import type { ComposeSeed } from './composer.js'

export type Conversation = {
  id: MailID
  mailbox: string
  subject: string
  sender: string
  unread: boolean
  status: 'open' | 'closed'
  participants: string[]
  conversationId: MailID
  messageId?: MailID
  preview: string
  fromName?: string
  recipient: string
  state?: DeliveryState
  kind?: MailRecord['kind']
  timestamp: string
  hasAttachments: boolean
}
export type Page<T> = {
  docs: T[]
  page: number
  hasNextPage: boolean
  hasPrevPage: boolean
  totalDocs: number
}
export type Detail = {
  conversation: Conversation
  messages: Page<MailRecord>
  attachments: { id: MailID; filename: string }[]
}
export type Settings = {
  mailboxes: Mailbox[]
  providers?: { key: string; label: string; inspect: boolean; managementURL?: string }[]
  limits: { pollingMs: number; attachmentBytes: number; attachmentCount: number; textBytes: number }
  language: Language
  timeZone: string
  calendar: string
  numberingSystem: string
}

/** A route-local inbox using Payload's language/session and bounded, hidden-tab-aware polling. */
export function useMail({
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
  const [selectedItem, setSelectedItem] = useState<string>()
  const [counts, setCounts] = useState<MailCounts>()
  const [opening, setOpening] = useState(false)
  const listRequest = useRef(0)
  const detailRequest = useRef(0)
  const [seed, setSeed] = useState<ComposeSeed>()
  const [query, setQuery] = useState({
    folder: 'inbox' as MailFolder,
    search: '',
    sender: '',
    recipient: '',
    after: '',
    before: '',
    delivery: '',
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
    const request = ++listRequest.current
    setError('')
    setLoading(true)
    try {
      const p = new URLSearchParams({
        ...query,
        unread: String(query.unread),
        page: String(query.page),
      })
      const next = await mailRequest<Page<Conversation>>(`${apiPath}/inbox?${p}`)
      if (request === listRequest.current) setInbox(next)
    } catch (e) {
      if (request === listRequest.current) fail(e)
    } finally {
      if (request === listRequest.current) setLoading(false)
    }
  }, [apiPath, query, fail])
  const loadCounts = useCallback(async () => {
    try {
      setCounts(
        await mailRequest<MailCounts>(
          `${apiPath}/counts?mailbox=${encodeURIComponent(query.mailbox)}`,
        ),
      )
    } catch (e) {
      fail(e)
    }
  }, [apiPath, query.mailbox, fail])
  useEffect(() => {
    void loadCounts()
  }, [loadCounts])
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
        await loadCounts()
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
    loadCounts,
    apiPath,
    detail?.conversation.id,
    detail?.messages.page,
    settings?.limits.pollingMs,
    fail,
  ])

  const open = async (id: MailID, page = 1) => {
    const request = ++detailRequest.current
    setOpening(true)
    try {
      const d = await mailRequest<Detail>(`${apiPath}/conversation/${id}?page=${page}`)
      if (request !== detailRequest.current) return
      await mailRequest(`${apiPath}/conversation/${id}`, { unread: false })
      setDetail(d)
      setSeed(undefined)
      await load()
      heading.current?.focus()
      void loadCounts()
      return d
    } catch (e) {
      if (request === detailRequest.current) fail(e)
    } finally {
      if (request === detailRequest.current) setOpening(false)
    }
  }
  const refresh = async () => {
    if (!settings) await loadSettings()
    await Promise.all([load(), loadCounts()])
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
        from: m.data.from,
        to: m.data.to,
        cc: m.data.cc,
        bcc: m.data.bcc,
        subject: m.data.subject,
        text: m.data.text,
        html: m.data.html,
        attachments: m.data.attachments,
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
      toast.success(t.updated)
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
  const changeLanguage = (value: Language) => {
    setLanguage(value)
    void switchLanguage?.(value)
  }
  const back = () => {
    ++detailRequest.current
    setOpening(false)
    setDetail(undefined)
    setSelectedItem(undefined)
    setSeed(undefined)
  }
  const addNote = () => {
    if (!detail || !settings) return
    const box = settings.mailboxes.find((b) => b.key === detail.conversation.mailbox)!
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
  }
  return {
    selectedItem,
    setSelectedItem,
    language,
    t,
    settings,
    settingsError,
    inbox,
    detail,
    seed,
    setSeed,
    query,
    setQuery,
    counts,
    error,
    loading,
    opening,
    heading,
    open,
    refresh,
    newDraft,
    act,
    changeConversation,
    retry,
    date,
    changeLanguage,
    back,
    addNote,
    fail,
  }
}
