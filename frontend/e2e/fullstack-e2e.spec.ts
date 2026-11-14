import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as crypto from 'node:crypto'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface ViewportConfig {
  name: string
  width: number
  height: number
}

interface GitMetadata {
  checkout_sha: string
  source_head_sha: string
  event_name: string
  is_pr_event: boolean
  pr_number: number | null
  run_id: string
  run_attempt: string
}

/**
 * Resolves repository metadata distinguishing runner checkout SHA from PR source HEAD SHA.
 * SS-4: Does not assume git history or multi-parent merge commit (actions/checkout is depth:1 by default).
 * Reads authoritative PR head SHA directly from GITHUB_EVENT_PATH when available.
 */
function resolveGitMetadata(): GitMetadata {
  const eventName = process.env.GITHUB_EVENT_NAME || 'local'
  let checkoutSha = process.env.GITHUB_SHA || 'unknown'

  // Attempt local git rev-parse if GITHUB_SHA is unset
  if (checkoutSha === 'unknown' || !checkoutSha) {
    try {
      const cwd = path.resolve(__dirname, '..')
      const head = execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim()
      if (head) checkoutSha = head
    } catch {
      // fallback
    }
  }

  let sourceHeadSha = checkoutSha
  let isPrEvent = false
  let prNumber: number | null = null

  // 1. Authoritative GitHub Actions pull_request event payload (works on shallow checkout)
  const eventPath = process.env.GITHUB_EVENT_PATH
  if (eventPath && fs.existsSync(eventPath)) {
    try {
      const rawEvent = fs.readFileSync(eventPath, 'utf8')
      const eventData = JSON.parse(rawEvent)
      if (eventData && eventData.pull_request) {
        isPrEvent = true
        prNumber = eventData.pull_request.number || null
        if (eventData.pull_request.head && eventData.pull_request.head.sha) {
          sourceHeadSha = String(eventData.pull_request.head.sha)
        }
      }
    } catch {
      // ignore JSON parse error
    }
  }

  // 2. Explicit workflow environment override (if provided)
  if (process.env.PR_HEAD_SHA) {
    sourceHeadSha = process.env.PR_HEAD_SHA
    isPrEvent = true
  } else if (process.env.GITHUB_HEAD_SHA) {
    sourceHeadSha = process.env.GITHUB_HEAD_SHA
  }

  return {
    checkout_sha: checkoutSha,
    source_head_sha: sourceHeadSha,
    event_name: eventName,
    is_pr_event: isPrEvent,
    pr_number: prNumber,
    run_id: process.env.GITHUB_RUN_ID || 'local',
    run_attempt: process.env.GITHUB_RUN_ATTEMPT || '1',
  }
}

async function captureAcceptanceScreenshot(
  page: Page,
  label: string,
  viewport: ViewportConfig,
  extraMetadata: Record<string, unknown> = {}
) {
  const shotDir = process.env.SHOT_DIR || path.join(process.env.CI_ARTIFACT_DIR || 'ci-artifacts', 'e2e')
  const screenshotsDir = path.join(shotDir, 'screenshots')
  fs.mkdirSync(screenshotsDir, { recursive: true })

  const gitMeta = resolveGitMetadata()
  const shortSourceSha = gitMeta.source_head_sha.slice(0, 7)

  const canonicalName = `${label}-${viewport.name}-${viewport.width}x${viewport.height}.png`
  const taggedName = `${label}-${viewport.name}-${viewport.width}x${viewport.height}-sha-${shortSourceSha}-run-${gitMeta.run_id}.png`
  const fullPath = path.join(screenshotsDir, canonicalName)
  const taggedPath = path.join(screenshotsDir, taggedName)

  await page.screenshot({ path: fullPath, fullPage: true })
  fs.copyFileSync(fullPath, taggedPath)

  const buf = fs.readFileSync(fullPath)
  const fileSha256 = crypto.createHash('sha256').update(buf).digest('hex')

  const metaFile = path.join(screenshotsDir, `${label}-${viewport.name}-${viewport.width}x${viewport.height}-meta.json`)
  fs.writeFileSync(
    metaFile,
    JSON.stringify(
      {
        label,
        viewport: viewport.name,
        width: viewport.width,
        height: viewport.height,
        canonical_file: canonicalName,
        tagged_file: taggedName,
        sha256: fileSha256,
        size_bytes: buf.length,
        ...gitMeta,
        captured_at: new Date().toISOString(),
        ...extraMetadata,
      },
      null,
      2
    )
  )
}

test.describe('Thanh An Fullstack E2E Suite', () => {
  const viewports: ViewportConfig[] = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 390, height: 844 },
  ]

  for (const vp of viewports) {
    test(`Responsive viewport [${vp.name} (${vp.width}x${vp.height})]: layout, brand, product & hotline`, async ({
      page,
      diagnostics,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/', { waitUntil: 'networkidle' })
      await page.waitForSelector('#app')

      const verifiedSections: string[] = []

      // 1. Header Navigation & Brand (SS-2)
      const brand = page.getByText(/Thanh An/i).first()
      await expect(brand).toBeVisible()
      const headerHotline = page.locator('header').getByText(/0393/).first()
      await expect(headerHotline).toBeVisible()
      verifiedSections.push('header')

      // 2. Hero Quick Specs from Live API (SS-2: wait for real catalog data, no skeleton, no error)
      const hero = page.locator('section#home')
      await expect(hero).toBeVisible()
      await expect(hero.locator('.animate-pulse')).toHaveCount(0)
      await expect(hero.getByText(/Không thể tải|Thử lại/i)).toHaveCount(0)
      const heroItems = hero.locator('ul li')
      await expect(heroItems.first()).toBeVisible()
      const heroItemCount = await heroItems.count()
      expect(heroItemCount).toBeGreaterThanOrEqual(1)
      verifiedSections.push('hero-quick-specs')

      // 3. About Section from Live Company API (SS-2: actual content assert, no skeleton, no error)
      const aboutSection = page.locator('section#about')
      await expect(aboutSection).toBeVisible()
      await expect(aboutSection.locator('.animate-pulse')).toHaveCount(0)
      await expect(aboutSection.getByText(/Lỗi tải thông tin doanh nghiệp|Thử tải lại/i)).toHaveCount(0)
      const companyHeading = aboutSection.locator('h2')
      await expect(companyHeading).toBeVisible()
      await expect(companyHeading).toContainText(/CÔNG TY TNHH THANH AN BẮC GIANG|Thanh An Bắc Giang/i)
      await expect(aboutSection.getByText(/Sứ mệnh/i)).toBeVisible()
      verifiedSections.push('about')

      // 4. Products Section from Live Catalog API (SS-2: real product data required, no empty state, no error)
      const productsSection = page.locator('section#products')
      await expect(productsSection).toBeVisible()
      await expect(productsSection.locator('.animate-pulse')).toHaveCount(0)
      await expect(productsSection.getByText(/Không thể tải danh mục sản phẩm|Lỗi tải danh mục/i)).toHaveCount(0)
      await expect(productsSection.getByText(/Hiện không có sản phẩm nào/i)).toHaveCount(0)
      await expect(productsSection.getByRole('button', { name: /Tất cả sản phẩm/i })).toBeVisible()
      const productHeadings = productsSection.locator('h3')
      await expect(productHeadings.first()).toBeVisible()
      const productCount = await productHeadings.count()
      expect(productCount).toBeGreaterThanOrEqual(1)

      const sampleNames: string[] = []
      for (let i = 0; i < Math.min(productCount, 3); i++) {
        const text = (await productHeadings.nth(i).textContent())?.trim()
        if (text) sampleNames.push(text)
      }
      expect(sampleNames.length).toBeGreaterThanOrEqual(1)
      verifiedSections.push('products')

      // 5. Advantages Section from Live Advantages API (SS-2: cards verified, no skeleton, no error)
      const advSection = page.locator('section#advantages')
      await expect(advSection).toBeVisible()
      await expect(advSection.locator('.animate-pulse')).toHaveCount(0)
      await expect(advSection.getByText(/Lỗi tải lợi thế cạnh tranh|Thử tải lại/i)).toHaveCount(0)
      const advHeadings = advSection.locator('h3')
      await expect(advHeadings.first()).toBeVisible()
      const advCount = await advHeadings.count()
      expect(advCount).toBeGreaterThanOrEqual(1)
      await expect(advSection.getByText(/Uy tín hàng đầu|Giá cạnh tranh|Giao hàng nhanh|Nguồn hàng ổn định/i).first()).toBeVisible()
      verifiedSections.push('advantages')

      // 6. Contact Section from Live Contact API (SS-3: .first() correctly on Locator, SS-2: real verified content)
      const contactSection = page.locator('section#contact')
      await expect(contactSection).toBeVisible()
      await expect(contactSection.getByText(/Lỗi tải thông tin liên hệ|Thử tải lại/i)).toHaveCount(0)
      await expect(contactSection.getByText(/0393/).first()).toBeVisible()
      await expect(contactSection.getByText(/thanhan\.bg@vatlieuxd\.com/i).first()).toBeVisible()

      // M1 Happy Path: V3 seed guarantees Google Maps iframe is present and matches API mapEmbedUrl
      const contactApiResponse = await page.request.get('/api/v1/contact')
      expect(contactApiResponse.ok()).toBe(true)
      const contactApiData = await contactApiResponse.json()
      expect(contactApiData.mapEmbedUrl).toBeTruthy()

      const mapIframe = contactSection.locator('iframe[title="Bản đồ vị trí trụ sở công ty"]')
      await expect(mapIframe).toBeVisible()
      const mapSrc = await mapIframe.getAttribute('src')
      expect(mapSrc).toBe(contactApiData.mapEmbedUrl)
      verifiedSections.push('contact')

      // 7. No horizontal overflow
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
        }
      })
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)

      // 8. Capture acceptance screenshot on verified live catalog PASS
      await captureAcceptanceScreenshot(page, 'home', vp, {
        status: 'passed',
        catalog_count: productCount,
        hero_quick_specs_count: heroItemCount,
        sample_products: sampleNames,
        sections_verified: verifiedSections,
      })

      // 9. M3: Assert clean browser diagnostics for happy path (no uncaught page errors, no console errors, no failed requests)
      diagnostics.assertCleanHappyPath()
    })
  }

  for (const emptyVal of [null, '']) {
    const label = emptyVal === null ? 'null' : 'empty string'
    test(`Contact Section Layout: Centers contact card and hides map when mapEmbedUrl is ${label}`, async ({
      page,
      diagnostics,
    }) => {
      // Intercept /api/v1/contact to simulate absence of map embed URL (M1)
      await page.route('**/api/v1/contact', async (route) => {
        const response = await route.fetch()
        const json = await response.json()
        json.mapEmbedUrl = emptyVal
        await route.fulfill({
          response,
          json,
        })
      })

      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto('/', { waitUntil: 'networkidle' })
      await page.waitForSelector('#app')

      const contactSection = page.locator('section#contact')
      await expect(contactSection).toBeVisible()

      // Map iframe must NOT be rendered
      const mapIframe = contactSection.locator('iframe[title="Bản đồ vị trí trụ sở công ty"]')
      await expect(mapIframe).toHaveCount(0)

      // The container must use max-w-3xl mx-auto (no lg:grid-cols-2) so the single card is centered without blank right half
      const gridContainer = contactSection.locator('.container > div.grid, .container > div.max-w-3xl').first()
      await expect(gridContainer).toBeVisible()
      const containerClass = await gridContainer.getAttribute('class')
      expect(containerClass).toContain('max-w-3xl')
      expect(containerClass).toContain('mx-auto')
      expect(containerClass).not.toContain('grid-cols-2')

      // Contact info headings remain visible without strict-mode violation (distinguishing section h2 and card h3)
      await expect(contactSection.getByRole('heading', { level: 2, name: /Thông tin liên hệ/i })).toBeVisible()
      await expect(contactSection.getByRole('heading', { level: 3, name: /Thông tin liên hệ/i })).toBeVisible()
      await expect(contactSection.getByText(/0393/).first()).toBeVisible()

      diagnostics.assertCleanHappyPath()
    })
  }

  test('Mobile Drawer (390x844): layout, navigation links, and backdrop', async ({ page, diagnostics }) => {
    const mobileVp: ViewportConfig = { name: 'mobile', width: 390, height: 844 }
    await page.setViewportSize({ width: mobileVp.width, height: mobileVp.height })
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForSelector('#app')

    const toggle = page.getByRole('button', { name: /Toggle Navigation Menu/i }).first()
    await expect(toggle).toBeVisible()

    await toggle.click()
    const drawer = page.locator('#mobile-nav-drawer').first()
    await expect(drawer).toBeVisible()

    // M2: Wait for slide-in animation (300ms) to finish and drawer geometry to stabilize
    await page.waitForFunction(
      () => {
        const el = document.getElementById('mobile-nav-drawer')
        if (!el) return false
        const r = el.getBoundingClientRect()
        // Drawer is docked to right edge: r.right aligns with window.innerWidth (<= 1px tolerance) and width is stable (>= 200px)
        return Math.abs(r.right - window.innerWidth) <= 1 && r.width >= 200
      },
      undefined,
      { timeout: 5000 }
    )

    // M2: Strict bounding box checks asserting both lower and upper horizontal bounds (no horizontal overflow)
    const box = await drawer.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(600)
      expect(box.width).toBeGreaterThanOrEqual(200)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(mobileVp.width + 1)
      expect(box.x + box.width).toBeGreaterThanOrEqual(mobileVp.width - 2)
    }

    // M2: Verify title and close controls are clearly rendered and visible
    const drawerTitle = drawer.locator('#mobile-nav-drawer-title')
    await expect(drawerTitle).toBeVisible()

    const closeBtn = drawer.locator('button[aria-label="Đóng menu"]').first()
    await expect(closeBtn).toBeVisible()

    // Navigation links visible inside drawer
    const navItems = ['Trang chủ', 'Giới thiệu', 'Sản phẩm', 'Lợi thế', 'Liên hệ']
    for (const item of navItems) {
      const link = drawer.getByRole('link', { name: item }).first()
      await expect(link).toBeVisible()
    }

    // M2: Recapture drawer open acceptance screenshot after stable final geometry
    await captureAcceptanceScreenshot(page, 'mobile-drawer-open', mobileVp, {
      status: 'passed',
      drawer_box: box,
      sections_verified: ['mobile-drawer'],
    })

    // Close button works
    await closeBtn.click()
    await expect(drawer).toBeHidden()

    // Wait for transition-out to complete and verify no horizontal overflow after closing
    await page.waitForFunction(
      () => {
        const el = document.getElementById('mobile-nav-drawer')
        return !el || el.offsetParent === null || window.getComputedStyle(el).display === 'none'
      },
      undefined,
      { timeout: 5000 }
    )

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
      }
    })
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)

    // M3: Assert clean browser diagnostics
    diagnostics.assertCleanHappyPath()
  })

  test('Resilience: Per-section retry recovers when an API call fails', async ({ page, diagnostics }) => {
    const productsSection = page.locator('section#products')

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
    await expect(productsSection).toBeVisible()

    // M4: Assert retry button and error alert are specifically rendered inside Products section
    const productsErrorAlert = productsSection.locator('[role="alert"]').first()
    await expect(productsErrorAlert).toBeVisible()
    await expect(productsErrorAlert).toContainText(/Không thể tải danh mục sản phẩm|Simulated products error/i)

    const retryBtn = productsSection.getByRole('button', { name: /Thử tải lại|Thử lại|tải lại/i }).first()
    await expect(retryBtn).toBeVisible()

    // M4: Verify that zero product card headings exist in section#products while in error state
    await expect(productsSection.locator('h3')).toHaveCount(0)

    // M4: Bind retry action to response 200 on /api/v1/products
    const recoverResponsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/products') && r.status() === 200,
      { timeout: 10000 }
    )

    // Now resolve route successfully and click retry
    shouldFail = false
    await retryBtn.click()

    // Wait for recovery response 200
    await recoverResponsePromise

    // M4: Assert retry button and error state clear from section#products
    await expect(productsErrorAlert).toHaveCount(0)
    await expect(retryBtn).toHaveCount(0)

    // M4: Assert recovered product cards specifically inside section#products (not page-wide h3)
    const recoveredHeadings = productsSection.locator('h3')
    await expect(recoveredHeadings.first()).toBeVisible()
    const productCount = await recoveredHeadings.count()
    expect(productCount).toBeGreaterThanOrEqual(1)

    // M3 & M4: Verify diagnostics distinguish expected injected 500 from unexpected errors
    diagnostics.assertCleanResilience(/\/api\/v1\/products/)
  })

  test('Synthetic Quote Request Submission', async ({ page, diagnostics }) => {
    const desktopVp: ViewportConfig = { name: 'desktop', width: 1280, height: 800 }
    await page.setViewportSize({ width: desktopVp.width, height: desktopVp.height })
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForSelector('#app')

    const quoteBtn = page.getByRole('button', { name: /Nhận báo giá/i }).first()
    await quoteBtn.click()

    const modal = page.locator('[role="dialog"][aria-modal="true"]').first()
    await expect(modal).toBeVisible()

    // Fill synthetic form data
    const timestamp = Date.now()
    const marker = `MARKER_${timestamp}`
    const syntheticName = `CI Test User ${timestamp}`
    const syntheticPhone = '0987654321'
    const syntheticEmail = `citest_${timestamp}@example.com`
    const syntheticMessage = `CI E2E synthetic verification marker [${marker}]`

    await page.fill('#quote-fullname, #quote-full-name', syntheticName)
    await page.fill('#quote-phone', syntheticPhone)
    await page.fill('#quote-email', syntheticEmail)
    await page.fill('#quote-message', syntheticMessage)

    // Capture created quote id for db-proof (docs/ci/INTERFACE.md)
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/quote-requests') && r.request().method() === 'POST',
      { timeout: 15000 }
    )

    // Submit form
    const submitBtn = modal.getByRole('button', { name: /Gửi yêu cầu báo giá/i })
    await submitBtn.click()

    const response = await responsePromise
    expect(response.status()).toBe(201)
    const body = await response.json()
    expect(body.id).toBeTruthy()

    // SS-1 (C2): Write UI db-proof IMMEDIATELY upon confirming response 201/id/marker,
    // before any screenshot or further UI interactions, so persistence proof is NEVER orphaned.
    const uiProofDir = path.join(process.env.CI_ARTIFACT_DIR || 'ci-artifacts', 'db-proof', 'ui')
    fs.mkdirSync(uiProofDir, { recursive: true })
    fs.writeFileSync(path.join(uiProofDir, 'quote-id.txt'), String(body.id))
    fs.writeFileSync(path.join(uiProofDir, 'quote-marker.txt'), marker)
    fs.writeFileSync(
      path.join(uiProofDir, 'provenance.json'),
      JSON.stringify(
        {
          source: 'ui_playwright_e2e',
          id: String(body.id),
          marker,
          status: 201,
          createdAt: new Date().toISOString(),
        },
        null,
        2
      )
    )

    // Expect success message
    const successAlert = modal.locator('[role="alert"], [role="status"]').filter({ hasText: /thành công/i }).first()
    await expect(successAlert).toBeVisible({ timeout: 15000 })

    // SS-1: Capture quote submission success screenshot while modal and success message are active
    await captureAcceptanceScreenshot(page, 'quote-submission-success', desktopVp, {
      status: 'passed',
      quote_id: String(body.id),
      marker,
      sections_verified: ['quote-modal'],
    })

    // M3: Assert clean browser diagnostics
    diagnostics.assertCleanHappyPath()
  })
})
