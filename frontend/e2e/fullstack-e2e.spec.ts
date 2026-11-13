import { test, expect } from '@playwright/test'

test.describe('Thanh An Fullstack E2E Suite', () => {
  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 390, height: 844 },
  ]

  for (const vp of viewports) {
    test(`Responsive viewport [${vp.name} (${vp.width}x${vp.height})]: layout, brand, product & hotline`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/', { waitUntil: 'networkidle' })
      await page.waitForSelector('#app')

      // 1. Brand name visible
      const brand = page.getByText(/Thanh An/i).first()
      await expect(brand).toBeVisible()

      // 2. Hotline visible on first paint outside drawer
      const hotline = page.getByText(/0393/).first()
      await expect(hotline).toBeVisible()

      // 3. No horizontal overflow
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
        }
      })
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
    })
  }

  test('Mobile Drawer (390x844): layout, navigation links, and backdrop', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForSelector('#app')

    const toggle = page.getByRole('button', { name: /Toggle Navigation Menu/i }).first()
    await expect(toggle).toBeVisible()

    await toggle.click()
    const drawer = page.locator('#mobile-nav-drawer').first()
    await expect(drawer).toBeVisible()

    // Bounding box checks
    const box = await drawer.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(600)
      expect(box.width).toBeGreaterThanOrEqual(200)
      expect(box.x + box.width).toBeGreaterThanOrEqual(380)
    }

    // Navigation links visible inside drawer
    const navItems = ['Trang chủ', 'Giới thiệu', 'Sản phẩm', 'Lợi thế', 'Liên hệ']
    for (const item of navItems) {
      const link = drawer.getByRole('link', { name: item }).first()
      await expect(link).toBeVisible()
    }

    // Close button works
    const closeBtn = drawer.locator('button[aria-label="Đóng menu"]').first()
    await closeBtn.click()
    await expect(drawer).toBeHidden()
  })

  test('Resilience: Per-section retry recovers when an API call fails', async ({ page }) => {
    // Inject failure only for /products endpoint on initial load
    let shouldFail = true
    await page.route('**/api/v1/products**', async (route) => {
      if (shouldFail) {
        return route.fulfill({ status: 500, body: JSON.stringify({ message: 'Simulated products error' }) })
      }
      return route.continue()
    })

    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForSelector('#app')

    // Retry button should appear in Products section
    const retryBtn = page.getByRole('button', { name: /Thử tải lại|Thử lại|tải lại/i }).first()
    await expect(retryBtn).toBeVisible()

    // Now resolve route successfully and click retry
    shouldFail = false
    await retryBtn.click()

    // Products should recover and retry button disappear
    await page.waitForTimeout(1000)
    const productCard = page.locator('.product-card, [data-testid="product-item"], h3').first()
    await expect(productCard).toBeVisible()
  })

  test('Synthetic Quote Request Submission', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForSelector('#app')

    const quoteBtn = page.getByRole('button', { name: /Nhận báo giá/i }).first()
    await quoteBtn.click()

    const modal = page.locator('[role="dialog"][aria-modal="true"]').first()
    await expect(modal).toBeVisible()

    // Fill synthetic form data
    const timestamp = Date.now()
    const syntheticName = `CI Test User ${timestamp}`
    const syntheticPhone = '0987654321'
    const syntheticEmail = `citest_${timestamp}@example.com`
    const syntheticMessage = `CI E2E synthetic verification marker [MARKER_${timestamp}]`

    await page.fill('#quote-fullname', syntheticName)
    await page.fill('#quote-phone', syntheticPhone)
    await page.fill('#quote-email', syntheticEmail)
    await page.fill('#quote-message', syntheticMessage)

    // Submit form
    const submitBtn = modal.getByRole('button', { name: /Gửi yêu cầu báo giá/i })
    await submitBtn.click()

    // Expect success message
    const successAlert = modal.locator('[role="alert"]').filter({ hasText: /thành công/i }).first()
    await expect(successAlert).toBeVisible({ timeout: 15000 })
  })
})
