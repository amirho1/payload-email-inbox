import React from 'react'
import type { AdminViewServerProps, PayloadRequest } from 'payload'
import type { Language } from '../types.js'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation.js'

/** Gate the server view, then pass only public route information to the client. */
export async function MailView(
  props: AdminViewServerProps & {
    apiPath: string
    initialLanguage?: Language
    loginURL?: string
    authorizeMail: (req: PayloadRequest) => boolean | Promise<boolean>
  },
) {
  const { req, permissions, locale, visibleEntities } = props.initPageResult
  const adminRoute = req.payload.config.routes.admin
  if (!req.user) redirect(props.loginURL || `${adminRoute}/login`)
  if (!(await props.authorizeMail(req)))
    return (
      <div>
        <p role="alert">{req.i18n.language === 'fa' ? 'دسترسی مجاز نیست.' : 'Access denied.'}</p>
        <a href={`${adminRoute}/logout`}>
          {req.i18n.language === 'fa'
            ? 'خروج و ورود با حساب همکار مجاز'
            : 'Sign out and use an authorized staff account'}
        </a>
      </div>
    )
  const { MailInbox } = await import('./inbox.js')
  return (
    <DefaultTemplate
      {...props}
      req={req}
      permissions={permissions}
      locale={locale}
      visibleEntities={{
        collections: [...visibleEntities.collections],
        globals: [...visibleEntities.globals],
      }}
    >
      <MailInbox
        apiPath={props.apiPath}
        initialLanguage={
          props.initPageResult.cookies.has(`${req.payload.config.cookiePrefix}-lng`)
            ? undefined
            : props.initialLanguage
        }
      />
    </DefaultTemplate>
  )
}
