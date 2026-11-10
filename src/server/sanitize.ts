import sanitize from 'sanitize-html'

/** Default HTML has no external resources; opt-in images still run in a sandbox with no scripts. */
export function sanitizeMessage(html: string, remoteImages = false): string {
  return sanitize(html, {
    allowedTags: [
      'p',
      'br',
      'div',
      'span',
      'b',
      'strong',
      'em',
      'i',
      'u',
      's',
      'blockquote',
      'pre',
      'code',
      'ul',
      'ol',
      'li',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'hr',
      'a',
      ...(remoteImages ? ['img'] : []),
    ],
    allowedAttributes: {
      a: ['href', 'title'],
      ...(remoteImages ? { img: ['src', 'alt', 'width', 'height'] } : {}),
    },
    allowedSchemes: ['https', 'mailto'],
    allowProtocolRelative: false,
    allowedSchemesByTag: { img: ['https'] },
    enforceHtmlBoundary: true,
    transformTags: {
      a: sanitize.simpleTransform('a', { rel: 'noreferrer noopener', target: '_blank' }),
    },
  })
}

export function isolatedHtml(html: string, remoteImages = false): string {
  const policy = `default-src 'none'; img-src ${remoteImages ? 'https:' : "'none'"}; style-src 'none'; form-action 'none'; base-uri 'none'`
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer"></head><body dir="auto">${sanitizeMessage(html, remoteImages)}</body></html>`
}
