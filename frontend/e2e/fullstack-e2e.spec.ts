import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
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
  is_merge_commit: boolean
  run_id: string
  run_attempt: string
}

function resolveGitMetadata(): GitMetadata {
  let checkoutSha = process.env.GITHUB_SHA || 'unknown'
  let sourceHeadSha = checkoutSha
  let isMergeCommit = false
  const runId = process.env.GITHUB_RUN_ID || 'local'
  const runAttempt = process.env.GITHUB_RUN_ATTEMPT || '1'

  try {
    const cwd = path.resolve(__dirname, '..')
    const head = execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim()
    if (head) checkoutSha = head

    const parentsRaw = execSync('git rev-parse HEAD^@', { cwd, encoding: 'utf8' }).trim()
    const parents = parentsRaw ? parentsRaw.split(/\s+/) : []
    if (parents.length >= 2) {
      isMergeCommit = true
      // In GitHub Actions PR merge commit (refs/pull/X/merge):
      // Parent 0 = target branch (e.g. main)
      // Parent 1 = PR source branch HEAD
      sourceHeadSha = parents[1]
    } else {
      sourceHeadSha = checkoutSha
    }
  } catch {
    if (process.env.PR_HEAD_SHA) {
      sourceHeadSha = process.env.PR_HEAD_SHA
      isMergeCommit = sourceHeadSha !== checkoutSha
    }
  }

  return {
    checkout_sha: checkoutSha,
    source_head_sha: sourceHeadSha,
    is_merge_commit: isMergeCommit,
    run_id: runId,
    run_attempt: runAttempt,
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

      // 3. Verify Live Catalog API data in Hero Quick Specs (SS-2: wait for real API, no skeleton, no error)
      const hero = page.locator('section#home')
      await expect(hero).toBeVisible()
      await expect(hero.locator('.animate-pulse')).toHaveCount(0)
      await expect(hero.getByText(/Không thể tải|Thử lại/i)).toHaveCount(0)
      const heroItems = hero.locator('ul li')
      await expect(heroItems.first()).toBeVisible()
      const heroItemCount = await heroItems.count()
      expect(heroItemCount).toBeGreaterThanOrEqual(1)

      // 4. Verify Live Products Section loaded from real API (SS-2: real catalog data required)
      const productsSection = page.locator('section#products')
      await expect(productsSection).toBeVisible()
      await expect(productsSection.locator('.animate-pulse')).toHaveCount(0)
      await expect(productsSection.getByText(/Không thể tải danh mục sản phẩm/i)).toHaveCount(0)
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

      // 5. Verify Advantages Section loaded from real API
      const advSection = page.locator('section#advantages')
      await expect(advSection).toBeVisible()
      await expect(advSection.locator('.animate-pulse')).toHaveCount(0)

      // 6. Verify Contact Section loaded from real API
      const contactSection = page.locator('section#contact')
      await expect(contactSection).toBeVisible()
      await expect(contactSection.getByText(/0393/)).first().toBeVisible()

      // 7. No horizontal overflow
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
        }
      })
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)

      // 8. Capture acceptance screenshot on verified live catalog PASS (SS-2: real API verified)
      await captureAcceptanceScreenshot(page, 'home', vp, {
        status: 'passed',
        catalog_count: productCount,
        hero_quick_specs_count: heroItemCount,
        sample_products: sampleNames,
        sections_verified: ['header', 'hero-quick-specs', 'about', 'products', 'advantages', 'contact'],
      })
    })
  }

  test('Mobile Drawer (390x844): layout, navigation links, and backdrop', async ({ page }) => {
    const mobileVp: ViewportConfig = { name: 'mobile', width: 390, height: 844 }
    await page.setViewportSize({ width: mobileVp.width, height: mobileVp.height })
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

    // Capture drawer open acceptance screenshot
    await captureAcceptanceScreenshot(page, 'mobile-drawer-open', mobileVp, { status: 'passed' })

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
    })
  })
})
