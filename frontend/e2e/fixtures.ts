import { test as baseTest, expect, type Page, type TestInfo } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'

export interface HttpErrorRecord {
  status: number
  method: string
  url: string
}

export interface ConsoleErrorRecord {
  text: string
  location?: string
}

export interface FailedRequestRecord {
  method: string
  url: string
  errorText: string
}

export interface BrowserDiagnostics {
  pageErrors: string[]
  consoleErrors: ConsoleErrorRecord[]
  failedRequests: FailedRequestRecord[]
  httpErrors: HttpErrorRecord[]
  assertCleanHappyPath(): void
  assertCleanResilience(expectedFailedUrlPattern: RegExp | string): void
}

/**
 * Validates resilience test diagnostics against strict criteria:
 * 1. Zero uncaught JavaScript page errors.
 * 2. HTTP responses: only the injected status 500 on the expected URL pattern is allowed.
 * 3. The injected status 500 must have been observed at least once.
 * 4. Zero transport network failures (failedRequests): HTTP 500 produces an HTTP response,
 *    never a transport abort or network failure. Any transport failure (even on target) fails.
 * 5. Console errors: only browser logs directly reporting the 500 on the target URL or
 *    the simulated failure message are permitted. Any unexpected errors fail.
 */
export function validateResilienceDiagnostics(
  diagnostics: {
    pageErrors: string[]
    consoleErrors: ConsoleErrorRecord[]
    failedRequests: FailedRequestRecord[]
    httpErrors: HttpErrorRecord[]
  },
  expectedFailedUrlPattern: RegExp | string
): { valid: boolean; reasons: string[] } {
  const reasons: string[] = []

  if (diagnostics.pageErrors.length > 0) {
    reasons.push(`Uncaught browser page errors: ${diagnostics.pageErrors.join('; ')}`)
  }

  const pattern =
    typeof expectedFailedUrlPattern === 'string'
      ? new RegExp(expectedFailedUrlPattern)
      : expectedFailedUrlPattern

  const unexpectedHttp = diagnostics.httpErrors.filter(
    (e) => !(pattern.test(e.url) && e.status === 500)
  )
  if (unexpectedHttp.length > 0) {
    reasons.push(`Unexpected HTTP errors: ${JSON.stringify(unexpectedHttp)}`)
  }

  const expectedHttp = diagnostics.httpErrors.filter(
    (e) => pattern.test(e.url) && e.status === 500
  )
  if (expectedHttp.length === 0) {
    reasons.push('Injected HTTP 500 was not observed')
  }

  if (diagnostics.failedRequests.length > 0) {
    reasons.push(`Unexpected network transport failures: ${JSON.stringify(diagnostics.failedRequests)}`)
  }

  const unexpectedConsole = diagnostics.consoleErrors.filter((c) => {
    const matchesUrl = pattern.test(c.text) || (c.location && pattern.test(c.location))
    const isExpected500Message = /500|Failed to load resource|Simulated products error/i.test(c.text)
    return !(matchesUrl && isExpected500Message)
  })
  if (unexpectedConsole.length > 0) {
    reasons.push(`Unexpected console errors: ${JSON.stringify(unexpectedConsole)}`)
  }

  return {
    valid: reasons.length === 0,
    reasons,
  }
}

export const test = baseTest.extend<{
  diagnostics: BrowserDiagnostics
}>({
  diagnostics: [
    async ({ page }: { page: Page }, use: (d: BrowserDiagnostics) => Promise<void>, testInfo: TestInfo) => {
      const pageErrors: string[] = []
      const consoleErrors: ConsoleErrorRecord[] = []
      const failedRequests: FailedRequestRecord[] = []
      const httpErrors: HttpErrorRecord[] = []

      const consoleHandler = (msg: any) => {
        if (msg.type() === 'error') {
          const loc = msg.location ? msg.location() : undefined
          const locStr = loc && loc.url ? `${loc.url}:${loc.lineNumber}:${loc.columnNumber}` : undefined
          consoleErrors.push({
            text: msg.text(),
            location: locStr,
          })
        }
      }
      const pageErrorHandler = (err: any) => {
        pageErrors.push(err.message || String(err))
      }
      const requestFailedHandler = (req: any) => {
        failedRequests.push({
          method: req.method(),
          url: req.url(),
          errorText: req.failure()?.errorText || 'failed',
        })
      }
      const responseHandler = (res: any) => {
        if (res.status() >= 400) {
          httpErrors.push({
            status: res.status(),
            method: res.request().method(),
            url: res.url(),
          })
        }
      }

      page.on('console', consoleHandler)
      page.on('pageerror', pageErrorHandler)
      page.on('requestfailed', requestFailedHandler)
      page.on('response', responseHandler)

      const diagnostics: BrowserDiagnostics = {
        pageErrors,
        consoleErrors,
        failedRequests,
        httpErrors,
        assertCleanHappyPath() {
          expect(pageErrors, 'Uncaught browser page errors detected').toEqual([])
          expect(consoleErrors, 'Browser console errors detected').toEqual([])
          expect(failedRequests, 'Failed network requests detected').toEqual([])
          expect(httpErrors, 'HTTP error responses (>=400) detected').toEqual([])
        },
        assertCleanResilience(expectedFailedUrlPattern: RegExp | string) {
          const result = validateResilienceDiagnostics(
            { pageErrors, consoleErrors, failedRequests, httpErrors },
            expectedFailedUrlPattern
          )
          expect(result.reasons, 'Resilience diagnostics validation failed').toEqual([])
        },
      }

      try {
        await use(diagnostics)
      } finally {
        page.off('console', consoleHandler)
        page.off('pageerror', pageErrorHandler)
        page.off('requestfailed', requestFailedHandler)
        page.off('response', responseHandler)

        const diagnosticPayload = {
          test: testInfo.title,
          status: testInfo.status,
          durationMs: testInfo.duration,
          pageErrors,
          consoleErrors,
          failedRequests,
          httpErrors,
        }

        await testInfo.attach('browser-diagnostics.json', {
          body: Buffer.from(JSON.stringify(diagnosticPayload, null, 2)),
          contentType: 'application/json',
        })

        const artifactDir = process.env.CI_ARTIFACT_DIR || 'ci-artifacts'
        const diagDir = path.join(artifactDir, 'e2e', 'diagnostics')
        try {
          fs.mkdirSync(diagDir, { recursive: true })
          const safeName = testInfo.title.replace(/[^a-zA-Z0-9_-]/g, '_')
          fs.writeFileSync(
            path.join(diagDir, `${safeName}.json`),
            JSON.stringify(diagnosticPayload, null, 2)
          )
        } catch {
          // ignore local write errors
        }
      }
    },
    { auto: true },
  ],
})

export { expect }
