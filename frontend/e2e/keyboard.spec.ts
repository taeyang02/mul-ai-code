import { test, expect } from '@playwright/test'

async function setupNetworkInterception(page: any) {
  await page.route('**/api/v1/**', async (route: any) => {
    const url = new URL(route.request().url())
    const p = url.pathname.replace(/\/$/, '')

    if (p.endsWith('/site')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          brandName: 'Công Ty TNHH Thương Mại Và Thép Thanh An',
          shortName: 'Thanh An Bắc Giang',
          hotline: '0393.123.456',
          phone: '0393.123.456',
          email: 'thepthanhanbg@gmail.com',
          address: 'Gia Lâm, Bắc Giang',
          seoTitle: 'Thép Thanh An Bắc Giang | Phân Phối Thép Chính Hãng',
          seoDescription: 'Đại lý phân phối thép xây dựng chính hãng tại Bắc Giang',
        }),
      })
    }

    if (p.endsWith('/site/advantages')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, title: 'Uy tín hàng đầu', description: 'Chất lượng đảm bảo từ nhà máy' },
          { id: 2, title: 'Giá cả cạnh tranh', description: 'Báo giá tốt nhất thị trường' },
        ]),
      })
    }

    if (p.endsWith('/categories')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Thép xây dựng', slug: 'thep-xay-dung', displayOrder: 1 },
          { id: 2, name: 'Thép hình', slug: 'thep-hinh', displayOrder: 2 },
        ]),
      })
    }

    if (p.endsWith('/products')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'prod-001',
              name: 'Thép Hòa Phát phi 10',
              slug: 'thep-hoa-phat-phi-10',
              unit: 'Cây',
              price: 155000,
              category: { id: 1, name: 'Thép xây dựng', slug: 'thep-xay-dung' },
            },
          ],
          total: 1,
          page: 0,
          size: 20,
        }),
      })
    }

    if (p.endsWith('/quote-requests')) {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-a11y-quote-uuid',
          message: 'Yêu cầu báo giá thành công (A11y Mock UI Test)',
        }),
      })
    }

    return route.continue()
  })
}

test.describe('Keyboard Accessibility (a11y)', () => {
  test('Quote Modal: focus trap, Escape to close, and focus restoration', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await setupNetworkInterception(page)

    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForSelector('#app')

    // 1. Locate trigger button and open via Enter
    const triggerBtn = page.getByRole('button', { name: /Nhận báo giá/i }).first()
    await expect(triggerBtn).toBeVisible()
    await triggerBtn.focus()
    await page.keyboard.press('Enter')

    const modal = page.locator('[role="dialog"][aria-modal="true"]').first()
    await expect(modal).toBeVisible()

    // 2. Initial focus moves inside modal
    await page.waitForTimeout(100)
    const isInsideModal = await modal.evaluate((m) => m.contains(document.activeElement))
    expect(isInsideModal).toBe(true)

    // 3. Focus trap: Tab forward and wrap from last to first
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusableCount = await modal.evaluate(
      (m, sel) => m.querySelectorAll(sel).length,
      focusableSelector
    )
    expect(focusableCount).toBeGreaterThanOrEqual(3)

    // Focus first element, Shift+Tab to wrap to last element
    await modal.evaluate((m, sel) => {
      const list = m.querySelectorAll(sel)
      if (list.length > 0) (list[0] as HTMLElement).focus()
    }, focusableSelector)

    await page.keyboard.press('Shift+Tab')
    await page.waitForTimeout(50)
    const wrappedToLast = await modal.evaluate((m, sel) => {
      const list = m.querySelectorAll(sel)
      return document.activeElement === list[list.length - 1]
    }, focusableSelector)
    expect(wrappedToLast).toBe(true)

    // Tab from last element wraps to first element
    await page.keyboard.press('Tab')
    await page.waitForTimeout(50)
    const wrappedToFirst = await modal.evaluate((m, sel) => {
      const list = m.querySelectorAll(sel)
      return document.activeElement === list[0]
    }, focusableSelector)
    expect(wrappedToFirst).toBe(true)

    // 4. Escape key closes modal
    await page.keyboard.press('Escape')
    await expect(modal).toBeHidden()

    // 5. Focus restoration to trigger button
    await page.waitForTimeout(100)
    const restored = await triggerBtn.evaluate((el) => el === document.activeElement)
    expect(restored).toBe(true)
  })

  test('Mobile Drawer (390x844): initial focus, focus trap, Escape, and focus restoration', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await setupNetworkInterception(page)

    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForSelector('#app')

    // 1. Locate hamburger button and open via Enter
    const toggleBtn = page.getByRole('button', { name: /Toggle Navigation Menu/i }).first()
    await expect(toggleBtn).toBeVisible()
    await toggleBtn.focus()
    await page.keyboard.press('Enter')

    const drawer = page.locator('#mobile-nav-drawer').first()
    await expect(drawer).toBeVisible()

    // 2. Initial focus moves to close button inside drawer
    await page.waitForTimeout(100)
    const closeBtn = drawer.locator('button[aria-label="Đóng menu"]').first()
    await expect(closeBtn).toBeVisible()
    const isCloseBtnFocused = await closeBtn.evaluate((btn) => btn === document.activeElement)
    expect(isCloseBtnFocused).toBe(true)

    // 3. Focus trap: Shift+Tab on first element wraps to last element
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    await page.keyboard.press('Shift+Tab')
    await page.waitForTimeout(50)
    const wrappedToLast = await drawer.evaluate((d, sel) => {
      const list = d.querySelectorAll(sel)
      return document.activeElement === list[list.length - 1]
    }, focusableSelector)
    expect(wrappedToLast).toBe(true)

    // Tab on last element wraps to first element
    await page.keyboard.press('Tab')
    await page.waitForTimeout(50)
    const wrappedToFirst = await drawer.evaluate((d, sel) => {
      const list = d.querySelectorAll(sel)
      return document.activeElement === list[0]
    }, focusableSelector)
    expect(wrappedToFirst).toBe(true)

    // 4. Escape key closes drawer
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()

    // 5. Focus restoration to hamburger toggle button
    await page.waitForTimeout(100)
    const restoredToToggle = await toggleBtn.evaluate((el) => el === document.activeElement)
    expect(restoredToToggle).toBe(true)
  })
})
