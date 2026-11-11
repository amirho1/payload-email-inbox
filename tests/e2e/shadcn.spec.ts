import { test, expect } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'
import { sign } from 'node:crypto'
import { en, fa } from '../../src/ui/translations.js'

for (const language of ['en', 'fa'] as const) {
  test(`shadcn ${language}: folders, filters, provider, RTL resizing, persistent editor and mobile dialogs`, async ({
    page,
  }) => {
    const t = language === 'fa' ? fa : en
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.request.post('/api/users/login', {
      data: { email: 'agent@example.com', password: 'Synthetic-password-123!' },
    })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/admin/mail')
    if (language === 'fa') {
      await page.getByRole('combobox', { name: en.language }).click()
      await page.getByRole('option', { name: 'فارسی' }).click()
    }
    const app = page.locator('.payload-mail')
    const id = language === 'en' ? 810 : 811
    const subject = `shadcn ${language} mixed فارسی@example.com`
    const body = JSON.stringify({
      id,
      rcpt_to: 'support@example.com',
      mail_from: 'ui@example.net',
      from: '"کاربر رابط" <ui@example.net>',
      to: 'support@example.com',
      subject,
      plain_body: 'Synthetic shadcn test سلام',
      message_id: `<shadcn-${id}@example.net>`,
    })
    const key = await readFile('.private/fixture/private.pem', 'utf8')
    expect(
      (
        await page.request.post('/api/mail/postal/emulator/incoming', {
          data: body,
          headers: {
            'content-type': 'application/json',
            'x-postal-signature-256': sign('sha256', Buffer.from(body), key).toString('base64'),
          },
        })
      ).status(),
    ).toBe(200)
    await page.request.post('/api/emulator/tick', { headers: { origin: 'http://localhost:4100' } })
    const list = page.getByRole('region', { name: t.inbox, exact: true })
    await list.getByRole('button', { name: t.refresh, exact: true }).click()
    const row = list.locator('[data-mail-row]').filter({ hasText: subject })
    await expect(row).toHaveCount(1)
    await row.focus()
    await page.keyboard.press('End')
    await expect(list.locator('[data-mail-row]').last()).toBeFocused()
    await page.keyboard.press('Home')
    await expect(list.locator('[data-mail-row]').first()).toBeFocused()
    const separator = page.getByRole('separator', { name: t.resizeNavigation })
    const nav = page.locator('[data-panel]#navigation')
    const before = (await nav.boundingBox())!.width
    const beforeValue = await separator.getAttribute('aria-valuenow')
    await separator.focus()
    await page.keyboard.press('ArrowRight')
    await expect(separator).not.toHaveAttribute('aria-valuenow', beforeValue!)
    const afterKeyboard = (await nav.boundingBox())!.width
    expect((afterKeyboard - before) * (language === 'fa' ? -1 : 1)).toBeGreaterThan(0)
    const handleBox = await separator.boundingBox()
    await page.mouse.move(handleBox!.x, handleBox!.y + 100)
    await page.mouse.down()
    await page.mouse.move(handleBox!.x + (language === 'fa' ? -20 : 20), handleBox!.y + 100, {
      steps: 5,
    })
    await page.mouse.up()
    expect((await nav.boundingBox())!.width).toBeGreaterThan(afterKeyboard)
    await row.click()
    await page.getByRole('button', { name: t.inspectProvider, exact: true }).click()
    const provider = page.getByRole('dialog', { name: t.providerDetails, exact: true })
    await expect(provider.getByText('Captured', { exact: true })).toBeVisible()
    await expect(provider.getByText(`#${id}`, { exact: true })).toBeVisible()
    await provider.getByText(t.headers, { exact: true }).click()
    await expect(provider.getByText(`<shadcn-${id}@example.net>`, { exact: true })).toBeVisible()
    await page.route('**/api/mail/provider/*', (route) => route.abort('failed'))
    await provider.getByRole('button', { name: t.refresh, exact: true }).click()
    await expect(provider.getByRole('alert')).toHaveText(t.providerUnavailable)
    await page.unroute('**/api/mail/provider/*')
    await provider.getByRole('button', { name: t.refresh, exact: true }).click()
    await expect(provider.getByRole('alert')).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: t.inspectProvider, exact: true })).toBeFocused()
    await page.getByRole('button', { name: t.reply, exact: true }).first().click()
    const editor = page.getByRole('form', { name: t.compose, exact: true })
    await editor.getByLabel(t.text, { exact: true }).fill('Unsaved resize reply پاسخ')
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      await expect(editor.getByLabel(t.text, { exact: true })).toHaveValue(
        'Unsaved resize reply پاسخ',
      )
      expect(await app.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
    }
    await editor.getByRole('button', { name: t.save, exact: true }).click()
    await expect(editor.getByRole('status')).toContainText(t.saved)
    await editor.getByRole('button', { name: t.cancel, exact: true }).click()
    const navigation = page.getByRole('complementary', { name: t.navigation })
    await navigation.getByRole('button', { name: new RegExp(`^${t.drafts}`) }).click()
    await list.locator('[data-mail-row]').filter({ hasText: subject }).click()
    const draft = page.getByRole('dialog', { name: t.compose, exact: true })
    await expect(draft.getByLabel(t.text, { exact: true })).toHaveValue('Unsaved resize reply پاسخ')
    await draft.getByRole('tab', { name: t.htmlSource, exact: true }).click()
    await draft
      .getByRole('textbox', { name: t.htmlSource, exact: true })
      .fill(
        '<script>window.__mailXss=true</script><img src="https://tracker.invalid/pixel"><p onclick="alert(1)">HTML سلام</p>',
      )
    let trackers = 0
    page.on('request', (request) => {
      if (request.url().includes('tracker.invalid')) trackers++
    })
    await draft.getByRole('button', { name: t.savePreview, exact: true }).click()
    await expect(draft.locator('iframe')).toHaveAttribute('sandbox', '')
    await expect(draft.frameLocator('iframe').locator('body')).toContainText('HTML سلام')
    expect(trackers).toBe(0)
    expect(await page.evaluate(() => '__mailXss' in window)).toBe(false)
    await page.keyboard.press('Escape')
    await navigation.getByRole('button', { name: new RegExp(`^${t.inbox}`) }).click()
    await list.getByRole('button', { name: t.filters, exact: true }).click()
    const filters = page.getByRole('dialog', { name: t.filters, exact: true })
    await filters.getByLabel(t.from, { exact: true }).fill('nobody@example.org')
    await filters.getByRole('button', { name: t.applyFilters }).click()
    await expect(list.getByText(t.empty, { exact: true })).toBeVisible()
    await list.getByRole('button', { name: t.filters, exact: true }).click()
    await filters.getByRole('button', { name: t.clearFilters }).click()
    await filters.getByLabel(t.to, { exact: true }).fill('support@example.com')
    await filters.getByLabel(t.after, { exact: true }).fill('2026-01-01')
    await filters.getByLabel(t.before, { exact: true }).fill('2027-12-31')
    await filters.getByRole('button', { name: t.applyFilters }).click()
    await expect(row).toHaveCount(1)
    await row.click()
    await page.getByRole('button', { name: t.archive, exact: true }).click()
    await navigation.getByRole('button', { name: new RegExp(`^${t.archive}`) }).click()
    await expect(row).toHaveCount(1)
    await row.click()
    await page.getByRole('button', { name: t.reopen, exact: true }).click()
    await page.setViewportSize({ width: 390, height: 900 })
    await page.getByRole('button', { name: t.navigation, exact: true }).click()
    const mobileNav = page.getByRole('dialog', { name: t.navigation, exact: true })
    await expect(mobileNav).toBeVisible()
    await mobileNav.getByRole('button', { name: t.compose, exact: true }).click()
    const compose = page.getByRole('dialog', { name: t.compose, exact: true })
    await expect(compose.getByLabel(t.to, { exact: true })).toBeVisible()
    const accessibility = await new AxeBuilder({ page }).include('.payload-mail').analyze()
    expect(accessibility.violations).toEqual([])
    await compose.getByRole('button', { name: t.cancel, exact: true }).click()
    expect(errors).toEqual([])
  })
}

test('anonymous mail view redirects to login and nonstaff cannot enter the mail admin', async ({
  page,
}) => {
  await page.goto('/admin/mail')
  await expect(page).toHaveURL(/\/admin\/login/)
  await page.getByLabel('Email').fill('customer@example.com')
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-password-123!')
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).not.toHaveURL(/\/admin\/login/)
  await page.goto('/admin/mail')
  await expect(page.getByText('Access denied.', { exact: true })).toBeVisible()
  expect((await page.request.get('/api/mail/inbox')).status()).toBe(403)
  expect(
    (
      await page.request.post('/api/mail/provider/1', {
        headers: { origin: 'http://localhost:4100' },
      })
    ).status(),
  ).toBe(403)
})
