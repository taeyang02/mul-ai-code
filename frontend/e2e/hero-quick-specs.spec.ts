import { test, expect } from './fixtures'
import type { Page, Route, Locator } from '@playwright/test'

/**
 * RD-T1 / RD-1 Hero Quick Specs (API-driven) — unified tip for hosted CI.
 * Mocks /api/v1 so catalog can differ from V2 seed; covers loading (delayed),
 * empty, error→retry, LONG_SPECS readable/unclipped at 390 / 1280.
 */

const LONG_SPECS =
  'I100-I600 | H100-H400 | JIS G3101 / SS400 / ASTM A36 | length 6m-12m | zinc coating Z275 | warehouse-ready cut-to-size schedule Q1-Q4'

function baseSite() {
  return {
    brandName: 'Thanh An Bắc Giang',
    tagline: 'Vật liệu xây dựng uy tín',
    heroTitle: 'Vật liệu xây dựng Chất lượng vượt trội',
    heroSubtitle: 'Cross-review mock — catalog driven by /products, not seed hardcode.',
    heroCtaLabel: 'Yêu cầu báo giá',
    heroBadgePrimary: 'Hoạt động từ 2015',
    heroBadgeSecondary: 'Giao nhanh 24/7',
    navItems: [
      { label: 'Trang chủ', href: '#home' },
      { label: 'Sản phẩm', href: '#products' },
      { label: 'Liên hệ', href: '#contact' },
    ],
  }
}

function contact() {
  return {
    hotlineDisplay: '0393.284.994',
    hotlineE164: '0393284994',
    hotlineContactName: 'Nguyễn Hải Yến',
    email: 'thanhan.bg@vatlieuxd.com',
    addressNew: 'Thôn Gò Pháo, Xã Hợp Thịnh, Hiệp Hòa',
  }
}

function productPage(items: unknown[]) {
  return {
    items,
    page: 0,
    size: 20,
    totalItems: items.length,
    totalPages: 1,
  }
}

/** Catalog deliberately different from V2 seed (Hòa Phát / Pomihua). */
const ALT_CATALOG = [
  {
    id: 'alt-steel-box',
    name: 'Thép Hộp Mạ Kẽm Alpha',
    slug: 'thep-hop-ma-kem-alpha',
    brand: 'AlphaSteel',
    specsSummary: '20x20–200x200 | 1.2–5.0mm',
    features: [],
    featured: true,
    sortOrder: 1,
    category: { id: 'c-box', slug: 'thep-hop', name: 'Thép hộp' },
  },
  {
    id: 'alt-purlins',
    name: 'Xà Gồ C-Z Beta',
    slug: 'xa-go-c-z-beta',
    brand: 'BetaMill',
    specsSummary: LONG_SPECS,
    features: [],
    featured: true,
    sortOrder: 2,
    category: { id: 'c-purl', slug: 'xa-go', name: 'Xà gồ' },
  },
]

type ProductsMode = 'alt' | 'empty' | 'error'

async function mockApi(
  page: Page,
  opts: {
    products?: ProductsMode | (() => ProductsMode)
    /** Resolve before /products is fulfilled — keeps loadingProducts true. */
    productsHold?: Promise<void>
  } = {}
) {
  await page.route('**/api/v1/**', async (route: Route) => {
    const url = new URL(route.request().url())
    const p = url.pathname.replace(/\/$/, '')

    if (p.endsWith('/site')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(baseSite()),
      })
    }
    if (p.endsWith('/company')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          legalName: 'CÔNG TY TNHH THANH AN BẮC GIANG',
          tradeName: 'Thanh An Bắc Giang',
        }),
      })
    }
    if (p.endsWith('/categories')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'c-box', slug: 'thep-hop', name: 'Thép hộp', sortOrder: 1 },
          { id: 'c-purl', slug: 'xa-go', name: 'Xà gồ', sortOrder: 2 },
        ]),
      })
    }
    if (p.endsWith('/site/advantages')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    }
    if (p.endsWith('/contact')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(contact()),
      })
    }
    if (p.endsWith('/products')) {
      if (opts.productsHold) await opts.productsHold
      const mode = typeof opts.products === 'function' ? opts.products() : opts.products || 'alt'
      if (mode === 'error') {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 500,
            code: 'HTTP_500',
            message: 'Simulated products catalog failure',
            error: 'Server Error',
            details: [],
          }),
        })
      }
      if (mode === 'empty') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(productPage([])),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(productPage(ALT_CATALOG)),
      })
    }
    return route.fulfill({ status: 404, body: 'not mocked' })
  })
}

/**
 * After scrolling the target into view (below-the-fold is OK), assert the text is
 * actually readable inside Hero — not DOM-only, not ellipsis-truncated, and not clipped
 * by overflow on the relevant axis of containing frames (incl. section#home overflow-hidden).
 * Does not rely on page-level scrollWidth under overflow-x: hidden.
 */
async function assertReadableUnclippedInHero(locator: Locator) {
  await expect(locator).toBeVisible()
  await locator.scrollIntoViewIfNeeded()

  const box = await locator.boundingBox()
  expect(box, 'boundingBox missing — element not laid out').not.toBeNull()
  expect(box!.width).toBeGreaterThan(1)
  expect(box!.height).toBeGreaterThan(1)

  const metrics = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const hero = el.closest('section#home') as HTMLElement | null
    if (!hero) return { ok: false as const, reason: 'not inside section#home' }

    const eps = 1.5
    const h = hero.getBoundingClientRect()
    const inHero =
      r.left >= h.left - eps &&
      r.right <= h.right + eps &&
      r.top >= h.top - eps &&
      r.bottom <= h.bottom + eps

    // After scrollIntoViewIfNeeded the painted box must sit in the viewport.
    const inViewport =
      r.left >= -eps &&
      r.top >= -eps &&
      r.right <= window.innerWidth + eps &&
      r.bottom <= window.innerHeight + eps

    let clippedByAncestor = false
    let clipDetail = ''
    let node: HTMLElement | null = el as HTMLElement
    while (node && node !== hero.parentElement) {
      const cs = window.getComputedStyle(node)
      const clipX = /(hidden|auto|scroll|clip)/.test(cs.overflowX)
      const clipY = /(hidden|auto|scroll|clip)/.test(cs.overflowY)
      if (clipX || clipY) {
        const nr = node.getBoundingClientRect()
        const outX = clipX && (r.left < nr.left - eps || r.right > nr.right + eps)
        const outY = clipY && (r.top < nr.top - eps || r.bottom > nr.bottom + eps)
        if (outX || outY) {
          clippedByAncestor = true
          clipDetail = `${node.tagName} ox=${cs.overflowX} oy=${cs.overflowY} outX=${outX} outY=${outY}`
          break
        }
      }
      node = node.parentElement
    }

    const cs = window.getComputedStyle(el)
    const textTruncated = el.scrollWidth > el.clientWidth + 1
    const ellipsisActive =
      (cs.textOverflow === 'ellipsis' || /ellipsis/.test(cs.textOverflow)) &&
      el.scrollWidth > el.clientWidth + 1

    return {
      ok: true as const,
      inHero,
      inViewport,
      clippedByAncestor,
      clipDetail,
      textTruncated,
      ellipsisActive,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      text: (el.textContent || '').trim(),
    }
  })

  expect(metrics.ok, 'metrics').toBe(true)
  if (!metrics.ok) return
  expect(metrics.inHero, `not fully inside Hero: ${metrics.text}`).toBe(true)
  expect(metrics.inViewport, `not in viewport after scroll: ${metrics.text}`).toBe(true)
  expect(
    metrics.clippedByAncestor,
    `clipped by overflow ancestor (${metrics.clipDetail}): ${metrics.text}`
  ).toBe(false)
  expect(
    metrics.textTruncated || metrics.ellipsisActive,
    `text truncated/ellipsis (scrollWidth=${metrics.scrollWidth} clientWidth=${metrics.clientWidth}): ${metrics.text}`
  ).toBe(false)
}

test.describe('Hero Quick Specs (RD-1 API-driven)', () => {
  test('alt catalog: name + LONG_SPECS readable/unclipped at 1280 and 390', async ({ page }) => {
    await mockApi(page, { products: 'alt' })

    for (const vp of [
      { w: 1280, h: 800 },
      { w: 390, h: 844 },
    ]) {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await page.goto('/', { waitUntil: 'networkidle' })
      await page.waitForSelector('#app')

      const home = page.locator('section#home')
      await expect(home.getByText('Thép Hòa Phát', { exact: false })).toHaveCount(0)
      await expect(home.getByText('Xi măng Pomihua', { exact: false })).toHaveCount(0)

      await assertReadableUnclippedInHero(home.getByText('Thép Hộp Mạ Kẽm Alpha'))
      await assertReadableUnclippedInHero(home.getByText('AlphaSteel'))
      await assertReadableUnclippedInHero(home.getByText('20x20–200x200 | 1.2–5.0mm'))
      await assertReadableUnclippedInHero(home.getByText('Xà Gồ C-Z Beta'))
      await assertReadableUnclippedInHero(home.getByText('BetaMill'))
      await assertReadableUnclippedInHero(home.getByText(LONG_SPECS))
    }
  })

  test('empty products → empty-state copy (no sample rows)', async ({ page }) => {
    await mockApi(page, { products: 'empty' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForSelector('#app')

    const home = page.locator('section#home')
    await assertReadableUnclippedInHero(home.getByText(/Hiện chưa có dữ liệu danh mục sản phẩm/i))
    await expect(home.getByText('Thép Hộp Mạ Kẽm Alpha')).toHaveCount(0)
    await expect(home.getByText('Thép Hòa Phát')).toHaveCount(0)
  })

  test('products error → retry recovers with alt catalog', async ({ page }) => {
    let productsMode: ProductsMode = 'error'
    await mockApi(page, { products: () => productsMode })

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForSelector('#app')

    const home = page.locator('section#home')
    await assertReadableUnclippedInHero(
      home.getByText(/Simulated products catalog failure|Không thể tải danh mục/i)
    )
    const retry = home.getByRole('button', { name: /Thử lại/i })
    await assertReadableUnclippedInHero(retry)

    productsMode = 'alt'
    await retry.click()
    await assertReadableUnclippedInHero(home.getByText('Thép Hộp Mạ Kẽm Alpha'))
    await assertReadableUnclippedInHero(home.getByText('Xà Gồ C-Z Beta'))
  })

  test('products delayed → loading skeleton then alt catalog', async ({ page }) => {
    let release!: () => void
    const productsHold = new Promise<void>((r) => {
      release = r
    })
    await mockApi(page, { products: 'alt', productsHold })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('#app')

    const home = page.locator('section#home')
    const skeleton = home.locator('.animate-pulse').first()
    await expect(skeleton).toBeVisible()
    await expect(home.getByText('Thép Hộp Mạ Kẽm Alpha')).toHaveCount(0)

    release()
    await assertReadableUnclippedInHero(home.getByText('Thép Hộp Mạ Kẽm Alpha'))
    await assertReadableUnclippedInHero(home.getByText(LONG_SPECS))
  })
})
