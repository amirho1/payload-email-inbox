'use client'
import { Button } from './button.js'
import React, { useState } from 'react'
import type { Language, MailRecord, MailID } from '../types.js'
import { en, fa } from './translations.js'
import { mailRequest } from './api.js'
import { button } from './composer.js'

/** Email HTML is opt-in, sanitized on the server, and sandboxed without same-origin/scripts. */
export function Message({
  message: m,
  files,
  apiPath,
  language,
  formatDate,
  act,
  retry,
}: {
  message: MailRecord
  files: { id: MailID; filename: string }[]
  apiPath: string
  language: Language
  formatDate: (date: string) => string
  act: (action: 'reply' | 'replyAll' | 'forward' | 'compose', m: MailRecord) => void
  retry: (id: MailID) => Promise<void>
}) {
  const t = language === 'fa' ? fa : en
  const [html, setHtml] = useState<string>()
  const [error, setError] = useState('')
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
  return (
    <article
      className={`pm:grid pm:gap-3 pm:rounded-xl pm:border pm:border-current pm:p-4 ${m.kind === 'note' ? 'pm:border-dashed pm:bg-[var(--theme-elevation-100)]' : 'pm:border-solid'}`}
      aria-label={m.kind === 'note' ? t.note : t[m.kind]}
    >
      <header className="pm:flex pm:flex-wrap pm:justify-between pm:gap-2">
        <strong>
          {m.kind === 'note' ? (
            t.note
          ) : (
            <>
              <span dir="auto">{m.data.fromName}</span> <bdi dir="ltr">{m.data.from}</bdi>
            </>
          )}
        </strong>
        <time dateTime={m.createdAt}>{formatDate(m.createdAt)}</time>
      </header>
      {m.kind !== 'note' && (
        <>
          <p className="pm:m-0">
            {t.to}: <bdi dir="ltr">{m.data.to.join(', ')}</bdi>
            {m.data.cc.length > 0 && (
              <>
                {' '}
                · {t.cc}: <bdi dir="ltr">{m.data.cc.join(', ')}</bdi>
              </>
            )}
          </p>
          <p className="pm:m-0" role="status">
            {t.status}: {t[m.state]} · {t.attempt}: {m.attempts ?? 0}
          </p>
        </>
      )}
      {(m.data.bounce || (m.data.autoSubmitted && m.data.autoSubmitted !== 'no')) && (
        <p>{t.automatic}</p>
      )}
      <pre dir="auto" className="pm:m-0 pm:text-base">
        {m.data.text}
      </pre>
      {m.data.html && (
        <div className="pm:flex pm:flex-wrap pm:gap-2">
          <Button className={button} onClick={() => void showHtml()}>
            {t.html}
          </Button>
          {html && (
            <>
              <Button className={button} onClick={() => void showHtml(true)}>
                {t.images}
              </Button>
              <Button className={button} onClick={() => setHtml(undefined)}>
                {t.plain}
              </Button>
            </>
          )}
        </div>
      )}
      {html && <iframe title={t.html} sandbox="" referrerPolicy="no-referrer" srcDoc={html} />}
      {error && <p role="alert">{error}</p>}
      {files.length > 0 && (
        <ul aria-label={t.attachments}>
          {files.map((file) => (
            <li key={file.id}>
              <a href={`${apiPath}/attachment/${file.id}`} download>
                {file.filename}
              </a>
            </li>
          ))}
        </ul>
      )}
      {m.kind !== 'note' && m.state !== 'draft' && (
        <div className="pm:flex pm:flex-wrap pm:gap-2">
          {(['reply', 'replyAll', 'forward'] as const).map((action) => (
            <Button className={button} key={action} onClick={() => act(action, m)}>
              {t[action]}
            </Button>
          ))}
        </div>
      )}
      {m.state === 'draft' && (
        <Button className={button} onClick={() => act('compose', m)}>
          {t.draft}
        </Button>
      )}
      {m.state === 'failed' && m.kind === 'outgoing' && (
        <Button className={button} onClick={() => void retry(m.id)}>
          {t.retry}
        </Button>
      )}
      {m.state === 'ambiguous' && <p role="alert">{t.unknown}</p>}
      {!!m.data.history?.length && (
        <details>
          <summary>{t.delivery}</summary>
          <ul>
            {m.data.history.map((h, i) => (
              <li key={i}>
                {formatDate(h.at)} · {t[h.state]}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  )
}
