#!/usr/bin/env node
/**
 * Real browser E2E harness for Thanh An Bắc Giang.
 * - Opens the running Vite (or preview) app — does NOT fake results.
 * - Fault injection via Playwright network routes only (never production hooks).
 * - Any failed assertion exits nonzero.
 *
 * Env:
 *   BASE_URL      default http://127.0.0.1:5173
 *   API_BASE      default http://127.0.0.1:8080/api/v1
 *   SHOT_DIR      default ./e2e-artifacts
 *   CHROME_PATH   optional Chromium executable
 *   DB_JDBC_CHECK default 1 — verify quote rows via JDBC helper if available
 */
import { chromium } from 'playwright-core'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5173'
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080/api/v1'
const SHOT_DIR = process.env.SHOT_DIR || path.join(__dirname, 'e2e-artifacts')
const CHROME_PATH =
  process.env.CHROME_PATH ||
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  '/home/multica/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell'

const failures = []
const logLines = []

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`
  console.log(line)
  logLines.push(line)
}

function fail(msg) {
  failures.push(msg)
  log(`FAIL: ${msg}`)
}

function assert(cond, msg) {
  if (!cond) fail(msg)
}

async function quoteCountViaApiProbe() {
  // Prefer DB count helper if present; else count via side-effect free approach:
  // create unique marker and ensure GET list isn't public — we only verify POST 201 + JDBC file.
  return null
}

function countQuotesInDb() {
  const jdbc =
    process.env.PG_JDBC_JAR ||
    `${process.env.HOME}/.m2/repository/org/postgresql/postgresql/42.7.4/postgresql-42.7.4.jar`
  const javaSrc = `
import java.sql.*;
public class CountQuotesE2E {
  public static void main(String[] a) throws Exception {
    try (Connection c = DriverManager.getConnection(
        System.getenv().getOrDefault("DATABASE_URL_JDBC", "jdbc:postgresql://127.0.0.1:5432/thanhan"),
        System.getenv().getOrDefault("DATABASE_USERNAME", "thanhan"),
        System.getenv().getOrDefault("DATABASE_PASSWORD", "thanhan"));
         Statement s = c.createStatement();
         ResultSet rs = s.executeQuery("SELECT count(*) FROM quote_requests")) {
      rs.next();
      System.out.print(rs.getInt(1));
    }
  }
}
`
  const tmp = path.join(SHOT_DIR, '_jdbc')
  fs.mkdirSync(tmp, { recursive: true })
  fs.writeFileSync(path.join(tmp, 'CountQuotesE2E.java'), javaSrc)
  const javac = spawnSync('javac', ['-cp', jdbc, 'CountQuotesE2E.java'], { cwd: tmp, encoding: 'utf8' })
  if (javac.status !== 0) {
    log(`WARN: javac failed: ${javac.stderr}`)
    return null
  }
  const run = spawnSync('java', ['-cp', `${tmp}:${jdbc}`, 'CountQuotesE2E'], { encoding: 'utf8' })
  if (run.status !== 0) {
    log(`WARN: java CountQuotes failed: ${run.stderr}`)
    return null
  }
  return Number(run.stdout.trim())
}

async function launchBrowser() {
  const opts = {
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  }
  if (fs.existsSync(CHROME_PATH)) opts.executablePath = CHROME_PATH
  return chromium.launch(opts)
}

async function waitForApp(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('#app', { timeout: 15000 })
  // Brand from API seed
  await page.waitForTimeout(800)
}

async function assertNoSevereConsole(consoleErrors, label) {
  const severe = consoleErrors.filter(
    (t) => !/Download the Vue Devtools|\[vite\]|favicon/i.test(t)
  )
  assert(severe.length === 0, `${label}: console errors: ${severe.slice(0, 3).join(' | ')}`)
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    }
  })
  assert(
    overflow.scrollWidth <= overflow.clientWidth + 1,
    `${label}: horizontal overflow scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth}`
  )
}

async function expectVisibleText(page, text, label) {
  const visible = await page.getByText(text, { exact: false }).first().isVisible().catch(() => false)
  assert(visible, `${label}: expected visible text "${text}"`)
}

function retryControl(page) {
  return page.getByRole('button', { name: /Thử tải lại|Thử lại|tải lại/i })
}

async function suiteViewports(browser) {
  log('=== SUITE: viewports 1440 / 768 / 390 ===')
  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 390, height: 844 },
  ]
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
    const page = await context.newPage()
    const consoleErrors = []
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text())
    })
    page.on('pageerror', (e) => consoleErrors.push(String(e)))

    await waitForApp(page)
    await expectVisibleText(page, 'Thanh An Bắc Giang', `${vp.name} brand`)
    await expectVisibleText(page, 'Thép Hòa Phát', `${vp.name} product`)
    // Hotline may be abbreviated; match digits
    const hotlineVisible = await page.getByText(/0393/).first().isVisible().catch(() => false)
    assert(hotlineVisible, `${vp.name}: hotline 0393 not visible on first paint`)
    await assertNoHorizontalOverflow(page, vp.name)
    await assertNoSevereConsole(consoleErrors, vp.name)
    await page.screenshot({ path: path.join(SHOT_DIR, `${vp.name}-home.png`), fullPage: true })
    log(`[${vp.name}] viewport OK brand/product/hotline`)
    await context.close()
  }
}

async function suitePartialFailure(browser, endpointPath, sectionHint) {
  log(`=== SUITE: partial failure ${endpointPath} ===`)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  // Abort only the targeted API path (exact pathname; do not let /site match /site/advantages)
  const matchPath = (url) => {
    try {
      const p = new URL(url).pathname.replace(/\/$/, '') || '/'
      const target = endpointPath.replace(/\/$/, '')
      return p === target
    } catch {
      return false
    }
  }
  await page.route(matchPath, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          status: 500,
          error: 'Internal Server Error',
          code: 'INTERNAL_ERROR',
          message: `Simulated failure for ${endpointPath}`,
          path: endpointPath,
          details: [],
        }),
      })
    } else {
      await route.continue()
    }
  })

  await waitForApp(page)

  // Other sections should still show seeded content when only one endpoint fails
  if (!endpointPath.includes('/site') || endpointPath.includes('advantages')) {
    // company/contact may still load
  }
  if (endpointPath.includes('/products')) {
    await expectVisibleText(page, 'Thanh An Bắc Giang', 'products-fail keeps brand')
  }

  const hasRetry = (await retryControl(page).count()) > 0
  const hasErrorCopy = await page
    .getByText(/Không thể tải|lỗi|HTTP_NETWORK_ERROR|INTERNAL_ERROR|Simulated failure|Thông báo kết nối/i)
    .first()
    .isVisible()
    .catch(() => false)

  assert(
    hasRetry || hasErrorCopy,
    `${endpointPath}: expected section/global error UI and/or retry control (${sectionHint})`
  )

  await page.screenshot({
    path: path.join(SHOT_DIR, `error-${endpointPath.replace(/\W+/g, '_')}.png`),
    fullPage: true,
  })

  // Remove fault injection — retry must hit real API
  await page.unroute(matchPath)
  if (hasRetry) {
    // Prefer section-specific retry labels when present
    const specific = page.getByRole('button', {
      name: /Thử tải lại sản phẩm|Thử tải lại danh mục|Thử tải lại$/i,
    })
    const btn = (await specific.count()) > 0 ? specific.first() : retryControl(page).first()
    await btn.click()
    await page.waitForTimeout(2000)
  } else {
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
  }

  // After recovery, products/brand should be healthy for products case
  if (endpointPath.includes('/products')) {
    await expectVisibleText(page, 'Thép Hòa Phát', 'products recovered')
  }
  if (endpointPath.includes('/company') || endpointPath === '/api/v1/site') {
    await expectVisibleText(page, 'Thanh An Bắc Giang', 'site/company recovered')
  }

  await page.screenshot({
    path: path.join(SHOT_DIR, `retry-${endpointPath.replace(/\W+/g, '_')}.png`),
    fullPage: true,
  })
  log(`[partial] ${endpointPath} error UI + recovery exercised`)
  await context.close()
}

async function suiteQuote(browser) {
  log('=== SUITE: quote request persists to DB ===')
  const before = countQuotesInDb()
  log(`quote_requests before=${before}`)

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await waitForApp(page)

  const openBtn = page.getByRole('button', { name: /báo giá|Yêu cầu/i }).first()
  assert((await openBtn.count()) > 0, 'quote CTA missing')
  await openBtn.click()
  await page.waitForTimeout(500)

  const marker = `E2E-QUOTE-${Date.now()}`
  const inputs = page.locator('input:visible')
  const n = await inputs.count()
  assert(n >= 2, `quote form inputs expected >=2 got ${n}`)
  await inputs.nth(0).fill('Nguyen Van Harness')
  await inputs.nth(1).fill('0393284994')
  const ta = page.locator('textarea:visible').first()
  assert((await ta.count()) > 0, 'quote message textarea missing')
  await ta.fill(`${marker} xin bao gia thep D16`)

  const submit = page.locator('button').filter({ hasText: /Gửi/i }).first()
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v1/quote-requests') && r.request().method() === 'POST',
      { timeout: 15000 }
    ),
    submit.click(),
  ])
  assert(response.status() === 201, `quote POST expected 201 got ${response.status()}`)
  const body = await response.json()
  assert(!!body.id, 'quote response missing id')
  log(`quote created id=${body.id}`)

  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(SHOT_DIR, 'desktop-quote-result.png') })

  const after = countQuotesInDb()
  log(`quote_requests after=${after}`)
  if (before != null && after != null) {
    assert(after > before, `DB quote count did not increase (${before} -> ${after})`)
  } else {
    fail('Could not verify quote persistence via JDBC count')
  }

  await context.close()
}

async function suiteApiHealth() {
  log('=== SUITE: direct API health ===')
  for (const p of ['/site', '/company', '/categories', '/products', '/site/advantages', '/contact']) {
    const res = await fetch(`${API_BASE}${p}`)
    assert(res.ok, `GET ${p} -> ${res.status}`)
  }
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true })
  log(`BASE_URL=${BASE_URL} API_BASE=${API_BASE} SHOT_DIR=${SHOT_DIR}`)

  // Smoke: app reachable
  try {
    const r = await fetch(BASE_URL)
    assert(r.ok, `BASE_URL not reachable: ${BASE_URL} -> ${r.status}`)
  } catch (e) {
    fail(`BASE_URL fetch failed: ${e.message}`)
    finish()
    return
  }

  await suiteApiHealth()

  const browser = await launchBrowser()
  try {
    await suiteViewports(browser)
    // Independent endpoint faults
    await suitePartialFailure(browser, '/api/v1/products', 'products')
    await suitePartialFailure(browser, '/api/v1/site/advantages', 'advantages')
    await suitePartialFailure(browser, '/api/v1/categories', 'categories')
    await suitePartialFailure(browser, '/api/v1/site', 'site')
    await suiteQuote(browser)
  } finally {
    await browser.close()
  }

  finish()
}

function finish() {
  fs.writeFileSync(path.join(SHOT_DIR, 'verify-e2e.log'), logLines.join('\n') + '\n')
  if (failures.length) {
    log(`=== RESULT: FAIL (${failures.length}) ===`)
    for (const f of failures) log(` - ${f}`)
    process.exit(1)
  }
  log('=== RESULT: PASS ===')
  process.exit(0)
}

main().catch((e) => {
  fail(`unhandled: ${e.stack || e}`)
  finish()
})
