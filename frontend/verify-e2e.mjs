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

function jdbcClasspath() {
  return (
    process.env.PG_JDBC_JAR ||
    `${process.env.HOME}/.m2/repository/org/postgresql/postgresql/42.7.4/postgresql-42.7.4.jar`
  )
}

function javaBin(name) {
  const home = process.env.JAVA_HOME
  if (home) {
    const candidate = path.join(home, 'bin', name)
    if (fs.existsSync(candidate)) return candidate
  }
  return name
}

function spawnJavaTool(binName, args, opts = {}) {
  const attempts = 3
  let last = null
  for (let i = 0; i < attempts; i++) {
    last = spawnSync(javaBin(binName), args, {
      encoding: 'utf8',
      env: process.env,
      ...opts,
    })
    const errMsg = String(last.stderr || last.error || '')
    if (last.status === 0) return last
    if (!/EAGAIN|unable to create native thread|pthread_create failed/i.test(errMsg) && last.status !== null) {
      return last
    }
    spawnSync('sleep', [`${0.75 * (i + 1)}`], { encoding: 'utf8' })
  }
  return last
}

function runJdbcQuery(javaClassName, javaSource) {
  const jdbc = jdbcClasspath()
  const tmp = path.join(SHOT_DIR, '_jdbc')
  fs.mkdirSync(tmp, { recursive: true })
  fs.writeFileSync(path.join(tmp, `${javaClassName}.java`), javaSource)
  const classFile = path.join(tmp, `${javaClassName}.class`)
  if (!fs.existsSync(classFile)) {
    const javac = spawnJavaTool('javac', ['-cp', jdbc, `${javaClassName}.java`], { cwd: tmp })
    if (!javac || javac.status !== 0) {
      log(`WARN: javac failed: ${(javac && (javac.stderr || javac.stdout || javac.error)) || 'unknown'}`)
      return null
    }
  }
  const run = spawnJavaTool('java', ['-cp', `${tmp}:${jdbc}`, javaClassName])
  if (!run || run.status !== 0) {
    log(`WARN: java ${javaClassName} failed: ${(run && (run.stderr || run.stdout || run.error)) || 'unknown'}`)
    return null
  }
  return run.stdout.trim()
}

function countQuotesInDb() {
  const out = runJdbcQuery(
    'CountQuotesE2E',
    `
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
  )
  return out == null ? null : Number(out)
}

function findQuoteInDb(id, marker) {
  const safeId = String(id).replace(/'/g, "")
  const safeMarker = String(marker).replace(/'/g, "")
  const out = runJdbcQuery(
    'FindQuoteE2E',
    `
import java.sql.*;
public class FindQuoteE2E {
  public static void main(String[] a) throws Exception {
    try (Connection c = DriverManager.getConnection(
        System.getenv().getOrDefault("DATABASE_URL_JDBC", "jdbc:postgresql://127.0.0.1:5432/thanhan"),
        System.getenv().getOrDefault("DATABASE_USERNAME", "thanhan"),
        System.getenv().getOrDefault("DATABASE_PASSWORD", "thanhan"));
         PreparedStatement ps = c.prepareStatement(
           "SELECT id::text, message FROM quote_requests WHERE id = ?::uuid")) {
      ps.setString(1, "${safeId}");
      try (ResultSet rs = ps.executeQuery()) {
        if (!rs.next()) { System.out.print("MISSING"); return; }
        String msg = rs.getString(2);
        if (msg != null && msg.contains("${safeMarker}")) System.out.print("OK");
        else System.out.print("MARKER_MISMATCH");
      }
    }
  }
}
`
  )
  return out
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
  // Prefer load over networkidle: Vite HMR websockets can keep networkidle pending forever.
  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 60000 })
  await page.waitForSelector('#app', { timeout: 15000 })
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
  return overflow
}

async function expectVisibleText(page, text, label) {
  const visible = await page.getByText(text, { exact: false }).first().isVisible().catch(() => false)
  assert(visible, `${label}: expected visible text "${text}"`)
}

function retryControl(page) {
  return page.getByRole('button', { name: /Thử tải lại|Thử lại|tải lại/i })
}

function pathMatcher(endpointPath) {
  return (url) => {
    try {
      const p = new URL(url).pathname.replace(/\/$/, '') || '/'
      const target = endpointPath.replace(/\/$/, '')
      return p === target
    } catch {
      return false
    }
  }
}

const RECOVERY_EXPECTATIONS = {
  '/api/v1/products': {
    successBody: (j) => Array.isArray(j?.items) && j.items.some((i) => /Thép Hòa Phát/i.test(i?.name || '')),
    visibleText: 'Thép Hòa Phát',
  },
  '/api/v1/site/advantages': {
    successBody: (j) => Array.isArray(j) && j.some((a) => /Uy tín hàng đầu/i.test(a?.title || '')),
    visibleText: 'Uy tín hàng đầu',
  },
  '/api/v1/categories': {
    successBody: (j) => Array.isArray(j) && j.some((c) => /Thép xây dựng/i.test(c?.name || '')),
    visibleText: 'Thép xây dựng',
  },
  '/api/v1/site': {
    successBody: (j) => j && /Thanh An Bắc Giang/i.test(j.brandName || ''),
    visibleText: 'Thanh An Bắc Giang',
  },
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
    const hotlineVisible = await page.getByText(/0393/).first().isVisible().catch(() => false)
    assert(hotlineVisible, `${vp.name}: hotline 0393 not visible on first paint`)
    await assertNoHorizontalOverflow(page, vp.name)
    await assertNoSevereConsole(consoleErrors, vp.name)
    await page.screenshot({ path: path.join(SHOT_DIR, `${vp.name}-home.png`), fullPage: true })
    log(`[${vp.name}] viewport OK brand/product/hotline`)
    await context.close()
  }
}

async function suiteMobileDrawer(browser) {
  log('=== SUITE: mobile drawer open/close ===')
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await waitForApp(page)

  const navLabels = ['Trang chủ', 'Giới thiệu', 'Sản phẩm', 'Lợi thế', 'Liên hệ']
  const toggle = page.getByRole('button', { name: /Toggle Navigation Menu/i })
  assert((await toggle.count()) > 0, 'mobile menu toggle missing')

  const closedOverflow = await assertNoHorizontalOverflow(page, 'mobile-drawer-closed')
  log(`[drawer] closed scrollWidth=${closedOverflow.scrollWidth} clientWidth=${closedOverflow.clientWidth}`)
  const hotlineClosed = await page.getByText(/0393/).first().isVisible().catch(() => false)
  assert(hotlineClosed, 'mobile drawer closed: hotline must stay visible')

  await toggle.click()
  await page.waitForTimeout(500)
  const drawer = page.locator('div.fixed.top-0.right-0').filter({ hasText: /Trang chủ|Sản phẩm|Nhận báo giá/i })
  assert((await drawer.count()) > 0 && (await drawer.first().isVisible()), 'mobile drawer did not open')

  const box = await drawer.first().boundingBox()
  assert(!!box, 'mobile drawer missing bounding box')
  assert(box.height >= 600, `mobile drawer height too small for viewport: ${box.height}`)
  assert(box.width >= 200, `mobile drawer width too small: ${box.width}`)
  assert(box.y <= 8, `mobile drawer top not near viewport top: y=${box.y}`)
  // Right edge should reach near the viewport (fixed right drawer)
  assert(box.x + box.width >= 380, `mobile drawer does not reach viewport right edge: ${JSON.stringify(box)}`)
  log(`[drawer] open box x=${box.x} y=${box.y} w=${box.width} h=${box.height}`)

  const backdrop = page.locator('div.fixed.inset-0').first()
  if ((await backdrop.count()) > 0) {
    const bb = await backdrop.boundingBox()
    assert(!!bb && bb.width >= 380 && bb.height >= 800, `backdrop not full viewport: ${JSON.stringify(bb)}`)
  }

  for (const label of navLabels) {
    const link = drawer.getByRole('link', { name: label }).first()
    assert((await link.count()) > 0, `drawer missing nav link: ${label}`)
    assert(await link.isVisible(), `drawer nav link not visible: ${label}`)
    const lb = await link.boundingBox()
    assert(!!lb && lb.height > 0 && lb.y >= 0 && lb.y + lb.height <= 844, `drawer link ${label} outside viewport: ${JSON.stringify(lb)}`)
    // Must be clickable (not clipped by header containing block)
    await link.click({ trial: true })
  }

  const openOverflow = await assertNoHorizontalOverflow(page, 'mobile-drawer-open')
  log(`[drawer] open scrollWidth=${openOverflow.scrollWidth} clientWidth=${openOverflow.clientWidth}`)
  await page.screenshot({ path: path.join(SHOT_DIR, 'mobile-drawer-open.png'), fullPage: true })

  // Close via in-drawer X (header toggle may be covered by the panel)
  const closeInDrawer = drawer.locator('button').first()
  assert((await closeInDrawer.count()) > 0, 'mobile drawer close control missing')
  await closeInDrawer.click()
  await page.waitForTimeout(400)
  assert((await drawer.count()) === 0 || !(await drawer.first().isVisible().catch(() => false)), 'mobile drawer did not close')
  const afterOverflow = await assertNoHorizontalOverflow(page, 'mobile-drawer-reclosed')
  log(`[drawer] reclosed scrollWidth=${afterOverflow.scrollWidth} clientWidth=${afterOverflow.clientWidth}`)
  await page.screenshot({ path: path.join(SHOT_DIR, 'mobile-drawer-closed.png'), fullPage: true })

  log('[drawer] open/close + viewport links OK')
  await context.close()
}

async function focusInside(locator) {
  return locator.evaluate((el) => el.contains(document.activeElement) || el === document.activeElement)
}

async function activeTagName(page) {
  return page.evaluate(() => {
    const el = document.activeElement
    if (!el) return null
    return {
      tag: el.tagName,
      id: el.id || null,
      name: el.getAttribute('name'),
      aria: el.getAttribute('aria-label'),
      text: (el.textContent || '').trim().slice(0, 40),
    }
  })
}

async function suiteKeyboardA11y(browser) {
  log('=== SUITE: keyboard a11y modal + drawer ===')

  // --- Quote modal: Tab / Shift+Tab trap, Escape, focus restore ---
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    await waitForApp(page)

    const openBtn = page.getByRole('button', { name: /báo giá|Yêu cầu/i }).first()
    assert((await openBtn.count()) > 0, 'keyboard modal: quote CTA missing')
    await openBtn.focus()
    const openerBefore = await activeTagName(page)
    await openBtn.click()
    await page.waitForTimeout(400)

    const dialog = page.getByRole('dialog').first()
    assert(await dialog.isVisible(), 'keyboard modal: role=dialog not visible')
    await page.waitForTimeout(200)
    const focusedInside = await focusInside(dialog)
    assert(focusedInside, `keyboard modal: initial focus not inside dialog (${JSON.stringify(await activeTagName(page))})`)
    log(`[keyboard-modal] initial focus inside dialog: ${JSON.stringify(await activeTagName(page))}`)

    // Tab wrap: move to last focusable then Tab → first
    const focusables = dialog.locator(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    const n = await focusables.count()
    assert(n >= 2, `keyboard modal: expected >=2 focusables got ${n}`)
    await focusables.nth(n - 1).focus()
    await page.keyboard.press('Tab')
    const afterTabWrap = await focusables.nth(0).evaluate((el) => el === document.activeElement)
    assert(afterTabWrap, `keyboard modal: Tab from last did not wrap to first (${JSON.stringify(await activeTagName(page))})`)
    log('[keyboard-modal] Tab wrap last→first OK')

    await focusables.nth(0).focus()
    await page.keyboard.press('Shift+Tab')
    const afterShiftWrap = await focusables.nth(n - 1).evaluate((el) => el === document.activeElement)
    assert(afterShiftWrap, `keyboard modal: Shift+Tab from first did not wrap to last (${JSON.stringify(await activeTagName(page))})`)
    log('[keyboard-modal] Shift+Tab wrap first→last OK')

    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    assert(!(await dialog.isVisible().catch(() => false)), 'keyboard modal: Escape did not close dialog')
    const restored = await openBtn.evaluate((el) => el === document.activeElement)
    assert(restored, `keyboard modal: focus not restored to opener (before=${JSON.stringify(openerBefore)} after=${JSON.stringify(await activeTagName(page))})`)
    log('[keyboard-modal] Escape + focus restore OK')
    await page.screenshot({ path: path.join(SHOT_DIR, 'keyboard-modal-closed.png') })
    await context.close()
  }

  // --- Mobile drawer: Tab / Shift+Tab trap, Escape, focus restore ---
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    await waitForApp(page)

    const toggle = page.getByRole('button', { name: /Toggle Navigation Menu/i })
    assert((await toggle.count()) > 0, 'keyboard drawer: toggle missing')
    await toggle.focus()
    await toggle.click()
    await page.waitForTimeout(400)

    const drawer = page.getByRole('dialog').filter({ hasText: /Trang chủ|Sản phẩm|Nhận báo giá/i }).first()
    assert(await drawer.isVisible(), 'keyboard drawer: role=dialog not visible')
    const focusedInside = await focusInside(drawer)
    assert(focusedInside, `keyboard drawer: initial focus not inside drawer (${JSON.stringify(await activeTagName(page))})`)
    log(`[keyboard-drawer] initial focus inside drawer: ${JSON.stringify(await activeTagName(page))}`)

    const focusables = drawer.locator(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    const n = await focusables.count()
    assert(n >= 2, `keyboard drawer: expected >=2 focusables got ${n}`)
    await focusables.nth(n - 1).focus()
    await page.keyboard.press('Tab')
    const afterTabWrap = await focusables.nth(0).evaluate((el) => el === document.activeElement)
    assert(afterTabWrap, `keyboard drawer: Tab from last did not wrap to first (${JSON.stringify(await activeTagName(page))})`)
    log('[keyboard-drawer] Tab wrap last→first OK')

    await focusables.nth(0).focus()
    await page.keyboard.press('Shift+Tab')
    const afterShiftWrap = await focusables.nth(n - 1).evaluate((el) => el === document.activeElement)
    assert(afterShiftWrap, `keyboard drawer: Shift+Tab from first did not wrap to last (${JSON.stringify(await activeTagName(page))})`)
    log('[keyboard-drawer] Shift+Tab wrap first→last OK')

    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    assert(!(await drawer.isVisible().catch(() => false)), 'keyboard drawer: Escape did not close')
    const restored = await toggle.evaluate((el) => el === document.activeElement)
    assert(restored, `keyboard drawer: focus not restored to toggle (${JSON.stringify(await activeTagName(page))})`)
    log('[keyboard-drawer] Escape + focus restore OK')
    await page.screenshot({ path: path.join(SHOT_DIR, 'keyboard-drawer-closed.png') })
    await context.close()
  }

  log('[keyboard] modal + drawer Tab/Shift+Tab/Escape/focus-restore OK')
}

async function suitePartialFailure(browser, endpointPath, sectionHint) {
  log(`=== SUITE: partial failure ${endpointPath} ===`)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const matchPath = pathMatcher(endpointPath)
  const expectation = RECOVERY_EXPECTATIONS[endpointPath]
  assert(!!expectation, `missing recovery expectation for ${endpointPath}`)

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

  // Unrelated content must remain when only one endpoint fails
  if (endpointPath !== '/api/v1/site') {
    await expectVisibleText(page, 'Thanh An Bắc Giang', `${sectionHint}-fail keeps brand`)
  }
  if (endpointPath !== '/api/v1/products') {
    await expectVisibleText(page, 'Thép Hòa Phát', `${sectionHint}-fail keeps products`)
  }

  const hasRetry = (await retryControl(page).count()) > 0
  assert(hasRetry, `${endpointPath}: retry control required (no reload fallback)`)

  const hasErrorCopy = await page
    .getByText(/Không thể tải|lỗi|HTTP_NETWORK_ERROR|INTERNAL_ERROR|Simulated failure|Thông báo kết nối|máy chủ/i)
    .first()
    .isVisible()
    .catch(() => false)
  assert(hasErrorCopy, `${endpointPath}: expected visible error copy (${sectionHint})`)

  await page.screenshot({
    path: path.join(SHOT_DIR, `error-${endpointPath.replace(/\W+/g, '_')}.png`),
    fullPage: true,
  })

  await page.unroute(matchPath)

  const specific = page.getByRole('button', {
    name: /Thử tải lại sản phẩm|Thử tải lại danh mục|Thử tải lại$/i,
  })
  const btn = (await specific.count()) > 0 ? specific.first() : retryControl(page).first()

  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => {
        try {
          return matchPath(r.url()) && r.request().method() === 'GET'
        } catch {
          return false
        }
      },
      { timeout: 15000 }
    ),
    btn.click(),
  ])
  assert(response.ok(), `${endpointPath}: retry GET expected 2xx got ${response.status()}`)
  let body
  try {
    body = await response.json()
  } catch (e) {
    fail(`${endpointPath}: retry response was not JSON: ${e.message}`)
    body = null
  }
  assert(body != null && expectation.successBody(body), `${endpointPath}: retry body missing expected payload`)

  await page.waitForTimeout(800)
  await expectVisibleText(page, expectation.visibleText, `${sectionHint} recovered`)

  // Other sections still healthy after recovery
  if (endpointPath !== '/api/v1/products') {
    await expectVisibleText(page, 'Thép Hòa Phát', `${sectionHint}-recovery keeps products`)
  }
  if (endpointPath !== '/api/v1/site') {
    await expectVisibleText(page, 'Thanh An Bắc Giang', `${sectionHint}-recovery keeps brand`)
  }

  await page.screenshot({
    path: path.join(SHOT_DIR, `retry-${endpointPath.replace(/\W+/g, '_')}.png`),
    fullPage: true,
  })
  log(`[partial] ${endpointPath} retry click + successful response + data OK`)
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
  log(`quote created id=${body.id} marker=${marker}`)

  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(SHOT_DIR, 'desktop-quote-result.png') })

  const after = countQuotesInDb()
  log(`quote_requests after=${after}`)
  if (before != null && after != null) {
    assert(after === before + 1, `DB quote count expected ${before + 1} got ${after}`)
  } else {
    fail('Could not verify quote persistence via JDBC count')
  }

  const row = findQuoteInDb(body.id, marker)
  log(`quote DB lookup=${row}`)
  assert(row === 'OK', `DB row for id=${body.id} marker=${marker} → ${row}`)

  await context.close()
}

async function suiteApiHealth() {
  log('=== SUITE: direct API health ===')
  for (const p of ['/site', '/company', '/categories', '/products', '/site/advantages', '/contact']) {
    const res = await fetch(`${API_BASE}${p}`)
    assert(res.ok, `GET ${p} → ${res.status}`)
  }

  // Client-error mapping (backend GlobalExceptionHandler)
  const badJson = await fetch(`${API_BASE}/quote-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not-json',
  })
  assert(badJson.status === 400, `malformed JSON expected 400 got ${badJson.status}`)
  const badJsonBody = await badJson.json()
  assert(badJsonBody.code === 'MALFORMED_REQUEST', `malformed JSON code=${badJsonBody.code}`)

  const badUuid = await fetch(`${API_BASE}/products/not-a-uuid`)
  assert(badUuid.status === 400, `bad UUID expected 400 got ${badUuid.status}`)
  const badUuidBody = await badUuid.json()
  assert(badUuidBody.code === 'INVALID_PARAMETER', `bad UUID code=${badUuidBody.code}`)
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true })
  log(`BASE_URL=${BASE_URL} API_BASE=${API_BASE} SHOT_DIR=${SHOT_DIR}`)

  try {
    const r = await fetch(BASE_URL)
    assert(r.ok, `BASE_URL not reachable: ${BASE_URL} → ${r.status}`)
  } catch (e) {
    fail(`BASE_URL fetch failed: ${e.message}`)
    finish()
    return
  }

  await suiteApiHealth()

  const browser = await launchBrowser()
  try {
    await suiteViewports(browser)
    await suiteMobileDrawer(browser)
    await suiteKeyboardA11y(browser)
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
