'use client'
import React from 'react'
import { ExternalLink, Mail, Server } from 'lucide-react'
import type { MailState } from './navigation.js'
import { Button } from './components/button.js'
import { Badge } from './components/badge.js'
import { Separator } from './components/separator.js'
import { ScrollArea } from './components/scroll-area.js'

/** Provider administration is separate and truthful about the installed Postal v1 capability boundary. */
export function MailSettings({ state: s }: { state: MailState }) {
  const { t } = s
  return (
    <section aria-label={t.settings} className="pm:flex pm:h-full pm:min-w-0 pm:flex-col">
      <header className="pm:flex pm:h-14 pm:shrink-0 pm:items-center pm:gap-2 pm:border-b pm:px-5">
        <Server className="pm:size-4" aria-hidden="true" />
        <h1 className="pm:text-lg pm:font-semibold">{t.settings}</h1>
        <Badge variant="outline" className="pm:ms-auto">
          {t.readOnly}
        </Badge>
      </header>
      <ScrollArea className="pm:min-h-0 pm:flex-1">
        <div className="pm:mx-auto pm:grid pm:max-w-3xl pm:gap-6 pm:p-5">
          <div className="pm:grid pm:gap-2">
            <h2 className="pm:text-base pm:font-semibold">{t.configuration}</h2>
            <p className="pm:text-sm pm:text-muted-foreground">{t.appFeatures}</p>
          </div>
          {s.settings?.mailboxes
            .filter((box) => !s.query.mailbox || box.key === s.query.mailbox)
            .map((box) => (
              <section key={box.key} className="pm:grid pm:gap-3 pm:rounded-lg pm:border pm:p-4">
                <div className="pm:flex pm:items-center pm:gap-2">
                  <Mail className="pm:size-4" aria-hidden="true" />
                  <h3 className="pm:text-sm pm:font-semibold">{box.name}</h3>
                </div>
                <dl className="pm:grid pm:gap-2 pm:text-sm">
                  {[
                    [t.from, box.address],
                    [t.provider, box.provider],
                    [t.reply, box.replyTo || box.address],
                  ].map(([name, value]) => (
                    <div key={name} className="pm:grid pm:gap-1 pm:sm:grid-cols-[8rem_1fr]">
                      <dt className="pm:text-muted-foreground">{name}</dt>
                      <dd className="pm:m-0 pm:break-all">
                        <bdi dir="ltr">{value}</bdi>
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          <Separator />
          <section className="pm:grid pm:gap-3">
            <h2 className="pm:text-base pm:font-semibold">{t.capabilities}</h2>
            <div className="pm:flex pm:flex-wrap pm:gap-2">
              {[
                t.inbox,
                t.sent,
                t.drafts,
                t.queue,
                t.archive,
                t.delivery,
                t.attachments,
                t.headers,
              ].map((label) => (
                <Badge key={label} variant="secondary">
                  {label}
                </Badge>
              ))}
            </div>
            <p className="pm:text-sm pm:leading-relaxed pm:text-muted-foreground">
              {t.nativeLimit}
            </p>
            {s.settings?.providers?.map((provider) => (
              <div
                key={provider.key}
                className="pm:flex pm:flex-wrap pm:items-center pm:gap-3 pm:rounded-lg pm:border pm:p-4"
              >
                <span className="pm:text-sm pm:font-semibold">{provider.label}</span>
                <code dir="ltr" className="pm:text-xs pm:text-muted-foreground">
                  {provider.key}
                </code>
                {provider.inspect && <Badge variant="outline">{t.inspectProvider}</Badge>}
                {provider.managementURL && (
                  <Button asChild variant="outline" size="sm" className="pm:ms-auto">
                    <a href={provider.managementURL} target="_blank" rel="noreferrer noopener">
                      {t.openProvider}
                      <ExternalLink className="pm:size-3.5" aria-hidden="true" />
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </section>
        </div>
      </ScrollArea>
    </section>
  )
}
