import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { sign } from 'node:crypto'

/** Seed the loopback-only development app through its real signed/authenticated endpoints. */
export async function seedDevelopment(baseURL, directory) {
  const url = new URL(baseURL)
  if (url.hostname !== '127.0.0.1' || url.protocol !== 'http:')
    throw new Error('Development seed requires loopback HTTP')
  const login = async () => {
    const response = await fetch(`${baseURL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseURL },
      body: JSON.stringify({ email: 'agent@example.com', password: 'Synthetic-password-123!' }),
    })
    if (!response.ok) throw new Error('Synthetic development login failed')
    return (await response.json()).token
  }
  let token = await login()
  const tick = async () => {
    const response = await fetch(`${baseURL}/api/emulator/tick`, {
      method: 'POST',
      headers: { Authorization: `JWT ${token}`, Origin: baseURL },
    })
    if (response.status === 401 || response.status === 403) token = await login()
    else if (!response.ok) throw new Error('Development provider tick failed')
  }
  const marker = join(directory, 'seeded.json')
  let seeded = false
  try {
    seeded = JSON.parse(await readFile(marker, 'utf8')).seeded === true
  } catch {}
  if (!seeded) {
    const privateKey = await readFile(join(directory, 'private.pem'), 'utf8')
    const messages = [
      [
        'Welcome to Payload Mail',
        'William Example',
        'william@example.net',
        'A live development inbox, powered by the actual Payload database.\n\nEdit src/ui and save to see the interface update.',
      ],
      [
        'پیگیری سفارش آزمایشی',
        'مریم نمونه',
        'maryam@example.net',
        'سلام،\nاین نامه فقط دادهٔ آزمایشی است. آیا می‌توانیم جزئیات سفارش نمونه را بررسی کنیم؟\n\nسپاس',
      ],
      [
        'Meeting tomorrow',
        'Alice Example',
        'alice@example.net',
        'Hi team,\nLet’s review the new mail interface tomorrow. The agenda includes resizable panels, keyboard navigation, and delivery status.',
      ],
      [
        'بررسی پیوست و متن فارسی',
        'آرش نمونه',
        'arash@example.net',
        'فایل آزمایشی پیوست شده است.\nآدرس support@example.com باید در حالت چپ‌به‌راست خوانا بماند.',
      ],
      [
        'Re: Design review',
        'Jordan Example',
        'jordan@example.net',
        'The three-pane layout makes reviewing conversations easier. Please keep this example private to the local development database.',
      ],
      [
        'English / فارسی',
        'Sam Example',
        'sam@example.net',
        'Mixed-language content stays unchanged when the interface language switches.\nتغییر زبان رابط، محتوای نامه را تغییر نمی‌دهد.',
      ],
    ]
    for (const [index, [subject, name, from, text]] of messages.entries()) {
      const body = JSON.stringify({
        id: 710001 + index,
        rcpt_to: 'support@example.com',
        mail_from: from,
        from: `"${name}" <${from}>`,
        to: 'support@example.com',
        subject,
        plain_body: text,
        message_id: `<development-${index}@example.net>`,
        attachments:
          index === 3
            ? [
                {
                  filename: 'نمونه.txt',
                  content_type: 'text/plain',
                  data: Buffer.from('Synthetic attachment — پیوست آزمایشی').toString('base64'),
                },
              ]
            : [],
      })
      const response = await fetch(`${baseURL}/api/mail/postal/emulator/incoming`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Postal-Signature-256': sign('sha256', Buffer.from(body), privateKey).toString(
            'base64',
          ),
        },
        body,
      })
      if (!response.ok) throw new Error('Signed development seed failed')
    }
    await tick()
    const response = await fetch(`${baseURL}/api/mail/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `JWT ${token}`,
        Origin: baseURL,
        'Idempotency-Key': 'local-preview-draft-example-001',
      },
      body: JSON.stringify({
        mailbox: 'support',
        kind: 'outgoing',
        action: 'compose',
        from: 'support@example.com',
        to: ['customer@example.net'],
        cc: [],
        bcc: [],
        subject: 'A saved development draft',
        text: 'This draft lives in the isolated local database.',
        attachments: [],
      }),
    })
    if (!response.ok) throw new Error('Development draft seed failed')
    await writeFile(marker, JSON.stringify({ seeded: true, synthetic: true }), { mode: 0o600 })
  }
  return tick
}
