import type { Plugin } from 'payload'
import { en } from '@payloadcms/translations/languages/en'
import { fa } from '@payloadcms/translations/languages/fa'
import type { MailOptions } from './types.js'
import { resolveOptions } from './config.js'
import { mailCollections } from './collections.js'
import { mailEndpoints } from './server/endpoints.js'

export type * from './types.js'

/** Add a private mail workflow without replacing host auth, hooks, email, jobs or localization. */
export function payloadMail(options: MailOptions): Plugin {
  return (config) => {
    if (options.enabled === false) return config
    const o = resolveOptions(options)
    const collections = mailCollections(o)
    if (config.collections?.some((c) => Object.values(o.slugs).includes(c.slug)))
      throw new Error('mail:collection-conflict')
    if (
      (config.endpoints || []).some(
        (e) => e.path === o.apiPath || e.path.startsWith(`${o.apiPath}/`),
      )
    )
      throw new Error('mail:endpoint-conflict')
    if (
      config.admin?.components?.views?.payloadMail ||
      Object.values(config.admin?.components?.views ?? {}).some((v) => v.path === o.adminPath)
    )
      throw new Error('mail:admin-conflict')
    const view = {
      path: 'payload-plugin-mail/rsc#MailView',
      serverProps: {
        initialLanguage: o.language,
        loginURL: `${config.routes?.admin ?? '/admin'}/login?redirect=${encodeURIComponent(`${config.routes?.admin ?? '/admin'}${o.adminPath}`)}`,
        authorizeMail: (req: Parameters<NonNullable<MailOptions['isStaff']>>[0]) =>
          o.isStaff?.(req) ?? false,
      },
      clientProps: { apiPath: `${config.routes?.api ?? '/api'}${o.apiPath}` },
    }
    return {
      ...config,
      collections: [...(config.collections ?? []), ...collections],
      endpoints: [...(config.endpoints || []), ...mailEndpoints(o)],
      admin: {
        ...config.admin,
        components: {
          ...config.admin?.components,
          views: {
            ...config.admin?.components?.views,
            payloadMail: { Component: view, path: o.adminPath, exact: true },
          },
          afterNavLinks: [
            ...(config.admin?.components?.afterNavLinks ?? []),
            {
              path: 'payload-plugin-mail/client#MailNav',
              clientProps: { href: `${config.routes?.admin ?? '/admin'}${o.adminPath}` },
            },
          ],
        },
      },
      i18n: {
        ...config.i18n,
        fallbackLanguage: config.i18n?.fallbackLanguage ?? 'en',
        supportedLanguages: { en, fa, ...config.i18n?.supportedLanguages },
      },
    }
  }
}
