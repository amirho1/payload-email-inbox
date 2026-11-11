'use client'
import React, { useState } from 'react'
import { RefreshCw, Server } from 'lucide-react'
import type { Language, MailRecord, ProviderInspection } from '../types.js'
import { en, fa } from './translations.js'
import { mailRequest } from './api.js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './components/dialog.js'
import { Badge } from './components/badge.js'
import { IconButton } from './controls.js'

/** Explicit inspection is scoped to an owned application message, never a client-supplied Postal ID. */
export function ProviderDetails({
  message,
  apiPath,
  language,
  formatDate,
}: {
  message: MailRecord
  apiPath: string
  language: Language
  formatDate: (date: string) => string
}) {
  const t = language === 'fa' ? fa : en
  const [details, setDetails] = useState<ProviderInspection>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setDetails(await mailRequest<ProviderInspection>(`${apiPath}/provider/${message.id}`, {}))
    } catch {
      setError(t.providerUnavailable)
    } finally {
      setLoading(false)
    }
  }
  const label = (value: string, incoming = false) =>
    ({
      Sent: incoming ? t.incoming : t['delivered-to-recipient-server'],
      SoftFail: t.delayed,
      HardFail: t.failed,
      Held: t.held,
      Bounced: t.bounced,
      Processed: t['provider-accepted'],
      Pending: t.queued,
    })[value] || value
  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) void load()
      }}
    >
      <DialogTrigger asChild>
        <IconButton icon={Server} label={t.inspectProvider} />
      </DialogTrigger>
      <DialogContent className="pm:max-h-[90dvh] pm:w-[calc(100%-2rem)] pm:max-w-2xl pm:overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.providerDetails}</DialogTitle>
          <DialogDescription>{t.providerHelp}</DialogDescription>
        </DialogHeader>
        <div className="pm:flex pm:justify-end">
          <IconButton
            icon={RefreshCw}
            label={t.refresh}
            disabled={loading}
            onClick={() => void load()}
          />
        </div>
        {loading && <p role="status">{t.loading}</p>}
        {error && <p role="alert">{error}</p>}
        {details?.messages.map((provider) => (
          <section key={provider.id} className="pm:grid pm:gap-3 pm:rounded-lg pm:border pm:p-4">
            <div className="pm:flex pm:flex-wrap pm:items-center pm:gap-2">
              <Badge variant="secondary">
                {label(provider.status, provider.direction === 'incoming')}
              </Badge>
              <code dir="ltr" className="pm:text-xs">
                #{provider.id}
              </code>
              {provider.held && <Badge variant="outline">{t.held}</Badge>}
            </div>
            {provider.size !== undefined && (
              <p className="pm:text-xs pm:text-muted-foreground">
                {provider.size} {t.bytes}
              </p>
            )}
            <h3 className="pm:text-sm pm:font-semibold">{t.delivery}</h3>
            {!provider.deliveries.length && (
              <p className="pm:text-sm pm:text-muted-foreground">{t.noDeliveries}</p>
            )}
            <ol className="pm:grid pm:gap-3">
              {provider.deliveries.map((delivery, index) => (
                <li
                  key={`${delivery.timestamp}:${index}`}
                  className="pm:grid pm:gap-1 pm:border-s-2 pm:ps-3 pm:text-sm"
                >
                  <div className="pm:flex pm:flex-wrap pm:gap-2">
                    <strong>{label(delivery.status, provider.direction === 'incoming')}</strong>
                    <time dateTime={new Date(delivery.timestamp * 1000).toISOString()}>
                      {formatDate(new Date(delivery.timestamp * 1000).toISOString())}
                    </time>
                    {delivery.tls && <Badge variant="outline">{t.tls}</Badge>}
                  </div>
                  {delivery.smtpCode && (
                    <p>
                      {t.smtp}: <code dir="ltr">{delivery.smtpCode}</code>
                    </p>
                  )}
                  <pre dir="auto" className="pm:text-xs pm:text-muted-foreground">
                    {delivery.summary}
                  </pre>
                </li>
              ))}
            </ol>
            <details>
              <summary className="pm:cursor-pointer pm:text-sm pm:font-medium">{t.headers}</summary>
              <dl className="pm:mt-3 pm:grid pm:gap-2 pm:text-xs">
                {Object.entries(provider.headers).map(([name, values]) => (
                  <div key={name}>
                    <dt dir="ltr" className="pm:font-mono pm:font-semibold">
                      {name}
                    </dt>
                    <dd className="pm:m-0 pm:break-all" dir="auto">
                      {values.join(', ')}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          </section>
        ))}
      </DialogContent>
    </Dialog>
  )
}
