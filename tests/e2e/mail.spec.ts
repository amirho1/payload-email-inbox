import { test, expect, type Page, type APIRequestContext } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'
import { sign, randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { simpleParser } from 'mailparser'

async function signed(request: APIRequestContext, path: string, data: unknown) {
  const body = JSON.stringify(data)
  const privateKey = await readFile(
    join(process.cwd(), '.private', 'fixture', 'private.pem'),
    'utf8',
  )
  const response = await request.post(path, {
    data: body,
    headers: {
      'content-type': 'application/json',
      'x-postal-signature-256': sign('sha256', Buffer.from(body), privateKey).toString('base64'),
    },
  })
  expect(response.status(), await response.text()).toBe(200)
}
async function tick(page: Page) {
  expect(
    (
      await page.request.post('/api/emulator/tick', {
        headers: { origin: 'http://localhost:4100' },
      })
    ).status(),
  ).toBe(200)
}

for (const language of ['en', 'fa'] as const) {
  test(`persisted mail journey ${language}, RTL, attachment, thread, replay, Bcc, delivery and XSS`, async ({
    page,
  }) => {
    const fa = language === 'fa'
    await page.goto('/admin/login')
    await page.getByLabel('Email').fill('agent@example.com')
    await page.getByLabel('Password', { exact: true }).fill('Synthetic-password-123!')
    await page.getByRole('button', { name: 'Login', exact: true }).click()
    await expect(page).not.toHaveURL(/login/)
    await page.goto('/admin/mail')
    if (fa) await page.getByLabel('Interface language').selectOption('fa')
    await expect(page.locator('main.payload-mail')).toHaveAttribute('dir', fa ? 'rtl' : 'ltr')
    const id = fa ? 502 : 501
    const subject = `Controlled synthetic ${language} سلام`
    const incoming = {
      id,
      rcpt_to: 'support@example.com',
      mail_from: 'customer@example.net',
      from: '"کاربر، Test" <customer@example.net>',
      to: 'support@example.com',
      subject,
      plain_body: 'Hello سلام — synthetic only',
      html_body:
        '<script>window.__mailXss=true</script><img src="https://tracker.invalid/pixel"><p onclick="window.__mailXss=true">سلام safe</p>',
      message_id: `<browser-${id}@example.net>`,
      attachments: [
        {
          filename: 'سلام.txt',
          content_type: 'text/plain',
          data: Buffer.from('Synthetic پیوست').toString('base64'),
        },
      ],
    }
    await signed(page.request, '/api/mail/postal/emulator/incoming', incoming)
    await signed(page.request, '/api/mail/postal/emulator/incoming', incoming)
    await tick(page)
    await page.getByRole('button', { name: fa ? 'تازه‌سازی' : 'Refresh', exact: true }).click()
    const item = page.getByRole('button').filter({ hasText: subject })
    await expect(item).toHaveCount(1)
    await expect(item).toContainText(fa ? 'خوانده‌نشده' : 'Unread')
    await item.click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('link', { name: 'سلام.txt' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('سلام.txt')
    let tracking = 0
    page.on('request', (r) => {
      if (r.url().includes('tracker.invalid')) tracking++
    })
    await page.getByRole('button', { name: fa ? 'نمایش امن HTML' : 'View safe HTML' }).click()
    await expect(page.locator('iframe')).toHaveAttribute('sandbox', '')
    await expect(page.frameLocator('iframe').locator('body')).toContainText('سلام safe')
    expect(tracking).toBe(0)
    expect(await page.evaluate(() => '__mailXss' in window)).toBe(false)
    await page
      .getByRole('button', { name: fa ? 'پاسخ' : 'Reply', exact: true })
      .first()
      .click()
    await page
      .getByLabel(fa ? 'متن نامه' : 'Message', { exact: true })
      .fill('Browser reply پاسخ آزمایشی')
    await page
      .getByLabel(fa ? 'رونوشت پنهان (خصوصی)' : 'Bcc (private)', { exact: true })
      .fill('hidden@example.net')
    await page
      .getByRole('button', { name: fa ? 'ذخیرهٔ پیش‌نویس' : 'Save draft', exact: true })
      .click()
    await expect(
      page.getByRole('status').filter({ hasText: fa ? 'پیش‌نویس ذخیره شد' : 'Draft saved' }),
    ).toBeVisible()
    await page
      .getByRole('button', { name: fa ? 'ارسال' : 'Send', exact: true })
      .click({ clickCount: 2 })
    await expect(
      page.getByRole('form', { name: fa ? 'نوشتن نامه' : 'Compose', exact: true }),
    ).toHaveCount(0)
    await tick(page)
    const captures = await (await page.request.get('/api/emulator/captured')).json()
    const captured = captures.filter((c: { data: { subject: string } }) =>
      c.data.subject.includes(subject),
    )
    expect(captured).toHaveLength(1)
    const sent = captured[captured.length - 1]
    const raw = Buffer.from(sent.mime, 'base64')
    expect(raw.toString()).not.toMatch(/^Bcc:/im)
    const parsed = await simpleParser(raw)
    expect(parsed.text).toContain('پاسخ آزمایشی')
    expect(parsed.inReplyTo).toBe(`<browser-${id}@example.net>`)
    await signed(page.request, '/api/mail/postal/emulator/incoming', {
      ...incoming,
      id: id + 100,
      message_id: `<reply-${id}@example.net>`,
      in_reply_to: `<${sent.data.messageId}>`,
      plain_body: 'Customer reply پاسخ مشتری',
      attachments: [],
      html_body: null,
    })
    await tick(page)
    await page.reload()
    await page.getByRole('button').filter({ hasText: subject }).click()
    await expect(page.getByText('Customer reply پاسخ مشتری', { exact: true })).toBeVisible()
    await signed(page.request, '/api/mail/postal/emulator/event', {
      event: 'MessageDelayed',
      uuid: randomUUID(),
      timestamp: Date.now() / 1000,
      payload: { message: { id: Number(sent.id), direction: 'outgoing' } },
    })
    await tick(page)
    await page.reload()
    await page.getByRole('button').filter({ hasText: subject }).click()
    await expect(
      page.getByRole('status').filter({ hasText: fa ? 'با تأخیر' : 'Delayed' }),
    ).toBeVisible()
    await signed(page.request, '/api/mail/postal/emulator/event', {
      event: 'MessageBounced',
      uuid: randomUUID(),
      timestamp: Date.now() / 1000,
      payload: { original_message: { id: Number(sent.id), direction: 'outgoing' } },
    })
    await tick(page)
    await page.reload()
    await page.getByRole('button').filter({ hasText: subject }).click()
    await expect(
      page.getByRole('status').filter({ hasText: fa ? 'برگشتی' : 'Bounced' }),
    ).toBeVisible()
    await page
      .getByRole('button', { name: fa ? 'افزودن یادداشت داخلی' : 'Add internal note' })
      .click()
    await page
      .getByLabel(fa ? 'متن نامه' : 'Message', { exact: true })
      .fill('Synthetic private note')
    await page.getByRole('button', { name: fa ? 'ذخیرهٔ پیش‌نویس' : 'Save draft' }).click()
    await page.getByRole('button', { name: fa ? 'انصراف' : 'Cancel' }).click()
    await expect(page.getByText('Synthetic private note', { exact: true })).toBeVisible()
    const axe = await new AxeBuilder({ page }).include('.payload-mail').analyze()
    expect(axe.violations).toEqual([])
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      expect(
        await page.locator('.payload-mail').evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true)
    }
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true)
    await page
      .locator('.payload-mail')
      .screenshot({ path: `docs/screenshots/inbox-${language}.png` })
  })
}

test('compose, upload, reply-all, forward, failure retry and unknown-state actions', async ({
  page,
}) => {
  await page.request.post('/api/users/login', {
    data: { email: 'agent@example.com', password: 'Synthetic-password-123!' },
  })
  await page.goto('/admin/mail')
  await page.getByRole('button', { name: 'Compose', exact: true }).click()
  await page.getByLabel('To', { exact: true }).fill('customer@example.net')
  await page.getByLabel('Subject', { exact: true }).fill('[failed] Controlled compose')
  await page.getByLabel('Message', { exact: true }).fill('Synthetic composed message')
  await page.getByLabel('Attach files').setInputFiles({
    name: 'synthetic.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Synthetic upload'),
  })
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.getByRole('form', { name: 'Compose', exact: true })).toHaveCount(0)
  await tick(page)
  await page.reload()
  await page.getByRole('button').filter({ hasText: '[failed] Controlled compose' }).click()
  await expect(page.getByRole('button', { name: 'Retry failed send' })).toBeVisible()
  await page.getByRole('button', { name: 'Retry failed send' }).click()
  await tick(page)
  await page.reload()
  await page.getByRole('button').filter({ hasText: '[failed] Controlled compose' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Failed' })).toBeVisible()
  await page.getByRole('button', { name: 'Reply all', exact: true }).click()
  await expect(page.getByLabel('Bcc (private)', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('To', { exact: true })).toHaveValue('customer@example.net')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('button', { name: 'Forward', exact: true }).click()
  await expect(page.getByLabel('Message', { exact: true })).toHaveValue(/Forwarded message/)
  await page.getByLabel('To', { exact: true }).fill('forward@example.net')
  await page.getByLabel('Subject', { exact: true }).fill('[ambiguous] Controlled forward')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.getByRole('form', { name: 'Compose', exact: true })).toHaveCount(0)
  await tick(page)
  await page.reload()
  await page.getByRole('button').filter({ hasText: '[failed] Controlled compose' }).click()
  await expect(
    page.getByText(
      'Check Postal before any further send. This submission may already have been accepted.',
    ),
  ).toBeVisible()
  const unknown = page
    .getByRole('article', { name: 'Outgoing' })
    .filter({ hasText: 'Unknown submission' })
  await expect(unknown.getByRole('button', { name: 'Retry failed send' })).toHaveCount(0)
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
  const result = await new AxeBuilder({ page }).include('.payload-mail').analyze()
  expect(result.violations).toEqual([])
})

test('anonymous, nonstaff and cross-mailbox REST access denied', async ({ request }) => {
  expect((await request.get('/api/mail/inbox')).status()).toBe(403)
  const login = await request.post('/api/users/login', {
    data: { email: 'customer@example.com', password: 'Synthetic-password-123!' },
  })
  expect(login.status()).toBe(200)
  expect((await request.get('/api/mail/inbox')).status()).toBe(403)
  await request.post('/api/users/logout')
  await request.post('/api/users/login', {
    data: { email: 'other@example.com', password: 'Synthetic-password-123!' },
  })
  const list = await (await request.get('/api/mail/inbox')).json()
  expect(list.docs).toEqual([])
  expect((await request.get('/api/mail/attachment/1')).status()).toBe(404)
})
